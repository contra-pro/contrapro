import { createHmac, randomUUID } from "node:crypto";
import { configuration, DocumentFault, resolveValues, requiredValues, scope, type Artifact, type Template, type TemplateVersion } from "./model";
import { sha256, validateUpload } from "./uploads";
import { objectKey, scopedKey, type PrivateStorage } from "./storage";
import { fillDocx, renderDocument, type DocxConverter } from "./render";

/** Implementations must authorize the current user for every call, including reads and retries. */
export interface DocumentRepository { call<T>(agencyId: string, action: string, input: object): Promise<T> }
export class Documents {
  constructor(private agencyId: string, private repo: DocumentRepository, private store: PrivateStorage, private font: Uint8Array, private converter?: DocxConverter, private rendererSecret?: string) { scope(agencyId); }
  list() { return this.repo.call<Template[]>(this.agencyId, "list", {}); }
  history(rentalId: string) { scope(this.agencyId, rentalId); return this.repo.call<Artifact[]>(this.agencyId, "history", { rentalId }); }
  async save(input: { templateId: string; expectedRevision: number; name: string; config: unknown; bytes?: Uint8Array; filename?: string; mime?: string; sourceVersionId?: string }) {
    scope(this.agencyId, input.templateId);
    if (!input.name.trim() || input.name.length > 120 || /[\u0000-\u001f]/.test(input.name) || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) throw new DocumentFault("invalid");
    const config = configuration(input.config); let format: "pdf" | "docx", originalKey: string, checksum: string;
    if (input.bytes) {
      format = await validateUpload(input.bytes, input.filename ?? "", input.mime ?? ""); checksum = sha256(input.bytes);
      if (format === "docx") fillDocx(input.bytes, config, Object.fromEntries(config.mappings.map(m => [m.field, "validation"])));
      originalKey = objectKey(this.agencyId, "originals", input.templateId, checksum, format);
      await this.repo.call(this.agencyId, "reserve", { key: originalKey, checksum, kind: "originals", templateId: input.templateId });
      await this.store.put(originalKey, input.bytes, input.mime!);
    } else {
      scope(this.agencyId, input.sourceVersionId ?? "");
      const source = await this.repo.call<TemplateVersion>(this.agencyId, "version", { id: input.sourceVersionId });
      if (source.agencyId !== this.agencyId) throw new DocumentFault("forbidden");
      ({ format, originalKey, checksum } = source);
      if (format === "docx") fillDocx(await this.store.get(originalKey), config, Object.fromEntries(config.mappings.map(m => [m.field, "validation"])));
    }
    // Failed/uncertain metadata writes retain pending objects. Cleanup must lock/check references.
    return this.repo.call<TemplateVersion>(this.agencyId, "save", { templateId: input.templateId, expectedRevision: input.expectedRevision,
      id: randomUUID(), name: input.name.trim(), config, format, originalKey, checksum });
  }
  archive(templateId: string) { scope(this.agencyId, templateId); return this.repo.call(this.agencyId, "archive", { templateId }); }
  setDefault(templateId: string) { scope(this.agencyId, templateId); return this.repo.call(this.agencyId, "default", { templateId }); }
  async cleanupOrphans() {
    const keys = await this.repo.call<string[]>(this.agencyId, "cleanup", {});
    for (const key of keys) { scopedKey(this.agencyId, key); if (key.split("/")[1] !== "originals") throw new DocumentFault("forbidden");
      await this.store.remove(key); await this.repo.call(this.agencyId, "cleanup-finish", { key }); }
    return keys.length;
  }
  async generate(input: { rentalId: string; templateVersionId: string; rentalVersion: number; requestId: string; issueDate: string; custom: Record<string, string>; status: "draft" | "issued" }) {
    scope(this.agencyId, input.rentalId, input.templateVersionId, input.requestId);
    if (!this.rendererSecret || !/^[a-f0-9]{64}$/.test(this.rendererSecret)) throw new DocumentFault("unavailable");
    if (!["draft", "issued"].includes(input.status) || !Number.isSafeInteger(input.rentalVersion) || input.rentalVersion < 1) throw new DocumentFault("invalid");
    // Repository pins authoritative rental snapshot, template version and idempotency payload in one transaction.
    const job = await this.repo.call<{ artifact: Artifact | null; snapshot: unknown; template: TemplateVersion; fingerprint: string }>(this.agencyId, "begin", input);
    if (job.artifact) return job.artifact;
    const template = job.template;
    if (template.agencyId !== this.agencyId || template.id !== input.templateVersionId) throw new DocumentFault("forbidden");
    const config = configuration(template.config), values = resolveValues(job.snapshot, this.agencyId, input.rentalId, input.custom, input.issueDate);
    if (Object.keys(input.custom).some(k => !config.custom.includes(k))) throw new DocumentFault("invalid");
    requiredValues(config, values);
    const original = await this.store.get(template.originalKey); if (sha256(original) !== template.checksum) throw new DocumentFault("conflict");
    const bytes = await renderDocument({ original, format: template.format, config, values, font: this.font, ...(this.converter ? { converter: this.converter } : {}) });
    const checksum = sha256(bytes), key = objectKey(this.agencyId, input.status === "issued" ? "issued" : "drafts", input.requestId, checksum, "pdf");
    await this.repo.call(this.agencyId, "reserve", { key, checksum, kind: input.status === "issued" ? "issued" : "drafts", requestId: input.requestId });
    await this.store.put(key, bytes, "application/pdf");
    const attestation = createHmac("sha256", Buffer.from(this.rendererSecret, "hex")).update([this.agencyId, input.requestId, key, checksum, template.checksum].join("|")).digest("hex");
    return this.repo.call<Artifact>(this.agencyId, "finish", { requestId: input.requestId, key, checksum, sourceChecksum: template.checksum, attestation });
  }
  async download(id: string) {
    scope(this.agencyId, id);
    const artifact = await this.repo.call<Artifact>(this.agencyId, "artifact", { id });
    if (artifact.agencyId !== this.agencyId) throw new DocumentFault("forbidden"); scopedKey(this.agencyId, artifact.key);
    const bytes = await this.store.get(artifact.key); if (sha256(bytes) !== artifact.checksum) throw new DocumentFault("conflict"); return bytes;
  }
}
