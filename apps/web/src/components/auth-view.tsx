import Link from "next/link";
import type { Locale } from "../i18n/locales";
import { authMessages } from "../i18n/auth";
import { AuthForm } from "./auth-form";
import { SignOutForm } from "./sign-out-form";

export type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";
export function AuthView({ locale, mode, configured, status, googleEnabled = false }: {
  locale: Locale; mode: AuthMode; configured: boolean; status?: string | undefined; googleEnabled?: boolean;
}) {
  const copy = authMessages(locale);
  const statuses = ["sent", "error", "signed-out", "invalid-email", "invalid-password", "password-mismatch", "invalid-credentials", "verify-email",
    "confirmation-sent", "recovery-sent", "expired-link", "rate-limited", "same-password", "password-updated", "password-updated-session", "signup-unavailable"] as const;
  const key = statuses.find(value => value === status);
  const title = mode === "sign-in" ? copy.title : mode === "sign-up" ? copy.signUp : mode === "forgot-password" ? copy.forgotTitle : copy.resetTitle;
  const action = mode === "sign-in" ? "password" : mode;
  const newPassword = mode === "sign-up" || mode === "reset-password";
  return <div className="auth-shell">
    <a className="skip-link" href="#main">{locale === "fr" ? "Aller au contenu" : "الانتقال إلى المحتوى"}</a>
    <header className="auth-header"><Link className="brand" href={`/${locale}/app`} prefetch={false}>ContratPro</Link>
      <nav aria-label={copy.language}>{(["fr", "ar"] as const).map(language => <Link key={language} href={`/${language}/${mode}`} prefetch={false}
        lang={language} aria-current={language === locale ? "page" : undefined}>{language === "fr" ? "Français" : "العربية"}</Link>)}</nav>
    </header>
    <main id="main" tabIndex={-1} className="auth-card">
      <h1>{title}</h1><p>{mode === "sign-up" ? copy.signupNote : mode === "sign-in" ? copy.note : copy.recoveryNote}</p>
      {!configured && <p role="status">{copy.unavailable}</p>}
      {key && <p className="auth-feedback" role="status" aria-live="polite">{mode === "sign-up" && key === "error" ? copy.signupError : copy[key]}</p>}
      <AuthForm locale={locale} mode={mode} action={`/${locale}/auth/${action}`} configured={configured}
        label={mode === "sign-in" ? copy.login : mode === "sign-up" ? copy.signUp : mode === "forgot-password" ? copy.recover : copy.reset}>
        {mode !== "reset-password" && <div><label htmlFor="auth-email">{copy.email}</label>
          <input id="auth-email" name="email" type="email" autoComplete="email" dir="ltr" required maxLength={320} disabled={!configured} /></div>}
        {mode !== "forgot-password" && <div><label htmlFor="auth-password">{copy.password}</label>
          <input id="auth-password" name="password" type="password" autoComplete={newPassword ? "new-password" : "current-password"}
            required minLength={newPassword ? 12 : undefined} maxLength={128} disabled={!configured} aria-describedby={newPassword ? "password-hint" : undefined} />
          {newPassword && <p id="password-hint" className="field-hint">{copy.passwordHint}</p>}</div>}
        {newPassword && <div><label htmlFor="auth-confirm">{copy.confirmPassword}</label>
          <input id="auth-confirm" name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} disabled={!configured} /></div>}
      </AuthForm>
      {mode === "sign-in" ? <>
        <p><Link href={`/${locale}/forgot-password`} prefetch={false}>{copy.forgot}</Link></p>
        <p><Link href={`/${locale}/sign-up`} prefetch={false}>{copy.signUp}</Link></p>
        <details className="auth-alternatives"><summary>{copy.optional}</summary>
          <form className="auth-forms" action={`/${locale}/auth/start`} method="post">
            <input type="hidden" name="method" value="magic" />
            <label htmlFor="magic-email">{copy.email}</label><input id="magic-email" name="email" type="email" autoComplete="email" dir="ltr" required maxLength={320} disabled={!configured} />
            <button type="submit" disabled={!configured}>{copy.magic}</button>
          </form>
          {googleEnabled && <form action={`/${locale}/auth/start`} method="post"><input type="hidden" name="method" value="google" />
            <button type="submit" disabled={!configured}>{copy.google}</button></form>}
        </details>
      </> : <p><Link href={`/${locale}/sign-in`} prefetch={false}>{copy.login}</Link></p>}
      {mode === "reset-password" && <p><Link href={`/${locale}/forgot-password`} prefetch={false}>{copy.recover}</Link></p>}
      <p><Link href={`/${locale}/app`} prefetch={false}>{copy.back}</Link></p>
      {status === "password-updated-session" && <SignOutForm locale={locale} />}
    </main>
  </div>;
}
