import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { validVehicleInspections, inspectionViews, type InspectionPresentation, type VehicleInspections } from "../../../../packages/application/src/rentals/inspection-presentation";
import { contractTemplates, defaultContractSettings, saveContractSettings, snapshotDemoContract, type ContractPresentation, type ContractPresentationV2, type DocumentSnapshotV2 } from "../../../../packages/application/src/rentals/contract-settings";
import { createMemoryContractSettingsRepository } from "../../../../packages/application/src/rentals/contract-settings-memory";
import { ContractDocument } from "./contract-document";
import { VehicleInspectionPages } from "./vehicle-inspection";

const agencyId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const context = { simulation: true as const, agencyId, role: "owner" as const };
const settings = defaultContractSettings(agencyId, { name: "Agence fictive", ice: "", ifNumber: "", rc: "", address: "Adresse fictive", city: "Ville fictive", phone: "+212600000000", email: "demo@example.invalid" });
const departure = (): InspectionPresentation => ({ stage: "departure", provenance: "demonstration", fuelLevel: 3, mileageKm: 10000, notes: "Observations fictives", damage: inspectionViews.map((view,i) => ({ id: `demo-${i}`, view, category: i === 0 ? "scratch" : i === 1 ? "dent" : "other", x: i * 25, y: 100 - i * 25 })) });
const inspections = (): VehicleInspections => ({ departure: departure(), return: { ...departure(), stage: "return", fuelLevel: 1, mileageKm: 10200, damage: [] } });
const document = (): ContractPresentation => ({ schemaVersion: 3, demonstration: true, agencyId, rentalId: "cccccccc-cccc-cccc-cccc-cccccccccccc", number: null,
  primaryDriver: { fullName: "Conducteur fictif", cin: null, passportNumber: null, drivingLicenseNumber: null, city: null, nationality: null, licenceDates: null, address: null }, secondaryDriver: null,
  vehicle: { make: "Marque fictive", model: "Modèle fictif", registrationNumber: "DEMO", vin: null },
  rental: { start: "2026-01-01T00:00:00Z", end: "2026-01-02T00:00:00Z", duration: "1 jour", pickup: "Agence fictive", returnLocation: "Agence fictive", dailyRateMinor: 10000n, amountMinor: 10000n, depositMinor: 20000n, mileage: "Fictif", allowance: "Non renseigné" },
  inspection: inspections(), signatures: { customer: "not-signed", agency: "not-signed" } });
const html = (value: VehicleInspections) => renderToStaticMarkup(<VehicleInspectionPages inspections={value} />);
describe("strict inspection presentation model", () => {
  it("accepts five views, boundaries, both stages and unknown readings", () => { expect(validVehicleInspections(inspections())).toBe(true); expect(validVehicleInspections({ departure: { ...departure(), fuelLevel: null, mileageKm: null, notes: null }, return: null })).toBe(true); });
  it("accepts documented presentation limits without rounding mileage", () => { expect(validVehicleInspections({ departure: { ...departure(), mileageKm: Number.MAX_SAFE_INTEGER, notes: "x".repeat(2000), damage: Array.from({ length: 50 }, (_,i) => ({ id: `d${i}`, view: "top", category: "other", x: 0.5, y: 99.5 })) }, return: null })).toBe(true); });
  it.each([-1, 4.5, 5, "3", NaN, Infinity, undefined])("rejects invalid fuel %s", fuelLevel => { expect(validVehicleInspections({ departure: { ...departure(), fuelLevel }, return: null })).toBe(false); });
  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "100", Infinity, undefined])("rejects invalid mileage %s", mileageKm => { expect(validVehicleInspections({ departure: { ...departure(), mileageKm }, return: null })).toBe(false); });
  it.each([{ x: -0.001 }, { x: 100.001 }, { y: NaN }, { y: Infinity }, { x: "50" }, { view: "bottom" }, { category: "crash" }, { extra: true }])("rejects forged marker %j", patch => { expect(validVehicleInspections({ departure: { ...departure(), damage: [{ ...departure().damage[0], ...patch }] }, return: null })).toBe(false); });
  it("rejects wrong stage, provenance, missing fields, duplicates and excessive input", () => {
    for (const patch of [{ stage: "return" }, { provenance: "verified" }, { notes: "x".repeat(2001) }, { damage: [departure().damage[0], departure().damage[0]] }, { damage: Array.from({ length: 51 }, (_,i) => ({ ...departure().damage[0], id: `d${i}` })) }]) expect(validVehicleInspections({ departure: { ...departure(), ...patch }, return: null })).toBe(false);
    expect(validVehicleInspections({ departure: departure() })).toBe(false);
  });
  it("rejects getters without invoking them and sparse/extended arrays", () => { let invoked = false; const value = departure(); Object.defineProperty(value, "notes", { enumerable: true, get() { invoked = true; return "sensitive"; } }); expect(validVehicleInspections({ departure: value, return: null })).toBe(false); expect(invoked).toBe(false); expect(validVehicleInspections({ departure: { ...departure(), damage: Array(1) }, return: null })).toBe(false); const damage = Object.assign([], { extra: true }); expect(validVehicleInspections({ departure: { ...departure(), damage }, return: null })).toBe(false); });
});
describe("five-template inspection rendering", () => {
  it.each(Object.keys(contractTemplates) as (keyof typeof contractTemplates)[])("renders distinct five-view departure and return in %s", template => {
    const result = renderToStaticMarkup(<ContractDocument settings={{ ...settings, template }} document={document()} />);
    for (const view of inspectionViews) expect(result.match(new RegExp(`data-view="${view}"`, "g"))).toHaveLength(2);
    expect(result.match(/<svg/g)).toHaveLength(10); expect(result).toContain("DONNÉES FICTIVES"); expect(result).toContain("Rayure"); expect(result).toContain("Enfoncement"); expect(result).toContain("Autre"); expect(result).toContain("3/4"); expect(result).toContain("1/4"); expect(result).toContain('data-inspection-stage="departure"'); expect(result).toContain('data-inspection-stage="return"');
  });
  it("preserves recorded normalized marker positions and boundary markers", () => { const result = html(inspections()); expect(result).toContain('transform="translate(0 100)"'); expect(result).toContain('transform="translate(100 0)"'); expect(result).toContain('viewBox="-22 -22 144 144"'); expect(result).toContain("(0 %, 100 %)"); });
  it("draws genuinely different outlines for top/front/rear/sides", () => { const result = html(inspections()); expect(result).toContain('width="46" height="86"'); expect(result).toContain('cx="25" cy="58"'); expect(result).toContain('width="13" height="7"'); expect(result).toContain('translate(100 0) scale(-1 1)'); });
  it.each([0,1,2,3,4] as const)("renders finite fuel level %s including zero", fuelLevel => { const result = html({ departure: { ...departure(), fuelLevel }, return: null }); expect(result).toContain(`aria-label="${fuelLevel}/4"`); expect(result.match(/■/g)?.length ?? 0).toBe(fuelLevel); expect(result.match(/□/g)?.length ?? 0).toBe(4 - fuelLevel); });
  it("never infers missing return/fuel/mileage or a damage-free state", () => { const result = html({ departure: { ...departure(), fuelLevel: null, mileageKm: null, damage: [] }, return: null }); expect(result).toContain("Inspection non renseignée"); expect(result).toContain("ne signifie pas absence de dommages"); expect(result).not.toContain("aria-label=\"0/4\""); expect(result).not.toContain("10000"); });
  it("marks supplied recorded observations as unverified rather than completed", () => { const result = html({ departure: { ...departure(), provenance: "recorded" }, return: null }); expect(result).toContain("origine non vérifiée"); expect(result).toContain("Aucune inspection achevée ni acceptation"); expect(result).not.toContain("DONNÉES FICTIVES"); });
  it("includes Arabic labels and escapes notes", () => { const result = renderToStaticMarkup(<VehicleInspectionPages bilingual inspections={{ departure: { ...departure(), notes: "<script>DEMO</script>" }, return: null }} />); for (const label of ["المغادرة","الإرجاع","من الأعلى","الوقود","خدش","انبعاج"]) expect(result).toContain(label); expect(result).not.toContain("<script>"); expect(result).toContain("&lt;script&gt;"); });
  it("rejects invalid values without reflecting them", () => { const result = html({ departure: { ...departure(), provenance: "SECRET-DEMO" }, return: null } as unknown as VehicleInspections); expect(result).toContain("invalides"); expect(result).not.toContain("SECRET-DEMO"); });
});
describe("inspection snapshot compatibility and integrity", () => {
  it("reads frozen V2 snapshots without inferring stage/provenance", () => {
    const legacy: ContractPresentationV2 = { ...document(), schemaVersion: 2, inspection: { fuel: "plein", notes: "Historique fictif", damage: [{ view: "gauche", x: 75, y: 48 }] } };
    const snapshot: DocumentSnapshotV2 = { demonstration: true, settings: structuredClone(settings), document: legacy };
    const before = structuredClone(snapshot); Object.freeze(legacy.inspection.damage[0]); Object.freeze(legacy.inspection.damage); Object.freeze(legacy.inspection); Object.freeze(legacy); Object.freeze(snapshot.settings.company); Object.freeze(snapshot.settings); Object.freeze(snapshot);
    const result = renderToStaticMarkup(<ContractDocument settings={snapshot.settings} document={snapshot.document} />);
    expect(result).toContain("Historique fictif"); expect(result).toContain("stade et provenance non déterminés"); expect(result).not.toContain("data-inspection-stage"); expect(snapshot).toEqual(before); expect(legacy.schemaVersion).toBe(2);
  });
  it("creates V3 immutable snapshots and rejects malformed/cross-agency payloads", async () => {
    const repo = createMemoryContractSettingsRepository(); await saveContractSettings(repo, context, settings);
    const input = document(), snapshot = (await snapshotDemoContract(repo, context, input))!;
    expect(snapshot.document.schemaVersion).toBe(3); expect(Object.isFrozen(snapshot.document.inspection.departure?.damage[0])).toBe(true);
    input.inspection.departure!.fuelLevel = 0; input.inspection.departure!.notes = "Changed";
    const marker = input.inspection.departure!.damage[0]!; marker.x = 90;
    expect(snapshot.document.inspection.departure?.fuelLevel).toBe(3); expect(snapshot.document.inspection.departure?.notes).toBe("Observations fictives");
    expect(snapshot.document.inspection.departure?.damage[0]?.x).toBe(0);
    expect(await snapshotDemoContract(repo, { ...context, agencyId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" }, input)).toBeNull();
    expect(await snapshotDemoContract(repo, context, { ...input, inspection: { departure: { ...departure(), fuelLevel: 9 }, return: null } } as unknown as ContractPresentation)).toBeNull();
    const result = renderToStaticMarkup(<ContractDocument settings={{ ...settings, agencyId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" }} document={snapshot.document} />); expect(result).not.toContain("Observations fictives");
  });
});
