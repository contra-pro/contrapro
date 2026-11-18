import { describe, expect, it } from "vitest";
import { clientUnicodeCase } from "../../../../packages/application/src/client-unicode";
import { clientUnicodeProfile } from "../../../../packages/application/src/client-unicode-data";
import { emptyClient, validateClient } from "../../../../packages/application/src/clients";
const base = { ...emptyClient, firstName: "Synthetic", lastName: "Client", phone: "+212600000000" };
describe("pinned Unicode profile — JavaScript proof, not PostgreSQL execution", () => {
  it("matches this pinned runtime for every Unicode scalar default case mapping", () => {
    expect(process.versions.unicode).toBe(clientUnicodeProfile.unicode);
    for (let cp = 0; cp <= 0x10ffff; cp++) {
      if (cp >= 0xd800 && cp <= 0xdfff) continue;
      const ch = String.fromCodePoint(cp);
      if (clientUnicodeCase(ch) !== ch.toLowerCase() || clientUnicodeCase(ch, true) !== ch.toUpperCase()) throw Error(`UNICODE_CASE_MISMATCH_${cp}`);
    }
  }, 20000);
  it.each(["ΟΣ", "ΟΣΑ", "Σ", "AΣ\u0345", "AΣ\u0301B", "É@EXAMPLE.COM", "İ@EXAMPLE.COM", "AΣ'", "ß", "ﬃ", "𐐀Σ", "ᾀΣ", "AΣ\u200dB"])("matches contextual and expanding mappings for %s", value => {
    expect(clientUnicodeCase(value)).toBe(value.toLowerCase()); expect(clientUnicodeCase(value, true)).toBe(value.toUpperCase());
  });
  it("preserves full Unicode API casing and ASCII document validation", () => {
    expect(validateClient({ ...base, email: " É@EXAMPLE.COM ", identityType: "passport", identityNumber: "ß1234" })).toMatchObject({ ok: true, value: { email: "é@example.com", identityNumber: "SS1234" } });
  });
  it.each(["x".repeat(8193), "😀".repeat(2049)])("rejects over-budget raw input before trim/Unicode processing %#", notes => {
    expect(validateClient({ ...base, notes })).toEqual({ ok: false, errors: { form: "too-long" } });
  });
  it("bounds aggregate raw input as well as individual fields", () => {
    expect(validateClient({ ...base, firstName: " ".repeat(8000), lastName: " ".repeat(8000), notes: " ".repeat(8000), address: " ".repeat(8000), city: " ".repeat(8000) }).ok).toBe(false);
  });
  it("enforces post-case UTF16 bounds and rejects unpaired surrogates", () => {
    expect(validateClient({ ...base, email: "İ".repeat(200) + "@a.b" }).ok).toBe(false);
    expect(validateClient({ ...base, firstName: "\ud800" }).ok).toBe(false);
    expect(validateClient({ ...base, firstName: "😀".repeat(50) }).ok).toBe(true);
  });
});
