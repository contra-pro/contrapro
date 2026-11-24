import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyContext } from "../auth/identity";
import { handleRentals } from "./handler";
import { rentalDetail } from "./data";
vi.mock("server-only", () => ({}));
const origin = "https://contratpro.example", agencyId = "10000000-0000-4000-8000-000000000001", userId = "20000000-0000-4000-8000-000000000001";
const id = "30000000-0000-4000-8000-000000000001", key = "40000000-0000-4000-8000-000000000001";
const context: AgencyContext = { access: { status: "authorized", userId, agencyId, membershipId: key, agencyName: "Synthetic" }, canonical: { userId, subject: key, expiresAt: 9999999999999 }, choices: [] };
const input = { clientId: id, vehicleId: key, start: "2026-12-01T09:00:00Z", end: "2026-12-02T09:00:00Z", dailyRateMinor: 10000 };
const detail = { id, agency_id: agencyId, client_id: id, vehicle_id: key, state: "brouillon", starts_at: input.start, ends_at: input.end,
  daily_rate_minor: "10000", deposit_minor: "0", billable_days: 1, total_minor: "10000", currency: "MAD", number_year: null, number_serial: null,
  contract_number: null, confirmed_at: null, returned_at: null, version: 1, created_at: input.start, updated_at: input.start,
  physicalUnavailable: false, overdueConflict: false, secondaryClientId: null };
function fixture() {
  const rpc = vi.fn<(name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>>(async name => {
    if (name === "contratpro_rental_capabilities") return { data: { contractVersion: 2, read: true, write: true }, error: null };
    if (name === "contratpro_rental_create") return { data: { id, version: 1, state: "brouillon", number: null }, error: null };
    if (name === "contratpro_rental_detail_v2") return { data: detail, error: null };
    return { data: { total: 0, items: [] }, error: null };
  });
  const client = { rpc } as unknown as SupabaseClient;
  return { rpc, client, deps: { origin: () => origin, client: () => client, context: vi.fn(async (): Promise<AgencyContext> => context), ready: () => true } };
}
const request = (body: unknown, suppliedOrigin = origin) => new NextRequest(`${origin}/fr/app/rental-action`, { method: "POST", headers: { "content-type": "application/json", origin: suppliedOrigin }, body: JSON.stringify(body) });
const create = { action: "create", requestId: key, data: JSON.stringify(input) };
describe("authenticated rental persistence boundary (injected transport only)", () => {
  it("uses the trusted agency and existing exact creation service", async () => {
    const f = fixture(), response = await handleRentals(request(create), "fr", f.deps);
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ ok: true, value: { id, version: 1, state: "brouillon", number: null } });
    expect(f.rpc.mock.calls[1]).toMatchObject(["contratpro_rental_create", { p_agency_id: agencyId, p_key: key, p_details: { clientId: id, vehicleId: key, dailyRateMinor: 10000 } }]);
  });
  it("fails closed when the flag is off before creating a client", async () => {
    const f = fixture(); f.deps.ready = () => false;
    expect((await handleRentals(request(create), "fr", f.deps)).status).toBe(503); expect(f.rpc).not.toHaveBeenCalled();
  });
  it("rejects old contracts before writes", async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { read: true, write: true }, error: null });
    expect((await handleRentals(request(create), "fr", f.deps)).status).toBe(503); expect(f.rpc).toHaveBeenCalledTimes(1);
  });
  it.each(["signed-out", "unavailable", "forbidden", "selection-required", "unmapped"] as const)("does not query rentals with %s context", async status => {
    const f = fixture(); f.deps.context.mockResolvedValue({ access: { status }, canonical: null, choices: [] });
    expect((await handleRentals(request(create), "fr", f.deps)).status).toBe(status === "signed-out" ? 401 : status === "unavailable" ? 503 : 403);
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it("rejects a cross-origin request", async () => { const f = fixture(); expect((await handleRentals(request(create, "https://other.example"), "fr", f.deps)).status).toBe(403); expect(f.rpc).not.toHaveBeenCalled(); });
  it.each([{ ...create, agencyId }, { action: "start", id, version: 0, requestId: key }, { action: "complete", id, version: 1, requestId: key, returnConfirmed: false },
    { action: "choices", kind: "vehicle", search: "", page: 0 }, { action: "extend", id, version: 1, requestId: key, end: "2026-01-01T10:00" },
    { ...create, data: JSON.stringify({ ...input, owner: userId }) }, { ...create, data: '{"clientId":"x","clientId":"y"}' }])("rejects malformed or injected input %#", async body => {
    const f = fixture(); expect((await handleRentals(request(body), "ar", f.deps)).status).toBe(400);
    expect(f.rpc.mock.calls.filter(([name]) => name !== "contratpro_rental_capabilities")).toHaveLength(0);
  });
  it.each([["42501", 403, "forbidden"], ["40001", 409, "conflict"], ["22023", 400, "invalid"], ["XX000", 503, "uncertain"]])("sanitizes create SQL error %s", async (code, status, safe) => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { contractVersion: 2, read: true, write: true }, error: null }).mockResolvedValueOnce({ data: null, error: { code, message: "PRIVATE" } });
    const result = await handleRentals(request(create), "fr", f.deps); expect(result.status).toBe(status); expect(await result.json()).toEqual({ ok: false, code: safe });
  });
  it("treats a lost create response as uncertain with no retry", async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { contractVersion: 2, read: true, write: true }, error: null }).mockRejectedValueOnce(Error("PRIVATE"));
    expect(await (await handleRentals(request(create), "fr", f.deps)).json()).toEqual({ ok: false, code: "uncertain" }); expect(f.rpc).toHaveBeenCalledTimes(2);
  });
  it("requires a matching independent read after mutation", async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { contractVersion: 2, read: true, write: true }, error: null })
      .mockResolvedValueOnce({ data: { id, version: 2, state: "annule", number: null }, error: null });
    expect(await (await handleRentals(request({ action: "cancel", id, version: 1, requestId: key }), "fr", f.deps)).json()).toEqual({ ok: false, code: "uncertain" });
  });
  it("dispatches completion only with explicit return acknowledgement", async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { contractVersion: 2, read: true, write: true }, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: "23P01" } });
    expect((await handleRentals(request({ action: "complete", id, version: 1, requestId: key, returnConfirmed: true }), "ar", f.deps)).status).toBe(409);
    expect(f.rpc.mock.calls[1]).toEqual(["contratpro_rental_complete", { p_agency_id: agencyId, p_id: id, p_version: 1, p_request_id: key, p_return_confirmed: true }]);
  });
  it("decodes totals above the safe JS integer range without rounding", async () => {
    const f = fixture(); const row = { ...detail, ends_at: "2300-09-16T09:00:00Z", daily_rate_minor: "1000000000000", total_minor: "100000000000000000", billable_days: 100000 };
    // Derive an exact 100000-day endpoint to avoid assumptions about calendar arithmetic.
    row.ends_at = new Date(Date.parse(input.start) + 100000 * 86400000).toISOString();
    f.rpc.mockResolvedValueOnce({ data: row, error: null });
    expect(await rentalDetail(f.client, agencyId, id)).toMatchObject({ total_minor: "100000000000000000" });
  });
  it.each([{ ...detail, agency_id: key }, { ...detail, total_minor: 10000 }, { ...detail, total_minor: "9999" }])("fails closed on invalid detail %#", async row => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: row, error: null }); await expect(rentalDetail(f.client, agencyId, id)).rejects.toThrow("unavailable");
  });
});
