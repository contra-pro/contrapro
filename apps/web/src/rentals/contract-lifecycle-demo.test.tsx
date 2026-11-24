// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createOfflineContractLifecycle, type OfflineContractLifecycle } from "../../../../packages/application/src/rentals/contract-lifecycle";
import { defaultContractSettings, saveContractSettings, type ContractPresentation, type ContractPresentationV1, type ContractPresentationV2, type DocumentSnapshot, type SimulatedContext } from "../../../../packages/application/src/rentals/contract-settings";
import { createMemoryContractSettingsRepository } from "../../../../packages/application/src/rentals/contract-settings-memory";
import { ContractLifecycleDemo } from "./contract-lifecycle-demo";

const agencyId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const context: SimulatedContext = { simulation: true, agencyId, role: "owner" };
const settings = defaultContractSettings(agencyId, { name: "Agence fictive", ice: "", ifNumber: "", rc: "", address: "Adresse fictive", city: "Casablanca", phone: "+212600000000", email: "demo@example.invalid" });
const document: ContractPresentation = { schemaVersion: 3, demonstration: true, agencyId, rentalId: "cccccccc-cccc-cccc-cccc-cccccccccccc", number: null,
  primaryDriver: { fullName: "Conducteur fictif", cin: null, passportNumber: null, drivingLicenseNumber: null, city: null, nationality: null, licenceDates: null, address: null }, secondaryDriver: null,
  vehicle: { make: "Marque fictive", model: "Modèle fictif", registrationNumber: "DEMO", vin: null },
  rental: { start: "2026-01-01T09:00:00Z", end: "2026-01-02T09:00:00Z", duration: "1 jour", pickup: "Agence fictive", returnLocation: "Agence fictive", dailyRateMinor: 10000n, amountMinor: 10000n, depositMinor: 20000n, mileage: "10000 km", allowance: "200 km/jour" },
  inspection: { departure: null, return: null }, signatures: { customer: "not-signed", agency: "not-signed" } };
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  Object.defineProperty(globalThis.document, "fonts", { configurable: true, value: { status: "loaded", ready: Promise.resolve(), addEventListener() {}, removeEventListener() {} } });
  host = globalThis.document.createElement("div"); globalThis.document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function setup() {
  const repo = createMemoryContractSettingsRepository(); await saveContractSettings(repo, context, settings);
  const service = createOfflineContractLifecycle(repo), created = await service.createDraft(context, document); if (!created.ok) throw Error("Fixture");
  let entry = created.value;
  const render = () => root.render(<ContractLifecycleDemo entry={entry} service={service} context={context} onChanged={value => { entry = value; render(); }} />);
  await act(async () => render());
  return { service, read: () => entry };
}
async function click(action: string) { await act(async () => host.querySelector<HTMLButtonElement>(`[data-lifecycle-action="${action}"]`)!.click()); }

it("shows allowed transitions, keeps Signed disabled, and printing never changes finalized/pending state", async () => {
  const { service, read } = await setup();
  const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
  const fetch = vi.fn(() => { throw Error("No network"); }); vi.stubGlobal("fetch", fetch);
  expect(host.querySelector('[data-lifecycle-state]')?.getAttribute('data-lifecycle-state')).toBe("draft");
  expect(host.textContent).toContain("modifiable"); expect(host.querySelector('[data-contract-print-action]')).toBeNull();
  expect(host.querySelector<HTMLButtonElement>('[data-lifecycle-action="signing-pending"]')!.disabled).toBe(true);
  expect(host.querySelector<HTMLButtonElement>('[data-lifecycle-action="signed"]')!.disabled).toBe(true);
  await click("finalized"); const finalized = read();
  expect(finalized.state).toBe("finalized"); expect(host.querySelector<HTMLFieldSetElement>('fieldset')!.disabled).toBe(true);
  await act(async () => host.querySelector<HTMLButtonElement>('[data-contract-print-action]')!.click());
  expect(service.get(context, finalized.id)).toBe(finalized); expect(read().state).toBe("finalized");
  await click("signing-pending"); const pending = read();
  expect(pending.state).toBe("signing-pending"); expect(host.textContent).toContain("Aucune demande de signature envoyée");
  await act(async () => host.querySelector<HTMLButtonElement>('[data-contract-print-action]')!.click());
  await click("signed"); expect(read()).toBe(pending); expect(pending.signingEvidence).toBeNull();
  expect(print).toHaveBeenCalledTimes(2); expect(fetch).not.toHaveBeenCalled();
});
it("requires explicit saving of dirty draft fields before finalization", async () => {
  const { read } = await setup(); const input = host.querySelector<HTMLInputElement>('[name="lifecycle-driver-name"]')!;
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "Autre conducteur fictif"); input.dispatchEvent(new Event("input", { bubbles: true })); });
  expect(host.querySelector<HTMLButtonElement>('[data-lifecycle-action="finalized"]')!.disabled).toBe(true);
  await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(read().draft?.document.primaryDriver.fullName).toBe("Autre conducteur fictif");
  await click("finalized"); expect(read().snapshot?.document.primaryDriver).toHaveProperty("fullName", "Autre conducteur fictif");
});
it("hides another agency's document, controls and PDF action", async () => {
  const { service, read } = await setup();
  await act(async () => root.render(<ContractLifecycleDemo entry={read()} service={service} context={{ ...context, agencyId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" }} onChanged={() => { throw Error("Forbidden"); }} />));
  expect(host.querySelector('input,button,[data-contract-sheet]')).toBeNull(); expect(host.textContent).not.toContain("Conducteur fictif");
});
it.each([1,2,3] as const)("keeps explicitly supplied historical V%s snapshots readable without rewriting them", async version => {
  const { service } = await setup();
  const v2: ContractPresentationV2 = { ...document, schemaVersion: 2, inspection: { fuel: "plein", damage: [], notes: "Notes historiques fictives" } };
  const v1: ContractPresentationV1 = { ...v2, schemaVersion: 1, primaryDriver: { name: "Ancien conducteur", identity: "IDENTITE COMBINEE", licence: "PERMIS", licenceDates: "Dates fictives", address: "Adresse fictive" }, secondaryDriver: null, vehicle: { makeModel: "MARQUE MODELE COMBINES", registration: "DEMO", vin: "VIN" } };
  const snapshot = { demonstration: true, settings, document: version === 1 ? v1 : version === 2 ? v2 : document } as DocumentSnapshot;
  const before = structuredClone(snapshot);
  const entry: OfflineContractLifecycle = { simulation: true, agencyId, id: document.rentalId, revision: 2, state: "finalized", simulationId: "SIM-HISTORICAL-FIXTURE", signingEvidence: null, draft: null, snapshot };
  await act(async () => root.render(<ContractLifecycleDemo entry={entry} service={service} context={context} onChanged={() => undefined} />));
  expect(host.querySelector('[data-contract-print-action]')).not.toBeNull(); expect(host.querySelectorAll('[data-legal-footer]')).toHaveLength(1);
  if (version === 1) expect(host.textContent).toContain("Archive V1");
  expect(snapshot).toEqual(before);
});
it("repeated printing and before/afterprint events preserve finalized and pending records exactly", async () => {
  const { service, read } = await setup();
  const print = vi.spyOn(window, "print").mockImplementation(() => { window.dispatchEvent(new Event("beforeprint")); window.dispatchEvent(new Event("afterprint")); });
  const fetch = vi.fn(() => { throw Error("No network"); }); vi.stubGlobal("fetch", fetch);
  await click("finalized");
  for (const state of ["finalized", "signing-pending"]) {
    if (state === "signing-pending") await click("signing-pending");
    const before = read(), copy = structuredClone(before);
    for (let attempt = 0; attempt < 5; attempt++) {
      await act(async () => host.querySelector<HTMLButtonElement>('[data-contract-print-action]')!.click());
      expect(service.get(context, before.id)).toBe(before); expect(read()).toEqual(copy);
      expect(read().state).toBe(state); expect(read().signingEvidence).toBeNull();
      expect(host.querySelector('[data-pdf-status]')?.textContent).toContain("Aucun téléchargement confirmé");
    }
  }
  expect(print).toHaveBeenCalledTimes(10); expect(fetch).not.toHaveBeenCalled();
});
it("reports stale-state conflicts without retrying or overwriting the newer record", async () => {
  const { service, read } = await setup(), stale = read();
  const changed = service.editDraft(context, stale.id, stale.revision, { ...document, primaryDriver: { ...document.primaryDriver, fullName: "Version plus récente" } });
  if (!changed.ok) throw Error("Fixture");
  await click("finalized");
  expect(host.querySelector('[data-lifecycle-status][role="alert"]')?.textContent).toContain("Révision périmée");
  expect(host.querySelector('[data-lifecycle-status]')?.textContent).toContain("Aucune relance automatique");
  await click("finalized");
  expect(service.get(context, stale.id)).toBe(changed.value); expect(read()).toBe(stale);
  expect(service.get(context, stale.id)?.state).toBe("draft");
});
it("repeated clicks on disabled transitions cannot advance or create a Signed state", async () => {
  const { service, read } = await setup();
  await click("signing-pending"); await click("signed"); expect(read().state).toBe("draft");
  await click("finalized"); const finalized = read();
  for (let attempt = 0; attempt < 3; attempt++) { await click("finalized"); await click("signed"); }
  expect(read()).toBe(finalized);
  await click("signing-pending"); const pending = read();
  for (let attempt = 0; attempt < 3; attempt++) { await click("finalized"); await click("signing-pending"); await click("signed"); }
  expect(read()).toBe(pending); expect(service.get(context, pending.id)).toBe(pending); expect(pending.signingEvidence).toBeNull();
});
