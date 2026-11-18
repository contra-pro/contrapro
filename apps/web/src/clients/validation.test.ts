import { describe, expect, it } from "vitest";
import { emptyClient, validateClient, validateClientQuery } from "../../../../packages/application/src/clients";
const base = { ...emptyClient, firstName: "أمين", lastName: "Atlas", phone: "+212612345678" };
describe("client validation — no live services", () => {
  it("allows a contact without documents or licence yet", () => { expect(validateClient(base).ok).toBe(true); });
  it("accepts a foreign passport without Moroccan CIN", () => {
    const result = validateClient({ ...base, nationality: "Française", identityType: "passport", identityNumber: "ab-12345" });
    expect(result).toMatchObject({ ok: true, value: { identityType: "passport", identityNumber: "AB-12345" } });
  });
  it("accepts CIN and a complete licence", () => {
    expect(validateClient({ ...base, identityType: "cin", identityNumber: "ab123456", licenceNumber: "01/12345", licenceIssueDate: "2020-02-29", licenceExpiryDate: "2030-02-28" }, "2026-11-15").ok).toBe(true);
  });
  it.each([{ firstName: "" }, { phone: "bad" }, { email: "bad" }, { identityType: "cin" }, { identityType: "passport", identityNumber: "<script>" },
    { identityType: "none", identityNumber: "AB123456" }, { licenceNumber: "12345" }, { licenceIssueDate: "2020-01-01" },
    { licenceNumber: "12345", licenceIssueDate: "2020-02-30", licenceExpiryDate: "2030-01-01" },
    { licenceNumber: "12345", licenceIssueDate: "2030-01-01", licenceExpiryDate: "2031-01-01" },
    { licenceNumber: "12345", licenceIssueDate: "2020-01-01", licenceExpiryDate: "2019-01-01" }, { notes: "secret\u0000" }, { notes: "a".repeat(2001) }, { agencyId: "fake" }, { state: "archived" }])("rejects invalid or unauthorized fields %j", change => {
    expect(validateClient({ ...base, ...change }, "2026-11-15").ok).toBe(false);
  });
  it("retains an expired licence for renewal without claiming rental eligibility", () => {
    expect(validateClient({ ...base, licenceNumber: "12345", licenceIssueDate: "2010-01-01", licenceExpiryDate: "2020-01-01" }, "2026-11-15").ok).toBe(true);
  });
  it("permits multiline notes without logging or transforming their content", () => { expect(validateClient({ ...base, notes: "Ligne 1\nLigne 2" }).ok).toBe(true); });
  it.each([{ page: 0 }, { page: 1.2 }, { page: 10001 }, { pageSize: 500 }, { search: "x".repeat(101) }, { state: "archived" }, { identityType: "all-tenants" }])("bounds list input %j", input => {
    expect(validateClientQuery(input)).toBeNull();
  });
  it("normalizes search and does not interpret wildcard characters", () => {
    expect(validateClientQuery({ search: " % Atlas _ ", page: 2 })).toMatchObject({ search: "% Atlas _", page: 2, pageSize: 20 });
  });
});
