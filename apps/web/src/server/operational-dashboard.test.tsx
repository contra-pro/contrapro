import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { renderToStaticMarkup } from "react-dom/server";
import { operationalDashboard } from "./operational-dashboard";
import { getAgencyContext } from "./agency-access";
import { componentAuthClient } from "../auth/server";
import { overviewResult, type Overview } from "../components/operational-model";
import { OperationalDashboard } from "../components/operational-dashboard";
import { maintenanceLabel } from "../maintenance/labels";
vi.mock("server-only", () => ({}));
vi.mock("./agency-access", () => ({ getAgencyContext: vi.fn() }));
vi.mock("../auth/server", () => ({ componentAuthClient: vi.fn() }));
const aid = "10000000-0000-4000-8000-000000000001", uid = "10000000-0000-4000-8000-000000000002", at = Date.parse("2026-11-26T09:00:00Z");
const groups = { active: [], pickups: [], returns: [], drafts: [], activity: [] };
const context = { access: { status: "authorized" as const, agencyId: aid, userId: uid, membershipId: uid, agencyName: "Synthetic" }, canonical: { userId: uid, subject: uid, expiresAt: 9999999999 }, choices: [] };
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
describe("authorized bounded operational overview", () => {
  it("does not load a client with all gates closed", async () => {
    for (const gate of ["RENTALS", "SIGNING", "DELIVERY", "SHEETS"]) vi.stubEnv(`CONTRATPRO_${gate}_VERIFIED`, "false");
    expect(Object.values(await operationalDashboard(aid, at)).every(v => v.status === "unavailable")).toBe(true);
    expect(componentAuthClient).not.toHaveBeenCalled();
  });
  it.each(["foreign-agency", "canonical-mismatch", "forbidden"])("denies %s before querying", async mode => {
    vi.stubEnv("CONTRATPRO_SIGNING_VERIFIED", "true");
    vi.mocked(getAgencyContext).mockResolvedValue(mode === "forbidden" ? { access: { status: "forbidden" }, canonical: null, choices: [] } : { ...context, ...(mode === "foreign-agency" ? { access: { ...context.access, agencyId: uid } } : { canonical: { ...context.canonical, userId: aid } }) });
    expect((await operationalDashboard(aid, at)).signing.status).toBe("unavailable");
    expect(componentAuthClient).not.toHaveBeenCalled();
  });
  it("uses exactly four allowlisted reads, same agency and observation time, with independent failures", async () => {
    for (const gate of ["RENTALS", "SIGNING", "DELIVERY", "SHEETS"]) vi.stubEnv(`CONTRATPRO_${gate}_VERIFIED`, "true");
    vi.mocked(getAgencyContext).mockResolvedValue(context);
    const rpc = vi.fn(async (_name: string, args: Record<string, unknown>) => args.p_module === "signing" ? { data: null, error: { code: "42501" } } : args.p_module === "delivery" ? { data: null, error: { code: "private failure" } } : { data: args.p_module === "rentals" ? groups : [], error: null });
    vi.mocked(componentAuthClient).mockResolvedValue({ rpc } as unknown as SupabaseClient);
    const result = await operationalDashboard(aid, at);
    expect(result).toMatchObject({ rentals: { status: "ready" }, signing: { status: "restricted" }, delivery: { status: "error" }, sheets: { status: "ready" } });
    expect(rpc).toHaveBeenCalledTimes(4);
    for (const [name, args] of rpc.mock.calls) { expect(name).toBe("contratpro_dashboard"); expect(args).toMatchObject({ p_agency_id: aid, p_at: "2026-11-26T09:00:00.000Z" }); }
  });
  it("rejects oversized or raw invalid states before rendering", () => {
    expect(() => overviewResult("delivery", Array(21).fill({ id: aid, reference: null, state: "failed" }))).toThrow();
    expect(() => overviewResult("signing", [{ id: aid, reference: null, state: "completed", at: "2026-11-26T09:00:00Z" }])).toThrow();
    expect(() => overviewResult("sheets", [{ id: aid, reference: "<private>", state: "pending" }])).toThrow();
  });
  it("returns an error state when the authorized client is unavailable, without leaking diagnostics", async () => {
    vi.stubEnv("CONTRATPRO_RENTALS_VERIFIED", "true");
    vi.mocked(getAgencyContext).mockResolvedValue(context);
    vi.mocked(componentAuthClient).mockRejectedValue(new Error("private credentials"));
    const result = await operationalDashboard(aid, at);
    expect(result.rentals.status).toBe("error");
    expect(JSON.stringify(result)).not.toContain("private credentials");
  });
  for (const locale of ["fr", "ar"] as const) it(`${locale}: distinguishes zero, error, setup and denied modules, and names signature actions`, () => {
    const ready = overviewResult("signing", [{ id: aid, reference: "CTR-2026-0042", state: "awaiting_client", at: "2026-11-27T09:00:00Z" }]);
    const data: Overview = { rentals: overviewResult("rentals", groups), signing: ready, delivery: { status: "error" }, sheets: { status: "unavailable" } };
    const html = renderToStaticMarkup(<OperationalDashboard locale={locale} data={data} at={at}/>);
    expect(html).toContain("(0)"); expect(html).toContain("CTR-2026-0042"); expect(html).toContain(`/${locale}/app/rentals/${aid}`);
    expect(html).not.toContain("awaiting_client"); expect(html).toContain('role="status"');
    expect(html).toContain(locale === "fr" ? "Signature client attendue" : "بانتظار توقيع العميل");
    expect(maintenanceLabel("manual-review",locale)).not.toBe("manual-review");
    expect(maintenanceLabel("private_raw_outcome",locale)).not.toContain("private_raw_outcome");
  });
});
