import { describe, expect, it, vi } from "vitest";
import { assessOfflineSigningEvidenceTrust, decodeOfflineSigningEvidence, decodeSyntheticSigningResolutionInputs, listOfflineSigningEvidenceReferences, validateOfflineSigningEvidence } from "../../../../packages/application/src/rentals/signing-evidence";
import { resolveSyntheticSigningEvidence } from "../../../../packages/application/src/rentals/signing-evidence-resolution";
import { createOfflineContractLifecycle } from "../../../../packages/application/src/rentals/contract-lifecycle";
import { defaultContractSettings, saveContractSettings, type ContractPresentation, type SimulatedContext } from "../../../../packages/application/src/rentals/contract-settings";
import { createMemoryContractSettingsRepository } from "../../../../packages/application/src/rentals/contract-settings-memory";
import { conformanceFieldGroups, conformanceObjectAt, createConformanceFixture, signingConformanceVectors, syntheticAgencyId, syntheticContractId, type ConformanceFixture } from "./__fixtures__/signing-evidence-conformance";

const resolve = (f: ConformanceFixture) => resolveSyntheticSigningEvidence(f.record, f.context, f.collection);
const mandatoryCases = conformanceFieldGroups.flatMap(([path, fields]) => fields.map(field => ({ path, field, label: `${path}.${field}` })));
function freezeDeep(value: unknown): void {
  if (value && typeof value === "object") { for (const child of Object.values(value)) freezeDeep(child); Object.freeze(value); }
}
function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).reverse().map(([key, child]) => [key, reverseObjectKeys(child)]));
  return value;
}

describe("offline signing evidence V1 conformance vectors", () => {
  it.each(signingConformanceVectors)("$id: $category", vector => {
    const f = vector.create(), before = structuredClone(f);
    expect(vector.create()).toEqual(f);
    const decoded = decodeOfflineSigningEvidence(f.record);
    expect(decoded.ok ? "ok" : decoded.code).toBe(vector.decode);
    const validated = validateOfflineSigningEvidence(f.record, f.context.binding);
    expect(validated.ok ? "ok" : validated.code).toBe(vector.validation);
    const result = resolve(f);
    expect(result.status).toBe(vector.status); expect(result.inputErrors).toEqual(vector.inputErrors);
    expect(result.trust).toBe("unverified"); expect(result.canActivateSigned).toBe(false);
    expect(result.missingReferences).toHaveLength(vector.missing ?? 0);
    expect(result.duplicateReferences).toHaveLength(vector.duplicates ?? 0);
    expect(result.conflictingReferences).toHaveLength(vector.conflicts ?? 0);
    expect([...new Set(result.bindingMismatches.flatMap(row => row.codes))].sort()).toEqual([...(vector.mismatchCodes ?? [])].sort());
    expect(result.unresolvedTrustDependencies).toHaveLength(10);
    const trust = assessOfflineSigningEvidenceTrust(f.record, f.context.binding);
    expect(trust).toMatchObject({ ok: false, canActivateSigned: false, code: vector.validation === "ok" ? vector.trustCode ?? "trust-verification-unavailable" : vector.validation });
    if (decoded.ok) {
      expect(decoded.trust).toBe("unverified"); expect(decoded.canActivateSigned).toBe(false);
      expect(resolveSyntheticSigningEvidence(decoded.value, f.context, f.collection)).toEqual(result);
      expect(Object.isFrozen(decoded.value.binding.snapshotDigest)).toBe(true);
    } else { expect(decoded.canActivateSigned).toBe(false); expect(decoded).not.toHaveProperty("trust"); }
    expect(resolve(f)).toEqual(result); expect(f).toEqual(before);
    // JSON compatibility is not canonical hashing. Plain data key/row order must
    // not turn ambiguity into an acceptable candidate or change fixed errors.
    const json = JSON.parse(JSON.stringify(f)) as ConformanceFixture;
    json.collection.records.reverse(); expect(resolve(json)).toEqual(result);
    const reordered = reverseObjectKeys(f) as ConformanceFixture; expect(resolve(reordered)).toEqual(result);
  });

  it.each(conformanceFieldGroups)("pins exact fields of %s", (path, fields) => {
    const object = conformanceObjectAt(createConformanceFixture(2), path);
    expect(Reflect.ownKeys(object).sort()).toEqual([...fields].sort());
  });
  it.each(mandatoryCases)("requires present field $label", ({ path, field }) => {
    const f = createConformanceFixture(2); expect(Reflect.deleteProperty(conformanceObjectAt(f, path), field)).toBe(true);
    const result = resolve(f); expect(result.status).toBe("invalid-input"); expect(result.canActivateSigned).toBe(false);
    expect(result.inputErrors).toEqual([path.startsWith("record") ? "invalid-structure" : path.startsWith("context") ? "invalid-resolution-context" : "invalid-fixture-collection"]);
  });
  it.each(conformanceFieldGroups)("rejects unknown string/symbol keys in %s", path => {
    for (const key of ["futureField", Symbol("future-field")]) {
      const f = createConformanceFixture(2); Reflect.set(conformanceObjectAt(f, path), key, "synthetic-unknown-value");
      expect(resolve(f).status).toBe("invalid-input");
    }
  });
  it.each([0, 1, 2] as const)("keeps a provider count of %i explicit and nullable, never omitted", providers => {
    const f = createConformanceFixture(providers), decoded = decodeOfflineSigningEvidence(f.record);
    expect(decoded.ok).toBe(true); if (!decoded.ok) return;
    expect(listOfflineSigningEvidenceReferences(decoded.value).map(r => r.id).sort()).toEqual(f.collection.records.map(r => r.reference.id).sort());
    expect(resolve(f).resolvedReferences).toHaveLength(24 + providers * 2);
    expect(f.record.parties.filter(p => p.providerOperation !== null)).toHaveLength(providers);
    Reflect.deleteProperty(f.record.parties[1], "providerOperation"); expect(decodeOfflineSigningEvidence(f.record)).toMatchObject({ ok: false, code: "invalid-structure" });
  });
  it.each([1, 2, 3] as const)("round-trips snapshot label %i without changing evidence V1 or reading a snapshot", version => {
    const f = createConformanceFixture(1, version), serialized = JSON.stringify(f), restored = JSON.parse(serialized) as ConformanceFixture;
    freezeDeep(restored); const decoded = decodeOfflineSigningEvidence(restored.record); expect(decoded.ok).toBe(true); if (!decoded.ok) return;
    expect(decoded.value.schemaVersion).toBe(1); expect(decoded.value.binding.snapshotSchemaVersion).toBe(version);
    expect(resolveSyntheticSigningEvidence(decoded.value, restored.context, restored.collection).status).toBe("resolved-unverified");
    expect(JSON.stringify(restored)).toBe(serialized);
  });
  it("keeps the decoded value and its wrapper distinct and detaches decoded input collections", () => {
    const f = createConformanceFixture(), decoded = decodeOfflineSigningEvidence(f.record), inputs = decodeSyntheticSigningResolutionInputs(f.context, f.collection);
    expect(decoded.ok).toBe(true); expect(inputs.ok).toBe(true); if (!decoded.ok || !inputs.ok) return;
    expect(resolveSyntheticSigningEvidence(decoded, f.context, f.collection)).toMatchObject({ status: "invalid-input", inputErrors: ["invalid-structure"] });
    expect(inputs.context).not.toBe(f.context); expect(inputs.collection.records).not.toBe(f.collection.records);
    f.collection.records[0]!.reference.digest.value = "00"; f.context.finalArtifactDigest.value = "00";
    expect(resolveSyntheticSigningEvidence(decoded.value, inputs.context, inputs.collection).status).toBe("resolved-unverified");
    expect(Object.isFrozen(inputs.collection.records[0]!.reference.scope.manifestDigest)).toBe(true);
  });
  it("has stable documented precedence when multiple independent inputs are invalid", () => {
    const f = createConformanceFixture(); Reflect.set(f.record, "schemaVersion", 2); Reflect.set(f.record, "unknown", true);
    expect(decodeOfflineSigningEvidence(f.record)).toMatchObject({ ok: false, code: "unsupported-evidence-version" });
    Reflect.set(f.context, "schemaVersion", 2); Reflect.set(f.collection, "schemaVersion", 2);
    expect(resolve(f).inputErrors).toEqual(["invalid-resolution-context"]);
    f.context.schemaVersion = 1; expect(resolve(f).inputErrors).toEqual(["invalid-fixture-collection"]);
    f.collection.schemaVersion = 1; expect(resolve(f).inputErrors).toEqual(["unsupported-evidence-version"]);
    const bound = createConformanceFixture(); bound.record.binding.agencyId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"; bound.record.binding.contractId = "dddddddd-dddd-dddd-dddd-dddddddddddd";
    expect(validateOfflineSigningEvidence(bound.record, bound.context.binding)).toMatchObject({ ok: false, code: "agency-mismatch" });
  });
  it("fails closed on a valid candidate alongside a foreign candidate and redacts foreign values", () => {
    const f = signingConformanceVectors.find(v => v.id === "cross-agency-collision")!.create();
    const expectedId = f.collection.records[0]!.reference.id, before = resolve(f);
    expect(before.status).toBe("rejected"); expect(before.resolvedReferences).not.toContain(expectedId);
    expect(JSON.stringify(before)).not.toContain("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    f.collection.records.reverse(); expect(resolve(f)).toEqual(before);
  });
  it.each(["proposed", "pending", "verified", "rejected", "quarantined", "invalidated"] as const)("can describe claimed disposition %s without accepting trust", status => {
    const f = createConformanceFixture(2); f.record.verification.statusClaim = status;
    expect(decodeOfflineSigningEvidence(f.record).ok).toBe(true); expect(resolve(f).status).toBe("resolved-unverified");
    expect(assessOfflineSigningEvidenceTrust(f.record, f.context.binding)).toEqual({ ok: false, code: "unverified-provider-assertion", canActivateSigned: false });
  });
  it.each(["accepted", "pending", "completed", "failed", "cancelled", "expired", "unknown"] as const)("never treats provider claim %s as a trusted event", status => {
    const f = createConformanceFixture(2); f.record.parties[0].providerOperation!.statusClaim = status;
    expect(resolve(f).status).toBe("resolved-unverified"); expect(assessOfflineSigningEvidenceTrust(f.record, f.context.binding).ok).toBe(false);
  });
  it("compares encoded digest metadata exactly without approving a method or normalizing text", () => {
    const f = createConformanceFixture(); f.record.binding.snapshotDigest.algorithm = "other-unapproved-algorithm";
    expect(decodeOfflineSigningEvidence(f.record).ok).toBe(true);
    expect(validateOfflineSigningEvidence(f.record, f.context.binding)).toMatchObject({ ok: false, code: "snapshot-mismatch" });
    const equivalent = createConformanceFixture(); equivalent.record.binding.snapshotDigest.value = "AA";
    expect(decodeOfflineSigningEvidence(equivalent.record).ok).toBe(true);
    expect(validateOfflineSigningEvidence(equivalent.record, equivalent.context.binding)).toMatchObject({ ok: false, code: "snapshot-mismatch" });
  });
  it("performs conformance checks without network/storage/clock/crypto effects or fabricated evidence", () => {
    const fixtures = signingConformanceVectors.map(v => v.create()), forbidden = vi.fn(() => { throw Error("Forbidden effect"); });
    for (const key of ["fetch", "XMLHttpRequest", "WebSocket", "localStorage", "sessionStorage", "indexedDB", "crypto"]) vi.stubGlobal(key, forbidden);
    const now = vi.spyOn(Date, "now").mockImplementation(forbidden);
    try {
      for (const f of fixtures) { freezeDeep(f); const result = resolve(f); expect(result.canActivateSigned).toBe(false); expect(result.trust).toBe("unverified"); expect(result).not.toHaveProperty("signedAt"); }
      expect(forbidden).not.toHaveBeenCalled();
    } finally { now.mockRestore(); vi.unstubAllGlobals(); }
  });
  it("cannot establish signing through PDF/print/download/provider success payloads", () => {
    const f = createConformanceFixture();
    for (const input of [{ printed: true }, { downloaded: true }, { status: "completed" }, { signed: true }, { consented: true }]) {
      expect(decodeOfflineSigningEvidence(input).ok).toBe(false);
      expect(resolveSyntheticSigningEvidence(input, f.context, f.collection)).toMatchObject({ status: "invalid-input", canActivateSigned: false, trust: "unverified" });
    }
  });
  it("leaves every reachable lifecycle state unsigned even after complete conformance", async () => {
    const agencyId = syntheticAgencyId, context: SimulatedContext = { simulation: true, agencyId, role: "owner" };
    const settings = defaultContractSettings(agencyId, { name: "Agence fictive", ice: "", rc: "", ifNumber: "", address: "Adresse fictive", city: "Casablanca", phone: "+212600000000", email: "demo@example.invalid" });
    const document: ContractPresentation = { schemaVersion: 3, demonstration: true, agencyId, rentalId: syntheticContractId, number: null,
      primaryDriver: { fullName: "Conducteur fictif", cin: null, passportNumber: null, drivingLicenseNumber: null, city: null, nationality: null, licenceDates: null, address: null }, secondaryDriver: null,
      vehicle: { make: "Marque fictive", model: "Modèle fictif", registrationNumber: "DEMO", vin: null },
      rental: { start: "2026-01-01T09:00:00Z", end: "2026-01-02T09:00:00Z", duration: "1 jour", pickup: "Agence fictive", returnLocation: "Agence fictive", dailyRateMinor: 10000n, amountMinor: 10000n, depositMinor: 20000n, mileage: "10000 km", allowance: "200 km/jour" },
      inspection: { departure: null, return: null }, signatures: { customer: "not-signed", agency: "not-signed" } };
    const repository = createMemoryContractSettingsRepository(); await saveContractSettings(repository, context, settings);
    const lifecycle = createOfflineContractLifecycle(repository); expect((await lifecycle.createDraft(context, document)).ok).toBe(true);
    const fixture = createConformanceFixture(2); fixture.record.verification.statusClaim = "verified";
    for (const target of [null, "finalized", "signing-pending"] as const) {
      if (target) expect(lifecycle.transition(context, syntheticContractId, lifecycle.get(context, syntheticContractId)!.revision, target).ok).toBe(true);
      const before = lifecycle.get(context, syntheticContractId)!;
      expect(resolve(fixture).status).toBe("resolved-unverified"); expect(lifecycle.get(context, syntheticContractId)).toBe(before);
      expect(lifecycle.transition(context, syntheticContractId, before.revision, "signed")).toEqual({ ok: false, code: "signed-unavailable" });
      expect(lifecycle.get(context, syntheticContractId)).toBe(before); expect(before.signingEvidence).toBeNull();
    }
  });
});
