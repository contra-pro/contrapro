import { describe, expect, it } from "vitest";
import { getMessages, type Area } from "./messages";
import { locales } from "./locales";

describe("localized development boundaries", () => {
  for (const locale of locales) {
    it(`${locale}: provides separate agency, platform and signing content`, () => {
      const copy = getMessages(locale);
      const areas: Area[] = ["agency", "platform", "signing"];
      expect(new Set(areas.map((area) => copy.areas[area].title)).size).toBe(3);
      for (const area of areas) {
        expect(copy.areas[area].label.length).toBeGreaterThan(0);
        expect(copy.areas[area].description.length).toBeGreaterThan(0);
      }
    });
  }
  it("explicitly warns that no authentication or access protection exists", () => {
    expect(getMessages("fr").notice).toContain("sans authentification ni protection");
    expect(getMessages("ar").notice).toContain("دون مصادقة أو حماية");
  });
});
