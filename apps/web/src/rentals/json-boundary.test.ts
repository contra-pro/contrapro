import { describe, expect, it } from "vitest";
import { parseRentalCreateJson, serializeRentalCreateValidation, rentalJsonMaxBytes } from "../../../../packages/domain/src/rentals/json-boundary";
import { validateRentalCreateInput } from "../../../../packages/domain/src/rentals/create-input";

const input = { clientId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  vehicleId: "00000000-0000-0000-0000-000000000000", start: "1970-01-01T00:00:00Z",
  end: "1970-01-02T00:00:00.000001Z", dailyRateMinor: 12_345, depositMinor: 50_000 };
const raw = JSON.stringify(input);
const withRate = (token: string) => raw.replace('"dailyRateMinor":12345', `"dailyRateMinor":${token}`);

describe("rental lossless JSON boundary — no I/O", () => {
  it("preserves existing business validation results", () => {
    expect(parseRentalCreateJson(raw)).toEqual(validateRentalCreateInput(input));
    expect(parseRentalCreateJson(JSON.stringify({ ...input, currency: "MAD" })))
      .toEqual(validateRentalCreateInput({ ...input, currency: "MAD" }));
    expect(parseRentalCreateJson("{}")).toEqual(validateRentalCreateInput({}));
  });

  it.each(["12345", "12345.000", "1.2345e4", "123450e-1", "0.12345e5", "12345E+0"])
    ("accepts exact integral numeric token %s without rounding", token => {
      expect(parseRentalCreateJson(withRate(token))).toEqual(validateRentalCreateInput(input));
    });

  it.each(["0", "-0", "0.000", "0e999999", "0e-999999"])("normalizes exact zero token %s", token => {
    expect(parseRentalCreateJson(withRate(token))).toMatchObject({ ok: true, value: { dailyRateMinor: 0n } });
  });

  it.each(["9007199254740993", "9007199254740992", "1.00000000000000001", "1e-1000",
    "1e999999", "12345.000000000000001", "0.5", "1.2e-1", "-9007199254740993"])
    ("rejects unsafe or fractional numeric token %s", token => {
      expect(parseRentalCreateJson(withRate(token))).toEqual({ ok: false,
        errors: [{ field: "form", code: "invalid-number" }] });
    });

  it.each(["NaN", "Infinity", "01", "+1", ".5", "1.", "1e", "--1", "0x10"])
    ("rejects malformed JSON number %s", token => {
      expect(parseRentalCreateJson(withRate(token))).toMatchObject({ ok: false });
    });

  it.each(["-1", "1000000000001", "9007199254740991"])("retains pricing rejection of %s", token => {
    expect(parseRentalCreateJson(withRate(token))).toEqual({ ok: false,
      errors: [{ field: "pricing", code: "out-of-range" }] });
  });

  it.each(["0", "1000000000000", "1e12"])("accepts monetary boundary %s", token => {
    expect(parseRentalCreateJson(withRate(token))).toMatchObject({ ok: true });
  });

  it("preserves numeric-type validation rather than coercing strings", () => {
    expect(parseRentalCreateJson(withRate('"12345"'))).toEqual(validateRentalCreateInput({ ...input, dailyRateMinor: "12345" }));
    expect(parseRentalCreateJson(withRate("null"))).toEqual(validateRentalCreateInput({ ...input, dailyRateMinor: null }));
    expect(parseRentalCreateJson(withRate("true"))).toEqual(validateRentalCreateInput({ ...input, dailyRateMinor: true }));
  });

  it.each(['"dailyRateMinor":1', '"dailyRate\\u004dinor":12345', '"dailyRateMinor":12345'])
    ("rejects duplicate decoded keys even with identical values", duplicate => {
      expect(parseRentalCreateJson(raw.slice(0, -1) + "," + duplicate + "}"))
        .toEqual({ ok: false, errors: [{ field: "form", code: "duplicate-key" }] });
    });

  it.each(["{}", "[]", "[{}]", "[".repeat(10000) + "]".repeat(10000)])
    ("rejects nested values before descending %#", nested => {
      expect(parseRentalCreateJson(withRate(nested))).toEqual({ ok: false,
        errors: [{ field: "form", code: "nesting-limit" }] });
    });

  it.each(["", "null", "[]", "true", "1", "{", "{,}", '{"a":}', '{"a":1,}',
    '{"a":1 "b":2}', raw + "{}", raw + "garbage", raw.replace('"clientId"', "clientId"),
    '{"a":"bad\\x00"}', '{"a":"line\nbreak"}', "\ufeff" + raw])
    ("rejects malformed or non-object JSON %#", text => {
      expect(parseRentalCreateJson(text)).toMatchObject({ ok: false });
    });

  it("uses only JSON whitespace and accepts escaped keys and strings", () => {
    expect(parseRentalCreateJson("\r\n\t " + raw.replace('"clientId"', '"client\\u0049d"') + " \t\n"))
      .toEqual(validateRentalCreateInput(input));
    expect(parseRentalCreateJson("\u00a0" + raw)).toMatchObject({ ok: false });
    expect(parseRentalCreateJson('{"x":"escaped\\\" comma, brace} backslash\\\\"}'))
      .toEqual({ ok: false, errors: [{ field: "form", code: "unknown-fields" }] });
  });

  it("bounds UTF-8 input, including exact limit and multibyte content", () => {
    expect(parseRentalCreateJson(raw + " ".repeat(rentalJsonMaxBytes - raw.length))).toEqual(validateRentalCreateInput(input));
    expect(parseRentalCreateJson(raw + " ".repeat(rentalJsonMaxBytes - raw.length + 1)))
      .toEqual({ ok: false, errors: [{ field: "form", code: "too-large" }] });
    expect(parseRentalCreateJson('{"x":"' + "é".repeat(rentalJsonMaxBytes / 2) + '"}'))
      .toMatchObject({ ok: false, errors: [{ code: "too-large" }] });
  });

  it("does not permit prototype keys or reflect sensitive errors", () => {
    const attack = '{"__proto__":"private-sensitive-value"}';
    const result = parseRentalCreateJson(attack);
    expect(result).toEqual({ ok: false, errors: [{ field: "form", code: "unknown-fields" }] });
    expect(serializeRentalCreateValidation(result)).not.toContain("private-sensitive-value");
    expect(serializeRentalCreateValidation(parseRentalCreateJson('{"secret":"private-sensitive-value","secret":1}')))
      .not.toContain("secret");
  });

  it.each([null, undefined, {}, 1, 1n])("rejects non-text boundary input %#", value => {
    expect(parseRentalCreateJson(value)).toMatchObject({ ok: false });
  });

  it("serializes bigint amounts and microseconds as explicit decimal strings", () => {
    const result = parseRentalCreateJson(raw);
    const encoded = serializeRentalCreateValidation(result);
    const decoded = JSON.parse(encoded);
    expect(decoded).toEqual({ ok: true, value: { clientId: input.clientId, vehicleId: input.vehicleId,
      startMicroseconds: "0", endMicroseconds: "86400000001", currency: "MAD", billableDays: 2,
      dailyRateMinor: "12345", depositMinor: "50000", rentalTotalMinor: "24690" } });
    if (!result.ok) throw new Error("Expected valid fixture");
    for (const field of ["startMicroseconds", "endMicroseconds", "dailyRateMinor", "depositMinor", "rentalTotalMinor"] as const) {
      expect(BigInt(decoded.value[field])).toBe(result.value[field]);
    }
    expect(serializeRentalCreateValidation(parseRentalCreateJson(withRate('"bad"'))))
      .toBe(JSON.stringify(validateRentalCreateInput({ ...input, dailyRateMinor: "bad" })));
  });

  it("round-trips the maximum rental total and a negative epoch without number conversion", () => {
    const result = parseRentalCreateJson(JSON.stringify({ ...input, start: "0001-01-01T00:00:00Z",
      end: "2738-11-29T00:00:00Z", dailyRateMinor: 1_000_000_000_000, depositMinor: 1_000_000_000_000 }));
    const decoded = JSON.parse(serializeRentalCreateValidation(result));
    expect(decoded.value.rentalTotalMinor).toBe("1000000000000000000");
    expect(BigInt(decoded.value.startMicroseconds)).toBe(-62_135_596_800_000_000n);
    expect(decoded.value.depositMinor).toBe("1000000000000");
  });
});
