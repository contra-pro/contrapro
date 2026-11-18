import { notFound } from "next/navigation";
import { AreaShell } from "../../../components/area-shell";
import { isLocale } from "../../../i18n/locales";

export default async function PlatformPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <AreaShell locale={locale} area="platform" />;
}
