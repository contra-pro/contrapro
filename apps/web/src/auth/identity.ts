import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAgencyAccess, type AgencyAccess } from "../../../../packages/application/src/agency-access";
import { AUTH_PROJECT_URL } from "./config";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** getUser validates with the Auth server; getClaims verifies the JWT and its expiry.
 * Neither browser metadata nor a decoded getSession payload establishes identity.
 */
export async function verifiedSubject(client: SupabaseClient, now = Date.now()) {
  if (!Number.isFinite(now)) return null;
  const user = await client.auth.getUser();
  if (user.error || !user.data.user) return null;
  const verified = await client.auth.getClaims();
  const claims: unknown = verified.data?.claims;
  if (verified.error || !record(claims) || typeof claims.sub !== "string" || !uuid.test(claims.sub) ||
    claims.sub !== user.data.user.id || claims.iss !== `${AUTH_PROJECT_URL}/auth/v1` ||
    claims.aud !== "authenticated" || typeof claims.exp !== "number" ||
    !Number.isSafeInteger(claims.exp) || !Number.isSafeInteger(claims.exp * 1000) || claims.exp * 1000 <= now) return null;
  return { subject: claims.sub, expiresAt: claims.exp * 1000 };
}

/** Fixed SECURITY INVOKER RPC, called with this request's verified user JWT and public key.
 * RLS, not an admin connection, restricts the mapping/membership read to auth.uid().
 * Runtime gate defaults closed until separately authorized restricted-user tests pass.
 */
export type AgencyContext = {
  access: AgencyAccess;
  canonical: { userId: string; subject: string; expiresAt: number } | null;
  choices: { agencyId: string; name: string }[];
};
const denied = (status: Exclude<AgencyAccess["status"], "authorized">): AgencyContext =>
  ({ access: { status }, canonical: null, choices: [] });

export async function supabaseAgencyContext(client: SupabaseClient, mappingVerified: boolean,
  now: () => number = Date.now, selection?: { userId: string; agencyId: string }): Promise<AgencyContext> {
  try {
    const identity = await verifiedSubject(client, now());
    if (!identity) return denied("signed-out");
    if (!mappingVerified) return denied("unavailable");
    const result = await client.rpc("contratpro_auth_access");
    if (result.error || !Array.isArray(result.data) || result.data.length > 100) return denied("unavailable");
    if (result.data.length === 0) return denied("unmapped");
    const rows: unknown[] = result.data;
    const first = rows[0];
    if (!record(first) || typeof first.user_id !== "string" || !uuid.test(first.user_id) ||
      first.user_id.toLowerCase() === identity.subject.toLowerCase()) return denied("forbidden");
    const memberships: { userId: unknown; agencyId: unknown; membershipId: unknown; agencyName: unknown; membershipState: unknown; agencyState: unknown }[] = [];
    for (const row of rows) {
      if (!record(row) || row.supabase_user_id !== identity.subject || row.user_id !== first.user_id ||
        row.user_state !== first.user_state) return denied("forbidden");
      if (row.membership_id === null && rows.length === 1 && row.agency_id === null &&
        row.agency_name === null && row.membership_state === null && row.agency_state === null) continue;
      memberships.push({ userId: row.user_id, agencyId: row.agency_id, membershipId: row.membership_id,
        agencyName: row.agency_name, membershipState: row.membership_state, agencyState: row.agency_state });
    }
    const access = await resolveAgencyAccess({ session: async () => ({ userId: first.user_id,
      userState: first.user_state, expiresAt: identity.expiresAt }),
    memberships: async () => memberships, now,
    ...(selection?.userId === first.user_id ? { selectedAgencyId: selection.agencyId } : {}) });
    if (!["authorized", "selection-required", "onboarding"].includes(access.status)) return { access, canonical: null, choices: [] };
    return { access, canonical: { userId: first.user_id, subject: identity.subject, expiresAt: identity.expiresAt },
      choices: memberships.filter(row => row.membershipState === "active" && row.agencyState === "active")
        .map(row => ({ agencyId: row.agencyId as string, name: row.agencyName as string })) };
  } catch { return denied("unavailable"); }
}

export async function supabaseAgencyAccess(client: SupabaseClient, mappingVerified: boolean,
  now: () => number = Date.now): Promise<AgencyAccess> {
  return (await supabaseAgencyContext(client, mappingVerified, now)).access;
}
