import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
import { handlePasswordAuth } from "./password";
import { serverAuthClient } from "./server";
import { AUTH_PROJECT_URL } from "./config";

afterEach(() => vi.unstubAllEnvs());
describe("signup route with the installed Supabase SSR/Auth SDK and synthetic HTTP only", () => {
  it("persists the real PKCE cookie and redirects a confirmation-required registration", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", AUTH_PROJECT_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_synthetic");
    const calls: string[] = [];
    const transport: typeof fetch = async (input, init) => {
      const url = new URL(String(input)); calls.push(`${init?.method} ${url.pathname}`);
      if (url.origin !== AUTH_PROJECT_URL || url.pathname !== "/auth/v1/signup" || init?.method !== "POST") throw new Error("Unexpected synthetic endpoint");
      const body = JSON.parse(String(init.body));
      expect(body.code_challenge).toBeTypeOf("string");
      expect(body.code_challenge_method).toBe("s256");
      expect(body.data.registrationProfile.phone).toBe('+212612345678');
      expect(body.data.registrationConsent).toBeTypeOf('string');
      expect(url.searchParams.get("redirect_to")).toBe(`http://localhost:3000/fr/auth/password-callback?flow=${"a".repeat(64)}`);
      return Response.json({ id: "10000000-0000-4000-8000-000000000001", aud: "authenticated", identities: [], created_at: "2026-01-01" });
    };
    const request = new NextRequest("http://localhost:3000/fr/auth/sign-up", { method: "POST", headers: {
      Origin: "http://localhost:3000", "Content-Type": "application/x-www-form-urlencoded",
    }, body: new URLSearchParams({ email: "synthetic@example.com", password: "a secure password", confirmPassword: "a secure password",firstName:'Amina',lastName:'Exemple',callingCode:'+212',phone:'0612345678',acceptLegal:'on' }).toString() });
    const response = await handlePasswordAuth(request, "fr", "sign-up", {
      origin: () => "http://localhost:3000", client: cookies => serverAuthClient(cookies, transport),
      nonce: () => "a".repeat(64), now: Date.now, secret: () => "s".repeat(64),
      legal:()=>({terms:{version:'synthetic-v1',path:'/test-terms'},privacy:{version:'synthetic-v1',path:'/test-privacy'}}),
    });
    expect(calls).toEqual(["POST /auth/v1/signup"]);
    expect(response.headers.get("location")).toBe("http://localhost:3000/fr/sign-up?status=confirmation-sent");
    expect(response.cookies.getAll().some(cookie => cookie.name.includes("code-verifier") && !!cookie.value)).toBe(true);
    expect(response.cookies.get("contratpro-password-flow-fr")?.value).toBe(`signup.${"a".repeat(64)}`);
  });
});
