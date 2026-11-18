import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ClientForm } from "./client-form";
import { ClientList } from "./client-list";
import { clientMessages } from "../i18n/clients";
import { clientFields, emptyClient, defaultClientQuery, type ClientRecord } from "../../../../packages/application/src/clients";
import { getClientScope } from "../clients/server";
import ClientsPage from "../app/[locale]/app/clients/page";
import NewClient from "../app/[locale]/app/clients/new/page";
import ClientDetails from "../app/[locale]/app/clients/[clientId]/page";
import ClientNotFound from "../app/[locale]/app/clients/not-found";
const routing = vi.hoisted(() => ({ locale: "fr" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }), useParams: () => ({ locale: routing.locale }), notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("../clients/server", () => ({ getClientScope: vi.fn() }));
vi.mock("../auth/session-sync", () => ({ SessionSync: () => null }));
const id = "10000000-0000-4000-8000-000000000001";
const agencyId = "20000000-0000-4000-8000-000000000001";
const permissions = { read: true, create: true, update: true, archive: true };
const contact: ClientRecord = { ...emptyClient, id, version: 1, firstName: "Amina", lastName: "Atlas", phone: "+212612345678",
  identityType: "passport", identityNumber: "PRIVATE-PASSPORT", licenceNumber: "PRIVATE-LICENCE", licenceIssueDate: "2020-01-01", licenceExpiryDate: "2021-01-01", notes: "<script>private</script>" };
describe("client FR/AR UI and page wiring — no browser or live transport", () => {
  beforeEach(() => vi.clearAllMocks());
  for (const locale of ["fr", "ar"] as const) {
    it(`${locale}: renders labelled client fields, optional documents and LTR document inputs`, () => {
      const html = renderToStaticMarkup(createElement(ClientForm, { locale, permissions, requestId: id }));
      for (const field of clientFields) { expect(html).toContain(`name="${field}"`); expect(html).toContain(`for="client-${field}"`); }
      expect(html).toContain(clientMessages(locale).documentHint);
      expect(html).toContain('dir="ltr"'); expect(html).toContain('dir="auto"');
      expect(html).not.toContain('type="file"'); expect(html).not.toContain('name="agencyId"');
      expect(html).not.toContain(clientMessages(locale).saved);
    });
    it(`${locale}: read-only viewers cannot edit or archive, and notes are escaped`, () => {
      const html = renderToStaticMarkup(createElement(ClientForm, { locale, permissions: { read: true, create: false, update: false, archive: false }, initial: contact, requestId: id }));
      expect(html).toContain(clientMessages(locale).readOnly); expect(html).toContain(clientMessages(locale).expired);
      expect(html).not.toContain('type="submit"'); expect(html).not.toContain(clientMessages(locale).archiveQuestion);
      expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("<script>private");
    });
    it(`${locale}: list never renders document/licence numbers or notes`, () => {
      const html = renderToStaticMarkup(createElement(ClientList, { locale, canCreate: true, initial: { items: [contact], total: 21, query: defaultClientQuery } }));
      expect(html).toContain(`/${locale}/app/clients/${id}`); expect(html).toContain(clientMessages(locale).previous); expect(html).toContain(clientMessages(locale).next);
      expect(html).not.toContain("PRIVATE-PASSPORT"); expect(html).not.toContain("PRIVATE-LICENCE"); expect(html).not.toContain("<script>");
      expect(html).toContain(`/${locale}/app/clients/new`); expect(html).not.toContain('value="archived"');
    });
    it(`${locale}: empty and filtered-empty states are distinct`, () => {
      const first = renderToStaticMarkup(createElement(ClientList, { locale, canCreate: false, initial: { items: [], total: 0, query: defaultClientQuery } }));
      expect(first).toContain(clientMessages(locale).empty); expect(first).not.toContain(`/${locale}/app/clients/new`);
      const filtered = renderToStaticMarkup(createElement(ClientList, { locale, canCreate: false, initial: { items: [], total: 0, query: { ...defaultClientQuery, search: "Atlas" } } }));
      expect(filtered).toContain(clientMessages(locale).noResults);
    });
    it(`${locale}: missing/archived/cross-tenant details use the same localized screen`, () => {
      routing.locale = locale;
      const html = renderToStaticMarkup(createElement(ClientNotFound));
      expect(html).toContain(clientMessages(locale)["not-found"]); expect(html).not.toContain("PRIVATE-");
    });
    it(`${locale}: inactive runtime capability never renders a fake empty list or success`, async () => {
      vi.mocked(getClientScope).mockResolvedValue({ status: "unavailable" });
      const html = renderToStaticMarkup(await ClientsPage({ params: Promise.resolve({ locale }) }));
      expect(html).toContain(clientMessages(locale).unavailable); expect(html).not.toContain(clientMessages(locale).empty);
    });
    it(`${locale}: creation permission is checked before rendering the form`, async () => {
      vi.mocked(getClientScope).mockResolvedValue({ status: "ready", agencyId, client: {} as SupabaseClient, permissions: { ...permissions, create: false } });
      const html = renderToStaticMarkup(await NewClient({ params: Promise.resolve({ locale }) }));
      expect(html).toContain(clientMessages(locale).forbidden); expect(html).not.toContain('name="firstName"');
    });
  }
  it("details route checks the trusted agency and reports hidden records as not-found", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    vi.mocked(getClientScope).mockResolvedValue({ status: "ready", agencyId, permissions, client: { rpc } as unknown as SupabaseClient });
    await expect(ClientDetails({ params: Promise.resolve({ locale: "fr", clientId: id }) })).rejects.toThrow("NOT_FOUND");
    expect(rpc).toHaveBeenCalledExactlyOnceWith("contratpro_client_detail", { p_agency_id: agencyId, p_id: id });
  });
  it("invalid locale rejects before any access/data calls", async () => {
    await expect(ClientsPage({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("NOT_FOUND");
    expect(getClientScope).not.toHaveBeenCalled();
  });
  it("keys the new-client draft by its trusted agency so agency switches reset draft state", async () => {
    vi.mocked(getClientScope).mockResolvedValue({ status: "ready", agencyId, permissions, client: {} as SupabaseClient });
    const page = await NewClient({ params: Promise.resolve({ locale: "fr" }) });
    expect(page.props.children.key).toBe(agencyId);
  });
});
