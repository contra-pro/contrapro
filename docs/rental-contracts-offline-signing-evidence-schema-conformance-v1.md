# Offline signing-evidence schema conformance V1

Status: test/documentation-only compatibility milestone. **ADR-001 remains PROPOSED. Production, real signing and Signed remain NO-GO.** No schema version or production behavior is changed.

## Inventory and scope

Reviewed the existing [contract report](rental-contracts-offline-signing-evidence-contract-v1.md), [resolver report](rental-contracts-synthetic-signing-evidence-resolution-v1.md), [schema proposal](rental-contracts-signing-evidence-schema-v1.md), [provider boundary](rental-contracts-signing-provider-boundary-v1.md), [ADR-001](decisions/001-proposed-electronic-signature-evidence-boundary.md), both implementation modules and their focused tests. This inventory describes the implemented reference subset, not the entire proposed operational schema.

| Version boundary | Current behavior |
| --- | --- |
| Evidence envelope and typed references | Explicit numeric `schemaVersion: 1` only; no omitted/string/automatic legacy evidence version |
| Resolution context, collection and descriptors | Explicit numeric V1 and `mode: offline-synthetic`; every nested descriptor/reference must conform |
| Snapshot labels | `snapshotSchemaVersion: 1`, `2` or `3`; labels only, not decoding/re-hashing full historical snapshots |
| Digest domain, renderer, provider/verifier/time profiles | Bounded opaque labels, not approved versions/algorithms or authenticated identities |
| New versions | None introduced. Any future compatibility change requires separate review; no silent fallback/migration |

All named fields below are mandatory. Nullable means **present with null**, not optional/omitted. Unknown keys reject at every strict object boundary. Plain enumerable data properties and dense arrays are required; accessors/class instances/custom prototypes and extra symbols reject.

| Entity | Exact field inventory |
| --- | --- |
| Envelope | `schemaVersion`, `mode`, `binding`, `finalArtifactDigest`, `parties`, `verification`, `auditAcceptance` |
| Binding | `agencyId`, `contractId`, `documentRevisionId`, `aggregateRevision`, `attemptId`, `attemptGeneration`, `snapshotSchemaVersion`, `snapshotRef`, `snapshotDigest`, `baseArtifactRef`, `baseArtifactDigest`, `manifestDigest`, `rendererVersion`, `partyPlanRef`, `partyPlanDigest`, `requiredParties` |
| Required-party entry | `partyInstanceId`, `role`, `subjectRef`; exactly two ordered entries |
| Party evidence | `partyInstanceId`, `role`, `subjectRef`, `inputArtifactDigest`, `outputArtifactDigest`, `identityEvidence`, `authenticationEvidence`, `authorityEvidence`, `consentReceipt`, `signatureIntentReceipt`, `sourceSignatureEvent`, `signatureEvidence`, `trustedTime`, `verificationDecision`, `providerOperation` (nullable) |
| Typed reference | `schemaVersion`, `id`, `kind`, `scope`, `partyInstanceId` (nullable), `digest` |
| Reference scope | `agencyId`, `contractId`, `documentRevisionId`, `attemptId`, `manifestDigest` |
| Digest descriptor | `algorithm`, `encoding`, `domainVersion`, `value` |
| Trusted-time references | `proofRef`, `authorityRef`, `profileVersion`, `verificationDispositionRef`; no signing instant or token verification |
| Provider operation when present | `reference`, `authenticationEvidence`, `providerProfileRef`, `accountRef`, `environmentRef`, `operationId`, `statusClaim` |
| Verification claims | `statusClaim`, `decisionRef`, `verifierIdentityRef`, `verifierVersion`, `verificationProfileRef`, `authenticityEvidenceRef` |
| Audit references | `receiptRef`, `auditEventRef`, `aggregateRevisionBefore`, `aggregateRevisionAfter` |
| Resolution context | `schemaVersion`, `mode`, `binding`, `finalArtifactDigest`, `partyArtifacts` (exactly two) |
| Party artifact context | `partyInstanceId`, `inputArtifactDigest`, `outputArtifactDigest` |
| Collection | `schemaVersion`, `mode`, `records` (0–128 descriptors) |
| Descriptor | `schemaVersion`, `mode`, `reference`, `binding`, `finalArtifactDigest`, `subjectRef`, `inputArtifactDigest`, `outputArtifactDigest`, `providerBinding`; last four nullable |
| Provider binding when present | `providerProfileRef`, `accountRef`, `environmentRef`, `operationId` |

### Formats and binding rules

- Agency/contract IDs: case-insensitive UUID-shaped syntax, excluding the nil UUID; no RFC variant/version assertion. Comparisons are exact strings, with no case normalization.
- Local reference/version/profile labels: 1–128 ASCII letters/digits/dot/underscore/colon/hyphen, beginning with a letter/digit. No URLs, whitespace trimming or generated fallback IDs.
- Provider operation claims: 1–512 characters, no controls or surrounding whitespace. They are opaque strings, never URLs to fetch.
- Digests: nonempty hex pairs or base64-shaped text, maximum 2,048 characters, plus opaque algorithm/domain labels. Exact comparisons include all metadata and encoded text. No digest is computed, normalized or verified.
- Revisions/generations: positive safe integers. Acceptance-reference before revision equals the supplied aggregate revision; after equals before + 1 and must remain safe. These are claimed references, not a durable commit.
- Two parties: agency representative first, customer second; unique party instances and exact assigned subject/role equality. Same person across roles is not independently prohibited by this schema; no new authority policy is inferred.
- Bind envelope and every reference/descriptor to explicit agency/contract/document revision/attempt and manifest; compare aggregate revision/generation, snapshot schema/reference/digest, renderer/base artifact and party-plan metadata against supplied expected binding.
- Artifact chain: agency input equals base; customer input equals agency output; final equals customer output. Resolution additionally checks explicit expected final and per-party artifact contexts and every descriptor's claims.
- Reference IDs must be unique across the envelope. Collection duplicates reject even when identical. Conflicts never choose first/last. Unknown fixture IDs reject the closed collection without exposing their IDs. Missing rows are not replaced by foreign candidates.
- Party descriptor subject and artifact fields must match the assigned party. Aggregate descriptor ownership/artifacts are null. Provider binding applies only to provider-operation/authentication reference kinds and must match the party's profile/account/environment/operation claims.

Verification claim vocabulary: `proposed`, `pending`, `verified`, `rejected`, `quarantined`, `invalidated`. Provider claim vocabulary: `accepted`, `pending`, `completed`, `failed`, `cancelled`, `expired`, `unknown`. No claim is a trusted disposition.

### Error and result categories

| Layer | Categories / precedence |
| --- | --- |
| Envelope syntax decoder | `unsupported-evidence-version` for an explicitly non-V1 top-level tag; otherwise `invalid-structure` for missing/malformed fields, nested versions and unknown keys |
| Consistency validator | Syntax first, then `invalid-expected-binding`; binding order: agency, contract, stale revision, attempt, snapshot, artifact, manifest, party; then duplicate/conflicting IDs, reference scope/party, party order/assignment, artifact chain and audit revision |
| Binding codes | `agency-mismatch`, `contract-mismatch`, `stale-revision`, `attempt-mismatch`, `snapshot-mismatch`, `artifact-mismatch`, `manifest-mismatch`, `party-mismatch` |
| Other validator codes | `duplicate-evidence-reference`, `conflicting-evidence-reference`, `audit-revision-mismatch` |
| Resolution input | `invalid-resolution-context` before `invalid-fixture-collection`; both syntax checks precede envelope validation; no partial malformed-row filtering |
| Resolution diagnostics | Propagated validator codes, `unexpected-fixture`, plus `reference-kind-mismatch`, `evidence-digest-mismatch`, `ownership-mismatch`, `ambiguous-ownership`, `provider-binding-mismatch` |
| Resolution status | `invalid-input`, `rejected`, `incomplete`, `resolved-unverified`; sorted/deduplicated diagnostics and recursively frozen results |
| Trust assessment | Structural/consistency rejection, otherwise always `unverified-provider-assertion` for provider-backed envelopes or `trust-verification-unavailable` |

Decode success and consistency success explicitly retain `trust: unverified` and `canActivateSigned: false`. Decoder/validator rejection objects contain `ok`, `code`, `canActivateSigned`; they do not have a `trust` field. Resolver results always carry unverified trust, false activation and unresolved dependencies. A decoded evidence **value**, not its `{ok,value,...}` wrapper, is the resolver input. No provider status, print/download, syntactic completeness or simulation verification can establish signing. Existing lifecycle rejects Signed independently.

## Fixture matrix and conformance checks

Test-only fixture factory: `apps/web/src/rentals/__fixtures__/signing-evidence-conformance.ts`. It uses static synthetic identifiers/digest claims, numeric V1 tags and zero/one/two provider configurations. Collection construction lists the required references independently of the production enumerator. Each invocation returns detached data; no clocks, random generators, raw consent/signature/time objects or real personal records are used. Lifecycle regression data contains only synthetic rental dates, not signing timestamps.

The 37 named vectors have these expected outcomes. “OK” means syntax/consistency only. Every row remains unverified and cannot activate Signed.

| Fixture IDs | Decode / consistency | Resolution / diagnostics |
| --- | --- | --- |
| `valid-24`, `valid-26`, `valid-28` | OK / OK | `resolved-unverified`, 24/26/28 typed descriptors |
| `missing-binding`, `missing-consent-reference`, `missing-audit-acceptance` | `invalid-structure` | `invalid-input`, same code |
| `unsupported-envelope` | `unsupported-evidence-version` | `invalid-input`, same code |
| `unsupported-reference` | `invalid-structure` | `invalid-input`, same code |
| `unsupported-context` | OK / OK | `invalid-input`, `invalid-resolution-context` |
| `unsupported-collection`, `unsupported-descriptor` | OK / OK | `invalid-input`, `invalid-fixture-collection` |
| `malformed-contract-id`, `malformed-reference-id` | `invalid-structure` | `invalid-input`, same code |
| `duplicate-envelope-reference` | OK / `duplicate-evidence-reference` | `rejected`, same code |
| `conflicting-envelope-reference` | OK / `conflicting-evidence-reference` | `rejected`, same code |
| `cross-agency-envelope`, `cross-agency-reference` | OK / `agency-mismatch` | `rejected`, same code |
| `stale-document-revision`, `stale-aggregate-revision` | OK / `stale-revision` | `rejected`, same code |
| `stale-attempt` | OK / `attempt-mismatch` | `rejected`, same code |
| `snapshot-substitution` | OK / `snapshot-mismatch` | `rejected`, same code |
| `base-artifact-substitution`, `final-artifact-substitution` | OK / `artifact-mismatch` | `rejected`, same code |
| `descriptor-snapshot-substitution` | OK / OK | `rejected`, reference-bound `snapshot-mismatch` |
| `descriptor-artifact-substitution` | OK / OK | `rejected`, reference-bound `artifact-mismatch` |
| `missing-one-descriptor`, `missing-time-descriptor`, `empty-collection` | OK / OK | `incomplete`, 1/1/24 missing references |
| `duplicate-descriptor` | OK / OK | `rejected`, one duplicate ID, no silent deduplication |
| `conflicting-descriptor-digest` | OK / OK | `rejected`, one conflicting ID and `evidence-digest-mismatch` |
| `ambiguous-owner` | OK / OK | `rejected`, one conflicting ID, `ambiguous-ownership` and `ownership-mismatch` |
| `cross-agency-collision` | OK / OK | `rejected`, one conflicting ID, `agency-mismatch` and `ambiguous-ownership`; no winner or foreign-value disclosure |
| `unknown-envelope-field` | `invalid-structure` | `invalid-input`, same code |
| `unknown-descriptor-field` | OK / OK | `invalid-input`, `invalid-fixture-collection` |
| `provider-assertion-only` | OK / OK | `resolved-unverified`; trust assessment rejects `unverified-provider-assertion` despite completed/verified claims |
| `provider-account-substitution` | OK / OK | `rejected`, `provider-binding-mismatch`; trust assessment still cannot authenticate the provider |
| `audit-revision-substitution` | OK / `audit-revision-mismatch` | `rejected`, same code |

Compatibility checks additionally pin the exact key inventories of 18 representative object boundaries, delete each of their 112 required fields, inject unknown string/symbol keys at every inventoried boundary, distinguish nullable from omitted provider fields, and retain snapshot labels 1/2/3 without changing evidence V1. Every named vector checks fixed results, decoder/validator/trust separation, raw vs decoded-value resolution, repeated factories/calls, ordinary JSON round-trip, reversed property insertion and reversed fixture order, plus input preservation. JSON round-trip is compatibility coverage, not canonicalization or digest computation.

Additional tests exercise fully frozen inputs, detached/frozen decoded values and collections, wrapper-vs-value rejection, multi-error precedence, every supported verifier/provider claim, exact digest text comparison, foreign-candidate redaction, no network/storage/clock/crypto effects, print/download/status-only rejection and lifecycle non-activation in every reachable state. Existing focused tests are retained without modification. Tests for existing correct behavior need no production behavior change.

## Identified gaps and unresolved decisions

1. This is a reference/descriptors schema, not raw proof, identity, challenge, policy, timestamp, artifact bytes or audit-record schemas. Matching labels do not prove content/existence outside the supplied synthetic collection.
2. Canonical encoding, approved algorithms/domain separation, digest vectors/length relationships, exact retained artifact validation and long-term trust material remain undecided. Current lexical checks are not cryptographic acceptance rules; base64 pad-bit canonicality is not enforced. No algorithm or normalization policy is approved here.
3. Current context is explicitly supplied offline data, not authenticated revision/agency authority. UUID syntax and exact-case comparisons are not identity verification or production ID canonicalization policy.
4. Nested versions/missing keys share coarse, pathless errors; no migration/extension negotiation or automatic snapshot-evidence upgrade exists. Adding optional/omittable fields or widening accepted versions requires an explicitly reviewed compatibility decision.
5. Resolution reports descriptor consistency even for a `rejected`/`invalidated` claimed disposition; `resolved-unverified` does not mean admissible evidence. Trust denial is unconditional. Future consumers must not map this status to verified acceptance.
6. Fixture duplicate comparison is deterministic structural JSON over decoded shapes, not canonical snapshot encoding or a cryptographic digest. Reference enumeration is typed for already-decoded values; resolver revalidation supplies its runtime boundary.
7. Legal/privacy, identity/authority assurance, real consent/intent, revocation/replay/eligibility, signature/time/provider/verifier authenticity and durable audit commitment remain gates. No operational trust verification is tested or claimed.

These are scoped limitations/design dependencies, not authorization to silently change security behavior. No documented incompatibility requires a new schema version in this milestone. No implementation defect requiring production edits has been established during inventory.

## Files, results and next gate

Exact files added:

1. `apps/web/src/rentals/__fixtures__/signing-evidence-conformance.ts` — deterministic independent synthetic factory, 37 named vectors with expected outcomes, and explicit field inventories.
2. `apps/web/src/rentals/signing-evidence-conformance.test.ts` — compatibility/conformance tests only.
3. This report — contract inventory, fixture matrix, gaps, results and gates.

Verification on 2026-11-21 UTC:

- Focused conformance suite: `npm run test --workspace=@contratpro/web -- src/rentals/signing-evidence-conformance.test.ts` — **211 PASS**.
- Full rental regression: `npm run test --workspace=@contratpro/web -- src/rentals` — **984 PASS, 21 files**, including all 211 conformance cases and both existing evidence suites (73 contract + 48 resolution), lifecycle, snapshot, PDF, template and pagination tests.
- TypeScript: `npx --no-install tsc --project apps/web/tsconfig.json --noEmit --incremental false` — PASS.
- Targeted ESLint for the new test and fixture module, existing web config, `--max-warnings=0` — PASS; existing Next pages-directory informational notice remains.
- Tracked `git diff --check` plus explicit trailing-whitespace checks covering the three new/untracked files — no whitespace diagnostics.
- Before/after Git object hashes match for both evidence implementation modules, lifecycle, snapshot/settings, document renderer, studio/print CSS, PDF export and both existing focused test files. No production or existing test file was edited; unrelated work is preserved.

Initial failures were confined to the new test harness: a provider-binding inventory path selected a nullable ordinary descriptor rather than the provider descriptor; fixture generic/literal typing also needed narrowing. These were corrected in test-only files. No decoder/resolver implementation change or new version was needed. No skipped tests, real signing, live evidence, provider calls or schema migrations were introduced. Browser/PDF generation and builds were not rerun for this test/documentation-only milestone; no fresh print-page claim is made.

**GO** for a separately scoped offline canonicalization specification and synthetic conformance-vector design. Algorithm/domain/encoding decisions and fixed vectors must receive explicit review before any hashing implementation. **NO-GO** for operational trust verification, Signed activation, provider/authentication/capture integration or production. ADR-001 remains PROPOSED.
