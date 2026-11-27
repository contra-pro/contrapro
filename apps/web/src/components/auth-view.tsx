import Link from "next/link";
import type { Locale } from "../i18n/locales";
import { authMessages } from "../i18n/auth";
import { AuthForm,AuthField } from "./auth-form";
import { SignOutForm } from "./sign-out-form";
import {AuthShell} from './auth-shell';
import {approvedLegalRelease,type LegalRelease} from '../registration/model';import {registrationCopy} from '../registration/copy';

export type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";
export function AuthView({ locale, mode, configured, status, googleEnabled = false,magicEnabled=false,legalRelease=approvedLegalRelease }: {
  locale: Locale; mode: AuthMode; configured: boolean; status?: string | undefined; googleEnabled?: boolean;magicEnabled?:boolean;legalRelease?:LegalRelease|null;
}) {
  const copy = authMessages(locale);
  const statuses = ["sent", "error", "signed-out", "invalid-email", "invalid-password", "password-mismatch", "invalid-credentials", "verify-email",
    "confirmation-sent", "recovery-sent", "expired-link", "rate-limited", "same-password", "password-updated", "password-updated-session", "signup-unavailable","invalid-registration","legal-unavailable"] as const;
  const key = statuses.find(value => value === status);
  const title = mode === "sign-in" ? copy.title : mode === "sign-up" ? copy.signupTitle : mode === "forgot-password" ? copy.forgotTitle : copy.resetTitle;
  const action = mode === "sign-in" ? "password" : mode;
  const newPassword = mode === "sign-up" || mode === "reset-password";
  const c=registrationCopy(locale),enabled=configured&&(mode!=='sign-up'||legalRelease!==null),confirmation=mode==='sign-up'&&key==='confirmation-sent';
  return <AuthShell locale={locale} path={mode} title={title} subtitle={mode==='sign-in'?copy.welcomeSubtitle:mode==='sign-up'?copy.signupSubtitle:copy.recoveryNote}>
      {!configured && <p className="auth-environment" role="status">{copy.unavailable}</p>}
      {key && <p className="auth-feedback" role="status" aria-live="polite">{mode === "sign-up" && key === "error" ? copy.signupError : copy[key]}</p>}
      {mode==='sign-up'&&!legalRelease&&<p className="auth-environment" role="status">{c.legalUnavailable}</p>}
      {!confirmation&&<AuthForm locale={locale} mode={mode} action={`/${locale}/auth/${action}`} configured={enabled} legalRelease={legalRelease}
        label={mode === "sign-in" ? copy.login : mode === "sign-up" ? copy.signUp : mode === "forgot-password" ? copy.recover : copy.reset}>
        {mode==='sign-up'&&<><AuthField name="firstName" label={c.firstName} autoComplete="given-name" required maxLength={100} disabled={!enabled}/><AuthField name="lastName" label={c.lastName} autoComplete="family-name" required maxLength={100} disabled={!enabled}/><AuthField name="callingCode" label={c.callingCode} type="tel" dir="ltr" defaultValue="+212" required maxLength={4} autoComplete="tel-country-code" disabled={!enabled}/><AuthField name="phone" label={c.phone} type="tel" dir="ltr" autoComplete="tel-national" required maxLength={40} disabled={!enabled}/></>}
        {mode !== "reset-password" && <AuthField name="email" label={mode==='sign-up'?c.professionalEmail:copy.email} type="email" autoComplete="email" dir="ltr" required maxLength={320} disabled={!enabled}/>}
        {mode !== "forgot-password" && <AuthField name="password" label={copy.password} lang={locale} type="password" autoComplete={newPassword?"new-password":"current-password"} required {...(newPassword?{minLength:12,hint:copy.passwordHint}:{})} maxLength={128} disabled={!enabled}/>}
        {newPassword && <AuthField name="confirmPassword" label={copy.confirmPassword} lang={locale} type="password" autoComplete="new-password" required minLength={12} maxLength={128} disabled={!enabled}/>}
        {mode==='sign-up'&&<><AuthField name="acceptLegal" label={c.acceptLegal} type="checkbox" required disabled={!enabled}/>{legalRelease&&<p><Link href={legalRelease.terms.path} prefetch={false}>{c.terms}</Link> · <Link href={legalRelease.privacy.path} prefetch={false}>{c.privacy}</Link></p>}</>}
      </AuthForm>}
      {(mode==='sign-up'||mode==='sign-in')&&<p className="auth-context-note">{mode==='sign-up'?copy.signupNote:copy.note}</p>}
      {mode === "sign-in" ? <>
        <p className="auth-recovery-link"><Link href={`/${locale}/forgot-password`} prefetch={false}>{copy.forgot}</Link></p>
        <p className="auth-switch"><span>{copy.noAccount}</span><Link className="auth-secondary" href={`/${locale}/sign-up`} prefetch={false}>{copy.signUp}</Link></p>
        {(magicEnabled||googleEnabled)&&<details className="auth-alternatives"><summary>{copy.optional}</summary>
          {magicEnabled&&<form className="auth-forms" action={`/${locale}/auth/start`} method="post">
            <input type="hidden" name="method" value="magic" />
            <label htmlFor="magic-email">{copy.email}</label><input id="magic-email" name="email" type="email" autoComplete="email" dir="ltr" required maxLength={320} disabled={!configured} />
            <button type="submit" disabled={!configured}>{copy.magic}</button>
          </form>}
          {googleEnabled && <form action={`/${locale}/auth/start`} method="post"><input type="hidden" name="method" value="google" />
            <button type="submit" disabled={!configured}>{copy.google}</button></form>}
        </details>}
      </> : <p className="auth-switch"><span>{copy.haveAccount}</span><Link className="auth-secondary" href={`/${locale}/sign-in`} prefetch={false}>{copy.login}</Link></p>}
      {mode === "reset-password" && <p><Link href={`/${locale}/forgot-password`} prefetch={false}>{copy.recover}</Link></p>}
      <p><Link href={`/${locale}/app`} prefetch={false}>{copy.back}</Link></p>
      {status === "password-updated-session" && <SignOutForm locale={locale} />}
  </AuthShell>;
}
