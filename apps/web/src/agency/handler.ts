import "server-only";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CookieMethodsServer, CookieOptions } from "@supabase/ssr";
import { appOrigin } from "../auth/config";
import { serverAuthClient } from "../auth/server";
import { supabaseAgencyContext, type AgencyContext } from "../auth/identity";
import { isLocale } from "../i18n/locales";
import { readSelection, selectionCookie } from "./selection";
import { readAgencyProfile } from "./profile";
import { isRecord, isUuid, validateAgencyProfile, validateAgencySettings, type FieldErrors } from "../../../../packages/application/src/agency-management";

type Dependencies = {
  origin: () => string;
  client: (cookies: CookieMethodsServer) => SupabaseClient;
  context: (client: SupabaseClient, selection?: { userId: string; agencyId: string }) => Promise<AgencyContext>;
  writesReady: () => boolean;
};
const production: Dependencies = {
  origin: () => appOrigin(process.env.CONTRATPRO_APP_ORIGIN), client: serverAuthClient,
  context: (client, selection) => supabaseAgencyContext(client, process.env.CONTRATPRO_AUTH_ACCESS_VERIFIED === "true", Date.now, selection),
  writesReady: () => process.env.CONTRATPRO_AGENCY_WRITES_VERIFIED === "true",
};
async function payload(request: NextRequest): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") throw new Error();
  const reader = request.body?.getReader(); if (!reader) throw new Error();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.length;
      if (size > 8192) { await reader.cancel(); throw new Error(); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

/** Browser ownership claims are never inputs. Selection IDs are hints checked against
 * fresh membership evidence. SQL repeats all owner checks inside its atomic mutation.
 */
export async function handleAgencyAction(request: NextRequest, locale: string, deps: Dependencies = production) {
  const pending = new Map<string, { value: string; options: CookieOptions }>();
  const reply = (body: object, status = 200) => {
    const response = NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer" } });
    for (const [name, cookie] of pending) response.cookies.set(name, cookie.value, cookie.options);
    return response;
  };
  const failed = (code: string, status: number, errors?: FieldErrors) => reply({ ok: false, code, ...(errors ? { errors } : {}) }, status);
  let mutationSent = false;
  try {
    if (!isLocale(locale)) return failed("forbidden", 404);
    const origin = appOrigin(deps.origin());
    if (request.method !== "POST" || request.nextUrl.origin !== origin || request.headers.get("origin") !== origin) return failed("forbidden", 403);
    let input: unknown;
    try { input = await payload(request); } catch { return failed("invalid", 400, { form: "invalid" }); }
    if (!isRecord(input)) return failed("invalid", 400, { form: "invalid" });
    const selecting = input.action === "select";
    const allowed = selecting ? ["action", "agencyId"] : ["action", "requestId", "data"];
    if (Object.keys(input).some(key => !allowed.includes(key)) || !["create", "profile", "settings", "select"].includes(String(input.action))) return failed("invalid", 400, { form: "invalid" });
    const client = deps.client({ getAll: () => request.cookies.getAll(), setAll: cookies => {
      for (const cookie of cookies) { request.cookies.set(cookie.name, cookie.value); pending.set(cookie.name, cookie); }
    } });
    const context = await deps.context(client, readSelection(request.cookies.get(selectionCookie)?.value));
    if (context.access.status === "signed-out") return failed("signed-out", 401);
    if (context.access.status === "unavailable") return failed("unavailable", 503);
    if (!context.canonical || !["authorized", "onboarding", "selection-required"].includes(context.access.status)) return failed("forbidden", 403);
    const select = (agencyId: string) => pending.set(selectionCookie, { value: `${context.canonical!.userId}:${agencyId}`,
      options: { path: "/", httpOnly: true, sameSite: "lax", secure: origin.startsWith("https:") } });
    if (selecting) {
      if (!isUuid(input.agencyId) || !context.choices.some(choice => choice.agencyId === input.agencyId)) return failed("forbidden", 403);
      select(input.agencyId);
      return reply({ ok: true, destination: `/${locale}/app` });
    }
    if (!deps.writesReady()) return failed("unavailable", 503);
    if (!isUuid(input.requestId)) return failed("invalid", 400, { form: "invalid" });
    const validation = input.action === "settings" ? validateAgencySettings(input.data) : validateAgencyProfile(input.data);
    if (!validation.ok) return failed("invalid", 400, validation.errors);
    if (input.action === "create") {
      mutationSent = true;
      const result = await client.rpc("contratpro_create_agency", { p_profile: validation.value, p_locale: locale, p_request_id: input.requestId });
      if (result.error || !Array.isArray(result.data) || result.data.length !== 1) return failed("uncertain", 503);
      const created: unknown = result.data[0];
      if (!isRecord(created) || !isUuid(created.agency_id) || !isUuid(created.membership_id) || created.user_id !== context.canonical.userId) return failed("uncertain", 503);
      const after = await deps.context(client, { userId: context.canonical.userId, agencyId: created.agency_id });
      if (after.access.status !== "authorized" || after.access.agencyId !== created.agency_id || after.access.membershipId !== created.membership_id) return failed("uncertain", 503);
      const profile = await readAgencyProfile(client, created.agency_id);
      if (!profile?.isOwner || Object.entries(validation.value).some(([key, value]) => profile.profile[key as keyof typeof profile.profile] !== value)) return failed("uncertain", 503);
      select(created.agency_id);
      return reply({ ok: true, destination: `/${locale}/app` });
    }
    if (context.access.status !== "authorized") return failed("forbidden", 403);
    const agencyId = context.access.agencyId;
    const before = await readAgencyProfile(client, agencyId);
    if (!before) return failed("unavailable", 503);
    if (!before.isOwner) return failed("forbidden", 403);
    mutationSent = true;
    const result = await client.rpc(input.action === "profile" ? "contratpro_update_agency" : "contratpro_update_agency_settings", {
      p_agency_id: agencyId, p_request_id: input.requestId,
      ...(input.action === "profile" ? { p_profile: validation.value } : { p_settings: validation.value }),
    });
    if (result.error || result.data !== true) return failed("uncertain", 503);
    const after = await readAgencyProfile(client, agencyId);
    if (!after?.isOwner) return failed("uncertain", 503);
    const persisted = input.action === "profile" ? after.profile : after.settings;
    if (Object.entries(validation.value).some(([key, value]) => persisted[key as keyof typeof persisted] !== value)) return failed("uncertain", 503);
    return reply({ ok: true });
  } catch { return failed(mutationSent ? "uncertain" : "unavailable", 503); }
}
