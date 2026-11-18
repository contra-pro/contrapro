import type { Locale } from "../i18n/locales";
import type { ClientScope } from "../clients/server";
import { AgencyWorkspace } from "./agency-workspace";
import { AgencyAccessView } from "./agency-access-view";
import { clientMessages } from "../i18n/clients";
export function ClientGate({ locale, scope }: { locale: Locale; scope: Exclude<ClientScope, { status: "ready" }> }) {
  if (scope.status === "access") return <AgencyAccessView locale={locale} access={scope.access} />;
  const copy = clientMessages(locale);
  return <AgencyWorkspace locale={locale} title={copy.title}><p role="status">{copy[scope.status]}</p></AgencyWorkspace>;
}
