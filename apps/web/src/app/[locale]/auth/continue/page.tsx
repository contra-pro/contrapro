import { notFound, redirect } from "next/navigation";
import { isLocale } from "../../../../i18n/locales";
import { getAgencyContext } from "../../../../server/agency-access";
import { authDestination } from "../../../../auth/continuation";
import { AgencyAccessView } from "../../../../components/agency-access-view";
export default async function ContinueAuth({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound();
  const { access } = await getAgencyContext();
  const destination = authDestination(locale, access.status);
  if (destination) redirect(destination);
  return <AgencyAccessView locale={locale} access={access} />;
}
