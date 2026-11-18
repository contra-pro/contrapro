import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAgencyAccess, getAgencyContext } from "../server/agency-access";
import { componentAuthClient } from "../auth/server";
import AgencyPage from "../app/[locale]/app/page";
import { clientMessages } from "../i18n/clients";
import { agencyAccessMessages } from "../i18n/agency-access";

vi.mock("server-only", () => ({}));
vi.mock("../server/agency-access", () => ({ getAgencyAccess: vi.fn(), getAgencyContext: vi.fn() }));
vi.mock("../auth/server", () => ({ componentAuthClient: vi.fn() }));
vi.mock("../auth/session-sync", () => ({ SessionSync: () => null }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
const agencyId = "10000000-0000-4000-8000-000000000001";
const userId = "20000000-0000-4000-8000-000000000001";
const access = { status: "authorized" as const, agencyId, userId, membershipId: userId, agencyName: "Atlas <script>unsafe</script>" };
const context = { access, canonical: { userId, subject: userId, expiresAt: 999999 }, choices: [] };
const rpc = vi.fn();

describe("dashboard handoff — real client scope, synthetic transport only", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("CONTRATPRO_CLIENTS_VERIFIED", "true");
    vi.mocked(getAgencyAccess).mockResolvedValue(access);
    vi.mocked(getAgencyContext).mockResolvedValue(context);
    vi.mocked(componentAuthClient).mockResolvedValue({ rpc } as unknown as SupabaseClient);
    rpc.mockResolvedValue({ data: { read: true, create: true, update: false, archive: false }, error: null });
  });
  afterEach(() => vi.unstubAllEnvs());
  for (const locale of ["fr", "ar"] as const) {
    const render = async () => renderToStaticMarkup(await AgencyPage({ params: Promise.resolve({ locale }) }));
    it(`${locale}: shows agency, existing navigation and permitted Add Client action`, async () => {
      const html = await render();
      expect(html).toContain("Atlas &lt;script&gt;unsafe&lt;/script&gt;");
      expect(html).not.toContain("<script>unsafe");
      expect(html).toContain(`href="/${locale}/app/clients"`);
      expect(html).toContain(`href="/${locale}/app/profile"`);
      expect(html).toContain(`href="/${locale}/app/clients/new"`);
      expect(html).toContain(clientMessages(locale).create);
      expect(rpc).toHaveBeenCalledExactlyOnceWith("contratpro_clients_permissions", { p_agency_id: agencyId });
    });
    it(`${locale}: hides creation when fresh permissions deny it`, async () => {
      rpc.mockResolvedValue({ data: { read: true, create: false, update: false, archive: false }, error: null });
      const html = await render();
      expect(html).not.toContain(`/${locale}/app/clients/new`);
      expect(html).toContain(clientMessages(locale).forbidden);
    });
    it(`${locale}: disabled gate does not look up permissions`, async () => {
      vi.stubEnv("CONTRATPRO_CLIENTS_VERIFIED", "false");
      const html = await render();
      expect(html).toContain(clientMessages(locale).unavailable);
      expect(html).not.toContain(`/${locale}/app/clients/new`);
      expect(componentAuthClient).not.toHaveBeenCalled();
    });
    it(`${locale}: permission lookup failure stays unavailable`, async () => {
      rpc.mockRejectedValue(new Error("private database failure"));
      const html = await render();
      expect(html).toContain(clientMessages(locale).unavailable);
      expect(html).not.toContain(`/${locale}/app/clients/new`);
      expect(html).not.toContain("private database failure");
    });
    it.each(["unmapped", "forbidden", "signed-out", "onboarding", "selection-required", "unavailable"] as const)(`${locale}: preserves %s access screen`, async status => {
      vi.mocked(getAgencyAccess).mockResolvedValue({ status });
      const html = await render();
      expect(html).toContain(agencyAccessMessages(locale).states[status].title);
      expect(html).not.toContain(`/${locale}/app/clients`);
      expect(getAgencyContext).not.toHaveBeenCalled();
    });
    it(`${locale}: revalidation can revoke dashboard access`, async () => {
      vi.mocked(getAgencyContext).mockResolvedValue({ access: { status: "forbidden" }, canonical: null, choices: [] });
      const html = await render();
      expect(html).toContain(agencyAccessMessages(locale).states.forbidden.title);
      expect(html).not.toContain("Atlas");
    });
    it(`${locale}: never combines permissions from a different agency`, async () => {
      vi.mocked(getAgencyContext).mockResolvedValue({ ...context, access: { ...access, agencyId: userId } });
      const html = await render();
      expect(html).not.toContain(`/${locale}/app/clients/new`);
      expect(html).toContain(clientMessages(locale).unavailable);
    });
  }
});
