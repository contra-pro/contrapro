import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgencyAccess } from "../../../../packages/application/src/agency-access";
import { agencyAccessMessages } from "../i18n/agency-access";
import { AgencyAccessView } from "./agency-access-view";
import AgencyPage from "../app/[locale]/app/page";
import Loading from "../app/[locale]/app/loading";
import AgencyError from "../app/[locale]/app/error";
import { getAgencyAccess } from "../server/agency-access";

// Tests alone provide a synthetic verified result. No production session shortcut.
vi.mock("../server/agency-access", () => ({ getAgencyAccess: vi.fn() }));
vi.mock("../clients/server", () => ({ getClientScope: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("../auth/session-sync", () => ({ SessionSync: () => null }));
const authorized: AgencyAccess = { status: "authorized", userId: "private-user-id",
  agencyId: "private-agency-id", membershipId: "private-membership-id", agencyName: "Agence <script>test</script>" };
const statuses = ["signed-out", "forbidden", "onboarding", "unmapped", "selection-required", "unavailable"] as const;

describe("agency route integration — mocked server access, real page and presentation", () => {
  beforeEach(() => vi.resetAllMocks());
  for (const locale of ["fr", "ar"] as const) {
    it.each(statuses)(`${locale}: %s never renders the protected agency panel`, async (status) => {
      vi.mocked(getAgencyAccess).mockResolvedValue({ status });
      const element = await AgencyPage({ params: Promise.resolve({ locale }) });
      const html = renderToStaticMarkup(element);
      expect(html).toContain(agencyAccessMessages(locale).states[status].title);
      expect(html).not.toContain('id="agency-name"');
      expect(html).not.toContain("private-");
      expect(html).not.toContain("postgres://");
      expect(html).toContain(`/${locale}/app`);
      expect(getAgencyAccess).toHaveBeenCalledExactlyOnceWith();
    });
    it(`${locale}: renders authorized agency name as escaped text without identity IDs`, () => {
      const html = renderToStaticMarkup(createElement(AgencyAccessView, { locale, access: authorized }));
      expect(html).toContain('id="agency-name"');
      expect(html).toContain("&lt;script&gt;");
      expect(html).not.toContain("<script>test");
      expect(html).not.toContain("private-");
    });
  }
  it("rejects unsupported locale before calling the authorization adapter", async () => {
    await expect(AgencyPage({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("NOT_FOUND");
    expect(getAgencyAccess).not.toHaveBeenCalled();
  });
  it("does not forward browser tenant claims to authorization", async () => {
    vi.mocked(getAgencyAccess).mockResolvedValue({ status: "forbidden" });
    const request = { params: Promise.resolve({ locale: "fr" }),
      searchParams: Promise.resolve({ agencyId: "attacker", userId: "admin", role: "platform" }) };
    const html = renderToStaticMarkup(await AgencyPage(request));
    expect(getAgencyAccess).toHaveBeenCalledExactlyOnceWith();
    expect(html).not.toContain('id="agency-name"');
  });
  it("propagates unexpected page errors to the error boundary without an authorized fallback", async () => {
    vi.mocked(getAgencyAccess).mockRejectedValue(new Error("adapter failed"));
    await expect(AgencyPage({ params: Promise.resolve({ locale: "fr" }) })).rejects.toThrow("adapter failed");
  });
  it("loading and unexpected-error UI disclose no exception details", () => {
    expect(renderToStaticMarkup(createElement(Loading))).toContain('role="status"');
    const html = renderToStaticMarkup(createElement(AgencyError, {
      error: new Error("postgres://secret:password@private/path"), reset: vi.fn(),
    }));
    expect(html).toContain('role="alert"');
    expect(html).not.toMatch(/secret|password|postgres|private\/path/);
    expect(html).toContain('type="button"');
  });
});
