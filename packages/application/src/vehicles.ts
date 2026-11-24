import { validateVehicleDraft, vehicleDraftFields, type VehicleDraft, type VehicleDraftField } from "./vehicle-draft";
import { isRecord } from "./agency-management";
export const vehicleAttributeOptions = {
  category: ["unspecified", "economy", "compact", "sedan", "suv", "van", "luxury", "other"],
  fuelType: ["unspecified", "petrol", "diesel", "hybrid", "electric", "lpg", "other"],
  transmission: ["unspecified", "manual", "automatic"],
  rentalStatus: ["unknown", "available", "rented", "maintenance", "unavailable"],
} as const;
export type VehicleAttribute = keyof typeof vehicleAttributeOptions;
export type VehicleAttributes = { [K in VehicleAttribute]: typeof vehicleAttributeOptions[K][number] };
export const vehicleAttributeDefaults: VehicleAttributes = { category: "unspecified", fuelType: "unspecified", transmission: "unspecified", rentalStatus: "unknown" };
export const vehicleAttributeFields = Object.keys(vehicleAttributeOptions) as VehicleAttribute[];
export const vehicleInputFields = [...vehicleDraftFields, ...vehicleAttributeFields];
export type VehicleInput = VehicleDraft & VehicleAttributes;
export type VehicleErrors = Partial<Record<VehicleDraftField | VehicleAttribute | "form", "required" | "invalid" | "too-long">>;
export function validateVehicleInput(input: unknown, currentYear = new Date().getUTCFullYear()):
  { ok: true; value: VehicleInput } | { ok: false; errors: VehicleErrors } {
  if (!isRecord(input) || Object.keys(input).some(key => !vehicleInputFields.includes(key as typeof vehicleInputFields[number]))) return { ok: false, errors: { form: "invalid" } };
  const basic = validateVehicleDraft(Object.fromEntries(vehicleDraftFields.map(field => [field, input[field]])), currentYear);
  const attributes = { ...vehicleAttributeDefaults }, errors: VehicleErrors = basic.ok ? {} : { ...basic.errors };
  for (const field of vehicleAttributeFields) {
    const value = Object.hasOwn(input, field) ? input[field] : vehicleAttributeDefaults[field];
    if (typeof value !== "string" || !(vehicleAttributeOptions[field] as readonly string[]).includes(value)) errors[field] = "invalid";
    else Object.assign(attributes, { [field]: value });
  }
  return basic.ok && !Object.keys(errors).length ? { ok: true, value: { ...basic.value, ...attributes } } : { ok: false, errors };
}
export type VehicleRecord = VehicleInput & { id: string; version: number };
export type VehiclePermissions = { read: boolean; create: boolean; update: boolean; archive: boolean };
export type VehiclePage = { items: VehicleRecord[]; total: number; page: number; search?: string };
export const vehiclePageSize = 20;
export const vehicleVersionLimit = 2147483647;
export function validVehiclePage(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= 10000;
}
export function validVehicleSearch(value: unknown): value is string {
  return typeof value === "string" && value.length <= 100 && !/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value);
}
