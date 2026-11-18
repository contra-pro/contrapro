import type { SupabaseClient } from "@supabase/supabase-js";
import { isRecord, validateAgencyProfile, validateAgencySettings, type AgencyProfile, type AgencySettings } from "../../../../packages/application/src/agency-management";

export type ManagedAgency = { agencyId: string; isOwner: boolean; profile: AgencyProfile; settings: AgencySettings };
export async function readAgencyProfile(client: SupabaseClient, agencyId: string): Promise<ManagedAgency | null> {
  const result = await client.rpc("contratpro_agency_profile", { p_agency_id: agencyId });
  if (result.error || !Array.isArray(result.data) || result.data.length !== 1) return null;
  const row: unknown = result.data[0];
  if (!isRecord(row) || row.agency_id !== agencyId || typeof row.is_owner !== "boolean" || !isRecord(row.profile) || !isRecord(row.settings)) return null;
  const settings = validateAgencySettings(row.settings);
  // Legacy agencies may not have profile details yet; blank fields remain visible for completion.
  const normalized = Object.fromEntries(Object.entries(row.profile).map(([key, value]) => [key, value === null ? "" : value]));
  if (typeof normalized.name !== "string" || !normalized.name.trim()) return null;
  const checked = validateAgencyProfile(normalized);
  if (!settings.ok || (!checked.ok && Object.values(checked.errors).some(error => error !== "required"))) return null;
  if (!["name", "ice", "ifNumber", "rc", "address", "city", "phone", "email"].every(key => typeof normalized[key] === "string")) return null;
  return { agencyId, isOwner: row.is_owner, profile: normalized as AgencyProfile, settings: settings.value };
}
