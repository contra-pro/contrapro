import { describe, expect, it } from "vitest";
import { direction, isLocale } from "./locales";

describe("locale boundary", () => {
  it("accepts only supported route locales", () => {
    expect(isLocale("fr")).toBe(true);
    expect(isLocale("ar")).toBe(true);
    for (const value of ["en", "FR", "", "../ar", "fr/app"]) {
      expect(isLocale(value)).toBe(false);
    }
  });
  it("uses Arabic RTL and French LTR", () => {
    expect(direction("ar")).toBe("rtl");
    expect(direction("fr")).toBe("ltr");
  });
});
