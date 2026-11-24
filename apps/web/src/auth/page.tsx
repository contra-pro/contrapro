import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { isLocale } from "../i18n/locales";
import { AuthView, type AuthMode } from "../components/auth-view";
import { appOrigin, publicAuthConfig } from "./config";
import { componentAuthClient } from "./server";
import { verifiedSubject } from "./identity";
import { recoveryCookie, recoverySecret, validRecoveryTicket } from "./password";

export type AuthPageProps = { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string | string[] }> };
export async function passwordPage({ params, searchParams }: AuthPageProps, mode: Exclude<AuthMode, "sign-in">) {
  const { locale } = await params; if (!isLocale(locale)) notFound();
  const query = await searchParams; let configured = false;
  let status = typeof query.status === "string" ? query.status : undefined;
  try {
    publicAuthConfig(); appOrigin(process.env.CONTRATPRO_APP_ORIGIN);
    if (mode !== "sign-up") recoverySecret();
    configured = true;
    if (mode === "reset-password") {
      const client = await componentAuthClient(), identity = await verifiedSubject(client);
      const claims = identity ? await client.auth.getClaims() : null;
      const session: unknown = claims?.data?.claims?.session_id;
      configured = !!identity && !claims?.error && typeof session === "string" && validRecoveryTicket(
        (await cookies()).get(recoveryCookie)?.value, identity.subject, session, Date.now(), recoverySecret());
      if (!configured) status = "expired-link";
    }
  } catch { configured = false; }
  return <AuthView locale={locale} mode={mode} configured={configured} status={status} />;
}
