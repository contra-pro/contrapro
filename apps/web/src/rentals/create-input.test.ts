import { describe, expect, it } from "vitest";
import { validateRentalCreateInput } from "../../../../packages/domain/src/rentals/create-input";

const clientId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const vehicleId = "00000000-0000-0000-0000-000000000000";
const base = { clientId, vehicleId, start: "1970-01-01T01:00:00+01:00",
  end: "1970-01-02T00:00:00.000001Z", dailyRateMinor: 12_345, depositMinor: 50_000 };

describe("rental-create business input — pure validation only", () => {
  it("normalizes a complete payload with exact pricing and a separate deposit", () => {
    expect(validateRentalCreateInput(base)).toEqual({ ok: true, value: {
      clientId, vehicleId, startMicroseconds: 0n, endMicroseconds: 86_400_000_001n,
      currency: "MAD", billableDays: 2, dailyRateMinor: 12_345n,
      depositMinor: 50_000n, rentalTotalMinor: 24_690n,
    } });
  });

  it("defaults only an absent deposit to zero", () => {
    const input: Record<string, unknown> = { ...base };
    delete input.depositMinor;
    expect(validateRentalCreateInput(input)).toMatchObject({ ok: true, value: { depositMinor: 0n } });
  });

  it.each(["clientId", "vehicleId", "start", "end", "dailyRateMinor"] as const)
    ("requires own field %s", field => {
      const input: Record<string, unknown> = { ...base };
      delete input[field];
      expect(validateRentalCreateInput(input)).toEqual({ ok: false, errors: [{ field, code: "required" }] });
    });

  it.each(["agencyId", "actor", "creationKey", "state", "number", "totalMinor", "currency", "days"])
    ("rejects unknown field %s", field => {
      expect(validateRentalCreateInput({ ...base, [field]: "untrusted" })).toMatchObject({ ok: false });
    });

  it.each([null, undefined, [], "{}", 1, true])("rejects non-object input %#", input => {
    expect(validateRentalCreateInput(input)).toEqual({ ok: false, errors: [{ field: "form", code: "invalid" }] });
  });

  it.each([
    "A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11", "{a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11}",
    "a0eebc999c0b4ef8bb6d6bb9bd380a11", "a0ee-bc99-9c0b-4ef8-bb6d-6bb9-bd38-0a11",
    "{a0eebc99-9c0b4ef8-bb6d6bb9-bd380a11}",
  ])("preserves PostgreSQL UUID input spelling %s", input => {
    expect(validateRentalCreateInput({ ...base, clientId: input }))
      .toMatchObject({ ok: true, value: { clientId } });
  });

  it.each(["clientId", "vehicleId"] as const)("rejects malformed %s", field => {
    for (const value of [null, undefined, 1, "", "not-a-uuid", `${clientId}\n`, ` ${clientId}`,
      `${clientId}-`, `{${clientId}`, "a0-eebc999c0b4ef8bb6d6bb9bd380a11", "g".repeat(32)]) {
      expect(validateRentalCreateInput({ ...base, [field]: value })).toMatchObject({ ok: false });
    }
  });

  it.each(["dailyRateMinor", "depositMinor"] as const)("rejects malformed numeric %s", field => {
    for (const value of [null, undefined, "100", 100n, false, {}, NaN, Infinity, -Infinity,
      0.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(validateRentalCreateInput({ ...base, [field]: value })).toMatchObject({ ok: false });
    }
  });

  it.each(["dailyRateMinor", "depositMinor"] as const)("enforces the pricing limits on %s", field => {
    for (const value of [-1, 1_000_000_000_001]) {
      expect(validateRentalCreateInput({ ...base, [field]: value })).toMatchObject({ ok: false });
    }
    for (const value of [0, 1_000_000_000_000]) {
      expect(validateRentalCreateInput({ ...base, [field]: value })).toMatchObject({ ok: true });
    }
  });

  it.each(["start", "end"] as const)("rejects invalid strict timestamp field %s", field => {
    for (const value of [null, undefined, 0, "2026-02-29T00:00:00Z", "1970-01-01T24:00:00Z",
      "1970-01-01T23:59:60Z", "1970-01-01T00:00:00", "1970-01-01T00:00:00.1234567Z",
      "1970-01-01T00:00:00+16:00"]) {
      expect(validateRentalCreateInput({ ...base, [field]: value })).toMatchObject({ ok: false });
    }
  });

  it.each(["1970-01-01T00:00:00Z", "1970-01-01T01:00:00+01:00", "1969-12-31T23:59:59Z"])
    ("rejects zero-length or reversed period ending %s", end => {
      expect(validateRentalCreateInput({ ...base, end })).toEqual({ ok: false,
        errors: [{ field: "period", code: "invalid" }] });
    });

  it("normalizes equivalent representations to equal internal values", () => {
    expect(validateRentalCreateInput({ ...base, start: "1970-01-01T00:00:00.000000Z",
      clientId: clientId.toUpperCase() })).toEqual(validateRentalCreateInput(base));
  });

  it("keeps microsecond rounding and maximum bigint totals exact", () => {
    const result = validateRentalCreateInput({ ...base, start: "0001-01-01T00:00:00Z",
      end: "2738-11-29T00:00:00Z", dailyRateMinor: 1_000_000_000_000 });
    expect(result).toMatchObject({ ok: true, value: { billableDays: 1_000_000,
      rentalTotalMinor: 1_000_000_000_000_000_000n } });
    expect(validateRentalCreateInput({ ...base, start: "0001-01-01T00:00:00Z",
      end: "2738-11-29T00:00:00.000001Z" })).toMatchObject({ ok: false });
  });

  it("accepts a one-microsecond interval and zero price", () => {
    expect(validateRentalCreateInput({ ...base, end: "1970-01-01T00:00:00.000001Z", dailyRateMinor: 0 }))
      .toMatchObject({ ok: true, value: { billableDays: 1, rentalTotalMinor: 0n } });
  });

  it("does not invoke accessors, inherit fields or accept hidden extra keys", () => {
    let reads = 0;
    const getter = { ...base, get start() { reads++; return base.start; } };
    expect(validateRentalCreateInput(getter)).toMatchObject({ ok: false });
    expect(reads).toBe(0);
    expect(validateRentalCreateInput(Object.create(base))).toMatchObject({ ok: false });
    expect(validateRentalCreateInput({ ...base, [Symbol("extra")]: true })).toMatchObject({ ok: false });
    const hidden = Object.defineProperty({ ...base }, "actor", { value: "ignored?" });
    expect(validateRentalCreateInput(hidden)).toMatchObject({ ok: false });
  });

  it("accepts a frozen or null-prototype JSON-shaped record without mutation", () => {
    expect(validateRentalCreateInput(Object.freeze({ ...base }))).toEqual(validateRentalCreateInput(base));
    expect(validateRentalCreateInput(Object.assign(Object.create(null), base))).toEqual(validateRentalCreateInput(base));
  });

  it("bounds raw strings and never echoes invalid data in errors", () => {
    const secret = "untrusted-private-input".repeat(1000);
    const result = validateRentalCreateInput({ ...base, clientId: secret, start: secret });
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).not.toContain("untrusted");
  });
});
