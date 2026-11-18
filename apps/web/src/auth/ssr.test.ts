import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CookieMethodsServer } from "@supabase/ssr";
vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn(), createBrowserClient: vi.fn() }));
vi.mock("./config", () => ({ publicAuthConfig: () => ({ url: "https://gllsiklbvqpxzucvkehw.supabase.co", key: "sb_publishable_test" }) }));
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { serverAuthClient } from "./server";
import { browserAuthClient } from "./browser";
import { proxy } from "../proxy";

describe("Supabase SSR wiring — SDK factory doubles, no real fetch", () => {
  beforeEach(() => vi.clearAllMocks());
  it("server clients use getAll/setAll, public configuration and per-request instances", () => {
    const cookies = { getAll: () => [], setAll: vi.fn() };
    serverAuthClient(cookies); serverAuthClient(cookies);
    expect(createServerClient).toHaveBeenCalledTimes(2);
    const [url, key, options] = vi.mocked(createServerClient).mock.calls[0]!;
    expect(url).toBe("https://gllsiklbvqpxzucvkehw.supabase.co");
    expect(key).toBe("sb_publishable_test");
    expect(options.cookies).toBe(cookies);
    expect(options.cookieOptions).toMatchObject({ path: "/", sameSite: "lax" });
    expect(options.global?.fetch).toBeTypeOf("function");
  });
  it("browser clients cannot auto-exchange a URL code outside the protected callback", () => {
    browserAuthClient();
    expect(createBrowserClient).toHaveBeenCalledWith("https://gllsiklbvqpxzucvkehw.supabase.co", "sb_publishable_test", expect.objectContaining({
      auth: { detectSessionInUrl: false }, cookieOptions: expect.objectContaining({ path: "/", sameSite: "lax" }),
    }));
  });
  it("refresh writes all cookie chunks to both the downstream request and response", async () => {
    vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
      const cookies = options.cookies as CookieMethodsServer;
      return { auth: { getUser: async () => {
        await cookies.setAll?.([{ name: "sb-test.0", value: "chunk-0", options: { path: "/" } }], { Expires: "0" });
        await cookies.setAll?.([{ name: "sb-test.1", value: "chunk-1", options: { path: "/" } }], {});
        return { data: { user: null }, error: null };
      } } } as unknown as SupabaseClient;
    });
    const request = new NextRequest("https://contratpro.example/fr/app");
    const response = await proxy(request);
    for (const suffix of ["0", "1"]) {
      expect(request.cookies.get(`sb-test.${suffix}`)?.value).toBe(`chunk-${suffix}`);
      expect(response.cookies.get(`sb-test.${suffix}`)?.value).toBe(`chunk-${suffix}`);
    }
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-user-id")).toBeNull();
  });
  it("refresh errors disclose no provider details and grant no authorization header", async () => {
    vi.mocked(createServerClient).mockImplementation(() => ({ auth: { getUser: async () => { throw new Error("private/token/path"); } } }) as unknown as SupabaseClient);
    const response = await proxy(new NextRequest("https://contratpro.example/ar/app"));
    expect(await response.text()).not.toContain("private");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-user-id")).toBeNull();
  });
});
