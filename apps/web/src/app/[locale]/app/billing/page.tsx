import { notFound } from "next/navigation";
import { isLocale } from "../../../../i18n/locales";
import { getAgencyContext } from "../../../../server/agency-access";
import { AgencyAccessView } from "../../../../components/agency-access-view";
import { AgencyWorkspace } from "../../../../components/agency-workspace";
import { AgencyBilling } from "../../../../billing/workspace";
import { billingCopy } from "../../../../billing/copy";
export default async function Page({params}:{params:Promise<{locale:string}>}) {
 const {locale}=await params;if(!isLocale(locale))notFound();const context=await getAgencyContext();if(context.access.status!=="authorized")return <AgencyAccessView locale={locale} access={context.access}/>;
 const c=billingCopy(locale);return <AgencyWorkspace locale={locale} title={c.title}>{process.env.CONTRATPRO_BILLING_VERIFIED==="true"?<AgencyBilling key={`${context.access.userId}:${context.access.agencyId}`} locale={locale}/>:<p role="status">{c.unavailable}</p>}</AgencyWorkspace>;
}
