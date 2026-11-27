import { notFound } from "next/navigation";
import { isLocale } from "../../../../i18n/locales";
import { getAgencyContext } from "../../../../server/agency-access";
import { AgencyAccessView } from "../../../../components/agency-access-view";
import { AuthShell } from "../../../../components/auth-shell";
import { AgencyOnboarding } from "../../../../registration/workspace";
import { agencyManagementMessages } from "../../../../i18n/agency-management";
export default async function Onboarding({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound();
  const context = await getAgencyContext();
  if (!context.canonical) return <AgencyAccessView locale={locale} access={context.access} presentation="auth" />;
  const copy = agencyManagementMessages(locale);
  return <AuthShell locale={locale} path="app/onboarding" title={copy.createTitle} subtitle={copy.createText}>
    <AgencyOnboarding key={context.canonical.userId} locale={locale} enabled={process.env.CONTRATPRO_AGENCY_WRITES_VERIFIED === "true"}/>
  </AuthShell>;
}
