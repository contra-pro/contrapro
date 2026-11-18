import type { SupabaseClient } from "@supabase/supabase-js";
import { isRecord, isUuid } from "../../../../packages/application/src/agency-management";
import { validateVehicleDraft, vehicleDraftFields } from "../../../../packages/application/src/vehicle-draft";
import { vehiclePageSize, vehicleVersionLimit, validVehiclePage, type VehicleRecord, type VehiclePermissions, type VehiclePage } from "../../../../packages/application/src/vehicles";
export type VehicleFailure = "forbidden" | "not-found" | "conflict" | "unavailable" | "invalid" | "uncertain";
export class VehicleFault extends Error { constructor(public readonly code: VehicleFailure) { super(code); } }
export async function vehicleRpc(client: SupabaseClient, name: string, args: Record<string, unknown>): Promise<unknown> {
  const result = await client.rpc(name, args);
  if (result.error) {
    const code: unknown = result.error.code;
    throw new VehicleFault(code === "42501" ? "forbidden" : code === "P0002" ? "not-found" : code === "40001" || code === "23505" ? "conflict" : code === "22023" ? "invalid" : "unavailable");
  }
  return result.data as unknown;
}
export async function vehiclePermissions(client: SupabaseClient, agencyId: string): Promise<VehiclePermissions> {
  const data = await vehicleRpc(client, "contratpro_vehicles_permissions", { p_agency_id: agencyId });
  if (!isRecord(data) || Object.keys(data).sort().join() !== "create,read,update" || !["read", "create", "update"].every(key => typeof data[key] === "boolean")
    || (!data.read && (data.create || data.update))) throw new VehicleFault("unavailable");
  return { read: data.read as boolean, create: data.create as boolean, update: data.update as boolean };
}
function parseVehicle(data: unknown, agencyId: string): VehicleRecord {
  if (!isRecord(data) || data.agencyId !== agencyId || !isUuid(data.id) || typeof data.version !== "number" || !Number.isSafeInteger(data.version) || data.version < 1 || data.version > vehicleVersionLimit
    || Object.keys(data).sort().join() !== [...vehicleDraftFields, "id", "agencyId", "version"].sort().join()) throw new VehicleFault("unavailable");
  const parsed = validateVehicleDraft(Object.fromEntries(vehicleDraftFields.map(field => [field, data[field]])));
  if (!parsed.ok) throw new VehicleFault("unavailable");
  return { ...parsed.value, id: data.id, version: data.version };
}
export async function vehicleDetail(client: SupabaseClient, agencyId: string, id: string): Promise<VehicleRecord | null> {
  const data = await vehicleRpc(client, "contratpro_vehicle_detail", { p_agency_id: agencyId, p_id: id });
  if (data === null) return null;
  const vehicle = parseVehicle(data, agencyId); if (vehicle.id !== id) throw new VehicleFault("unavailable");
  return vehicle;
}
export async function listVehicles(client: SupabaseClient, agencyId: string, page: number): Promise<VehiclePage> {
  if (!validVehiclePage(page)) throw new VehicleFault("invalid");
  const data = await vehicleRpc(client, "contratpro_vehicles_list", { p_agency_id: agencyId, p_page: page });
  if (!isRecord(data) || Object.keys(data).sort().join() !== "items,total" || !Array.isArray(data.items) || data.items.length > vehiclePageSize
    || typeof data.total !== "number" || !Number.isSafeInteger(data.total) || data.total < data.items.length
    || (data.items.length && data.total < (page - 1) * vehiclePageSize + data.items.length)) throw new VehicleFault("unavailable");
  const items = data.items.map(row => parseVehicle(row, agencyId));
  if (new Set(items.map(row => row.id)).size !== items.length) throw new VehicleFault("unavailable");
  return { items, total: data.total, page };
}
