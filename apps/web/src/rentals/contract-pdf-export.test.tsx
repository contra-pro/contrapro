// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contractTemplates, defaultContractSettings, saveContractSettings, snapshotDemoContract, type ContractPresentationV1, type ContractPresentationV2, type ContractPresentationV3, type DocumentSnapshot } from "../../../../packages/application/src/rentals/contract-settings";
import { createMemoryContractSettingsRepository } from "../../../../packages/application/src/rentals/contract-settings-memory";
import { ContractDocument } from "./contract-document";
import { ContractPdfExport } from "./contract-pdf-export";

const agencyId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const otherAgencyId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const settings = defaultContractSettings(agencyId, { name: "Agence fictive A", ice: "", ifNumber: "", rc: "", address: "Adresse fictive", city: "Casablanca", phone: "+212600000000", email: "demo@example.invalid" });
const v1: ContractPresentationV1 = { demonstration: true, agencyId, rentalId: "cccccccc-cccc-cccc-cccc-cccccccccccc", number: null,
  primaryDriver: { name: "Ancien conducteur fictif", identity: "IDENTITE-DEMO", licence: "PERMIS-DEMO", licenceDates: "Dates fictives", address: "Adresse fictive" }, secondaryDriver: null,
  vehicle: { makeModel: "Marque modele historique", registration: "DEMO-01", vin: "VIN-DEMO" },
  rental: { start: "2026-01-01T09:00:00Z", end: "2026-01-02T09:00:00Z", duration: "1 jour", pickup: "Agence fictive", returnLocation: "Agence fictive", dailyRateMinor: 30000n, amountMinor: 30000n, depositMinor: 100000n, mileage: "10000 km", allowance: "200 km/jour" },
  inspection: { fuel: "plein", damage: [{ view: "gauche", x: 55, y: 48 }], notes: "Historique fictif" }, signatures: { customer: "not-signed", agency: "not-signed" } };
const v2: ContractPresentationV2 = { ...v1, schemaVersion: 2,
  secondaryDriver: null,
  primaryDriver: { fullName: "Conducteur fictif", cin: "CIN-DEMO", passportNumber: null, drivingLicenseNumber: "PERMIS-DEMO", city: "Ville fictive", nationality: null, licenceDates: null, address: null },
  vehicle: { make: "Marque fictive", model: "Modele fictif", registrationNumber: "DEMO-01", vin: null } };
const v3: ContractPresentationV3 = { ...v2, schemaVersion: 3,
  inspection: { departure: { stage: "departure", provenance: "demonstration", fuelLevel: 3, mileageKm: 10000, damage: [{ id: "demo", view: "left", category: "scratch", x: 55, y: 48 }], notes: "Observation fictive" }, return: null } };
const snapshot = (): DocumentSnapshot => ({ demonstration: true, settings: structuredClone(settings), document: structuredClone(v3) });
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  Object.defineProperty(document, "fonts", { configurable: true, value: { status: "loaded", ready: Promise.resolve(), addEventListener() {}, removeEventListener() {} } });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function mount(value: DocumentSnapshot | null = snapshot(), agency = agencyId) {
  await act(async () => root.render(<ContractPdfExport snapshot={value} agencyId={agency} />));
}
async function click() { await act(async () => host.querySelector("button")!.click()); }

describe("offline snapshot PDF export", () => {
  it.each(Object.keys(contractTemplates) as (keyof typeof contractTemplates)[])("uses the same immutable snapshot document in %s for V1/V2/V3", template => {
    for (const document of [v1,v2,v3]) {
      const value = { demonstration: true as const, settings: { ...settings, template }, document } as DocumentSnapshot;
      const before = structuredClone(value);
      const exported = new DOMParser().parseFromString(renderToStaticMarkup(<ContractPdfExport snapshot={value} agencyId={agencyId} />), "text/html");
      const preview = new DOMParser().parseFromString(renderToStaticMarkup(<ContractDocument settings={value.settings} document={value.document} />), "text/html");
      expect(exported.querySelector('[data-contract-sheet]')?.outerHTML).toBe(preview.querySelector('[data-contract-sheet]')?.outerHTML);
      expect(exported.querySelectorAll('[data-contract-sheet]')).toHaveLength(1);
      expect(value).toEqual(before);
    }
  });
  it("requests browser printing without network, mutations, download links or false success", async () => {
    const value = snapshot(), before = structuredClone(value);
    const fetch = vi.fn(() => { throw Error("No network"); }); vi.stubGlobal("fetch", fetch);
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    await mount(value); expect(host.querySelector("button")?.textContent).toBe("Imprimer / Enregistrer en PDF");
    await click();
    expect(print).toHaveBeenCalledOnce(); expect(fetch).not.toHaveBeenCalled(); expect(value).toEqual(before);
    expect(host.querySelector('[data-pdf-status]')?.textContent).toContain("Aucun téléchargement confirmé");
    expect(host.querySelector('a[download],iframe,canvas')).toBeNull();
    expect(host.textContent).not.toMatch(/PDF téléchargé|Téléchargement réussi|enregistré avec succès/i);
    // A cancelled/no-op browser dialog must not be reported as a downloaded file.
    await click(); expect(print).toHaveBeenCalledTimes(2);
  });
  it.each(["missing", "selected-agency", "settings-agency", "document-agency", "unsupported-version", "invalid-settings"])("refuses %s snapshots before exposing data or printing", async kind => {
    const value = snapshot();
    if (kind === "document-agency") value.document.agencyId = otherAgencyId;
    if (kind === "settings-agency") value.settings.agencyId = otherAgencyId;
    if (kind === "unsupported-version") Object.assign(value.document, { schemaVersion: 99 });
    if (kind === "invalid-settings") value.settings.logo = "https://example.invalid/logo.png";
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    await mount(kind === "missing" ? null : value, kind === "selected-agency" ? otherAgencyId : agencyId);
    expect(host.querySelector("button")).toBeNull(); expect(host.querySelector('[data-contract-sheet]')).toBeNull();
    expect(host.textContent).not.toContain("CIN-DEMO"); expect(print).not.toHaveBeenCalled();
  });
  it("uses saved snapshot settings after agency branding/template/conditions change", async () => {
    const repo = createMemoryContractSettingsRepository(), context = { simulation: true as const, agencyId, role: "owner" as const };
    await saveContractSettings(repo, context, settings);
    const value = (await snapshotDemoContract(repo, context, v3))!;
    const before = structuredClone(value);
    await saveContractSettings(repo, context, { ...(await repo.get(agencyId))!, template: "luxury", company: { ...settings.company, name: "NOUVELLE AGENCE" }, conditions: "NOUVELLES CONDITIONS" });
    await mount(value); vi.spyOn(window, "print").mockImplementation(() => undefined); await click();
    expect(host.textContent).toContain("Agence fictive A"); expect(host.textContent).not.toContain("NOUVELLE AGENCE");
    expect(host.textContent).not.toContain("NOUVELLES CONDITIONS"); expect(value).toEqual(before);
    expect(Object.isFrozen(value.settings)).toBe(true); expect(Object.isFrozen(value.document)).toBe(true);
  });
  it("retains complete long conditions through the print request", async () => {
    const value = snapshot(); value.settings.conditions = "Conditions intégrales FR/AR — شروط كاملة\n".repeat(180);
    vi.spyOn(window, "print").mockImplementation(() => undefined); await mount(value); await click();
    expect(host.querySelector('[data-contract-conditions] p')?.textContent).toBe(value.settings.conditions);
    expect(host.querySelectorAll('[data-signature-party]')).toHaveLength(2); expect(host.querySelectorAll('[data-legal-footer]')).toHaveLength(1);
    expect(host.querySelector('[data-marker]')).not.toBeNull();
  });
  it("reports an unavailable browser print function truthfully", async () => {
    vi.stubGlobal("print", undefined); await mount(); await click();
    expect(host.querySelector('[data-pdf-status]')?.textContent).toContain("indisponible");
  });
  it("reports a print exception without leaking its message or claiming a download", async () => {
    vi.spyOn(window, "print").mockImplementation(() => { throw Error("SECRET"); }); await mount(); await click();
    expect(host.querySelector('[data-pdf-status]')?.textContent).toContain("Impossible"); expect(host.textContent).not.toContain("SECRET");
  });
  it("waits for loading fonts instead of printing incomplete glyphs", async () => {
    Object.assign(document.fonts, { status: "loading" });
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined); await mount(); await click();
    expect(print).not.toHaveBeenCalled(); expect(host.querySelector('[data-pdf-status]')?.textContent).toContain("polices");
  });
  it("refuses an unloaded/broken logo, then prints when the existing inline image is ready", async () => {
    // Structurally bounded inline PNG; readiness is supplied by the image decoder.
    const value = snapshot();
    value.settings.logo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jovkAAAAASUVORK5CYII=";
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    await mount(value);
    const image = host.querySelector("img")!;
    expect(image.src).toBe(value.settings.logo);
    Object.defineProperty(image, "complete", { configurable: true, value: false }); await click();
    expect(print).not.toHaveBeenCalled(); expect(host.querySelector('[data-pdf-status]')?.textContent).toContain("Logo non chargé");
    Object.defineProperty(image, "complete", { configurable: true, value: true });
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 0 }); await click();
    expect(print).not.toHaveBeenCalled();
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 1 }); await click();
    expect(print).toHaveBeenCalledOnce();
  });
});
