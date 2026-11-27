import "server-only";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CookieMethodsServer } from "@supabase/ssr";
import { appOrigin } from "../auth/config";
import { serverAuthClient } from "../auth/server";
import { supabaseAgencyContext, type AgencyContext } from "../auth/identity";
import { readSelection, selectionCookie } from "../agency/selection";
import { isLocale } from "../i18n/locales";
import { isRecord, isUuid } from "../../../../packages/application/src/agency-management";
import { validateRentalCreateInput } from "../../../../packages/domain/src/rentals/create-input";
import { brandingInput, locationInput, paymentInput, shape, OperationFault } from "./model";
import { SupabaseOperationsRepository, type OperationsRepository } from "./repository";
import { invitationDigest, teamInvitation } from "./invitation";
import { saveLogo } from "./logo";
import { email } from "../delivery/model";
import { queueTeamEmail } from "../delivery/team";
import { deliveryConfig } from "../delivery/runtime";
import {pendingInvitationCookie} from '../registration/invitation';
type Dependencies = { ready(): boolean; secret(): string; origin(): string; delivery?():{encryptionKey:string;keyId:string};client(cookies: CookieMethodsServer): SupabaseClient; context(client: SupabaseClient, selection?: { userId: string; agencyId: string }): Promise<AgencyContext>; repository(client: SupabaseClient, secret: string): OperationsRepository };
const production: Dependencies = { ready: () => process.env.CONTRATPRO_A1_VERIFIED === "true", secret: () => process.env.CONTRATPRO_AGENCY_OPERATIONS_SECRET ?? "", origin: () => appOrigin(process.env.CONTRATPRO_APP_ORIGIN), client: serverAuthClient,
  context: (client, selection) => supabaseAgencyContext(client, process.env.CONTRATPRO_AUTH_ACCESS_VERIFIED === "true", Date.now, selection), repository: (client, secret) => new SupabaseOperationsRepository(client, secret), delivery:()=>deliveryConfig(true) };
async function body(request: NextRequest) {
  if (!request.body || request.headers.get("content-type")?.split(";")[0] !== "application/json") throw new OperationFault("invalid");
  const reader = request.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const p = await reader.read(); if (p.done) break; size += p.value.length; if (size > 400000) { void reader.cancel().catch(() => {}); throw new OperationFault("invalid"); } chunks.push(p.value); }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))) as unknown;
  } catch { throw new OperationFault("invalid"); } finally { reader.releaseLock(); }
}
const shapes: Record<string, string[]> = {
  team: [], branding: [], rental: ["rentalId"], invite: ["requestId", "email", "roleId"], accept: ["token"], "invite-revoke": ["requestId", "invitationId"], "invite-email":["requestId","invitationId"],
  "member-state": ["requestId", "membershipId", "revision", "state"], "member-role": ["requestId", "membershipId", "revision", "roleId"], "signer-grant": ["requestId", "membershipId", "revision", "enabled", "name"],
  "role-save": ["requestId", "roleId", "key", "name", "permissions"], "branding-save": ["requestId", "revision", "profile"], "logo-upload": ["requestId", "revision", "data"], "logo-remove": ["requestId", "revision"],
  "rental-create": ["requestId", "details", "locations"], locations: ["requestId", "rentalId", "revision", "locations"], "signer-select": ["requestId", "rentalId", "revision", "membershipId"], payment: ["requestId", "rentalId", "revision", "payment"],
};
export async function handleOperations(request: NextRequest, locale: string, deps: Dependencies = production) {
  const pending: { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }[] = [];
  const reply = (value: object, status = 200) => { const r = NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" } }); for (const c of pending) r.cookies.set(c.name, c.value, c.options ?? {}); return r; };
  try {
    if (!isLocale(locale)) throw new OperationFault("not-found"); const origin = appOrigin(deps.origin());
    if (request.method !== "POST" || request.nextUrl.origin !== origin || request.headers.get("origin") !== origin) throw new OperationFault("forbidden");
    if (!deps.ready() || !/^[a-f0-9]{64}$/.test(deps.secret())) throw new OperationFault("unavailable");
    const parsed = await body(request); shape(parsed, ["action", "input"]);
    if (typeof parsed.action !== "string" || !Object.hasOwn(shapes, parsed.action)) throw new OperationFault("invalid");
    const action = parsed.action; shape(parsed.input, shapes[action]!); const p = { ...parsed.input };
    for (const k of ["requestId", "membershipId", "roleId", "rentalId", "invitationId"]) if (k in p && !isUuid(p[k])) throw new OperationFault("invalid");
    if ("revision" in p && (typeof p.revision !== "number" || !Number.isInteger(p.revision) || p.revision < 0 || p.revision >= 2147483647)) throw new OperationFault("invalid");
    if (action === "member-state" && !["active", "revoked"].includes(String(p.state))) throw new OperationFault("invalid");
    if (action === "signer-grant" && (typeof p.enabled !== "boolean" || typeof p.name !== "string" || !p.name.trim() || p.name.length > 200 || /[\u0000-\u001f]/.test(p.name))) throw new OperationFault("invalid");
    if (action === "role-save" && (typeof p.key !== "string" || !/^[a-z][a-z0-9_.-]{0,63}$/.test(p.key) || typeof p.name !== "string" || !p.name.trim() || p.name.length > 100 || !Array.isArray(p.permissions) || p.permissions.length > 100 || new Set(p.permissions).size !== p.permissions.length || p.permissions.some(v => typeof v !== "string" || !/^[a-z][a-z0-9_.-]{0,63}$/.test(v)))) throw new OperationFault("invalid");
    if ("locations" in p) p.locations = locationInput(p.locations);
    if (action === "payment") p.payment = paymentInput(p.payment);
    if (action === "branding-save") p.profile = brandingInput(p.profile);
    if (action === "rental-create" && !validateRentalCreateInput(p.details).ok) throw new OperationFault("invalid");
    const client = deps.client({ getAll: () => request.cookies.getAll(), setAll: values => { for (const c of values) { request.cookies.set(c.name, c.value); pending.push(c); } } });
    const context = await deps.context(client, readSelection(request.cookies.get(selectionCookie)?.value));
    if (!context.canonical) throw new OperationFault("forbidden");
    const repo = deps.repository(client, deps.secret());
    if (action === "accept") {
      if (typeof p.token !== "string") throw new OperationFault("invalid"); const digest = invitationDigest(p.token);
      // The gateway MAC binds a freshly verified Auth email, never a submitted
      // email/user ID or user-editable metadata. Canonical identity is rechecked in SQL.
      const user = await client.auth.getUser();
      if (user.error || user.data.user?.id !== context.canonical.subject || !user.data.user.email_confirmed_at || !user.data.user.email) throw new OperationFault("forbidden");
      const value=await repo.call(null, "accept", { digest, verifiedEmail: user.data.user.email });
      pending.push({name:pendingInvitationCookie,value:'',options:{path:'/',httpOnly:true,sameSite:'lax',secure:origin.startsWith('https:'),maxAge:0}});
      return reply({ ok: true, value });
    }
    if (context.access.status !== "authorized" || context.access.userId !== context.canonical.userId) throw new OperationFault("forbidden");
    const agencyId = context.access.agencyId;
    if(action==="invite-email"){
      if(!deps.delivery||!origin.startsWith("https://"))throw new OperationFault("unavailable");
      return reply({ok:true,value:await queueTeamEmail(repo,agencyId,String(p.invitationId),String(p.requestId),locale,origin,deps.secret(),deps.delivery())});
    }
    if (action === "invite") {
      const recipient = email(p.email).toLowerCase(), invitation = teamInvitation(deps.secret(), agencyId, String(p.requestId));
      const value = await repo.call<Record<string, unknown>>(agencyId, "invite", { ...p, email: recipient, digest: invitation.digest });
      return reply({ ok: true, value: { ...value, url: `${origin}/${locale}/app/team/accept#token=${invitation.token}`, delivery: "prepared-not-sent" } });
    }
    if (action === "logo-upload") {
      if (typeof p.data !== "string") throw new OperationFault("invalid");
      return reply({ ok: true, value: await saveLogo(client, repo, agencyId, { requestId: String(p.requestId), revision: Number(p.revision), data: p.data }) });
    }
    return reply({ ok: true, value: await repo.call(agencyId, action, p) });
  } catch (e) { const code = e instanceof OperationFault ? e.code : isRecord(e) && e.code === "invalid" ? "invalid" : "unavailable"; return reply({ ok: false, code }, code === "forbidden" ? 403 : code === "not-found" ? 404 : code === "invalid" || code === "expired" ? 422 : code === "conflict" ? 409 : code === "quota" ? 429 : code === "restricted" ? 402 : 503); }
}
