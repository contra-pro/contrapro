import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifiedSubject } from "./identity";

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
    return identity.expiresAt > now() ? result.data : "uncertain";
  } catch { return attempted ? "uncertain" : "unavailable"; }
}
