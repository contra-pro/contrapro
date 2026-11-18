import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
vi.mock("../server/agency-access", () => ({ getAgencyContext: vi.fn() }));
vi.mock("../auth/server", () => ({ componentAuthClient: vi.fn() }));
import { getAgencyContext } from "../server/agency-access";
import { componentAuthClient } from "../auth/server";
import { getClientScope } from "./server";
const agencyId = "10000000-0000-4000-8000-000000000001";
const userId = "20000000-0000-4000-8000-000000000001";
const context = { access: { status: "authorized" as const, userId, agencyId, membershipId: userId, agencyName: "Atlas" }, canonical: { userId, subject: userId, expiresAt: 999999 }, choices: [{ agencyId, name: "Atlas" }] };
describe("client server composition stays gated offline", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
  it("does not create a client data adapter while runtime validation is absent", async () => {
    vi.stubEnv("CONTRATPRO_CLIENTS_VERIFIED", "false"); vi.mocked(getAgencyContext).mockResolvedValue(context);
    expect(await getClientScope()).toEqual({ status: "unavailable" }); expect(componentAuthClient).not.toHaveBeenCalled();
  });
  it("does not resolve client permissions for a signed-out request", async () => {
    vi.mocked(getAgencyContext).mockResolvedValue({ access: { status: "signed-out" }, canonical: null, choices: [] });
    expect(await getClientScope()).toEqual({ status: "access", access: { status: "signed-out" } }); expect(componentAuthClient).not.toHaveBeenCalled();
  });
  it("requires a canonical identity even if an inconsistent agency result claims authorization", async () => {
    vi.mocked(getAgencyContext).mockResolvedValue({ ...context, canonical: null });
    expect(await getClientScope()).toEqual({ status: "forbidden" }); expect(componentAuthClient).not.toHaveBeenCalled();
  });
  it("uses only the verified agency for the permission lookup", async () => {
    vi.stubEnv("CONTRATPRO_CLIENTS_VERIFIED", "true"); vi.mocked(getAgencyContext).mockResolvedValue(context);
    const rpc = vi.fn(async () => ({ data: { read: true, create: false, update: false, archive: false }, error: null }));
    vi.mocked(componentAuthClient).mockResolvedValue({ rpc } as unknown as SupabaseClient);
    expect(await getClientScope()).toMatchObject({ status: "ready", agencyId });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("contratpro_clients_permissions", { p_agency_id: agencyId });
  });
});
