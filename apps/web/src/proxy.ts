import { NextRequest, NextResponse } from "next/server";
import { serverAuthClient } from "./auth/server";
import type { CookieOptions } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pending = new Map<string, { value: string; options: CookieOptions }>();
  const pendingHeaders = new Map<string, string>();
  try {
    const client = serverAuthClient({ getAll: () => request.cookies.getAll(), setAll: (cookies, headers) => {
      for (const cookie of cookies) {
        request.cookies.set(cookie.name, cookie.value);
        pending.set(cookie.name, { value: cookie.value, options: cookie.options });
      }
      for (const [key, value] of Object.entries(headers)) pendingHeaders.set(key, value);
      response = NextResponse.next({ request });
      for (const [name, cookie] of pending) response.cookies.set(name, cookie.value, cookie.options);
      for (const [key, value] of pendingHeaders) response.headers.set(key, value);
    } });
    await client.auth.getUser();
  } catch { /* Page authorization independently fails closed; never trust a proxy header. */ }
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  return response;
}

export const config = { matcher: ["/fr/app/:path*", "/ar/app/:path*", "/fr/sign-in", "/ar/sign-in"] };
