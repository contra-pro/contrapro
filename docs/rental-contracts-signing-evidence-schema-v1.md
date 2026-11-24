# Signing evidence schema proposal V1

Status: **PROPOSED — DOCUMENTATION ONLY**, 2026-11-21 UTC. No schema, capture interface, audit record, timestamp or signature is implemented or populated here. **Real signing and Production remain NO-GO.**

This proposal supplies the evidence required by [architecture predicate S](rental-contracts-electronic-signature-architecture-v1.md#predicate-s-the-only-future-authorization-for-signed). It extends, rather than replaces, the [future audit-event envelope](rental-contracts-future-audit-event-contract-v1.md).

## Type and trust rules

- All IDs below are opaque references scoped by agency and document revision; they are not example IDs or real subjects.
- Digests carry algorithm, encoding, canonicalization/domain version and value. Proposed baseline SHA-256 requires fixed vectors and versioning before implementation.
- Instants carry source/provenance and precision. Missing values remain unknown; no browser clock or placeholder may fill a required signing instant.
- A timestamp records what its source can attest. `receivedAt` is a receipt observation; `verifiedCaptureTime` requires separately validated, bound time evidence.
- Client commands and provider claims never accept a trusted `verified`, `consented`, `signed` or `legalValidity` boolean. Trusted dispositions belong to authenticated internal verification records and reference their source evidence.
- Every entity has its own schema version, immutable identifier, agency/contract/revision binding and integrity/access-control metadata. Reverification produces a new disposition referencing earlier records; raw facts and earlier decisions are not rewritten.
- Evidence does not mutate the frozen snapshot's historical `signatures` placeholders or upgrade simulation envelopes to operational records.

## 1. Immutable signing package

| Field group | Proposed fields | Validation / purpose |
| --- | --- | --- |
| Identity | `packageId`, `mode`, `agencyId`, `contractId`, `documentRevisionId`, `aggregateRevisionAtFinalization` | Operational mode requires a separately approved authoritative projection, not changed demo flags |
| Presentation | `snapshotSchemaVersion`, `operationalProjectionVersion`, `snapshotRef`, `snapshotDigest` | Preserve V1/untagged-V1/V2/V3 read semantics; a separately approved operational projection is required, not relabeled demo data |
| Rendering | `baseArtifactRef`, `baseArtifactDigest`, `mediaType`, `byteLength`, `rendererVersion`, `templateVersion`, `fontAssetManifestRef`, `locale` | Bind the exact stored, reviewed PDF and renderer/assets; reject substituted or truncated artifacts |
| Manifest | `manifestRef`, `manifestDigest`, `canonicalizationVersion` | Covers all content/identity/rendering/party/policy bindings |
| Required parties | `partyPlanRef`, `partyPlanDigest`, ordered `partyInstanceId` list | Agency natural-person representative first, customer second; no omission or implicit secondary-driver signer |
| Policies | `signingPolicyVersion`, `authenticationPolicyVersion`, `consentPolicyVersion`, `verificationProfileVersion`, `approvedUseCaseRef` | Approved immutable policy references; missing/unapproved profile blocks use |
| Revision lineage | `supersedesDocumentRevisionId`, `supersessionDispositionRef` | New content means a new package; old evidence remains historical |

Canonical values must preserve exact conditions/footer text, driver/vehicle identities, amounts and settings. A PDF digest is not the data-snapshot digest. A visually identical re-render is not necessarily the same artifact. Neither digest is itself a person's signature.

## 2. Required-party binding

| Fields | Required interpretation |
| --- | --- |
| `partyInstanceId`, `partyRole`, `sequenceIndex`, `required` | A fixed instance in the finalized plan, not just “some customer” |
| `subjectRef`, `identityVerificationRef`, `identityAssuranceProfile` | The verified person; an email address, identity-number field or invitation is not sufficient |
| `customerRecordBindingRef` or `agencyRepresentationRef` | Customer association or separately verified authority to represent the agency |
| `authorityVersion`, `authorityEffectiveIntervalRef`, `revocationDispositionRef` | Evidence of authority at capture and any later relevant restriction/compromise |
| `planVersion`, `manifestDigest` | Replacement/reordering changes invalidate the old pending plan |

The authenticated operator preparing a request is recorded separately. An Owner requesting a signature is not automatically its agency signer. A provider seal may establish an organization's origin/integrity under a reviewed profile but is not silently substituted for the assigned person's signature intent.

## 3. Signing attempt and one-use authorization

| Fields | Constraint |
| --- | --- |
| `signingSessionId`, `attemptId`, `attemptGeneration`, `packageId`, all package digests | One attempt against one immutable package/plan |
| `preparedByActorRef`, `authorizationDecisionRef`, `expectedAggregateRevision` | Trusted current authorization, not caller-provided agency/role assertions |
| `idempotencyKey`, `requestFingerprint`, `commandReceiptRef` | One intent; same key/different payload rejects; repeated identical key returns the authorized receipt |
| `substatus`, `eligibilityFence`, `supersededByAttemptRef` | Prepared/dispatched/partially-verified/reconciling/failed/cancelled/expired/superseded/complete; non-eligible attempts cannot authorize Signed |
| `expiresAt`, `expiryPolicyVersion`, `closureDispositionRef` | Future authority-defined values with provenance; not generated signing instants |
| `methodProfileRef`, optional `providerBindingRef` | Providerless methods require their own separately approved verifier/device profile; optional provider metadata does not make core evidence optional |

Separate challenge records bind `purpose` (consent, signature intent or capture), party, subject, package/manifest, attempt generation, current authorization permit, nonce digest, issued/expiry source and consumed/closed disposition. They are single use for the named purpose and cannot be replayed across parties, agencies, revisions, sessions or actions. Reauthentication/recovery cannot revive a revoked challenge. GET/link preview is not challenge consumption.

## 4. Identity and authentication evidence

| Fields | Constraint |
| --- | --- |
| `identityVerificationRef`, `subjectRef`, `proofingMethodProfile`, `proofingSourceRef`, `assuranceDispositionRef` | Proofing fact and its verification, not a mutable client “KYC passed” flag |
| `authenticationEventRef`, `authenticationMethod`, `authenticatorAssuranceProfile`, `verifierRef` | Approved method bound to the proven subject; channel possession distinguished from identity |
| `authenticationInstant`, `timestampSource`, `sessionBindingRef`, `reauthenticationRef` | Sufficient freshness at the sensitive action, with protected session provenance |
| `authorizationPermitRef`, `membershipOrRepresentationVersion`, `revocationCheckRef` | Valid agency/contract/party authority at capture; roles are not signer identities |
| `recoveryDispositionRef`, `compromiseDispositionRef` | Recovery/compromise cannot silently weaken the policy or erase prior facts |

Do not store authenticator secrets, passwords, OTP values or private signing keys in evidence/audit payloads. Evidence refs need access-controlled verification, not arbitrary external URLs. Routine session expiry and subsequent compromise are distinct facts; assess historical capture validity and current reliance separately.

## 5. Explicit consent receipt

| Fields | Constraint |
| --- | --- |
| `consentReceiptId`, subject/party/attempt/package bindings | Exact person, purpose, package and active attempt |
| `approvedConsentTextRef`, `approvedConsentTextDigest`, `locale`, `consentPolicyVersion` | Exact reviewed wording shown to the signer; this proposal supplies no legal consent text |
| `presentedManifestDigest`, `presentedArtifactDigest`, `presentationObservationRef` | The content made available; delivery/display is not proof of reading or comprehension |
| `consentActionRef`, `consentChallengeRef`, `authenticationEventRef`, `authorizationPermitRef` | Separate affirmative action; no prechecked acceptance or inference from opening/scrolling/downloading |
| `actionObservationRef`, `observationSource`, `receiptIntegrityRef` | Authenticated record of the action and binding; not by itself a signature/time proof |

Consent to contractual terms, assent to electronic signing and any privacy processing/transfer permissions have different purposes and must not be collapsed into a generic checkbox. The privacy assessment determines the applicable basis; a contractual consent receipt is not blanket permission for unrelated processing.

## 6. Signature-intent receipt and capture evidence

Signature intent explicitly authorizes execution of the approved method for this exact party/package/attempt. Its receipt includes `intentReceiptId`, `intentPolicyVersion`, approved intent-text reference/digest/locale, consent receipt, authentication/authorization refs, challenge purpose and digest, manifest digest and exact input-artifact digest. An operator's “request signature” action is not this receipt.

The capture proposal contains:

| Field group | Proposed fields / requirement |
| --- | --- |
| Identity/binding | `captureId`, `partyInstanceId`, subject, agency/contract/revision/attempt, manifest/party-plan digests, intent/challenge refs |
| Method | `methodProfileRef`, signature format/algorithm identifiers, key/certificate or equivalent verification-material refs required by that profile |
| Artifact chain | `baseContentRootDigest`, `inputArtifactDigest`, `outputArtifactDigest`, prior accepted capture/verification ref |
| Raw proof | Immutable `sourceSignatureEventRef`, `signatureEvidenceRef` and digest; a signature image or pasted mark is not automatically a valid proof object |
| Time | `trustedTimeProofRef` and an untrusted claimed capture time if supplied, clearly separated |
| Provenance | Provider-operation/evidence ref when applicable; otherwise approved direct-device verification provenance |
| Status | Raw observation only until an internal verifier disposition is issued |

For the agency capture, the input is the approved base PDF. For the customer capture, it is the frozen, already verified agency-signed artifact. Preserve exact input/output byte digests and permitted incremental-update validation. Changes to contract content, provider re-rendering or a broken preceding signature fail the binding check.

## 7. Trusted time and provider evidence

`TrustedTimeProof` proposes `timeProofId`, `authorityRef`, `timeProfileVersion`, asserted instant/precision, signature/artifact digest binding, immutable raw proof ref/digest, trust-anchor/key/certificate refs, validation-material refs and `verificationDispositionRef`.

The selected profile must verify a time assertion bound to the signature/artifact. It may require a timestamp authority token or another specifically reviewed authenticated trust-service time proof. A provider JSON date, receipt time, JWT `iat`, browser time or PDF metadata date does not pass automatically. Missing or unavailable proof remains pending/quarantined; it is not replaced with “now.” No qualified timestamp/signature claim is made without separately verified applicable requirements.

Provider evidence, if applicable, records the configured provider/profile/account/environment, stored operation and party identifiers, client correlation/idempotency refs, raw authenticated observation refs/digests, provider evidence-package/artifact digests, key/certificate provenance and independent verification report. A provider `completed` status is a claim to examine, not the trusted disposition. See [the boundary](rental-contracts-signing-provider-boundary-v1.md).

## 8. Verification decision and acceptance receipt

Only an authenticated internal verifier can issue a decision record. The lifecycle service must verify that record's authenticity and exact bindings; it does not trust a report simply because the payload says `valid`.

| Fields | Requirement |
| --- | --- |
| `verificationDecisionId`, `verifierIdentityRef`, `verifierVersion`, `verificationProfileVersion`, integrity/authenticity reference | Named trusted issuer and reproducible evaluation basis |
| Package/attempt/party/evidence IDs and digests; artifact-chain digest set | Exact complete input set; evidence substitution changes the decision inputs |
| `checks` and per-check report refs | Identity, authority/authentication at capture, consent/intent, challenge/replay, artifact integrity/order, signature validity, trusted time, applicable trust/revocation and current eligibility fence |
| `disposition`, fixed reason codes, unresolved facts | Proposed/pending, verified, rejected, quarantined or later invalidated; absent checks never count as verified |
| `verifiedAt`, `recordingTimestampSource`, trust-material/policy versions and revalidation policy | Verification time is not signing time; retain validation material needed to reproduce the result |
| `replacesDecisionRef`, `relianceDispositionRef` | New assessments append; compromise suspends reliance without rewriting history |

The aggregate acceptance receipt binds all required party decisions, final artifact, package/attempt, exact aggregate revision before/after, idempotency/fingerprint, authority commit and applied audit-event ref. It is created only if every predicate-S condition passes. Per-party partial success never becomes aggregate Signed.

A certificate-specific check may be inapplicable only under an explicitly approved alternative profile; this cannot waive core identity, consent/intent, binding, integrity or trusted-time requirements. Unsupported methods and unknown trust are not success.

Useful rejection families include tenant mismatch, demonstration-only input, stale/superseded revision, unapproved policy, missing identity/authentication/consent/intent, revoked authority, challenge replay, hash/party mismatch, invalid artifact chain, untrusted time, partial evidence, uncertain operation, unsupported method and unavailable trust. Return fixed codes, not raw provider errors or personal data.

## 9. Legal assessment and non-evidence

Keep use-case legal/privacy assessment references separately versioned from technical verification. No software `legallyValid: true` field is proposed. A technical Verified/Signed result does not adjudicate enforceability or every contractual formality. A later legal review must not rewrite captured facts.

The following are explicitly non-evidence for the final transition: printing/saving/downloading, pressing a lifecycle/request button, link possession, document delivery/read telemetry, authentication alone, a checkbox alone, a visual mark alone, an organization logo/seal standing in for a person, provider success text, an audit receipt timestamp, missing/null evidence and simulation verification fixtures.

## Offline conformance cases for a later milestone

Use clearly tagged synthetic structures only, not asserted real consent or signatures. Missing required groups reject; actor/party swaps reject; one-byte artifact/text changes reject; large bigint and historical versions encode without loss; stale/superseded attempts reject; pending/untrusted time never passes; reversed agency/customer chain rejects; a replay cannot create a second accepted receipt; partial parties cannot complete; a rejected/invalidated disposition cannot be presented as currently verified. A mock verifier's success is never admissible to an operational transition.
