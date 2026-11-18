import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { isLocale } from "../../../../../i18n/locales";
import { clientMessages } from "../../../../../i18n/clients";
import { getClientScope } from "../../../../../clients/server";
import { clientDetail } from "../../../../../clients/data";
import { isUuid } from "../../../../../../../../packages/application/src/agency-management";
import type { ClientRecord } from "../../../../../../../../packages/application/src/clients";
import { ClientGate } from "../../../../../components/client-gate";
import { AgencyWorkspace } from "../../../../../components/agency-workspace";
import { ClientForm } from "../../../../../components/client-form";
export default async function ClientDetails({ params }: { params: Promise<{ locale: string; clientId: string }> }) {
  const { locale, clientId } = await params; if (!isLocale(locale)) notFound();
  const scope = await getClientScope();
  if (scope.status !== "ready") return <ClientGate locale={locale} scope={scope} />;
  if (!isUuid(clientId)) notFound();
  let record: ClientRecord | null = null; let failed = false;
  try { record = await clientDetail(scope.client, scope.agencyId, clientId); } catch { failed = true; }
  if (!record && !failed) notFound();
  const copy = clientMessages(locale);
  return <AgencyWorkspace locale={locale} title={copy.details}>
    {record ? <ClientForm locale={locale} permissions={scope.permissions} initial={record} requestId={randomUUID()} /> : <p role="alert">{copy.unavailable}</p>}
  </AgencyWorkspace>;
}
