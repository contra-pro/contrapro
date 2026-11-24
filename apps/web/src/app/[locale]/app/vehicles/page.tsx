import { notFound } from "next/navigation";
import { isLocale } from "../../../../i18n/locales";
import { vehicleMessages } from "../../../../i18n/vehicles";
import { getVehicleScope } from "../../../../vehicles/server";
import { listVehicles } from "../../../../vehicles/data";
import { AgencyWorkspace } from "../../../../components/agency-workspace";
import { VehicleGate } from "../../../../components/vehicle-gate";
import { VehicleList } from "../../../../components/vehicle-list";
import { validVehiclePage, type VehiclePage } from "../../../../../../../packages/application/src/vehicles";

export default async function VehiclesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams?: Promise<{ page?: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound();
  const scope = await getVehicleScope(); if (scope.status !== "ready") return <VehicleGate locale={locale} scope={scope} />;
  const raw = (await searchParams)?.page ?? "1";
  const page = /^[1-9][0-9]{0,4}$/.test(raw) ? Number(raw) : 0; if (!validVehiclePage(page)) notFound();
  let data: VehiclePage | null = null;
  try { data = await listVehicles(scope.client, scope.agencyId, page); } catch { /* Sanitized unavailable state. */ }
  const copy = vehicleMessages(locale);
  return <AgencyWorkspace locale={locale} title={copy.title}>
    {data ? <VehicleList key={scope.agencyId} locale={locale} data={data} canCreate={scope.permissions.create} /> : <p role="alert">{copy.unavailable}</p>}
  </AgencyWorkspace>;
}
