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
import { clientFields, validateClient, validateClientQuery, type ClientErrors } from "../../../../packages/application/src/clients";
import { ClientFault, clientRpc, clientDetail, clientPermissions, listClients } from "./data";

type Dependencies = { origin: () => string; client: (cookies: CookieMethodsServer) => SupabaseClient;
  context: (client: SupabaseClient, selection?: { userId: string; agencyId: string }) => Promise<AgencyContext>; ready: () => boolean };
const production: Dependencies = { origin: () => appOrigin(process.env.CONTRATPRO_APP_ORIGIN), client: serverAuthClient,
  context: (client, selection) => supabaseAgencyContext(client, process.env.CONTRATPRO_AUTH_ACCESS_VERIFIED === "true", Date.now, selection),
  ready: () => process.env.CONTRATPRO_CLIENTS_VERIFIED === "true" };
async function readBody(request: NextRequest): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") throw new Error();
  const reader = request.body?.getReader(); if (!reader) throw new Error();
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const part = await reader.read(); if (part.done) break;
    size += part.value.length; if (size > 16384) { await reader.cancel(); throw new Error(); } chunks.push(part.value);
  } } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
export async function handleClients(request: NextRequest, locale: string, deps: Dependencies = production) {
  const pending = new Map<string, { value: string; options: CookieOptions }>();
  const reply = (body: object, status = 200) => {
    const response = NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer" } });
    for (const [name, cookie] of pending) response.cookies.set(name, cookie.value, cookie.options);
    return response;
  };
  const fail = (code: string, status: number, errors?: ClientErrors) => reply({ ok: false, code, ...(errors ? { errors } : {}) }, status);
  let mutationSent = false;
  try {
    if (!isLocale(locale)) return fail("forbidden", 404);
    const origin = appOrigin(deps.origin());
    if (request.method !== "POST" || request.nextUrl.origin !== origin || request.headers.get("origin") !== origin) return fail("forbidden", 403);
    let input: unknown; try { input = await readBody(request); } catch { return fail("invalid", 400, { form: "invalid" }); }
    if (!isRecord(input) || typeof input.action !== "string" || !["list", "detail", "create", "update", "archive"].includes(input.action)) return fail("invalid", 400);
    const allowed = input.action === "list" ? ["action", "query"] : input.action === "detail" ? ["action", "id"] :
      input.action === "create" ? ["action", "requestId", "data"] : input.action === "update" ? ["action", "id", "version", "data"] : ["action", "id", "version"];
    if (Object.keys(input).some(key => !allowed.includes(key))) return fail("invalid", 400);
    const client = deps.client({ getAll: () => request.cookies.getAll(), setAll: cookies => {
      for (const cookie of cookies) { request.cookies.set(cookie.name, cookie.value); pending.set(cookie.name, cookie); }
    } });
    const context = await deps.context(client, readSelection(request.cookies.get(selectionCookie)?.value));
    if (context.access.status === "signed-out") return fail("signed-out", 401);
    if (context.access.status === "unavailable" || !deps.ready()) return fail("unavailable", 503);
    if (context.access.status !== "authorized" || !context.canonical) return fail("forbidden", 403);
    const agencyId = context.access.agencyId;
    const permissions = await clientPermissions(client, agencyId);
    if (!permissions.read || (input.action === "create" && !permissions.create) || (input.action === "update" && !permissions.update) || (input.action === "archive" && !permissions.archive)) return fail("forbidden", 403);
    if (input.action === "list") {
      const query = validateClientQuery(input.query); if (!query) return fail("invalid", 400);
      return reply({ ok: true, page: await listClients(client, agencyId, query) });
    }
    if (input.action !== "create" && !isUuid(input.id)) return fail("not-found", 404);
    const id = input.id as string;
    if (input.action === "detail") {
      const record = await clientDetail(client, agencyId, id); return record ? reply({ ok: true, client: record }) : fail("not-found", 404);
    }
    if (input.action === "create" && !isUuid(input.requestId)) return fail("invalid", 400);
    if (input.action !== "create" && (typeof input.version !== "number" || !Number.isSafeInteger(input.version) || input.version < 1)) return fail("invalid", 400);
    if (input.action === "archive") {
      mutationSent = true;
      const archived = await clientRpc(client, "contratpro_client_archive", { p_agency_id: agencyId, p_id: id, p_version: input.version });
      if (archived !== true) return fail("uncertain", 503);
      try { if (await clientDetail(client, agencyId, id)) return fail("uncertain", 503); } catch { return fail("uncertain", 503); }
      return reply({ ok: true, destination: `/${locale}/app/clients` });
    }
    const validation = validateClient(input.data); if (!validation.ok) return fail("invalid", 400, validation.errors);
    // Never trust the old RPC's UUID for replay: it did not compare original data.
    // This marker is installed atomically with the new receipt/trigger contract.
    if (input.action === "create" && await clientRpc(client, "contratpro_client_creation_contract", {}) !== 2) return fail("unavailable", 503);
    mutationSent = true;
    const result = await clientRpc(client, input.action === "create" ? "contratpro_client_create" : "contratpro_client_update",
      input.action === "create" ? { p_agency_id: agencyId, p_key: input.requestId, p_details: validation.value } :
        { p_agency_id: agencyId, p_id: id, p_version: input.version, p_details: validation.value });
    if (input.action === "create" ? !isUuid(result) : result !== true) return fail("uncertain", 503);
    const savedId = input.action === "create" ? result as string : id;
    try {
      const saved = await clientDetail(client, agencyId, savedId);
      // Create/replay was checked against immutable creation data by the new RPC.
      // Current fields may legitimately have changed since the original creation.
      if (!saved || (input.action === "update" && (clientFields.some(key => saved[key] !== validation.value[key]) || saved.version !== (input.version as number) + 1))) return fail("uncertain", 503);
      return reply({ ok: true, id: saved.id, version: saved.version });
    } catch { return fail("uncertain", 503); }
  } catch (error) {
    const code = error instanceof ClientFault ? error.code : "unavailable";
    const safe = mutationSent && code === "unavailable" ? "uncertain" : code;
    return fail(safe, safe === "forbidden" ? 403 : safe === "not-found" ? 404 : safe === "conflict" ? 409 : safe === "invalid" ? 400 : 503);
  }
}
