import { notFound } from "next/navigation";
import { isLocale } from "../../../../i18n/locales";
import { getAgencyContext } from "../../../../server/agency-access";
import { AgencyAccessView } from "../../../../components/agency-access-view";
import { AgencyWorkspace } from "../../../../components/agency-workspace";
import { AgencySelection } from "../../../../components/agency-selection";
import { agencyManagementMessages } from "../../../../i18n/agency-management";
export default async function SelectAgency({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound();
  const context = await getAgencyContext();
  if (!context.canonical || context.choices.length === 0) return <AgencyAccessView locale={locale} access={context.access} />;
  return <AgencyWorkspace locale={locale} title={agencyManagementMessages(locale).selectTitle}>
    <AgencySelection locale={locale} choices={context.choices} />
  </AgencyWorkspace>;
}
