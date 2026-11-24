import { describe, expect, it } from "vitest";
import { validateVehicleInput, vehicleAttributeDefaults, validVehicleSearch } from "../../../../packages/application/src/vehicles";
const basic = { registration: "12345 أ 6", make: "Dacia", model: "Duster", year: "2026", mileage: "12000" };
describe("fleet extension preserves existing vehicle business rules", () => {
  it("accepts the original fields with explicit unknown defaults for historical attributes", () => {
    expect(validateVehicleInput(basic, 2026)).toEqual({ ok: true, value: { ...basic, ...vehicleAttributeDefaults } });
  });
  it("validates all fleet attributes and never accepts caller tenant/state metadata", () => {
    expect(validateVehicleInput({ ...basic, category: "suv", fuelType: "diesel", transmission: "manual", rentalStatus: "available" }, 2026).ok).toBe(true);
    for (const patch of [{ fuelType: "jet" }, { transmission: null }, { rentalStatus: "signed" }, { category: "<script>" }, { agencyId: "forged" }, { state: "archived" }]) {
      expect(validateVehicleInput({ ...basic, ...patch }, 2026).ok).toBe(false);
    }
  });
  it("keeps registration normalization and validates bounded literal search", () => {
    const result = validateVehicleInput({ ...basic, registration: " AB-123 " }, 2026);
    expect(result.ok && result.value.registration).toBe("AB-123");
    expect(validVehicleSearch("%_أ Dacia")).toBe(true);
    for (const search of [null, "x".repeat(101), "hidden\nvalue", "\u202eabc"]) expect(validVehicleSearch(search)).toBe(false);
  });
});
