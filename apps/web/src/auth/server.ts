import "server-only";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicAuthConfig } from "./config";

export function serverAuthClient(cookieMethods: CookieMethodsServer, transport: typeof fetch = fetch) {
  const { url, key } = publicAuthConfig();
  return createServerClient(url, key, {
    cookies: cookieMethods,
    cookieOptions: { path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    global: { fetch: (input, init) => transport(input, { ...init, cache: "no-store",
      signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(7000)]) : AbortSignal.timeout(7000) }) },
  });
}

// Server Components only read cookies. Proxy handles refresh writes before rendering.
export async function componentAuthClient() {
  const store = await cookies();
  return serverAuthClient({ getAll: () => store.getAll(), setAll: () => {} });
}
