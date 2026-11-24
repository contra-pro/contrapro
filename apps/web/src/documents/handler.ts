import "server-only";
import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { appOrigin } from "../auth/config";
import { serverAuthClient } from "../auth/server";
import { supabaseAgencyContext } from "../auth/identity";
import { readSelection, selectionCookie } from "../agency/selection";
import { isLocale } from "../i18n/locales";
import { isRecord } from "../../../../packages/application/src/agency-management";
import { Documents } from "./service";
import { SupabaseDocumentRepository } from "./repository";
import { SupabasePrivateStorage } from "./storage";
import { DocumentFault } from "./model";
import { maxUpload, pdf } from "./uploads";
import { ContainerDocxConverter } from "./converter";

export async function boundedJson(request: NextRequest) {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json" || !request.body) throw new DocumentFault("invalid");
  const reader = request.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length;
    if (size > 14 * 1024 * 1024) { void reader.cancel().catch(() => {}); throw new DocumentFault("invalid"); } chunks.push(part.value); }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))) as unknown;
  } finally { reader.releaseLock(); }
}
export async function handleDocuments(request: NextRequest, locale: string) {
  const pending: { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }[] = [];
  const headers = { "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
  const reply = (value: object, status = 200) => { const res = NextResponse.json(value, { status, headers }); for (const c of pending) res.cookies.set(c.name, c.value, c.options ?? {}); return res; };
  try {
    if (!isLocale(locale)) return reply({ ok: false, code: "not-found" }, 404);
    const origin = appOrigin(process.env.CONTRATPRO_APP_ORIGIN);
    if (request.method !== "POST" || request.nextUrl.origin !== origin || request.headers.get("origin") !== origin) throw new DocumentFault("forbidden");
    if (process.env.CONTRATPRO_DOCUMENTS_VERIFIED !== "true") throw new DocumentFault("unavailable");
    const client = serverAuthClient({ getAll: () => request.cookies.getAll(), setAll: values => { for (const c of values) { request.cookies.set(c.name, c.value); pending.push(c); } } });
    const context = await supabaseAgencyContext(client, process.env.CONTRATPRO_AUTH_ACCESS_VERIFIED === "true", Date.now, readSelection(request.cookies.get(selectionCookie)?.value));
    if (context.access.status !== "authorized" || !context.canonical || context.canonical.userId !== context.access.userId) throw new DocumentFault("forbidden");
    const agencyId = context.access.agencyId, repo = new SupabaseDocumentRepository(client), store = new SupabasePrivateStorage(client, agencyId);
    const caps = await repo.call<unknown>(agencyId, "capabilities", {});
    if (!isRecord(caps) || caps.contractVersion !== 1 || caps.privateStorage !== true) throw new DocumentFault("unavailable");
    const body = await boundedJson(request);
    if (!isRecord(body) || typeof body.action !== "string" || !isRecord(body.input)) throw new DocumentFault("invalid");
    const input = body.input;
    const font = body.action === "generate" && process.env.CONTRATPRO_DOCUMENT_FONT_PATH ? new Uint8Array(await readFile(process.env.CONTRATPRO_DOCUMENT_FONT_PATH)) : new Uint8Array();
    const converter = process.env.CONTRATPRO_DOCX_IMAGE ? new ContainerDocxConverter(process.env.CONTRATPRO_DOCX_IMAGE) : undefined;
    const service = new Documents(agencyId, repo, store, font, converter, process.env.CONTRATPRO_DOCUMENT_RENDERER_SECRET);
    let value: unknown;
    if (body.action === "list") value = await service.list();
    else if (body.action === "cleanup") value = await service.cleanupOrphans();
    else if (body.action === "save") {
      if (typeof input.templateId !== "string" || typeof input.name !== "string" || typeof input.expectedRevision !== "number") throw new DocumentFault("invalid");
      let bytes: Uint8Array | undefined;
      if (input.base64 !== undefined) {
        if (typeof input.base64 !== "string" || input.base64.length > Math.ceil(maxUpload / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64)) throw new DocumentFault("invalid");
        bytes = new Uint8Array(Buffer.from(input.base64, "base64"));
      }
      value = await service.save({ templateId: input.templateId, name: input.name, expectedRevision: input.expectedRevision, config: input.config,
        ...(bytes ? { bytes, filename: String(input.filename), mime: String(input.mime) } : { sourceVersionId: String(input.sourceVersionId) }) });
    } else if (body.action === "archive" || body.action === "default") {
      if (typeof input.templateId !== "string") throw new DocumentFault("invalid");
      value = body.action === "archive" ? await service.archive(input.templateId) : await service.setDefault(input.templateId);
    } else if (body.action === "select" || body.action === "selection") value = await repo.call(agencyId, body.action, input);
    else if (body.action === "history") value = await service.history(String(input.rentalId));
    else if (body.action === "generate") {
      if (typeof input.rentalId !== "string" || typeof input.templateVersionId !== "string" || typeof input.rentalVersion !== "number" || typeof input.requestId !== "string" ||
        typeof input.issueDate !== "string" || !isRecord(input.custom) || !["draft", "issued"].includes(String(input.status))) throw new DocumentFault("invalid");
      value = await service.generate({ rentalId: input.rentalId, templateVersionId: input.templateVersionId, rentalVersion: input.rentalVersion, requestId: input.requestId,
        issueDate: input.issueDate, custom: input.custom as Record<string, string>, status: input.status as "draft" | "issued" });
    } else if (body.action === "download" || body.action === "preview") {
      let bytes: Uint8Array;
      if (body.action === "download") bytes = await service.download(String(input.id));
      else { const version = await repo.call<{ originalKey: string; format: string }>(agencyId, "version", { id: input.id });
        if (version.format !== "pdf") throw new DocumentFault("unsupported"); bytes = await store.get(version.originalKey); await pdf(bytes); }
      const response = new NextResponse(Buffer.from(bytes), { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="contrat.pdf"' } });
      for (const c of pending) response.cookies.set(c.name, c.value, c.options ?? {}); return response;
    } else throw new DocumentFault("invalid");
    return reply({ ok: true, value });
  } catch (error) {
    const code = error instanceof DocumentFault ? error.code : "unavailable";
    return reply({ ok: false, code }, code === "quota" ? 429 : code === "restricted" ? 402 : code === "forbidden" ? 403 : code === "not-found" ? 404 : code === "conflict" ? 409 : code === "unavailable" ? 503 : 422);
  }
}
