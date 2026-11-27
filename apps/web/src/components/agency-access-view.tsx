import Link from "next/link";
import type { AgencyAccess } from "../../../../packages/application/src/agency-access";
import type { Locale } from "../i18n/locales";
import { agencyAccessMessages } from "../i18n/agency-access";
import { AreaShell } from "./area-shell";
import { authMessages } from "../i18n/auth";
import { SessionSync } from "../auth/session-sync";
import { AgencyNavigation } from "./agency-navigation";
import { agencyManagementMessages } from "../i18n/agency-management";
import { AccountSetup } from "./account-setup";
import { SignOutForm } from "./sign-out-form";
import {AuthShell} from './auth-shell';

export function AgencyAccessView({ locale, access, children, presentation }: { locale: Locale; access: AgencyAccess; children?: React.ReactNode;presentation?:'auth' }) {
  const copy = agencyAccessMessages(locale);
  const state = copy.states[access.status];
  if(presentation==='auth')return <AuthShell locale={locale} path="auth/continue" title={authMessages(locale).continuationTitle} subtitle={authMessages(locale).continuationSubtitle}>
    <SessionSync/>
    <div className="auth-environment" role="status"><strong>{state.title}</strong><p>{state.description}</p></div>
    {access.status==='authorized'&&children}
    {access.status==='unmapped'&&<AccountSetup locale={locale} enabled={process.env.CONTRATPRO_CANONICAL_PROVISIONING_VERIFIED==='true'&&process.env.CONTRATPRO_AUTH_ACCESS_VERIFIED==='true'}/>}
    <p><Link href={`/${locale}/app`} prefetch={false}>{copy.retry}</Link></p>
    {access.status==='onboarding'&&<p><Link href={`/${locale}/app/onboarding`} prefetch={false}>{agencyManagementMessages(locale).create}</Link></p>}
    {access.status==='selection-required'&&<p><Link href={`/${locale}/app/select`} prefetch={false}>{agencyManagementMessages(locale).select}</Link></p>}
    {access.status==='signed-out'||access.status==='unavailable'?<p><Link href={`/${locale}/sign-in`} prefetch={false}>{authMessages(locale).login}</Link></p>:access.status!=='authorized'&&<SignOutForm locale={locale}/>}
  </AuthShell>;
  return <AreaShell locale={locale} area="agency" {...(access.status==="authorized"?{agencyName:access.agencyName,agencyScope:access.agencyId+":"+access.userId,navigation:<AgencyNavigation locale={locale}/>,account:<SignOutForm locale={locale}/>}:{notice:copy.notice})}>
    <SessionSync />
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
    {access.status === "unmapped" && <AccountSetup locale={locale} enabled={process.env.CONTRATPRO_CANONICAL_PROVISIONING_VERIFIED === "true" && process.env.CONTRATPRO_AUTH_ACCESS_VERIFIED === "true"} />}
    {access.status === "selection-required" && <p><Link href={`/${locale}/app/select`} prefetch={false}>{agencyManagementMessages(locale).select}</Link></p>}
    {access.status === "signed-out" || access.status === "unavailable" ?
      <p><Link href={`/${locale}/sign-in`} prefetch={false}>{authMessages(locale).title}</Link></p> :
      access.status!=="authorized"&&<SignOutForm locale={locale} />}
  </AreaShell>;
}
