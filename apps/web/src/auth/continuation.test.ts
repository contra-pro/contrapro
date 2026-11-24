import { describe, expect, it } from "vitest";
import { authDestination } from "./continuation";
describe("post-authentication navigation never grants membership", () => {
  for (const locale of ["fr", "ar"] as const) {
    it(`${locale}: routes each verified state to its existing boundary`, () => {
      expect(authDestination(locale, "onboarding")).toBe(`/${locale}/app/onboarding`);
      expect(authDestination(locale, "selection-required")).toBe(`/${locale}/app/select`);
      expect(authDestination(locale, "authorized")).toBe(`/${locale}/app`);
      expect(authDestination(locale, "signed-out")).toBe(`/${locale}/sign-in`);
      for (const status of ["unmapped", "forbidden", "unavailable"] as const) expect(authDestination(locale, status)).toBeNull();
    });
  }
});
