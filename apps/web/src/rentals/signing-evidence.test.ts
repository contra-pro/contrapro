import { describe, expect, it, vi } from "vitest";
import { assessOfflineSigningEvidenceTrust, decodeOfflineSigningEvidence, validateOfflineSigningEvidence } from "../../../../packages/application/src/rentals/signing-evidence";
import { createOfflineContractLifecycle } from "../../../../packages/application/src/rentals/contract-lifecycle";
import { defaultContractSettings, saveContractSettings, type ContractPresentation, type SimulatedContext } from "../../../../packages/application/src/rentals/contract-settings";
import { createMemoryContractSettingsRepository } from "../../../../packages/application/src/rentals/contract-settings-memory";

// Deliberately synthetic references and digest claims, never real signing evidence.
const agencyId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const contractId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const digest = (value: string) => ({ algorithm: "synthetic-digest", encoding: "hex", domainVersion: "fixture-v1", value });
const expected = () => ({ agencyId, contractId, documentRevisionId: "fixture-document-1", aggregateRevision: 3,
  attemptId: "fixture-attempt-1", attemptGeneration: 1, snapshotSchemaVersion: 3, snapshotRef: "fixture-snapshot",
  snapshotDigest: digest("aa"), baseArtifactRef: "fixture-base-pdf", baseArtifactDigest: digest("bb"),
  manifestDigest: digest("cc"), rendererVersion: "fixture-renderer-v1", partyPlanRef: "fixture-party-plan", partyPlanDigest: digest("ab"),
  requiredParties: [
    { partyInstanceId: "fixture-agency-party", role: "agency-representative", subjectRef: "fixture-subject-fixture-agency-party" },
    { partyInstanceId: "fixture-customer-party", role: "customer", subjectRef: "fixture-subject-fixture-customer-party" },
  ] });
function fixture() {
  const binding = expected();
  const scope = { agencyId, contractId, documentRevisionId: binding.documentRevisionId, attemptId: binding.attemptId, manifestDigest: binding.manifestDigest };
  const ref = (kind: string, id: string, partyInstanceId: string | null = null) => ({ schemaVersion: 1, id, kind, scope: structuredClone(scope), partyInstanceId, digest: digest("dd") });
  const party = (id: string, role: string, input: string, output: string) => ({ partyInstanceId: id, role, subjectRef: `fixture-subject-${id}`,
    inputArtifactDigest: digest(input), outputArtifactDigest: digest(output),
    identityEvidence: ref("identity", `${id}-identity`, id), authenticationEvidence: ref("authentication", `${id}-authentication`, id),
    authorityEvidence: ref("authority", `${id}-authority`, id), consentReceipt: ref("consent", `${id}-consent`, id),
    signatureIntentReceipt: ref("signature-intent", `${id}-intent`, id), sourceSignatureEvent: ref("source-signature-event", `${id}-event`, id),
    signatureEvidence: ref("signature", `${id}-signature`, id),
    trustedTime: { proofRef: ref("trusted-time", `${id}-time`, id), authorityRef: "fixture-time-authority", profileVersion: "fixture-time-v1",
      verificationDispositionRef: ref("time-disposition", `${id}-time-disposition`, id) },
    verificationDecision: ref("party-verification", `${id}-decision`, id),
    providerOperation: null as null | { reference: ReturnType<typeof ref>; authenticationEvidence: ReturnType<typeof ref>; providerProfileRef: string; accountRef: string; environmentRef: string; operationId: string; statusClaim: string },
  });
  return { schemaVersion: 1, mode: "offline-synthetic", binding, finalArtifactDigest: digest("ff"),
    parties: [party("fixture-agency-party", "agency-representative", "bb", "ee"), party("fixture-customer-party", "customer", "ee", "ff")],
    verification: { statusClaim: "pending", decisionRef: ref("aggregate-verification", "fixture-aggregate-decision"), verifierIdentityRef: "fixture-verifier",
      verifierVersion: "fixture-verifier-v1", verificationProfileRef: "fixture-profile", authenticityEvidenceRef: ref("verifier-authenticity", "fixture-verifier-authenticity") },
    auditAcceptance: { receiptRef: ref("audit-acceptance", "fixture-acceptance"), auditEventRef: ref("audit-event", "fixture-audit"), aggregateRevisionBefore: 3, aggregateRevisionAfter: 4 } };
}
type Fixture = ReturnType<typeof fixture>;
const invalid = (value: unknown) => expect(decodeOfflineSigningEvidence(value).ok).toBe(false);

describe("offline signing-evidence reference contract", () => {
  it("decodes detached frozen structure without verifying any signature", () => {
    const source = fixture(), result = decodeOfflineSigningEvidence(source);
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.trust).toBe("unverified"); expect(result.canActivateSigned).toBe(false);
    expect(result.value).toEqual(source); expect(result.value).not.toBe(source);
    expect(Object.isFrozen(result.value.parties[0]?.trustedTime.proofRef.scope.manifestDigest)).toBe(true);
    source.binding.snapshotDigest.value = "00";
    expect(result.value.binding.snapshotDigest.value).toBe("aa");
    expect(Reflect.set(result.value.binding, "aggregateRevision", 99)).toBe(false);
  });
  it.each([1, 2, 3])("retains snapshot schema %i as a reference without rewriting snapshots", version => {
    const value = fixture(); value.binding.snapshotSchemaVersion = version;
    expect(validateOfflineSigningEvidence(value, { ...expected(), snapshotSchemaVersion: version }).ok).toBe(true);
    expect(value.binding.snapshotSchemaVersion).toBe(version);
  });
  it("validates bindings and the ordered artifact chain but grants no trust", () => {
    expect(validateOfflineSigningEvidence(fixture(), expected())).toMatchObject({ ok: true, trust: "unverified", canActivateSigned: false });
    expect(assessOfflineSigningEvidenceTrust(fixture(), expected())).toEqual({ ok: false, code: "trust-verification-unavailable", canActivateSigned: false });
  });
  it.each(["binding", "parties", "verification", "auditAcceptance", "finalArtifactDigest"])("rejects missing %s", key => {
    const value = fixture(); Reflect.deleteProperty(value, key); invalid(value);
  });
  it.each(["identityEvidence", "authenticationEvidence", "authorityEvidence", "consentReceipt", "signatureIntentReceipt", "signatureEvidence", "sourceSignatureEvent", "trustedTime", "verificationDecision", "providerOperation"])("rejects missing per-party %s", key => {
    const value = fixture(); Reflect.deleteProperty(value.parties[0]!, key); invalid(value);
  });
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "3", null])("rejects invalid revisions %s", revision => {
    const value = fixture(); Reflect.set(value.binding, "aggregateRevision", revision); invalid(value);
    const generation = fixture(); Reflect.set(generation.binding, "attemptGeneration", revision); invalid(generation);
  });
  it.each(["", " ", "https://example.invalid/evidence", "bad/id", "a".repeat(129)])("rejects invalid local reference identifiers %s", id => {
    const value = fixture(); value.parties[0]!.consentReceipt.id = id; invalid(value);
  });
  it.each(["", "not-a-uuid", "00000000-0000-0000-0000-000000000000", `${agencyId} `])("rejects invalid agency/contract identifiers %s", id => {
    for (const key of ["agencyId", "contractId"]) { const value = fixture(); Reflect.set(value.binding, key, id); invalid(value); }
  });
  it.each([0, 2, "1", null])("rejects unsupported envelope version %s", version => {
    const value = fixture(); Reflect.set(value, "schemaVersion", version);
    expect(decodeOfflineSigningEvidence(value)).toMatchObject({ ok: false, code: "unsupported-evidence-version" });
  });
  it("rejects unsupported nested versions, snapshot schemas and unknown fields", () => {
    const version = fixture(); version.parties[0]!.consentReceipt.schemaVersion = 2; invalid(version);
    const snapshot = fixture(); snapshot.binding.snapshotSchemaVersion = 4; invalid(snapshot);
    for (const key of ["verified", "signed", "signedAt", "legallyValid", "downloadSucceeded", "printCompleted"]) {
      const value = fixture(); Reflect.set(value, key, true); invalid(value);
    }
    const operational = fixture(); operational.mode = "operational"; invalid(operational);
  });
  it("rejects malformed digest claims without approving an algorithm", () => {
    for (const changes of [{ value: "z1" }, { value: "abc" }, { encoding: "unknown" }, { algorithm: "" }, { domainVersion: "" }]) {
      const value = fixture(); Object.assign(value.binding.snapshotDigest, changes); invalid(value);
    }
    const value = fixture(); value.binding.snapshotDigest.algorithm = "unapproved-algorithm";
    expect(decodeOfflineSigningEvidence(value).ok).toBe(true);
    expect(assessOfflineSigningEvidenceTrust(value, value.binding).ok).toBe(false);
  });
  it("rejects malformed expected context rather than treating it as authority", () => {
    expect(validateOfflineSigningEvidence(fixture(), null)).toMatchObject({ ok: false, code: "invalid-expected-binding" });
  });
  it.each([
    ["agencyId", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "agency-mismatch"],
    ["contractId", "dddddddd-dddd-dddd-dddd-dddddddddddd", "contract-mismatch"],
    ["documentRevisionId", "fixture-old-document", "stale-revision"], ["aggregateRevision", 2, "stale-revision"],
    ["attemptId", "fixture-old-attempt", "attempt-mismatch"], ["attemptGeneration", 2, "attempt-mismatch"],
    ["rendererVersion", "fixture-new-renderer", "artifact-mismatch"], ["baseArtifactRef", "fixture-other-pdf", "artifact-mismatch"],
    ["snapshotRef", "fixture-other-snapshot", "snapshot-mismatch"], ["snapshotSchemaVersion", 2, "snapshot-mismatch"],
  ])("rejects mismatched binding %s", (key, value, code) => {
    const input = fixture(); Reflect.set(input.binding, key, value);
    expect(validateOfflineSigningEvidence(input, expected())).toMatchObject({ ok: false, code });
  });
  it.each(["snapshotDigest", "baseArtifactDigest", "manifestDigest"])("rejects substituted %s", key => {
    const value = fixture(); Reflect.set(value.binding, key, digest("00"));
    expect(validateOfflineSigningEvidence(value, expected()).ok).toBe(false);
  });
  it("compares digest algorithm, encoding and domain metadata without normalization", () => {
    for (const changes of [{ algorithm: "other-algorithm" }, { domainVersion: "other-domain" }, { encoding: "base64", value: "YWE=" }]) {
      const value = fixture(); Object.assign(value.binding.snapshotDigest, changes);
      expect(validateOfflineSigningEvidence(value, expected())).toMatchObject({ ok: false, code: "snapshot-mismatch" });
    }
    const value = fixture(); value.binding.partyPlanDigest.value = "00";
    expect(validateOfflineSigningEvidence(value, expected())).toMatchObject({ ok: false, code: "party-mismatch" });
  });
  it("checks every reference scope, including audit, provider and verifier provenance", () => {
    const mutations: ((v: Fixture) => void)[] = [
      v => { v.parties[0]!.consentReceipt.scope.agencyId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"; },
      v => { v.auditAcceptance.auditEventRef.scope.agencyId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"; },
      v => { v.verification.authenticityEvidenceRef.scope.contractId = "dddddddd-dddd-dddd-dddd-dddddddddddd"; },
      v => { v.parties[1]!.trustedTime.proofRef.scope.documentRevisionId = "old-document"; },
      v => { v.parties[0]!.signatureEvidence.scope.attemptId = "old-attempt"; },
      v => { v.parties[0]!.authorityEvidence.scope.manifestDigest.value = "00"; },
      v => { v.parties[0]!.signatureIntentReceipt.partyInstanceId = v.parties[1]!.partyInstanceId; },
    ];
    for (const mutate of mutations) { const value = fixture(); mutate(value); expect(validateOfflineSigningEvidence(value, expected()).ok).toBe(false); }
  });
  it("rejects duplicate and conflicting reference IDs, including across parties", () => {
    const duplicate = fixture(); duplicate.parties[1]!.consentReceipt = structuredClone(duplicate.parties[0]!.consentReceipt);
    expect(validateOfflineSigningEvidence(duplicate, expected())).toMatchObject({ ok: false, code: "duplicate-evidence-reference" });
    const conflict = fixture(); conflict.parties[1]!.consentReceipt.id = conflict.parties[0]!.consentReceipt.id;
    expect(validateOfflineSigningEvidence(conflict, expected())).toMatchObject({ ok: false, code: "conflicting-evidence-reference" });
  });
  it("rejects missing/reversed/repeated parties and broken intermediate/final artifacts", () => {
    const reversed = fixture(); reversed.parties.reverse();
    const duplicate = fixture(); duplicate.parties[1]!.partyInstanceId = duplicate.parties[0]!.partyInstanceId;
    const chain = fixture(); chain.parties[1]!.inputArtifactDigest.value = "00";
    const base = fixture(); base.parties[0]!.inputArtifactDigest.value = "00";
    const final = fixture(); final.finalArtifactDigest.value = "00";
    const impersonated = fixture(); impersonated.parties[1]!.subjectRef = "fixture-other-subject";
    for (const value of [reversed, duplicate, chain, base, final, impersonated]) expect(validateOfflineSigningEvidence(value, expected()).ok).toBe(false);
    const partial = fixture(); partial.parties.pop(); invalid(partial);
  });
  it("requires audit references and consecutive claimed aggregate revisions", () => {
    const missing = fixture(); Reflect.deleteProperty(missing.auditAcceptance, "auditEventRef"); invalid(missing);
    const stale = fixture(); stale.auditAcceptance.aggregateRevisionBefore = 2;
    const skipped = fixture(); skipped.auditAcceptance.aggregateRevisionAfter = 5;
    for (const value of [stale, skipped]) expect(validateOfflineSigningEvidence(value, expected())).toMatchObject({ ok: false, code: "audit-revision-mismatch" });
  });
  it("never accepts a provider assertion as verified trust, even completed with claimed verifier success", () => {
    const value = fixture(); value.verification.statusClaim = "verified";
    const party = value.parties[0]!;
    party.providerOperation = { reference: { ...structuredClone(party.signatureEvidence), kind: "provider-operation", id: "fixture-operation-ref" },
      authenticationEvidence: { ...structuredClone(party.signatureEvidence), kind: "provider-authentication", id: "fixture-provider-auth" },
      providerProfileRef: "fixture-provider", accountRef: "fixture-account", environmentRef: "fixture-env", operationId: "external opaque operation / 1", statusClaim: "completed" };
    expect(validateOfflineSigningEvidence(value, expected()).ok).toBe(true);
    expect(assessOfflineSigningEvidenceTrust(value, expected())).toEqual({ ok: false, code: "unverified-provider-assertion", canActivateSigned: false });
    party.providerOperation.authenticationEvidence.scope.agencyId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    expect(validateOfflineSigningEvidence(value, expected())).toMatchObject({ ok: false, code: "agency-mismatch" });
  });
  it.each(["proposed", "pending", "verified", "rejected", "quarantined", "invalidated"])("never promotes claimed disposition %s", status => {
    const value = fixture(); value.verification.statusClaim = status;
    expect(decodeOfflineSigningEvidence(value).ok).toBe(true);
    expect(assessOfflineSigningEvidenceTrust(value, expected()).canActivateSigned).toBe(false);
  });
  it("rejects print/download/status-only payloads as evidence", () => {
    for (const value of [{ printed: true }, { downloaded: true }, { status: "completed" }, { status: "signed" }, null]) {
      invalid(value); expect(assessOfflineSigningEvidenceTrust(value, expected()).canActivateSigned).toBe(false);
    }
  });
  it("rejects accessor, prototype, sparse-array and hostile inputs without invoking getters", () => {
    const getter = vi.fn(() => "offline-synthetic"), value = fixture();
    Object.defineProperty(value, "mode", { enumerable: true, get: getter }); invalid(value); expect(getter).not.toHaveBeenCalled();
    invalid(Object.assign(Object.create({ inherited: true }), fixture()));
    const sparse = fixture(); Reflect.deleteProperty(sparse.parties, "0"); invalid(sparse);
    const extra = fixture(); Reflect.set(extra.parties, "extra", "hidden"); invalid(extra);
    const hostile = new Proxy({}, { ownKeys() { throw Error("SECRET"); } }); invalid(hostile);
  });
  it("does not mutate inputs, read a clock, or make network requests on acceptance or rejection", () => {
    const source = fixture(), before = structuredClone(source), binding = expected();
    const fetch = vi.fn(() => { throw Error("No network"); }); vi.stubGlobal("fetch", fetch);
    const now = vi.spyOn(Date, "now").mockImplementation(() => { throw Error("No fabricated time"); });
    try {
      validateOfflineSigningEvidence(source, binding); assessOfflineSigningEvidenceTrust(source, binding);
      assessOfflineSigningEvidenceTrust({ status: "completed" }, binding);
      expect(source).toEqual(before); expect(binding).toEqual(expected()); expect(fetch).not.toHaveBeenCalled(); expect(now).not.toHaveBeenCalled();
    } finally { now.mockRestore(); vi.unstubAllGlobals(); }
  });
  it("cannot activate Signed or attach evidence to any reachable offline lifecycle state", async () => {
    const context: SimulatedContext = { simulation: true, agencyId, role: "owner" };
    const settings = defaultContractSettings(agencyId, { name: "Agence fictive", ice: "", rc: "", ifNumber: "", address: "Adresse fictive", city: "Casablanca", phone: "+212600000000", email: "demo@example.invalid" });
    const document: ContractPresentation = { schemaVersion: 3, demonstration: true, agencyId, rentalId: contractId, number: null,
      primaryDriver: { fullName: "Conducteur fictif", cin: null, passportNumber: null, drivingLicenseNumber: null, city: null, nationality: null, licenceDates: null, address: null }, secondaryDriver: null,
      vehicle: { make: "Marque fictive", model: "Modèle fictif", registrationNumber: "DEMO", vin: null },
      rental: { start: "2026-01-01T09:00:00Z", end: "2026-01-02T09:00:00Z", duration: "1 jour", pickup: "Agence fictive", returnLocation: "Agence fictive", dailyRateMinor: 10000n, amountMinor: 10000n, depositMinor: 20000n, mileage: "10000 km", allowance: "200 km/jour" },
      inspection: { departure: null, return: null }, signatures: { customer: "not-signed", agency: "not-signed" } };
    const repository = createMemoryContractSettingsRepository(); await saveContractSettings(repository, context, settings);
    const lifecycle = createOfflineContractLifecycle(repository); const created = await lifecycle.createDraft(context, document);
    expect(created.ok).toBe(true);
    const evidence = fixture(); evidence.verification.statusClaim = "verified";
    for (const target of [null, "finalized", "signing-pending"] as const) {
      if (target) expect(lifecycle.transition(context, contractId, lifecycle.get(context, contractId)!.revision, target).ok).toBe(true);
      const before = lifecycle.get(context, contractId)!;
      expect(validateOfflineSigningEvidence(evidence, expected()).ok).toBe(true);
      expect(assessOfflineSigningEvidenceTrust(evidence, expected()).ok).toBe(false);
      expect(lifecycle.transition(context, contractId, before.revision, "signed")).toEqual({ ok: false, code: "signed-unavailable" });
      expect(lifecycle.get(context, contractId)).toBe(before); expect(before.signingEvidence).toBeNull();
    }
  });
});
