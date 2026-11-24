import { describe, expect, it, vi } from "vitest";
import { decodeOfflineSigningEvidence, type SigningEvidenceReference, type SigningProviderOperationReferences } from "../../../../packages/application/src/rentals/signing-evidence";
import { resolveSyntheticSigningEvidence } from "../../../../packages/application/src/rentals/signing-evidence-resolution";
import { createOfflineContractLifecycle } from "../../../../packages/application/src/rentals/contract-lifecycle";
import { defaultContractSettings, saveContractSettings, type ContractPresentation, type SimulatedContext } from "../../../../packages/application/src/rentals/contract-settings";
import { createMemoryContractSettingsRepository } from "../../../../packages/application/src/rentals/contract-settings-memory";

const agencyId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", contractId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const digest = (value: string) => ({ algorithm: "synthetic", encoding: "hex" as const, domainVersion: "fixture-v1", value });
function make(provider = false) {
  const binding = { agencyId, contractId, documentRevisionId: "doc-1", aggregateRevision: 3, attemptId: "attempt-1", attemptGeneration: 1,
    snapshotSchemaVersion: 3, snapshotRef: "snapshot-1", snapshotDigest: digest("aa"), baseArtifactRef: "artifact-base", baseArtifactDigest: digest("bb"),
    manifestDigest: digest("cc"), rendererVersion: "renderer-v1", partyPlanRef: "plan-1", partyPlanDigest: digest("ab"),
    requiredParties: [{ partyInstanceId: "agency-party", role: "agency-representative", subjectRef: "agency-subject" }, { partyInstanceId: "customer-party", role: "customer", subjectRef: "customer-subject" }] };
  const scope = { agencyId, contractId, documentRevisionId: "doc-1", attemptId: "attempt-1", manifestDigest: digest("cc") };
  const ref = (kind: string, id: string, partyInstanceId: string | null = null) => ({ schemaVersion: 1, id, kind, scope: structuredClone(scope), partyInstanceId, digest: digest("dd") });
  const party = (id: string, role: string, subject: string, input: string, output: string) => ({ partyInstanceId: id, role, subjectRef: subject,
    inputArtifactDigest: digest(input), outputArtifactDigest: digest(output), identityEvidence: ref("identity", `${id}-identity`, id),
    authenticationEvidence: ref("authentication", `${id}-auth`, id), authorityEvidence: ref("authority", `${id}-authority`, id),
    consentReceipt: ref("consent", `${id}-consent`, id), signatureIntentReceipt: ref("signature-intent", `${id}-intent`, id),
    sourceSignatureEvent: ref("source-signature-event", `${id}-source`, id), signatureEvidence: ref("signature", `${id}-signature`, id),
    trustedTime: { proofRef: ref("trusted-time", `${id}-time`, id), authorityRef: "time-authority", profileVersion: "time-v1", verificationDispositionRef: ref("time-disposition", `${id}-time-disposition`, id) },
    verificationDecision: ref("party-verification", `${id}-verification`, id), providerOperation: null as SigningProviderOperationReferences | null });
  const rawRecord = { schemaVersion: 1, mode: "offline-synthetic", binding, finalArtifactDigest: digest("ff"),
    parties: [party("agency-party", "agency-representative", "agency-subject", "bb", "ee"), party("customer-party", "customer", "customer-subject", "ee", "ff")],
    verification: { statusClaim: "verified", decisionRef: ref("aggregate-verification", "aggregate-verification"), verifierIdentityRef: "fixture-verifier", verifierVersion: "verifier-v1", verificationProfileRef: "profile-1", authenticityEvidenceRef: ref("verifier-authenticity", "verifier-authenticity") },
    auditAcceptance: { receiptRef: ref("audit-acceptance", "audit-acceptance"), auditEventRef: ref("audit-event", "audit-event"), aggregateRevisionBefore: 3, aggregateRevisionAfter: 4 } };
  if (provider) for (const p of rawRecord.parties) {
    p.providerOperation = { reference: { ...ref("provider-operation", `${p.partyInstanceId}-operation`, p.partyInstanceId), kind: "provider-operation", schemaVersion: 1, digest: { ...digest("de"), encoding: "hex" } },
      authenticationEvidence: { ...ref("provider-authentication", `${p.partyInstanceId}-provider-auth`, p.partyInstanceId), kind: "provider-authentication", schemaVersion: 1, digest: { ...digest("df"), encoding: "hex" } },
      providerProfileRef: "provider-profile", accountRef: "provider-account", environmentRef: "fixture-env", operationId: `external operation ${p.partyInstanceId}`, statusClaim: "completed" };
  }
  const decoded = decodeOfflineSigningEvidence(rawRecord); if (!decoded.ok) throw Error("Bad synthetic fixture");
  const record = decoded.value;
  const context = { schemaVersion: 1, mode: "offline-synthetic", binding: structuredClone(record.binding), finalArtifactDigest: structuredClone(record.finalArtifactDigest),
    partyArtifacts: record.parties.map(p => ({ partyInstanceId: p.partyInstanceId, inputArtifactDigest: structuredClone(p.inputArtifactDigest), outputArtifactDigest: structuredClone(p.outputArtifactDigest) })) };
  const descriptor = (reference: SigningEvidenceReference<string>, p: typeof record.parties[number] | null) => ({ schemaVersion: 1, mode: "offline-synthetic",
    reference: structuredClone(reference), binding: structuredClone(record.binding), finalArtifactDigest: structuredClone(record.finalArtifactDigest), subjectRef: p?.subjectRef ?? null,
    inputArtifactDigest: p ? structuredClone(p.inputArtifactDigest) : null, outputArtifactDigest: p ? structuredClone(p.outputArtifactDigest) : null,
    providerBinding: p?.providerOperation && ["provider-operation", "provider-authentication"].includes(reference.kind) ? {
      providerProfileRef: p.providerOperation.providerProfileRef, accountRef: p.providerOperation.accountRef, environmentRef: p.providerOperation.environmentRef, operationId: p.providerOperation.operationId,
    } : null });
  const records = record.parties.flatMap(p => [p.identityEvidence, p.authenticationEvidence, p.authorityEvidence, p.consentReceipt, p.signatureIntentReceipt,
    p.sourceSignatureEvent, p.signatureEvidence, p.trustedTime.proofRef, p.trustedTime.verificationDispositionRef, p.verificationDecision,
    ...(p.providerOperation ? [p.providerOperation.reference, p.providerOperation.authenticationEvidence] : [])].map(r => descriptor(r, p)));
  records.push(...[record.verification.decisionRef, record.verification.authenticityEvidenceRef, record.auditAcceptance.receiptRef, record.auditAcceptance.auditEventRef].map(r => descriptor(r, null)));
  return { rawRecord, record, context, collection: { schemaVersion: 1, mode: "offline-synthetic", records } };
}
type Fixture = ReturnType<typeof make>;
const resolve = (f: Fixture) => resolveSyntheticSigningEvidence(f.record, f.context, f.collection);

describe("synthetic signing-evidence resolution", () => {
  it.each([false, true])("resolves all supplied typed references, provider=%s, without granting trust", provider => {
    const f = make(provider), result = resolve(f);
    expect(result.status).toBe("resolved-unverified"); expect(result.trust).toBe("unverified"); expect(result.canActivateSigned).toBe(false);
    expect(result.resolvedReferences).toHaveLength(provider ? 28 : 24);
    expect(result.resolvedReferences).toEqual(f.collection.records.map(r => r.reference.id).sort());
    expect(result.missingReferences).toEqual([]); expect(result.conflictingReferences).toEqual([]); expect(result.bindingMismatches).toEqual([]);
    expect(result.unresolvedTrustDependencies).toContain("cryptographic-signature-and-time-verification");
    expect(result.unresolvedTrustDependencies).toContain("durable-authorized-audit-acceptance");
    expect(result).not.toHaveProperty("signedAt"); expect(result).not.toHaveProperty("verifiedSignature");
  });
  it("is deterministic across repeated calls and fixture permutations", () => {
    const f = make(true), first = resolve(f);
    expect(resolve(f)).toEqual(first); f.collection.records.reverse(); expect(resolve(f)).toEqual(first);
    f.collection.records.push(structuredClone(f.collection.records[0]!));
    Reflect.set(f.collection.records[1]!.reference.digest, "value", "00");
    const rejected = resolve(f); f.collection.records.reverse(); expect(resolve(f)).toEqual(rejected);
  });
  it("preserves inputs and returns recursively frozen independent diagnostics", () => {
    const f = make(), before = structuredClone(f), result = resolve(f);
    expect(f).toEqual(before); expect(Object.isFrozen(result)).toBe(true); expect(Object.isFrozen(result.resolvedReferences)).toBe(true);
    expect(Reflect.set(result.resolvedReferences, "0", "replaced")).toBe(false);
    f.collection.records.splice(0); expect(result.resolvedReferences).toHaveLength(24);
    const mismatch = make(); mismatch.collection.records[0]!.subjectRef = "wrong-subject";
    const rejected = resolve(mismatch); expect(Object.isFrozen(rejected.bindingMismatches[0]?.codes)).toBe(true);
  });
  it("reports empty and incomplete collections without manufacturing references", () => {
    const f = make(), removed = f.collection.records.splice(0, 3).map(r => r.reference.id).sort();
    expect(resolve(f)).toMatchObject({ status: "incomplete", missingReferences: removed });
    expect(resolve(f).resolvedReferences).toHaveLength(21);
    f.collection.records.splice(0); const result = resolve(f);
    expect(result.status).toBe("incomplete"); expect(result.missingReferences).toHaveLength(24); expect(result.resolvedReferences).toEqual([]);
  });
  it("rejects identical duplicate candidates rather than silently deduplicating", () => {
    const f = make(), row = f.collection.records[0]!; f.collection.records.push(structuredClone(row));
    const result = resolve(f); expect(result.status).toBe("rejected"); expect(result.duplicateReferences).toEqual([row.reference.id]);
    expect(result.resolvedReferences).not.toContain(row.reference.id); expect(result.conflictingReferences).toEqual([]);
  });
  it("rejects conflicting candidates and reports ambiguity without choosing a winner", () => {
    const f = make(), row = structuredClone(f.collection.records[0]!); row.subjectRef = "other-subject"; f.collection.records.push(row);
    const result = resolve(f); expect(result.status).toBe("rejected"); expect(result.conflictingReferences).toEqual([row.reference.id]);
    expect(result.bindingMismatches).toContainEqual({ referenceId: row.reference.id, codes: ["ambiguous-ownership", "ownership-mismatch"] });
    expect(result.resolvedReferences).not.toContain(row.reference.id);
  });
  it("does not treat conflicting digest claims as interchangeable evidence", () => {
    const f = make(), row = structuredClone(f.collection.records[0]!); Reflect.set(row.reference.digest, "value", "00"); f.collection.records.push(row);
    const result = resolve(f); expect(result.status).toBe("rejected"); expect(result.conflictingReferences).toEqual([row.reference.id]);
    expect(result.bindingMismatches).toContainEqual({ referenceId: row.reference.id, codes: ["evidence-digest-mismatch"] });
  });
  it.each(["binding", "reference"])("rejects foreign agency in fixture %s without fallback or foreign-value disclosure", field => {
    const f = make(), row = f.collection.records[0]!;
    Reflect.set(field === "binding" ? row.binding : row.reference.scope, "agencyId", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    const result = resolve(f); expect(result.status).toBe("rejected"); expect(result.bindingMismatches).toContainEqual({ referenceId: row.reference.id, codes: ["agency-mismatch"] });
    expect(JSON.stringify(result)).not.toContain("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    f.collection.records.push(structuredClone(make().collection.records[0]!)); expect(resolve(f).status).toBe("rejected");
  });
  it.each([
    ["contractId", "dddddddd-dddd-dddd-dddd-dddddddddddd", "contract-mismatch"], ["documentRevisionId", "old-doc", "stale-revision"],
    ["aggregateRevision", 2, "stale-revision"], ["attemptId", "old-attempt", "attempt-mismatch"], ["attemptGeneration", 2, "attempt-mismatch"],
    ["snapshotRef", "other-snapshot", "snapshot-mismatch"], ["snapshotSchemaVersion", 2, "snapshot-mismatch"],
    ["baseArtifactRef", "other-pdf", "artifact-mismatch"], ["rendererVersion", "other-renderer", "artifact-mismatch"], ["partyPlanRef", "other-plan", "party-mismatch"],
  ])("rejects fixture binding %s mismatch", (field, value, code) => {
    const f = make(), row = f.collection.records[0]!; Reflect.set(row.binding, field, value);
    expect(resolve(f).bindingMismatches).toContainEqual({ referenceId: row.reference.id, codes: [code] }); expect(resolve(f).status).toBe("rejected");
  });
  it.each(["snapshotDigest", "baseArtifactDigest", "manifestDigest", "partyPlanDigest"])("rejects substituted fixture %s", field => {
    const f = make(); Reflect.set(f.collection.records[0]!.binding, field, digest("00")); expect(resolve(f).status).toBe("rejected");
  });
  it.each(["inputArtifactDigest", "outputArtifactDigest", "finalArtifactDigest"])("rejects mismatched %s", field => {
    const f = make(), row = f.collection.records[0]!; Reflect.set(row, field, digest("00"));
    expect(resolve(f).bindingMismatches).toContainEqual({ referenceId: row.reference.id, codes: ["artifact-mismatch"] });
  });
  it("checks reference kind, digest, party, manifest and ownership independently", () => {
    const cases = [
      ["kind", "consent", "reference-kind-mismatch"], ["digest", digest("00"), "evidence-digest-mismatch"], ["partyInstanceId", null, "ownership-mismatch"],
    ] as const;
    for (const [key, value, code] of cases) { const f = make(), row = f.collection.records[0]!; Reflect.set(row.reference, key, value); expect(resolve(f).bindingMismatches).toContainEqual({ referenceId: row.reference.id, codes: [code] }); }
    const f = make(), row = f.collection.records[0]!; Reflect.set(row.reference.scope, "manifestDigest", digest("00"));
    expect(resolve(f).bindingMismatches).toContainEqual({ referenceId: row.reference.id, codes: ["manifest-mismatch"] });
  });
  it("requires null ownership/artifacts/provider for aggregate evidence and explicit party ownership", () => {
    const f = make(), aggregate = f.collection.records.find(r => r.reference.kind === "audit-event")!;
    aggregate.subjectRef = "wrong-owner"; aggregate.inputArtifactDigest = digest("bb");
    expect(resolve(f).status).toBe("rejected");
    const other = make(); other.collection.records[0]!.subjectRef = null; expect(resolve(other).status).toBe("rejected");
  });
  it.each(["providerProfileRef", "accountRef", "environmentRef", "operationId"])("checks provider operation %s without trusting completed status", field => {
    const f = make(true), row = f.collection.records.find(r => r.reference.kind === "provider-operation")!;
    Reflect.set(row.providerBinding!, field, "other-provider-value");
    expect(resolve(f).bindingMismatches).toContainEqual({ referenceId: row.reference.id, codes: ["provider-binding-mismatch"] });
  });
  it("rejects missing or unexpected provider bindings", () => {
    const f = make(true); f.collection.records.find(r => r.reference.kind === "provider-authentication")!.providerBinding = null;
    expect(resolve(f).status).toBe("rejected");
    const extra = make(); extra.collection.records[0]!.providerBinding = make(true).collection.records.find(r => r.providerBinding)!.providerBinding;
    expect(resolve(extra).status).toBe("rejected");
  });
  it("rejects unexpected fixtures without leaking unknown IDs", () => {
    const f = make(), row = structuredClone(f.collection.records[0]!); Reflect.set(row.reference, "id", "foreign-secret-id"); f.collection.records.push(row);
    const result = resolve(f); expect(result.status).toBe("rejected"); expect(result.inputErrors).toContain("unexpected-fixture");
    expect(JSON.stringify(result)).not.toContain("foreign-secret-id");
  });
  it.each(["context", "collection", "record", "fixture", "reference"])("rejects unsupported %s version", where => {
    const f = make(); const target = where === "context" ? f.context : where === "collection" ? f.collection : where === "record" ? f.rawRecord : where === "fixture" ? f.collection.records[0]! : f.collection.records[0]!.reference;
    Reflect.set(target, "schemaVersion", 2);
    const result = where === "record" ? resolveSyntheticSigningEvidence(f.rawRecord, f.context, f.collection) : resolve(f);
    expect(result.status).toBe("invalid-input"); expect(result.canActivateSigned).toBe(false);
  });
  it("rejects malformed contexts and expected context substitutions before fixture lookup", () => {
    const f = make(); expect(resolveSyntheticSigningEvidence(f.record, null, f.collection).status).toBe("invalid-input");
    Reflect.set(f.context.binding, "aggregateRevision", 4); expect(resolve(f)).toMatchObject({ status: "rejected", inputErrors: ["stale-revision"] });
    const artifact = make(); Reflect.set(artifact.context.finalArtifactDigest, "value", "00"); expect(resolve(artifact).status).toBe("rejected");
    const chain = make(); Reflect.set(chain.context.partyArtifacts[1]!.inputArtifactDigest, "value", "00"); expect(resolve(chain).status).toBe("rejected");
  });
  it("revalidates decoded-looking records and rejects duplicate references inside the envelope", () => {
    const f = make(); f.rawRecord.parties[1]!.consentReceipt = structuredClone(f.rawRecord.parties[0]!.consentReceipt);
    expect(resolveSyntheticSigningEvidence(f.rawRecord, f.context, f.collection)).toMatchObject({ status: "rejected", inputErrors: ["duplicate-evidence-reference"] });
    expect(resolveSyntheticSigningEvidence({ ok: true, value: f.record }, f.context, f.collection).status).toBe("invalid-input");
  });
  it("rejects unknown keys, operational tags, oversized and sparse collections, accessors and hostile objects", () => {
    const f = make(), malformed = [null, [], { ...f.collection, mode: "operational" }, { ...f.collection, records: Array(129).fill(f.collection.records[0]) }];
    for (const input of malformed) expect(resolveSyntheticSigningEvidence(f.record, f.context, input).status).toBe("invalid-input");
    const sparse = make(); Reflect.deleteProperty(sparse.collection.records, "0"); expect(resolve(sparse).status).toBe("invalid-input");
    const unknown = make(); Reflect.set(unknown.collection.records[0]!, "verified", true); expect(resolve(unknown).status).toBe("invalid-input");
    const getter = vi.fn(() => []); Object.defineProperty(f.collection, "records", { enumerable: true, get: getter }); expect(resolve(f).status).toBe("invalid-input"); expect(getter).not.toHaveBeenCalled();
    expect(resolveSyntheticSigningEvidence(make().record, make().context, new Proxy({}, { ownKeys() { throw Error("SECRET"); } })).status).toBe("invalid-input");
  });
  it.each([1, 2, 3])("preserves historical snapshot schema %i references", version => {
    const f = make(); f.rawRecord.binding.snapshotSchemaVersion = version;
    const decoded = decodeOfflineSigningEvidence(f.rawRecord); if (!decoded.ok) throw Error("Fixture");
    Reflect.set(f.context.binding, "snapshotSchemaVersion", version); for (const row of f.collection.records) Reflect.set(row.binding, "snapshotSchemaVersion", version);
    expect(resolveSyntheticSigningEvidence(decoded.value, f.context, f.collection).status).toBe("resolved-unverified");
  });
  it("uses no network, storage, clock or hashing and never promotes provider/verifier assertions", () => {
    const f = make(true), forbidden = vi.fn(() => { throw Error("Forbidden effect"); });
    for (const key of ["fetch", "XMLHttpRequest", "WebSocket", "localStorage", "sessionStorage", "indexedDB", "crypto"]) vi.stubGlobal(key, forbidden);
    const now = vi.spyOn(Date, "now").mockImplementation(forbidden);
    try { const result = resolve(f); expect(result.status).toBe("resolved-unverified"); expect(result.trust).toBe("unverified"); expect(result.canActivateSigned).toBe(false);
      f.collection.records.splice(0); expect(resolve(f).canActivateSigned).toBe(false); expect(forbidden).not.toHaveBeenCalled();
    } finally { now.mockRestore(); vi.unstubAllGlobals(); }
  });
  it("cannot change a lifecycle record or enable Signed from any reachable state", async () => {
    const context: SimulatedContext = { simulation: true, agencyId, role: "owner" };
    const settings = defaultContractSettings(agencyId, { name: "Agence fictive", ice: "", rc: "", ifNumber: "", address: "Adresse fictive", city: "Casablanca", phone: "+212600000000", email: "demo@example.invalid" });
    const document: ContractPresentation = { schemaVersion: 3, demonstration: true, agencyId, rentalId: contractId, number: null,
      primaryDriver: { fullName: "Conducteur fictif", cin: null, passportNumber: null, drivingLicenseNumber: null, city: null, nationality: null, licenceDates: null, address: null }, secondaryDriver: null,
      vehicle: { make: "Marque fictive", model: "Modèle fictif", registrationNumber: "DEMO", vin: null },
      rental: { start: "2026-01-01T09:00:00Z", end: "2026-01-02T09:00:00Z", duration: "1 jour", pickup: "Agence fictive", returnLocation: "Agence fictive", dailyRateMinor: 10000n, amountMinor: 10000n, depositMinor: 20000n, mileage: "10000 km", allowance: "200 km/jour" },
      inspection: { departure: null, return: null }, signatures: { customer: "not-signed", agency: "not-signed" } };
    const repository = createMemoryContractSettingsRepository(); await saveContractSettings(repository, context, settings);
    const lifecycle = createOfflineContractLifecycle(repository); expect((await lifecycle.createDraft(context, document)).ok).toBe(true);
    const f = make(true);
    for (const target of [null, "finalized", "signing-pending"] as const) {
      if (target) expect(lifecycle.transition(context, contractId, lifecycle.get(context, contractId)!.revision, target).ok).toBe(true);
      const before = lifecycle.get(context, contractId)!; expect(resolve(f).status).toBe("resolved-unverified");
      expect(lifecycle.get(context, contractId)).toBe(before);
      expect(lifecycle.transition(context, contractId, before.revision, "signed")).toEqual({ ok: false, code: "signed-unavailable" });
      expect(before.signingEvidence).toBeNull(); expect(lifecycle.get(context, contractId)).toBe(before);
    }
  });
});
