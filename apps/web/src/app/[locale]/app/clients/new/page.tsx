import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { isLocale } from "../../../../../i18n/locales";
import { clientMessages } from "../../../../../i18n/clients";
import { getClientScope } from "../../../../../clients/server";
import { ClientGate } from "../../../../../components/client-gate";
import { AgencyWorkspace } from "../../../../../components/agency-workspace";
import { ClientForm } from "../../../../../components/client-form";
export default async function NewClient({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound();
  const scope = await getClientScope();
  if (scope.status !== "ready") return <ClientGate locale={locale} scope={scope} />;
  const copy = clientMessages(locale);
  return <AgencyWorkspace locale={locale} title={copy.createTitle}>
    {scope.permissions.create ? <ClientForm key={scope.agencyId} locale={locale} permissions={scope.permissions} requestId={randomUUID()} /> : <p role="status">{copy.forbidden}</p>}
  </AgencyWorkspace>;
}
