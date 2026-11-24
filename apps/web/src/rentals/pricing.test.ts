import { describe, expect, it } from "vitest";
import { calculateRentalPrice } from "../../../../packages/domain/src/rentals/pricing";

const day = 86_400_000_000n;
const quote = (duration: bigint, rate = 25_000n, deposit?: bigint) => calculateRentalPrice({
  startMicroseconds: 0n, endMicroseconds: duration, dailyRateMinor: rate,
  ...(deposit === undefined ? {} : { depositMinor: deposit }),
});

describe("rental pricing — pure arithmetic, no database", () => {
  it.each([
    [1n, 1], [day - 1n, 1], [day, 1], [day + 1n, 2],
    [2n * day, 2], [23n * 3_600_000_000n, 1], [25n * 3_600_000_000n, 2],
  ])("rounds %s elapsed microseconds to %i billable days", (duration, days) => {
    expect(quote(duration)).toEqual({ currency: "MAD", billableDays: days,
      dailyRateMinor: 25_000n, rentalTotalMinor: BigInt(days) * 25_000n, depositMinor: 0n });
  });

  it("keeps a refundable deposit separate from rental price", () => {
    expect(quote(day + 1n, 12_345n, 50_000n)).toMatchObject({
      rentalTotalMinor: 24_690n, depositMinor: 50_000n,
    });
  });

  it("accepts zero rental price and zero deposit", () => {
    expect(quote(day, 0n, 0n)).toMatchObject({ rentalTotalMinor: 0n, depositMinor: 0n });
  });

  it("preserves centimes beyond JavaScript's safe integer total", () => {
    expect(quote(1_000_000n * day, 1_000_000_000_000n, 1_000_000_000_000n))
      .toMatchObject({ billableDays: 1_000_000, rentalTotalMinor: 1_000_000_000_000_000_000n,
        depositMinor: 1_000_000_000_000n });
  });

  it("uses elapsed instants independently of epoch and calendar boundaries", () => {
    expect(calculateRentalPrice({ startMicroseconds: -day, endMicroseconds: 1n, dailyRateMinor: 25_000n }))
      .toEqual(quote(day + 1n));
  });

  it.each([0n, -1n, 1_000_000n * day + 1n])("rejects invalid duration %s", duration => {
    expect(() => quote(duration)).toThrow(RangeError);
  });

  it.each([-1n, 1_000_000_000_001n])("rejects invalid rate %s", rate => {
    expect(() => quote(day, rate)).toThrow(RangeError);
  });

  it.each([-1n, 1_000_000_000_001n])("rejects invalid deposit %s", deposit => {
    expect(() => quote(day, 100n, deposit)).toThrow(RangeError);
  });

  it.each(["startMicroseconds", "endMicroseconds", "dailyRateMinor", "depositMinor"] as const)
    ("rejects lossy or malformed runtime values for %s", field => {
      for (const value of [undefined, null, 1, 0.5, NaN, Infinity, "100", true]) {
        if (field === "depositMinor" && value === undefined) continue;
        const input = { startMicroseconds: 0n, endMicroseconds: day, dailyRateMinor: 100n,
          depositMinor: 0n, [field]: value };
        expect(() => calculateRentalPrice(input as unknown as Parameters<typeof calculateRentalPrice>[0]))
          .toThrow(TypeError);
      }
    });

  it("does not mutate the pricing input", () => {
    const input = Object.freeze({ startMicroseconds: 0n, endMicroseconds: day, dailyRateMinor: 100n });
    expect(calculateRentalPrice(input).rentalTotalMinor).toBe(100n);
    expect(input).toEqual({ startMicroseconds: 0n, endMicroseconds: day, dailyRateMinor: 100n });
  });
});
