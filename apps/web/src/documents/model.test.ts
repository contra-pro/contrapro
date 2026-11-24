import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { zipSync, strToU8 } from "fflate";
import { configuration, resolveValues, requiredValues } from "./model";
import { validateUpload, docx } from "./uploads";
import { config, snapshot } from "./fixtures";
const agencyId = "11111111-1111-4111-8111-111111111111", rentalId = "22222222-2222-4222-8222-222222222222";
describe("document boundaries", () => {
  it("resolves exact prices and refuses other tenants", () => {
    expect(resolveValues(snapshot, agencyId, rentalId, {}, "2026-11-24")["rental.totalMinor"]).toBe("90071992547409.93");
    expect(() => resolveValues(snapshot, rentalId, rentalId, {}, "2026-11-24")).toThrow("invalid");
    expect(() => resolveValues({ ...snapshot, terms: { ...snapshot.terms, totalMinor: 9007199254740993 } }, agencyId, rentalId, {}, "2026-11-24")).toThrow();
  });
  it("validates mappings, required values, bounds and custom fields", () => {
    expect(configuration(config)).toEqual(config);
    for (const field of ["__proto__", "agency.password", "custom.unregistered"]) expect(() => configuration({ ...config, mappings: [{ ...config.mappings[0], field }] })).toThrow();
    expect(() => configuration({ ...config, signatures: [{ party: "client", page: 0, x: 0, y: 0, width: 20, height: 20 }] })).toThrow();
    expect(() => requiredValues(config, {})).toThrow("missing-values");
  });
  it("accepts a plain PDF and rejects spoofed/oversized content", async () => {
    const pdf = await PDFDocument.create(); pdf.addPage(); const bytes = await pdf.save();
    expect(await validateUpload(bytes, "contract.pdf", "application/pdf")).toBe("pdf");
    await expect(validateUpload(strToU8("not a pdf"), "contract.pdf", "application/pdf")).rejects.toThrow();
    await expect(validateUpload(bytes, "contract.exe", "application/pdf")).rejects.toThrow();
  });
  it("rejects DOCX external references, traversal, entities, macros and expansion", () => {
    const entries = { "[Content_Types].xml": strToU8('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'), "_rels/.rels": strToU8("<Relationships/>"), "word/document.xml": strToU8("<document><p>{{agency.name}}</p></document>") };
    expect(docx(zipSync(entries))["word/document.xml"]).toBeDefined();
    expect(() => docx(zipSync(entries).subarray(0, -22))).toThrow("invalid");
    for (const extra of [ { "../evil.xml": strToU8("<x/>") }, { "word/vbaProject.bin": new Uint8Array([1]) },
      { "word/_rels/document.xml.rels": strToU8('<Relationships><Relationship TargetMode="External" Target="file:///secret"/></Relationships>') },
      { "word/_rels/document.xml.rels": strToU8('<Relationships><Relationship TargetMode="Ex&#116;ernal" Target="f&#105;le:///secret"/></Relationships>') },
      { "word/document.xml": strToU8('<!DOCTYPE x [<!ENTITY x "a">]><x>&x;</x>') },
      { "word/document.xml": strToU8("x".repeat(5 * 1024 * 1024)) } ]) expect(() => docx(zipSync({ ...entries, ...extra })), Object.keys(extra).join(",")).toThrow();
  });
});
