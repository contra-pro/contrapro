import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAgencyAccess, supabaseAgencyContext, verifiedSubject } from "./identity";
import { AUTH_PROJECT_URL, appOrigin, validatePublicConfig } from "./config";

const sub = "10000000-0000-4000-8000-000000000001";
const internal = "20000000-0000-4000-8000-000000000001";
const claims = { sub, exp: 2000, iss: `${AUTH_PROJECT_URL}/auth/v1`, aud: "authenticated" };
const row = { supabase_user_id: sub, user_id: internal, user_state: "active",
  membership_id: "30000000-0000-4000-8000-000000000001", agency_id: "40000000-0000-4000-8000-000000000001",
  agency_name: "Agence test", membership_state: "active", agency_state: "active" };
function fixture(rows: unknown = [row]) {
  const auth = { getUser: vi.fn(async () => ({ data: { user: { id: sub } as { id: string } | null }, error: null as unknown })),
    getClaims: vi.fn(async () => ({ data: { claims: claims as unknown }, error: null as unknown })) };
  const rpc = vi.fn(async () => ({ data: rows, error: null as unknown }));
  return { auth, rpc, client: { auth, rpc } as unknown as SupabaseClient };
}
describe("verified Supabase identity and canonical mapping — no live transport", () => {
  it("missing server-validated user means signed-out and never performs a mapping lookup", async () => {
    const f = fixture(); f.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await supabaseAgencyAccess(f.client, true, () => 1000)).toEqual({ status: "signed-out" });
    expect(f.auth.getClaims).not.toHaveBeenCalled(); expect(f.rpc).not.toHaveBeenCalled();
  });
  it("maps distinct provider/internal UUIDs and authorizes only the returned active membership", async () => {
    const { client, rpc } = fixture();
    expect(await supabaseAgencyAccess(client, true, () => 1000)).toEqual({ status: "authorized",
      userId: internal, agencyId: row.agency_id, membershipId: row.membership_id, agencyName: row.agency_name });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("contratpro_auth_access");
  });
  it("keeps the dashboard unavailable until restricted runtime enforcement is verified", async () => {
    const { client, rpc } = fixture();
    expect(await supabaseAgencyAccess(client, false, () => 1000)).toEqual({ status: "unavailable" });
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([{}, { sub }, { ...claims, sub: internal }, { ...claims, exp: 1 }, { ...claims, exp: "2000" },
    { ...claims, exp: Infinity }, { ...claims, exp: 2.5 }, { ...claims, aud: "anon" },
    { ...claims, iss: "https://another-project.supabase.co/auth/v1" }])("rejects invalid, expired or inconsistent claims %j", async value => {
    const f = fixture(); f.auth.getClaims.mockResolvedValue({ data: { claims: value }, error: null });
    expect(await supabaseAgencyAccess(f.client, true, () => 1000)).toEqual({ status: "signed-out" });
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it.each(["getUser", "getClaims"] as const)("denies %s verification errors before lookup", async method => {
    const f = fixture();
    if (method === "getUser") f.auth.getUser.mockResolvedValue({ data: { user: { id: sub } }, error: new Error("private provider error") });
    else f.auth.getClaims.mockResolvedValue({ data: { claims }, error: new Error("private provider error") });
    expect(await supabaseAgencyAccess(f.client, true, () => 1000)).toEqual({ status: "signed-out" });
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it("does not equate Supabase identity or email with a canonical account", async () => {
    expect(await supabaseAgencyAccess(fixture([]).client, true, () => 1000)).toEqual({ status: "unmapped" });
  });
  it("an authenticated mapped user without membership needs onboarding", async () => {
    const noMembership = { ...row, membership_id: null, agency_id: null, agency_name: null, membership_state: null, agency_state: null };
    expect(await supabaseAgencyAccess(fixture([noMembership]).client, true, () => 1000)).toEqual({ status: "onboarding" });
  });
  it.each([{ user_state: "disabled" }, { supabase_user_id: internal }, { user_id: "bad" },
    { membership_state: "revoked" }, { agency_state: "suspended" }, { agency_id: "bad" }])("fails closed for mapping/membership mismatch %j", async change => {
    expect(await supabaseAgencyAccess(fixture([{ ...row, ...change }]).client, true, () => 1000)).toEqual({ status: "forbidden" });
  });
  it.for([[row, row], [row, { ...row, user_id: sub }], [row, { ...row, supabase_user_id: internal }],
    [row, { ...row, user_state: "disabled" }], [null]])("rejects duplicate or conflicting evidence", async rows => {
    expect(await supabaseAgencyAccess(fixture(rows).client, true, () => 1000)).toEqual({ status: "forbidden" });
  });
  it("requires selection across multiple valid agencies", async () => {
    const second = { ...row, membership_id: "30000000-0000-4000-8000-000000000002", agency_id: "40000000-0000-4000-8000-000000000002" };
    expect(await supabaseAgencyAccess(fixture([row, second]).client, true, () => 1000)).toEqual({ status: "selection-required" });
  });
  it("uses a selected agency only when bound to the currently mapped canonical user", async () => {
    const second = { ...row, membership_id: "30000000-0000-4000-8000-000000000002", agency_id: "40000000-0000-4000-8000-000000000002" };
    const context = await supabaseAgencyContext(fixture([row, second]).client, true, () => 1000, { userId: internal, agencyId: second.agency_id });
    expect(context.access).toMatchObject({ status: "authorized", agencyId: second.agency_id });
    expect(context.choices).toHaveLength(2);
    const otherUser = await supabaseAgencyContext(fixture([row, second]).client, true, () => 1000, { userId: sub, agencyId: second.agency_id });
    expect(otherUser.access).toEqual({ status: "selection-required" });
  });
  it.for([null, {}, Array(101).fill(row)])("rejects unbounded or malformed RPC output", async rows => {
    expect(await supabaseAgencyAccess(fixture(rows).client, true, () => 1000)).toEqual({ status: "unavailable" });
  });
  it("sanitizes RPC and network failures", async () => {
    const f = fixture(); f.rpc.mockRejectedValue(new Error("postgres://private:secret@example/path"));
    expect(await supabaseAgencyAccess(f.client, true, () => 1000)).toEqual({ status: "unavailable" });
  });
  it("verifiedSubject does not turn a server exception into an identity", async () => {
    const f = fixture(); f.auth.getUser.mockRejectedValue(new Error("network"));
    await expect(verifiedSubject(f.client)).rejects.toThrow();
  });
  it("does not validate credentials against an unavailable clock", async () => {
    const f = fixture();
    expect(await verifiedSubject(f.client, NaN)).toBeNull();
    expect(f.auth.getUser).not.toHaveBeenCalled();
  });
});

describe("public configuration boundary", () => {
  it("accepts only the pinned project and public key kinds", () => {
    expect(validatePublicConfig(AUTH_PROJECT_URL, "sb_publishable_example").url).toBe(AUTH_PROJECT_URL);
    const anon = `header.${btoa(JSON.stringify({ role: "anon" }))}.signature`;
    expect(validatePublicConfig(AUTH_PROJECT_URL, anon).key).toBe(anon);
  });
  it.each([undefined, "sb_secret_private", "", "not-a-key",
    `header.${btoa(JSON.stringify({ role: "service_role" }))}.signature`])("rejects absent, private or invalid keys", key => {
    expect(() => validatePublicConfig(AUTH_PROJECT_URL, key)).toThrow("AUTH_CONFIGURATION_UNAVAILABLE");
  });
  it.each(["https://other.supabase.co", `${AUTH_PROJECT_URL}/`, "http://gllsiklbvqpxzucvkehw.supabase.co"])("rejects another auth target %s", url => {
    expect(() => validatePublicConfig(url, "sb_publishable_example")).toThrow();
  });
  it.each(["https://example.com/path", "https://user:secret@example.com", "http://example.com", "//evil.com", undefined])("rejects unsafe application origins", origin => {
    expect(() => appOrigin(origin)).toThrow();
  });
  it("allows exact HTTPS and local development origins", () => {
    expect(appOrigin("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
    expect(appOrigin("https://example.com")).toBe("https://example.com");
  });
});
