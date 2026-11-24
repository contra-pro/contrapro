import { calculateRentalPrice, type RentalPrice } from "./pricing";
import { parseRentalInterval, type RentalInterval } from "./timestamps";

const fields = ["clientId", "vehicleId", "start", "end", "dailyRateMinor", "depositMinor"] as const;
type Field = typeof fields[number];
export type RentalCreateError = Readonly<{
  field: Field | "form" | "period" | "pricing";
  code: "required" | "invalid" | "unknown-fields" | "out-of-range";
}>;
export type NormalizedRentalCreate = Readonly<RentalInterval & RentalPrice & {
  clientId: string;
  vehicleId: string;
}>;
export type RentalCreateValidation =
  | { ok: true; value: NormalizedRentalCreate }
  | { ok: false; errors: readonly RentalCreateError[] };

// PostgreSQL uuid input accepts braces, case and optional hyphens after groups of
// four hex digits. No UUID version/variant restriction or existence claim.
function normalizeUuid(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 41) return null;
  const value = input.startsWith("{") && input.endsWith("}") ? input.slice(1, -1) : input;
  const match = /^[0-9a-f]{4}(?:-?[0-9a-f]{4}){7}$/i.exec(value);
  if (!match || match[0] !== value) return null;
  const hex = value.replaceAll("-", "").toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Validates p_details business fields only, not p_agency_id or p_key.
 * Expects an already-decoded JSON-shaped record with numeric centimes; returns
 * an internal bigint value, not an RPC/JSON payload. No I/O or authorization.
 * Timestamp narrowing and decoded-number limitations are documented separately.
 */
export function validateRentalCreateInput(input: unknown): RentalCreateValidation {
  const fail = (field: RentalCreateError["field"], code: RentalCreateError["code"]): RentalCreateValidation =>
    ({ ok: false, errors: [{ field, code }] });
  if (input === null || typeof input !== "object" || Array.isArray(input)) return fail("form", "invalid");
  const prototype: unknown = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return fail("form", "invalid");
  const keys = Reflect.ownKeys(input);
  if (keys.some(key => typeof key !== "string" || !fields.includes(key as Field))) {
    return fail("form", "unknown-fields");
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const values: Partial<Record<Field, unknown>> = {};
  const errors: RentalCreateError[] = [];
  for (const field of fields) {
    const descriptor = descriptors[field];
    if (!descriptor) {
      if (field !== "depositMinor") errors.push({ field, code: "required" });
    } else if (!("value" in descriptor) || !descriptor.enumerable) {
      // Do not execute getters, toJSON or other user code to coerce input.
      errors.push({ field, code: "invalid" });
    } else {
      values[field] = descriptor.value;
    }
  }
  if (errors.length) return { ok: false, errors };

  const clientId = normalizeUuid(values.clientId);
  const vehicleId = normalizeUuid(values.vehicleId);
  if (clientId === null) errors.push({ field: "clientId", code: "invalid" });
  if (vehicleId === null) errors.push({ field: "vehicleId", code: "invalid" });
  for (const field of ["start", "end"] as const) {
    if (typeof values[field] !== "string" || values[field].length > 32) errors.push({ field, code: "invalid" });
  }
  for (const field of ["dailyRateMinor", "depositMinor"] as const) {
    if (field === "depositMinor" && !descriptors.depositMinor) continue;
    if (typeof values[field] !== "number" || !Number.isSafeInteger(values[field])) {
      errors.push({ field, code: "invalid" });
    }
  }
  if (errors.length || clientId === null || vehicleId === null) return { ok: false, errors };

  let interval: RentalInterval;
  try {
    interval = parseRentalInterval(values.start, values.end);
  } catch (error) {
    if (error instanceof RangeError || error instanceof TypeError) return fail("period", "invalid");
    throw error;
  }
  let price: RentalPrice;
  try {
    price = calculateRentalPrice({ ...interval,
      dailyRateMinor: BigInt(values.dailyRateMinor as number),
      depositMinor: descriptors.depositMinor ? BigInt(values.depositMinor as number) : 0n });
  } catch (error) {
    if (error instanceof RangeError) return fail("pricing", "out-of-range");
    throw error;
  }
  return { ok: true, value: { clientId, vehicleId, ...interval, ...price } };
}
