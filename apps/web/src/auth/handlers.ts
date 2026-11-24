import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { CookieMethodsServer, CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocale, type Locale } from "../i18n/locales";
import { appOrigin, AUTH_PROJECT_URL, googleAuthEnabled } from "./config";
import { recoveryCookie } from "./password";
import { serverAuthClient } from "./server";
import { verifiedSubject } from "./identity";
import { selectionCookie } from "../agency/selection";

type Operation = "start" | "callback" | "sign-out";
type Dependencies = {
  origin: () => string;
  client: (cookies: CookieMethodsServer) => SupabaseClient;
  nonce: () => string;
  now: () => number;
  googleEnabled?: () => boolean;
};
const production: Dependencies = { origin: () => appOrigin(process.env.CONTRATPRO_APP_ORIGIN),
  client: serverAuthClient, nonce: () => randomBytes(32).toString("hex"), now: Date.now, googleEnabled: googleAuthEnabled };
const flowCookie = (locale: Locale) => `contratpro-auth-flow-${locale}`;
const noStore = (response: NextResponse) => {
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
};
async function form(request: NextRequest) {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded") throw new Error("INVALID_FORM");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_FORM");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > 4096) { await reader.cancel(); throw new Error("INVALID_FORM"); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const values = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
  if ([...values.keys()].some(key => !["method", "email"].includes(key) || values.getAll(key).length !== 1)) throw new Error("INVALID_FORM");
  return values;
}

/** Fixed destinations, PKCE plus one-use same-browser correlation, no arbitrary next URL.
 * The injected transport exists solely for isolated offline tests; routes use production.
 */
export async function handleAuth(request: NextRequest, locale: string, operation: Operation,
  dependencies: Dependencies = production): Promise<NextResponse> {
  if (!isLocale(locale)) return noStore(NextResponse.json({ error: "NOT_FOUND" }, { status: 404 }));
  let response: NextResponse | undefined;
  const writtenCookies = new Map<string, CookieOptions>();
  const rejectCallback = () => {
    for (const [name, options] of writtenCookies) response!.cookies.set(name, "", { ...options, maxAge: 0 });
    return noStore(response!);
  };
  try {
    const origin = appOrigin(dependencies.origin());
    if (request.nextUrl.origin !== origin) throw new Error("INVALID_ORIGIN");
    const callbackPath = `/${locale}/auth/callback`;
    const cookieOptions = { path: callbackPath, sameSite: "lax" as const, httpOnly: true,
      secure: origin.startsWith("https:"), maxAge: 600 };
    response = noStore(NextResponse.redirect(new URL(`/${locale}/sign-in?status=error`, origin), 303));
    const finish = (path: string, status = 303) => {
      response!.headers.set("Location", new URL(path, origin).href);
      // NextResponse status is immutable; all internal redirects use the original 303.
      if (status !== 303) throw new Error("INVALID_REDIRECT");
      return response!;
    };
    if (operation === "callback") {
      response.cookies.set(flowCookie(locale), "", { ...cookieOptions, maxAge: 0 });
      const query = request.nextUrl.searchParams;
      const flow = query.get("flow");
      const saved = request.cookies.get(flowCookie(locale))?.value;
      const code = query.get("code");
      if (request.method !== "GET" || [...query.keys()].some(key => !["code", "flow"].includes(key)) ||
        query.getAll("code").length !== 1 || query.getAll("flow").length !== 1 ||
        !flow || !saved || !/^[a-f0-9]{64}$/.test(flow) || !/^[a-f0-9]{64}$/.test(saved) ||
        !timingSafeEqual(Buffer.from(flow), Buffer.from(saved)) || !code || code.length > 2048) return response;
      const client = dependencies.client({ getAll: () => request.cookies.getAll(), setAll: (cookies, headers) => {
        for (const cookie of cookies) {
          request.cookies.set(cookie.name, cookie.value);
          response!.cookies.set(cookie.name, cookie.value, cookie.options);
          writtenCookies.set(cookie.name, cookie.options);
        }
        for (const [key, value] of Object.entries(headers)) response!.headers.set(key, value);
      } });
      const exchanged = await client.auth.exchangeCodeForSession(code);
      if (exchanged.error || !await verifiedSubject(client, dependencies.now())) return rejectCallback();
      return noStore(finish(`/${locale}/app`));
    }
    if (request.method !== "POST" || request.headers.get("origin") !== origin) return noStore(NextResponse.json({ error: "INVALID_REQUEST" }, { status: 403 }));
    const values = await form(request);
    const client = dependencies.client({ getAll: () => request.cookies.getAll(), setAll: (cookies, headers) => {
      for (const cookie of cookies) {
        request.cookies.set(cookie.name, cookie.value);
        response!.cookies.set(cookie.name, cookie.value, cookie.options);
      }
      for (const [key, value] of Object.entries(headers)) response!.headers.set(key, value);
    } });
    if (operation === "sign-out") {
      if (values.size !== 0) return response;
      const result = await client.auth.signOut({ scope: "local" });
      response.cookies.set(selectionCookie, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: origin.startsWith("https:") });
      response.cookies.set(recoveryCookie, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: origin.startsWith("https:") });
      for (const language of ["fr", "ar"] as const) response.cookies.set(flowCookie(language), "", {
        ...cookieOptions, path: `/${language}/auth/callback`, maxAge: 0 });
      for (const language of ["fr", "ar"] as const) response.cookies.set(`contratpro-password-flow-${language}`, "", {
        ...cookieOptions, path: `/${language}/auth/password-callback`, maxAge: 0 });
      if (request.headers.get("accept") === "application/json") {
        const headers = new Headers(response.headers); headers.delete("Location"); headers.delete("Set-Cookie");
        const json = NextResponse.json(result.error ? { ok: false, code: "unavailable" } :
          { ok: true, destination: `/${locale}/sign-in?status=signed-out` }, { status: result.error ? 503 : 200, headers });
        for (const cookie of response.cookies.getAll()) json.cookies.set(cookie);
        return noStore(json);
      }
      return noStore(result.error ? response : finish(`/${locale}/sign-in?status=signed-out`));
    }
    const method = values.get("method");
    if (method !== "magic" && method !== "google") return response;
    const nonce = dependencies.nonce();
    if (!/^[a-f0-9]{64}$/.test(nonce)) throw new Error("INVALID_STATE");
    const redirectTo = `${origin}${callbackPath}?flow=${nonce}`;
    if (method === "magic") {
      const email = values.get("email");
      if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response;
      const result = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: true } });
      if (result.error) return response;
      response.cookies.set(flowCookie(locale), nonce, cookieOptions);
      return noStore(finish(`/${locale}/sign-in?status=sent`));
    }
    if (values.has("email")) return response;
    if (!(dependencies.googleEnabled?.() ?? false)) return response;
    const result = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
    if (result.error || !result.data.url) return response;
    const target = new URL(result.data.url);
    if (target.origin !== AUTH_PROJECT_URL || target.pathname !== "/auth/v1/authorize" || target.username || target.password) return response;
    response.cookies.set(flowCookie(locale), nonce, cookieOptions);
    response.headers.set("Location", target.href);
    return noStore(response);
  } catch {
    // Preserve any cookie cleanup already performed, but never disclose provider/driver errors.
    if (response) return operation === "callback" ? rejectCallback() : noStore(response);
    return noStore(NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 }));
  }
}
