import { notFound } from "next/navigation";
import { AreaShell } from "../../../components/area-shell";
import { isLocale } from "../../../i18n/locales";
import { PlatformBilling } from "../../../billing/platform";
import { billingCopy } from "../../../billing/copy";

export default async function PlatformPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c=billingCopy(locale);
  return <AreaShell locale={locale} area="platform"><section className="intro"><h1 id="page-title">{c.platform}</h1></section>{process.env.CONTRATPRO_BILLING_VERIFIED==="true"?<PlatformBilling locale={locale}/>:<p role="status">{c.unavailable}</p>}</AreaShell>;
}
