import { validateRentalCreateInput, type NormalizedRentalCreate } from "./create-input";

export type RentalCreateRpcArguments = Readonly<{
  p_agency_id: string;
  p_key: string;
  p_details: Readonly<{
    clientId: string;
    vehicleId: string;
    start: string;
    end: string;
    dailyRateMinor: number;
    depositMinor: number;
  }>;
}>;
export type RentalCreateEncoding =
  | { ok: true; value: RentalCreateRpcArguments }
  | { ok: false; errors: readonly {
    field: "form" | "startMicroseconds" | "endMicroseconds" | "p_agency_id" | "p_key";
    code: "invalid" | "out-of-range";
  }[] };

const firstUtcMicrosecond = -62_135_596_800_000_000n;
const lastUtcMicrosecond = 253_402_300_799_999_999n;
const dayMicroseconds = 86_400_000_000n;
const fields = ["clientId", "vehicleId", "startMicroseconds", "endMicroseconds", "currency",
  "billableDays", "dailyRateMinor", "rentalTotalMinor", "depositMinor"] as const;

function daysBeforeYear(year: number): number {
  const previous = year - 1;
  return previous * 365 + Math.floor(previous / 4) - Math.floor(previous / 100) + Math.floor(previous / 400);
}

/** Internal formatter, called only after enforcing the bounded AD UTC range. */
function utcTimestamp(instant: bigint): string {
  const sinceFirstDay = instant - firstUtcMicrosecond;
  // At most 3,652,058 whole days; converting this quotient cannot lose precision.
  const day = Number(sinceFirstDay / dayMicroseconds);
  let low = 1;
  let high = 10_000;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (daysBeforeYear(middle) <= day) low = middle;
    else high = middle;
  }
  const year = low;
  let dayInYear = day - daysBeforeYear(year);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const months = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let month = 0;
  while (dayInYear >= months[month]!) dayInYear -= months[month++]!;
  const withinDay = sinceFirstDay % dayMicroseconds;
  const hour = withinDay / 3_600_000_000n;
  const minute = withinDay / 60_000_000n % 60n;
  const second = withinDay / 1_000_000n % 60n;
  const fraction = withinDay % 1_000_000n;
  const two = (value: number | bigint) => value.toString().padStart(2, "0");
  return `${String(year).padStart(4, "0")}-${two(month + 1)}-${two(dayInYear + 1)}T${two(hour)}:${two(minute)}:${two(second)}.${fraction.toString().padStart(6, "0")}Z`;
}

/**
 * Pure arguments for public.contratpro_rental_create; performs no RPC call.
 * Accepts pipeline output but revalidates it because the TS type is structural.
 * Agency/key syntax is not authorization or proof of an idempotency guarantee.
 */
export function encodeRentalCreateRequest(value: NormalizedRentalCreate, agencyId: string, key: string): RentalCreateEncoding {
  const fail = (field: "form" | "startMicroseconds" | "endMicroseconds" | "p_agency_id" | "p_key",
    code: "invalid" | "out-of-range" = "invalid"): RentalCreateEncoding => ({ ok: false, errors: [{ field, code }] });
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("form");
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return fail("form");
  const keys = Reflect.ownKeys(value);
  if (keys.length !== fields.length || keys.some(field => typeof field !== "string"
    || !fields.includes(field as typeof fields[number]))) return fail("form");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const snapshot = {} as Record<keyof NormalizedRentalCreate, unknown>;
  for (const field of fields) {
    const descriptor = descriptors[field];
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return fail("form");
    snapshot[field] = descriptor.value;
  }
  for (const field of ["startMicroseconds", "endMicroseconds"] as const) {
    const instant = snapshot[field];
    if (typeof instant !== "bigint") return fail(field);
    if (instant < firstUtcMicrosecond || instant > lastUtcMicrosecond) return fail(field, "out-of-range");
  }
  for (const field of ["dailyRateMinor", "depositMinor"] as const) {
    const amount = snapshot[field];
    if (typeof amount !== "bigint" || amount < 0n || amount > BigInt(Number.MAX_SAFE_INTEGER)) return fail("form");
  }
  const details = {
    clientId: snapshot.clientId,
    vehicleId: snapshot.vehicleId,
    start: utcTimestamp(snapshot.startMicroseconds as bigint),
    end: utcTimestamp(snapshot.endMicroseconds as bigint),
    // Exact only after the bigint safe-integer checks above. Domain bounds follow.
    dailyRateMinor: Number(snapshot.dailyRateMinor),
    depositMinor: Number(snapshot.depositMinor),
  };
  const checked = validateRentalCreateInput(details);
  if (!checked.ok || fields.some(field => snapshot[field] !== checked.value[field])) return fail("form");

  // Reuse the existing UUID semantics for the two separate RPC context arguments.
  // This validates syntax only; no selected agency or caller key proves authority.
  const context = validateRentalCreateInput({ ...details, clientId: agencyId, vehicleId: key });
  if (!context.ok) {
    return fail(context.errors.some(error => error.field === "clientId") ? "p_agency_id" : "p_key");
  }
  return { ok: true, value: {
    p_agency_id: context.value.clientId,
    p_key: context.value.vehicleId,
    p_details: { clientId: checked.value.clientId, vehicleId: checked.value.vehicleId,
      start: details.start, end: details.end,
      dailyRateMinor: details.dailyRateMinor, depositMinor: details.depositMinor },
  } };
}
