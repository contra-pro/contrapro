import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyContext } from "../auth/identity";
import { handleVehicles } from "./handler";
import { vehicleDetail, listVehicles, vehiclePermissions } from "./data";
import { saveVehicle } from "./save";
vi.mock("server-only", () => ({}));
const origin = "https://contratpro.example";
const agencyId = "10000000-0000-4000-8000-000000000001", otherAgency = "10000000-0000-4000-8000-000000000002";
const userId = "20000000-0000-4000-8000-000000000001", id = "30000000-0000-4000-8000-000000000001", key = "40000000-0000-4000-8000-000000000001";
const input = { category: "unspecified" as const, fuelType: "unspecified" as const, transmission: "unspecified" as const, rentalStatus: "unknown" as const, registration: "12345 أ 6", make: "Dacia", model: "Duster", year: "2026", mileage: "12000" };
const record = { ...input, id, agencyId, version: 1, state: "active" };
const context: AgencyContext = { access: { status: "authorized", userId, agencyId, membershipId: key, agencyName: "Atlas" },
  canonical: { userId, subject: key, expiresAt: 9999999999999 }, choices: [{ agencyId, name: "Atlas" }] };
function fixture() {
  const rpc = vi.fn<(name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>>(async name => {
    if (name === "contratpro_vehicles_permissions") return { data: { read: true, create: true, update: true, archive: false, contractVersion: 2 }, error: null };
    if (name === "contratpro_vehicles_list") return { data: { total: 1, items: [record] }, error: null };
    if (name === "contratpro_vehicle_detail") return { data: record, error: null };
    return { data: name === "contratpro_vehicle_create" ? id : true, error: null };
  });
  const client = { rpc } as unknown as SupabaseClient;
  return { rpc, client, deps: { origin: () => origin, client: () => client, context: vi.fn(async (): Promise<AgencyContext> => context), ready: () => true } };
}
const request = (body: unknown, suppliedOrigin = origin) => new NextRequest(`${origin}/fr/app/vehicle-action`, {
  method: "POST", headers: { "content-type": "application/json", origin: suppliedOrigin }, body: JSON.stringify(body),
});
const create = { action: "create", requestId: key, data: input };

describe("vehicle persistence boundary — injected RPC only, not live RLS evidence", () => {
  it("rejects an old database contract before any mutation", async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, create: true, update: true }, error: null });
    expect((await handleVehicles(request(create), "fr", f.deps)).status).toBe(503);
    expect(f.rpc).toHaveBeenCalledTimes(1);
  });
  it("requires archive capability and independent active-detail disappearance", async () => {
    const denied = fixture();
    expect((await handleVehicles(request({ action: "archive", id, version: 1 }), "fr", denied.deps)).status).toBe(403);
    for (const remaining of [null, record]) {
      const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, create: false, update: false, archive: true, contractVersion: 2 }, error: null })
        .mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: remaining, error: null });
      const response = await handleVehicles(request({ action: "archive", id, version: 1 }), "ar", f.deps);
      expect(await response.json()).toEqual(remaining ? { ok: false, code: "uncertain" } : { ok: true, destination: "/ar/app/vehicles" });
      expect(f.rpc.mock.calls[1]).toEqual(["contratpro_vehicle_archive", { p_agency_id: agencyId, p_id: id, p_version: 1 }]);
    }
  });
  it("forwards literal bounded search only within trusted scope", async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, create: false, update: false, archive: false, contractVersion: 2 }, error: null })
      .mockResolvedValueOnce({ data: { items: [], total: 0 }, error: null });
    const response = await handleVehicles(request({ action: "list", page: 1, search: "%_أ" }), "fr", f.deps);
    expect(response.status).toBe(200);
    expect(f.rpc.mock.calls[1]).toEqual(["contratpro_vehicles_search", { p_agency_id: agencyId, p_page: 1, p_search: "%_أ" }]);
    expect((await handleVehicles(request({ action: "list", page: 1, search: "x".repeat(101) }), "fr", fixture().deps)).status).toBe(400);
  });
  it("runs create → list → detail → edit → confirmed detail against a synthetic scoped store", async () => {
    const f = fixture(); let stored: typeof record | null = null;
    f.rpc.mockImplementation(async (name, args) => {
      if (args.p_agency_id !== agencyId) return { data: null, error: { code: "42501" } };
      if (name === "contratpro_vehicles_permissions") return { data: { read: true, create: true, update: true, archive: false, contractVersion: 2 }, error: null };
      if (name === "contratpro_vehicle_create") { if (!stored) stored = { ...args.p_details as typeof input, id, agencyId, version: 1, state: "active" }; return { data: id, error: null }; }
      if (name === "contratpro_vehicles_list") return { data: { total: stored ? 1 : 0, items: stored ? [stored] : [] }, error: null };
      if (name === "contratpro_vehicle_update") {
        if (!stored || args.p_version !== stored.version) return { data: null, error: { code: "40001" } };
        stored = { ...args.p_details as typeof input, id, agencyId, version: stored.version + 1, state: "active" }; return { data: true, error: null };
      }
      return { data: stored, error: null };
    });
    const send = vi.fn<typeof fetch>(async (_url, init) => handleVehicles(request(JSON.parse(init?.body as string)), "fr", f.deps));
    expect(await saveVehicle("fr", { action: "create", requestId: key, data: input }, send)).toEqual({ ok: true, id, version: 1 });
    const list = await (await handleVehicles(request({ action: "list", page: 1 }), "fr", f.deps)).json(); expect(list.page.items).toHaveLength(1);
    const edit = { ...input, mileage: "12020" };
    expect(await saveVehicle("fr", { action: "update", id, version: 1, data: edit }, send)).toEqual({ ok: true, id, version: 2 });
    expect(await vehicleDetail(f.client, agencyId, id)).toEqual({ ...edit, id, version: 2 });
    const stale = await handleVehicles(request({ action: "update", id, version: 1, data: input }), "fr", f.deps); expect(stale.status).toBe(409);
    await expect(vehicleDetail(f.client, otherAgency, id)).rejects.toThrow("forbidden");
  });
  it("creates in trusted agency and only confirms matching independent detail", async () => {
    const f = fixture(); const response = await handleVehicles(request(create), "fr", f.deps);
    expect(await response.json()).toEqual({ ok: true, id, version: 1 });
    expect(f.rpc.mock.calls[1]).toEqual(["contratpro_vehicle_create", { p_agency_id: agencyId, p_key: key, p_details: input }]);
    expect(f.rpc.mock.calls[2]).toEqual(["contratpro_vehicle_detail", { p_agency_id: agencyId, p_id: id }]);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("lists and reads only the current agency", async () => {
    const f = fixture();
    expect((await handleVehicles(request({ action: "list", page: 1 }), "ar", f.deps)).status).toBe(200);
    expect(f.rpc.mock.calls[1]).toEqual(["contratpro_vehicles_list", { p_agency_id: agencyId, p_page: 1 }]);
    expect((await handleVehicles(request({ action: "detail", id }), "fr", f.deps)).status).toBe(200);
  });
  it.each(["signed-out", "unmapped", "forbidden", "selection-required", "onboarding", "unavailable"] as const)("rejects %s before permissions or writes", async status => {
    const f = fixture(); f.deps.context.mockResolvedValue({ access: { status }, canonical: null, choices: [] });
    const response = await handleVehicles(request(create), "fr", f.deps);
    expect(response.status).toBe(status === "signed-out" ? 401 : status === "unavailable" ? 503 : 403); expect(f.rpc).not.toHaveBeenCalled();
  });
  it("disabled capability and inconsistent canonical identity fail closed", async () => {
    const f = fixture(); expect((await handleVehicles(request(create), "fr", { ...f.deps, ready: () => false })).status).toBe(503);
    f.deps.context.mockResolvedValue({ ...context, canonical: null });
    expect((await handleVehicles(request(create), "fr", f.deps)).status).toBe(403); expect(f.rpc).not.toHaveBeenCalled();
  });
  it.each(["create", "update", "read"] as const)("requires fresh %s permission", async capability => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: capability !== "read", create: capability === "update", update: capability === "create", archive: false, contractVersion: 2 }, error: null });
    const body = capability === "update" ? { action: "update", id, version: 1, data: input } : create;
    expect((await handleVehicles(request(body), "fr", f.deps)).status).toBe(403); expect(f.rpc).toHaveBeenCalledTimes(1);
  });
  it("rejects client-controlled ownership and malformed values before mutation", async () => {
    for (const body of [{ ...create, agencyId: otherAgency }, { ...create, userId }, { ...create, data: { ...input, agencyId } },
      { ...create, data: { ...input, mileage: "-1" } }, { action: "update", id, version: 0, data: input }, { action: "archive", id }]) {
      const f = fixture(); expect((await handleVehicles(request(body), "fr", f.deps)).status).toBe(body.action === "archive" ? 403 : 400);
      expect(f.rpc.mock.calls.some(([name]) => name === "contratpro_vehicle_create" || name === "contratpro_vehicle_update")).toBe(false);
    }
  });
  it.each(["https://evil.example", "null", ""])("rejects non-exact origin %s", async suppliedOrigin => {
    const f = fixture(); expect((await handleVehicles(request(create, suppliedOrigin), "fr", f.deps)).status).toBe(403); expect(f.rpc).not.toHaveBeenCalled();
  });
  it("rejects non-POST, invalid locale, oversized or non-JSON requests before auth", async () => {
    const f = fixture();
    expect((await handleVehicles(new NextRequest(`${origin}/fr/app/vehicle-action`), "fr", f.deps)).status).toBe(403);
    expect((await handleVehicles(request(create), "en", f.deps)).status).toBe(404);
    expect((await handleVehicles(request({ ...create, data: "x".repeat(9000) }), "fr", f.deps)).status).toBe(400);
    expect((await handleVehicles(new NextRequest(`${origin}/fr/app/vehicle-action`, { method: "POST", headers: { origin }, body: "invalid" }), "fr", f.deps)).status).toBe(400);
    expect(f.deps.context).not.toHaveBeenCalled();
  });
  it("cross-tenant and missing detail share no record; injected foreign rows fail closed", async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, create: false, update: false, archive: false, contractVersion: 2 }, error: null }).mockResolvedValueOnce({ data: null, error: null });
    expect((await handleVehicles(request({ action: "detail", id }), "fr", f.deps)).status).toBe(404);
    const g = fixture(); g.rpc.mockResolvedValueOnce({ data: { ...record, agencyId: otherAgency }, error: null });
    await expect(vehicleDetail(g.client, agencyId, id)).rejects.toThrow("unavailable");
    g.rpc.mockResolvedValueOnce({ data: { total: 1, items: [{ ...record, agencyId: otherAgency }] }, error: null });
    await expect(listVehicles(g.client, agencyId, 1)).rejects.toThrow("unavailable");
  });
  it("updates with optimistic version and requires matching incremented read-back", async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, create: true, update: true, archive: false, contractVersion: 2 }, error: null })
      .mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: { ...record, version: 2 }, error: null });
    const result = await handleVehicles(request({ action: "update", id, version: 1, data: input }), "fr", f.deps);
    expect(await result.json()).toEqual({ ok: true, id, version: 2 });
    expect(f.rpc.mock.calls[1]?.[1]).toEqual({ p_agency_id: agencyId, p_id: id, p_version: 1, p_details: input });
  });
  it("rejects exhausted or out-of-range PostgreSQL integer versions before writes", async () => {
    for (const version of [2147483647, 2147483648, Number.MAX_SAFE_INTEGER]) {
      const f = fixture();
      expect((await handleVehicles(request({ action: "update", id, version, data: input }), "fr", f.deps)).status).toBe(400);
      expect(f.rpc).toHaveBeenCalledTimes(1);
    }
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { ...record, version: 2147483648 }, error: null });
    await expect(vehicleDetail(f.client, agencyId, id)).rejects.toThrow("unavailable");
  });
  it.each(["23505", "40001"])("sanitizes duplicate/version %s as conflict", async code => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, create: true, update: true, archive: false, contractVersion: 2 }, error: null })
      .mockResolvedValueOnce({ data: null, error: { code, message: "PRIVATE registration" } });
    const response = await handleVehicles(request(create), "fr", f.deps); expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, code: "conflict" });
  });
  it("failed or mismatched confirmation never reports saving success; no retry", async () => {
    for (const detail of [null, { ...record, model: "Other" }, { ...record, agencyId: otherAgency }]) {
      const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, create: true, update: true, archive: false, contractVersion: 2 }, error: null })
        .mockResolvedValueOnce({ data: id, error: null }).mockResolvedValueOnce({ data: detail, error: null });
      expect(await (await handleVehicles(request(create), "fr", f.deps)).json()).toEqual({ ok: false, code: "uncertain" });
      expect(f.rpc).toHaveBeenCalledTimes(3);
    }
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, create: true, update: true, archive: false, contractVersion: 2 }, error: null }).mockRejectedValueOnce(Error("PRIVATE"));
    expect(await (await handleVehicles(request(create), "fr", f.deps)).json()).toEqual({ ok: false, code: "uncertain" }); expect(f.rpc).toHaveBeenCalledTimes(2);
  });
  it("permission lookup errors and malformed list responses are unavailable, never empty success", async () => {
    const f = fixture(); f.rpc.mockRejectedValueOnce(Error("PRIVATE"));
    expect(await (await handleVehicles(request(create), "fr", f.deps)).json()).toEqual({ ok: false, code: "unavailable" });
    for (const data of [{ read: true }, { read: false, create: true, update: false }]) {
      f.rpc.mockResolvedValueOnce({ data, error: null }); await expect(vehiclePermissions(f.client, agencyId)).rejects.toThrow("unavailable");
    }
    for (const data of [{ total: 0, items: [record] }, { total: 2, items: [record, record] }, { total: -1, items: [] }]) {
      f.rpc.mockResolvedValueOnce({ data, error: null }); await expect(listVehicles(f.client, agencyId, 1)).rejects.toThrow("unavailable");
    }
  });
});

describe("UI save acknowledgement boundary", () => {
  it("accepts confirmed create/update responses only, using locale-aware POST without ownership", async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true, id, version: 2 }));
    expect(await saveVehicle("ar", { action: "update", id, version: 1, data: input }, send)).toEqual({ ok: true, id, version: 2 });
    expect(send.mock.calls[0]?.[0]).toBe("/ar/app/vehicle-action"); expect(JSON.parse(send.mock.calls[0]?.[1]?.body as string)).not.toHaveProperty("agencyId");
  });
  it.each([{}, { ok: true }, { ok: true, id: otherAgency, version: 2 }, { ok: true, id, version: 1 }])("rejects malformed/mismatched/stale update acknowledgement %#", async body => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body));
    expect(await saveVehicle("fr", { action: "update", id, version: 1, data: input }, send)).toEqual({ ok: false, code: "uncertain" }); expect(send).toHaveBeenCalledTimes(1);
  });
  it("network/parse failure is uncertain, fixed errors are localized codes and never retried", async () => {
    const send = vi.fn<typeof fetch>().mockRejectedValue(Error("PRIVATE"));
    expect(await saveVehicle("fr", { action: "create", requestId: key, data: input }, send)).toEqual({ ok: false, code: "uncertain" }); expect(send).toHaveBeenCalledTimes(1);
    send.mockResolvedValueOnce(Response.json({ ok: false, code: "conflict" }, { status: 409 }));
    expect(await saveVehicle("fr", { action: "create", requestId: key, data: input }, send)).toEqual({ ok: false, code: "conflict" });
    send.mockResolvedValueOnce(Response.json({ ok: true, id, version: 1 }, { status: 202 }));
    expect(await saveVehicle("fr", { action: "create", requestId: key, data: input }, send)).toEqual({ ok: false, code: "uncertain" });
  });
  it("cannot confirm a version outside the database integer contract", async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true, id, version: 2147483648 }));
    expect(await saveVehicle("fr", { action: "create", requestId: key, data: input }, send)).toEqual({ ok: false, code: "uncertain" });
  });
});
