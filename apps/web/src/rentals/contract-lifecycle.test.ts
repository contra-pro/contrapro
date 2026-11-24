import { describe, expect, it, vi } from "vitest";
import { createOfflineContractLifecycle } from "../../../../packages/application/src/rentals/contract-lifecycle";
import { defaultContractSettings, saveContractSettings, type ContractPresentation, type SimulatedContext } from "../../../../packages/application/src/rentals/contract-settings";
import { createMemoryContractSettingsRepository } from "../../../../packages/application/src/rentals/contract-settings-memory";

const agencyId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", otherAgency = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const context: SimulatedContext = { simulation: true, agencyId, role: "owner" };
const settings = defaultContractSettings(agencyId, { name: "Agence fictive", ice: "", rc: "", ifNumber: "", address: "Adresse fictive", city: "Casablanca", phone: "+212600000000", email: "demo@example.invalid" });
const document = (): ContractPresentation => ({ schemaVersion: 3, demonstration: true, agencyId, rentalId: "cccccccc-cccc-cccc-cccc-cccccccccccc", number: null,
  primaryDriver: { fullName: "Conducteur fictif", cin: null, passportNumber: null, drivingLicenseNumber: null, city: null, nationality: null, licenceDates: null, address: null }, secondaryDriver: null,
  vehicle: { make: "Marque fictive", model: "Modèle fictif", registrationNumber: "DEMO", vin: null },
  rental: { start: "2026-01-01T09:00:00Z", end: "2026-01-02T09:00:00Z", duration: "1 jour", pickup: "Agence fictive", returnLocation: "Agence fictive", dailyRateMinor: 10000n, amountMinor: 10000n, depositMinor: 20000n, mileage: "10000 km", allowance: "200 km/jour" },
  inspection: { departure: null, return: null }, signatures: { customer: "not-signed", agency: "not-signed" } });
async function setup() {
  const repository = createMemoryContractSettingsRepository(); await saveContractSettings(repository, context, settings);
  const lifecycle = createOfflineContractLifecycle(repository), created = await lifecycle.createDraft(context, document());
  if (!created.ok) throw Error("Fixture failed");
  return { repository, lifecycle, draft: created.value };
}
describe("bounded offline contract lifecycle", () => {
  it("inherits saved agency settings automatically and stores an editable draft simulation", async () => {
    const { lifecycle, draft } = await setup();
    expect(draft.state).toBe("draft"); expect(draft.simulationId).toBeNull(); expect(draft.snapshot).toBeNull();
    expect(draft.draft?.settings.revision).toBe(1); expect(draft.signingEvidence).toBeNull();
    const edited = lifecycle.editDraft(context, draft.id, draft.revision, { ...document(), primaryDriver: { ...document().primaryDriver, fullName: "Autre conducteur fictif" } });
    expect(edited.ok).toBe(true); if (!edited.ok) return;
    expect(edited.value.draft?.document.primaryDriver.fullName).toBe("Autre conducteur fictif"); expect(edited.value.revision).toBe(2);
    expect(draft.draft?.document.primaryDriver.fullName).toBe("Conducteur fictif");
  });
  it("captures the displayed inherited settings and document in a deep-frozen final snapshot", async () => {
    const { repository, lifecycle, draft } = await setup();
    await saveContractSettings(repository, context, { ...(await repository.get(agencyId))!, template: "luxury", conditions: "Nouvelles conditions fictives" });
    const result = lifecycle.transition(context, draft.id, draft.revision, "finalized"); expect(result.ok).toBe(true); if (!result.ok) return;
    const entry = result.value; expect(entry.state).toBe("finalized"); expect(entry.simulationId).toMatch(/^SIM-/);
    expect(entry.draft).toBeNull(); expect(entry.snapshot?.settings.template).toBe("classic"); expect(entry.snapshot?.document.number).toBeNull();
    expect(Object.isFrozen(entry)).toBe(true); expect(Object.isFrozen(entry.snapshot?.settings.company)).toBe(true);
    expect(Object.isFrozen(entry.snapshot?.document.signatures)).toBe(true);
    expect(Reflect.set(entry.snapshot!.settings.company, "name", "MUTATION")).toBe(false);
    expect(lifecycle.editDraft(context, entry.id, entry.revision, document())).toEqual({ ok: false, code: "immutable" });
    expect(lifecycle.get(context, entry.id)).toBe(entry);
  });
  it("allows only finalized → signing-pending and preserves the exact unsigned snapshot", async () => {
    const { lifecycle, draft } = await setup(); const finalized = lifecycle.transition(context, draft.id, 1, "finalized"); if (!finalized.ok) throw Error("Fixture");
    const pending = lifecycle.transition(context, draft.id, 2, "signing-pending"); expect(pending.ok).toBe(true); if (!pending.ok) return;
    expect(pending.value.state).toBe("signing-pending"); expect(pending.value.snapshot).toBe(finalized.value.snapshot);
    expect(pending.value.signingEvidence).toBeNull(); expect(pending.value.snapshot?.document.signatures).toEqual({ customer: "not-signed", agency: "not-signed" });
    expect(lifecycle.editDraft(context, draft.id, 3, document())).toEqual({ ok: false, code: "immutable" });
  });
  it("rejects skipped, reversed, repeated and Signed transitions without changing state", async () => {
    const { lifecycle, draft } = await setup();
    expect(lifecycle.transition(context, draft.id, 1, "signing-pending")).toEqual({ ok: false, code: "invalid-transition" });
    expect(lifecycle.transition(context, draft.id, 1, "signed")).toEqual({ ok: false, code: "signed-unavailable" });
    lifecycle.transition(context, draft.id, 1, "finalized");
    expect(lifecycle.transition(context, draft.id, 1, "finalized")).toEqual({ ok: false, code: "conflict" });
    expect(lifecycle.transition(context, draft.id, 2, "draft")).toEqual({ ok: false, code: "invalid-transition" });
    expect(lifecycle.transition(context, draft.id, 2, "signed")).toEqual({ ok: false, code: "signed-unavailable" });
    lifecycle.transition(context, draft.id, 2, "signing-pending");
    expect(lifecycle.transition(context, draft.id, 3, "signed")).toEqual({ ok: false, code: "signed-unavailable" });
    expect(lifecycle.transition(context, draft.id, 3, "finalized")).toEqual({ ok: false, code: "invalid-transition" });
    expect(lifecycle.get(context, draft.id)?.state).toBe("signing-pending");
  });
  it("isolates creation, reads, lists, edits and transitions by explicit agency context", async () => {
    const { lifecycle, draft } = await setup(), other = { ...context, agencyId: otherAgency };
    expect(lifecycle.get(other, draft.id)).toBeNull(); expect(lifecycle.list(other)).toEqual([]);
    expect(lifecycle.editDraft(other, draft.id, 1, document())).toEqual({ ok: false, code: "not-found" });
    expect(lifecycle.transition(other, draft.id, 1, "finalized")).toEqual({ ok: false, code: "not-found" });
    expect(await lifecycle.createDraft(other, document())).toEqual({ ok: false, code: "invalid" });
    expect(lifecycle.get(context, draft.id)).toBe(draft);
  });
  it("rejects stale draft edits and duplicate creation rather than retrying", async () => {
    const { lifecycle, draft } = await setup(); lifecycle.editDraft(context, draft.id, 1, document());
    expect(lifecycle.editDraft(context, draft.id, 1, document())).toEqual({ ok: false, code: "conflict" });
    expect(await lifecycle.createDraft(context, document())).toEqual({ ok: false, code: "conflict" });
    expect(lifecycle.get(context, draft.id)?.revision).toBe(2);
  });
  it("does not fabricate signing evidence from the clock or make network calls", async () => {
    const { lifecycle, draft } = await setup();
    const fetch = vi.fn(() => { throw Error("No network"); }); vi.stubGlobal("fetch", fetch);
    const now = vi.spyOn(Date, "now").mockImplementation(() => { throw Error("No clock evidence"); });
    try {
      lifecycle.transition(context, draft.id, 1, "finalized"); lifecycle.transition(context, draft.id, 2, "signing-pending");
      const result = lifecycle.get(context, draft.id)!;
      expect(result.signingEvidence).toBeNull(); expect(result).not.toHaveProperty("signedAt"); expect(result).not.toHaveProperty("consent");
      expect(result.snapshot?.document.signatures).not.toHaveProperty("signedAt"); expect(now).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
    } finally { now.mockRestore(); vi.unstubAllGlobals(); }
  });
  it("requires saved settings, rejects repository substitution, and attempts a failed read only once", async () => {
    const get = vi.fn(async () => { throw Error("SECRET"); });
    const lifecycle = createOfflineContractLifecycle({ get, save: async () => false });
    expect(await lifecycle.createDraft(context, document())).toEqual({ ok: false, code: "settings-unavailable" }); expect(get).toHaveBeenCalledOnce();
    expect(lifecycle.list(context)).toEqual([]);
    const substituted = createOfflineContractLifecycle({ get: async () => ({ ...settings, agencyId: otherAgency }), save: async () => false });
    expect(await substituted.createDraft(context, document())).toEqual({ ok: false, code: "settings-unavailable" });
  });
  it("rejects production numbers, signing metadata and historical writes without converting them", async () => {
    const { lifecycle, draft } = await setup();
    for (const patch of [{ number: "PRODUCTION-FAKE" }, { schemaVersion: 2 }, { signedAt: "FAKE" }, { signatures: { customer: "signed", agency: "not-signed" } }, { signatures: { ...document().signatures, acceptedAt: "FAKE" } }]) {
      expect(lifecycle.editDraft(context, draft.id, 1, { ...document(), ...patch } as ContractPresentation)).toEqual({ ok: false, code: "invalid" });
    }
    expect(lifecycle.get(context, draft.id)).toBe(draft);
  });
  it("copies draft data and context before awaiting settings, and never silently follows caller mutation", async () => {
    let resolve!: (value: typeof settings) => void;
    const waiting = new Promise<typeof settings>(done => { resolve = done; });
    const lifecycle = createOfflineContractLifecycle({ get: async () => waiting, save: async () => false });
    const input = document(), suppliedContext = { ...context };
    const pending = lifecycle.createDraft(suppliedContext, input);
    input.primaryDriver.fullName = "CHANGED AFTER CALL"; suppliedContext.agencyId = otherAgency;
    resolve({ ...settings, revision: 1 });
    const result = await pending; expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.value.agencyId).toBe(agencyId); expect(result.value.draft?.document.primaryDriver.fullName).toBe("Conducteur fictif");
    expect(lifecycle.get(context, input.rentalId)).toBe(result.value); expect(lifecycle.get(suppliedContext, input.rentalId)).toBeNull();
  });
  it("rejects concurrent duplicate creation after the asynchronous read without overwriting", async () => {
    let resolve!: (value: typeof settings) => void;
    const waiting = new Promise<typeof settings>(done => { resolve = done; });
    const get = vi.fn(async () => waiting), lifecycle = createOfflineContractLifecycle({ get, save: async () => false });
    const first = lifecycle.createDraft(context, document()), second = lifecycle.createDraft(context, document());
    resolve({ ...settings, revision: 1 });
    const results = await Promise.all([first, second]);
    expect(results.filter(result => result.ok)).toHaveLength(1); expect(results).toContainEqual({ ok: false, code: "conflict" });
    expect(get).toHaveBeenCalledTimes(2); expect(lifecycle.list(context)).toHaveLength(1);
  });
  it("rejects non-simulation contexts and rebinding an existing draft to another rental", async () => {
    const { lifecycle, draft } = await setup(), real = { ...context, simulation: false } as unknown as SimulatedContext;
    expect(await lifecycle.createDraft(real, document())).toEqual({ ok: false, code: "forbidden" });
    expect(lifecycle.get(real, draft.id)).toBeNull(); expect(lifecycle.list(real)).toEqual([]);
    expect(lifecycle.transition(real, draft.id, 1, "finalized")).toEqual({ ok: false, code: "forbidden" });
    expect(lifecycle.editDraft(context, draft.id, 1, { ...document(), rentalId: "dddddddd-dddd-dddd-dddd-dddddddddddd" })).toEqual({ ok: false, code: "invalid" });
  });
  it.each([
    ["draft", "draft", "invalid-transition"], ["draft", "finalized", null], ["draft", "signing-pending", "invalid-transition"], ["draft", "signed", "signed-unavailable"],
    ["finalized", "draft", "invalid-transition"], ["finalized", "finalized", "invalid-transition"], ["finalized", "signing-pending", null], ["finalized", "signed", "signed-unavailable"],
    ["signing-pending", "draft", "invalid-transition"], ["signing-pending", "finalized", "invalid-transition"], ["signing-pending", "signing-pending", "invalid-transition"], ["signing-pending", "signed", "signed-unavailable"],
  ] as const)("acceptance matrix: %s → %s", async (source, target, rejection) => {
    const { lifecycle, draft } = await setup();
    if (source !== "draft") lifecycle.transition(context, draft.id, 1, "finalized");
    if (source === "signing-pending") lifecycle.transition(context, draft.id, 2, "signing-pending");
    const before = lifecycle.get(context, draft.id)!;
    const result = lifecycle.transition(context, draft.id, before.revision, target);
    if (rejection) {
      expect(result).toEqual({ ok: false, code: rejection }); expect(lifecycle.get(context, draft.id)).toBe(before);
    } else {
      expect(result.ok).toBe(true); if (!result.ok) return;
      expect(result.value.state).toBe(target); expect(result.value.revision).toBe(before.revision + 1);
    }
    const after = lifecycle.get(context, draft.id)!;
    expect(after.state).not.toBe("signed"); expect(after.signingEvidence).toBeNull();
    expect((after.state === "draft" ? after.draft : after.snapshot).document.signatures).toEqual({ customer: "not-signed", agency: "not-signed" });
  });
  it("rejects duplicate finalization/pending attempts with stale and current revisions without replacing snapshots", async () => {
    const { lifecycle, draft } = await setup();
    lifecycle.transition(context, draft.id, 1, "finalized"); const finalized = lifecycle.get(context, draft.id)!;
    for (let attempt = 0; attempt < 3; attempt++) {
      expect(lifecycle.transition(context, draft.id, 1, "finalized")).toEqual({ ok: false, code: "conflict" });
      expect(lifecycle.transition(context, draft.id, 2, "finalized")).toEqual({ ok: false, code: "invalid-transition" });
      expect(lifecycle.get(context, draft.id)).toBe(finalized);
    }
    lifecycle.transition(context, draft.id, 2, "signing-pending"); const pending = lifecycle.get(context, draft.id)!;
    for (let attempt = 0; attempt < 3; attempt++) {
      expect(lifecycle.transition(context, draft.id, 2, "signing-pending")).toEqual({ ok: false, code: "conflict" });
      expect(lifecycle.transition(context, draft.id, 3, "signing-pending")).toEqual({ ok: false, code: "invalid-transition" });
      expect(lifecycle.get(context, draft.id)).toBe(pending); expect(pending.snapshot).toBe(finalized.snapshot);
    }
  });
  it.each([-1, 0, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER, 4])("rejects invalid/stale revision %s for both writes without side effects", async revision => {
    const { lifecycle, draft } = await setup();
    expect(lifecycle.editDraft(context, draft.id, revision, document())).toEqual({ ok: false, code: "conflict" });
    expect(lifecycle.transition(context, draft.id, revision, "finalized")).toEqual({ ok: false, code: "conflict" });
    expect(lifecycle.get(context, draft.id)).toBe(draft);
  });
  it("separates two agencies even when they use exactly the same rental UUID", async () => {
    const { repository, lifecycle, draft } = await setup(), other = { ...context, agencyId: otherAgency };
    await saveContractSettings(repository, other, { ...settings, agencyId: otherAgency, company: { ...settings.company, name: "Agence fictive B" } });
    const created = await lifecycle.createDraft(other, { ...document(), agencyId: otherAgency }); if (!created.ok) throw Error("Fixture");
    expect(created.value.id).toBe(draft.id); expect(created.value.draft?.settings.company.name).toBe("Agence fictive B");
    expect(lifecycle.editDraft(other, draft.id, 1, document())).toEqual({ ok: false, code: "invalid" });
    lifecycle.transition(other, draft.id, 1, "finalized");
    expect(lifecycle.get(context, draft.id)).toBe(draft); expect(lifecycle.get(other, draft.id)?.state).toBe("finalized");
    lifecycle.transition(context, draft.id, 1, "finalized");
    expect(lifecycle.get(context, draft.id)?.simulationId).not.toBe(lifecycle.get(other, draft.id)?.simulationId);
    expect(lifecycle.list(context)).toHaveLength(1); expect(lifecycle.list(other)).toHaveLength(1);
  });
  it("blocks nested changes, deletion and array mutation in the final snapshot and returned lists", async () => {
    const { lifecycle } = await setup();
    const input = document();
    input.inspection.departure = { stage: "departure", provenance: "demonstration", fuelLevel: 3, mileageKm: 10000, notes: "Fictif", damage: [{ id: "demo", view: "top", category: "scratch", x: 50, y: 50 }] };
    lifecycle.editDraft(context, input.rentalId, 1, input);
    const draft = lifecycle.get(context, input.rentalId)!; lifecycle.transition(context, input.rentalId, 2, "finalized");
    const finalized = lifecycle.get(context, input.rentalId)!;
    expect(finalized.snapshot).not.toBe(draft.draft); expect(finalized.snapshot).toEqual(draft.draft);
    if (finalized.snapshot?.document.schemaVersion !== 3) throw Error("Fixture");
    const damage = finalized.snapshot.document.inspection.departure!.damage;
    expect(Reflect.set(damage[0]!, "x", 99)).toBe(false);
    expect(Reflect.deleteProperty(finalized.snapshot.settings.company, "name")).toBe(false);
    expect(() => Array.prototype.push.call(damage, { id: "forbidden", view: "top", category: "other", x: 1, y: 1 })).toThrow(TypeError);
    expect(Reflect.set(finalized, "signingEvidence", {})).toBe(false);
    expect(Object.isFrozen(lifecycle.list(context))).toBe(true);
    expect(lifecycle.get(context, input.rentalId)).toBe(finalized); expect(damage[0]?.x).toBe(50);
  });
});
