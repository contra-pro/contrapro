import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { CookieMethodsServer } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
import { handleAuth } from "./handlers";
import { AUTH_PROJECT_URL } from "./config";

const origin = "https://contratpro.example";
const flow = "a".repeat(64);
const subject = "10000000-0000-4000-8000-000000000001";
function fixture() {
  const auth = {
    signInWithOtp: vi.fn(async () => ({ error: null as unknown })),
    signInWithOAuth: vi.fn(async () => ({ data: { url: `${AUTH_PROJECT_URL}/auth/v1/authorize?provider=google` }, error: null as unknown })),
    exchangeCodeForSession: vi.fn(async () => ({ error: null as unknown })),
    getUser: vi.fn(async () => ({ data: { user: { id: subject } }, error: null as unknown })),
    getClaims: vi.fn(async () => ({ data: { claims: { sub: subject, exp: 2000, aud: "authenticated", iss: `${AUTH_PROJECT_URL}/auth/v1` } }, error: null as unknown })),
    signOut: vi.fn(async () => ({ error: null as unknown })),
  };
  const client = vi.fn<(cookies: CookieMethodsServer) => SupabaseClient>(() => ({ auth }) as unknown as SupabaseClient);
  return { auth, client, dependencies: { origin: () => origin, client, nonce: () => flow, now: () => 1000 } };
}
function post(body: string, path = "/fr/auth/start", requestOrigin = origin) {
  return new NextRequest(`${origin}${path}`, { method: "POST", headers: { origin: requestOrigin,
    "content-type": "application/x-www-form-urlencoded" }, body });
}
function callback(query = `code=test-code&flow=${flow}`, cookie = flow, locale = "fr") {
  return new NextRequest(`${origin}/${locale}/auth/callback?${query}`, {
    headers: cookie ? { cookie: `contratpro-auth-flow-${locale}=${cookie}` } : {},
  });
}

describe("auth HTTP flows — injected SDK only, never live Auth", () => {
  for (const locale of ["fr", "ar"] as const) {
    it(`${locale}: initiates same-browser Magic Link without linking or granting membership`, async () => {
      const f = fixture();
      const response = await handleAuth(post("method=magic&email=test%40example.com", `/${locale}/auth/start`), locale, "start", f.dependencies);
      expect(response.headers.get("location")).toBe(`${origin}/${locale}/sign-in?status=sent`);
      expect(f.auth.signInWithOtp).toHaveBeenCalledExactlyOnceWith({ email: "test@example.com", options: {
        emailRedirectTo: `${origin}/${locale}/auth/callback?flow=${flow}`, shouldCreateUser: true } });
      const state = response.cookies.get(`contratpro-auth-flow-${locale}`);
      expect(state).toMatchObject({ value: flow, httpOnly: true, secure: true, sameSite: "lax", maxAge: 600 });
      expect(response.headers.get("cache-control")).toContain("no-store");
    });
    it(`${locale}: initiates only Google OAuth with a fixed callback`, async () => {
      const f = fixture();
      const response = await handleAuth(post("method=google", `/${locale}/auth/start`), locale, "start", f.dependencies);
      expect(response.headers.get("location")).toBe(`${AUTH_PROJECT_URL}/auth/v1/authorize?provider=google`);
      expect(f.auth.signInWithOAuth).toHaveBeenCalledExactlyOnceWith({ provider: "google", options: {
        redirectTo: `${origin}/${locale}/auth/callback?flow=${flow}`, skipBrowserRedirect: true } });
    });
    it(`${locale}: exchanges PKCE code, validates identity and consumes correlation state`, async () => {
      const f = fixture();
      const response = await handleAuth(callback(undefined, flow, locale), locale, "callback", f.dependencies);
      expect(f.auth.exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith("test-code");
      expect(f.auth.getUser).toHaveBeenCalledTimes(1);
      expect(f.auth.getClaims).toHaveBeenCalledTimes(1);
      expect(response.headers.get("location")).toBe(`${origin}/${locale}/app`);
      expect(response.cookies.get(`contratpro-auth-flow-${locale}`)?.maxAge).toBe(0);
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    });
    it(`${locale}: sign-out is same-origin POST and explicitly local`, async () => {
      const f = fixture();
      const response = await handleAuth(post("", `/${locale}/auth/sign-out`), locale, "sign-out", f.dependencies);
      expect(f.auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
      expect(response.headers.get("location")).toBe(`${origin}/${locale}/sign-in?status=signed-out`);
      expect(response.cookies.get("contratpro-auth-flow-fr")?.maxAge).toBe(0);
      expect(response.cookies.get("contratpro-auth-flow-ar")?.maxAge).toBe(0);
    });
  }
  it.each(["", "code=test", `code=test&flow=${"b".repeat(64)}`, `code=test&flow=${flow}&next=https://evil.example`,
    `code=test&code=again&flow=${flow}`, `code=test&flow=${flow}&flow=${flow}`, `error=provider-secret&flow=${flow}`])("rejects malformed callback state before creating a client", async query => {
    const f = fixture();
    const response = await handleAuth(callback(query), "fr", "callback", f.dependencies);
    expect(f.client).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(`${origin}/fr/sign-in?status=error`);
    expect(await response.text()).not.toContain("provider-secret");
  });
  it("rejects a callback opened in another browser", async () => {
    const f = fixture(); await handleAuth(callback(undefined, ""), "fr", "callback", f.dependencies);
    expect(f.client).not.toHaveBeenCalled();
  });
  it("fails closed when PKCE exchange is rejected or code has expired/been consumed", async () => {
    const f = fixture(); f.auth.exchangeCodeForSession.mockResolvedValue({ error: new Error("raw token secret") });
    const response = await handleAuth(callback(), "fr", "callback", f.dependencies);
    expect(response.headers.get("location")).toContain("status=error");
    expect(f.auth.getUser).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain("secret");
  });
  it("does not accept exchange success without verified credentials", async () => {
    const f = fixture(); f.auth.getUser.mockResolvedValue({ data: { user: { id: subject } }, error: new Error("invalid session") });
    const response = await handleAuth(callback(), "fr", "callback", f.dependencies);
    expect(response.headers.get("location")).toContain("status=error");
  });
  it.each(["https://evil.example", "null", ""])("rejects cross-origin initiation and logout %s", async requestOrigin => {
    const f = fixture();
    for (const operation of ["start", "sign-out"] as const) {
      const response = await handleAuth(post("method=google", "/fr/auth/start", requestOrigin), "fr", operation, f.dependencies);
      expect(response.status).toBe(403);
    }
    expect(f.client).not.toHaveBeenCalled();
  });
  it.each([undefined, "", "null", "https://evil.example"])("denies native POST with invalid Origin %s even with same-origin fetch metadata", async requestOrigin => {
    const f = fixture();
    const headers = new Headers({ "content-type": "application/x-www-form-urlencoded", "sec-fetch-site": "same-origin" });
    if (requestOrigin !== undefined) headers.set("origin", requestOrigin);
    const request = new NextRequest(`${origin}/fr/auth/start`, { method: "POST", headers, body: "method=magic&email=test%40example.com" });
    const response = await handleAuth(request, "fr", "start", f.dependencies);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "INVALID_REQUEST" });
    expect(f.client).not.toHaveBeenCalled();
  });
  it("accepts the exact localhost Origin on a native Magic Link POST", async () => {
    const f = fixture(); const localOrigin = "http://localhost:3000";
    const request = new NextRequest(`${localOrigin}/fr/auth/start`, { method: "POST",
      headers: { origin: localOrigin, "content-type": "application/x-www-form-urlencoded", "sec-fetch-site": "same-origin" },
      body: "method=magic&email=test%40example.com" });
    const response = await handleAuth(request, "fr", "start", { ...f.dependencies, origin: () => localOrigin });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${localOrigin}/fr/sign-in?status=sent`);
    expect(f.auth.signInWithOtp).toHaveBeenCalledTimes(1);
  });
  it.each(["method=password", "method=magic&email=bad", "method=google&next=https://evil.example",
    "method=google&method=magic", `method=magic&email=${"a".repeat(5000)}`])("rejects invalid or oversized form data", async body => {
    const f = fixture();
    const response = await handleAuth(post(body), "fr", "start", f.dependencies);
    expect(response.headers.get("location")).toContain("status=error");
    expect(f.auth.signInWithOAuth).not.toHaveBeenCalled();
    expect(f.auth.signInWithOtp).not.toHaveBeenCalled();
  });
  it("rejects Google authorization URLs outside the pinned project", async () => {
    const f = fixture(); f.auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://evil.example" }, error: null });
    const response = await handleAuth(post("method=google"), "fr", "start", f.dependencies);
    expect(response.headers.get("location")).toContain("status=error");
  });
  it("provider errors do not expose emails, tokens, URLs or raw exceptions", async () => {
    const f = fixture(); f.auth.signInWithOtp.mockRejectedValue(new Error("postgres://secret:password@private/path"));
    const response = await handleAuth(post("method=magic&email=test%40example.com"), "fr", "start", f.dependencies);
    expect(response.headers.get("location")).toBe(`${origin}/fr/sign-in?status=error`);
    expect(await response.text()).not.toMatch(/password|test@example|private\/path/);
  });
  it("logout failure never reports successful sign-out", async () => {
    const f = fixture(); f.auth.signOut.mockResolvedValue({ error: new Error("provider unavailable") });
    const response = await handleAuth(post("", "/fr/auth/sign-out"), "fr", "sign-out", f.dependencies);
    expect(response.headers.get("location")).toContain("status=error");
  });
  it("configuration failures produce a fixed sanitized unavailable response", async () => {
    const f = fixture();
    const response = await handleAuth(post("method=google"), "fr", "start", { ...f.dependencies, origin: () => { throw new Error("private/path"); } });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "AUTH_UNAVAILABLE" });
    expect(f.client).not.toHaveBeenCalled();
  });
  it("rejects invalid locale before any configuration or transport access", async () => {
    const f = fixture(); const originFn = vi.fn(f.dependencies.origin);
    const response = await handleAuth(post("method=google"), "en", "start", { ...f.dependencies, origin: originFn });
    expect(response.status).toBe(404); expect(originFn).not.toHaveBeenCalled();
  });
  it("propagates SDK session-cookie writes and required no-store headers", async () => {
    const f = fixture();
    f.client.mockImplementation(cookies => {
      f.auth.signInWithOtp.mockImplementation(async () => {
        await cookies.setAll?.([{ name: "sb-test-verifier", value: "synthetic", options: { path: "/", sameSite: "lax" } }], { "Cache-Control": "private, no-store" });
        return { error: null };
      });
      return { auth: f.auth } as unknown as SupabaseClient;
    });
    const response = await handleAuth(post("method=magic&email=test%40example.com"), "fr", "start", f.dependencies);
    expect(response.cookies.get("sb-test-verifier")?.value).toBe("synthetic");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("clears any newly written session cookies if callback identity validation fails", async () => {
    const f = fixture();
    f.client.mockImplementation(cookies => {
      f.auth.exchangeCodeForSession.mockImplementation(async () => {
        await cookies.setAll?.([{ name: "sb-test-auth-token", value: "synthetic-session", options: { path: "/" } }], {});
        return { error: null };
      });
      f.auth.getUser.mockResolvedValue({ data: { user: { id: subject } }, error: new Error("invalid session") });
      return { auth: f.auth } as unknown as SupabaseClient;
    });
    const response = await handleAuth(callback(), "fr", "callback", f.dependencies);
    expect(response.headers.get("location")).toContain("status=error");
    expect(response.cookies.get("sb-test-auth-token")).toMatchObject({ value: "", maxAge: 0 });
  });
  it("preserves SDK session deletion cookies on successful sign-out", async () => {
    const f = fixture();
    f.client.mockImplementation(cookies => {
      f.auth.signOut.mockImplementation(async () => {
        await cookies.setAll?.([{ name: "sb-test-auth-token.0", value: "", options: { path: "/", maxAge: 0 } }], {});
        return { error: null };
      });
      return { auth: f.auth } as unknown as SupabaseClient;
    });
    const response = await handleAuth(post("", "/fr/auth/sign-out"), "fr", "sign-out", f.dependencies);
    expect(response.headers.get("location")).toContain("status=signed-out");
    expect(response.cookies.get("sb-test-auth-token.0")).toMatchObject({ value: "", maxAge: 0 });
  });
});
