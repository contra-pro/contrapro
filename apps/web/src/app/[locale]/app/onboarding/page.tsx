import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { isLocale } from "../../../../i18n/locales";
import { getAgencyContext } from "../../../../server/agency-access";
import { AgencyAccessView } from "../../../../components/agency-access-view";
import { AgencyWorkspace } from "../../../../components/agency-workspace";
import { AgencyForm } from "../../../../components/agency-form";
import { agencyManagementMessages } from "../../../../i18n/agency-management";
export default async function Onboarding({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound();
  const context = await getAgencyContext();
  if (!context.canonical) return <AgencyAccessView locale={locale} access={context.access} />;
  const copy = agencyManagementMessages(locale);
  return <AgencyWorkspace locale={locale} title={copy.createTitle} description={copy.createText}>
    <AgencyForm locale={locale} action="create" requestId={randomUUID()} enabled={process.env.CONTRATPRO_AGENCY_WRITES_VERIFIED === "true"} isOwner />
  </AgencyWorkspace>;
}
