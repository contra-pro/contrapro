import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RentalDashboard } from "./rental-dashboard";
import { modules, navigationCapabilities } from "./navigation-model";
import { money, dateTime } from "../i18n/presentation";
import { fields } from "../documents/model";
import { fieldLabel } from "../documents/field-labels";
import type { RentalPage } from "../rentals/data";

const data: RentalPage = { total: 30, items: [{
  id: "10000000-0000-4000-8000-000000000001", client_id: "10000000-0000-4000-8000-000000000002",
  vehicle_id: "10000000-0000-4000-8000-000000000003", version: 1, state: "confirme",
  contract_number: "CTR-2026-0042", starts_at: "2026-11-26T12:00:00Z", ends_at: "2026-11-28T12:00:00Z",
}] };
describe("A6 local presentation boundaries", () => {
  it("fails closed for absent gates and malformed permission projections", () => {
    const permissions = Object.fromEntries(modules.map(key => [key, true]));
    expect(Object.values(navigationCapabilities(permissions, {}))).toEqual(modules.map(() => false));
    expect(() => navigationCapabilities({ ...permissions, platform: true }, {})).toThrow();
    expect(() => navigationCapabilities({ ...permissions, team: "true" }, {})).toThrow();
    const result = navigationCapabilities(permissions, { CONTRATPRO_RENTALS_VERIFIED: "true" });
    expect(modules.filter(key => result[key])).toEqual(["rentals"]);
  });
  for (const locale of ["fr", "ar"] as const) {
    it(`${locale}: keeps the bounded dashboard explicit and routes to the actual contract`, () => {
      const html = renderToStaticMarkup(<RentalDashboard locale={locale} data={data} now={Date.parse("2026-11-26T09:00:00Z")} />);
      expect(html).toContain(`/${locale}/app/rentals/${data.items[0]!.id}`);
      expect(html).toContain("CTR-2026-0042");
      expect(html).toContain("30");
      expect(html).toContain("<bdi>");
      expect(html).not.toContain("client_id");
    });
    it(`${locale}: distinguishes empty authorized data from unavailable data`, () => {
      const empty = renderToStaticMarkup(<RentalDashboard locale={locale} data={{ items: [], total: 0 }} now={0} />);
      const unavailable = renderToStaticMarkup(<RentalDashboard locale={locale} data={null} unavailable now={0} />);
      expect(empty).toContain(`/${locale}/app/rentals/new`);
      expect(unavailable).not.toContain(`/${locale}/app/rentals/new`);
      expect(unavailable).toContain('role="status"');
      expect(empty).not.toEqual(unavailable);
    });
    it(`${locale}: names every authoritative mapping without displaying a technical key`, () => {
      for (const field of fields) {
        const [group, name] = field.split(".");
        const label = fieldLabel(field, locale);
        expect(label).not.toContain(`${group} /`);
        expect(label).not.toContain(`/ ${name}`);
      }
    });
    it(`${locale}: preserves exact large minor units and rejects invalid presentation input`, () => {
      const amount = money(locale, "900719925474099301");
      expect(amount).toContain("MAD");
      expect(amount).toContain("01 MAD");
      expect(money(locale, "NaN")).toBe("—");
      expect(dateTime(locale, "invalid")).toBe("—");
      expect(dateTime(locale, "2026-11-26T09:00:00Z")).toContain("UTC");
    });
  }
});
