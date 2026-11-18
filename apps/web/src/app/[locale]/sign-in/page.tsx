import { notFound } from "next/navigation";
import { isLocale } from "../../../i18n/locales";
import { SignInView } from "../../../components/sign-in-view";
import { publicAuthConfig, appOrigin } from "../../../auth/config";

export default async function SignInPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { status } = await searchParams;
  let configured = false;
  try { publicAuthConfig(); appOrigin(process.env.CONTRATPRO_APP_ORIGIN); configured = true; } catch { /* Show unavailable. */ }
  return <SignInView locale={locale} configured={configured} status={typeof status === "string" ? status : undefined} />;
}
