import { notFound } from "next/navigation";
import { isLocale } from "../../../../i18n/locales";
import { getAgencyContext } from "../../../../server/agency-access";
import { AgencyAccessView } from "../../../../components/agency-access-view";
import { AgencyWorkspace } from "../../../../components/agency-workspace";
import { ContractArchive } from "../../../../rentals/archive-workspace";
export default async function Page({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;if(!isLocale(locale))notFound();const context=await getAgencyContext();
 if(context.access.status!=="authorized")return <AgencyAccessView locale={locale} access={context.access}/>;
 return <AgencyWorkspace locale={locale} agencyName={context.access.agencyName} agencyScope={context.access.agencyId+":"+context.access.userId} title={locale==="ar"?"أرشيف العقود":"Archives des contrats"}>{process.env.CONTRATPRO_A4_VERIFIED==="true"&&process.env.CONTRATPRO_RENTALS_VERIFIED==="true"?<ContractArchive key={`${context.access.userId}:${context.access.agencyId}`} locale={locale}/>:<p role="status">{locale==="ar"?"الأرشيف غير متاح قبل التحقق.":"Archives indisponibles avant vérification."}</p>}</AgencyWorkspace>;
}
