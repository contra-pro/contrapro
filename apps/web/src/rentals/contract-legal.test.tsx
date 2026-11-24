// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ContractLegalFooter, ContractSignaturePlaceholders } from "./contract-legal";
import { ContractDocument } from "./contract-document";
import { contractTemplates, defaultContractSettings, saveContractSettings, snapshotDemoContract, type ContractPresentationV1, type ContractPresentationV2, type ContractPresentationV3, type ReadableContractPresentation } from "../../../../packages/application/src/rentals/contract-settings";
import { createMemoryContractSettingsRepository } from "../../../../packages/application/src/rentals/contract-settings-memory";
const agencyId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const context = { simulation: true as const, agencyId, role: "owner" as const };
const settings = defaultContractSettings(agencyId, { name: "Agence fictive légale", ice: "000000000000001", rc: "RC-DEMO", ifNumber: "123", address: "Adresse fictive", city: "Ville fictive", phone: "+212600000000", email: "demo@example.invalid" });
settings.conditions = "Conditions configurées de démonstration. Aucun contenu juridique approuvé.";
settings.footer = "Mention configurée\nDeuxième ligne fictive";
const common = { demonstration: true as const, agencyId, rentalId: "cccccccc-cccc-cccc-cccc-cccccccccccc", number: null,
  rental: { start: "2026-01-01T00:00:00Z", end: "2026-01-02T00:00:00Z", duration: "1 jour", pickup: "Fictif", returnLocation: "Fictif", dailyRateMinor: 10000n, amountMinor: 10000n, depositMinor: 20000n, mileage: "Non renseigné", allowance: "Non renseigné" },
  signatures: { customer: "not-signed" as const, agency: "not-signed" as const } };
const v1: ContractPresentationV1 = { ...common, primaryDriver: { name: "Conducteur fictif", identity: "IDENTITÉ-DEMO", licence: "PERMIS-DEMO", licenceDates: "Fictif", address: "Fictif" }, secondaryDriver: null, vehicle: { registration: "DEMO", makeModel: "Combiné fictif", vin: "Fictif" }, inspection: { fuel: "plein", damage: [], notes: "Fictif" } };
const v2: ContractPresentationV2 = { ...common, schemaVersion: 2, primaryDriver: { fullName: "Conducteur fictif", cin: null, passportNumber: null, drivingLicenseNumber: null, city: null, nationality: null, licenceDates: null, address: null }, secondaryDriver: null, vehicle: { make: "Marque fictive", model: "Modèle fictif", registrationNumber: "DEMO", vin: null }, inspection: v1.inspection };
const v3: ContractPresentationV3 = { ...v2, schemaVersion: 3, inspection: { departure: null, return: null } };
function dom(markup: string) { return new DOMParser().parseFromString(markup, "text/html"); }
describe("unsigned signature presentation", () => {
  it("shows two empty signature spaces, missing dates and no acceptance claim", () => {
    const page = dom(renderToStaticMarkup(<ContractSignaturePlaceholders signatures={common.signatures} />));
    expect(page.querySelectorAll("[data-signature-party]")).toHaveLength(2);
    for (const section of page.querySelectorAll("[data-signature-party]")) { expect(section.textContent).toContain("Non signé — en attente"); expect(section.textContent).toContain("Date et heure de signature : non renseignées"); expect(section.textContent).toContain("Acceptation des conditions : non renseignée"); }
    expect(page.body.textContent).toContain("Représentant de l’agence : identité non renseignée");
    expect(page.querySelector("img,svg,canvas,input,button,time")).toBeNull(); expect(page.body.textContent).not.toContain("Lu et Approuvé");
  });
  it.each([undefined, null, {}, { customer: "signed", agency: "not-signed" }, { ...common.signatures, signedAt: "SECRET-TIME" }])("fails closed for missing or unsupported signing data", value => { const result = renderToStaticMarkup(<ContractSignaturePlaceholders signatures={value} />); expect(result).toContain("non disponible"); expect(result).not.toContain("SECRET-TIME"); expect(result).not.toContain("en attente"); });
  it("does not invoke signing-data getters", () => { let invoked = false; const signatures = { ...common.signatures }; Object.defineProperty(signatures, "customer", { enumerable: true, get() { invoked = true; return "signed"; } }); expect(renderToStaticMarkup(<ContractSignaturePlaceholders signatures={signatures} />)).toContain("non disponible"); expect(invoked).toBe(false); });
  it("includes French and Arabic signature, date and acceptance labels", () => { const result = renderToStaticMarkup(<ContractSignaturePlaceholders bilingual signatures={common.signatures} />); for (const label of ["توقيع الزبون","توقيع الوكالة","تاريخ ووقت التوقيع","قبول الشروط","غير موقع"]) expect(result).toContain(label); expect(result).toContain('lang="ar" dir="rtl"'); });
});
describe("agency legal footer", () => {
  it("uses all existing company fields and the configured footer", () => { const result = renderToStaticMarkup(<ContractLegalFooter settings={settings} agencyId={agencyId} />); for (const value of Object.values(settings.company)) expect(result).toContain(value); for (const label of ["Raison sociale","Adresse","Ville","Téléphone","E-mail","ICE","RC","IF"]) expect(result).toContain(label); expect(dom(result).querySelector('[data-configured-footer]')?.textContent).toBe(settings.footer); });
  it("does not invent optional legal identifiers", () => { const page = dom(renderToStaticMarkup(<ContractLegalFooter settings={{ ...settings, company: { ...settings.company, ice: "", rc: "", ifNumber: "" } }} agencyId={agencyId} />)); for (const label of ["ICE","RC","IF"]) expect([...page.querySelectorAll("dl > div")].find(node => node.querySelector("dt")?.textContent === label)?.querySelector("dd")?.textContent).toBe("Non renseigné"); });
  it("does not fall back to another agency", () => { const result = renderToStaticMarkup(<ContractLegalFooter settings={settings} agencyId="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" />); expect(result).toContain("incompatible"); expect(result).not.toContain(settings.company.name); });
  it("escapes configured footer text and adds no clauses", () => { const result = renderToStaticMarkup(<ContractLegalFooter settings={{ ...settings, footer: "<script>DEMO</script>" }} agencyId={agencyId} />); expect(result).not.toContain("<script>"); expect(result).toContain("&lt;script&gt;"); expect(result).not.toContain("plein-plein"); });
});
describe("template and historical snapshot integration", () => {
  it.each([v1,v2,v3] as ReadableContractPresentation[])("bilingual compact layout preserves French content, isolated Arabic and snapshot $schemaVersion", document => {
    const original = structuredClone(document);
    const conditions = "Conditions FR/AR intégrales\nشروط كاملة دون حذف\n".repeat(80);
    const configured = { ...settings, conditions };
    const french = dom(renderToStaticMarkup(<ContractDocument settings={configured} document={document} />));
    const bilingual = dom(renderToStaticMarkup(<ContractDocument settings={{ ...configured, template: "bilingual" }} document={document} />));
    // Every original French label/value remains present when paired with Arabic.
    for (const node of french.querySelectorAll("[data-contract-sheet] *")) {
      if (!node.children.length && node.textContent?.trim()) expect(bilingual.body.textContent).toContain(node.textContent);
    }
    expect(bilingual.querySelector('[data-contract-conditions] p')?.textContent).toBe(conditions);
    expect(bilingual.querySelectorAll('[data-signature-party]')).toHaveLength(2);
    expect(bilingual.querySelectorAll('[data-legal-footer]')).toHaveLength(1);
    const arabic = [...bilingual.querySelectorAll("bdi")];
    expect(arabic.length).toBeGreaterThan(20);
    for (const run of arabic) { expect(run.lang).toBe("ar"); expect(run.dir).toBe("rtl"); }
    expect(document).toEqual(original);
  });
  it.each(Object.keys(contractTemplates) as (keyof typeof contractTemplates)[])("renders signature/footer sections in %s", template => {
    const page = dom(renderToStaticMarkup(<ContractDocument settings={{ ...settings, template }} document={v3} />));
    expect(page.querySelectorAll('[data-signature-party]')).toHaveLength(2); expect(page.querySelectorAll('[data-legal-footer]')).toHaveLength(1);
    expect(page.querySelectorAll('article')).toHaveLength(1);
    expect(page.querySelector('[data-contract-sheet] [data-contract-conditions]')).not.toBeNull();
    expect(page.body.textContent).toContain(settings.conditions); expect(page.body.textContent).toContain("RC-DEMO");
    if (template === "bilingual") for (const label of ["الاسم القانوني","السجل التجاري","التعريف الضريبي","توقيع الزبون"]) expect(page.body.textContent).toContain(label);
  });
  it.each([v1,v2,v3] as ReadableContractPresentation[])("preserves historical snapshot payload version $schemaVersion without inference", document => {
    const snapshot = { demonstration: true, settings: structuredClone(settings), document: structuredClone(document) }, before = structuredClone({ settings, document });
    Object.freeze(snapshot.document.signatures); Object.freeze(snapshot.document); Object.freeze(snapshot.settings.company); Object.freeze(snapshot.settings); Object.freeze(snapshot);
    const result = renderToStaticMarkup(<ContractDocument settings={snapshot.settings} document={snapshot.document} />);
    expect(result).toContain("Date et heure de signature"); expect(result).toContain("non renseignées"); expect(snapshot.settings).toEqual(before.settings); expect(snapshot.document).toEqual(before.document);
    expect(dom(result).querySelectorAll('[data-contract-sheet]')).toHaveLength(1);
    expect(dom(result).querySelectorAll('[data-legal-footer]')).toHaveLength(1);
    expect(snapshot.document.signatures).not.toHaveProperty("signedAt"); expect(snapshot.document.signatures).not.toHaveProperty("accepted");
  });
  it.each(Object.keys(contractTemplates) as (keyof typeof contractTemplates)[])("preserves full long conditions on one flowing sheet in %s", template => { const conditions = "Texte fictif non approuvé.\n".repeat(180); const page = dom(renderToStaticMarkup(<ContractDocument settings={{ ...settings, template, conditions }} document={v3} />)); const text = page.querySelector("[data-contract-conditions] p")?.textContent; expect(text).toBe(conditions); });
  it("keeps old snapshot footer values independent of later agency updates", async () => { const repo = createMemoryContractSettingsRepository(); await saveContractSettings(repo, context, settings); const snapshot = (await snapshotDemoContract(repo, context, v3))!; await saveContractSettings(repo, context, { ...(await repo.get(agencyId))!, company: { ...settings.company, name: "Nouvelle agence fictive" }, footer: "Nouvelle mention fictive" }); const result = renderToStaticMarkup(<ContractDocument settings={snapshot.settings} document={snapshot.document} />); expect(result).toContain("Agence fictive légale"); expect(result).not.toContain("Nouvelle agence fictive"); expect(Object.isFrozen(snapshot.document.signatures)).toBe(true); });
  it("uses no network or clock-derived signing data", () => { const fetch = vi.fn(() => { throw Error("Network forbidden"); }); vi.stubGlobal("fetch", fetch); try { const result = renderToStaticMarkup(<ContractDocument settings={settings} document={v3} />); expect(fetch).not.toHaveBeenCalled(); expect(result).not.toContain("datetime="); } finally { vi.unstubAllGlobals(); } });
});
