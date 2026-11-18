import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getVehicleScope } from "../vehicles/server";
import { VehicleDraftForm } from "./vehicle-draft";
import { vehicleMessages } from "../i18n/vehicles";
import NewVehicle from "../app/[locale]/app/vehicles/new/page";
import VehicleDetails from "../app/[locale]/app/vehicles/[vehicleId]/page";
import VehiclesPage from "../app/[locale]/app/vehicles/page";
import Loading from "../app/[locale]/app/vehicles/loading";
import Missing from "../app/[locale]/app/vehicles/not-found";
vi.mock("../vehicles/server", () => ({ getVehicleScope: vi.fn() }));
vi.mock("../auth/session-sync", () => ({ SessionSync: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }), useParams: () => ({ locale: "ar" }), notFound: () => { throw Error("NOT_FOUND"); } }));
const id = "30000000-0000-4000-8000-000000000001", agencyId = "10000000-0000-4000-8000-000000000001";
const record = { id, version: 2, registration: "AB-123", make: "Dacia", model: "<script>unsafe</script>", year: "2026", mileage: "300" };
const permissions = { read: true, create: true, update: true };
const rpc = vi.fn(); const client = { rpc } as unknown as SupabaseClient;
describe("vehicle persistence FR/AR screens — injected server scope only", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.mocked(getVehicleScope).mockResolvedValue({ status: "ready", client, agencyId, permissions }); });
  for (const locale of ["fr", "ar"] as const) {
    const params = Promise.resolve({ locale });
    it(`${locale}: available creation reuses validated draft inputs without unsaved or premature success claims`, async () => {
      const html = renderToStaticMarkup(await NewVehicle({ params }));
      expect(html).toContain('id="vehicle-registration"'); expect(html).toContain(vehicleMessages(locale).confirm);
      expect(html).not.toContain(vehicleMessages(locale).notice); expect(html).not.toContain(vehicleMessages(locale).saved);
      expect(html).not.toContain(vehicleMessages(locale).reviewTitle);
    });
    it(`${locale}: denied create renders no editable fields`, async () => {
      vi.mocked(getVehicleScope).mockResolvedValue({ status: "ready", client, agencyId, permissions: { ...permissions, create: false } });
      const html = renderToStaticMarkup(await NewVehicle({ params }));
      expect(html).toContain(vehicleMessages(locale).forbidden); expect(html).not.toContain('id="vehicle-registration"');
    });
    it(`${locale}: detail/edit uses current record and read-only viewers cannot mutate`, async () => {
      rpc.mockResolvedValue({ data: { ...record, agencyId }, error: null });
      const html = renderToStaticMarkup(await VehicleDetails({ params: Promise.resolve({ locale, vehicleId: id }) }));
      expect(html).toContain('value="AB-123"'); expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("<script>unsafe");
      expect(rpc).toHaveBeenCalledWith("contratpro_vehicle_detail", { p_agency_id: agencyId, p_id: id });
      const readonly = renderToStaticMarkup(createElement(VehicleDraftForm, { locale, persistence: { permissions: { ...permissions, update: false }, initial: record, requestId: id } }));
      expect(readonly).toContain("AB-123"); expect(readonly).not.toContain("<input"); expect(readonly).not.toContain("<button");
    });
    it(`${locale}: list links scoped records, escapes labels, paginates and hides disallowed create`, async () => {
      rpc.mockResolvedValue({ data: { total: 21, items: [{ ...record, agencyId }] }, error: null });
      vi.mocked(getVehicleScope).mockResolvedValue({ status: "ready", client, agencyId, permissions: { ...permissions, create: false } });
      const html = renderToStaticMarkup(await VehiclesPage({ params }));
      expect(html).toContain(`/${locale}/app/vehicles/${id}`); expect(html).toContain(`/${locale}/app/vehicles?page=2`);
      expect(html).not.toContain(`/${locale}/app/vehicles/new`); expect(html).not.toContain("<script>unsafe");
    });
    it(`${locale}: database failure and unavailable capability cannot masquerade as empty/success`, async () => {
      rpc.mockRejectedValue(Error("PRIVATE")); const html = renderToStaticMarkup(await VehiclesPage({ params }));
      expect(html).toContain(vehicleMessages(locale).unavailable); expect(html).not.toContain("PRIVATE"); expect(html).not.toContain(vehicleMessages(locale).empty);
      vi.mocked(getVehicleScope).mockResolvedValue({ status: "unavailable" });
      expect(renderToStaticMarkup(await NewVehicle({ params }))).toContain(vehicleMessages(locale).unavailable);
    });
    it(`${locale}: missing/cross-tenant details and invalid IDs share not-found behavior`, async () => {
      rpc.mockResolvedValue({ data: null, error: null });
      for (const vehicleId of [id, "invalid"]) await expect(VehicleDetails({ params: Promise.resolve({ locale, vehicleId }) })).rejects.toThrow("NOT_FOUND");
    });
  }
  it("localized loading and not-found views provide navigation without vehicle data", () => {
    expect(renderToStaticMarkup(createElement(Loading))).toContain(vehicleMessages("ar").loading);
    const html = renderToStaticMarkup(createElement(Missing)); expect(html).toContain(vehicleMessages("ar")["not-found"]); expect(html).toContain("/ar/app/vehicles");
  });
});
