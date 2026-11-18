import { notFound } from "next/navigation";
import { isLocale } from "../../../../i18n/locales";
import { clientMessages } from "../../../../i18n/clients";
import { getClientScope } from "../../../../clients/server";
import { listClients } from "../../../../clients/data";
import { defaultClientQuery, type ClientPage } from "../../../../../../../packages/application/src/clients";
import { ClientGate } from "../../../../components/client-gate";
import { AgencyWorkspace } from "../../../../components/agency-workspace";
import { ClientList } from "../../../../components/client-list";
export default async function ClientsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound();
  const scope = await getClientScope();
  if (scope.status !== "ready") return <ClientGate locale={locale} scope={scope} />;
  let page: ClientPage | null = null;
  try { page = await listClients(scope.client, scope.agencyId, defaultClientQuery); } catch { /* Fixed unavailable copy, no raw data/error. */ }
  const copy = clientMessages(locale);
  return <AgencyWorkspace locale={locale} title={copy.title} description={copy.intro}>
    {page ? <ClientList locale={locale} initial={page} canCreate={scope.permissions.create} /> : <p role="alert">{copy.unavailable}</p>}
  </AgencyWorkspace>;
}
