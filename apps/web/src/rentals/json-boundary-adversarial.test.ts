import { describe, expect, it } from "vitest";
import { parseRentalCreateJson, rentalJsonMaxBytes, serializeRentalCreateValidation } from "../../../../packages/domain/src/rentals/json-boundary";

const body = '{"clientId":"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11","vehicleId":"00000000-0000-0000-0000-000000000000","start":"1970-01-01T00:00:00Z","end":"1970-01-02T00:00:00.000001Z","dailyRateMinor":1}';
const rate = (token: string) => body.replace('"dailyRateMinor":1', `"dailyRateMinor":${token}`);
const error = (code: string) => ({ ok: false, errors: [{ field: "form", code }] });

describe("independent rental JSON adversarial cases", () => {
  it.each([
    ['"dailyRateMinor"', '"\\u0064ailyRateMinor"'],
    ['"dailyRate\\u004dinor"', '"\\u0064ailyRate\\u004dinor"'],
    ['"\\u005f_proto__"', '"__proto__"'],
    ['"\\ud83d\\ude00"', '"😀"'],
    ['"\\ud800"', '"\\uD800"'],
  ])("detects duplicate decoded keys %#", (first, second) => {
    expect(parseRentalCreateJson(`{${first}:1,${second}:1}`)).toEqual(error("duplicate-key"));
  });

  it.each(["__proto__", "constructor", "prototype", "toString", "hasOwnProperty", "toJSON"])
    ("rejects prototype-related key %s without pollution", key => {
      const before = Object.getOwnPropertyDescriptors(Object.prototype);
      expect(parseRentalCreateJson(`{${JSON.stringify(key)}:"PRIVATE_MARKER"}`)).toEqual(error("unknown-fields"));
      expect(Object.getOwnPropertyDescriptors(Object.prototype)).toEqual(before);
    });

  it.each(['"\\ud83d\\ude00"', '"😀"', '"\\ud800"', '"\\udc00"', '"\u2028\u2029"', '"\\u0000"'])
    ("decodes JSON Unicode strings but never treats them as valid identifiers %#", token => {
      const text = body.replace('"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"', token);
      expect(parseRentalCreateJson(text)).toEqual({ ok: false, errors: [{ field: "clientId", code: "invalid" }] });
    });

  it.each(['"bad\\u00G0"', '"bad\\u123"', '"bad\\q"', '"bad\\"', '"unterminated', '"x""y"'])
    ("rejects malformed string tokens %#", token => {
      expect(parseRentalCreateJson(`{"x":${token}}`)).toEqual(error("malformed-json"));
    });

  it("rejects every raw JSON control character without reflecting it", () => {
    for (let code = 0; code < 32; code++) {
      const text = '{"PRIVATE_MARKER":"' + String.fromCharCode(code) + '"}';
      expect(parseRentalCreateJson(text)).toEqual(error("malformed-json"));
      expect(serializeRentalCreateValidation(parseRentalCreateJson(text))).not.toContain("PRIVATE_MARKER");
    }
  });

  it.each(["truefalse", "null0", "1true", "1e+", "1e-", "1.0.0", "0e1e1", "00.1"])
    ("rejects primitive-prefix and number-token concatenation %s", token => {
      expect(parseRentalCreateJson(rate(token))).toEqual(error("malformed-json"));
    });

  it.each(["\u000b", "\u000c", "\u0085", "\u00a0", "\ufeff", "{}", "[]", "null", "\0"])
    ("rejects non-JSON whitespace and trailing content %#", suffix => {
      expect(parseRentalCreateJson(body + suffix)).toEqual(error("malformed-json"));
    });

  it.each([
    ["1.00000000000000000000000001", "invalid-number"],
    ["0.99999999999999999999999999", "invalid-number"],
    ["9007199254740991.00000000001", "invalid-number"],
    ["9007199254740992.0", "invalid-number"],
    ["9.007199254740991e15", "out-of-range"],
    ["-9.007199254740991e15", "out-of-range"],
  ])("classifies exact precision boundary %s", (token, code) => {
    expect(parseRentalCreateJson(rate(token))).toEqual({ ok: false,
      errors: [{ field: code === "out-of-range" ? "pricing" : "form", code }] });
  });

  it.each(["-0.000e-999999", "0e+" + "9".repeat(8000), "-0e-" + "9".repeat(8000)])
    ("normalizes exact zero without allocating its exponent scale %#", token => {
      expect(parseRentalCreateJson(rate(token))).toMatchObject({ ok: true, value: { dailyRateMinor: 0n } });
    });

  it.each(["1e" + "9".repeat(8000), "1e-" + "9".repeat(8000)])
    ("rejects enormous nonzero exponents without constructing powers %#", token => {
      expect(parseRentalCreateJson(rate(token))).toEqual(error("invalid-number"));
    });

  it("handles maximal zero-run coefficients, including a nonzero final digit", () => {
    const available = rentalJsonMaxBytes - rate("").length;
    for (const token of ["1" + "0".repeat(available - 2) + "1", "1" + "0".repeat(available - 1)]) {
      expect(new TextEncoder().encode(rate(token)).length).toBe(rentalJsonMaxBytes);
      expect(parseRentalCreateJson(rate(token))).toEqual(error("invalid-number"));
    }
    // Decimal cancellation is exact even for a long coefficient.
    expect(parseRentalCreateJson(rate("1" + "0".repeat(8000) + "e-8000")))
      .toEqual(parseRentalCreateJson(body));
  });

  it.each(['{"x":1,"\\u0078":2}', '[{"x":1,"x":2}]', '{"x":' + "[".repeat(8000) + "]".repeat(8000) + '}'])
    ("rejects nested duplicates/depth before traversing them %#", nested => {
      expect(parseRentalCreateJson(rate(nested))).toEqual(error("nesting-limit"));
    });

  it("enforces the UTF-8 byte boundary for astral characters", () => {
    const text = '{"x":"' + "😀".repeat(8000) + '"}';
    const bytes = new TextEncoder().encode(text).length;
    const padded = text + " ".repeat(rentalJsonMaxBytes - bytes);
    expect(parseRentalCreateJson(padded)).toEqual(error("unknown-fields"));
    expect(parseRentalCreateJson(padded + " ")).toEqual(error("too-large"));
  });

  it("allows the largest flat distinct-key corpus without nested evaluation", () => {
    const text = "{" + Array.from({ length: 2000 }, (_, i) => `"k${i}":0`).join(",") + "}";
    expect(new TextEncoder().encode(text).length).toBeLessThan(rentalJsonMaxBytes);
    expect(parseRentalCreateJson(text)).toEqual(error("unknown-fields"));
  });

  it("keeps serialized bigint microseconds exact at both temporal endpoints", () => {
    for (const [start, end] of [
      ["0001-01-01T00:00:00+15:59", "0001-01-01T00:00:00.000001+15:59"],
      ["9999-12-31T23:59:59.999998-15:59", "9999-12-31T23:59:59.999999-15:59"],
    ] as const) {
      const result = parseRentalCreateJson(body.replace("1970-01-01T00:00:00Z", start)
        .replace("1970-01-02T00:00:00.000001Z", end));
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Invalid fixture");
      const decoded = JSON.parse(serializeRentalCreateValidation(result));
      expect(BigInt(decoded.value.startMicroseconds)).toBe(result.value.startMicroseconds);
      expect(BigInt(decoded.value.endMicroseconds) - BigInt(decoded.value.startMicroseconds)).toBe(1n);
    }
  });
});
