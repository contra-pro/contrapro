/** Offline reference contract only. This module verifies neither signatures nor
 * trust. No lifecycle imports, network, clock, artifact reads or state writes.
 * ADR-001 remains proposed; no operational profile is selected here. */
type Parser<T> = (input: unknown) => T | undefined;
type Parsed<P> = P extends Parser<infer T> ? T : never;
type Shape = Readonly<Record<string, Parser<unknown>>>;
type ObjectValue<S extends Shape> = { readonly [K in keyof S]: Parsed<S[K]> };

// Decode only bounded, exact plain data records. Read descriptors, never getters.
// Copy while decoding so neither callers nor retained nested inputs can mutate it.
function object<S extends Shape>(shape: S): Parser<ObjectValue<S>> {
  return input => {
    if (!input || typeof input !== "object" || Object.getPrototypeOf(input) !== Object.prototype) return;
    const keys = Reflect.ownKeys(input), names = Object.keys(shape);
    if (keys.length !== names.length || keys.some(key => typeof key !== "string" || !Object.hasOwn(shape, key))) return;
    const copy: Record<string, unknown> = {};
    for (const name of names) {
      const property = Object.getOwnPropertyDescriptor(input, name);
      if (!property?.enumerable || !("value" in property)) return;
      const value = shape[name]!(property.value);
      if (value === undefined) return;
      copy[name] = value;
    }
    return Object.freeze(copy) as ObjectValue<S>;
  };
}
function pair<T>(parser: Parser<T>): Parser<readonly [T, T]> {
  return input => {
    if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype || input.length !== 2 || Reflect.ownKeys(input).length !== 3) return;
    const values: T[] = [];
    for (const name of ["0", "1"]) {
      const property = Object.getOwnPropertyDescriptor(input, name);
      if (!property?.enumerable || !("value" in property)) return;
      const value = parser(property.value); if (value === undefined) return;
      values.push(value);
    }
    return Object.freeze(values) as unknown as readonly [T, T];
  };
}
const literal = <T extends string | number>(value: T): Parser<T> => input => input === value ? value : undefined;
const choice = <T extends string | number>(...values: readonly T[]): Parser<T> => input => values.includes(input as T) ? input as T : undefined;
const nullable = <T>(parser: Parser<T>): Parser<T | null> => input => input === null ? null : parser(input);
const token: Parser<string> = input => typeof input === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(input) ? input : undefined;
const uuid: Parser<string> = input => typeof input === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input) && input !== "00000000-0000-0000-0000-000000000000" ? input : undefined;
const revision: Parser<number> = input => typeof input === "number" && Number.isSafeInteger(input) && input > 0 ? input : undefined;
// These are lexical limits, not approval of any provider's ID format or algorithm.
const externalOperationId: Parser<string> = input => typeof input === "string" && input.length > 0 && input.length <= 512 && input.trim() === input && !/[\u0000-\u001f\u007f]/.test(input) ? input : undefined;
const encodedDigest: Parser<string> = input => typeof input === "string" && input.length > 0 && input.length <= 2048 ? input : undefined;
const rawDigest = object({ algorithm: token, encoding: choice("hex", "base64"), domainVersion: token, value: encodedDigest });
const digest: Parser<Parsed<typeof rawDigest>> = input => {
  const value = rawDigest(input); if (!value) return;
  const valid = value.encoding === "hex" ? /^(?:[0-9a-fA-F]{2})+$/.test(value.value) : /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.value);
  return valid ? value : undefined;
};
/** Metadata and encoded bytes are claims. No hashing or cryptography occurs. */
export type SigningEvidenceDigest = Parsed<typeof digest>;
const requiredParty = object({ partyInstanceId: token, role: choice("agency-representative", "customer"), subjectRef: token });
const binding = object({ agencyId: uuid, contractId: uuid, documentRevisionId: token, aggregateRevision: revision,
  attemptId: token, attemptGeneration: revision, snapshotSchemaVersion: choice(1, 2, 3), snapshotRef: token, snapshotDigest: digest,
  baseArtifactRef: token, baseArtifactDigest: digest, manifestDigest: digest, rendererVersion: token,
  partyPlanRef: token, partyPlanDigest: digest, requiredParties: pair(requiredParty) });
export type SigningEvidenceBinding = Parsed<typeof binding>;
const scope = object({ agencyId: uuid, contractId: uuid, documentRevisionId: token, attemptId: token, manifestDigest: digest });
const reference = <K extends string>(kind: K) => object({ schemaVersion: literal(1), id: token, kind: literal(kind),
  scope, partyInstanceId: nullable(token), digest });
export type SigningEvidenceReference<K extends string> = Readonly<{
  schemaVersion: 1; id: string; kind: K; scope: Parsed<typeof scope>; partyInstanceId: string | null; digest: SigningEvidenceDigest;
}>;
const providerOperation = object({ reference: reference("provider-operation"), authenticationEvidence: reference("provider-authentication"),
  providerProfileRef: token, accountRef: token, environmentRef: token, operationId: externalOperationId,
  statusClaim: choice("accepted", "pending", "completed", "failed", "cancelled", "expired", "unknown") });
export type SigningProviderOperationReferences = Parsed<typeof providerOperation>;
const party = object({ partyInstanceId: token, role: choice("agency-representative", "customer"), subjectRef: token,
  inputArtifactDigest: digest, outputArtifactDigest: digest,
  identityEvidence: reference("identity"), authenticationEvidence: reference("authentication"), authorityEvidence: reference("authority"),
  consentReceipt: reference("consent"), signatureIntentReceipt: reference("signature-intent"),
  sourceSignatureEvent: reference("source-signature-event"), signatureEvidence: reference("signature"),
  trustedTime: object({ proofRef: reference("trusted-time"), authorityRef: token, profileVersion: token, verificationDispositionRef: reference("time-disposition") }),
  verificationDecision: reference("party-verification"), providerOperation: nullable(providerOperation) });
export type SigningPartyEvidenceReferences = Parsed<typeof party>;
const verification = object({ statusClaim: choice("proposed", "pending", "verified", "rejected", "quarantined", "invalidated"),
  decisionRef: reference("aggregate-verification"), verifierIdentityRef: token, verifierVersion: token,
  verificationProfileRef: token, authenticityEvidenceRef: reference("verifier-authenticity") });
export type SigningVerificationProvenance = Parsed<typeof verification>;
const auditAcceptance = object({ receiptRef: reference("audit-acceptance"), auditEventRef: reference("audit-event"),
  aggregateRevisionBefore: revision, aggregateRevisionAfter: revision });
export type SigningAuditAcceptanceReferences = Parsed<typeof auditAcceptance>;
const envelope = object({ schemaVersion: literal(1), mode: literal("offline-synthetic"), binding,
  finalArtifactDigest: digest, parties: pair(party), verification, auditAcceptance });
export type OfflineSigningEvidenceContractV1 = Parsed<typeof envelope>;

export type SigningEvidenceRejection = "unsupported-evidence-version" | "invalid-structure" | "invalid-expected-binding" |
  "agency-mismatch" | "contract-mismatch" | "stale-revision" | "attempt-mismatch" | "snapshot-mismatch" | "artifact-mismatch" |
  "manifest-mismatch" | "party-mismatch" | "duplicate-evidence-reference" | "conflicting-evidence-reference" | "audit-revision-mismatch";
type Rejection = Readonly<{ ok: false; code: SigningEvidenceRejection; canActivateSigned: false }>;
type StructuralSuccess = Readonly<{ ok: true; value: OfflineSigningEvidenceContractV1; trust: "unverified"; canActivateSigned: false }>;
export type OfflineSigningEvidenceValidation = StructuralSuccess | Rejection;
const reject = (code: SigningEvidenceRejection): Rejection => ({ ok: false, code, canActivateSigned: false });
const structuralSuccess = (value: OfflineSigningEvidenceContractV1): StructuralSuccess => ({ ok: true, value, trust: "unverified", canActivateSigned: false });

/** Checks structure only. Claimed verification status is explicitly untrusted. */
export function decodeOfflineSigningEvidence(input: unknown): OfflineSigningEvidenceValidation {
  try {
    if (input && typeof input === "object") {
      const version = Object.getOwnPropertyDescriptor(input, "schemaVersion");
      if (version && "value" in version && version.value !== 1) return reject("unsupported-evidence-version");
    }
    const value = envelope(input);
    return value ? structuralSuccess(value) : reject("invalid-structure");
  } catch { return reject("invalid-structure"); }
}
const sameDigest = (a: SigningEvidenceDigest, b: SigningEvidenceDigest) => a.algorithm === b.algorithm && a.encoding === b.encoding && a.domainVersion === b.domainVersion && a.value === b.value;
function compareBinding(actual: SigningEvidenceBinding, expected: SigningEvidenceBinding): SigningEvidenceRejection | null {
  if (actual.agencyId !== expected.agencyId) return "agency-mismatch";
  if (actual.contractId !== expected.contractId) return "contract-mismatch";
  if (actual.documentRevisionId !== expected.documentRevisionId || actual.aggregateRevision !== expected.aggregateRevision) return "stale-revision";
  if (actual.attemptId !== expected.attemptId || actual.attemptGeneration !== expected.attemptGeneration) return "attempt-mismatch";
  if (actual.snapshotSchemaVersion !== expected.snapshotSchemaVersion || actual.snapshotRef !== expected.snapshotRef || !sameDigest(actual.snapshotDigest, expected.snapshotDigest)) return "snapshot-mismatch";
  if (actual.rendererVersion !== expected.rendererVersion || actual.baseArtifactRef !== expected.baseArtifactRef || !sameDigest(actual.baseArtifactDigest, expected.baseArtifactDigest)) return "artifact-mismatch";
  if (!sameDigest(actual.manifestDigest, expected.manifestDigest)) return "manifest-mismatch";
  if (actual.partyPlanRef !== expected.partyPlanRef || !sameDigest(actual.partyPlanDigest, expected.partyPlanDigest) || JSON.stringify(actual.requiredParties) !== JSON.stringify(expected.requiredParties)) return "party-mismatch";
  return null;
}
type AttributedReference = Readonly<{ reference: SigningEvidenceReference<string>; partyId: string | null }>;
function references(value: OfflineSigningEvidenceContractV1): readonly AttributedReference[] {
  const result: AttributedReference[] = [];
  for (const p of value.parties) {
    const refs: SigningEvidenceReference<string>[] = [p.identityEvidence, p.authenticationEvidence, p.authorityEvidence, p.consentReceipt,
      p.signatureIntentReceipt, p.sourceSignatureEvent, p.signatureEvidence, p.trustedTime.proofRef, p.trustedTime.verificationDispositionRef, p.verificationDecision];
    if (p.providerOperation) refs.push(p.providerOperation.reference, p.providerOperation.authenticationEvidence);
    result.push(...refs.map(reference => ({ reference, partyId: p.partyInstanceId })));
  }
  result.push(...[value.verification.decisionRef, value.verification.authenticityEvidenceRef, value.auditAcceptance.receiptRef,
    value.auditAcceptance.auditEventRef].map(reference => ({ reference, partyId: null })));
  return result;
}

/** Typed reference enumeration for an already decoded envelope. No lookup or trust. */
export function listOfflineSigningEvidenceReferences(value: OfflineSigningEvidenceContractV1): readonly SigningEvidenceReference<string>[] {
  return Object.freeze(references(value).map(entry => entry.reference));
}

// Synthetic resolution descriptors deliberately reuse the exact V1 syntax above.
// They contain no raw signature, identity, time proof, event or verification result.
const fixtureReference = object({ schemaVersion: literal(1), id: token,
  kind: choice("identity", "authentication", "authority", "consent", "signature-intent", "source-signature-event", "signature", "trusted-time",
    "time-disposition", "party-verification", "provider-operation", "provider-authentication", "aggregate-verification", "verifier-authenticity", "audit-acceptance", "audit-event"),
  scope, partyInstanceId: nullable(token), digest });
const providerBinding = object({ providerProfileRef: token, accountRef: token, environmentRef: token, operationId: externalOperationId });
const syntheticFixture = object({ schemaVersion: literal(1), mode: literal("offline-synthetic"), reference: fixtureReference, binding,
  finalArtifactDigest: digest, subjectRef: nullable(token), inputArtifactDigest: nullable(digest), outputArtifactDigest: nullable(digest), providerBinding: nullable(providerBinding) });
export type SyntheticSigningEvidenceFixtureV1 = Parsed<typeof syntheticFixture>;
const fixtureList: Parser<readonly SyntheticSigningEvidenceFixtureV1[]> = input => {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype || input.length > 128 || Reflect.ownKeys(input).length !== input.length + 1) return;
  const copy: SyntheticSigningEvidenceFixtureV1[] = [];
  for (let index = 0; index < input.length; index++) {
    const property = Object.getOwnPropertyDescriptor(input, String(index));
    if (!property?.enumerable || !("value" in property)) return;
    const value = syntheticFixture(property.value); if (!value) return;
    copy.push(value);
  }
  return Object.freeze(copy);
};
const syntheticCollection = object({ schemaVersion: literal(1), mode: literal("offline-synthetic"), records: fixtureList });
export type SyntheticSigningEvidenceCollectionV1 = Parsed<typeof syntheticCollection>;
const partyArtifact = object({ partyInstanceId: token, inputArtifactDigest: digest, outputArtifactDigest: digest });
const resolutionContext = object({ schemaVersion: literal(1), mode: literal("offline-synthetic"), binding, finalArtifactDigest: digest, partyArtifacts: pair(partyArtifact) });
export type SyntheticSigningResolutionContextV1 = Parsed<typeof resolutionContext>;
export type SyntheticResolutionInputError = "invalid-resolution-context" | "invalid-fixture-collection";

/** Syntax only, including strict V1 tags on every fixture/reference. */
export function decodeSyntheticSigningResolutionInputs(context: unknown, collection: unknown):
  Readonly<{ ok: true; context: SyntheticSigningResolutionContextV1; collection: SyntheticSigningEvidenceCollectionV1; trust: "unverified"; canActivateSigned: false }> |
  Readonly<{ ok: false; code: SyntheticResolutionInputError; trust: "unverified"; canActivateSigned: false }> {
  let decodedContext: SyntheticSigningResolutionContextV1 | undefined;
  try { decodedContext = resolutionContext(context); } catch { /* reject opaque input */ }
  if (!decodedContext) return { ok: false, code: "invalid-resolution-context", trust: "unverified", canActivateSigned: false };
  let decodedCollection: SyntheticSigningEvidenceCollectionV1 | undefined;
  try { decodedCollection = syntheticCollection(collection); } catch { /* reject opaque input */ }
  return decodedCollection ? { ok: true, context: decodedContext, collection: decodedCollection, trust: "unverified", canActivateSigned: false }
    : { ok: false, code: "invalid-fixture-collection", trust: "unverified", canActivateSigned: false };
}

/** Pure consistency checks against explicitly supplied expected offline data.
 * Neither argument is an authenticated authority. No evidence is resolved. */
export function validateOfflineSigningEvidence(input: unknown, expectedBinding: unknown): OfflineSigningEvidenceValidation {
  const decoded = decodeOfflineSigningEvidence(input); if (!decoded.ok) return decoded;
  let expected: SigningEvidenceBinding | undefined;
  try { expected = binding(expectedBinding); } catch { return reject("invalid-expected-binding"); }
  if (!expected) return reject("invalid-expected-binding");
  const value = decoded.value, b = value.binding;
  const mismatch = compareBinding(b, expected); if (mismatch) return reject(mismatch);
  const all = references(value), seen = new Map<string, string>();
  // IDs are unique in this envelope, including across kinds and party instances.
  for (const { reference: ref } of all) {
    const fingerprint = JSON.stringify(ref), prior = seen.get(ref.id);
    if (prior !== undefined) return reject(prior === fingerprint ? "duplicate-evidence-reference" : "conflicting-evidence-reference");
    seen.set(ref.id, fingerprint);
  }
  for (const { reference: ref, partyId } of all) {
    const s = ref.scope;
    if (s.agencyId !== b.agencyId) return reject("agency-mismatch");
    if (s.contractId !== b.contractId) return reject("contract-mismatch");
    if (s.documentRevisionId !== b.documentRevisionId) return reject("stale-revision");
    if (s.attemptId !== b.attemptId) return reject("attempt-mismatch");
    if (!sameDigest(s.manifestDigest, b.manifestDigest)) return reject("manifest-mismatch");
    if (ref.partyInstanceId !== partyId) return reject("party-mismatch");
  }
  const [agency, customer] = value.parties;
  if (agency.role !== "agency-representative" || customer.role !== "customer" || agency.partyInstanceId === customer.partyInstanceId) return reject("party-mismatch");
  for (let index = 0; index < 2; index++) {
    const actual = value.parties[index]!, assigned = b.requiredParties[index]!;
    if (actual.partyInstanceId !== assigned.partyInstanceId || actual.role !== assigned.role || actual.subjectRef !== assigned.subjectRef) return reject("party-mismatch");
  }
  if (!sameDigest(agency.inputArtifactDigest, b.baseArtifactDigest) || !sameDigest(customer.inputArtifactDigest, agency.outputArtifactDigest) ||
    !sameDigest(value.finalArtifactDigest, customer.outputArtifactDigest)) return reject("artifact-mismatch");
  const audit = value.auditAcceptance;
  if (b.aggregateRevision >= Number.MAX_SAFE_INTEGER || audit.aggregateRevisionBefore !== b.aggregateRevision || audit.aggregateRevisionAfter !== b.aggregateRevision + 1) return reject("audit-revision-mismatch");
  return decoded;
}

/** Explicit denial boundary, NOT a verifier or predicate-S implementation.
 * An imported report or synthetic fixture can never acquire operational trust. */
export function assessOfflineSigningEvidenceTrust(input: unknown, expectedBinding: unknown): Readonly<{
  ok: false; code: SigningEvidenceRejection | "unverified-provider-assertion" | "trust-verification-unavailable"; canActivateSigned: false;
}> {
  const result = validateOfflineSigningEvidence(input, expectedBinding);
  if (!result.ok) return result;
  return { ok: false, code: result.value.parties.some(p => p.providerOperation !== null) ? "unverified-provider-assertion" : "trust-verification-unavailable", canActivateSigned: false };
}
