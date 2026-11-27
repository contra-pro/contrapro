import "server-only";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CookieMethodsServer, CookieOptions } from "@supabase/ssr";
import { appOrigin } from "../auth/config";
import { serverAuthClient } from "../auth/server";
import { supabaseAgencyContext, type AgencyContext } from "../auth/identity";
import { readSelection, selectionCookie } from "../agency/selection";
import { isLocale } from "../i18n/locales";
import { isRecord, isUuid } from "../../../../packages/application/src/agency-management";
import { createRental } from "../../../../packages/application/src/rentals/create";
import { encodeRentalCreateRequest } from "../../../../packages/domain/src/rentals/rpc-request";
import { parseRentalCreateJson } from "../../../../packages/domain/src/rentals/json-boundary";
import { parseRentalTimestamp } from "../../../../packages/domain/src/rentals/timestamps";
import { RentalFault, rentalRpc, rentalCapabilities, rentalList, rentalDetail, rentalChoices, validPage } from "./data";
import { archiveQuery } from "./archive-model";
type Dependencies = { origin: () => string; client: (cookies: CookieMethodsServer) => SupabaseClient;
  context: (client: SupabaseClient, selection?: { userId: string; agencyId: string }) => Promise<AgencyContext>; ready: () => boolean };
const production: Dependencies = { origin: () => appOrigin(process.env.CONTRATPRO_APP_ORIGIN), client: serverAuthClient,
  context: (client, selection) => supabaseAgencyContext(client, process.env.CONTRATPRO_AUTH_ACCESS_VERIFIED === "true", Date.now, selection),
  ready: () => process.env.CONTRATPRO_RENTALS_VERIFIED === "true" };
async function readBody(request: NextRequest): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json" || !request.body) throw Error();
  const reader = request.body.getReader(); const decoder = new TextDecoder("utf-8", { fatal: true }); let text = "", size = 0;
  try { for (;;) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength;
    if (size > 16384) { void reader.cancel().catch(() => {}); throw Error(); } text += decoder.decode(chunk.value, { stream: true });
  } return JSON.parse(text + decoder.decode()) as unknown; } finally { reader.releaseLock(); }
}
export async function handleRentals(request: NextRequest, locale: string, deps: Dependencies = production) {
  const pending = new Map<string, { value: string; options: CookieOptions }>(); let sent = false;
  const reply = (body: object, status = 200) => {
    const response = NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } });
    for (const [name, cookie] of pending) response.cookies.set(name, cookie.value, cookie.options); return response;
  };
  const fail = (code: string, status: number) => reply({ ok: false, code }, status);
  try {
    if (!isLocale(locale)) return fail("not-found", 404);
    const origin = appOrigin(deps.origin());
    if (request.method !== "POST" || request.nextUrl.origin !== origin || request.headers.get("origin") !== origin) return fail("forbidden", 403);
    if (!deps.ready()) return fail("unavailable", 503);
    let body: unknown; try { body = await readBody(request); } catch { return fail("invalid", 400); }
    if (!isRecord(body) || typeof body.action !== "string") return fail("invalid", 400);
    const shapes: Record<string, string[]> = { archive:["action","input"],"archive-mark":["action","input"],list: ["action", "page"], detail: ["action", "id"], document: ["action", "id"],
      choices: ["action", "kind", "search", "page"], create: ["action", "requestId", "data"], update: ["action", "id", "version", "requestId", "data"],
      driver: ["action", "id", "version", "requestId", "clientId"], extend: ["action", "id", "version", "requestId", "end"],
      confirm: ["action", "id", "version", "requestId"], start: ["action", "id", "version", "requestId"],
      complete: ["action", "id", "version", "requestId", "returnConfirmed"], cancel: ["action", "id", "version", "requestId"] };
    const allowed = shapes[body.action];
    if (!allowed || Object.keys(body).length !== allowed.length || Object.keys(body).some(key => !allowed.includes(key))) return fail("invalid", 400);
    const client = deps.client({ getAll: () => request.cookies.getAll(), setAll: cookies => { for (const cookie of cookies) {
      request.cookies.set(cookie.name, cookie.value); pending.set(cookie.name, cookie); } } });
    const context = await deps.context(client, readSelection(request.cookies.get(selectionCookie)?.value));
    if (context.access.status === "signed-out") return fail("signed-out", 401);
    if (context.access.status === "unavailable") return fail("unavailable", 503);
    if (context.access.status !== "authorized" || !context.canonical || context.canonical.userId !== context.access.userId) return fail("forbidden", 403);
    const agencyId = context.access.agencyId; await rentalCapabilities(client, agencyId);
    if(body.action==="archive"||body.action==="archive-mark"){
      if(process.env.CONTRATPRO_A4_VERIFIED!=="true")return fail("unavailable",503);
      if(!isRecord(body.input))return fail("invalid",400);
      if(body.action==="archive-mark"&&(!isUuid(body.input.rentalId)||!isUuid(body.input.requestId)||typeof body.input.archived!=="boolean"))return fail("invalid",400);
      const input=body.action==="archive"?archiveQuery(body.input):body.input;
      return reply({ok:true,value:await rentalRpc(client,"contratpro_archive",{p_agency_id:agencyId,p_action:body.action==="archive"?"search":"mark",p_input:input})});
    }
    if (body.action === "list") return validPage(body.page) ? reply({ ok: true, value: await rentalList(client, agencyId, body.page) }) : fail("invalid", 400);
    if (body.action === "choices") {
      if (!["client", "vehicle"].includes(String(body.kind)) || typeof body.search !== "string" || body.search.length > 100 || /[\u0000-\u001f\u007f]/.test(body.search) || !validPage(body.page)) return fail("invalid", 400);
      return reply({ ok: true, value: await rentalChoices(client, agencyId, body.kind as "client" | "vehicle", body.search, body.page) });
    }
    if (body.action === "create") {
      if (!isUuid(body.requestId) || typeof body.data !== "string") return fail("invalid", 400);
      const result = await createRental(body.data, { agencyId, creationKey: body.requestId }, { create: async args => {
        sent = true; const { data, error } = await client.rpc("contratpro_rental_create", args);
        return error ? { kind: "rejected", sqlState: error.code } : { kind: "success", data: data as unknown };
      } });
      if (result.ok) return reply(result);
      return fail(result.code, result.code === "quota" ? 429 : result.code === "restricted" ? 402 : result.code === "forbidden" ? 403 : result.code === "conflict" ? 409 : result.code === "uncertain" ? 503 : 400);
    }
    if (!isUuid(body.id)) return fail("not-found", 404);
    if (body.action === "detail") { const value = await rentalDetail(client, agencyId, body.id); return value ? reply({ ok: true, value }) : fail("not-found", 404); }
    if (body.action === "document") return reply({ ok: true, value: await rentalRpc(client, "contratpro_rental_document", { p_agency_id: agencyId, p_id: body.id }) });
    if (!isUuid(body.requestId) || typeof body.version !== "number" || !Number.isInteger(body.version) || body.version < 1 || body.version >= 2147483647) return fail("invalid", 400);
    const args: Record<string, unknown> = { p_agency_id: agencyId, p_id: body.id, p_version: body.version, p_request_id: body.requestId };
    if (body.action === "update") {
      if (typeof body.data !== "string") return fail("invalid", 400);
      const parsed = parseRentalCreateJson(body.data); if (!parsed.ok) return fail("invalid", 400);
      const encoded = encodeRentalCreateRequest(parsed.value, agencyId, body.requestId); if (!encoded.ok) return fail("invalid", 400);
      args.p_details = encoded.value.p_details;
    }
    if (body.action === "extend") {
      try { if (typeof body.end !== "string") throw Error(); parseRentalTimestamp(body.end); } catch { return fail("invalid", 400); }
      args.p_details = { end: body.end };
    }
    if (body.action === "driver") { if (body.clientId !== null && !isUuid(body.clientId)) return fail("invalid", 400); args.p_client_id = body.clientId; }
    if (body.action === "complete") { if (body.returnConfirmed !== true) return fail("invalid", 400); args.p_return_confirmed = true; }
    const operation = body.action === "update" ? "update_draft" : body.action === "driver" ? "set_driver" : body.action;
    sent = true; const result = await rentalRpc(client, `contratpro_rental_${operation}`, args);
    if (!isRecord(result) || result.id !== body.id || result.version !== body.version + 1 || typeof result.state !== "string") return fail("uncertain", 503);
    const value = await rentalDetail(client, agencyId, body.id);
    if (!value || value.version !== result.version || value.state !== result.state) return fail("uncertain", 503);
    return reply({ ok: true, value });
  } catch (error) {
    let code = error instanceof RentalFault ? error.code : "unavailable";
    if (sent && code === "unavailable") code = "uncertain";
    return fail(code, code === "quota" ? 429 : code === "restricted" ? 402 : code === "forbidden" ? 403 : code === "not-found" ? 404 : code === "conflict" ? 409 : code === "invalid" ? 400 : 503);
  }
}
