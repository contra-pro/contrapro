import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { Documents, type DocumentRepository } from "./service";
import { objectKey, scopedKey, type PrivateStorage } from "./storage";
import { sha256 } from "./uploads";
import { type Artifact, type TemplateVersion } from "./model";
import { config, snapshot } from "./fixtures";
const agency = snapshot.agencyId, rental = snapshot.rentalId;
const tid = "33333333-3333-4333-8333-333333333333", vid = "44444444-4444-4444-8444-444444444444", requestId = "55555555-5555-4555-8555-555555555555";
async function harness() {
  const pdf = await PDFDocument.create(); pdf.addPage(); const original = await pdf.save(), checksum = sha256(original), key = objectKey(agency, "originals", tid, checksum, "pdf");
  const version: TemplateVersion = { agencyId: agency, templateId: tid, id: vid, revision: 1, name: "Agence", format: "pdf", originalKey: key, checksum, config };
  const objects = new Map<string, Uint8Array>([[key, original]]), calls: string[] = []; let artifact: Artifact | null = null, failedUpload = false, failedCommit = false, denied = false;
  const repo: DocumentRepository = { async call<T>(agencyId: string, action: string, input: object): Promise<T> {
    calls.push(action); if (denied || agencyId !== agency) throw Error("forbidden"); const data = input as Record<string, unknown>;
    if (action === "begin" || action === "preview-begin") return { artifact:action==="begin"?artifact:null, snapshot: { ...snapshot, parties: { agency: { name: "Agence" } } }, template: version, fingerprint: requestId, lease:requestId,input:{custom:{},issueDate:"2026-11-25"} } as T;
    if (action === "finish") { if (failedCommit) { failedCommit = false; throw Error("unavailable"); }
      artifact ??= { id: vid, agencyId: agency, rentalId: rental, rentalVersion: 1, templateVersionId: vid, key: String(data.key), checksum: String(data.checksum), sourceChecksum: checksum, status: "issued", requestId, createdAt: "2026-11-24", signing: { order: ["agency", "client"], evidence: null, zones: [] } }; return artifact as T; }
    if (action === "artifact") return artifact as T;
    if (action === "version") return version as T;
    return null as T;
  } };
  const store: PrivateStorage = { async put(k, bytes) { if (failedUpload) throw Error("unavailable"); if (objects.has(k) && sha256(objects.get(k)!) !== sha256(bytes)) throw Error("conflict"); objects.set(k, bytes); },
    async get(k) { if (!objects.has(k)) throw Error("unavailable"); return objects.get(k)!; }, async remove(k) { objects.delete(k); } };
  const service = new Documents(agency, repo, store, new Uint8Array(), undefined, "a".repeat(64));
  return { service, objects, calls, version, deny: () => { denied = true; }, failUpload: () => { failedUpload = true; }, failCommit: () => { failedCommit = true; } };
}
const input = { rentalId: rental, templateVersionId: vid, rentalVersion: 1, requestId, issueDate: "2026-11-24", custom: {}, status: "issued" as const };
describe("document storage consistency", () => {
  it("renders actual draft data through the shared pipeline without issuance or signing actions",async()=>{
    const h=await harness();await h.service.preview(rental,requestId);
    expect(h.calls).toEqual(["preview-begin","preview-reserve","preview-finish"]);
    const bytes=[...h.objects.values()][1]!;
    expect((await PDFDocument.load(bytes)).getTitle()).toContain("UNSIGNED PREVIEW");
  });
  it("releases the rendering lease after storage failure and preserves the original error",async()=>{
    const h=await harness();h.failUpload();await expect(h.service.preview(rental,requestId)).rejects.toThrow("unavailable");
    expect(h.calls).toContain("preview-fail");expect(h.calls).not.toContain("preview-finish");
  });
  it("persists exact bytes and replays an issued artifact without overwriting", async () => {
    const h = await harness(), artifact = await h.service.generate(input); expect(await h.service.generate(input)).toEqual(artifact);
    expect(h.calls.filter(c => c === "finish")).toHaveLength(1); expect(sha256(await h.service.download(artifact.id))).toBe(artifact.checksum);
    expect(artifact.signing).toMatchObject({ order: ["agency", "client"], evidence: null });
  });
  it("does not commit metadata after failed uploads", async () => {
    const h = await harness(); h.failUpload(); await expect(h.service.generate(input)).rejects.toThrow(); expect(h.calls).not.toContain("finish");
  });
  it("retains bytes after uncertain database commit and recovers with the same request", async () => {
    const h = await harness(); h.failCommit(); await expect(h.service.generate(input)).rejects.toThrow(); expect(h.objects.size).toBe(2);
    await h.service.generate(input); expect(h.objects.size).toBe(2);
  });
  it("rechecks authorization for retries and downloads", async () => {
    const h = await harness(); await h.service.generate(input); h.deny(); await expect(h.service.generate(input)).rejects.toThrow("forbidden"); await expect(h.service.download(vid)).rejects.toThrow("forbidden");
  });
  it("rejects altered originals and wrong agency versions", async () => {
    const h = await harness(); h.objects.set(h.version.originalKey, new Uint8Array([1])); await expect(h.service.generate(input)).rejects.toThrow("conflict");
    const other = await harness(); other.version.agencyId = rental; await expect(other.service.generate(input)).rejects.toThrow("forbidden");
  });
  it("refuses object keys for other tenants and path traversal", () => {
    for (const key of [`${rental}/issued/${tid}/${"a".repeat(64)}.pdf`, `${agency}/../secret`, `${agency}/issued/x/file.pdf`]) expect(() => scopedKey(agency,key)).toThrow("forbidden");
  });
});
