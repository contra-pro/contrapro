import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AgencyForm } from "./agency-form";
import { AgencySelection } from "./agency-selection";
import { AgencyNavigation } from "./agency-navigation";
import { agencyManagementMessages } from "../i18n/agency-management";
import { validateAgencyProfile } from "../../../../packages/application/src/agency-management";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
describe("agency management FR/AR presentation — server rendering only", () => {
  for (const locale of ["fr", "ar"] as const) {
    it(`${locale}: renders all profile fields with accessible labels and optional fiscal fields`, () => {
      const html = renderToStaticMarkup(createElement(AgencyForm, { locale, action: "create", requestId: "synthetic", enabled: true, isOwner: true }));
      const copy = agencyManagementMessages(locale);
      for (const field of ["name", "ice", "ifNumber", "rc", "address", "city", "phone", "email"] as const) {
        expect(html).toContain(`name="${field}"`); expect(html).toContain(`for="agency-${field}"`); expect(html).toContain(copy.fields[field]);
      }
      expect(html).toContain(copy.optional); expect(html).toContain(copy.required);
      expect(html).not.toContain('name="ownerId"'); expect(html).not.toContain('name="agencyId"');
      expect(html).toContain('dir="ltr"'); expect(html).toContain('dir="auto"');
    });
    it(`${locale}: live-disabled creation has no enabled submit or success message`, () => {
      const html = renderToStaticMarkup(createElement(AgencyForm, { locale, action: "create", requestId: "synthetic", enabled: false, isOwner: true }));
      expect(html).toContain("disabled"); expect(html).toContain(agencyManagementMessages(locale).unavailable);
      expect(html).not.toContain(agencyManagementMessages(locale).saved);
    });
    it(`${locale}: settings are read-only to non-owners`, () => {
      const html = renderToStaticMarkup(createElement(AgencyForm, { locale, action: "settings", requestId: "synthetic", enabled: true, isOwner: false }));
      expect(html).toContain("disabled"); expect(html).toContain(agencyManagementMessages(locale).ownerOnly);
      expect(html).not.toContain('type="submit"');
      expect(html).toContain('name="defaultLocale"'); expect(html).toContain('name="timeZone"'); expect(html).toContain('name="currency"');
    });
    it(`${locale}: selection and profile names are HTML escaped`, () => {
      const html = renderToStaticMarkup(createElement(AgencySelection, { locale, choices: [{ agencyId: "test", name: "<script>bad</script>" }] }));
      expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("<script>bad");
      expect(html).toContain(agencyManagementMessages(locale).choose);
    });
    it(`${locale}: navigation points to existing localized agency screens`, () => {
      const html = renderToStaticMarkup(createElement(AgencyNavigation, { locale }));
      for (const route of ["onboarding", "profile", "settings", "select"]) expect(html).toContain(`/${locale}/app/${route}`);
    });
    it(`${locale}: server validation codes have localized copy`, () => {
      const validation = validateAgencyProfile({}); expect(validation.ok).toBe(false);
      if (!validation.ok) for (const code of Object.values(validation.errors)) expect(agencyManagementMessages(locale).errors[code]).toBeTruthy();
    });
  }
});
