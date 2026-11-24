import type { SupabaseClient } from "@supabase/supabase-js";
import { isRecord, isUuid } from "../../../../packages/application/src/agency-management";
import { readRentalDetail, type RentalState } from "../../../../packages/application/src/rentals/detail";
import { parseRentalTimestamp } from "../../../../packages/domain/src/rentals/timestamps";
export const rentalStates: readonly RentalState[] = ["brouillon", "confirme", "en_cours", "termine", "annule"];
export type RentalFailure = "forbidden" | "not-found" | "invalid" | "conflict" | "unavailable" | "uncertain" | "quota" | "restricted";
export class RentalFault extends Error { constructor(readonly code: RentalFailure) { super(code); } }
export const validPage = (page: unknown): page is number => typeof page === "number" && Number.isInteger(page) && page >= 1 && page <= 10000;
export async function rentalRpc(client: SupabaseClient, name: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new RentalFault(error.code === "PBL01" ? "quota" : error.code === "PBL02" ? "restricted" : error.code === "42501" ? "forbidden" : error.code === "P0002" ? "not-found" :
    ["40001", "23P01", "23505"].includes(error.code) ? "conflict" : error.code === "22023" ? "invalid" : "unavailable");
  return data as unknown;
}
export async function rentalCapabilities(client: SupabaseClient, agencyId: string) {
  const data = await rentalRpc(client, "contratpro_rental_capabilities", { p_agency_id: agencyId });
  if (!isRecord(data) || Object.keys(data).sort().join() !== "contractVersion,read,write" || data.contractVersion !== 2 || data.read !== true || data.write !== true) throw new RentalFault("unavailable");
}
export type RentalSummary = { id: string; contract_number: string | null; state: RentalState; starts_at: string; ends_at: string; client_id: string; vehicle_id: string; version: number };
export type RentalPage = { items: RentalSummary[]; total: number };
export type RentalView = RentalSummary & { agency_id: string; secondaryClientId: string | null; daily_rate_minor: string; deposit_minor: string; total_minor: string; billable_days: number; physicalUnavailable: boolean; overdueConflict: boolean };
export type RentalChoice = { id: string; label: string };
function summary(value: unknown): RentalSummary {
  if (!isRecord(value) || !isUuid(value.id) || !isUuid(value.client_id) || !isUuid(value.vehicle_id) || !rentalStates.includes(value.state as RentalState)
    || typeof value.version !== "number" || !Number.isInteger(value.version) || value.version < 1 || value.version > 2147483647
    || !(value.contract_number === null || typeof value.contract_number === "string" && /^CTR-[0-9]{1,4}-[0-9]{4,19}$/.test(value.contract_number))
    || typeof value.starts_at !== "string" || typeof value.ends_at !== "string") throw new RentalFault("unavailable");
  try { if (parseRentalTimestamp(value.starts_at) >= parseRentalTimestamp(value.ends_at)) throw Error(); } catch { throw new RentalFault("unavailable"); }
  return value as RentalSummary;
}
export async function rentalList(client: SupabaseClient, agencyId: string, page: number): Promise<RentalPage> {
  if (!validPage(page)) throw new RentalFault("invalid");
  const data = await rentalRpc(client, "contratpro_rental_list", { p_agency_id: agencyId, p_page: page });
  if (!isRecord(data) || !Array.isArray(data.items) || data.items.length > 20 || typeof data.total !== "number" || !Number.isSafeInteger(data.total)
    || data.total < data.items.length || (data.items.length > 0 && data.total < (page - 1) * 20 + data.items.length)) throw new RentalFault("unavailable");
  const items = data.items.map(summary);
  if (new Set(items.map(item => item.id)).size !== items.length) throw new RentalFault("unavailable");
  return { items, total: data.total };
}
export async function rentalDetail(client: SupabaseClient, agencyId: string, id: string): Promise<RentalView | null> {
  const data = await rentalRpc(client, "contratpro_rental_detail_v2", { p_agency_id: agencyId, p_id: id });
  if (data === null) return null;
  if (!isRecord(data)) throw new RentalFault("unavailable");
  const decoded = { ...data };
  if (decoded.secondaryClientId !== null && !isUuid(decoded.secondaryClientId)) throw new RentalFault("unavailable");
  const secondaryClientId = decoded.secondaryClientId as string | null; delete decoded.secondaryClientId;
  for (const field of ["daily_rate_minor", "deposit_minor", "total_minor", "number_serial"]) {
    if (decoded[field] === null && field === "number_serial") continue;
    if (typeof decoded[field] !== "string" || !/^(0|[1-9][0-9]{0,18})$/.test(decoded[field])) throw new RentalFault("unavailable");
    decoded[field] = BigInt(decoded[field]);
  }
  const checked = readRentalDetail(decoded, { agencyId, contractId: id });
  if (!checked.ok) throw new RentalFault("unavailable");
  const d = checked.value;
  return { id: d.id, agency_id: d.agencyId, secondaryClientId, client_id: d.clientId, vehicle_id: d.vehicleId, version: d.version, state: d.state,
    starts_at: d.startsAt.source, ends_at: d.endsAt.source, contract_number: d.contractNumber, daily_rate_minor: d.dailyRateMinor.toString(),
    deposit_minor: d.depositMinor.toString(), total_minor: d.totalMinor.toString(), billable_days: d.billableDays,
    physicalUnavailable: d.physicalUnavailable, overdueConflict: d.overdueConflict };
}
export async function rentalChoices(client: SupabaseClient, agencyId: string, kind: "client" | "vehicle", search: string, page: number) {
  const data = await rentalRpc(client, "contratpro_rental_choices", { p_agency_id: agencyId, p_kind: kind, p_search: search, p_page: page });
  if (!isRecord(data) || !Array.isArray(data.items) || data.items.length > 20 || typeof data.total !== "number" || !Number.isSafeInteger(data.total) || data.total < data.items.length) throw new RentalFault("unavailable");
  const items: RentalChoice[] = data.items.map((item: unknown) => {
    if (!isRecord(item) || !isUuid(item.id) || typeof item.label !== "string" || !item.label || item.label.length > 250) throw new RentalFault("unavailable");
    return { id: item.id, label: item.label };
  });
  return { items, total: data.total };
}
