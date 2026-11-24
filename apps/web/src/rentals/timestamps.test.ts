import { describe, expect, it } from "vitest";
import { parseRentalInterval, parseRentalTimestamp } from "../../../../packages/domain/src/rentals/timestamps";
import { calculateRentalPrice } from "../../../../packages/domain/src/rentals/pricing";

describe("strict rental timestamps — no database or Date parsing", () => {
  it.each([
    ["1970-01-01T00:00:00Z", 0n],
    ["1970-01-01T01:00:00+01:00", 0n],
    ["1969-12-31T19:00:00-05:00", 0n],
    ["1970-01-01T05:30:00+05:30", 0n],
    ["1970-01-01T00:00:00-00:00", 0n],
    ["1970-01-01T00:00:00.000001Z", 1n],
    ["1970-01-01T00:00:00.1Z", 100_000n],
    ["1969-12-31T23:59:59.999999Z", -1n],
    ["2000-01-01T00:00:00Z", 946_684_800_000_000n],
    ["0001-01-01T00:00:00Z", -62_135_596_800_000_000n],
    ["9999-12-31T23:59:59.999999Z", 253_402_300_799_999_999n],
    ["0001-01-01T00:00:00+15:59", -62_135_654_340_000_000n],
    ["9999-12-31T23:59:59.999999-15:59", 253_402_358_339_999_999n],
  ])("normalizes %s exactly", (input, expected) => {
    expect(parseRentalTimestamp(input)).toBe(expected);
  });

  it.each([
    "2026-01-01T24:00:00Z", "2026-01-01T23:59:60Z", "2026-01-01T00:60:00Z",
    "2026-01-01T00:00:00", "2026-01-01", "2026-01-01t00:00:00z",
    "2026-01-01T00:00:00.1234567Z", "2026-01-01T00:00:00.Z",
    "2026-01-01T00:00:00+16:00", "2026-01-01T00:00:00-16:00",
    "2026-01-01T00:00:00+01:60", "2026-01-01T00:00:00+0100",
    "2026-01-01T00:00:00+01:00:00", "2026-01-01T00:00:00Z\n",
    " 2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z ",
    "2026-02-29T00:00:00Z", "1900-02-29T00:00:00Z", "2100-02-29T00:00:00Z",
    "2024-02-30T00:00:00Z", "2026-04-31T00:00:00Z", "2026-00-01T00:00:00Z",
    "2026-13-01T00:00:00Z", "2026-01-00T00:00:00Z", "0000-01-01T00:00:00Z",
    "10000-01-01T00:00:00Z", "infinity", "2026-01-01T00:00:00 Africa/Casablanca",
  ])("rejects invalid or noncanonical input %s", input => {
    expect(() => parseRentalTimestamp(input)).toThrow(RangeError);
  });

  it.each([null, undefined, 0, 1n, {}, [], true])("rejects non-string input %#", input => {
    expect(() => parseRentalTimestamp(input)).toThrow(TypeError);
  });

  it.each(["2000-02-29", "2024-02-29", "2400-02-29"])("accepts Gregorian leap date %s", date => {
    expect(parseRentalTimestamp(`${date}T00:00:00Z`)).toBeTypeOf("bigint");
  });

  it.each([
    ["2024-02-29T23:59:59.999999Z", "2024-03-01T00:00:00Z"],
    ["2026-12-31T23:59:59.999999Z", "2027-01-01T00:00:00Z"],
    ["2026-04-30T23:59:59.999999Z", "2026-05-01T00:00:00Z"],
  ])("preserves microseconds across %s", (start, end) => {
    const interval = parseRentalInterval(start, end);
    expect(interval.endMicroseconds - interval.startMicroseconds).toBe(1n);
  });

  it.each([
    ["2026-01-01T00:00:00Z", "2026-01-01T01:00:00+01:00"],
    ["2026-01-01T00:00:00.1Z", "2026-01-01T00:00:00.100000Z"],
    ["2026-01-02T00:00:00Z", "2026-01-01T00:00:00Z"],
  ])("rejects equal or reversed instants", (start, end) => {
    expect(() => parseRentalInterval(start, end)).toThrow(RangeError);
  });

  it("allows adjacent half-open periods sharing an endpoint", () => {
    const first = parseRentalInterval("2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z");
    const second = parseRentalInterval("2026-01-02T01:00:00+01:00", "2026-01-03T00:00:00Z");
    expect(first.endMicroseconds).toBe(second.startMicroseconds);
  });

  it("distinguishes fold offsets without claiming named-zone validation", () => {
    // Synthetic fold labels: the parser does not consult any timezone database.
    expect(parseRentalTimestamp("2026-02-15T02:30:00+00:00")
      - parseRentalTimestamp("2026-02-15T02:30:00+01:00")).toBe(3_600_000_000n);
    expect(() => parseRentalTimestamp("2026-02-15T02:30:00")).toThrow(RangeError);
    // An explicit instant is accepted even if its wall label is a named-zone gap.
    expect(parseRentalTimestamp("2026-03-22T02:30:00+01:00")).toBeTypeOf("bigint");
  });

  it.each([
    ["2026-01-01T12:00:00+00:00", "2026-01-02T12:00:00+01:00", 1],
    ["2026-01-01T12:00:00+01:00", "2026-01-02T12:00:00+00:00", 2],
    ["2026-01-01T00:00:00Z", "2026-01-02T00:00:00.000001Z", 2],
  ])("feeds exact elapsed time to the unchanged pricing API", (start, end, days) => {
    expect(calculateRentalPrice({ ...parseRentalInterval(start, end), dailyRateMinor: 10_001n,
      depositMinor: 50_000n })).toMatchObject({ billableDays: days,
      rentalTotalMinor: BigInt(days) * 10_001n, depositMinor: 50_000n });
  });
});
