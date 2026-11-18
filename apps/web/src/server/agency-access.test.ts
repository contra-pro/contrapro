import { describe, expect, it, vi } from "vitest";
import { resolveAgencyAccess, type AgencyAccessPorts } from "../../../../packages/application/src/agency-access";
vi.mock("server-only", () => ({}));
// Never let production composition touch real request cookies or Auth during offline tests.
vi.mock("../auth/server", () => ({ componentAuthClient: async () => { throw new Error("OFFLINE_UNCONFIGURED"); } }));
import { getAgencyAccess } from "./agency-access";

const userId = "10000000-0000-4000-8000-000000000001";
const agencyId = "20000000-0000-4000-8000-000000000001";
const membershipId = "30000000-0000-4000-8000-000000000001";
const session = { userId, userState: "active", expiresAt: 2000 };
const membership = { userId, agencyId, membershipId, agencyName: "Agence test",
  membershipState: "active", agencyState: "active" };
function ports(identity: unknown = session, rows: unknown = [membership]): AgencyAccessPorts {
  return { session: vi.fn(async () => identity), memberships: vi.fn(async () => rows), now: () => 1000 };
}

describe("agency access — synthetic server ports only, no real authentication or PostgreSQL", () => {
  it("authorizes one active membership belonging to the verified active user", async () => {
    const deps = ports();
    expect(await resolveAgencyAccess(deps)).toEqual({ status: "authorized", userId, agencyId, membershipId, agencyName: "Agence test" });
    expect(deps.memberships).toHaveBeenCalledExactlyOnceWith(userId);
  });
  it.each([null, { ...session, expiresAt: 1000 }, { ...session, expiresAt: 999 }])("rejects absent/expired sessions before membership lookup", async (identity) => {
    const deps = ports(identity);
    expect(await resolveAgencyAccess(deps)).toEqual({ status: "signed-out" });
    expect(deps.memberships).not.toHaveBeenCalled();
  });
  it.each([undefined, {}, { ...session, userState: "disabled" }, { ...session, userId: "postgres" },
    { ...session, expiresAt: "2000" }, { ...session, expiresAt: Infinity }])("fails closed on malformed identity", async (identity) => {
    const deps = ports(identity === undefined ? {} : identity);
    expect(await resolveAgencyAccess(deps)).toEqual({ status: "forbidden" });
    expect(deps.memberships).not.toHaveBeenCalled();
  });
  it("distinguishes onboarding without claiming agency creation exists", async () => {
    expect(await resolveAgencyAccess(ports(session, []))).toEqual({ status: "onboarding" });
  });
  it.each([{ membershipState: "revoked" }, { agencyState: "pending" }, { agencyState: "suspended" },
    { userId: agencyId }, { membershipId: "bad" }, { agencyId: "bad" }, { agencyName: " " },
    { agencyName: "x".repeat(201) }, { membershipState: "owner" }, { agencyState: undefined }])("denies invalid or ineligible membership %j", async (change) => {
    expect(await resolveAgencyAccess(ports(session, [{ ...membership, ...change }]))).toEqual({ status: "forbidden" });
  });
  it.each([null, {}, [null], [membership, membership]])("rejects malformed/duplicate membership evidence", async (rows) => {
    expect((await resolveAgencyAccess(ports(session, rows))).status).not.toBe("authorized");
  });
  it("never picks the first of multiple eligible agencies", async () => {
    const second = { ...membership, agencyId: "20000000-0000-4000-8000-000000000002", membershipId: "30000000-0000-4000-8000-000000000002" };
    expect(await resolveAgencyAccess(ports(session, [membership, second]))).toEqual({ status: "selection-required" });
  });
  it("bounds membership evidence", async () => {
    expect(await resolveAgencyAccess(ports(session, Array(101).fill(membership)))).toEqual({ status: "unavailable" });
  });
  it("does not retain authorization between requests after revocation", async () => {
    const deps = ports();
    expect((await resolveAgencyAccess(deps)).status).toBe("authorized");
    vi.mocked(deps.memberships).mockResolvedValue([{ ...membership, membershipState: "revoked" }]);
    expect(await resolveAgencyAccess(deps)).toEqual({ status: "forbidden" });
  });
  it.each(["session", "memberships"] as const)("sanitizes %s failures", async (port) => {
    const deps = ports();
    vi.mocked(deps[port]).mockRejectedValue(new Error("postgres://secret:password@private/path"));
    expect(await resolveAgencyAccess(deps)).toEqual({ status: "unavailable" });
  });
  it("fails closed if the clock cannot be established", async () => {
    expect(await resolveAgencyAccess({ ...ports(), now: () => NaN })).toEqual({ status: "unavailable" });
  });
  it("rejects a session that expires during membership resolution", async () => {
    const now = vi.fn().mockReturnValueOnce(1000).mockReturnValueOnce(2000);
    expect(await resolveAgencyAccess({ ...ports(), now })).toEqual({ status: "signed-out" });
  });
  it("production composition stays unavailable without Supabase SSR and canonical mapping", async () => {
    expect(await getAgencyAccess()).toEqual({ status: "unavailable" });
  });
});
