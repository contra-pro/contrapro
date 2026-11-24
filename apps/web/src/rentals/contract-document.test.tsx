import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ContractDocument } from "./contract-document";
import { ContractSettingsStudio } from "./contract-settings-studio";
import { contractPresentationVersion, contractTemplates, defaultContractSettings, saveContractSettings, snapshotDemoContract, type ContractPresentation, type ContractPresentationV2, type ContractPresentationV1, type DocumentSnapshotV1 } from "../../../../packages/application/src/rentals/contract-settings";
import { createMemoryContractSettingsRepository } from "../../../../packages/application/src/rentals/contract-settings-memory";
const agencyId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const settings = defaultContractSettings(agencyId, { name: "Agence fictive", ice: "", ifNumber: "", rc: "", address: "Adresse fictive", city: "Casablanca", phone: "+212600000000", email: "demo@example.invalid" });
const document: ContractPresentationV2 = { schemaVersion: 2, demonstration: true, agencyId, rentalId: "cccccccc-cccc-cccc-cccc-cccccccccccc", number: null,
  primaryDriver: { fullName: "Conducteur fictif", cin: "CIN-DEMO", passportNumber: "PASSPORT-DEMO", drivingLicenseNumber: "DEMO-PERMIS", city: "Ville fictive", nationality: "Nationalité fictive", licenceDates: null, address: null }, secondaryDriver: null,
  vehicle: { registrationNumber: "DEMO-01", make: "Marque fictive", model: "Modèle fictif", vin: null },
  rental: { start: "2026-01-01T09:00:00.000001Z", end: "2026-01-02T09:00:00.000001Z", duration: "1 jour", pickup: "Prise fictive", returnLocation: "Retour fictif", dailyRateMinor: 12345n, amountMinor: 12345n, depositMinor: 50000n, mileage: "100 km", allowance: "200 km/jour" },
  inspection: { fuel: "plein", notes: "Inspection fictive", damage: [] }, signatures: { customer: "not-signed", agency: "not-signed" } };
describe("five agency templates — V2 driver and vehicle correction", () => {
  it.each(Object.keys(contractTemplates) as (keyof typeof contractTemplates)[])("retains essential reference fields in %s", template => {
    const html = renderToStaticMarkup(<ContractDocument settings={{ ...settings, template }} document={document} />);
    for (const text of ["Agence fictive", "Brouillon", "Conducteur principal", "Conducteur secondaire", "CIN-DEMO", "PASSPORT-DEMO", "DEMO-PERMIS", "Ville fictive", "Nationalité fictive", "Marque fictive", "Modèle fictif", "DEMO-01", "Prise fictive", "Retour fictif", "Kilométrage", "Carburant", "Signature client", "Signature agence", "Conditions générales", "Dépôt de garantie", "123,45", "500,00", "000001Z"]) expect(html).toContain(text);
    for (const field of ["Nom complet", "CIN", "N° de passeport", "N° permis de conduire", "Ville", "Nationalité"]) expect(html.split(field).length - 1).toBeGreaterThanOrEqual(2);
    expect(html.match(/<svg/g)).toHaveLength(4); expect(html).not.toContain("<form"); expect(html).toContain("NON SIGNÉ");
    expect(html.match(/data-contract-sheet=/g)).toHaveLength(1);
    expect(html.match(/data-legal-footer=/g)).toHaveLength(1);
    expect(html).toContain('data-pagination="unverified"');
  });
  it("includes Arabic language/direction metadata", () => { expect(renderToStaticMarkup(<ContractDocument settings={{ ...settings, template: "bilingual" }} document={document} />)).toContain('lang="ar" dir="rtl"'); });
  it("translates all corrected driver/vehicle labels for bilingual", () => { const html = renderToStaticMarkup(<ContractDocument settings={{ ...settings, template: "bilingual" }} document={document} />); for (const label of ["الاسم الكامل","رقم البطاقة الوطنية","رقم جواز السفر","رقم رخصة السياقة","المدينة","الجنسية","العلامة التجارية","الطراز","رقم التسجيل"]) expect(html).toContain(label); });
  it("renders a supplied secondary driver without mixing identities", () => { const html = renderToStaticMarkup(<ContractDocument settings={settings} document={{ ...document, secondaryDriver: { ...document.primaryDriver, fullName: "Second conducteur fictif", cin: null, passportNumber: "SECOND-PASSPORT-DEMO" } }} />); expect(html).toContain("Second conducteur fictif"); expect(html).toContain("SECOND-PASSPORT-DEMO"); expect(html.match(/CIN-DEMO/g)).toHaveLength(1); });
  it("does not invent missing optional values or reuse the other identity", () => { const html = renderToStaticMarkup(<ContractDocument settings={settings} document={{ ...document, primaryDriver: { ...document.primaryDriver, cin: null, passportNumber: null, drivingLicenseNumber: null, city: null, nationality: null }, vehicle: { ...document.vehicle, make: null, model: null } }} />); expect(html).toContain("Non renseigné"); expect(html).not.toContain("CIN-DEMO"); expect(html).not.toContain("PASSPORT-DEMO"); expect(html).not.toContain("Ville fictive"); expect(html).not.toContain("Marque fictive"); expect(html).not.toContain("undefined"); });
  it("refuses cross-agency branding", () => { const html = renderToStaticMarkup(<ContractDocument settings={settings} document={{ ...document, agencyId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" }} />); expect(html).toContain("incompatible"); expect(html).not.toContain("Agence fictive"); });
  it("escapes content rather than interpreting HTML", () => { const html = renderToStaticMarkup(<ContractDocument settings={{ ...settings, conditions: "<script>secret</script>" }} document={document} />); expect(html).not.toContain("<script>"); expect(html).toContain("&lt;script&gt;"); });
  it("has five choices and disables editing for simulated staff", () => { const html = renderToStaticMarkup(<ContractSettingsStudio initial={settings} context={{ simulation: true, agencyId, role: "staff" }} repository={createMemoryContractSettingsRepository()} document={{ ...document, schemaVersion: 3, inspection: { departure: null, return: null } }} onSaved={() => undefined} />); expect(html).toContain("Lecture seule"); expect(html.match(/<option/g)).toHaveLength(5); expect(html).toContain('fieldset disabled=""'); });
});

// Authentic V1 structure with explicitly synthetic combined values; never inferred from the photo.
const legacy: ContractPresentationV1 = { demonstration: true, agencyId, rentalId: document.rentalId, number: null,
  primaryDriver: { name: "Ancien conducteur fictif", identity: "IDENTITÉ COMBINÉE DEMO", licence: "ANCIEN PERMIS DEMO", licenceDates: "Dates fictives", address: "Adresse fictive" }, secondaryDriver: null,
  vehicle: { registration: "DEMO-LEGACY", makeModel: "MARQUE MODÈLE COMBINÉS DEMO", vin: "VIN DEMO" }, rental: document.rental, inspection: document.inspection, signatures: document.signatures };
describe("explicit historical V1 snapshot compatibility", () => {
  it.each(Object.keys(contractTemplates) as (keyof typeof contractTemplates)[])("keeps V1 readable without fabricated V2 fields in %s", template => {
    const snapshot: DocumentSnapshotV1 = { demonstration: true, settings: { ...settings, template }, document: structuredClone(legacy) };
    const before = structuredClone(snapshot);
    Object.freeze(snapshot.document.primaryDriver); Object.freeze(snapshot.document.vehicle); Object.freeze(snapshot.document); Object.freeze(snapshot);
    const html = renderToStaticMarkup(<ContractDocument settings={snapshot.settings} document={snapshot.document} />);
    expect(html).toContain("Archive V1"); expect(html).toContain("IDENTITÉ COMBINÉE DEMO"); expect(html).toContain("MARQUE MODÈLE COMBINÉS DEMO");
    expect(html).not.toContain("N° de passeport"); expect(html).not.toContain("Nationalité"); expect(snapshot).toEqual(before); expect(snapshot.document).not.toHaveProperty("schemaVersion");
  });
  it("recognizes explicit V1 and rejects unsupported/mixed versions", () => { expect(contractPresentationVersion({ ...legacy, schemaVersion: 1 })).toBe(1); expect(contractPresentationVersion({ ...legacy, schemaVersion: 2 } as unknown as ContractPresentation)).toBeNull(); expect(contractPresentationVersion({ ...document, schemaVersion: 99 } as unknown as ContractPresentation)).toBeNull(); });
  it("rejects ambiguous V2 fields rather than falling back to V1", () => { expect(contractPresentationVersion({ ...document, primaryDriver: { ...document.primaryDriver, identity: "COMBINED-DEMO" } } as ContractPresentationV2)).toBeNull(); expect(contractPresentationVersion({ ...document, vehicle: { ...document.vehicle, makeModel: "COMBINED-DEMO" } } as ContractPresentationV2)).toBeNull(); });
  it("retains an issued historical number without assigning a new one", () => { const html = renderToStaticMarkup(<ContractDocument settings={settings} document={{ ...legacy, number: "CTR-DEMO-HISTORICAL" }} />); expect(html).toContain("CTR-DEMO-HISTORICAL"); expect(legacy.number).toBeNull(); });
  it("rejects unknown versions without rendering their content", () => { const html = renderToStaticMarkup(<ContractDocument settings={settings} document={{ ...document, schemaVersion: 99 } as unknown as ContractPresentation} />); expect(html).toContain("incompatible"); expect(html).not.toContain("CIN-DEMO"); });
  it("preserves agency isolation for legacy snapshots", () => { expect(renderToStaticMarkup(<ContractDocument settings={{ ...settings, agencyId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" }} document={legacy} />)).not.toContain("IDENTITÉ COMBINÉE DEMO"); });
  it("creates only immutable V3 snapshots, rejects V1 creation, and keeps historical settings/data stable", async () => {
    const repo = createMemoryContractSettingsRepository(), context = { simulation: true as const, agencyId, role: "owner" as const };
    await saveContractSettings(repo, context, settings);
    const input: ContractPresentation = { ...structuredClone(document), schemaVersion: 3, inspection: { departure: null, return: null } }, first = (await snapshotDemoContract(repo, context, input))!;
    expect(first.document.schemaVersion).toBe(3); expect(Object.isFrozen(first.document.primaryDriver)).toBe(true);
    input.primaryDriver.cin = "CHANGED-DEMO"; input.vehicle.make = "Changed";
    await saveContractSettings(repo, context, { ...(await repo.get(agencyId))!, template: "modern" });
    expect(first.document.primaryDriver.cin).toBe("CIN-DEMO"); expect(first.document.vehicle.make).toBe("Marque fictive"); expect(first.settings.template).toBe("classic");
    expect(await snapshotDemoContract(repo, context, legacy as unknown as ContractPresentation)).toBeNull();
  });
});
