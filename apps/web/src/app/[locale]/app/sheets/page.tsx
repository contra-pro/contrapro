import { notFound } from "next/navigation";
import { isLocale } from "../../../../i18n/locales";
import { getAgencyContext } from "../../../../server/agency-access";
import { AgencyAccessView } from "../../../../components/agency-access-view";
import { AgencyWorkspace } from "../../../../components/agency-workspace";
import { SheetsDashboard } from "../../../../sheets/workspace";
import { sheetsCopy } from "../../../../sheets/copy";
export default async function Page({params}:{params:Promise<{locale:string}>}){const {locale}=await params;if(!isLocale(locale))notFound();const context=await getAgencyContext();if(context.access.status!=="authorized")return <AgencyAccessView locale={locale} access={context.access}/>;const c=sheetsCopy(locale);return <AgencyWorkspace locale={locale} agencyName={context.access.agencyName} agencyScope={context.access.agencyId+":"+context.access.userId} title={c.title}>{process.env.CONTRATPRO_SHEETS_VERIFIED==="true"?<SheetsDashboard key={`${context.access.userId}:${context.access.agencyId}`} locale={locale}/>:<p role="status">{c.notReady}</p>}</AgencyWorkspace>;}
