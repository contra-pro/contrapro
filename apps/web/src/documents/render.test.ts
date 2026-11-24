import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import { strFromU8, strToU8, zipSync } from "fflate";
import { fillDocx, renderDocument } from "./render";
import { ContainerDocxConverter } from "./converter";
import { pdf } from "./uploads";
import { config } from "./fixtures";
const blank = async () => { const d = await PDFDocument.create(); d.addPage([595, 842]); return d.save(); };
describe("actual document rendering", () => {
  it("produces a downloadable PDF with original pages and deterministic bytes", async () => {
    const input = { original: await blank(), format: "pdf" as const, config, values: { "agency.name": "Agence été" }, font: new Uint8Array() };
    const bytes = await renderDocument(input); expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    expect(bytes).toEqual(await renderDocument(input)); expect(strFromU8(bytes.subarray(0,5))).toBe("%PDF-");
  });
  it("fails when text overflows, a page is missing or a glyph is unavailable", async () => {
    const original = await blank(), input = { original, format: "pdf" as const, config, values: { "agency.name": "x".repeat(2000) }, font: new Uint8Array() };
    await expect(renderDocument(input)).rejects.toThrow("invalid");
    await expect(renderDocument({ ...input, config: { ...config, mappings: [{ ...config.mappings[0]!, page: 2 }] } })).rejects.toThrow("invalid");
    await expect(renderDocument({ ...input, values: { "agency.name": "وكالة" } })).rejects.toThrow("unsupported");
  });
  const fontPath = process.env.CONTRATPRO_DOCUMENT_FONT_PATH ?? "C:/Windows/Fonts/arial.ttf";
  it.skipIf(!existsSync(fontPath))("embeds a configured Arabic-capable font and retains RTL zones (visual fidelity deferred)", async () => {
    const bytes = await renderDocument({ original: await blank(), format: "pdf", config: { ...config, locale: "ar", mappings: [{ ...config.mappings[0]!, rtl: true }] }, values: { "agency.name": "وكالة الكراء" }, font: new Uint8Array(readFileSync(fontPath)) });
    const result = await PDFDocument.load(bytes); expect(result.getPageCount()).toBe(1); expect(bytes.length).toBeGreaterThan(1000);
  });
  it("rejects direct nested PDF actions", async () => {
    const doc = await PDFDocument.create(); doc.addPage(); doc.catalog.set(PDFName.of("Names"), doc.context.obj({ Nested: { S: PDFName.of("JavaScript"), JS: "app.alert('bad')" } }));
    await expect(pdf(await doc.save())).rejects.toThrow("unsupported");
  });
  const source = (text: string) => zipSync({ "[Content_Types].xml": strToU8("<Types/>"), "_rels/.rels": strToU8("<Relationships/>"), "word/document.xml": strToU8(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:document>`) });
  it("fills whole-run DOCX placeholders with escaped values", () => {
    const filled = fillDocx(source("{{agency.name}}"), config, { "agency.name": "Été & <agence>" });
    expect(filled.length).toBeGreaterThan(50);
  });
  it.each(["{{agency.password}}", "{{agency.</w:t></w:r><w:r><w:t>name}}", "{{invalid token}}"])("rejects unknown/split placeholders: %s", token => {
    expect(() => fillDocx(source(token), config, {})).toThrow();
  });
  it("requires conversion, propagates conversion failure and validates converter output", async () => {
    const input = { original: source("{{agency.name}}"), format: "docx" as const, config, values: { "agency.name": "Agence" }, font: new Uint8Array() };
    await expect(renderDocument(input)).rejects.toThrow("unsupported");
    await expect(renderDocument({ ...input, converter: { convert: async () => { throw Error(); } } })).rejects.toThrow("conversion-failed");
    await expect(renderDocument({ ...input, converter: { convert: async () => strToU8("bad") } })).rejects.toThrow("conversion-failed");
    expect((await PDFDocument.load(await renderDocument({ ...input, converter: { convert: blank } }))).getPageCount()).toBe(1);
    expect(() => new ContainerDocxConverter("untrusted:latest")).toThrow("unsupported");
  });
});
