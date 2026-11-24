import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
vi.mock("../server/agency-access", () => ({ getAgencyContext: vi.fn() }));
vi.mock("../auth/server", () => ({ componentAuthClient: vi.fn() }));
import { getAgencyContext } from "../server/agency-access";
import { componentAuthClient } from "../auth/server";
import { getVehicleScope } from "./server";
const agencyId = "10000000-0000-4000-8000-000000000001", userId = "20000000-0000-4000-8000-000000000001";
const context = { access: { status: "authorized" as const, agencyId, userId, membershipId: userId, agencyName: "Atlas" },
  canonical: { userId, subject: userId, expiresAt: 9999999999999 }, choices: [] };
describe("vehicle scope — offline dependencies only", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
  it("disabled by default, without constructing a data adapter", async () => {
    vi.stubEnv("CONTRATPRO_VEHICLES_VERIFIED", "false"); vi.mocked(getAgencyContext).mockResolvedValue(context);
    expect(await getVehicleScope()).toEqual({ status: "unavailable" }); expect(componentAuthClient).not.toHaveBeenCalled();
  });
  it("preserves inaccessible states before data access", async () => {
    vi.mocked(getAgencyContext).mockResolvedValue({ access: { status: "unmapped" }, canonical: null, choices: [] });
    expect(await getVehicleScope()).toEqual({ status: "access", access: { status: "unmapped" } }); expect(componentAuthClient).not.toHaveBeenCalled();
  });
  it("pins permission lookup to verified selected agency", async () => {
    vi.stubEnv("CONTRATPRO_VEHICLES_VERIFIED", "true"); vi.mocked(getAgencyContext).mockResolvedValue(context);
    const rpc = vi.fn(async () => ({ data: { read: true, create: false, update: false, archive: false, contractVersion: 2 }, error: null }));
    vi.mocked(componentAuthClient).mockResolvedValue({ rpc } as unknown as SupabaseClient);
    expect(await getVehicleScope()).toMatchObject({ status: "ready", agencyId, permissions: { create: false } });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("contratpro_vehicles_permissions", { p_agency_id: agencyId });
  });
  it("permission failures never become allowed", async () => {
    vi.stubEnv("CONTRATPRO_VEHICLES_VERIFIED", "true"); vi.mocked(getAgencyContext).mockResolvedValue(context);
    vi.mocked(componentAuthClient).mockRejectedValue(Error("PRIVATE")); expect(await getVehicleScope()).toEqual({ status: "unavailable" });
  });
});
