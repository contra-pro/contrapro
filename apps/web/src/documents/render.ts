import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { strFromU8, strToU8, zipSync } from "fflate";
import { configuration, DocumentFault, requiredValues, type Configuration } from "./model";
import { docx, pdf } from "./uploads";

export interface DocxConverter {
  /** Isolated, network-denied worker; reject macros; enforce CPU/memory/time/output limits. */
  convert(bytes: Uint8Array): Promise<Uint8Array>;
}
const escapeXml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
export function fillDocx(original: Uint8Array, config: Configuration, values: Record<string, string>) {
  const entries = docx(original), allowed = new Set(config.mappings.map(m => m.field)), seen = new Set<string>();
  for (const [name, bytes] of Object.entries(entries)) if (/^word\/(document|header\d+|footer\d+)\.xml$/.test(name)) {
    let xml = strFromU8(bytes);
    // Placeholders must be wholly within one text run. Split/unknown tokens fail closed.
    xml = xml.replace(/<w:t(\s[^>]*)?>([^<]*)<\/w:t>/g, (all: string, attrs: string | undefined, text: string) => {
      const replaced = text.replace(/\{\{([a-zA-Z][a-zA-Z0-9_.]*)\}\}/g, (_: string, key: string) => {
        if (!allowed.has(key)) throw new DocumentFault("invalid"); seen.add(key); return escapeXml(values[key] ?? "");
      });
      if (replaced.includes("{{") || replaced.includes("}}")) throw new DocumentFault("unsupported");
      return `<w:t${attrs ?? ' xml:space="preserve"'}>${replaced}</w:t>`;
    });
    if (xml.includes("{{") || xml.includes("}}")) throw new DocumentFault("unsupported");
    entries[name] = strToU8(xml);
  }
  if (config.mappings.some(m => m.required && !seen.has(m.field))) throw new DocumentFault("invalid");
  return zipSync(entries);
}
export async function renderDocument(input: { original: Uint8Array; format: "pdf" | "docx"; config: Configuration; values: Record<string, string>; font: Uint8Array;
  converter?: DocxConverter }): Promise<Uint8Array> {
  const config = configuration(input.config); requiredValues(config, input.values);
  let doc: PDFDocument;
  if (input.format === "docx") {
    const filled = fillDocx(input.original, config, input.values);
    if (!input.converter) throw new DocumentFault("unsupported");
    try { doc = await pdf(await input.converter.convert(filled)); } catch { throw new DocumentFault("conversion-failed"); }
  } else doc = await pdf(input.original);
  doc.registerFontkit(fontkit);
  let font; try { font = input.font.length ? await doc.embedFont(input.font, { subset: true }) : await doc.embedFont(StandardFonts.Helvetica); } catch { throw new DocumentFault("unsupported"); }
  const pages = doc.getPages();
  for (const zone of [...config.mappings, ...config.signatures, ...(config.logo ? [config.logo] : [])]) {
    const page = pages[zone.page - 1];
    if (!page || zone.x + zone.width > page.getWidth() || zone.y + zone.height > page.getHeight()) throw new DocumentFault("invalid");
  }
  if (config.logo) {
    try { const image = await doc.embedPng(config.logo.data); const z = config.logo;
      pages[z.page - 1]!.drawImage(image, { x: z.x, y: pages[z.page - 1]!.getHeight() - z.y - z.height, width: z.width, height: z.height });
    } catch { throw new DocumentFault("unsupported"); }
  }
  // DOCX text stays in its original runs; PDF mappings are overlays, never reflowed silently.
  if (input.format === "pdf") for (const mapping of config.mappings) {
    const value = input.values[mapping.field] ?? ""; if (!value) continue;
    if (value.includes("\n") || [...value].some(c => !font.getCharacterSet().includes(c.codePointAt(0)!))) throw new DocumentFault("unsupported");
    let width: number;
    try { width = font.widthOfTextAtSize(value, mapping.fontSize); } catch { throw new DocumentFault("unsupported"); }
    if (width > mapping.width || font.heightAtSize(mapping.fontSize) > mapping.height) throw new DocumentFault("invalid");
    const page = pages[mapping.page - 1]!;
    page.drawText(value, { x: mapping.rtl ? mapping.x + mapping.width - width : mapping.x,
      y: page.getHeight() - mapping.y - mapping.fontSize, size: mapping.fontSize, font });
  }
  // Stable metadata avoids introducing generation-time wall clock data into retries.
  doc.setCreationDate(new Date("2000-01-01T00:00:00Z")); doc.setModificationDate(new Date("2000-01-01T00:00:00Z"));
  return doc.save({ useObjectStreams: false });
}
