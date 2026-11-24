import { decodeSyntheticSigningResolutionInputs, listOfflineSigningEvidenceReferences, validateOfflineSigningEvidence,
  type OfflineSigningEvidenceContractV1, type SigningEvidenceDigest, type SigningEvidenceReference, type SigningEvidenceRejection,
  type SyntheticResolutionInputError, type SyntheticSigningEvidenceFixtureV1, type SyntheticSigningResolutionContextV1 } from "./signing-evidence";

/** Unconditional dependencies, never converted into trust by fixture consistency. */
const trustDependencies = Object.freeze([
  "authenticated-current-context-and-authorization", "approved-operational-projection-and-policies", "actual-artifact-and-proof-content",
  "canonicalization-and-digest-verification", "identity-authority-authentication-and-consent", "challenge-replay-revocation-and-eligibility",
  "cryptographic-signature-and-time-verification", "verifier-and-provider-authenticity", "durable-authorized-audit-acceptance", "legal-privacy-and-retention-review",
] as const);
export type SyntheticResolutionMismatch = SigningEvidenceRejection | "reference-kind-mismatch" | "evidence-digest-mismatch" |
  "ownership-mismatch" | "ambiguous-ownership" | "provider-binding-mismatch";
export type SyntheticSigningResolution = Readonly<{
  status: "invalid-input" | "rejected" | "incomplete" | "resolved-unverified";
  trust: "unverified"; canActivateSigned: false;
  resolvedReferences: readonly string[]; missingReferences: readonly string[]; duplicateReferences: readonly string[]; conflictingReferences: readonly string[];
  bindingMismatches: readonly Readonly<{ referenceId: string; codes: readonly SyntheticResolutionMismatch[] }>[];
  inputErrors: readonly (SigningEvidenceRejection | SyntheticResolutionInputError | "unexpected-fixture")[];
  unresolvedTrustDependencies: typeof trustDependencies;
}>;
type Report = {
  resolvedReferences: string[]; missingReferences: string[]; duplicateReferences: string[]; conflictingReferences: string[];
  bindingMismatches: { referenceId: string; codes: SyntheticResolutionMismatch[] }[];
  inputErrors: (SigningEvidenceRejection | SyntheticResolutionInputError | "unexpected-fixture")[];
};
const emptyReport = (): Report => ({ resolvedReferences: [], missingReferences: [], duplicateReferences: [], conflictingReferences: [], bindingMismatches: [], inputErrors: [] });
function finish(status: SyntheticSigningResolution["status"], report: Report): SyntheticSigningResolution {
  const sorted = <T extends string>(values: readonly T[]) => Object.freeze([...new Set(values)].sort());
  return Object.freeze({ status, trust: "unverified", canActivateSigned: false,
    resolvedReferences: sorted(report.resolvedReferences), missingReferences: sorted(report.missingReferences), duplicateReferences: sorted(report.duplicateReferences),
    conflictingReferences: sorted(report.conflictingReferences), inputErrors: sorted(report.inputErrors), unresolvedTrustDependencies: trustDependencies,
    bindingMismatches: Object.freeze(report.bindingMismatches.sort((a, b) => a.referenceId < b.referenceId ? -1 : a.referenceId > b.referenceId ? 1 : 0)
      .map(entry => Object.freeze({ referenceId: entry.referenceId, codes: sorted(entry.codes) }))),
  });
}
const sameDigest = (a: SigningEvidenceDigest, b: SigningEvidenceDigest) => a.algorithm === b.algorithm && a.encoding === b.encoding && a.domainVersion === b.domainVersion && a.value === b.value;
const sameNullableDigest = (a: SigningEvidenceDigest | null, b: SigningEvidenceDigest | null) => a === null || b === null ? a === b : sameDigest(a, b);
function contextMatches(value: OfflineSigningEvidenceContractV1, context: SyntheticSigningResolutionContextV1): SigningEvidenceRejection | null {
  if (!sameDigest(value.finalArtifactDigest, context.finalArtifactDigest)) return "artifact-mismatch";
  for (let index = 0; index < 2; index++) {
    const actual = value.parties[index]!, expected = context.partyArtifacts[index]!;
    if (actual.partyInstanceId !== expected.partyInstanceId) return "party-mismatch";
    if (!sameDigest(actual.inputArtifactDigest, expected.inputArtifactDigest) || !sameDigest(actual.outputArtifactDigest, expected.outputArtifactDigest)) return "artifact-mismatch";
  }
  return null;
}
function mismatches(row: SyntheticSigningEvidenceFixtureV1, ref: SigningEvidenceReference<string>, value: OfflineSigningEvidenceContractV1): SyntheticResolutionMismatch[] {
  const codes: SyntheticResolutionMismatch[] = [];
  // Reuse the existing exact binding/CAS comparison. No record is resolved by it.
  const bound = validateOfflineSigningEvidence(value, row.binding);
  if (!bound.ok) codes.push(bound.code);
  if (row.reference.kind !== ref.kind) codes.push("reference-kind-mismatch");
  if (!sameDigest(row.reference.digest, ref.digest)) codes.push("evidence-digest-mismatch");
  const actual = row.reference.scope, expected = ref.scope;
  if (actual.agencyId !== expected.agencyId) codes.push("agency-mismatch");
  if (actual.contractId !== expected.contractId) codes.push("contract-mismatch");
  if (actual.documentRevisionId !== expected.documentRevisionId) codes.push("stale-revision");
  if (actual.attemptId !== expected.attemptId) codes.push("attempt-mismatch");
  if (!sameDigest(actual.manifestDigest, expected.manifestDigest)) codes.push("manifest-mismatch");
  const assigned = value.parties.find(p => p.partyInstanceId === ref.partyInstanceId) ?? null;
  if (row.reference.partyInstanceId !== ref.partyInstanceId || row.subjectRef !== (assigned?.subjectRef ?? null)) codes.push("ownership-mismatch");
  if (!sameDigest(row.finalArtifactDigest, value.finalArtifactDigest) || !sameNullableDigest(row.inputArtifactDigest, assigned?.inputArtifactDigest ?? null) ||
    !sameNullableDigest(row.outputArtifactDigest, assigned?.outputArtifactDigest ?? null)) codes.push("artifact-mismatch");
  const operation = ["provider-operation", "provider-authentication"].includes(ref.kind) ? assigned?.providerOperation ?? null : null;
  const provider = row.providerBinding;
  if (operation === null ? provider !== null : provider === null || operation.providerProfileRef !== provider.providerProfileRef || operation.accountRef !== provider.accountRef ||
    operation.environmentRef !== provider.environmentRef || operation.operationId !== provider.operationId) codes.push("provider-binding-mismatch");
  return codes;
}

/** Deterministic descriptor resolution only. All three arguments are explicit
 * untrusted offline data. No IDs, hashes, timestamps or evidence are generated.
 * No network/storage/clock/crypto/lifecycle dependency or callback injection. */
export function resolveSyntheticSigningEvidence(record: unknown, expectedContext: unknown, fixtureCollection: unknown): SyntheticSigningResolution {
  const report = emptyReport();
  const input = decodeSyntheticSigningResolutionInputs(expectedContext, fixtureCollection);
  if (!input.ok) { report.inputErrors.push(input.code); return finish("invalid-input", report); }
  const validated = validateOfflineSigningEvidence(record, input.context.binding);
  if (!validated.ok) {
    report.inputErrors.push(validated.code);
    return finish(["invalid-structure", "unsupported-evidence-version", "invalid-expected-binding"].includes(validated.code) ? "invalid-input" : "rejected", report);
  }
  const value = validated.value, mismatch = contextMatches(value, input.context);
  if (mismatch) { report.inputErrors.push(mismatch); return finish("rejected", report); }
  const refs = listOfflineSigningEvidenceReferences(value), expectedIds = new Set(refs.map(ref => ref.id));
  const byId = new Map<string, SyntheticSigningEvidenceFixtureV1[]>();
  for (const row of input.collection.records) {
    if (!expectedIds.has(row.reference.id)) { report.inputErrors.push("unexpected-fixture"); continue; }
    const group = byId.get(row.reference.id) ?? []; group.push(row); byId.set(row.reference.id, group);
  }
  for (const ref of refs) {
    const candidates = byId.get(ref.id) ?? [];
    if (candidates.length === 0) { report.missingReferences.push(ref.id); continue; }
    // JSON comparison is over bounded canonical-shaped decoded data, NOT a hash
    // or cryptographic/canonical-document encoding. No candidate is overwritten.
    if (candidates.length > 1) {
      const distinct = new Set(candidates.map(row => JSON.stringify(row)));
      (distinct.size === 1 ? report.duplicateReferences : report.conflictingReferences).push(ref.id);
    }
    const codes = candidates.flatMap(row => mismatches(row, ref, value));
    if (new Set(candidates.map(row => JSON.stringify([row.reference.scope.agencyId, row.reference.scope.contractId, row.reference.partyInstanceId, row.subjectRef]))).size > 1) codes.push("ambiguous-ownership");
    if (codes.length) report.bindingMismatches.push({ referenceId: ref.id, codes });
    if (candidates.length === 1 && codes.length === 0) report.resolvedReferences.push(ref.id);
  }
  return finish(report.inputErrors.length || report.duplicateReferences.length || report.conflictingReferences.length || report.bindingMismatches.length ? "rejected"
    : report.missingReferences.length ? "incomplete" : "resolved-unverified", report);
}
