import { expect, it } from "vitest";
import { minorUnits, states, transitions } from "./model";
it("preserves exact MAD-compatible integer amounts and rejects coercion", () => {
  expect(minorUnits("9007199254740993")).toBe("9007199254740993");
  for (const bad of [1, 0.1, "1.00", "-1", "01", "9223372036854775808", "1e3", null]) expect(() => minorUnits(bad)).toThrow();
});
it("has explicit transitions for every state; no ordinary transition activates paid access", () => {
  expect(Object.keys(transitions).sort()).toEqual([...states].sort());
  for (const values of Object.values(transitions)) expect(values).not.toContain("active");
});
