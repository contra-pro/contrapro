import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { isLocale } from "../../../../../i18n/locales";
import { vehicleMessages } from "../../../../../i18n/vehicles";
import { getVehicleScope } from "../../../../../vehicles/server";
import { vehicleDetail } from "../../../../../vehicles/data";
import { VehicleGate } from "../../../../../components/vehicle-gate";
import { AgencyWorkspace } from "../../../../../components/agency-workspace";
import { VehicleDraftForm } from "../../../../../components/vehicle-draft";
import { isUuid } from "../../../../../../../../packages/application/src/agency-management";
import type { VehicleRecord } from "../../../../../../../../packages/application/src/vehicles";
export default async function VehicleDetails({ params }: { params: Promise<{ locale: string; vehicleId: string }> }) {
  const { locale, vehicleId } = await params; if (!isLocale(locale)) notFound();
  const scope = await getVehicleScope(); if (scope.status !== "ready") return <VehicleGate locale={locale} scope={scope} />;
  if (!isUuid(vehicleId)) notFound();
  let vehicle: VehicleRecord | null = null; let failed = false;
  try { vehicle = await vehicleDetail(scope.client, scope.agencyId, vehicleId); } catch { failed = true; }
  if (!vehicle && !failed) notFound();
  const copy = vehicleMessages(locale);
  return <AgencyWorkspace locale={locale} title={copy.details}>{vehicle ?
    <VehicleDraftForm key={`${scope.agencyId}:${vehicle.id}:${vehicle.version}`} locale={locale} persistence={{ permissions: scope.permissions, initial: vehicle, requestId: randomUUID() }} /> :
    <p role="alert">{copy.unavailable}</p>}</AgencyWorkspace>;
}
