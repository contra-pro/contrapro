import { describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CookieMethodsServer } from "@supabase/ssr";
vi.mock("server-only", () => ({}));
import { handlePasswordAuth } from "./password";
import { AUTH_PROJECT_URL } from "./config";

const origin = "https://contratpro.example", nonce = "a".repeat(64);
const subject = "10000000-0000-4000-8000-000000000001";
function fixture() {
  const auth = {
    signUp: vi.fn(async () => ({ data: { session: null as unknown }, error: null as unknown })),
    signInWithPassword: vi.fn(async () => ({ error: null as unknown })),
    resetPasswordForEmail: vi.fn(async () => ({ error: null as unknown })),
    exchangeCodeForSession: vi.fn(async () => ({ data: { redirectType: "recovery" }, error: null as unknown })),
    updateUser: vi.fn(async () => ({ error: null as unknown })),
    getUser: vi.fn(async () => ({ data: { user: { id: subject, email_confirmed_at: "2026-01-01" } }, error: null as unknown })),
    getClaims: vi.fn(async () => ({ data: { claims: { sub: subject, session_id: "session-1", exp: 2000, aud: "authenticated", iss: `${AUTH_PROJECT_URL}/auth/v1` } }, error: null as unknown })),
    signOut: vi.fn(async () => ({ error: null as unknown })),
  };
  const client = vi.fn<(cookies: CookieMethodsServer) => SupabaseClient>(() => ({ auth }) as unknown as SupabaseClient);
  const deps = { origin: () => origin, client, nonce: () => nonce, now: () => 1000, secret: () => "s".repeat(64) };
  return { auth, client, deps };
}
function post(operation: string, fields: Record<string, string>, cookie = "", locale = "fr", requestOrigin = origin) {
  return new NextRequest(`${origin}/${locale}/auth/${operation}`, { method: "POST", headers: {
    origin: requestOrigin, "content-type": "application/x-www-form-urlencoded", cookie,
  }, body: new URLSearchParams(fields).toString() });
}
const credentials = { email: "owner@example.com", password: "a secure password", confirmPassword: "a secure password" };
function callback(purpose: string, locale = "fr", query = `code=one-use-code&flow=${nonce}`) {
  const state = `${purpose}.${nonce}`;
  const signature = purpose === "recovery" ? `.${createHmac("sha256", "s".repeat(64)).update(`contratpro.password-recovery.v1:flow:${state}`).digest("hex")}` : "";
  return new NextRequest(`${origin}/${locale}/auth/password-callback?${query}`, { headers: {
    cookie: `contratpro-password-flow-${locale}=${state}${signature}`,
  } });
}
describe("password authentication through injected Supabase only", () => {
  it("accepts a verified immediate session when confirmation is disabled", async () => {
    const f = fixture(); f.auth.signUp.mockResolvedValue({ data: { session: { synthetic: true } }, error: null });
    const response = await handlePasswordAuth(post("sign-up", credentials), "fr", "sign-up", f.deps);
    expect(response.headers.get("location")).toBe(`${origin}/fr/auth/continue`);
    expect(response.cookies.get("contratpro-password-flow-fr")).toBeUndefined();
  });
  it.each(["signup_disabled", "email_provider_disabled", "email_address_not_authorized", "unexpected_failure"])("diagnoses signup rejection %s without exposing SDK messages", async code => {
    const f = fixture(), diagnostic = vi.fn();
    f.auth.signUp.mockResolvedValue({ data: { session: null }, error: { code, status: 422, message: "PRIVATE owner@example.com token=password" } });
    const response = await handlePasswordAuth(post("sign-up", credentials), "fr", "sign-up", { ...f.deps, diagnostic });
    expect(response.headers.get("location")).toBe(`${origin}/fr/sign-up?status=signup-unavailable`);
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ operation: "sign-up", stage: "signup-response", code }));
    expect(JSON.stringify(diagnostic.mock.calls)).not.toMatch(/PRIVATE|owner@example|password=/);
  });
  it.each(["user_already_exists", "email_exists"])("keeps duplicate-account response neutral: %s", async code => {
    const f = fixture(); f.auth.signUp.mockResolvedValue({ data: { session: null }, error: { code } });
    const response = await handlePasswordAuth(post("sign-up", credentials), "fr", "sign-up", f.deps);
    expect(response.headers.get("location")).toBe(`${origin}/fr/sign-up?status=confirmation-sent`);
  });
  it.each(["over_request_rate_limit", "over_email_send_rate_limit"])("maps actual provider rate limit %s", async code => {
    const f = fixture(); f.auth.signUp.mockResolvedValue({ data: { session: null }, error: { code } });
    const response = await handlePasswordAuth(post("sign-up", credentials), "fr", "sign-up", f.deps);
    expect(response.headers.get("location")).toBe(`${origin}/fr/sign-up?status=rate-limited`);
  });
  it("separates client configuration failure from email-link failure", async () => {
    const f = fixture(), diagnostic = vi.fn(); f.client.mockImplementation(() => { throw new Error("AUTH_CONFIGURATION_UNAVAILABLE"); });
    const response = await handlePasswordAuth(post("sign-up", credentials), "fr", "sign-up", { ...f.deps, diagnostic });
    expect(response.headers.get("location")).toBe(`${origin}/fr/sign-up?status=signup-unavailable`);
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ stage: "client", category: "configuration" }));
    expect(f.auth.signUp).not.toHaveBeenCalled();
  });
  it("does not reflect unknown provider codes or thrown messages in diagnostics", async () => {
    const f = fixture(), diagnostic = vi.fn();
    f.auth.signUp.mockRejectedValue(new Error("PRIVATE token secret"));
    const response = await handlePasswordAuth(post("sign-up", credentials), "fr", "sign-up", { ...f.deps, diagnostic });
    expect(response.headers.get("location")).toContain("status=signup-unavailable");
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ stage: "signup-request", category: "exception", code: "unclassified" }));
    expect(JSON.stringify(diagnostic.mock.calls)).not.toMatch(/PRIVATE|token|secret/);
  });
  for (const locale of ["fr", "ar"]) {
    it(`${locale}: registers without creating a membership or disclosing account existence`, async () => {
      const f = fixture();
      const response = await handlePasswordAuth(post("sign-up", credentials, "", locale), locale, "sign-up", f.deps);
      expect(f.auth.signUp).toHaveBeenCalledExactlyOnceWith({ email: credentials.email, password: credentials.password,
        options: { emailRedirectTo: `${origin}/${locale}/auth/password-callback?flow=${nonce}` } });
      expect(response.headers.get("location")).toBe(`${origin}/${locale}/sign-up?status=confirmation-sent`);
      expect(response.cookies.get(`contratpro-password-flow-${locale}`)).toMatchObject({ httpOnly: true, secure: true });
    });
    it(`${locale}: logs in and routes through existing authorized onboarding`, async () => {
      const f = fixture();
      const response = await handlePasswordAuth(post("password", { email: credentials.email, password: credentials.password }, "", locale), locale, "password", f.deps);
      expect(f.auth.signInWithPassword).toHaveBeenCalledExactlyOnceWith({ email: credentials.email, password: credentials.password });
      expect(response.headers.get("location")).toBe(`${origin}/${locale}/auth/continue`);
      expect(response.cookies.get("contratpro-agency")?.value).not.toBe("invented-membership");
    });
    it(`${locale}: confirms email through one-use PKCE exchange`, async () => {
      const f = fixture();
      const response = await handlePasswordAuth(callback("signup", locale), locale, "password-callback", f.deps);
      expect(f.auth.exchangeCodeForSession).toHaveBeenCalledWith("one-use-code");
      expect(response.headers.get("location")).toBe(`${origin}/${locale}/auth/continue`);
    });
  }
  it.each(["invalid_credentials", "email_not_confirmed"])("sanitizes login failure %s", async code => {
    const f = fixture(); f.auth.signInWithPassword.mockResolvedValue({ error: { code, message: "PRIVATE" } });
    const response = await handlePasswordAuth(post("password", credentials), "fr", "password", f.deps);
    expect(response.headers.get("location")).toContain(code === "email_not_confirmed" ? "status=verify-email" : "status=invalid-credentials");
    expect(await response.text()).not.toContain("PRIVATE");
  });
  it.each([{ ...credentials, password: "short" }, { ...credentials, confirmPassword: "different" }, { ...credentials, email: "invalid" }])("rejects invalid registration before SDK calls", async fields => {
    const f = fixture(); await handlePasswordAuth(post("sign-up", fields), "fr", "sign-up", f.deps);
    expect(f.auth.signUp).not.toHaveBeenCalled();
  });
  it("forgot-password returns neutral copy even for an unknown account", async () => {
    const f = fixture(); f.auth.resetPasswordForEmail.mockResolvedValue({ error: { message: "PRIVATE" } });
    const response = await handlePasswordAuth(post("forgot-password", { email: credentials.email }), "fr", "forgot-password", f.deps);
    expect(response.headers.get("location")).toBe(`${origin}/fr/forgot-password?status=recovery-sent`);
    expect(f.auth.resetPasswordForEmail).toHaveBeenCalledWith(credentials.email, { redirectTo: `${origin}/fr/auth/password-callback?flow=${nonce}` });
  });
  it("rejects expired or reused email codes without granting recovery", async () => {
    const f = fixture(); f.auth.exchangeCodeForSession.mockResolvedValue({ data: { redirectType: "recovery" }, error: { code: "otp_expired" } });
    const response = await handlePasswordAuth(callback("recovery"), "fr", "password-callback", f.deps);
    expect(response.headers.get("location")).toContain("status=expired-link");
    expect(response.cookies.get("contratpro-password-recovery")?.value).toBeFalsy();
  });
  it("requires correlation and rejects arbitrary redirect destinations", async () => {
    const f = fixture();
    await handlePasswordAuth(callback("signup", "fr", `code=x&flow=${nonce}&next=https://evil.example`), "fr", "password-callback", f.deps);
    await handlePasswordAuth(new NextRequest(`${origin}/fr/auth/password-callback?code=x&flow=${nonce}`), "fr", "password-callback", f.deps);
    expect(f.client).not.toHaveBeenCalled();
  });
  it("requires recovery exchange before password update and binds it to the current session", async () => {
    const f = fixture();
    await handlePasswordAuth(post("reset-password", { password: credentials.password, confirmPassword: credentials.password }), "fr", "reset-password", f.deps);
    expect(f.auth.updateUser).not.toHaveBeenCalled();
    const confirmed = await handlePasswordAuth(callback("recovery"), "fr", "password-callback", f.deps);
    const ticket = confirmed.cookies.get("contratpro-password-recovery")!.value;
    const response = await handlePasswordAuth(post("reset-password", { password: credentials.password, confirmPassword: credentials.password }, `contratpro-password-recovery=${ticket}`), "fr", "reset-password", f.deps);
    expect(f.auth.updateUser).toHaveBeenCalledExactlyOnceWith({ password: credentials.password });
    expect(response.headers.get("location")).toBe(`${origin}/fr/sign-in?status=password-updated`);
    expect(response.cookies.get("contratpro-password-recovery")?.maxAge).toBe(0);
  });
  it("denies forged, expired and different-session recovery tickets", async () => {
    const f = fixture(); const confirmed = await handlePasswordAuth(callback("recovery"), "fr", "password-callback", f.deps);
    const ticket = confirmed.cookies.get("contratpro-password-recovery")!.value;
    for (const value of [ticket + "x", "forged"]) await handlePasswordAuth(post("reset-password", credentials, `contratpro-password-recovery=${value}`), "fr", "reset-password", f.deps);
    await handlePasswordAuth(post("reset-password", credentials, `contratpro-password-recovery=${ticket}`), "fr", "reset-password", { ...f.deps, now: () => 700000 });
    f.auth.getClaims.mockResolvedValue({ data: { claims: { sub: subject, session_id: "another-session", exp: 2000, aud: "authenticated", iss: `${AUTH_PROJECT_URL}/auth/v1` } }, error: null });
    await handlePasswordAuth(post("reset-password", credentials, `contratpro-password-recovery=${ticket}`), "fr", "reset-password", f.deps);
    expect(f.auth.updateUser).not.toHaveBeenCalled();
  });
  it("rejects CSRF before any SDK use and never reflects passwords", async () => {
    const f = fixture();
    const response = await handlePasswordAuth(post("password", credentials, "", "fr", "https://evil.example"), "fr", "password", f.deps);
    expect(response.status).toBe(403); expect(f.client).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain(credentials.password);
  });
  it("preserves an existing session when a failing SDK call tries to clear cookies", async () => {
    const f = fixture();
    f.client.mockImplementation(cookies => {
      f.auth.signInWithPassword.mockImplementation(async () => {
        await cookies.setAll?.([{ name: "sb-existing", value: "", options: { path: "/", maxAge: 0 } }], {});
        return { error: { code: "invalid_credentials" } };
      });
      return { auth: f.auth } as unknown as SupabaseClient;
    });
    const response = await handlePasswordAuth(post("password", credentials, "sb-existing=existing-session"), "fr", "password", f.deps);
    expect(response.cookies.get("sb-existing")?.value).toBe("existing-session");
    expect(response.cookies.get("sb-existing")?.maxAge).not.toBe(0);
  });
  it("does not accept an unsigned recovery-purpose cookie", async () => {
    const f = fixture();
    const request = new NextRequest(`${origin}/fr/auth/password-callback?code=x&flow=${nonce}`, { headers: { cookie: `contratpro-password-flow-fr=recovery.${nonce}` } });
    await handlePasswordAuth(request, "fr", "password-callback", f.deps);
    expect(f.client).not.toHaveBeenCalled();
  });
});
