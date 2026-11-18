import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { handleProvisioning } from "./provisioning-handler";
import { supabaseAgencyContext } from "./identity";
import { AUTH_PROJECT_URL } from "./config";
import { handleAuth } from "./handlers";
import { POST } from "../app/[locale]/auth/provision/route";

const origin = "https://contratpro.example";
const subject = "10000000-0000-4000-8000-000000000001";
const userId = "20000000-0000-4000-8000-000000000001";
const mapping = { supabase_user_id: subject, user_id: userId, user_state: "active", membership_id: null,
  agency_id: null, agency_name: null, membership_state: null, agency_state: null };
function fixture() {
  const state = { mapped: false, enabled: true, accessVerified: true, readback: [mapping] as unknown,
    result: "created" as unknown, fail: false };
  const auth = {
    getUser: vi.fn(async () => ({ data: { user: { id: subject } }, error: null as unknown })),
    getClaims: vi.fn(async () => ({ data: { claims: { sub: subject, aud: "authenticated", role: "authenticated", is_anonymous: false, iss: `${AUTH_PROJECT_URL}/auth/v1`, exp: 2000 } as Record<string, unknown> }, error: null as unknown })),
  };
  const rpc = vi.fn(async (name: string): Promise<{ data: unknown; error: unknown }> => {
    if (name === "contratpro_auth_access") return { data: state.mapped ? state.readback : [], error: null };
    if (name === "contratpro_provision_identity") {
      state.mapped = true;
      if (state.fail) throw new Error("private database password");
      return { data: state.result, error: null };
    }
    throw new Error(`UNEXPECTED_RPC ${name}`);
  });
  const client = { auth, rpc } as unknown as SupabaseClient;
  const createClient = vi.fn(() => client);
  const deps = { origin: () => origin, client: createClient, enabled: () => state.enabled,
    accessVerified: () => state.accessVerified, now: () => 1000 };
  return { state, auth, rpc, client, createClient, deps };
}
function request(locale = "fr", requestOrigin = origin, body?: string) {
  return new NextRequest(`${origin}/${locale}/auth/provision`, { method: "POST", headers: { origin: requestOrigin }, ...(body === undefined ? {} : { body }) });
}

describe("canonical provisioning POST — real adapter and resolver, injected SDK only", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn(() => { throw new Error("NETWORK_FORBIDDEN"); })));
  afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it("production flag defaults disabled without constructing an SDK client", async () => {
    vi.stubEnv("CONTRATPRO_APP_ORIGIN", origin);
    vi.stubEnv("CONTRATPRO_CANONICAL_PROVISIONING_VERIFIED", undefined);
    const response = await POST(request(), { params: Promise.resolve({ locale: "fr" }) });
    expect(await response.json()).toEqual({ ok: false, code: "blocked" });
  });
  for (const locale of ["fr", "ar"] as const) {
    it(`${locale}: disabled flag preserves unmapped state with no provisioning call`, async () => {
      const f = fixture(); f.state.enabled = false;
      expect(await (await handleProvisioning(request(locale), locale, f.deps)).json()).toEqual({ ok: false, code: "blocked" });
      expect(f.createClient).not.toHaveBeenCalled(); expect(f.rpc).not.toHaveBeenCalled();
      expect((await supabaseAgencyContext(f.client, true, () => 1000)).access.status).toBe("unmapped");
    });
    it(`${locale}: access verification gate remains independent and closed`, async () => {
      const f = fixture(); f.state.accessVerified = false;
      expect((await handleProvisioning(request(locale), locale, f.deps)).status).toBe(503);
      expect(f.createClient).not.toHaveBeenCalled();
    });
    it.each(["getUser", "getClaims"] as const)(`${locale}: unverified %s cannot write`, async method => {
      const f = fixture();
      if (method === "getUser") f.auth.getUser.mockResolvedValue({ data: { user: { id: subject } }, error: "private failure" });
      else f.auth.getClaims.mockResolvedValue({ data: { claims: { sub: subject, aud: "anon", iss: `${AUTH_PROJECT_URL}/auth/v1`, exp: 2000 } }, error: null });
      expect((await handleProvisioning(request(locale), locale, f.deps)).status).toBe(401);
      expect(f.rpc).not.toHaveBeenCalled();
    });
    it.each(["created", "existing"])(`${locale}: confirms %s only after canonical read-back`, async result => {
      const f = fixture(); f.state.result = result;
      const response = await handleProvisioning(request(locale), locale, f.deps);
      expect(await response.json()).toEqual({ ok: true, destination: `/${locale}/app` });
      expect(f.rpc.mock.calls).toEqual([["contratpro_auth_access"], ["contratpro_provision_identity"], ["contratpro_auth_access"]]);
      expect((await supabaseAgencyContext(f.client, true, () => 1000)).access.status).toBe("onboarding");
      expect(response.headers.get("cache-control")).toContain("no-store");
    });
    it(`${locale}: ambiguous RPC failure has no retry or internal error disclosure`, async () => {
      const f = fixture(); f.state.fail = true;
      expect(await (await handleProvisioning(request(locale), locale, f.deps)).json()).toEqual({ ok: false, code: "uncertain" });
      expect(f.rpc.mock.calls.filter(([name]) => name === "contratpro_provision_identity")).toHaveLength(1);
    });
    it(`${locale}: expiry before a provisioning attempt remains signed-out without a write`, async () => {
      const f = fixture();
      const response = await handleProvisioning(request(locale), locale, { ...f.deps, now: () => 2000000 });
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ ok: false, code: "signed-out" });
      expect(f.rpc).not.toHaveBeenCalled();
    });
    it(`${locale}: expiry after an acknowledged write returns uncertain/503, never signed-out`, async () => {
      const f = fixture(); let clock = 1000;
      const transport = f.rpc.getMockImplementation()!;
      f.rpc.mockImplementation(async name => {
        const result = await transport(name);
        if (name === "contratpro_provision_identity") clock = 2000000;
        return result;
      });
      const response = await handleProvisioning(request(locale), locale, { ...f.deps, now: () => clock });
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ ok: false, code: "uncertain" });
      expect(f.state.mapped).toBe(true);
      expect(f.rpc.mock.calls.filter(([name]) => name === "contratpro_provision_identity")).toHaveLength(1);
    });
    it(`${locale}: expiry between unmapped lookup and write is blocked before the RPC`, async () => {
      const f = fixture(); let clock = 1000;
      const transport = f.rpc.getMockImplementation()!;
      f.rpc.mockImplementation(async name => {
        const result = await transport(name);
        if (name === "contratpro_auth_access") clock = 2000000;
        return result;
      });
      const response = await handleProvisioning(request(locale), locale, { ...f.deps, now: () => clock });
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ ok: false, code: "signed-out" });
      expect(f.rpc.mock.calls).toEqual([["contratpro_auth_access"]]);
    });
    it(`${locale}: a different verified subject at read-back never confirms the original request`, async () => {
      const f = fixture(); const transport = f.rpc.getMockImplementation()!;
      const claims = (await f.auth.getClaims()).data.claims;
      f.rpc.mockImplementation(async name => {
        const result = await transport(name);
        if (name === "contratpro_provision_identity") {
          f.auth.getUser.mockResolvedValue({ data: { user: { id: "30000000-0000-4000-8000-000000000001" } }, error: null });
          f.auth.getClaims.mockResolvedValue({ data: { claims: { ...claims, sub: "30000000-0000-4000-8000-000000000001" } }, error: null });
          f.state.readback = [{ ...mapping, supabase_user_id: "30000000-0000-4000-8000-000000000001" }];
        }
        return result;
      });
      const response = await handleProvisioning(request(locale), locale, f.deps);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ ok: false, code: "uncertain" });
    });
    it(`${locale}: credential verification lost during read-back remains uncertain`, async () => {
      const f = fixture(); const transport = f.rpc.getMockImplementation()!;
      f.rpc.mockImplementation(async name => {
        const result = await transport(name);
        if (name === "contratpro_provision_identity") f.auth.getUser.mockRejectedValue(new Error("private credential failure"));
        return result;
      });
      const response = await handleProvisioning(request(locale), locale, f.deps);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ ok: false, code: "uncertain" });
    });
    it.each([false, true])(`${locale}: equal provider/canonical IDs never confirm success (existing=%s)`, async existing => {
      const f = fixture(); f.state.mapped = existing;
      f.state.readback = [{ ...mapping, user_id: subject }];
      const response = await handleProvisioning(request(locale), locale, f.deps);
      expect(response.status).toBe(existing ? 403 : 503);
      expect(await response.json()).toEqual({ ok: false, code: existing ? "forbidden" : "uncertain" });
      expect(f.rpc.mock.calls.filter(([name]) => name === "contratpro_provision_identity")).toHaveLength(existing ? 0 : 1);
    });
    it.each([{ role: "anon" }, { role: null }, { is_anonymous: true }, { is_anonymous: "false" }, { is_anonymous: undefined }])(`${locale}: simulated bridge denial for incompatible claims %j never confirms success`, async change => {
      const f = fixture();
      const verified = await f.auth.getClaims();
      f.auth.getClaims.mockResolvedValue({ data: { claims: { ...verified.data.claims, ...change } }, error: null });
      // Existing app verification does not enforce bridge-only claims. Model its denial,
      // without claiming this fixture proves live PostgREST or SQL enforcement.
      const transport = f.rpc.getMockImplementation()!;
      f.rpc.mockImplementation(name => name === "contratpro_provision_identity" ? Promise.resolve({ data: null, error: { code: "42501", message: "private detail" } }) : transport(name));
      const response = await handleProvisioning(request(locale), locale, f.deps);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ ok: false, code: "uncertain" });
      expect(f.rpc.mock.calls.filter(([name]) => name === "contratpro_provision_identity")).toHaveLength(1);
    });
    it.each([[], null, [{}], [{ ...mapping, user_id: "bad" }], [{ ...mapping, supabase_user_id: userId }], [{ ...mapping, user_state: "disabled" }]])(`${locale}: missing or malformed read-back %j never confirms success`, async rows => {
      const f = fixture(); f.state.readback = rows;
      expect(await (await handleProvisioning(request(locale), locale, f.deps)).json()).toEqual({ ok: false, code: "uncertain" });
    });
    it(`${locale}: an existing mapped user skips writes and keeps membership evidence`, async () => {
      const f = fixture(); f.state.mapped = true;
      f.state.readback = [{ ...mapping, membership_id: subject, agency_id: userId, agency_name: "Atlas", membership_state: "active", agency_state: "active" }];
      expect(await (await handleProvisioning(request(locale), locale, f.deps)).json()).toEqual({ ok: true, destination: `/${locale}/app` });
      expect(f.rpc.mock.calls).toEqual([["contratpro_auth_access"]]);
      expect((await supabaseAgencyContext(f.client, true, () => 1000)).access).toMatchObject({ status: "authorized", agencyId: userId });
    });
    it(`${locale}: repeated explicit actions avoid duplicate application writes`, async () => {
      const f = fixture();
      for (let i = 0; i < 2; i++) expect((await handleProvisioning(request(locale), locale, f.deps)).status).toBe(200);
      expect(f.rpc.mock.calls.filter(([name]) => name === "contratpro_provision_identity")).toHaveLength(1);
    });
    it(`${locale}: concurrent and replayed OAuth callbacks never provision`, async () => {
      const f = fixture();
      const exchange = vi.fn().mockResolvedValueOnce({ error: null }).mockResolvedValue({ error: new Error("consumed PKCE code") });
      Object.assign(f.auth, { exchangeCodeForSession: exchange });
      const nonce = "a".repeat(64);
      const callback = () => new NextRequest(`${origin}/${locale}/auth/callback?code=synthetic&flow=${nonce}`, {
        headers: { cookie: `contratpro-auth-flow-${locale}=${nonce}` } });
      const deps = { origin: () => origin, client: () => f.client, nonce: () => nonce, now: () => 1000 };
      const responses = await Promise.all([handleAuth(callback(), locale, "callback", deps), handleAuth(callback(), locale, "callback", deps)]);
      expect(responses.map(response => response.headers.get("location"))).toEqual([`${origin}/${locale}/app`, `${origin}/${locale}/sign-in?status=error`]);
      expect((await handleAuth(callback(), locale, "callback", deps)).headers.get("location")).toBe(`${origin}/${locale}/sign-in?status=error`);
      expect(f.rpc).not.toHaveBeenCalled();
      expect((await supabaseAgencyContext(f.client, true, () => 1000)).access.status).toBe("unmapped");
    });
    it(`${locale}: concurrent actions confirm independently without automatic retries`, async () => {
      const f = fixture();
      const responses = await Promise.all([handleProvisioning(request(locale), locale, f.deps), handleProvisioning(request(locale), locale, f.deps)]);
      for (const response of responses) expect(await response.json()).toEqual({ ok: true, destination: `/${locale}/app` });
      const writes = f.rpc.mock.calls.filter(([name]) => name === "contratpro_provision_identity");
      expect(writes).toHaveLength(2);
      expect(f.rpc.mock.calls.every(([name]) => ["contratpro_auth_access", "contratpro_provision_identity"].includes(name))).toBe(true);
    });
    it(`${locale}: rejects client identity input and CSRF before constructing a client`, async () => {
      const f = fixture();
      for (const body of [JSON.stringify({ userId }), `subject=${subject}`, "{}"])
        expect((await handleProvisioning(request(locale, origin, body), locale, f.deps)).status).toBe(400);
      expect((await handleProvisioning(request(locale, "https://evil.example"), locale, f.deps)).status).toBe(403);
      expect((await handleProvisioning(new NextRequest(`${origin}/${locale}/auth/provision`), locale, f.deps)).status).toBe(403);
      expect(f.createClient).not.toHaveBeenCalled();
    });
  }
});
