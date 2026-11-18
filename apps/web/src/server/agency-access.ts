import "server-only";
import { componentAuthClient } from "../auth/server";
import { supabaseAgencyContext, type AgencyContext } from "../auth/identity";
import { cookies } from "next/headers";
import { readSelection, selectionCookie } from "../agency/selection";

export async function getAgencyAccess() {
  return (await getAgencyContext()).access;
}

export async function getAgencyContext(): Promise<AgencyContext> {
  try {
    const client = await componentAuthClient();
    const selection = readSelection((await cookies()).get(selectionCookie)?.value);
    return await supabaseAgencyContext(client, process.env.CONTRATPRO_AUTH_ACCESS_VERIFIED === "true", Date.now, selection);
  } catch { return { access: { status: "unavailable" }, canonical: null, choices: [] }; }
}
