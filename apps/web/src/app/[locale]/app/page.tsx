import { notFound } from "next/navigation";
import { AgencyAccessView } from "../../../components/agency-access-view";
import { isLocale } from "../../../i18n/locales";
import { getAgencyAccess } from "../../../server/agency-access";
import { getClientScope } from "../../../clients/server";
import { clientMessages } from "../../../i18n/clients";
import Link from "next/link";
import { rentalCapabilities,rentalList,type RentalPage } from "../../../rentals/data";
import { componentAuthClient } from "../../../auth/server";
import { dashboardTime } from "../../../server/dashboard-time";
import { operationalDashboard } from "../../../server/operational-dashboard";
import { OperationalDashboard } from "../../../components/operational-dashboard";

export default async function AgencyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const access = await getAgencyAccess();
  if (access.status !== "authorized") return <AgencyAccessView locale={locale} access={access} />;
  const scope = await getClientScope();
  if (scope.status === "access") return <AgencyAccessView locale={locale} access={scope.access} />;
  const ready = scope.status === "ready" && scope.agencyId === access.agencyId && scope.permissions.read === true;
  const copy = clientMessages(locale);
  let rentals:RentalPage|null=null,rentalUnavailable=false;
  if(process.env.CONTRATPRO_RENTALS_VERIFIED==="true"){
    try{const client=await componentAuthClient();await rentalCapabilities(client,access.agencyId);rentals=await rentalList(client,access.agencyId,1);}catch{rentalUnavailable=true;}
  }
  const observedAt = await dashboardTime();
  const overview = await operationalDashboard(access.agencyId, observedAt);
  return <AgencyAccessView locale={locale} access={access}>
    <OperationalDashboard locale={locale} data={overview} at={observedAt} rentals={rentals} unavailable={rentalUnavailable}/>
    <section className="next-step" aria-labelledby="dashboard-clients">
      <h2 id="dashboard-clients"><Link href={`/${locale}/app/clients`} prefetch={false}>{copy.title}</Link></h2>
      {ready && scope.permissions.create === true ?
        <p><Link className="dashboard-primary-action" href={`/${locale}/app/clients/new`} prefetch={false}>{copy.create}</Link></p> :
        <p role="status">{scope.status === "forbidden" || ready ? copy.forbidden : copy.unavailable}</p>}
    </section>
  </AgencyAccessView>;
}
