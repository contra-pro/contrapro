import type { VehicleDraft } from "./vehicle-draft";
export type VehicleRecord = VehicleDraft & { id: string; version: number };
export type VehiclePermissions = { read: boolean; create: boolean; update: boolean };
export type VehiclePage = { items: VehicleRecord[]; total: number; page: number };
export const vehiclePageSize = 20;
export const vehicleVersionLimit = 2147483647;
export function validVehiclePage(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= 10000;
}
