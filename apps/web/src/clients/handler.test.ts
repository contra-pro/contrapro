import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyContext } from "../auth/identity";
import { emptyClient, defaultClientQuery } from "../../../../packages/application/src/clients";
vi.mock("server-only", () => ({}));
import { handleClients } from "./handler";
const origin = "https://contratpro.example";
const agencyId = "10000000-0000-4000-8000-000000000001";
const userId = "20000000-0000-4000-8000-000000000001";
const id = "30000000-0000-4000-8000-000000000001";
const key = "40000000-0000-4000-8000-000000000001";
const input = { ...emptyClient, firstName: "Amina", lastName: "Atlas", phone: "+212612345678", identityType: "passport", identityNumber: "AB123456" };
const record = { ...input, id, agencyId, state: "active", version: 1 };
const context: AgencyContext = { access: { status: "authorized", userId, agencyId, membershipId: key, agencyName: "Atlas" }, canonical: { userId, subject: key, expiresAt: 999999 }, choices: [{ agencyId, name: "Atlas" }] };
function fixture(permissions = { read: true, create: true, update: true, archive: true }, access: AgencyContext = context) {
  const rpc = vi.fn<(name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>>(async name => {
    if (name === "contratpro_clients_permissions") return { data: permissions, error: null };
    if (name === "contratpro_clients_list") return { data: { total: 0, items: [] }, error: null };
    if (name === "contratpro_client_detail") return { data: record, error: null };
    if (name === "contratpro_client_create") return { data: id, error: null };
    if (name === "contratpro_client_creation_contract") return { data: 2, error: null };
    return { data: true, error: null };
  });
  const client = { rpc } as unknown as SupabaseClient;
  return { rpc, deps: { origin: () => origin, client: () => client, context: vi.fn(async () => access), ready: () => true } };
}
function request(payload: unknown, requestOrigin = origin) {
  return new NextRequest(`${origin}/fr/app/client-action`, { method: "POST", headers: { "content-type": "application/json", origin: requestOrigin }, body: JSON.stringify(payload) });
}
describe("client HTTP boundary — real handler, injected transport only", () => {
  it.each(["list", "detail", "create", "update", "archive"])("denies unauthenticated %s before data reads or mutations", async action => {
    const f = fixture(undefined, { access: { status: "signed-out" }, canonical: null, choices: [] });
    const response = await handleClients(request({ action, ...(action === "list" ? { query: defaultClientQuery } : {}) }), "fr", f.deps);
    expect(response.status).toBe(401); expect(f.rpc).not.toHaveBeenCalled();
  });
  it("denies an authenticated user without a canonical mapping", async () => {
    const f = fixture(undefined, { access: { status: "unmapped" }, canonical: null, choices: [] });
    expect((await handleClients(request({ action: "create", requestId: key, data: input }), "fr", f.deps)).status).toBe(403);
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it.each(["create", "update", "archive"] as const)("requires the scoped %s permission", async action => {
    const f = fixture({ read: true, create: true, update: true, archive: true, [action]: false });
    const response = await handleClients(request({ action, ...(action === "create" ? { requestId: key, data: input } : action === "update" ? { id, version: 1, data: input } : { id, version: 1 }) }), "fr", f.deps);
    expect(response.status).toBe(403); expect(f.rpc.mock.calls.map(([name]) => name)).toEqual(["contratpro_clients_permissions"]);
  });
  it.each(["list", "detail"])("requires read permission for %s", async action => {
    const f = fixture({ read: false, create: false, update: false, archive: false });
    const response = await handleClients(request({ action, ...(action === "list" ? { query: defaultClientQuery } : { id }) }), "fr", f.deps);
    expect(response.status).toBe(403); expect(f.rpc).toHaveBeenCalledTimes(1);
  });
  it("keeps the unapplied client capability disabled", async () => {
    const f = fixture(); const response = await handleClients(request({ action: "list", query: defaultClientQuery }), "fr", { ...f.deps, ready: () => false });
    expect(response.status).toBe(503); expect(f.rpc).not.toHaveBeenCalled();
  });
  it("never accepts browser tenant/owner IDs", async () => {
    const f = fixture();
    for (const extra of ["agencyId", "userId", "ownerId", "roleId"]) {
      expect((await handleClients(request({ action: "create", requestId: key, data: input, [extra]: id }), "fr", f.deps)).status).toBe(400);
    }
    expect(f.deps.context).not.toHaveBeenCalled();
  });
  it("creates in the trusted selected agency and confirms the stored record", async () => {
    const f = fixture(); const response = await handleClients(request({ action: "create", requestId: key, data: input }), "fr", f.deps);
    expect(await response.json()).toEqual({ ok: true, id, version: 1 });
    expect(f.rpc.mock.calls[1]).toEqual(["contratpro_client_creation_contract", {}]);
    expect(f.rpc.mock.calls[2]).toEqual(["contratpro_client_create", { p_agency_id: agencyId, p_key: key, p_details: input }]);
    expect(f.rpc.mock.calls[3]).toEqual(["contratpro_client_detail", { p_agency_id: agencyId, p_id: id }]);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("validates sensitive fields before any mutation", async () => {
    const f = fixture();
    const response = await handleClients(request({ action: "create", requestId: key, data: { ...input, identityNumber: "<invalid>" } }), "fr", f.deps);
    expect(response.status).toBe(400);
    expect(f.rpc.mock.calls.map(([name]) => name)).toEqual(["contratpro_clients_permissions"]);
    expect(await response.text()).not.toContain("<invalid>");
  });
  it("binds literal search/filter/pagination with no archived filter or URL search", async () => {
    const f = fixture();
    const query = { search: "%_Atlas", identityType: "passport", page: 2, pageSize: 10 };
    const response = await handleClients(request({ action: "list", query }), "fr", f.deps);
    expect(response.status).toBe(200);
    expect(f.rpc.mock.calls[1]).toEqual(["contratpro_clients_list", { p_agency_id: agencyId, p_search: "%_Atlas", p_type: "passport", p_page: 2, p_size: 10 }]);
    expect((await handleClients(request({ action: "list", query: { ...query, state: "archived" } }), "fr", f.deps)).status).toBe(400);
  });
  it.each(["other-tenant", "archived", "missing"])("uses the same not-found response for %s IDs", async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, create: false, update: false, archive: false }, error: null }).mockResolvedValueOnce({ data: null, error: null });
    const response = await handleClients(request({ action: "detail", id }), "fr", f.deps);
    expect(response.status).toBe(404); expect(await response.json()).toEqual({ ok: false, code: "not-found" });
  });
  it("rejects cross-tenant or archived rows even if the transport incorrectly returns one", async () => {
    for (const change of [{ agencyId: key }, { state: "archived" }]) {
      const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, create: false, update: false, archive: false }, error: null }).mockResolvedValueOnce({ data: { ...record, ...change }, error: null });
      const response = await handleClients(request({ action: "detail", id }), "fr", f.deps);
      expect(response.status).toBe(503); expect(await response.text()).not.toContain("AB123456");
    }
  });
  it("updates with an expected version and verifies a fresh version before success", async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, create: true, update: true, archive: true }, error: null })
      .mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: { ...record, version: 2 }, error: null });
    const response = await handleClients(request({ action: "update", id, version: 1, data: input }), "fr", f.deps);
    expect(await response.json()).toEqual({ ok: true, id, version: 2 });
    expect(f.rpc.mock.calls[1]).toEqual(["contratpro_client_update", { p_agency_id: agencyId, p_id: id, p_version: 1, p_details: input }]);
  });
  it("does not falsely report success if persistence differs or version is stale", async () => {
    const f = fixture();
    const response = await handleClients(request({ action: "update", id, version: 1, data: input }), "fr", f.deps);
    expect(await response.json()).toEqual({ ok: false, code: "uncertain" });
  });
  it.each([["40001", 409, "conflict"], ["P0002", 404, "not-found"], ["42501", 403, "forbidden"]] as const)("maps structured %s errors without licence or identity details", async (code, status, expected) => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, create: true, update: true, archive: true }, error: null })
      .mockResolvedValueOnce({ data: null, error: { code, message: "AB123456 private licence", details: "private notes" } });
    const response = await handleClients(request({ action: "update", id, version: 1, data: input }), "fr", f.deps);
    expect(response.status).toBe(status); expect(await response.json()).toEqual({ ok: false, code: expected });
  });
  it("confirms archive without returning the archived record", async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, create: true, update: true, archive: true }, error: null })
      .mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: null, error: null });
    const response = await handleClients(request({ action: "archive", id, version: 1 }), "ar", f.deps);
    expect(await response.json()).toEqual({ ok: true, destination: "/ar/app/clients" });
  });
  it("does not claim archive succeeded if the row remains active", async () => {
    const f = fixture(); const response = await handleClients(request({ action: "archive", id, version: 1 }), "fr", f.deps);
    expect(await response.json()).toEqual({ ok: false, code: "uncertain" });
  });
  it("sanitizes database/network failures and never retries a mutation", async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, create: true, update: true, archive: true }, error: null })
      .mockResolvedValueOnce({ data: 2, error: null })
      .mockRejectedValueOnce(new Error("AB123456 licence-123 private notes postgres://secret"));
    const response = await handleClients(request({ action: "create", requestId: key, data: input }), "fr", f.deps);
    expect(await response.json()).toEqual({ ok: false, code: "uncertain" }); expect(f.rpc).toHaveBeenCalledTimes(3);
  });
  it("rejects CSRF and oversized bodies before context lookup", async () => {
    const f = fixture();
    expect((await handleClients(request({ action: "list", query: defaultClientQuery }, "https://evil.example"), "fr", f.deps)).status).toBe(403);
    expect((await handleClients(request({ action: "create", requestId: key, data: { ...input, notes: "x".repeat(17000) } }), "fr", f.deps)).status).toBe(400);
    expect(f.deps.context).not.toHaveBeenCalled();
  });
});
