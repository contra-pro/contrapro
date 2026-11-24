import type { SupabaseClient } from "@supabase/supabase-js";
import { DocumentFault, scope } from "./model";
import { maxUpload, sha256 } from "./uploads";

export interface PrivateStorage {
  put(key: string, bytes: Uint8Array, mime: string): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  remove(key: string): Promise<void>;
}
export function objectKey(agencyId: string, kind: "originals" | "drafts" | "issued", id: string, checksum: string, extension: "pdf" | "docx") {
  scope(agencyId, id); if (!/^[a-f0-9]{64}$/.test(checksum)) throw new DocumentFault("invalid");
  return `${agencyId}/${kind}/${id}/${checksum}.${extension}`;
}
export function scopedKey(agencyId: string, key: string) {
  scope(agencyId);
  if (!new RegExp(`^${agencyId}/(?:originals|drafts|issued)/[a-f0-9-]{36}/[a-f0-9]{64}\\.(?:pdf|docx)$`).test(key)) throw new DocumentFault("forbidden");
}
/** Request JWT only. No service role and no public URL method. */
export class SupabasePrivateStorage implements PrivateStorage {
  constructor(private client: SupabaseClient, private agencyId: string) { scope(agencyId); }
  async put(key: string, bytes: Uint8Array, mime: string) {
    scopedKey(this.agencyId, key);
    if (bytes.length > maxUpload || !key.includes(sha256(bytes))) throw new DocumentFault("invalid");
    const { error } = await this.client.storage.from("contract-documents").upload(key, bytes, { contentType: mime, upsert: false });
    if (error) {
      // An upload may have succeeded before a transport failure. Verify, never overwrite.
      try { if (sha256(await this.get(key)) === sha256(bytes)) return; } catch { /* Keep the original failure. */ }
      throw new DocumentFault("unavailable");
    }
  }
  async get(key: string) {
    scopedKey(this.agencyId, key);
    const { data, error } = await this.client.storage.from("contract-documents").download(key);
    if (error || !data || data.size > maxUpload) throw new DocumentFault("unavailable");
    const bytes = new Uint8Array(await data.arrayBuffer()); if (!key.includes(sha256(bytes))) throw new DocumentFault("conflict"); return bytes;
  }
  async remove(key: string) {
    scopedKey(this.agencyId, key); if (key.split("/")[1] === "issued") throw new DocumentFault("forbidden");
    const { error } = await this.client.storage.from("contract-documents").remove([key]); if (error) throw new DocumentFault("unavailable");
  }
}
