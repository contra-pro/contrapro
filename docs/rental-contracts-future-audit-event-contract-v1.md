# Future contract audit-event contract V1 — design only

**No event producer, event store, signing integration or audit events are implemented by this document.** No actor identities, timestamps, consent or signature evidence have been manufactured. Current lifecycle records remain offline simulations with `signingEvidence: null`.

This contract is a proposal for future architecture review. It is not a legal-validity claim, a database schema, a migration or authorization to enable Signed.

## Trust boundary

An authoritative audit writer must obtain actor identity, agency membership and permissions from an authenticated boundary, not browser props, a selected agency, an Owner/Staff label or caller-supplied strings. The current simulated context contains a role and agency ID, **not an authenticated human identity**; it cannot populate an authoritative event by inference.

Simulation records must remain explicitly distinguishable from authenticated operational events. If any future simulation log permits an unknown actor or time, those values must remain unknown and unverified, never filled with a fake UUID or a local-clock signing instant. This phase emits neither kind of log.

## Event envelope

Field names below specify types and constraints only. They are not populated event examples.

| Field | Proposed type / semantics | Required invariant |
| --- | --- | --- |
| `schemaVersion` | Event contract version | Explicit, independently versioned from document V1/V2/V3 |
| `eventId` | Opaque unique event identifier | Assigned by the trusted writer; immutable; not a contract number |
| `mode` | Simulation or authenticated operation | Simulation must never be promoted to verified evidence by relabeling |
| `actorIdentity` | Stable subject ID, actor kind, authentication reference and role/membership reference at decision time | Authenticated user/service/provider identity for authoritative events; role alone is insufficient |
| `agencyId` | Explicit agency identity | Matches authenticated scope, contract ownership, snapshot settings and document agency; no fallback |
| `contractIdentity` | Agency-scoped rental/contract ID, with optional simulation metadata ID | Identity is the **agency + contract ID** pair; identical rental UUIDs in different agencies remain separate |
| `action` | Closed, versioned action vocabulary | Distinguish requested intent, accepted state change, rejected command and observed provider evidence |
| `recordedAt` | UTC recording instant | From a trusted audit writer; source recorded explicitly; recording time is not signing evidence |
| `timestampSource` | Trusted writer/service receipt or verified provider event, with source reference | Never trust browser time as a signing instant |
| `occurredAt` | Optional source-event instant with provenance/verification reference | For signing facts, only an authenticated and verified source may supply it; missing stays null |
| `previousState` | Last known authoritative state before the operation | Read from the authoritative record, not the caller's stale UI |
| `requestedNextState` | Requested target for a transition, otherwise null | A request is not proof that this state was reached |
| `nextState` | Verified committed state, unchanged state on rejection, or unknown when outcome is uncertain | Do not fabricate Signed or assume rollback after uncertainty |
| `expectedRevision` | Revision supplied with the command, if applicable | Used for concurrency checks; not substituted for the stored revision |
| `revisionBefore` | Observed authoritative revision | Explicitly distinguish it from a stale expected revision |
| `revisionAfter` | Verified committed revision or null if unknown | Increment exactly once for an applied change; unchanged for a confirmed rejection/read/print request |
| `outcome` | Applied, rejected, intent-only, observation or uncertain | Carries a fixed reason code; no raw exception or secret/provider payload |
| `snapshotReference` | Immutable snapshot reference, presentation version and canonical content digest | Binds the exact reviewed data/settings, not the latest live agency settings |
| `evidenceReference` | Nullable opaque reference with evidence kind, source and verification reference | Null for plain signing intent/print request; a non-null reference alone does not establish valid consent or signing |
| `idempotencyKey` | Stable opaque key for one command intent | Scoped to agency + contract + action; validated with actor binding and a canonical request fingerprint |
| `requestFingerprint` | Digest of the exact logical command, expected revision, actor/scope and snapshot binding | Reusing a key with different content must reject; no lossy normalization |
| `correlationReference` | Optional prior command/event or verified provider event reference | Links attempts/reconciliation without rewriting prior events |

## Action semantics

The vocabulary should distinguish at least draft creation/edit, finalization applied, signing intent recorded, transition rejected and print requested. Names for provider dispatch, accepted signing evidence and a Signed state change must remain reserved until separately implemented and verified.

- **Finalization applied:** Draft → Finalized, one revision increment, immutable snapshot reference/digest and simulation-versus-operational mode explicit. It is not consent or legal execution.
- **Signing intent recorded:** Finalized → Signing pending, one revision increment and the same finalized snapshot. In the current phase, this must never be called a dispatched signature request.
- **Transition rejected:** Record the actual unchanged state/revision and the requested target separately. A rejected request for Signed cannot produce an event claiming that the contract was signed.
- **Print requested:** State and revision unchanged. Browser dispatch cannot attest that a dialog opened, a file was saved or a PDF was downloaded. It cannot stand in for signature evidence. A generated artifact, if later independently observed, needs its own digest/reference and provenance.
- **Uncertain result:** Preserve uncertainty and the original idempotency/correlation references. Do not infer a next state, successful dispatch, rollback or signing instant from a timeout.

Repeated user actions are new intents only when explicitly initiated as such. Replays of the same intent reuse the same key and exact fingerprint. Retries after uncertainty require explicit reconciliation/authorization; this design does not introduce an automatic retry loop or replacement key.

## Idempotency, concurrency and event integrity

For a future authoritative implementation, state change, revision advancement and its applied-event record must be committed consistently. A confirmed rejection must not change the contract revision. Duplicate delivery must not create a second state change or contradictory applied event. If an attempt/replay observation is retained, link it to the original outcome rather than pretending it is another applied transition.

Idempotency and expected-revision checks solve different problems: the former identifies one intent; the latter rejects stale state. Neither replaces agency authorization. A previously recorded result must not be disclosed to another actor/agency merely because a supplied key matches.

The authoritative store must provide append-only integrity, access control, retention and a defined reconciliation path. Corrections should refer to prior records rather than silently overwriting facts. Actual concurrency, durability, outbox/dispatch boundaries and recovery procedures require a separate implementation decision; the current in-memory Map does not provide them.

## Exact snapshot/evidence binding

Canonical snapshot encoding must be specified before hashes are relied on. Preserve V1/V2/V3 structure, including untagged V1 semantics, exact conditions/footer/identity text, nullable values and lossless bigint pricing. Do not silently convert historical versions, normalize configured text, round amounts through floating-point numbers or derive signing facts from rental dates.

The data digest and a rendered PDF artifact digest are different facts. Future reproducibility may also require a renderer/template version and font/assets manifest. A print click is not observation of PDF bytes. A simulation ID is not a production number, document digest or signature proof.

Evidence references should resolve to access-controlled immutable records, not arbitrary caller URLs. Store references and verification outcomes rather than raw signatures, full identity documents, tokens or secret provider payloads in general audit metadata. Reference access must independently enforce agency scope.

## Gate before any future Signed transition

The architecture must define verified signer identity for each required party, explicit consent bound to the exact immutable snapshot, authenticated provider-event provenance and replay protection, source-verified signing instants, signed-artifact integrity, and a verifiable audit trail. Actor login alone is not proof of a customer's signature. Recorded audit time alone is not proof of signing time.

Unknown, absent, mismatched or merely asserted evidence cannot authorize Signed. The current implementation intentionally has no evidence-acceptance endpoint, provider adapter, audit-event writer or successful Signed transition.

**GO for design review of this contract. NO-GO for enabling real signing or treating current simulation state as authoritative evidence. Production remains NO-GO.**
