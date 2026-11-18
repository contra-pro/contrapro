import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readAgencyProfile } from "./profile";
const agencyId = "10000000-0000-4000-8000-000000000001";
const row = { agency_id: agencyId, is_owner: false,
  profile: { name: "Atlas", ice: null, ifNumber: null, rc: null, address: null, city: null, phone: null, email: null },
  settings: { defaultLocale: "fr", timeZone: "Africa/Casablanca", currency: "MAD" } };
function client(data: unknown, error: unknown = null) { return { rpc: vi.fn(async () => ({ data, error })) } as unknown as SupabaseClient; }
describe("agency profile projection", () => {
  it("reads a member-visible existing agency without granting owner permissions", async () => {
    const db = client([row]);
    expect(await readAgencyProfile(db, agencyId)).toMatchObject({ agencyId, isOwner: false, profile: { name: "Atlas", address: "" } });
    expect(db.rpc).toHaveBeenCalledExactlyOnceWith("contratpro_agency_profile", { p_agency_id: agencyId });
  });
  it.for([[], [row, row], [null], [{ ...row, agency_id: "other-tenant" }], [{ ...row, is_owner: "true" }],
    [{ ...row, profile: { ...row.profile, name: "" } }], [{ ...row, profile: { ...row.profile, role: "owner" } }]])("rejects malformed, conflicting or cross-tenant profile data", async data => {
    expect(await readAgencyProfile(client(data), agencyId)).toBeNull();
  });
  it("returns no profile on a database error", async () => {
    expect(await readAgencyProfile(client([row], { message: "private" }), agencyId)).toBeNull();
  });
});
