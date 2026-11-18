import type { Locale } from "../i18n/locales";
import type { VehicleScope } from "../vehicles/server";
import { AgencyAccessView } from "./agency-access-view";
import { AgencyWorkspace } from "./agency-workspace";
import { vehicleMessages } from "../i18n/vehicles";
export function VehicleGate({ locale, scope }: { locale: Locale; scope: Exclude<VehicleScope, { status: "ready" }> }) {
  if (scope.status === "access") return <AgencyAccessView locale={locale} access={scope.access} />;
  const copy = vehicleMessages(locale);
  return <AgencyWorkspace locale={locale} title={copy.title}><p role="status">{copy[scope.status]}</p></AgencyWorkspace>;
}
