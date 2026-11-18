import { isRecord } from "./agency-management";

/** Local preparation only: not a persisted vehicle or a vehicle-write permission. */
export const vehicleDraftFields = ["registration", "make", "model", "year", "mileage"] as const;
export type VehicleDraftField = typeof vehicleDraftFields[number];
export type VehicleDraft = Record<VehicleDraftField, string>;
export type VehicleDraftErrors = Partial<Record<VehicleDraftField | "form", "required" | "invalid" | "too-long">>;
export const vehicleDraftLimits: Record<VehicleDraftField, number> = { registration: 24, make: 80, model: 80, year: 4, mileage: 7 };
export const emptyVehicleDraft: VehicleDraft = { registration: "", make: "", model: "", year: "", mileage: "" };

export function validateVehicleDraft(input: unknown, currentYear = new Date().getUTCFullYear()):
  { ok: true; value: VehicleDraft } | { ok: false; errors: VehicleDraftErrors } {
  if (!isRecord(input) || Object.keys(input).some(key => !vehicleDraftFields.includes(key as VehicleDraftField))
    || !Number.isInteger(currentYear) || currentYear < 1900 || currentYear > 9998) return { ok: false, errors: { form: "invalid" } };
  const value = { ...emptyVehicleDraft }; const errors: VehicleDraftErrors = {};
  for (const field of vehicleDraftFields) {
    const raw = input[field];
    if (raw === undefined || raw === "") { errors[field] = "required"; continue; }
    if (typeof raw !== "string" || /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(raw)) { errors[field] = "invalid"; continue; }
    const text = raw.trim(); value[field] = text;
    if (!text) errors[field] = "required";
    else if (text.length > vehicleDraftLimits[field]) errors[field] = "too-long";
  }
  // Generic format checks only; no assertion of registration uniqueness or legal validity.
  if (value.registration && !/^[\p{L}\p{N}][\p{L}\p{N} /-]*$/u.test(value.registration)) errors.registration = "invalid";
  if (value.year && (!/^\d{4}$/.test(value.year) || Number(value.year) < 1900 || Number(value.year) > currentYear + 1)) errors.year = "invalid";
  if (value.mileage && !/^(0|[1-9][0-9]{0,6})$/.test(value.mileage)) errors.mileage = "invalid";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

export type VehicleDraftState = { values: VehicleDraft; errors: VehicleDraftErrors; review: VehicleDraft | null };
export const initialVehicleDraftState: VehicleDraftState = { values: emptyVehicleDraft, errors: {}, review: null };
export type VehicleDraftAction = { type: "edit"; field: VehicleDraftField; value: string } | { type: "review"; currentYear: number }
  | { type: "back" } | { type: "clear" };
export function vehicleDraftReducer(state: VehicleDraftState, action: VehicleDraftAction): VehicleDraftState {
  if (action.type === "clear") return { values: { ...emptyVehicleDraft }, errors: {}, review: null };
  if (action.type === "back") return { ...state, review: null };
  if (action.type === "edit") return { values: { ...state.values, [action.field]: action.value }, errors: {}, review: null };
  const result = validateVehicleDraft(state.values, action.currentYear);
  return result.ok ? { values: result.value, errors: {}, review: result.value } : { ...state, errors: result.errors, review: null };
}
