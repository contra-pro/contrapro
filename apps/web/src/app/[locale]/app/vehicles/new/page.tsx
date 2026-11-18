import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { isLocale } from "../../../../../i18n/locales";
import { vehicleMessages } from "../../../../../i18n/vehicles";
import { getVehicleScope } from "../../../../../vehicles/server";
import { VehicleGate } from "../../../../../components/vehicle-gate";
import { AgencyWorkspace } from "../../../../../components/agency-workspace";
import { VehicleDraftForm } from "../../../../../components/vehicle-draft";
export default async function NewVehicle({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound();
  const scope = await getVehicleScope(); if (scope.status !== "ready") return <VehicleGate locale={locale} scope={scope} />;
  const copy = vehicleMessages(locale);
  return <AgencyWorkspace locale={locale} title={copy.create}>{scope.permissions.create ?
    <VehicleDraftForm key={scope.agencyId} locale={locale} persistence={{ permissions: scope.permissions, requestId: randomUUID() }} /> : <p role="status">{copy.forbidden}</p>}
  </AgencyWorkspace>;
}
