import "server-only";
import { NextRequest, NextResponse } from "next/server";
import type { CookieMethodsServer } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appOrigin, AUTH_PROJECT_URL } from "./config";
import { serverAuthClient } from "./server";
import { verifiedSubject } from "./identity";
import { resolveAgencyAccess } from "../../../../packages/application/src/agency-access";

type State = "authenticated" | "unmapped" | "onboarding_ready" | "membership_present" | "rpc_error" | "blocked";
type Stage = "activation" | "request" | "authentication" | "transport" | "rpc_validation" | "internal";
type Dependencies = { development: () => boolean; enabled: () => boolean; origin: () => string;
  client: (cookies: CookieMethodsServer, transport: typeof fetch) => SupabaseClient; transport: typeof fetch; now: () => number };
const production: Dependencies = { development: () => process.env.NODE_ENV === "development",
  enabled: () => process.env.CONTRATPRO_DEV_AUTH_PROBE === "true", origin: () => appOrigin(process.env.CONTRATPRO_APP_ORIGIN),
  client: serverAuthClient, transport: fetch, now: Date.now };

// Fail closed before network I/O, including implicit SDK refresh and retries.
export function probeTransport(transport: typeof fetch, onFailure: () => void = () => {}): typeof fetch {
  const used = new Map<string, number>();
  return async (input, init) => {
    try {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const route = `${method} ${url.pathname}`;
    if (url.origin !== AUTH_PROJECT_URL || url.username || url.password || url.search ||
      !["GET /auth/v1/user", "GET /auth/v1/.well-known/jwks.json", "POST /rest/v1/rpc/contratpro_auth_access"].includes(route) ||
      (used.get(route) ?? 0) >= (route === "GET /auth/v1/user" ? 2 : 1)) throw new Error("PROBE_BLOCKED");
    // getClaims may verify legacy signing keys through a second getUser call.
    used.set(route, (used.get(route) ?? 0) + 1);
    return await transport(input, { ...init, redirect: "error", cache: "no-store" });
    } catch {
      onFailure();
      throw new Error("PROBE_BLOCKED");
    }
  };
}
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

async function hasEmptyBody(request: NextRequest): Promise<boolean> {
  if (request.signal.aborted) return false;
  if (request.body === null) return true;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  try {
    reader = request.body.getReader();
    const deadline = new Promise<never>((_, reject) => {
      abort = () => reject(new Error("PROBE_BLOCKED"));
      timer = setTimeout(abort, 1000);
      request.signal.addEventListener("abort", abort, { once: true });
    });
    // No buffering; reject the first byte. Bound even an endless stream of empty chunks.
    for (let reads = 0; reads < 16; reads++) {
      const part = await Promise.race([reader.read(), deadline]);
      if (request.signal.aborted) return false;
      if (part.done) return true;
      if (!(part.value instanceof Uint8Array) || part.value.byteLength !== 0) return false;
    }
    return false;
  } catch { return false; }
  finally {
    clearTimeout(timer);
    if (abort) request.signal.removeEventListener("abort", abort);
    if (reader) {
      // Cancellation itself may stall; do not let cleanup hold the response open.
      void reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
}

export async function handleAccessProbe(request: NextRequest, deps: Dependencies = production) {
  let stage: Stage = "internal";
  let transportFailed = false;
  const reply = (state: State) => NextResponse.json({ state, ...(state === "blocked" ? { stage: transportFailed ? "transport" : stage } : {}) }, { status: state === "blocked" ? 403 : state === "rpc_error" ? 503 : 200,
    headers: { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "Referrer-Policy": "no-referrer" } });
  try {
    stage = "activation";
    if (!deps.development() || !deps.enabled()) return reply("blocked");
    stage = "request";
    const origin = appOrigin(deps.origin()); const parsed = new URL(origin);
    if (parsed.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(parsed.hostname) || request.nextUrl.origin !== origin ||
      request.method !== "POST" || request.headers.get("origin") !== origin || request.nextUrl.search ||
      !await hasEmptyBody(request)) return reply("blocked");
    stage = "internal";
    const transportFailure = () => { transportFailed = true; };
    const client = deps.client({ getAll: () => request.cookies.getAll(), setAll: () => {
      transportFailure(); throw new Error("PROBE_BLOCKED");
    } }, probeTransport(deps.transport, transportFailure));
    stage = "authentication";
    const identity = await verifiedSubject(client, deps.now());
    if (!identity) return reply("blocked");
    stage = "internal";
    const result = await client.rpc("contratpro_auth_access");
    if (result.error || !Array.isArray(result.data) || result.data.length > 100) return reply("rpc_error");
    stage = "authentication";
    if (identity.expiresAt <= deps.now()) return reply("blocked");
    stage = "rpc_validation";
    if (result.data.length === 0) return reply("unmapped");
    const first: unknown = result.data[0];
    if (!record(first) || !uuid(first.user_id)) return reply("blocked");
    const memberships: { userId: unknown; agencyId: unknown; membershipId: unknown; agencyName: unknown; membershipState: unknown; agencyState: unknown }[] = [];
    for (const value of result.data as unknown[]) {
      if (!record(value) || value.supabase_user_id !== identity.subject || value.user_id !== first.user_id || value.user_state !== first.user_state) return reply("blocked");
      if (result.data.length === 1 && value.membership_id === null && value.agency_id === null && value.agency_name === null && value.membership_state === null && value.agency_state === null) continue;
      memberships.push({ userId: value.user_id, agencyId: value.agency_id, membershipId: value.membership_id,
        agencyName: value.agency_name, membershipState: value.membership_state, agencyState: value.agency_state });
    }
    const access = await resolveAgencyAccess({ session: async () => ({ userId: first.user_id, userState: first.user_state, expiresAt: identity.expiresAt }),
      memberships: async () => memberships, now: deps.now });
    return reply(access.status === "onboarding" ? "onboarding_ready" : ["authorized", "selection-required"].includes(access.status) ? "membership_present" : "blocked");
  } catch { return reply("blocked"); }
}
