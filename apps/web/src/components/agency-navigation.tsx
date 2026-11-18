import Link from "next/link";
import type { Locale } from "../i18n/locales";
import { agencyManagementMessages } from "../i18n/agency-management";
import { vehicleMessages } from "../i18n/vehicles";
export function AgencyNavigation({ locale }: { locale: Locale }) {
  const copy = agencyManagementMessages(locale);
  return <nav className="agency-navigation" aria-label={copy.dashboard}>
    {([["", "dashboard"], ["/clients", "clients"], ["/onboarding", "create"], ["/profile", "profile"], ["/settings", "settings"], ["/select", "select"]] as const)
      .map(([path, label]) => <Link key={label} href={`/${locale}/app${path}`} prefetch={false}>{copy[label]}</Link>)}
    <Link href={`/${locale}/app/vehicles`} prefetch={false}>{vehicleMessages(locale).title}</Link>
  </nav>;
}
