import Link from "next/link";
import type { Locale } from "../i18n/locales";
import { authMessages } from "../i18n/auth";

export function SignInView({ locale, configured, status }: {
  locale: Locale; configured: boolean; status: string | undefined;
}) {
  const copy = authMessages(locale);
  const message = status === "sent" || status === "error" || status === "signed-out" ? copy[status] : null;
  return <main id="main" tabIndex={-1}>
    <h1>{copy.title}</h1>
    <p>{copy.note}</p>
    {!configured && <p role="status">{copy.unavailable}</p>}
    {message && <p role="status" aria-live="polite">{message}</p>}
    <div className="auth-forms">
      <form action={`/${locale}/auth/start`} method="post" className="status-panel">
        <div>
          <input type="hidden" name="method" value="magic" />
          <label htmlFor="auth-email">{copy.email}</label>
          <input id="auth-email" name="email" type="email" autoComplete="email" dir="ltr" required maxLength={320} disabled={!configured} />
          <button type="submit" disabled={!configured}>{copy.magic}</button>
        </div>
      </form>
      <form action={`/${locale}/auth/start`} method="post">
        <input type="hidden" name="method" value="google" />
        <button type="submit" disabled={!configured}>{copy.google}</button>
      </form>
    </div>
    <p><Link href={`/${locale}/app`} prefetch={false}>{copy.back}</Link></p>
  </main>;
}
