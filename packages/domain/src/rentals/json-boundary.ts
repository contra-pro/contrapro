import { validateRentalCreateInput, type RentalCreateError, type RentalCreateValidation } from "./create-input";

/** Raw UTF-8 text limit, matching the existing client application envelope. Not JSONB size. */
export const rentalJsonMaxBytes = 32_768;
/** Root object only: the business payload has no nested containers. */
export const rentalJsonMaxDepth = 1;
type BoundaryCode = "malformed-json" | "duplicate-key" | "invalid-number" | "nesting-limit" | "too-large";
export type RentalJsonValidation = RentalCreateValidation | {
  ok: false;
  errors: readonly (RentalCreateError | { field: "form"; code: BoundaryCode })[];
};

class BoundaryError extends Error {
  constructor(readonly code: BoundaryCode) { super(code); }
}

/** Convert a JSON number lexeme only after proving its exact value is a safe integer. */
function exactInteger(token: string): number {
  const parts = /^(-?)([0-9]+)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$/.exec(token)!;
  const fraction = parts[3] ?? "";
  let digits = (parts[2]! + fraction).replace(/^0+/, "");
  if (!digits) return 0;
  let scale = BigInt(parts[4] ?? "0") - BigInt(fraction.length);
  // An unanchored /0+$/ can rescan a long zero run quadratically when a nonzero
  // digit follows it. Scan the suffix once, including for maximum-size tokens.
  let suffixStart = digits.length;
  while (suffixStart > 0 && digits[suffixStart - 1] === "0") suffixStart--;
  const shortened = digits.slice(0, suffixStart);
  scale += BigInt(digits.length - shortened.length);
  digits = shortened;
  if (scale < 0n || BigInt(digits.length) + scale > 16n) throw new BoundaryError("invalid-number");
  const magnitude = BigInt(digits) * 10n ** scale;
  if (magnitude > BigInt(Number.MAX_SAFE_INTEGER)) throw new BoundaryError("invalid-number");
  // The only monetary-value Number conversion occurs after the exact range proof.
  return Number(parts[1] === "-" ? -magnitude : magnitude);
}

/**
 * Flat JSON-object reader. JSON.parse is used only for isolated string tokens;
 * it never sees numeric tokens or a complete object with potentially duplicate keys.
 */
function readObject(text: string): Record<string, unknown> {
  let position = 0;
  const invalid = (): never => { throw new BoundaryError("malformed-json"); };
  const whitespace = () => { while (/[ \t\r\n]/.test(text[position] ?? "")) position++; };
  const string = (): string => {
    if (text[position] !== '"') return invalid();
    const start = position++;
    while (position < text.length) {
      const character = text[position++];
      if (character === "\\") { position++; continue; }
      if (character === '"') {
        try { return JSON.parse(text.slice(start, position)) as string; }
        catch { return invalid(); }
      }
    }
    return invalid();
  };
  const value = (): unknown => {
    const character = text[position];
    if (character === "{" || character === "[") throw new BoundaryError("nesting-limit");
    if (character === '"') return string();
    for (const [token, literal] of [["true", true], ["false", false], ["null", null]] as const) {
      if (text.startsWith(token, position)) { position += token.length; return literal; }
    }
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(text.slice(position));
    if (!match) return invalid();
    position += match[0].length;
    return exactInteger(match[0]);
  };
  whitespace();
  if (text[position++] !== "{") return invalid();
  whitespace();
  const result: Record<string, unknown> = Object.create(null);
  const seen = new Set<string>();
  if (text[position] !== "}") {
    while (position < text.length) {
      const key = string();
      if (seen.has(key)) throw new BoundaryError("duplicate-key");
      seen.add(key);
      whitespace();
      if (text[position++] !== ":") return invalid();
      whitespace();
      result[key] = value();
      whitespace();
      if (text[position] === "}") break;
      if (text[position++] !== ",") return invalid();
      whitespace();
    }
  }
  if (text[position++] !== "}") return invalid();
  whitespace();
  if (position !== text.length) return invalid();
  return result;
}

/** Raw JSON text only. Must be used before ordinary object/number JSON parsing. */
export function parseRentalCreateJson(text: unknown): RentalJsonValidation {
  if (typeof text !== "string") return { ok: false, errors: [{ field: "form", code: "invalid" }] };
  // Cheap code-unit bound first avoids allocating an encoder buffer for huge input.
  if (text.length > rentalJsonMaxBytes || new TextEncoder().encode(text).length > rentalJsonMaxBytes) {
    return { ok: false, errors: [{ field: "form", code: "too-large" }] };
  }
  try {
    return validateRentalCreateInput(readObject(text));
  } catch (error) {
    if (error instanceof BoundaryError) return { ok: false, errors: [{ field: "form", code: error.code }] };
    throw error;
  }
}

/**
 * Encodes a result produced by the validator, not arbitrary untrusted objects.
 * Decimal strings preserve bigint values in a separate normalized-output format.
 * This is not a create request or SQL RPC serializer and changes no public route.
 */
export function serializeRentalCreateValidation(result: RentalJsonValidation): string {
  if (!result.ok) return JSON.stringify({ ok: false, errors: result.errors.map(({ field, code }) => ({ field, code })) });
  const value = result.value;
  return JSON.stringify({ ok: true, value: {
    clientId: value.clientId, vehicleId: value.vehicleId,
    startMicroseconds: value.startMicroseconds.toString(), endMicroseconds: value.endMicroseconds.toString(),
    currency: value.currency, billableDays: value.billableDays,
    dailyRateMinor: value.dailyRateMinor.toString(), depositMinor: value.depositMinor.toString(),
    rentalTotalMinor: value.rentalTotalMinor.toString(),
  } });
}
