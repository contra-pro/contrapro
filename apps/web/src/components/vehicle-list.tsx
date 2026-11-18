import Link from "next/link";
import type { Locale } from "../i18n/locales";
import { vehicleMessages } from "../i18n/vehicles";
import { vehiclePageSize, type VehiclePage } from "../../../../packages/application/src/vehicles";
export function VehicleList({ locale, data, canCreate }: { locale: Locale; data: VehiclePage; canCreate: boolean }) {
  const copy = vehicleMessages(locale);
  return <section aria-label={copy.title}>
    {canCreate && <p><Link className="dashboard-primary-action" prefetch={false} href={`/${locale}/app/vehicles/new`}>{copy.create}</Link></p>}
    {data.items.length ? <ul>{data.items.map(vehicle => <li key={vehicle.id}>
      <Link prefetch={false} href={`/${locale}/app/vehicles/${vehicle.id}`}><bdi>{vehicle.registration}</bdi> — <bdi>{vehicle.make} {vehicle.model}</bdi></Link>
    </li>)}</ul> : <p role="status">{copy.empty}</p>}
    <nav aria-label={copy.title}>
      {data.page > 1 && <Link prefetch={false} href={`/${locale}/app/vehicles?page=${data.page - 1}`}>{copy.previous}</Link>}{" "}
      {data.page * vehiclePageSize < data.total && <Link prefetch={false} href={`/${locale}/app/vehicles?page=${data.page + 1}`}>{copy.next}</Link>}
    </nav>
  </section>;
}
