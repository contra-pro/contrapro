import { calculateRentalPrice } from "../../../domain/src/rentals/pricing";
import { parseRentalTimestamp } from "../../../domain/src/rentals/timestamps";
import { isUuid } from "../agency-management";

export type RentalState = "brouillon" | "confirme" | "en_cours" | "termine" | "annule";
export type RentalDetailInstant = Readonly<{ source: string; epochMicroseconds: bigint }>;
export type RentalDetailContext = Readonly<{ agencyId: string; contractId: string }>;
export type RentalDetail = Readonly<{
  id: string; agencyId: string; clientId: string; vehicleId: string; state: RentalState; version: number;
  startsAt: RentalDetailInstant; endsAt: RentalDetailInstant;
  dailyRateMinor: bigint; depositMinor: bigint; billableDays: number; totalMinor: bigint; currency: "MAD";
  numberYear: number | null; numberSerial: bigint | null; contractNumber: string | null;
  confirmedAt: RentalDetailInstant | null; returnedAt: RentalDetailInstant | null;
  createdAt: RentalDetailInstant; updatedAt: RentalDetailInstant;
  physicalUnavailable: boolean; overdueConflict: boolean;
}>;
export type RentalDetailResult = { ok: true; value: RentalDetail }
  | { ok: false; code: "invalid-context" | "not-found" | "invalid-response" | "scope-mismatch" };

const fields = ["id", "agency_id", "client_id", "vehicle_id", "state", "starts_at", "ends_at",
  "daily_rate_minor", "deposit_minor", "billable_days", "total_minor", "currency", "number_year", "number_serial",
  "contract_number", "confirmed_at", "returned_at", "version", "created_at", "updated_at", "physicalUnavailable", "overdueConflict"] as const;

function snapshot(input: unknown, names: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error();
  const prototype: unknown = Object.getPrototypeOf(input);
  if (prototype !== null && prototype !== Object.prototype) throw new Error();
  const keys = Reflect.ownKeys(input);
  if (keys.length !== names.length || keys.some(key => typeof key !== "string" || !names.includes(key))) throw new Error();
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const result: Record<string, unknown> = Object.create(null);
  for (const name of names) {
    const descriptor = descriptors[name];
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) throw new Error();
    result[name] = descriptor.value;
  }
  return result;
}

function uuid(input: unknown): string {
  if (!isUuid(input) || input.length !== 36 || input !== input.toLowerCase()) throw new Error();
  return input;
}
/** SQL JSON integers must have been decoded losslessly; unsafe JS numbers are never repaired. */
function integer(input: unknown, minimum = 0n, maximum = 9_223_372_036_854_775_807n): bigint {
  if (typeof input !== "bigint" && !(typeof input === "number" && Number.isSafeInteger(input))) throw new Error();
  const value = BigInt(input);
  if (value < minimum || value > maximum) throw new Error();
  return value;
}
function instant(input: unknown): RentalDetailInstant {
  if (typeof input !== "string" || input.length > 32) throw new Error();
  return { source: input, epochMicroseconds: parseRentalTimestamp(input) };
}

/**
 * Read-only validation of the exact contratpro_rental_detail row projection.
 * Accepts an injected, losslessly decoded response, not SDK-rounded JSON numbers.
 * Context checks scope consistency, not authentication or membership.
 */
export function readRentalDetail(response: unknown, context: RentalDetailContext): RentalDetailResult {
  let expected: Record<string, unknown>;
  try {
    expected = snapshot(context, ["agencyId", "contractId"]);
    uuid(expected.agencyId); uuid(expected.contractId);
  } catch { return { ok: false, code: "invalid-context" }; }
  if (response === null) return { ok: false, code: "not-found" };
  try {
    const row = snapshot(response, fields);
    const id = uuid(row.id); const agencyId = uuid(row.agency_id);
    const clientId = uuid(row.client_id); const vehicleId = uuid(row.vehicle_id);
    if (agencyId !== expected.agencyId || id !== expected.contractId) return { ok: false, code: "scope-mismatch" };
    const state = row.state;
    if (state !== "brouillon" && state !== "confirme" && state !== "en_cours" && state !== "termine" && state !== "annule") throw new Error();
    if (row.currency !== "MAD" || typeof row.physicalUnavailable !== "boolean" || typeof row.overdueConflict !== "boolean") throw new Error();
    if (row.overdueConflict && (state !== "confirme" || !row.physicalUnavailable)) throw new Error();
    const startsAt = instant(row.starts_at); const endsAt = instant(row.ends_at);
    const dailyRateMinor = integer(row.daily_rate_minor); const depositMinor = integer(row.deposit_minor);
    const price = calculateRentalPrice({ startMicroseconds: startsAt.epochMicroseconds, endMicroseconds: endsAt.epochMicroseconds,
      dailyRateMinor, depositMinor });
    const days = integer(row.billable_days, 1n, 1_000_000n);
    const totalMinor = integer(row.total_minor);
    if (days !== BigInt(price.billableDays) || totalMinor !== price.rentalTotalMinor) throw new Error();
    const numberYear = row.number_year === null ? null : Number(integer(row.number_year, 1n, 9999n));
    const numberSerial = row.number_serial === null ? null : integer(row.number_serial, 1n);
    const confirmedAt = row.confirmed_at === null ? null : instant(row.confirmed_at);
    const returnedAt = row.returned_at === null ? null : instant(row.returned_at);
    const numbered = numberSerial !== null;
    if ((numberYear !== null) !== numbered || (confirmedAt !== null) !== numbered) throw new Error();
    if (state === "brouillon" && numbered) throw new Error();
    if (["confirme", "en_cours", "termine"].includes(state) && !numbered) throw new Error();
    if ((state === "termine") !== (returnedAt !== null)) throw new Error();
    // Compare against the SQL generated expression; never synthesize a displayed number.
    if (row.contract_number !== (numbered ? `CTR-${numberYear}-${numberSerial.toString().padStart(4, "0")}` : null)) throw new Error();
    return { ok: true, value: {
      id, agencyId, clientId, vehicleId, state, version: Number(integer(row.version, 1n, 2_147_483_647n)),
      startsAt, endsAt, dailyRateMinor, depositMinor, billableDays: price.billableDays, totalMinor, currency: "MAD",
      numberYear, numberSerial, contractNumber: row.contract_number as string | null, confirmedAt, returnedAt,
      createdAt: instant(row.created_at), updatedAt: instant(row.updated_at),
      physicalUnavailable: row.physicalUnavailable, overdueConflict: row.overdueConflict,
    } };
  } catch { return { ok: false, code: "invalid-response" }; }
}
