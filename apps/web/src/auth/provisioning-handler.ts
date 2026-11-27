import "server-only";
import { NextRequest, NextResponse } from "next/server";
import type { CookieMethodsServer, CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appOrigin } from "./config";
import { serverAuthClient } from "./server";
import { supabaseAgencyContext, verifiedSubject } from "./identity";
import { provisionCanonicalIdentity } from "./canonical-provisioning";
import { isLocale } from "../i18n/locales";
import {provisionRegistrationProfile} from '../registration/provision-profile';

type Dependencies = {
  origin: () => string;
  client: (cookies: CookieMethodsServer) => SupabaseClient;
  enabled: () => boolean;
  accessVerified: () => boolean;
  now: () => number;
};
const production: Dependencies = {
  origin: () => appOrigin(process.env.CONTRATPRO_APP_ORIGIN), client: serverAuthClient,
  enabled: () => process.env.CONTRATPRO_CANONICAL_PROVISIONING_VERIFIED === "true",
  accessVerified: () => process.env.CONTRATPRO_AUTH_ACCESS_VERIFIED === "true", now: Date.now,
};

/** Explicit post-authentication action. No callback/render-time writes, supplied IDs,
 * admin client, membership creation, repair or automatic retry. Both runtime gates
 * remain independent. A successful RPC acknowledgement alone is never confirmation.
 */
export async function handleProvisioning(request: NextRequest, locale: string, deps: Dependencies = production) {
  const pending = new Map<string, { value: string; options: CookieOptions }>();
  const headers = new Map<string, string>();
  const reply = (body: object, status: number) => {
    const response = NextResponse.json(body, { status });
    for (const [key, value] of headers) response.headers.set(key, value);
    response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    response.headers.set("Referrer-Policy", "no-referrer");
    for (const [name, cookie] of pending) response.cookies.set(name, cookie.value, cookie.options);
    return response;
  };
  const fail = (code: string, status: number) => reply({ ok: false, code }, status);
  let mutationAttempted = false;
  try {
    if (!isLocale(locale)) return fail("not-found", 404);
    const origin = appOrigin(deps.origin());
    if (request.method !== "POST" || request.nextUrl.origin !== origin || request.headers.get("origin") !== origin || request.nextUrl.search) return fail("forbidden", 403);
    // Parameter-free operation: require an empty body, including streamed requests.
    const reader = request.body?.getReader();
    if (reader) {
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          if (part.value.length) { await reader.cancel(); return fail("invalid", 400); }
        }
      } finally { reader.releaseLock(); }
    }
    if (!deps.enabled()) return fail("blocked", 503);
    if (!deps.accessVerified()) return fail("unavailable", 503);
    const client = deps.client({ getAll: () => request.cookies.getAll(), setAll: (cookies, cacheHeaders) => {
      for (const cookie of cookies) { request.cookies.set(cookie.name, cookie.value); pending.set(cookie.name, cookie); }
      for (const [key, value] of Object.entries(cacheHeaders)) headers.set(key, value);
    } });
    const identity = await verifiedSubject(client, deps.now());
    if (!identity) return fail("signed-out", 401);
    const before = await supabaseAgencyContext(client, true, deps.now);
    if (before.access.status === "signed-out") return fail("signed-out", 401);
    if (before.canonical){if(before.canonical.subject!==identity.subject)return fail('forbidden',403);mutationAttempted=true;return await provisionRegistrationProfile(client,identity.subject,deps.now())?reply({ok:true,destination:`/${locale}/app`},200):fail('uncertain',503);}
    if (before.access.status !== "unmapped") return fail(before.access.status === "unavailable" ? "unavailable" : "forbidden", before.access.status === "unavailable" ? 503 : 403);
    mutationAttempted = true;
    const result = await provisionCanonicalIdentity(client, true, deps.now);
    // Adapter guarantees blocked means no provisioning RPC was attempted.
    if (result === "blocked") return fail("signed-out", 401);
    if (result !== "created" && result !== "existing") return fail("uncertain", 503);
    const after = await supabaseAgencyContext(client, true, deps.now);
    if (!after.canonical || after.canonical.subject !== identity.subject || identity.expiresAt <= deps.now()) return fail("uncertain", 503);
    return reply({ ok: true, destination: `/${locale}/app` }, 200);
  } catch { return fail(mutationAttempted ? "uncertain" : "unavailable", 503); }
}
