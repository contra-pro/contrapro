import { notFound } from "next/navigation";
import { AreaShell } from "../../../components/area-shell";
import { isLocale } from "../../../i18n/locales";
import { ClientSigning } from "../../../signing/workspace";

export default async function SigningPlaceholder({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return process.env.CONTRATPRO_SIGNING_VERIFIED==="true" ? <ClientSigning locale={locale}/> : <AreaShell locale={locale} area="signing" />;
}
