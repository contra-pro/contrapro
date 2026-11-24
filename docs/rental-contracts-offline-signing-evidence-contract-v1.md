# Offline signing-evidence contract V1

Status: bounded offline implementation. ADR-001 remains **PROPOSED**. Production, real signing and the Signed transition remain **NO-GO**.

Based on the proposed [architecture](rental-contracts-electronic-signature-architecture-v1.md), [schema](rental-contracts-signing-evidence-schema-v1.md), [provider boundary](rental-contracts-signing-provider-boundary-v1.md), [threat model](rental-contracts-signing-threat-model-v1.md) and [ADR-001](decisions/001-proposed-electronic-signature-evidence-boundary.md). This implementation does not change their approval status.

## Review and implementation mapping

The architecture, evidence schema, provider boundary, threat model, ADR and existing lifecycle acceptance tests were reviewed before implementation. This task authorizes a synthetic reference-envelope codec and consistency checks, not approval of the proposed operational architecture or predicate S.

| Proposed requirement | Bounded implementation |
| --- | --- |
| Agency/contract/document/attempt identity | Explicit scoped bindings; agency/contract UUIDs follow current application syntax; opaque local reference tokens are not provider identifiers |
| Frozen snapshot and renderer/artifact identity | Separate snapshot, manifest, base/final and per-party input/output digest descriptors; snapshot schema 1/2/3; exact metadata comparisons against a supplied expected binding |
| Identity/authentication/authority/consent/intent/signature/time | Required, separately typed per-party references; no collected facts, instants or proof objects |
| Agency first, customer second | Exactly two synthetic required parties; chain input/output consistency; no inference of additional signers |
| Optional provider operation | Explicit nullable provider metadata, operation reference and authentication-evidence reference; external operation ID remains an opaque claim |
| Verification and provenance | Claimed disposition plus verifier/profile/authenticity references; all remain unverified input |
| Audit acceptance | Required acceptance/event references and consecutive claimed aggregate revisions; no event emission or durable-commit claim |
| Tenant/revision/evidence substitution | Validate scope on every reference, expected binding, party attribution, duplicate/conflicting reference IDs and artifact chain |
| Trust | Separate assessment always denies; no cryptography, authority lookup, trust brands, evidence store or lifecycle integration |

Syntactic decoding accepts pending/rejected/claimed-verified dispositions so they can be represented without believing them. Consistency validation never produces a verified signature. Trust assessment explicitly rejects unverified provider assertions and always blocks operational acceptance, even when every supplied claim says verified. Audit references are required but their existence/authenticity is not established here.

## Unresolved decisions and blockers

Operational projection/renderer approval, canonical encoding and domain separation, digest algorithms and vectors, party/authority policy, identity assurance and authentication freshness, consent/intent wording, signature methods, timestamp profiles/trust anchors, verifier authentication, provider/account profiles, durable audit acceptance, retention/privacy/legal review and atomic state commitment are unresolved operational gates. No defaults for those decisions are implemented.

Digest descriptors are compared as exact opaque claims; encoding syntax is checked, but no algorithm is approved and no hash is computed or verified. Local token grammar and collection/string bounds are codec constraints only, not an operational provider-ID policy. Schema 1/2/3 labels preserve references to historical formats; the codec neither reads nor mutates historical snapshot content. The expected binding is also caller-supplied offline data, not an authenticated current-revision authority.

The envelope deliberately omits full raw proofs, challenges, policies, revocation history, artifact bytes and time assertions. It is a reference contract, not a complete implementation of the evidence proposal. A future milestone must validate resolved immutable records and their provenance; references alone cannot satisfy predicate S. Providerless methods remain unapproved; `providerOperation: null` cannot bypass trust assessment.

## Safety and validation

Only `mode: offline-synthetic` is accepted. Exact keys, plain data properties, finite positive safe revisions, supported evidence versions, bounded token/digest syntax and two ordered parties are enforced. Unknown fields (including signature timestamps, Signed flags, print/download success or client verification booleans), accessors, sparse arrays and class instances reject. Decoding returns a detached recursively frozen copy; validation never changes its inputs or the lifecycle.

No timestamps, signatures, consents, audit records, network operations, provider dispatch or lifecycle writes are created. Printing/downloading are outside the evidence vocabulary. Existing lifecycle and A4 implementation files remain unchanged. No evidence payload is an input to the lifecycle's Signed guard.

The three public functions are intentionally separate:

- `decodeOfflineSigningEvidence(unknown)`: exact syntax, required reference kinds and supported versions; returns a detached frozen envelope with `trust: unverified` and `canActivateSigned: false`.
- `validateOfflineSigningEvidence(unknown, expectedBinding)`: additionally checks current supplied scope/revisions/attempt, assigned subjects/order, digest metadata, every reference's attribution, unique IDs, artifact-chain equality and audit-revision consistency. It still returns only unverified structure, not accepted evidence.
- `assessOfflineSigningEvidenceTrust(unknown, expectedBinding)`: propagates structural/consistency rejection, rejects any provider-backed envelope as `unverified-provider-assertion`, and otherwise returns `trust-verification-unavailable`. It never succeeds. There is no operational verifier or acceptance escape hatch.

Invalid or absent fields and unsupported nested versions return `invalid-structure`; an explicitly unsupported envelope version returns `unsupported-evidence-version`. Binding failures use fixed agency/contract/revision/attempt/snapshot/artifact/manifest/party codes. Identical repeated reference IDs return `duplicate-evidence-reference`; conflicting records sharing an ID return `conflicting-evidence-reference`. Missing audit acceptance rejects structurally; inconsistent before/after revisions return `audit-revision-mismatch`. Errors contain no raw evidence, identifiers or exception messages.

Local bounds: opaque reference/version tokens contain 1–128 ASCII letters/digits/dot/underscore/colon/hyphen and start with a letter or digit; external operation claims contain 1–512 characters with no controls or surrounding whitespace; digest encodings contain at most 2,048 characters and must match their declared hex/base64 syntax. UUID syntax rejects the nil UUID. These are deliberately bounded offline codec choices, not a provider interoperability contract or identifier-authentication mechanism. Revisions are positive safe integers, with an independently checked safe consecutive claimed audit revision. Strings/digests are neither trimmed nor normalized.

## Verification results

Verified 2026-11-21 UTC:

- Tests were written first; the initial focused run failed because the new module did not exist. After implementation and additional adversarial coverage, **73 focused tests PASS**.
- Full rental suite: `npm run test --workspace=@contratpro/web -- src/rentals` — **725 PASS in 19 files**, including existing lifecycle, PDF, snapshot, template and pagination regressions.
- TypeScript: `npx --no-install tsc --project apps/web/tsconfig.json --noEmit --incremental false` — PASS.
- Targeted ESLint using the web config with `--max-warnings=0` — PASS. Existing Next pages-directory informational notice remains.
- `git diff --check` and explicit UTF-8/trailing-whitespace checks on the three new files — PASS. SHA-256 comparison with the existing pre-edit source baseline confirms all **165 existing source/test/preview files unchanged**.

Coverage includes missing mandatory fields/audit references, invalid IDs/revisions/versions/digest syntax, renderer/snapshot/manifest substitutions, wrong party/subject/order, broken intermediate/final artifact chains, cross-agency provenance, duplicate/conflicting references, accessor/prototype/sparse-array inputs, every claimed verification status, completed-provider assertions, print/download non-evidence, no clock/network use, detached immutability and continued Signed rejection in every reachable lifecycle state.

No UI, print CSS, renderer, snapshot model, lifecycle or export implementation changed. Browser/PDF generation and preview builds were not rerun for this unintegrated pure module; historical actual-page evidence is not claimed as a fresh PDF check.

## Exact files added and next gate

1. `packages/application/src/rentals/signing-evidence.ts` — readonly reference contracts, decoder, consistency validator and always-denying trust assessment.
2. `apps/web/src/rentals/signing-evidence.test.ts` — synthetic unit/adversarial cases and lifecycle non-activation regression.
3. This report — mapping, rules, blockers and verification.

**GO** for a separately scoped next offline milestone: resolve immutable synthetic referenced records and test substitution/missing-record cases without promoting them to trust. Any canonical hashing implementation first needs an approved encoding/domain/algorithm specification and fixed vectors. **NO-GO** for operational verification, Signed activation, real authentication/capture, provider calls or production. Authenticated identities, actual artifact/proof resolution, cryptographic/time verification and durable authorized audit acceptance remain prerequisites, not supplied capabilities.
