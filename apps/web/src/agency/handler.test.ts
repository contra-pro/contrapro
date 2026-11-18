import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyContext } from "../auth/identity";
vi.mock("server-only", () => ({}));
import { handleAgencyAction } from "./handler";
import { readSelection, selectionCookie } from "./selection";

const origin = "https://contratpro.example";
const userId = "10000000-0000-4000-8000-000000000001";
const agencyId = "20000000-0000-4000-8000-000000000001";
const membershipId = "30000000-0000-4000-8000-000000000001";
const requestId = "40000000-0000-4000-8000-000000000001";
const profile = { name: "Atlas", ice: "", ifNumber: "", rc: "", address: "12 rue Atlas", city: "Rabat", phone: "+212612345678", email: "atlas@example.com" };
const settings = { defaultLocale: "fr", timeZone: "Africa/Casablanca", currency: "MAD" };
const ready: AgencyContext = { access: { status: "authorized", userId, agencyId, membershipId, agencyName: "Atlas" },
  canonical: { userId, subject: requestId, expiresAt: 999999 }, choices: [{ agencyId, name: "Atlas" }] };
const onboarding: AgencyContext = { ...ready, access: { status: "onboarding" }, choices: [] };
function fixture(context: AgencyContext = onboarding, owner = true) {
  const rpc = vi.fn<(name: string, args: unknown) => Promise<{ data: unknown; error: unknown }>>(async name => {
    if (name === "contratpro_create_agency") return { data: [{ agency_id: agencyId, user_id: userId, membership_id: membershipId }] as unknown, error: null as unknown };
    if (name === "contratpro_agency_profile") return { data: [{ agency_id: agencyId, is_owner: owner, profile, settings }], error: null };
    return { data: true, error: null };
  });
  const client = { rpc } as unknown as SupabaseClient;
  const getContext = vi.fn(async (_client: SupabaseClient, selection?: { userId: string; agencyId: string }) => selection?.agencyId === agencyId && selection.userId === userId ? ready : context);
  return { rpc, client, getContext, deps: { origin: () => origin, client: () => client, context: getContext, writesReady: () => true } };
}
function request(input: unknown, locale = "fr", requestOrigin = origin) {
  return new NextRequest(`${origin}/${locale}/app/agency-action`, { method: "POST", headers: { origin: requestOrigin, "content-type": "application/json" }, body: JSON.stringify(input) });
}

describe("agency HTTP integration — synthetic SDK, real validation and handler", () => {
  for (const locale of ["fr", "ar"] as const) {
    it(`${locale}: creates via one atomic RPC and verifies owner access before reporting success`, async () => {
      const f = fixture();
      const response = await handleAgencyAction(request({ action: "create", requestId, data: profile }, locale), locale, f.deps);
      expect(await response.json()).toEqual({ ok: true, destination: `/${locale}/app` });
      expect(f.rpc.mock.calls.filter(([name]) => name === "contratpro_create_agency")).toEqual([["contratpro_create_agency", {
        p_profile: profile, p_locale: locale, p_request_id: requestId }]]);
      expect(response.cookies.get(selectionCookie)).toMatchObject({ value: `${userId}:${agencyId}`, httpOnly: true, secure: true, sameSite: "lax" });
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(f.getContext).toHaveBeenLastCalledWith(f.client, { userId, agencyId });
    });
  }
  it.each(["signed-out", "unmapped", "forbidden", "unavailable"] as const)("denies creation for %s without mutation", async status => {
    const f = fixture({ access: { status }, canonical: null, choices: [] });
    const response = await handleAgencyAction(request({ action: "create", requestId, data: profile }), "fr", f.deps);
    expect(response.status).toBe(status === "signed-out" ? 401 : status === "unavailable" ? 503 : 403);
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it("keeps live writes disabled until separate runtime verification", async () => {
    const f = fixture();
    const response = await handleAgencyAction(request({ action: "create", requestId, data: profile }), "fr", { ...f.deps, writesReady: () => false });
    expect(response.status).toBe(503); expect(f.rpc).not.toHaveBeenCalled();
  });
  it.each([{ name: "" }, { ice: "bad" }, { email: "bad" }, { ownerId: userId }, { roleId: requestId }, { agencyId }])("rejects invalid or administrative profile input %j", async change => {
    const f = fixture();
    const response = await handleAgencyAction(request({ action: "create", requestId, data: { ...profile, ...change } }), "fr", f.deps);
    expect(response.status).toBe(400); expect(f.rpc).not.toHaveBeenCalled();
  });
  it("cannot use creation to self-assign membership in an existing tenant", async () => {
    const f = fixture();
    const response = await handleAgencyAction(request({ action: "create", requestId, data: profile, agencyId }), "fr", f.deps);
    expect(response.status).toBe(400); expect(f.getContext).not.toHaveBeenCalled();
  });
  it.each(["profile", "settings"])("non-owner cannot perform %s administration", async action => {
    const f = fixture(ready, false);
    const response = await handleAgencyAction(request({ action, requestId, data: action === "settings" ? settings : profile }), "fr", f.deps);
    expect(response.status).toBe(403);
    expect(f.rpc.mock.calls.map(([name]) => name)).toEqual(["contratpro_agency_profile"]);
  });
  it.each(["profile", "settings"])("owner updates %s only in the verified selected agency and verifies persistence", async action => {
    const f = fixture(ready);
    const response = await handleAgencyAction(request({ action, requestId, data: action === "settings" ? settings : profile }), "fr", f.deps);
    expect(await response.json()).toEqual({ ok: true });
    expect(f.rpc.mock.calls).toHaveLength(3);
    expect(f.rpc.mock.calls[1]).toEqual([action === "profile" ? "contratpro_update_agency" : "contratpro_update_agency_settings", {
      p_agency_id: agencyId, p_request_id: requestId, ...(action === "profile" ? { p_profile: profile } : { p_settings: settings }) }]);
  });
  it("rejects another tenant as a selection and never writes a selection cookie", async () => {
    const f = fixture(ready);
    const response = await handleAgencyAction(request({ action: "select", agencyId: requestId }), "fr", f.deps);
    expect(response.status).toBe(403); expect(response.cookies.get(selectionCookie)).toBeUndefined(); expect(f.rpc).not.toHaveBeenCalled();
  });
  it("selects only current trusted membership evidence even with management writes disabled", async () => {
    const f = fixture({ ...ready, access: { status: "selection-required" } });
    const response = await handleAgencyAction(request({ action: "select", agencyId }), "fr", { ...f.deps, writesReady: () => false });
    expect(await response.json()).toEqual({ ok: true, destination: "/fr/app" });
    expect(response.cookies.get(selectionCookie)?.value).toBe(`${userId}:${agencyId}`);
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it("rejects CSRF before identity lookup or mutations", async () => {
    const f = fixture();
    const response = await handleAgencyAction(request({ action: "create", requestId, data: profile }, "fr", "https://evil.example"), "fr", f.deps);
    expect(response.status).toBe(403); expect(f.getContext).not.toHaveBeenCalled();
  });
  it("never claims success or sets tenant selection on a failed/uncertain atomic call", async () => {
    const f = fixture(); f.rpc.mockRejectedValue(new Error("postgres://private:secret@server/path"));
    const response = await handleAgencyAction(request({ action: "create", requestId, data: profile }), "fr", f.deps);
    expect(await response.json()).toEqual({ ok: false, code: "uncertain" });
    expect(response.cookies.get(selectionCookie)).toBeUndefined(); expect(f.rpc).toHaveBeenCalledTimes(1);
  });
  it("does not claim success when newly created membership cannot be verified", async () => {
    const f = fixture(); f.getContext.mockResolvedValue(onboarding);
    const response = await handleAgencyAction(request({ action: "create", requestId, data: profile }), "fr", f.deps);
    expect(await response.json()).toEqual({ ok: false, code: "uncertain" });
    expect(response.cookies.get(selectionCookie)).toBeUndefined();
  });
  it("fails closed on profile database errors before any write", async () => {
    const f = fixture(ready); f.rpc.mockRejectedValue(new Error("private database error"));
    const response = await handleAgencyAction(request({ action: "profile", requestId, data: profile }), "fr", f.deps);
    expect(await response.json()).toEqual({ ok: false, code: "unavailable" });
    expect(f.rpc).toHaveBeenCalledTimes(1);
  });
  it("rejects oversized JSON and invalid request IDs", async () => {
    const f = fixture();
    const oversized = await handleAgencyAction(request({ action: "create", requestId, data: { ...profile, name: "x".repeat(9000) } }), "fr", f.deps);
    expect(oversized.status).toBe(400); expect(f.getContext).not.toHaveBeenCalled();
    const invalid = await handleAgencyAction(request({ action: "create", requestId: "bad", data: profile }), "fr", f.deps);
    expect(invalid.status).toBe(400); expect(f.rpc).not.toHaveBeenCalled();
  });
  it("reuses the supplied idempotency key rather than generating a second attempt", async () => {
    const f = fixture();
    for (let i = 0; i < 2; i++) await handleAgencyAction(request({ action: "create", requestId, data: profile }), "fr", f.deps);
    expect(f.rpc.mock.calls.filter(([name]) => name === "contratpro_create_agency").map(([, args]) => args)).toEqual([
      { p_profile: profile, p_locale: "fr", p_request_id: requestId }, { p_profile: profile, p_locale: "fr", p_request_id: requestId }]);
    // SQL's unique key, not this fake client, is responsible for actual database deduplication.
  });
  it.each([undefined, "bad", `${userId}:${agencyId}:extra`, `bad:${agencyId}`])("selection cookie is parsed only as a bounded identity hint", value => {
    expect(readSelection(value)).toBeUndefined();
  });
});
