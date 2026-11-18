import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateVehicleDraft, vehicleDraftReducer, initialVehicleDraftState, vehicleDraftFields } from "../../../../packages/application/src/vehicle-draft";
import { VehicleDraftForm, VehicleDraftReview } from "./vehicle-draft";
import { vehicleMessages } from "../i18n/vehicles";
import { agencyAccessMessages } from "../i18n/agency-access";
import { getAgencyContext } from "../server/agency-access";
import VehiclesPage from "../app/[locale]/app/vehicles/page";
import { componentAuthClient } from "../auth/server";
vi.mock("server-only", () => ({}));
vi.mock("../auth/server", () => ({ componentAuthClient: vi.fn() }));
vi.mock("../server/agency-access", () => ({ getAgencyContext: vi.fn() }));
vi.mock("../auth/session-sync", () => ({ SessionSync: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }), notFound: () => { throw new Error("NOT_FOUND"); } }));
const agencyId = "10000000-0000-4000-8000-000000000001";
const userId = "20000000-0000-4000-8000-000000000001";
const context = { access: { status: "authorized" as const, agencyId, userId, membershipId: userId, agencyName: "Atlas <script>unsafe</script>" },
  canonical: { userId, subject: "30000000-0000-4000-8000-000000000001", expiresAt: 9999999999999 }, choices: [] };
const valid = { registration: "12345 أ 6", make: "Dacia", model: "Duster", year: "2026", mileage: "12000" };

describe("vehicle draft validation and local review workflow", () => {
  it("normalizes valid FR/AR preparation without assigning IDs or persistence status", () => {
    expect(validateVehicleDraft({ ...valid, make: " Dacia " }, 2026)).toEqual({ ok: true, value: valid });
    expect(validateVehicleDraft({ ...valid, registration: "AB-123/CD", mileage: "0", year: "2027" }, 2026).ok).toBe(true);
  });
  it.each(vehicleDraftFields)("requires %s", field => {
    expect(validateVehicleDraft({ ...valid, [field]: " " }, 2026)).toEqual({ ok: false, errors: { [field]: "required" } });
  });
  it.each([
    { ...valid, agencyId }, { ...valid, id: userId }, { ...valid, mileage: -1 }, { ...valid, registration: "*" },
    { ...valid, year: "1899" }, { ...valid, year: "2028" }, { ...valid, year: "20e3" }, { ...valid, mileage: "1.5" },
    { ...valid, mileage: "-1" }, { ...valid, mileage: "10000000" }, { ...valid, mileage: "01" },
    { ...valid, make: "x".repeat(81) }, { ...valid, model: "unsafe\ntext" }, { ...valid, registration: "ABC\u202e123" }, null,
  ])("rejects malformed or caller-scoped input %#", input => {
    expect(validateVehicleDraft(input, 2026).ok).toBe(false);
  });
  it("invalid review remains editable; valid review, back, edit and clear never create a saved record", () => {
    const failed = vehicleDraftReducer(initialVehicleDraftState, { type: "review", currentYear: 2026 });
    expect(failed.review).toBeNull(); expect(failed.errors.make).toBe("required");
    let state = initialVehicleDraftState;
    for (const field of vehicleDraftFields) state = vehicleDraftReducer(state, { type: "edit", field, value: valid[field] });
    state = vehicleDraftReducer(state, { type: "review", currentYear: 2026 });
    expect(state.review).toEqual(valid);
    state = vehicleDraftReducer(state, { type: "back" }); expect(state.review).toBeNull(); expect(state.values).toEqual(valid);
    state = vehicleDraftReducer(state, { type: "review", currentYear: 2026 });
    state = vehicleDraftReducer(state, { type: "edit", field: "model", value: "Sandero" }); expect(state.review).toBeNull();
    expect(vehicleDraftReducer(state, { type: "clear" })).toEqual(initialVehicleDraftState);
  });
});

describe("agency-gated vehicle draft — synthetic context only, no transport", () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv("CONTRATPRO_VEHICLES_VERIFIED", "true"); vi.mocked(getAgencyContext).mockResolvedValue(context);
    const rpc = vi.fn(async (name: string) => ({ error: null, data: name === "contratpro_vehicles_permissions" ? { read: true, create: true, update: true } : { total: 0, items: [] } }));
    vi.mocked(componentAuthClient).mockResolvedValue({ rpc } as unknown as SupabaseClient);
  });
  afterEach(() => vi.unstubAllEnvs());
  for (const locale of ["fr", "ar"] as const) {
    it(`${locale}: authorized route shows localized navigation and a real empty result`, async () => {
      const html = renderToStaticMarkup(await VehiclesPage({ params: Promise.resolve({ locale }) }));
      expect(html).not.toContain("<script>unsafe");
      expect(html).toContain(`href="/${locale}/app/vehicles"`); expect(html).toContain(`href="/${locale}/app/clients"`);
      expect(html).toContain(vehicleMessages(locale).empty); expect(html).not.toContain(vehicleMessages(locale).notice);
      expect(html).not.toContain(vehicleMessages(locale).reviewTitle);
      expect(getAgencyContext).toHaveBeenCalledTimes(1);
    });
    it(`${locale}: labels all inputs, uses numeric LTR hints, and has no native submission or tenant fields`, () => {
      const html = renderToStaticMarkup(createElement(VehicleDraftForm, { locale }));
      for (const field of vehicleDraftFields) expect(html).toContain(`for="vehicle-${field}"`);
      expect(html).toContain('inputMode="numeric"'); expect(html).toContain('dir="ltr"'); expect(html).toContain('dir="auto"');
      expect(html).not.toContain("<form"); expect(html).not.toContain('name="agencyId"'); expect(html).not.toContain('type="submit"');
    });
    it(`${locale}: review escapes untrusted make/model text`, () => {
      const html = renderToStaticMarkup(createElement(VehicleDraftReview, { locale, value: { ...valid, model: "<img src=x onerror=alert(1)>" } }));
      expect(html).toContain("&lt;img"); expect(html).not.toContain("<img");
      expect(html).toContain(vehicleMessages(locale).fields.registration);
    });
    it.each(["unmapped", "forbidden", "signed-out", "onboarding", "selection-required", "unavailable"] as const)(`${locale}: preserves %s access state`, async status => {
      vi.mocked(getAgencyContext).mockResolvedValue({ access: { status }, canonical: null, choices: [] });
      const html = renderToStaticMarkup(await VehiclesPage({ params: Promise.resolve({ locale }) }));
      expect(html).toContain(agencyAccessMessages(locale).states[status].title);
      expect(html).not.toContain('id="vehicle-registration"'); expect(html).not.toContain("Atlas");
    });
    it(`${locale}: missing or mismatched canonical user cannot open draft`, async () => {
      for (const canonical of [null, { ...context.canonical, userId: agencyId }]) {
        vi.mocked(getAgencyContext).mockResolvedValue({ ...context, canonical });
        const html = renderToStaticMarkup(await VehiclesPage({ params: Promise.resolve({ locale }) }));
        expect(html).toContain(vehicleMessages(locale).forbidden);
        expect(html).not.toContain('id="vehicle-registration"');
      }
    });
  }
  it("rejects unsupported locales before looking up access", async () => {
    await expect(VehiclesPage({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("NOT_FOUND");
    expect(getAgencyContext).not.toHaveBeenCalled();
  });
});
