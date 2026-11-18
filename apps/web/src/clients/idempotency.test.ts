import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyContext } from "../auth/identity";
import { validateClient, emptyClient } from "../../../../packages/application/src/clients";
import { handleClients } from "./handler";
vi.mock("server-only", () => ({}));
const origin = "https://contratpro.example", agencyId = "10000000-0000-4000-8000-000000000001";
const userId = "20000000-0000-4000-8000-000000000001", id = "30000000-0000-4000-8000-000000000001", key = "40000000-0000-4000-8000-000000000001";
const input = { ...emptyClient, firstName: "Amina", lastName: "Atlas", phone: "+212612345678" };
const context: AgencyContext = { access: { status: "authorized", userId, agencyId, membershipId: key, agencyName: "Atlas" }, canonical: { userId, subject: key, expiresAt: 9999999999999 }, choices: [] };
function fixture() {
  const rpc = vi.fn<(name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>>(async name => {
    if (name === "contratpro_clients_permissions") return { data: { read: true, create: true, update: false, archive: false }, error: null };
    if (name === "contratpro_client_creation_contract") return { data: 2, error: null };
    if (name === "contratpro_client_create") return { data: id, error: null };
    return { data: { ...input, firstName: "Edited", agencyId, id, state: "active", version: 2 }, error: null };
  });
  const client = { rpc } as unknown as SupabaseClient;
  return { rpc, deps: { origin: () => origin, client: () => client, context: async () => context, ready: () => true } };
}
function request(data: unknown = input) {
  return new NextRequest(`${origin}/fr/app/client-action`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ action: "create", requestId: key, data }) });
}
describe("new client creation contract — real handler with synthetic RPC only", () => {
  it("accepts an exact original replay even after current fields have been edited", async () => {
    const f = fixture(); const response = await handleClients(request(), "fr", f.deps);
    expect(await response.json()).toEqual({ ok: true, id, version: 2 });
    expect(f.rpc.mock.calls.map(([name]) => name)).toEqual(["contratpro_clients_permissions", "contratpro_client_creation_contract", "contratpro_client_create", "contratpro_client_detail"]);
  });
  it.each([null, true, 0, 1, "2"])("blocks incompatible contract %j before attempting a write", async marker => {
    const f = fixture(); f.rpc.mockImplementation(async name => name === "contratpro_clients_permissions" ? { data: { read: true, create: true, update: false, archive: false }, error: null } : { data: marker, error: null });
    expect((await handleClients(request(), "fr", f.deps)).status).toBe(503);
    expect(f.rpc).toHaveBeenCalledTimes(2);
  });
  it("a missing marker RPC is unavailable, never an old-contract fallback", async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, create: true, update: false, archive: false }, error: null }).mockResolvedValueOnce({ data: null, error: { code: "PGRST202" } });
    expect(await (await handleClients(request(), "fr", f.deps)).json()).toEqual({ ok: false, code: "unavailable" }); expect(f.rpc).toHaveBeenCalledTimes(2);
  });
  it.each(["changed-payload", "different-creator", "legacy-original-unknown"])("maps %s conflict to 409 without leaking details or retrying", async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, create: true, update: false, archive: false }, error: null })
      .mockResolvedValueOnce({ data: 2, error: null }).mockResolvedValueOnce({ data: null, error: { code: "40001", message: "PRIVATE fingerprint" } });
    const response = await handleClients(request(), "fr", f.deps);
    expect(response.status).toBe(409); expect(await response.json()).toEqual({ ok: false, code: "conflict" }); expect(f.rpc).toHaveBeenCalledTimes(3);
  });
  it("archived exact replay exposes no active ID", async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, create: true, update: false, archive: false }, error: null })
      .mockResolvedValueOnce({ data: 2, error: null }).mockResolvedValueOnce({ data: null, error: { code: "P0002" } });
    const response = await handleClients(request(), "fr", f.deps); expect(response.status).toBe(404); expect(await response.json()).toEqual({ ok: false, code: "not-found" });
  });
  it.each([null, { ...input, agencyId: key, id, state: "active", version: 1 }])("still requires authorized active read-back %#", async data => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, create: true, update: false, archive: false }, error: null })
      .mockResolvedValueOnce({ data: 2, error: null }).mockResolvedValueOnce({ data: id, error: null }).mockResolvedValueOnce({ data, error: null });
    expect(await (await handleClients(request(), "fr", f.deps)).json()).toEqual({ ok: false, code: "uncertain" }); expect(f.rpc).toHaveBeenCalledTimes(4);
  });
  it("preserves normalized original fields before fingerprint comparison", async () => {
    const f = fixture(); const raw = { ...input, firstName: "\u00a0 Amina \t", email: " USER@EXAMPLE.COM ", identityType: "cin", identityNumber: "ab1234", notes: "\n line 1\nline 2 \n" };
    const expected = validateClient(raw); expect(expected.ok).toBe(true);
    await handleClients(request(raw), "fr", f.deps);
    expect(f.rpc.mock.calls.find(([name]) => name === "contratpro_client_create")?.[1].p_details).toEqual(expected.ok ? expected.value : null);
  });
});
