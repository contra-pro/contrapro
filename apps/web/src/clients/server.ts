import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyAccess } from "../../../../packages/application/src/agency-access";
import type { ClientPermissions } from "../../../../packages/application/src/clients";
import { getAgencyContext } from "../server/agency-access";
import { componentAuthClient } from "../auth/server";
import { clientPermissions } from "./data";
export type ClientScope = { status: "ready"; agencyId: string; permissions: ClientPermissions; client: SupabaseClient }
  | { status: "access"; access: AgencyAccess } | { status: "unavailable" | "forbidden" };
export async function getClientScope(): Promise<ClientScope> {
  try {
    const context = await getAgencyContext();
    if (context.access.status !== "authorized") return { status: "access", access: context.access };
    if (!context.canonical) return { status: "forbidden" };
    if (process.env.CONTRATPRO_CLIENTS_VERIFIED !== "true") return { status: "unavailable" };
    const client = await componentAuthClient();
    const permissions = await clientPermissions(client, context.access.agencyId);
    return permissions.read ? { status: "ready", agencyId: context.access.agencyId, permissions, client } : { status: "forbidden" };
  } catch { return { status: "unavailable" }; }
}
