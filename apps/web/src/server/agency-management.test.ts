import { describe, expect, it } from "vitest";
import { validateAgencyProfile, validateAgencySettings } from "../../../../packages/application/src/agency-management";
import { resolveAgencyAccess } from "../../../../packages/application/src/agency-access";

export const profile = { name: "Agence Atlas", ice: "", ifNumber: "", rc: "", address: "12 rue Atlas", city: "Rabat", phone: "+212612345678", email: "agence@example.com" };
describe("agency product validation", () => {
  it("accepts optional registration fields and normalizes user input", () => {
    expect(validateAgencyProfile({ ...profile, name: " Atlas ", email: "AGENCE@EXAMPLE.COM" })).toEqual({ ok: true, value: { ...profile, name: "Atlas" } });
  });
  it.each(["name", "address", "city", "phone", "email"])("requires %s", field => {
    expect(validateAgencyProfile({ ...profile, [field]: "" }).ok).toBe(false);
  });
  it.each([{ ice: "123" }, { ifNumber: "ABC" }, { phone: "abc" }, { email: "bad" }, { name: "x".repeat(201) }, { city: null }, { name: "\u0000bad" }])("rejects invalid fields %j", change => {
    expect(validateAgencyProfile({ ...profile, ...change }).ok).toBe(false);
  });
  it.each(["ownerId", "userId", "roleId", "agencyId", "state"])("rejects browser-controlled %s", field => {
    expect(validateAgencyProfile({ ...profile, [field]: "attacker" })).toEqual({ ok: false, errors: { form: "invalid" } });
  });
  it("accepts localized defaults and rejects extra administrative inputs", () => {
    expect(validateAgencySettings({ defaultLocale: "ar", timeZone: "Africa/Casablanca", currency: "MAD" }).ok).toBe(true);
    for (const input of [{ defaultLocale: "en" }, { timeZone: "invalid" }, { currency: "EUR" }, { ownerId: "fake" }]) {
      expect(validateAgencySettings(input).ok).toBe(false);
    }
  });
});

describe("agency selection is revalidated against current membership", () => {
  const userId = "10000000-0000-4000-8000-000000000001";
  const a = "20000000-0000-4000-8000-000000000001";
  const b = "20000000-0000-4000-8000-000000000002";
  const row = { userId, agencyId: a, membershipId: "30000000-0000-4000-8000-000000000001", agencyName: "Atlas", membershipState: "active", agencyState: "active" };
  const ports = { session: async () => ({ userId, userState: "active", expiresAt: 2000 }),
    memberships: async () => [row, { ...row, agencyId: b, membershipId: "30000000-0000-4000-8000-000000000002" }], now: () => 1000 };
  it("selects only an eligible agency", async () => {
    expect(await resolveAgencyAccess({ ...ports, selectedAgencyId: b })).toMatchObject({ status: "authorized", agencyId: b });
  });
  it.each(["bad", "20000000-0000-4000-8000-000000000003"])("never trusts an unknown selection %s", async selectedAgencyId => {
    expect(await resolveAgencyAccess({ ...ports, selectedAgencyId })).toEqual({ status: "selection-required" });
  });
  it("does not retain a revoked selection", async () => {
    expect(await resolveAgencyAccess({ ...ports, selectedAgencyId: a,
      memberships: async () => [{ ...row, membershipState: "revoked" }] })).toEqual({ status: "forbidden" });
  });
});
