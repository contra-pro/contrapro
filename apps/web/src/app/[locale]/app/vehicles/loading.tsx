"use client";
import { useParams } from "next/navigation";
import { isLocale } from "../../../../i18n/locales";
import { vehicleMessages } from "../../../../i18n/vehicles";
export default function VehiclesLoading() {
  const params = useParams(); const locale = typeof params.locale === "string" && isLocale(params.locale) ? params.locale : "fr";
  return <p role="status">{vehicleMessages(locale).loading}</p>;
}
