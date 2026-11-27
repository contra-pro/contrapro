import "server-only";
import { componentAuthClient } from "../auth/server";
import { getAgencyContext } from "./agency-access";
import { overviewModules, overviewResult, type Overview } from "../components/operational-model";
import type { SupabaseClient } from "@supabase/supabase-js";

/** At most four read-only RPCs; no provider runtime, credentials or mutation API. */
export async function operationalDashboard(agencyId: string, at: number): Promise<Overview> {
  const gates = { rentals: "RENTALS", signing: "SIGNING", delivery: "DELIVERY", sheets: "SHEETS" } as const;
  const result = Object.fromEntries(overviewModules.map(key => [key, { status: "unavailable" }])) as Overview;
  const enabled = overviewModules.filter(key => process.env[`CONTRATPRO_${gates[key]}_VERIFIED`] === "true");
  if (!enabled.length) return result;
  let client: SupabaseClient;
  try {
    const context = await getAgencyContext();
    if (context.access.status !== "authorized" || context.access.agencyId !== agencyId || !context.canonical || context.canonical.userId !== context.access.userId) return result;
    client = await componentAuthClient();
  } catch { for (const key of enabled) result[key] = { status: "error" }; return result; }
  await Promise.all(enabled.map(async module => {
    try {
      const { data, error } = await client.rpc("contratpro_dashboard", { p_agency_id: agencyId, p_module: module, p_at: new Date(at).toISOString() });
      result[module] = error ? { status: error.code === "42501" ? "restricted" : "error" } : overviewResult(module, data);
    } catch { result[module] = { status: "error" }; }
  }));
  return result;
}
