import { describe, expect, it } from "vitest";
import { validateRentalCreateInput, type NormalizedRentalCreate } from "../../../../packages/domain/src/rentals/create-input";
import { parseRentalCreateJson } from "../../../../packages/domain/src/rentals/json-boundary";
import { parseRentalTimestamp } from "../../../../packages/domain/src/rentals/timestamps";
import { encodeRentalCreateRequest } from "../../../../packages/domain/src/rentals/rpc-request";

const id = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const key = "00000000-0000-0000-0000-000000000000";
const details = { clientId: id, vehicleId: key, start: "1970-01-01T00:00:00Z",
  end: "1970-01-02T00:00:00.000001Z", dailyRateMinor: 12_345 };
function valid(change: Record<string, unknown> = {}): NormalizedRentalCreate {
  const result = validateRentalCreateInput({ ...details, ...change });
  if (!result.ok) throw new Error("Invalid synthetic test fixture");
  return result.value;
}

describe("bounded canonical rental-create RPC arguments — no calls", () => {
  it("emits the exact SQL parameters and only six business fields in fixed order", () => {
    const result = encodeRentalCreateRequest(valid(), id, key);
    expect(result).toEqual({ ok: true, value: { p_agency_id: id, p_key: key, p_details: {
      clientId: id, vehicleId: key, start: "1970-01-01T00:00:00.000000Z",
      end: "1970-01-02T00:00:00.000001Z", dailyRateMinor: 12_345, depositMinor: 0,
    } } });
    if (!result.ok) throw new Error("Expected valid request");
    expect(Object.keys(result.value)).toEqual(["p_agency_id", "p_key", "p_details"]);
    expect(Object.keys(result.value.p_details)).toEqual(["clientId", "vehicleId", "start", "end", "dailyRateMinor", "depositMinor"]);
    expect(() => JSON.stringify(result.value)).not.toThrow();
  });

  it.each([
    ["0001-01-01T00:00:00Z", "0001-01-01T00:00:00.000001Z"],
    ["9999-12-31T23:59:59.999998Z", "9999-12-31T23:59:59.999999Z"],
    ["1969-12-31T23:59:59.999999Z", "1970-01-01T00:00:00Z"],
    ["2000-02-29T23:59:59.999999Z", "2000-03-01T00:00:00Z"],
    ["1900-02-28T23:59:59.999999Z", "1900-03-01T00:00:00Z"],
  ])("preserves microseconds across bounded calendar boundary %s", (start, end) => {
    const value = valid({ start, end });
    const encoded = encodeRentalCreateRequest(value, id, key);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) throw new Error("Expected bounded interval");
    const payload = encoded.value.p_details;
    expect(payload.start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/);
    expect(parseRentalTimestamp(payload.start)).toBe(value.startMicroseconds);
    expect(parseRentalTimestamp(payload.end)).toBe(value.endMicroseconds);
    expect(parseRentalCreateJson(JSON.stringify(payload))).toEqual({ ok: true, value });
  });

  it("normalizes equivalent inputs and context UUID spellings deterministically", () => {
    const equivalent = valid({ start: "1970-01-01T01:00:00+01:00", end: "1970-01-01T19:00:00.000001-05:00" });
    expect(encodeRentalCreateRequest(equivalent, `{${id.toUpperCase()}}`, key.replaceAll("-", "")))
      .toEqual(encodeRentalCreateRequest(valid(), id, key));
    expect(JSON.stringify(encodeRentalCreateRequest(equivalent, id, key)))
      .toBe(JSON.stringify(encodeRentalCreateRequest(valid(), id, key)));
  });

  it("preserves omitted/zero deposit equivalence and separates a positive deposit", () => {
    expect(encodeRentalCreateRequest(valid(), id, key)).toEqual(encodeRentalCreateRequest(valid({ depositMinor: 0 }), id, key));
    expect(encodeRentalCreateRequest(valid({ depositMinor: 50_000 }), id, key))
      .toMatchObject({ ok: true, value: { p_details: { depositMinor: 50_000, dailyRateMinor: 12_345 } } });
  });

  it.each([0, 1_000_000_000_000])("emits exact bounded numeric centimes %s", amount => {
    const encoded = encodeRentalCreateRequest(valid({ dailyRateMinor: amount, depositMinor: amount }), id, key);
    if (!encoded.ok) throw new Error("Expected valid price");
    expect(encoded.value.p_details.dailyRateMinor).toBe(amount);
    expect(encoded.value.p_details.depositMinor).toBe(amount);
    expect(Number.isSafeInteger(encoded.value.p_details.dailyRateMinor)).toBe(true);
  });

  it.each([
    ["0001-01-01T00:00:00+01:00", "0001-01-01T00:00:00.000001+01:00", "startMicroseconds"],
    ["9999-12-31T23:59:59.999998-01:00", "9999-12-31T23:59:59.999999-01:00", "startMicroseconds"],
    ["9999-12-31T23:59:59.999999Z", "9999-12-31T23:59:59.999999-00:01", "endMicroseconds"],
  ])("rejects previously accepted BC/year-10000 compatibility failure %#", (start, end, field) => {
    expect(encodeRentalCreateRequest(valid({ start, end }), id, key))
      .toEqual({ ok: false, errors: [{ field, code: "out-of-range" }] });
  });

  it.each([
    { startMicroseconds: -62_135_596_800_000_001n },
    { endMicroseconds: 253_402_300_800_000_000n },
  ])("rejects one microsecond outside each UTC bound %#", change => {
    expect(encodeRentalCreateRequest({ ...valid(), ...change }, id, key)).toMatchObject({ ok: false });
  });

  it.each([
    { currency: "USD" }, { billableDays: 1 }, { rentalTotalMinor: 0n }, { depositMinor: -1n },
    { dailyRateMinor: 1_000_000_000_001n }, { dailyRateMinor: 9_007_199_254_740_992n },
    { dailyRateMinor: 1 }, { startMicroseconds: 0 }, { endMicroseconds: 0n },
    { clientId: "PRIVATE_MARKER" }, { vehicleId: "PRIVATE_MARKER" }, { agencyId: "PRIVATE_MARKER" },
    { number: "PRIVATE_MARKER" }, { endMicroseconds: 86_400_000_000n * 1_000_001n },
  ])("rejects forged normalized values without echoing them %#", change => {
    const result = encodeRentalCreateRequest({ ...valid(), ...change } as NormalizedRentalCreate, id, key);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("PRIVATE_MARKER");
  });

  it.each([null, undefined, [], 1, true])("rejects invalid runtime input %#", value => {
    expect(encodeRentalCreateRequest(value as unknown as NormalizedRentalCreate, id, key)).toMatchObject({ ok: false });
  });

  it("rejects missing, hidden, symbolic and accessor fields without invoking getters", () => {
    const value = valid();
    let reads = 0;
    const getter = { ...value, get dailyRateMinor() { reads++; return 12_345n; } };
    expect(encodeRentalCreateRequest(getter, id, key)).toMatchObject({ ok: false });
    expect(reads).toBe(0);
    const missing: Record<string, unknown> = { ...value };
    delete missing.depositMinor;
    expect(encodeRentalCreateRequest(missing as unknown as NormalizedRentalCreate, id, key)).toMatchObject({ ok: false });
    expect(encodeRentalCreateRequest(Object.create(value), id, key)).toMatchObject({ ok: false });
    expect(encodeRentalCreateRequest({ ...value, [Symbol("extra")]: true }, id, key)).toMatchObject({ ok: false });
    expect(encodeRentalCreateRequest(Object.defineProperty({ ...value }, "hidden", { value: true }), id, key)).toMatchObject({ ok: false });
  });

  it("validates agency/key syntax separately without inventing authority", () => {
    expect(encodeRentalCreateRequest(valid(), "PRIVATE_MARKER", key)).toEqual({ ok: false, errors: [{ field: "p_agency_id", code: "invalid" }] });
    expect(encodeRentalCreateRequest(valid(), id, "PRIVATE_MARKER")).toEqual({ ok: false, errors: [{ field: "p_key", code: "invalid" }] });
  });

  it("does not mutate inputs and never emits derived totals or bigint", () => {
    const value = Object.freeze(valid({ start: "0001-01-01T00:00:00Z", end: "2738-11-29T00:00:00Z", dailyRateMinor: 1_000_000_000_000 }));
    const encoded = encodeRentalCreateRequest(value, id, key);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) throw new Error("Expected valid request");
    expect(value.rentalTotalMinor).toBe(1_000_000_000_000_000_000n);
    expect(encoded.value.p_details).not.toHaveProperty("rentalTotalMinor");
    expect(encoded.value.p_details).not.toHaveProperty("billableDays");
    expect(JSON.parse(JSON.stringify(encoded.value))).toEqual(encoded.value);
    expect(parseRentalCreateJson(JSON.stringify(encoded.value.p_details))).toEqual({ ok: true, value });
  });

  it("round-trips calendar anchors throughout the entire AD range", () => {
    for (const year of [1, 4, 99, 100, 400, 999, 1600, 1900, 1969, 1970, 2000, 2026, 2400, 9998, 9999]) {
      for (const month of [1, 2, 3, 6, 12]) {
        const prefix = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01T12:34:56`;
        const value = valid({ start: prefix + ".123456Z", end: prefix + ".123457Z" });
        const encoded = encodeRentalCreateRequest(value, id, key);
        if (!encoded.ok) throw new Error("Expected valid calendar anchor");
        expect(encoded.value.p_details.start).toBe(prefix + ".123456Z");
        expect(encoded.value.p_details.end).toBe(prefix + ".123457Z");
      }
    }
  });
});
