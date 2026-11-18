"use client";
import { createBrowserClient } from "@supabase/ssr";
import { publicAuthConfig } from "./config";

export function browserAuthClient() {
  const { url, key } = publicAuthConfig();
  return createBrowserClient(url, key, {
    // Only the nonce-checked server callback may exchange authorization codes.
    auth: { detectSessionInUrl: false },
    cookieOptions: { path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" },
  });
}
