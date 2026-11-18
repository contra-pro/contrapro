"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { isLocale } from "../../../../i18n/locales";
import { clientMessages } from "../../../../i18n/clients";
export default function ClientNotFound() {
  const params = useParams();
  const locale = typeof params.locale === "string" && isLocale(params.locale) ? params.locale : "fr";
  const copy = clientMessages(locale);
  return <main id="main" tabIndex={-1}><h1>{copy["not-found"]}</h1><Link href={`/${locale}/app/clients`} prefetch={false}>{copy.back}</Link></main>;
}
