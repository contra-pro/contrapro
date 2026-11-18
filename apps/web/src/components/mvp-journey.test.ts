import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { supabaseAgencyContext } from "../auth/identity";
import { AUTH_PROJECT_URL } from "../auth/config";
import { handleAgencyAction } from "../agency/handler";
import { readSelection, selectionCookie } from "../agency/selection";
import { handleClients } from "../clients/handler";
import { getAgencyAccess, getAgencyContext } from "../server/agency-access";
import { componentAuthClient } from "../auth/server";
import Dashboard from "../app/[locale]/app/page";
import ClientDetails from "../app/[locale]/app/clients/[clientId]/page";
import { clientMessages } from "../i18n/clients";
import { agencyAccessMessages } from "../i18n/agency-access";
import { emptyClient } from "../../../../packages/application/src/clients";

vi.mock("server-only", () => ({}));
vi.mock("../server/agency-access", () => ({ getAgencyContext: vi.fn(), getAgencyAccess: vi.fn() }));
vi.mock("../auth/server", () => ({ componentAuthClient: vi.fn(), serverAuthClient: () => { throw new Error("LIVE_CLIENT_FORBIDDEN"); } }));
vi.mock("../auth/session-sync", () => ({ SessionSync: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }), notFound: () => { throw new Error("NOT_FOUND"); } }));

const origin = "https://contratpro.example";
const subject = "10000000-0000-4000-8000-000000000001";
const userId = "20000000-0000-4000-8000-000000000001";
const agencyId = "30000000-0000-4000-8000-000000000001";
const membershipId = "40000000-0000-4000-8000-000000000001";
const key = "50000000-0000-4000-8000-000000000001";
const clientId = "60000000-0000-4000-8000-000000000001";
const foreignId = "70000000-0000-4000-8000-000000000001";
const profile = { name: "Atlas <script>agency</script>", ice: "", ifNumber: "", rc: "", address: "12 rue Atlas", city: "Rabat", phone: "+212612345678", email: "atlas@example.com" };
const contact = { ...emptyClient, firstName: "Amina", lastName: "Atlas", phone: "+212612345678" };
type Locale = "fr" | "ar";

// Scripted SDK responses model boundary evidence, not SQL/RLS or business rules.
// Real identity resolution, validators, handlers, scope and pages consume that evidence.
function fixture(locale: Locale) {
  const state = { mapped: true, created: false, revoked: false, unavailable: false, secondAgency: false,
    canCreate: true, ready: true, owner: true, uncertainAgency: false, uncertainClient: false,
    foreignDetail: false, saved: false, cookie: "" };
  const row = { supabase_user_id: subject, user_id: userId, user_state: "active",
    membership_id: membershipId, agency_id: agencyId, agency_name: profile.name, membership_state: "active", agency_state: "active" };
  const rpc = vi.fn(async (name: string, args?: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> => {
    switch (name) {
      case "contratpro_auth_access":
        if (state.unavailable) throw new Error("private authorization failure");
        return { data: !state.mapped ? [] : !state.created ? [{ ...row, membership_id: null, agency_id: null, agency_name: null, membership_state: null, agency_state: null }] :
          [{ ...row, membership_state: state.revoked ? "revoked" : "active" }, ...(state.secondAgency ? [{ ...row, agency_id: foreignId, membership_id: clientId }] : [])], error: null };
      case "contratpro_create_agency":
        state.created = true;
        if (state.uncertainAgency) throw new Error("response lost after mutation");
        return { data: [{ agency_id: agencyId, user_id: userId, membership_id: membershipId }], error: null };
      case "contratpro_agency_profile":
        return { data: [{ agency_id: agencyId, is_owner: state.owner, profile,
          settings: { defaultLocale: locale, timeZone: "Africa/Casablanca", currency: "MAD" } }], error: null };
      case "contratpro_clients_permissions":
        return { data: { read: true, create: state.canCreate, update: false, archive: false }, error: null };
      case "contratpro_client_create":
        state.saved = true;
        return { data: clientId, error: null };
      case "contratpro_client_creation_contract":
        return { data: 2, error: null };
      case "contratpro_client_detail":
        if (state.uncertainClient) throw new Error("read-back response lost");
        return { data: state.foreignDetail ? { ...contact, id: clientId, agencyId: foreignId, state: "active", version: 1 } :
          state.saved && args?.p_id === clientId ? { ...contact, id: clientId, agencyId, state: "active", version: 1 } : null, error: null };
      default: throw new Error(`Unexpected fixture RPC: ${name}`);
    }
  });
  const auth = { getUser: vi.fn(async () => ({ data: { user: { id: subject } }, error: null })),
    getClaims: vi.fn(async () => ({ data: { claims: { sub: subject, exp: 2000, iss: `${AUTH_PROJECT_URL}/auth/v1`, aud: "authenticated" } }, error: null })) };
  const client = { auth, rpc } as unknown as SupabaseClient;
  const context = (sdk = client, selection = readSelection(state.cookie)) => supabaseAgencyContext(sdk, true, () => 1000, selection);
  vi.mocked(getAgencyContext).mockImplementation(() => context());
  vi.mocked(getAgencyAccess).mockImplementation(async () => (await context()).access);
  vi.mocked(componentAuthClient).mockResolvedValue(client);
  const deps = { origin: () => origin, client: () => client, context, writesReady: () => true, ready: () => state.ready };
  const request = (route: string, input: unknown, requestOrigin = origin) => new NextRequest(`${origin}/${locale}/app/${route}`, {
    method: "POST", headers: { origin: requestOrigin, "content-type": "application/json", ...(state.cookie ? { cookie: `${selectionCookie}=${state.cookie}` } : {}) }, body: JSON.stringify(input) });
  const agency = (input: unknown = { action: "create", requestId: key, data: profile }, requestOrigin = origin) => handleAgencyAction(request("agency-action", input, requestOrigin), locale, deps);
  const clients = (input: unknown = { action: "create", requestId: key, data: contact }, requestOrigin = origin) => handleClients(request("client-action", input, requestOrigin), locale, deps);
  const dashboard = async () => renderToStaticMarkup(await Dashboard({ params: Promise.resolve({ locale }) }));
  const createAgency = async () => {
    const response = await agency();
    expect(await response.json()).toEqual({ ok: true, destination: `/${locale}/app` });
    state.cookie = response.cookies.get(selectionCookie)!.value;
    return response;
  };
  return { state, rpc, auth, context, agency, clients, dashboard, createAgency };
}

describe("offline mapped-user MVP journey — no external transport", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(1000);
    vi.stubEnv("CONTRATPRO_CLIENTS_VERIFIED", "true");
    vi.stubGlobal("fetch", vi.fn(() => { throw new Error("NETWORK_FORBIDDEN"); }));
  });
  afterEach(() => {
    expect(fetch).not.toHaveBeenCalled();
    vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs();
  });
  for (const locale of ["fr", "ar"] as const) {
    it(`${locale}: mapped identity → owner agency → selection → dashboard → client → confirmed detail`, async () => {
      const f = fixture(locale);
      expect((await f.context()).access).toEqual({ status: "onboarding" });
      expect((await f.context()).canonical?.userId).toBe(userId);
      const created = await f.createAgency();
      expect(created.cookies.get(selectionCookie)).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true });
      expect(f.rpc).toHaveBeenCalledWith("contratpro_agency_profile", { p_agency_id: agencyId });
      const selected = await f.agency({ action: "select", agencyId });
      expect(await selected.json()).toEqual({ ok: true, destination: `/${locale}/app` });
      f.state.cookie = selected.cookies.get(selectionCookie)!.value;
      expect(readSelection(f.state.cookie)).toEqual({ userId, agencyId });
      expect((await f.context()).access).toMatchObject({ status: "authorized", agencyId, membershipId });
      const html = await f.dashboard();
      expect(html).toContain("Atlas &lt;script&gt;agency&lt;/script&gt;");
      expect(html).toContain(`/${locale}/app/clients/new`);
      expect(html).toContain(clientMessages(locale).create);
      f.rpc.mockClear();
      expect(await (await f.clients()).json()).toEqual({ ok: true, id: clientId, version: 1 });
      expect(f.rpc.mock.calls.map(([name]) => name)).toEqual(["contratpro_auth_access", "contratpro_clients_permissions", "contratpro_client_creation_contract", "contratpro_client_create", "contratpro_client_detail"]);
      expect(f.rpc).toHaveBeenCalledWith("contratpro_client_create", { p_agency_id: agencyId, p_key: key, p_details: contact });
      const detail = await f.clients({ action: "detail", id: clientId });
      expect(await detail.json()).toEqual({ ok: true, client: { ...contact, id: clientId, version: 1 } });
      const page = renderToStaticMarkup(await ClientDetails({ params: Promise.resolve({ locale, clientId }) }));
      expect(page).toContain(clientMessages(locale).details);
      expect(page).toContain("Amina");
      expect(page).toContain(`/${locale}/app/clients`);
    });
    it(`${locale}: unmapped identity cannot create an agency`, async () => {
      const f = fixture(locale); f.state.mapped = false;
      expect((await f.context()).access.status).toBe("unmapped");
      expect((await f.agency()).status).toBe(403);
      expect(f.rpc.mock.calls.every(([name]) => name === "contratpro_auth_access")).toBe(true);
      expect(await f.dashboard()).toContain(agencyAccessMessages(locale).states.unmapped.title);
    });
    it.each(["stale", "wrong-user"])(`${locale}: rejects %s selection evidence`, async kind => {
      const f = fixture(locale); await f.createAgency(); f.state.secondAgency = true;
      f.state.cookie = kind === "stale" ? `${userId}:${key}` : `${subject}:${agencyId}`;
      expect((await f.context()).access.status).toBe("selection-required");
      expect((await f.clients()).status).toBe(403);
      const rejected = await f.agency({ action: "select", agencyId: key });
      expect(rejected.status).toBe(403); expect(rejected.cookies.get(selectionCookie)).toBeUndefined();
      expect(await f.dashboard()).toContain(agencyAccessMessages(locale).states["selection-required"].title);
    });
    it(`${locale}: rejects a cross-tenant detail returned by the transport`, async () => {
      const f = fixture(locale); await f.createAgency(); f.state.foreignDetail = true;
      const response = await f.clients({ action: "detail", id: clientId });
      expect(await response.json()).toEqual({ ok: false, code: "unavailable" });
      expect(f.rpc).toHaveBeenCalledWith("contratpro_client_detail", { p_agency_id: agencyId, p_id: clientId });
    });
    it(`${locale}: fresh permission revocation after dashboard prevents client creation`, async () => {
      const f = fixture(locale); await f.createAgency();
      expect(await f.dashboard()).toContain(`/${locale}/app/clients/new`);
      f.state.canCreate = false;
      expect((await f.clients()).status).toBe(403);
      expect(await f.dashboard()).not.toContain(`/${locale}/app/clients/new`);
      expect(f.state.saved).toBe(false);
    });
    it(`${locale}: disabled clients gate prevents lookup and creation`, async () => {
      const f = fixture(locale); await f.createAgency(); f.state.ready = false;
      vi.stubEnv("CONTRATPRO_CLIENTS_VERIFIED", "false"); f.rpc.mockClear();
      expect((await f.clients()).status).toBe(503);
      expect(await f.dashboard()).toContain(clientMessages(locale).unavailable);
      expect(f.rpc.mock.calls.every(([name]) => name === "contratpro_auth_access")).toBe(true);
    });
    it(`${locale}: both mutation boundaries reject CSRF before identity lookup`, async () => {
      const f = fixture(locale);
      expect((await f.agency(undefined, "https://evil.example")).status).toBe(403);
      expect((await f.clients(undefined, "https://evil.example")).status).toBe(403);
      expect(f.auth.getUser).not.toHaveBeenCalled(); expect(f.rpc).not.toHaveBeenCalled();
    });
    it(`${locale}: malformed agency and client fields never mutate`, async () => {
      const f = fixture(locale);
      expect((await f.agency({ action: "create", requestId: key, data: { ...profile, name: "" } })).status).toBe(400);
      expect(f.state.created).toBe(false); await f.createAgency();
      expect((await f.clients({ action: "create", requestId: key, data: { ...contact, phone: "bad" } })).status).toBe(400);
      expect(f.state.saved).toBe(false);
    });
    it(`${locale}: lost agency response never confirms success or selection`, async () => {
      const f = fixture(locale); f.state.uncertainAgency = true;
      const response = await f.agency();
      expect(await response.json()).toEqual({ ok: false, code: "uncertain" });
      expect(response.cookies.get(selectionCookie)).toBeUndefined();
      expect(f.rpc.mock.calls.filter(([name]) => name === "contratpro_create_agency")).toHaveLength(1);
    });
    it(`${locale}: owner read-back failure never confirms agency creation`, async () => {
      const f = fixture(locale); f.state.owner = false;
      const response = await f.agency();
      expect(await response.json()).toEqual({ ok: false, code: "uncertain" });
      expect(response.cookies.get(selectionCookie)).toBeUndefined();
    });
    it(`${locale}: lost client read-back never confirms a persisted mutation`, async () => {
      const f = fixture(locale); await f.createAgency(); f.state.uncertainClient = true;
      expect(await (await f.clients()).json()).toEqual({ ok: false, code: "uncertain" });
      expect(f.state.saved).toBe(true);
      expect(f.rpc.mock.calls.filter(([name]) => name === "contratpro_client_create")).toHaveLength(1);
    });
    it.each(["revoked", "unavailable"] as const)(`${locale}: %s authorization preserves access state and prevents mutations`, async mode => {
      const f = fixture(locale); await f.createAgency(); f.state[mode] = true;
      expect((await f.clients()).status).toBe(mode === "revoked" ? 403 : 503);
      const html = await f.dashboard();
      expect(html).toContain(agencyAccessMessages(locale).states[mode === "revoked" ? "forbidden" : "unavailable"].title);
      expect(html).not.toContain(`/${locale}/app/clients/new`); expect(f.state.saved).toBe(false);
    });
  }
});
