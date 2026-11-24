import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { CookieMethodsServer, CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appOrigin } from "./config";
import { serverAuthClient } from "./server";
import { verifiedSubject } from "./identity";
import { isLocale, type Locale } from "../i18n/locales";
import { selectionCookie } from "../agency/selection";
import { authDiagnostic, developmentAuthDiagnostic, type AuthDiagnostic, type AuthStage } from "./diagnostics";

export type PasswordOperation = "sign-up" | "password" | "forgot-password" | "reset-password" | "password-callback";
type Dependencies = { origin: () => string; client: (cookies: CookieMethodsServer) => SupabaseClient;
  nonce: () => string; now: () => number; secret: () => string; diagnostic?: (event: AuthDiagnostic) => void };
const production: Dependencies = { origin: () => appOrigin(process.env.CONTRATPRO_APP_ORIGIN), client: serverAuthClient,
  nonce: () => randomBytes(32).toString("hex"), now: Date.now, secret: () => recoverySecret(), diagnostic: developmentAuthDiagnostic };
export const recoveryCookie = "contratpro-password-recovery";
export function recoverySecret(): string {
  const value = process.env.CONTRATPRO_AUTH_FLOW_SECRET;
  if (!value || value.length < 32 || value.length > 512) throw new Error("RECOVERY_UNAVAILABLE");
  return value;
}
const flowCookie = (locale: Locale) => `contratpro-password-flow-${locale}`;
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const sign = (value: string, secret: string) => createHmac("sha256", secret).update(`contratpro.password-recovery.v1:${value}`).digest("hex");
function ticket(subject: string, session: string, now: number, secret: string) {
  const value = Buffer.from(JSON.stringify([subject, session, now + 600000])).toString("base64url");
  return `${value}.${sign(value, secret)}`;
}
export function validRecoveryTicket(value: string | undefined, subject: string, session: string, now: number, secret: string): boolean {
  try {
    if (!value || value.length > 1024 || secret.length < 32) return false;
    const parts = value.split(".");
    if (parts.length !== 2 || !/^[a-f0-9]{64}$/.test(parts[1]!) || !same(sign(parts[0]!, secret), parts[1]!)) return false;
    const data: unknown = JSON.parse(Buffer.from(parts[0]!, "base64url").toString("utf8"));
    return Array.isArray(data) && data.length === 3 && data[0] === subject && data[1] === session &&
      Number.isSafeInteger(data[2]) && data[2] > now && data[2] <= now + 600000;
  } catch { return false; }
}
async function sessionIdentity(client: SupabaseClient, now: number) {
  const identity = await verifiedSubject(client, now);
  if (!identity) return null;
  const claims = await client.auth.getClaims();
  const session: unknown = claims.data?.claims?.session_id;
  return !claims.error && typeof session === "string" && session.length > 0 && session.length < 256 ? { ...identity, session } : null;
}
async function readForm(request: NextRequest) {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded") throw new Error();
  const reader = request.body?.getReader(); if (!reader) throw new Error();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { const part = await reader.read(); if (part.done) break;
      size += part.value.length; if (size > 8192) { await reader.cancel(); throw new Error(); } chunks.push(part.value); }
  } finally { reader.releaseLock(); }
  const values = new URLSearchParams(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
  if ([...values.keys()].some(key => !["email", "password", "confirmPassword"].includes(key) || values.getAll(key).length !== 1)) throw new Error();
  return values;
}
function providerCode(error: unknown): string {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "";
}

/** No admin credentials, membership writes, logging, arbitrary redirects or automatic retries. */
export async function handlePasswordAuth(request: NextRequest, locale: string, operation: PasswordOperation,
  deps: Dependencies = production): Promise<NextResponse> {
  const headers = { "Cache-Control": "private, no-store, max-age=0, must-revalidate", "Referrer-Policy": "no-referrer", Pragma: "no-cache" };
  if (!isLocale(locale)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
  let response: NextResponse | undefined;
  let stage: AuthStage = "configuration";
  const diagnose = (error: unknown) => { try { deps.diagnostic?.(authDiagnostic(operation, stage, error)); } catch { /* Diagnostics never change auth outcomes. */ } };
  const incoming = new Map(request.cookies.getAll().map(cookie => [cookie.name, cookie.value]));
  const written = new Map<string, CookieOptions>();
  const restore = () => {
    for (const [name, options] of written) {
      const restored = { ...options }; delete restored.maxAge; delete restored.expires;
      response!.cookies.set(name, incoming.get(name) ?? "", incoming.has(name) ? restored : { ...restored, maxAge: 0 });
    }
  };
  try {
    const origin = appOrigin(deps.origin());
    stage = "request-validation";
    if (request.nextUrl.origin !== origin || (operation !== "password-callback" &&
      (request.method !== "POST" || request.headers.get("origin") !== origin || request.nextUrl.search))) {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 403, headers });
    }
    const page = operation === "sign-up" ? "sign-up" : operation === "forgot-password" ? "forgot-password" : operation === "reset-password" ? "reset-password" : "sign-in";
    response = NextResponse.redirect(new URL(`/${locale}/${page}?status=error`, origin), 303);
    for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
    const finish = (path: string) => { response!.headers.set("Location", new URL(path, origin).href); return response!; };
    const fail = (status: string) => { restore(); return finish(`/${locale}/${page}?status=${status}`); };
    const options = { path: "/", sameSite: "lax" as const, httpOnly: true, secure: origin.startsWith("https:") };
    const callbackPath = `/${locale}/auth/password-callback`;
    const client = () => {
      const previous = stage; stage = "client";
      const sdk = deps.client({ getAll: () => request.cookies.getAll(), setAll: (cookies, cacheHeaders) => {
      const previousWrite = stage; stage = "cookie-write";
      for (const cookie of cookies) {
        request.cookies.set(cookie.name, cookie.value); response!.cookies.set(cookie.name, cookie.value, cookie.options);
        written.set(cookie.name, cookie.options);
      }
      for (const [key, value] of Object.entries(cacheHeaders)) response!.headers.set(key, value);
      // Provider cache headers must never weaken the sensitive response policy.
      for (const [key, value] of Object.entries(headers)) response!.headers.set(key, value);
      stage = previousWrite;
    } });
      stage = previous; return sdk;
    };
    if (operation === "password-callback") {
      stage = "callback";
      const query = request.nextUrl.searchParams, code = query.get("code"), flow = query.get("flow");
      const saved = request.cookies.get(flowCookie(locale))?.value ?? "";
      response.cookies.set(flowCookie(locale), "", { ...options, path: callbackPath, maxAge: 0 });
      const [purpose, savedFlow, recoverySignature] = saved.split(".");
      if (request.method !== "GET" || !["signup", "recovery"].includes(purpose ?? "") ||
        [...query.keys()].some(key => !["code", "flow"].includes(key)) || query.getAll("code").length !== 1 || query.getAll("flow").length !== 1 ||
        !flow || !/^[a-f0-9]{64}$/.test(flow) || !savedFlow || !/^[a-f0-9]{64}$/.test(savedFlow) || !same(flow, savedFlow) || !code || code.length > 2048) return fail("expired-link");
      // Bind recovery purpose to a server signature; a normal login/signup callback
      // cannot be relabelled as recovery by changing browser cookies.
      if (purpose === "recovery" && (!recoverySignature || !/^[a-f0-9]{64}$/.test(recoverySignature) ||
        !same(sign(`flow:recovery.${savedFlow}`, deps.secret()), recoverySignature))) return fail("expired-link");
      const sdk = client(), result = await sdk.auth.exchangeCodeForSession(code);
      if (result.error) { diagnose(result.error); return fail("expired-link"); }
      stage = "session-verification";
      const identity = await verifiedSubject(sdk, deps.now());
      if (!identity) return fail("expired-link");
      response.cookies.set(selectionCookie, "", { ...options, maxAge: 0 });
      if (purpose === "recovery") {
        const current = await sessionIdentity(sdk, deps.now());
        if (!current) return fail("expired-link");
        response.cookies.set(recoveryCookie, ticket(current.subject, current.session, deps.now(), deps.secret()), { ...options, maxAge: 600 });
        return finish(`/${locale}/reset-password`);
      }
      return finish(`/${locale}/auth/continue`);
    }
    stage = "form";
    const values = await readForm(request), email = values.get("email")?.trim() ?? "", password = values.get("password") ?? "";
    if (operation !== "reset-password" && (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return fail("invalid-email");
    if (operation !== "forgot-password" && (password.length < (operation === "password" ? 1 : 12) || password.length > 128)) return fail("invalid-password");
    if ((operation === "sign-up" || operation === "reset-password") && values.get("confirmPassword") !== password) return fail("password-mismatch");
    if (operation === "reset-password") {
      stage = "password-update";
      const secret = deps.secret(), sdk = client(), identity = await sessionIdentity(sdk, deps.now());
      if (!identity || !validRecoveryTicket(request.cookies.get(recoveryCookie)?.value, identity.subject, identity.session, deps.now(), secret)) return fail("expired-link");
      const result = await sdk.auth.updateUser({ password });
      if (result.error) return fail(providerCode(result.error) === "same_password" ? "same-password" : "error");
      response.cookies.set(recoveryCookie, "", { ...options, maxAge: 0 });
      response.cookies.set(selectionCookie, "", { ...options, maxAge: 0 });
      const signedOut = await sdk.auth.signOut({ scope: "local" });
      return finish(`/${locale}/sign-in?status=${signedOut.error ? "password-updated-session" : "password-updated"}`);
    }
    if (operation === "password") {
      stage = "password-request";
      const sdk = client(), result = await sdk.auth.signInWithPassword({ email, password });
      if (result.error) return fail(providerCode(result.error) === "email_not_confirmed" ? "verify-email" : providerCode(result.error) === "over_request_rate_limit" ? "rate-limited" : "invalid-credentials");
      if (!await verifiedSubject(sdk, deps.now())) return fail("invalid-credentials");
      response.cookies.set(selectionCookie, "", { ...options, maxAge: 0 });
      response.cookies.set(recoveryCookie, "", { ...options, maxAge: 0 });
      return finish(`/${locale}/auth/continue`);
    }
    if (operation === "forgot-password") deps.secret(); // Refuse to send links this deployment cannot redeem.
    const flow = deps.nonce(); if (!/^[a-f0-9]{64}$/.test(flow)) throw new Error();
    const redirectTo = `${origin}${callbackPath}?flow=${flow}`, sdk = client();
    if (operation === "sign-up") {
      stage = "signup-request";
      const result = await sdk.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
      stage = "signup-response";
      if (result.error) diagnose(result.error);
      if (result.error && !["user_already_exists", "email_exists"].includes(providerCode(result.error))) {
        const code = providerCode(result.error);
        return fail(code === "weak_password" ? "invalid-password" : code.includes("rate_limit") ? "rate-limited" : "signup-unavailable");
      }
      if (result.data?.session) {
        stage = "session-verification";
        if (!await verifiedSubject(sdk, deps.now())) { diagnose(new Error()); return fail("signup-unavailable"); }
        response.cookies.set(selectionCookie, "", { ...options, maxAge: 0 });
        return finish(`/${locale}/auth/continue`);
      }
    } else {
      stage = "recovery-request";
      // Account existence and provider diagnostics are deliberately not disclosed.
      await sdk.auth.resetPasswordForEmail(email, { redirectTo });
    }
    const state = operation === "sign-up" ? `signup.${flow}` : `recovery.${flow}.${sign(`flow:recovery.${flow}`, deps.secret())}`;
    response.cookies.set(flowCookie(locale), state, { ...options, path: callbackPath, maxAge: 3600 });
    return finish(`/${locale}/${page}?status=${operation === "sign-up" ? "confirmation-sent" : "recovery-sent"}`);
  } catch (error) {
    diagnose(error);
    if (response) {
      restore();
      if (operation === "sign-up") response.headers.set("Location", new URL(`/${locale}/sign-up?status=signup-unavailable`, request.nextUrl.origin).href);
      return response;
    }
    return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503, headers });
  }
}
