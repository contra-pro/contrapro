import Link from "next/link";
import type { AgencyAccess } from "../../../../packages/application/src/agency-access";
import type { Locale } from "../i18n/locales";
import { agencyAccessMessages } from "../i18n/agency-access";
import { AreaShell } from "./area-shell";
import { authMessages } from "../i18n/auth";
import { SessionSync } from "../auth/session-sync";
import { AgencyNavigation } from "./agency-navigation";
import { agencyManagementMessages } from "../i18n/agency-management";

export function AgencyAccessView({ locale, access, children }: { locale: Locale; access: AgencyAccess; children?: React.ReactNode }) {
  const copy = agencyAccessMessages(locale);
  const state = copy.states[access.status];
  return <AreaShell locale={locale} area="agency" notice={copy.notice}>
    <SessionSync />
    {access.status === "authorized" && <AgencyNavigation locale={locale} />}
    <section className="intro" aria-labelledby="page-title">
      <h1 id="page-title">{state.title}</h1>
      <p className="description">{state.description}</p>
    </section>
    {access.status === "authorized" && children}
    {access.status === "authorized" ?
      <section className="status-panel" aria-labelledby="agency-name">
        <div><p>{copy.agency}</p><h2 id="agency-name">{access.agencyName}</h2></div>
      </section> :
      <p><Link href={`/${locale}/app`} prefetch={false}>{copy.retry}</Link></p>}
    {access.status === "onboarding" && <p><Link href={`/${locale}/app/onboarding`} prefetch={false}>{agencyManagementMessages(locale).create}</Link></p>}
    {access.status === "selection-required" && <p><Link href={`/${locale}/app/select`} prefetch={false}>{agencyManagementMessages(locale).select}</Link></p>}
    {access.status === "signed-out" || access.status === "unavailable" ?
      <p><Link href={`/${locale}/sign-in`} prefetch={false}>{authMessages(locale).title}</Link></p> :
      <form action={`/${locale}/auth/sign-out`} method="post">
        <button type="submit">{authMessages(locale).signOut}</button>
      </form>}
  </AreaShell>;
}
