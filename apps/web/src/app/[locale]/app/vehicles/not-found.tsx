"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { isLocale } from "../../../../i18n/locales";
import { vehicleMessages } from "../../../../i18n/vehicles";
export default function VehicleNotFound() {
  const params = useParams(); const locale = typeof params.locale === "string" && isLocale(params.locale) ? params.locale : "fr"; const copy = vehicleMessages(locale);
  return <section><h1>{copy["not-found"]}</h1><Link prefetch={false} href={`/${locale}/app/vehicles`}>{copy.list}</Link></section>;
}
