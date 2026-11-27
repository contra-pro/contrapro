import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { direction, isLocale } from "../../i18n/locales";
import "../globals.css";
import "../production-design.css";
import "../operational-design.css";
import "../auth-design.css";

// Page output must never enter the Full Route Cache, including future sensitive areas.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata: Metadata = {
  title: {default:"ContratPro — Gestion de location automobile",template:"%s · ContratPro"},
  robots: { index: false, follow: false },
};

export default async function LocaleLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <html lang={locale} dir={direction(locale)}><body>{children}</body></html>;
}
