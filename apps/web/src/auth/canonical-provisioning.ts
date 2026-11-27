import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifiedSubject } from "./identity";
import {provisionRegistrationProfile} from '../registration/provision-profile';

type Result = "blocked" | "created" | "existing" | "unavailable" | "uncertain";
/** Invoked by the gated same-origin POST handler, never the OAuth GET callback.
 * The unapplied RPC also denies authenticated EXECUTE.
 */
export async function provisionCanonicalIdentity(client: SupabaseClient,
  enabled = process.env.CONTRATPRO_CANONICAL_PROVISIONING_VERIFIED === "true", now = Date.now): Promise<Result> {
  if (!enabled) return "blocked";
  let attempted = false;
  try {
    const identity = await verifiedSubject(client, now());
    if (!identity || !(identity.expiresAt > now())) return "blocked";
    attempted = true;
    const result = await client.rpc("contratpro_provision_identity");
    if (result.error || (result.data !== "created" && result.data !== "existing")) return "uncertain";
    if(!(identity.expiresAt>now()))return 'uncertain';
    // Metadata supplies validated content only. Legal evidence additionally needs a server MAC and verified email.
    if(!await provisionRegistrationProfile(client,identity.subject,now()))return 'uncertain';
    return identity.expiresAt>now()?result.data:'uncertain';
  } catch { return attempted ? "uncertain" : "unavailable"; }
}
