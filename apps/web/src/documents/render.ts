import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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
  converter?: DocxConverter; preview?: boolean }): Promise<Uint8Array> {
  const config = configuration(input.config);
  // Drafts have no allocated official reference. Leave it empty until confirmation.
  if (input.preview) config.mappings = config.mappings.map(m=>m.field==="contract.number"?{...m,required:false}:m);
  requiredValues(config, input.values);
  let doc: PDFDocument;
  if (input.format === "docx") {
    const filled = fillDocx(input.original, config, input.values);
    if (!input.converter) throw new DocumentFault("unsupported");
    try { doc = await pdf(await input.converter.convert(filled)); } catch { throw new DocumentFault("conversion-failed"); }
  } else doc = await pdf(input.original);
  doc.registerFontkit(fontkit);
  let font; try { font = input.font.length ? await doc.embedFont(input.font, { subset: true }) : await doc.embedFont(StandardFonts.Helvetica); } catch { throw new DocumentFault("unsupported"); }
  const glyphs = new Set(font.getCharacterSet());
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
    if (value.includes("\n") || [...value].some(c => !glyphs.has(c.codePointAt(0)!))) throw new DocumentFault("unsupported");
    let width: number;
    try { width = font.widthOfTextAtSize(value, mapping.fontSize); } catch { throw new DocumentFault("unsupported"); }
    if (width > mapping.width || font.heightAtSize(mapping.fontSize) > mapping.height) throw new DocumentFault("invalid");
    const page = pages[mapping.page - 1]!;
    page.drawText(value, { x: mapping.rtl ? mapping.x + mapping.width - width : mapping.x,
      y: page.getHeight() - mapping.y - mapping.fontSize, size: mapping.fontSize, font });
  }
  // Agency wording is an explicit appendix, never an overlay of existing legal text.
  // Each complete line is measured before drawing; no clipping or silent omission.
  let appendix: ReturnType<PDFDocument["addPage"]> | undefined, y = 0;
  for (const clause of config.clauses ?? []) {
    if (!clause.enabled) continue;
    const text = `${clause.title}\n${clause[config.locale]}`;
    for (const paragraph of text.split("\n")) {
      let line = "";
      const draw = () => {
        if (!appendix || y < 48) { if (doc.getPageCount() >= 50) throw new DocumentFault("invalid"); appendix = doc.addPage([595,842]); y = 794; }
        const width = font.widthOfTextAtSize(line,11);
        appendix.drawText(line,{x:config.locale === "ar" ? 547-width : 48,y,size:11,font}); y -= 17; line = "";
      };
      for (const word of paragraph.split(/\s+/)) {
        if ([...word].some(c => !glyphs.has(c.codePointAt(0)!))) throw new DocumentFault("unsupported");
        if (font.widthOfTextAtSize(word,11)>499) throw new DocumentFault("invalid");
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next,11)>499) draw();
        line = line ? `${line} ${word}` : word;
      }
      draw();
    }
    y -= 17;
  }
  if (input.preview) {
    const labelFont = await doc.embedFont(StandardFonts.Helvetica);
    for (const page of doc.getPages()) {
      // Add a notice strip rather than covering an agency's existing footer/text.
      const width=page.getWidth(),height=page.getHeight();
      page.setSize(width,height+24);page.setCropBox(0,0,width,height+24);page.translateContent(0,24);
      page.drawText("APERCU NON FINAL / UNSIGNED PREVIEW",{x:12,y:8,size:9,font:labelFont,color:rgb(0.7,0,0)});
    }
    doc.setTitle("APERCU NON FINAL - UNSIGNED PREVIEW");
  }
  // Stable metadata avoids introducing generation-time wall clock data into retries.
  doc.setCreationDate(new Date("2000-01-01T00:00:00Z")); doc.setModificationDate(new Date("2000-01-01T00:00:00Z"));
  return doc.save({ useObjectStreams: false });
}
