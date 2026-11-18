import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyAccess } from "../../../../packages/application/src/agency-access";
import type { VehiclePermissions } from "../../../../packages/application/src/vehicles";
import { getAgencyContext } from "../server/agency-access";
import { componentAuthClient } from "../auth/server";
import { vehiclePermissions } from "./data";
export type VehicleScope = { status: "ready"; agencyId: string; permissions: VehiclePermissions; client: SupabaseClient }
  | { status: "access"; access: AgencyAccess } | { status: "unavailable" | "forbidden" };
export async function getVehicleScope(): Promise<VehicleScope> {
  try {
    const context = await getAgencyContext();
    if (context.access.status !== "authorized") return { status: "access", access: context.access };
    if (!context.canonical || context.canonical.userId !== context.access.userId) return { status: "forbidden" };
    if (process.env.CONTRATPRO_VEHICLES_VERIFIED !== "true") return { status: "unavailable" };
    const client = await componentAuthClient(); const permissions = await vehiclePermissions(client, context.access.agencyId);
    return permissions.read ? { status: "ready", agencyId: context.access.agencyId, permissions, client } : { status: "forbidden" };
  } catch { return { status: "unavailable" }; }
}
