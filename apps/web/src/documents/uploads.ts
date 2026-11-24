import { Unzip, UnzipInflate, strFromU8 } from "fflate";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFStream } from "pdf-lib";
import { createHash } from "node:crypto";
import { DocumentFault } from "./model";

export const maxUpload = 10 * 1024 * 1024;
export const sha256 = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
export async function pdf(bytes: Uint8Array) {
  if (bytes.length < 8 || bytes.length > maxUpload || strFromU8(bytes.subarray(0, 5)) !== "%PDF-") throw new DocumentFault("invalid");
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: true });
    if (doc.isEncrypted || doc.getPageCount() < 1 || doc.getPageCount() > 50) throw Error();
    const forbidden = ["JS", "JavaScript", "OpenAction", "AA", "Launch", "EmbeddedFiles", "EmbeddedFile", "Filespec", "RichMedia", "XFA", "URI", "SubmitForm", "AcroForm", "GoToR", "GoToE", "ImportData", "Rendition", "Movie", "Sound"];
    let visited = 0;
    const check = (object: unknown, depth = 0): void => {
      if (++visited > 100000 || depth > 40) throw Error();
      if (object instanceof PDFName && forbidden.includes(object.decodeText())) throw Error();
      if (object instanceof PDFDict) { if (forbidden.some(k => object.has(PDFName.of(k)))) throw Error(); for (const [, v] of object.entries()) check(v, depth + 1); }
      if (object instanceof PDFArray) for (const v of object.asArray()) check(v, depth + 1);
      if (object instanceof PDFStream) check(object.dict, depth + 1);
    };
    for (const [, object] of doc.context.enumerateIndirectObjects()) check(object);
    if (doc.getPages().some(p => p.getRotation().angle !== 0 || p.getWidth() > 2000 || p.getHeight() > 2000)) throw Error();
    return doc;
  } catch { throw new DocumentFault("unsupported"); }
}
/** Streaming inflation enforces actual output limits, not just attacker-supplied ZIP sizes. */
export function docx(bytes: Uint8Array): Record<string, Uint8Array> {
  if (bytes.length > maxUpload || bytes[0] !== 80 || bytes[1] !== 75) throw new DocumentFault("invalid");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break; }
  if (end < 0 || view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0 || view.getUint16(end + 8, true) !== view.getUint16(end + 10, true)) throw new DocumentFault("invalid");
  const expected = view.getUint16(end + 10, true), directoryOffset = view.getUint32(end + 16, true), directorySize = view.getUint32(end + 12, true);
  if (expected > 250 || directoryOffset + directorySize !== end) throw new DocumentFault("invalid");
  const sizes = new Map<string, number>(); let cursor = directoryOffset;
  for (let i = 0; i < expected; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50 || view.getUint16(cursor + 8, true) & 1) throw new DocumentFault("invalid");
    const nameSize = view.getUint16(cursor + 28, true), extra = view.getUint16(cursor + 30, true), comment = view.getUint16(cursor + 32, true);
    if (cursor + 46 + nameSize + extra + comment > end || view.getUint32(cursor + 42, true) >= directoryOffset) throw new DocumentFault("invalid");
    const name = strFromU8(bytes.subarray(cursor + 46, cursor + 46 + nameSize));
    if (sizes.has(name)) throw new DocumentFault("invalid"); sizes.set(name, view.getUint32(cursor + 24, true)); cursor += 46 + nameSize + extra + comment;
  }
  if (cursor !== end) throw new DocumentFault("invalid");
  const entries: Record<string, Uint8Array> = Object.create(null); let count = 0, total = 0, failure = false;
  const unzip = new Unzip(file => {
    if (++count > 250 || file.name in entries || !/^(\[Content_Types\]\.xml|(?:word|_rels|docProps)\/[A-Za-z0-9_.\-/]+)$/.test(file.name) || file.name.split("/").includes("..") ||
      /(?:vbaProject|embeddings|activeX|\.bin$|\.exe$)/i.test(file.name) || (file.originalSize ?? 0) > 20 * 1024 * 1024 || ![0, 8].includes(file.compression)) { failure = true; throw new DocumentFault("unsupported"); }
    entries[file.name] = new Uint8Array(); const chunks: Uint8Array[] = []; let size = 0;
    file.ondata = (error, chunk, final) => {
      size += chunk.length; total += chunk.length;
      if (error || size > 4 * 1024 * 1024 || total > 20 * 1024 * 1024) { failure = true; file.terminate(); throw new DocumentFault("invalid"); }
      chunks.push(chunk);
      if (final) { const all = new Uint8Array(size); let offset = 0; for (const c of chunks) { all.set(c, offset); offset += c.length; } entries[file.name] = all; }
    }; file.start();
  });
  unzip.register(UnzipInflate);
  try { for (let i = 0; i < bytes.length; i += 1024) unzip.push(bytes.subarray(i, i + 1024), i + 1024 >= bytes.length); } catch { throw new DocumentFault("unsupported"); }
  if (failure || !entries["word/document.xml"] || !entries["[Content_Types].xml"] || !entries["_rels/.rels"]) throw new DocumentFault("invalid");
  if (count !== expected || Object.entries(entries).some(([name, data]) => sizes.get(name) !== data.length)) throw new DocumentFault("invalid");
  for (const [name, data] of Object.entries(entries)) {
    if (/\.(xml|rels)$/.test(name)) {
      const xml = new TextDecoder("utf-8", { fatal: true }).decode(data);
      if (/<!DOCTYPE|<!ENTITY|TargetMode\s*=\s*["']External|(?:https?:|file:|\\\\)|(?:INCLUDETEXT|INCLUDEPICTURE|DDEAUTO|altChunk|oleObject|attachedTemplate|fldChar|instrText)/i.test(xml.replace(/https?:\/\/schemas\.[^"'\s<>]+/g, "")) || XMLValidator.validate(xml) !== true) throw new DocumentFault("unsupported");
      const parsed: unknown = new XMLParser({ ignoreAttributes: false, processEntities: true }).parse(xml);
      const inspect = (node: unknown, depth = 0): void => {
        if (depth > 80) throw new DocumentFault("unsupported");
        if (Array.isArray(node)) { for (const item of node) inspect(item, depth + 1); }
        else if (node && typeof node === "object") for (const [key, value] of Object.entries(node)) {
          const normalized = String(value).replace(/&#(?:x([0-9a-f]+)|([0-9]+));/gi, (_, hex: string | undefined, decimal: string | undefined) => {
            const point = Number.parseInt(hex ?? decimal!, hex ? 16 : 10); if (point > 0x10ffff) throw new DocumentFault("invalid"); return String.fromCodePoint(point);
          });
          if (key === "@_TargetMode" && normalized.trim().toLowerCase() === "external" || key === "@_Target" && /^(?:[a-z]+:|[\/\\])|\.\./i.test(normalized)) throw new DocumentFault("unsupported");
          inspect(value, depth + 1);
        }
      }; inspect(parsed);
    } else if (!/^word\/media\/[A-Za-z0-9_.-]+\.(png|jpe?g)$/.test(name)) throw new DocumentFault("unsupported");
  }
  return entries;
}
export async function validateUpload(bytes: Uint8Array, name: string, mime: string): Promise<"pdf" | "docx"> {
  if (!bytes.length || bytes.length > maxUpload || name.length > 180) throw new DocumentFault("invalid");
  if (/\.pdf$/i.test(name) && mime === "application/pdf") { await pdf(bytes); return "pdf"; }
  if (/\.docx$/i.test(name) && mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") { docx(bytes); return "docx"; }
  throw new DocumentFault("unsupported");
}
