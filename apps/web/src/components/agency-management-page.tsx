import { randomUUID } from "node:crypto";
import type { Locale } from "../i18n/locales";
import { getAgencyContext } from "../server/agency-access";
import { componentAuthClient } from "../auth/server";
import { readAgencyProfile, type ManagedAgency } from "../agency/profile";
import { AgencyAccessView } from "./agency-access-view";
import { AgencyWorkspace } from "./agency-workspace";
import { AgencyForm } from "./agency-form";
import { agencyManagementMessages } from "../i18n/agency-management";
import {BusinessSettings} from '../registration/business-settings';
export async function AgencyManagementPage({ locale, area }: { locale: Locale; area: "profile" | "settings" }) {
  const context = await getAgencyContext();
  if (context.access.status !== "authorized") return <AgencyAccessView locale={locale} access={context.access} />;
  const copy = agencyManagementMessages(locale);
  const enabled = process.env.CONTRATPRO_AGENCY_WRITES_VERIFIED === "true";
  let agency: ManagedAgency | null = null;
  let failed = false;
  try {
    agency = enabled ? await readAgencyProfile(await componentAuthClient(), context.access.agencyId) : null;
  } catch { failed = true; }
  return <AgencyWorkspace locale={locale} agencyName={context.access.agencyName} agencyScope={context.access.agencyId+":"+context.access.userId} title={area === "profile" ? copy.profileTitle : copy.settingsTitle} description={context.access.agencyName}>
    {!agency ? <p role={failed ? "alert" : "status"}>{copy.unavailable}</p> : area==='profile'?<BusinessSettings key={JSON.stringify(agency.profile)+JSON.stringify(agency.settings)} locale={locale} profile={agency.profile} settings={agency.settings} enabled={enabled&&agency.isOwner}/>:<AgencyForm locale={locale} action={area} requestId={randomUUID()} enabled={enabled}
      isOwner={agency.isOwner} profile={agency.profile} settings={agency.settings} />}
    <p className="description">{area === "settings" ? copy.defaults : copy.noStorage}</p>
  </AgencyWorkspace>;
}
