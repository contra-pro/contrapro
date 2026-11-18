import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clientDetail, listClients, clientPermissions } from "./data";
import { defaultClientQuery } from "../../../../packages/application/src/clients";
const agencyId = "10000000-0000-4000-8000-000000000001";
const id = "20000000-0000-4000-8000-000000000001";
const item = { id, agencyId, state: "active", firstName: "Atlas", lastName: "Test", phone: "+212612345678", email: "", city: "Rabat", identityType: "none" };
const client = (data: unknown) => ({ rpc: vi.fn(async () => ({ data, error: null })) }) as unknown as SupabaseClient;
describe("client data response contracts", () => {
  it("removes internal tenant/state metadata from the list projection", async () => {
    const page = await listClients(client({ items: [item], total: 1 }), agencyId, defaultClientQuery);
    expect(page.items[0]).not.toHaveProperty("agencyId"); expect(page.items[0]).not.toHaveProperty("state");
  });
  it.for([{ items: [{ ...item, identityNumber: "PRIVATE" }], total: 1 }, { items: [{ ...item, agencyId: id }], total: 1 },
    { items: [{ ...item, state: "archived" }], total: 1 }, { items: [item, item], total: 2 }, { items: [item], total: 0 },
    { items: Array(21).fill(item), total: 21 }, { items: [], total: -1 }, { items: [], total: Infinity }])("rejects malformed, sensitive or unbounded list projections", async data => {
    await expect(listClients(client(data), agencyId, defaultClientQuery)).rejects.toThrow("unavailable");
  });
  it("supports an empty page without inventing clients", async () => {
    expect((await listClients(client({ items: [], total: 0 }), agencyId, defaultClientQuery)).items).toEqual([]);
  });
  it("requires consistent boolean CRUD permissions", async () => {
    await expect(clientPermissions(client({ read: false, create: true, update: false, archive: false }), agencyId)).rejects.toThrow("unavailable");
    await expect(clientPermissions(client({ read: "true" }), agencyId)).rejects.toThrow("unavailable");
  });
  it("returns no details for a hidden archived or other-tenant client", async () => {
    expect(await clientDetail(client(null), agencyId, id)).toBeNull();
  });
});
