import { parseRentalCreateJson, type RentalJsonValidation } from "../../../domain/src/rentals/json-boundary";
import { encodeRentalCreateRequest, type RentalCreateEncoding, type RentalCreateRpcArguments } from "../../../domain/src/rentals/rpc-request";
import { isUuid } from "../agency-management";

/** Supplied separately by a future trusted server boundary; not an authorization capability. */
export type RentalCreateContext = Readonly<{ agencyId: string; creationKey: string }>;
export type RentalCreatePortOutcome =
  | Readonly<{ kind: "success"; data: unknown }>
  /** A confirmed RPC statement rejection, never a transport failure/ambiguous commit. */
  | Readonly<{ kind: "rejected"; sqlState: string }>;
export type RentalCreatePort = Readonly<{
  /** Fixed target: public.contratpro_rental_create. No generic SQL/RPC dispatcher. */
  create(args: RentalCreateRpcArguments): Promise<RentalCreatePortOutcome>;
}>;
export type RentalCreationReceipt = Readonly<{ id: string; version: 1; state: "brouillon"; number: null }>;
type ValidationErrors = Extract<RentalJsonValidation, { ok: false }>["errors"]
  | Extract<RentalCreateEncoding, { ok: false }>["errors"];
export type RentalCreateResult =
  | { ok: true; value: RentalCreationReceipt }
  | { ok: false; code: "invalid-input" | "invalid-context" | "out-of-range"; errors: ValidationErrors }
  | { ok: false; code: "forbidden" | "conflict" | "invalid" | "uncertain" | "quota" | "restricted" };

/** Snapshot only an exact own-data shape; do not invoke getters or reflect exceptions. */
function dataRecord(input: unknown, names: readonly string[]): Record<string, unknown> | null {
  try {
    if (!input || typeof input !== "object" || Array.isArray(input)) return null;
    const prototype: unknown = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(input);
    if (keys.length !== names.length || keys.some(key => typeof key !== "string" || !names.includes(key))) return null;
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const result: Record<string, unknown> = Object.create(null);
    for (const name of names) {
      const descriptor = descriptors[name];
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
      result[name] = descriptor.value;
    }
    return result;
  } catch { return null; }
}

/**
 * One offline-orchestrated creation attempt. No default adapter, auth, logging,
 * retries or ID generation. Success is the original receipt, not current detail.
 */
export async function createRental(rawJson: string, context: RentalCreateContext, port: RentalCreatePort): Promise<RentalCreateResult> {
  const parsed = parseRentalCreateJson(rawJson);
  if (!parsed.ok) return { ok: false, code: "invalid-input", errors: parsed.errors };
  const trusted = dataRecord(context, ["agencyId", "creationKey"]);
  if (!trusted || typeof trusted.agencyId !== "string" || typeof trusted.creationKey !== "string") {
    return { ok: false, code: "invalid-context", errors: [{ field: "form", code: "invalid" }] };
  }
  const encoded = encodeRentalCreateRequest(parsed.value, trusted.agencyId, trusted.creationKey);
  if (!encoded.ok) {
    const invalidContext = encoded.errors.some(error => error.field === "p_agency_id" || error.field === "p_key");
    return { ok: false, code: invalidContext ? "invalid-context"
      : encoded.errors.some(error => error.code === "out-of-range") ? "out-of-range" : "invalid-input", errors: encoded.errors };
  }

  // Own strings/numbers, frozen before handing them to even an injected adapter.
  const args = Object.freeze({ ...encoded.value, p_details: Object.freeze({ ...encoded.value.p_details }) });
  try {
    const outcome: unknown = await port.create(args);
    const success = dataRecord(outcome, ["kind", "data"]);
    if (success?.kind === "success") {
      const receipt = dataRecord(success.data, ["id", "version", "state", "number"]);
      if (!receipt || !isUuid(receipt.id) || receipt.id.length !== 36 || receipt.id !== receipt.id.toLowerCase()
        || receipt.version !== 1 || receipt.state !== "brouillon" || receipt.number !== null) {
        return { ok: false, code: "uncertain" };
      }
      return { ok: true, value: { id: receipt.id, version: receipt.version, state: receipt.state, number: receipt.number } };
    }
    const rejection = dataRecord(outcome, ["kind", "sqlState"]);
    if (rejection?.kind === "rejected") {
      if (rejection.sqlState === "42501") return { ok: false, code: "forbidden" };
      if (rejection.sqlState === "PBL01") return { ok: false, code: "quota" };
      if (rejection.sqlState === "PBL02") return { ok: false, code: "restricted" };
      if (rejection.sqlState === "40001") return { ok: false, code: "conflict" };
      if (rejection.sqlState === "22023") return { ok: false, code: "invalid" };
    }
    // Invalid data and unknown rejection classes cannot establish a safe outcome.
    return { ok: false, code: "uncertain" };
  } catch {
    // Do not inspect error messages, claim rollback, retry, or allocate a new key.
    return { ok: false, code: "uncertain" };
  }
}
