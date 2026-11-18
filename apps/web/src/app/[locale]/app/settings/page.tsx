import { notFound } from "next/navigation";
import { isLocale } from "../../../../i18n/locales";
import { AgencyManagementPage } from "../../../../components/agency-management-page";
export default async function Settings({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound();
  return <AgencyManagementPage locale={locale} area="settings" />;
}
