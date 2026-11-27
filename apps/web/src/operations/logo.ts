import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validContractLogo } from "../../../../packages/application/src/rentals/contract-settings";
import type { OperationsRepository } from "./repository";
import { OperationFault } from "./model";
export async function logoBytes(data: unknown) {
  if (typeof data !== "string" || !validContractLogo(data)) throw new OperationFault("invalid");
  const bytes = new Uint8Array(Buffer.from(data.slice(22), "base64"));
  try { const doc = await PDFDocument.create(); await doc.embedPng(bytes); } catch { throw new OperationFault("invalid"); }
  return bytes;
}
export function derivedRequest(request: string, purpose: string) {
  const h = createHash("sha256").update(`${request}|${purpose}`).digest("hex"); return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
}
export async function saveLogo(client: SupabaseClient, repo: OperationsRepository, agencyId: string, input: { data: string; requestId: string; revision: number }) {
  const bytes = await logoBytes(input.data), checksum = createHash("sha256").update(bytes).digest("hex"), reserve = derivedRequest(input.requestId, "logo-reserve");
  const key = `${agencyId}/originals/${reserve}/${checksum}.png`;
  await repo.call(agencyId, "logo-reserve", { requestId: reserve, revision: input.revision, checksum, key });
  const bucket = client.storage.from("contract-documents");
  const { error } = await bucket.upload(key, bytes, { contentType: "image/png", upsert: false });
  if (error) {
    // A lost upload result cannot justify overwrite/deletion. Verify exact bytes.
    const prior = await bucket.download(key);
    if (prior.error || !prior.data || prior.data.size > 204800 || createHash("sha256").update(new Uint8Array(await prior.data.arrayBuffer())).digest("hex") !== checksum) throw new OperationFault("unavailable");
  }
  return repo.call(agencyId, "logo-set", { ...input, key, checksum });
}
