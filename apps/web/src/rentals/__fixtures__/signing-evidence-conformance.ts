import type { OfflineSigningEvidenceContractV1, SigningEvidenceBinding, SigningEvidenceDigest, SigningEvidenceReference,
  SigningPartyEvidenceReferences, SyntheticSigningEvidenceCollectionV1, SyntheticSigningResolutionContextV1 } from "../../../../../packages/application/src/rentals/signing-evidence";

/** Test-only deterministic labels. No real person, consent, signature or instant.
 * Constructed independently of production decoders/reference enumeration. */
type Mutable<T> = T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;
type EvidenceKind = SyntheticSigningEvidenceCollectionV1["records"][number]["reference"]["kind"];
export type ConformanceFixture = {
  record: Mutable<OfflineSigningEvidenceContractV1>;
  context: Mutable<SyntheticSigningResolutionContextV1>;
  collection: Mutable<SyntheticSigningEvidenceCollectionV1>;
};
export const syntheticAgencyId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
export const syntheticContractId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const foreignAgency = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const d = (value: string): Mutable<SigningEvidenceDigest> => ({ algorithm: "synthetic-only", encoding: "hex", domainVersion: "conformance-v1", value });

export function createConformanceFixture(providerCount: 0 | 1 | 2 = 0, snapshotVersion: 1 | 2 | 3 = 3): ConformanceFixture {
  const binding: Mutable<SigningEvidenceBinding> = { agencyId: syntheticAgencyId, contractId: syntheticContractId, documentRevisionId: "synthetic-document-1",
    aggregateRevision: 3, attemptId: "synthetic-attempt-1", attemptGeneration: 1, snapshotSchemaVersion: snapshotVersion,
    snapshotRef: "synthetic-snapshot", snapshotDigest: d("aa"), baseArtifactRef: "synthetic-base-pdf", baseArtifactDigest: d("bb"),
    manifestDigest: d("cc"), rendererVersion: "synthetic-renderer-v1", partyPlanRef: "synthetic-party-plan", partyPlanDigest: d("ab"),
    requiredParties: [{ partyInstanceId: "synthetic-agency-party", role: "agency-representative", subjectRef: "synthetic-agency-subject" },
      { partyInstanceId: "synthetic-customer-party", role: "customer", subjectRef: "synthetic-customer-subject" }] };
  const ref = <K extends EvidenceKind>(kind: K, id: string, partyInstanceId: string | null = null): SigningEvidenceReference<K> => ({ schemaVersion: 1, id, kind,
    scope: { agencyId: syntheticAgencyId, contractId: syntheticContractId, documentRevisionId: binding.documentRevisionId, attemptId: binding.attemptId, manifestDigest: d("cc") }, partyInstanceId, digest: d("dd") });
  const party = (index: 0 | 1): Mutable<SigningPartyEvidenceReferences> => {
    const assigned = binding.requiredParties[index], id = assigned.partyInstanceId;
    return { ...assigned, inputArtifactDigest: d(index === 0 ? "bb" : "ee"), outputArtifactDigest: d(index === 0 ? "ee" : "ff"),
      identityEvidence: ref("identity", `${id}-identity`, id), authenticationEvidence: ref("authentication", `${id}-authentication`, id),
      authorityEvidence: ref("authority", `${id}-authority`, id), consentReceipt: ref("consent", `${id}-consent`, id), signatureIntentReceipt: ref("signature-intent", `${id}-intent`, id),
      sourceSignatureEvent: ref("source-signature-event", `${id}-source`, id), signatureEvidence: ref("signature", `${id}-signature`, id),
      trustedTime: { proofRef: ref("trusted-time", `${id}-time`, id), authorityRef: "synthetic-time-authority", profileVersion: "synthetic-time-profile", verificationDispositionRef: ref("time-disposition", `${id}-time-disposition`, id) },
      verificationDecision: ref("party-verification", `${id}-decision`, id),
      providerOperation: index < providerCount ? { reference: ref("provider-operation", `${id}-operation`, id), authenticationEvidence: ref("provider-authentication", `${id}-provider-auth`, id),
        providerProfileRef: "synthetic-provider-profile", accountRef: "synthetic-provider-account", environmentRef: "synthetic-environment", operationId: `synthetic external operation ${index}`, statusClaim: "completed" } : null };
  };
  const record: Mutable<OfflineSigningEvidenceContractV1> = { schemaVersion: 1, mode: "offline-synthetic", binding,
    finalArtifactDigest: d("ff"), parties: [party(0), party(1)],
    verification: { statusClaim: "pending", decisionRef: ref("aggregate-verification", "synthetic-aggregate-decision"), verifierIdentityRef: "synthetic-verifier", verifierVersion: "synthetic-verifier-v1",
      verificationProfileRef: "synthetic-verifier-profile", authenticityEvidenceRef: ref("verifier-authenticity", "synthetic-verifier-authenticity") },
    auditAcceptance: { receiptRef: ref("audit-acceptance", "synthetic-audit-acceptance"), auditEventRef: ref("audit-event", "synthetic-audit-event"), aggregateRevisionBefore: 3, aggregateRevisionAfter: 4 } };
  const artifact = (index: 0 | 1) => { const p = record.parties[index]; return { partyInstanceId: p.partyInstanceId, inputArtifactDigest: structuredClone(p.inputArtifactDigest), outputArtifactDigest: structuredClone(p.outputArtifactDigest) }; };
  const context: Mutable<SyntheticSigningResolutionContextV1> = { schemaVersion: 1, mode: "offline-synthetic", binding: structuredClone(binding), finalArtifactDigest: d("ff"),
    partyArtifacts: [artifact(0), artifact(1)] };
  const collection: Mutable<SyntheticSigningEvidenceCollectionV1> = { schemaVersion: 1, mode: "offline-synthetic", records: [] };
  for (const p of record.parties) {
    // Independent, explicit coverage of all ten required per-party references.
    const refs: SigningEvidenceReference<EvidenceKind>[] = [p.identityEvidence, p.authenticationEvidence, p.authorityEvidence, p.consentReceipt, p.signatureIntentReceipt,
      p.sourceSignatureEvent, p.signatureEvidence, p.trustedTime.proofRef, p.trustedTime.verificationDispositionRef, p.verificationDecision];
    if (p.providerOperation) refs.push(p.providerOperation.reference, p.providerOperation.authenticationEvidence);
    for (const reference of refs) collection.records.push({ schemaVersion: 1, mode: "offline-synthetic", reference: structuredClone(reference), binding: structuredClone(binding), finalArtifactDigest: d("ff"),
      subjectRef: p.subjectRef, inputArtifactDigest: structuredClone(p.inputArtifactDigest), outputArtifactDigest: structuredClone(p.outputArtifactDigest),
      providerBinding: p.providerOperation && ["provider-operation", "provider-authentication"].includes(reference.kind) ? {
        providerProfileRef: p.providerOperation.providerProfileRef, accountRef: p.providerOperation.accountRef, environmentRef: p.providerOperation.environmentRef, operationId: p.providerOperation.operationId,
      } : null });
  }
  for (const reference of [record.verification.decisionRef, record.verification.authenticityEvidenceRef, record.auditAcceptance.receiptRef, record.auditAcceptance.auditEventRef]) {
    collection.records.push({ schemaVersion: 1, mode: "offline-synthetic", reference: structuredClone(reference), binding: structuredClone(binding), finalArtifactDigest: d("ff"), subjectRef: null,
      inputArtifactDigest: null, outputArtifactDigest: null, providerBinding: null });
  }
  return { record, context, collection };
}

type DecodeExpectation = "ok" | "invalid-structure" | "unsupported-evidence-version";
export type ConformanceVector = Readonly<{
  id: string; category: string; create: () => ConformanceFixture;
  decode: DecodeExpectation; validation: string; status: "resolved-unverified" | "invalid-input" | "rejected" | "incomplete";
  inputErrors: readonly string[]; mismatchCodes?: readonly string[]; missing?: number; duplicates?: number; conflicts?: number; trustCode?: string;
}>;
const vector = (id: string, category: string, edit: (fixture: ConformanceFixture) => void, expected: Omit<ConformanceVector, "id" | "category" | "create">, providers: 0 | 1 | 2 = 0): ConformanceVector => ({
  id, category, create: () => { const fixture = createConformanceFixture(providers); edit(fixture); return fixture; }, ...expected,
});
const malformed = { decode: "invalid-structure", validation: "invalid-structure", status: "invalid-input", inputErrors: ["invalid-structure"] } as const;
const consistent = { decode: "ok", validation: "ok", status: "resolved-unverified", inputErrors: [] } as const;
const rejected = (code: string) => ({ decode: "ok", validation: code, status: "rejected", inputErrors: [code] } as const);
const descriptorMismatch = (code: string) => ({ decode: "ok", validation: "ok", status: "rejected", inputErrors: [], mismatchCodes: [code] } as const);
export const signingConformanceVectors: readonly ConformanceVector[] = Object.freeze([
  vector("valid-24", "valid", () => {}, consistent),
  vector("valid-26", "valid", () => {}, { ...consistent, trustCode: "unverified-provider-assertion" }, 1),
  vector("valid-28", "valid", () => {}, { ...consistent, trustCode: "unverified-provider-assertion" }, 2),
  vector("missing-binding", "missing-field", f => { Reflect.deleteProperty(f.record, "binding"); }, malformed),
  vector("missing-consent-reference", "missing-field", f => { Reflect.deleteProperty(f.record.parties[0], "consentReceipt"); }, malformed),
  vector("missing-audit-acceptance", "missing-field", f => { Reflect.deleteProperty(f.record, "auditAcceptance"); }, malformed),
  vector("unsupported-envelope", "unsupported-version", f => { Reflect.set(f.record, "schemaVersion", 2); }, { decode: "unsupported-evidence-version", validation: "unsupported-evidence-version", status: "invalid-input", inputErrors: ["unsupported-evidence-version"] }),
  vector("unsupported-reference", "unsupported-version", f => { Reflect.set(f.record.parties[0].consentReceipt, "schemaVersion", 2); }, malformed),
  vector("unsupported-context", "unsupported-version", f => { Reflect.set(f.context, "schemaVersion", 2); }, { ...consistent, status: "invalid-input", inputErrors: ["invalid-resolution-context"] }),
  vector("unsupported-collection", "unsupported-version", f => { Reflect.set(f.collection, "schemaVersion", 2); }, { ...consistent, status: "invalid-input", inputErrors: ["invalid-fixture-collection"] }),
  vector("unsupported-descriptor", "unsupported-version", f => { Reflect.set(f.collection.records[0]!, "schemaVersion", 2); }, { ...consistent, status: "invalid-input", inputErrors: ["invalid-fixture-collection"] }),
  vector("malformed-contract-id", "identifier", f => { f.record.binding.contractId = "not-a-uuid"; }, malformed),
  vector("malformed-reference-id", "identifier", f => { f.record.parties[0].consentReceipt.id = "https://synthetic.invalid/ref"; }, malformed),
  vector("duplicate-envelope-reference", "duplicate", f => { f.record.parties[1].consentReceipt = structuredClone(f.record.parties[0].consentReceipt); }, rejected("duplicate-evidence-reference")),
  vector("conflicting-envelope-reference", "conflict", f => { f.record.parties[1].consentReceipt.id = f.record.parties[0].consentReceipt.id; }, rejected("conflicting-evidence-reference")),
  vector("cross-agency-envelope", "agency", f => { f.record.binding.agencyId = foreignAgency; }, rejected("agency-mismatch")),
  vector("cross-agency-reference", "agency", f => { f.record.parties[0].identityEvidence.scope.agencyId = foreignAgency; }, rejected("agency-mismatch")),
  vector("stale-document-revision", "revision", f => { f.record.binding.documentRevisionId = "synthetic-old-document"; }, rejected("stale-revision")),
  vector("stale-aggregate-revision", "revision", f => { f.record.binding.aggregateRevision = 2; }, rejected("stale-revision")),
  vector("stale-attempt", "attempt", f => { f.record.binding.attemptGeneration = 2; }, rejected("attempt-mismatch")),
  vector("snapshot-substitution", "snapshot", f => { f.record.binding.snapshotDigest.value = "00"; }, rejected("snapshot-mismatch")),
  vector("base-artifact-substitution", "artifact", f => { f.record.binding.baseArtifactDigest.value = "00"; }, rejected("artifact-mismatch")),
  vector("final-artifact-substitution", "artifact", f => { f.record.finalArtifactDigest.value = "00"; }, rejected("artifact-mismatch")),
  vector("descriptor-snapshot-substitution", "snapshot", f => { f.collection.records[0]!.binding.snapshotDigest.value = "00"; }, descriptorMismatch("snapshot-mismatch")),
  vector("descriptor-artifact-substitution", "artifact", f => { f.collection.records[0]!.finalArtifactDigest.value = "00"; }, descriptorMismatch("artifact-mismatch")),
  vector("missing-one-descriptor", "missing-resolution", f => { f.collection.records.shift(); }, { ...consistent, status: "incomplete", missing: 1 }),
  vector("missing-time-descriptor", "missing-resolution", f => { f.collection.records = f.collection.records.filter(r => r.reference.id !== f.record.parties[0].trustedTime.proofRef.id); }, { ...consistent, status: "incomplete", missing: 1 }),
  vector("empty-collection", "missing-resolution", f => { f.collection.records = []; }, { ...consistent, status: "incomplete", missing: 24 }),
  vector("duplicate-descriptor", "duplicate", f => { f.collection.records.push(structuredClone(f.collection.records[0]!)); }, { ...consistent, status: "rejected", duplicates: 1 }),
  vector("conflicting-descriptor-digest", "conflict", f => { const row = structuredClone(f.collection.records[0]!); row.reference.digest.value = "00"; f.collection.records.push(row); }, { ...descriptorMismatch("evidence-digest-mismatch"), conflicts: 1 }),
  vector("ambiguous-owner", "ambiguity", f => { const row = structuredClone(f.collection.records[0]!); row.subjectRef = "synthetic-other-subject"; f.collection.records.push(row); }, { ...descriptorMismatch("ownership-mismatch"), mismatchCodes: ["ambiguous-ownership", "ownership-mismatch"], conflicts: 1 }),
  vector("cross-agency-collision", "ambiguity", f => { const row = structuredClone(f.collection.records[0]!); row.reference.scope.agencyId = foreignAgency; f.collection.records.push(row); }, { ...descriptorMismatch("agency-mismatch"), mismatchCodes: ["agency-mismatch", "ambiguous-ownership"], conflicts: 1 }),
  vector("unknown-envelope-field", "unknown-field", f => { Reflect.set(f.record, "verified", true); }, malformed),
  vector("unknown-descriptor-field", "unknown-field", f => { Reflect.set(f.collection.records[0]!, "verified", true); }, { ...consistent, status: "invalid-input", inputErrors: ["invalid-fixture-collection"] }),
  vector("provider-assertion-only", "provider", f => { f.record.verification.statusClaim = "verified"; }, { ...consistent, trustCode: "unverified-provider-assertion" }, 2),
  vector("provider-account-substitution", "provider", f => { f.collection.records.find(r => r.providerBinding)!.providerBinding!.accountRef = "synthetic-other-account"; }, { ...descriptorMismatch("provider-binding-mismatch"), trustCode: "unverified-provider-assertion" }, 2),
  vector("audit-revision-substitution", "audit", f => { f.record.auditAcceptance.aggregateRevisionAfter = 5; }, rejected("audit-revision-mismatch")),
]);

/** Independent key inventory; adding a production field requires deliberate test
 * and inventory review, not deriving the expected schema from implementation. */
export const conformanceFieldGroups = [
  ["record", ["schemaVersion", "mode", "binding", "finalArtifactDigest", "parties", "verification", "auditAcceptance"]],
  ["record.binding", ["agencyId", "contractId", "documentRevisionId", "aggregateRevision", "attemptId", "attemptGeneration", "snapshotSchemaVersion", "snapshotRef", "snapshotDigest", "baseArtifactRef", "baseArtifactDigest", "manifestDigest", "rendererVersion", "partyPlanRef", "partyPlanDigest", "requiredParties"]],
  ["record.binding.requiredParties.0", ["partyInstanceId", "role", "subjectRef"]],
  ["record.binding.snapshotDigest", ["algorithm", "encoding", "domainVersion", "value"]],
  ["record.parties.0", ["partyInstanceId", "role", "subjectRef", "inputArtifactDigest", "outputArtifactDigest", "identityEvidence", "authenticationEvidence", "authorityEvidence", "consentReceipt", "signatureIntentReceipt", "sourceSignatureEvent", "signatureEvidence", "trustedTime", "verificationDecision", "providerOperation"]],
  ["record.parties.0.identityEvidence", ["schemaVersion", "id", "kind", "scope", "partyInstanceId", "digest"]],
  ["record.parties.0.identityEvidence.scope", ["agencyId", "contractId", "documentRevisionId", "attemptId", "manifestDigest"]],
  ["record.parties.0.trustedTime", ["proofRef", "authorityRef", "profileVersion", "verificationDispositionRef"]],
  ["record.parties.0.providerOperation", ["reference", "authenticationEvidence", "providerProfileRef", "accountRef", "environmentRef", "operationId", "statusClaim"]],
  ["record.verification", ["statusClaim", "decisionRef", "verifierIdentityRef", "verifierVersion", "verificationProfileRef", "authenticityEvidenceRef"]],
  ["record.auditAcceptance", ["receiptRef", "auditEventRef", "aggregateRevisionBefore", "aggregateRevisionAfter"]],
  ["context", ["schemaVersion", "mode", "binding", "finalArtifactDigest", "partyArtifacts"]],
  ["context.partyArtifacts.0", ["partyInstanceId", "inputArtifactDigest", "outputArtifactDigest"]],
  ["collection", ["schemaVersion", "mode", "records"]],
  ["collection.records.0", ["schemaVersion", "mode", "reference", "binding", "finalArtifactDigest", "subjectRef", "inputArtifactDigest", "outputArtifactDigest", "providerBinding"]],
  ["collection.records.0.reference", ["schemaVersion", "id", "kind", "scope", "partyInstanceId", "digest"]],
  ["collection.records.0.reference.scope", ["agencyId", "contractId", "documentRevisionId", "attemptId", "manifestDigest"]],
  ["collection.records.10.providerBinding", ["providerProfileRef", "accountRef", "environmentRef", "operationId"]],
] as const;

/** Paths are static test data, never production/user input. */
export function conformanceObjectAt(fixture: ConformanceFixture, path: string): object {
  let value: unknown = fixture;
  for (const key of path.split(".")) {
    if (!value || typeof value !== "object") throw Error("Invalid conformance path");
    value = Reflect.get(value, key);
  }
  if (!value || typeof value !== "object") throw Error("Invalid conformance object");
  return value;
}
