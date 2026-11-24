# Signing provider integration boundary V1

Status: **PROPOSED — DESIGN ONLY**, 2026-11-21 UTC. No provider is selected, contacted, configured or activated. No route, adapter, credential, signature request or webhook is implemented. **Real signing and Production remain NO-GO.**

This boundary implements neither [predicate S](rental-contracts-electronic-signature-architecture-v1.md#predicate-s-the-only-future-authorization-for-signed) nor the [evidence schema](rental-contracts-signing-evidence-schema-v1.md); it specifies future responsibilities and failure behavior.

## Capability and policy prerequisites

A future profile must demonstrate, rather than merely advertise:

- Exact artifact/manifest and assigned-party binding; agency-first/customer-second sequencing; no hidden document re-rendering.
- The selected identity/authentication/consent/intent method and its evidence export, reviewed independently for the Moroccan use case.
- Stable operation IDs and client correlation/idempotency semantics, including whether an unknown create result can be looked up without repeating the side effect.
- Authenticated callbacks or equivalent observations, documented duplicate/order/retention behavior, key rotation/revocation and an authenticated read/reconciliation capability.
- Independently verifiable signature, artifact-chain and trusted-time material under an approved profile. Completion status alone is insufficient.
- Cancellation/expiry semantics and race disclosures; evidence retrieval despite delayed callbacks; contractual incident/support/export/deletion/hosting/retention terms.

Unmet mandatory capability blocks selection. “Qualified,” a certificate logo or recognition in another jurisdiction is not an automatic Moroccan legal classification. No provider method is approved by this document.

## Conceptual ports — no public API design or implementation

| Port / owner | Input and responsibility | Output is not |
| --- | --- | --- |
| Prepare intent / application | Authenticated actor/scope, immutable package, party plan, expected revision, idempotency/fingerprint | A request already sent or a signature |
| Dispatch / restricted integration worker | Durable authorized operation, pinned profile/account, exact artifact and challenge refs | Authority to alter content, parties or lifecycle |
| Observe receipt / adapter | Provider acceptance/rejection/unknown result with authenticated provenance | Verified signer consent or Signed |
| Authenticate observation / inbox gateway | Raw body and covered request metadata under a configured verification profile | Final evidence acceptance |
| Reconcile / restricted read worker | Known operation/client correlation scoped to the configured provider account | Permission to create another request after uncertainty |
| Retrieve evidence / restricted fetcher | Approved operation and allowlisted storage origin; bounded bytes | A trusted arbitrary callback URL or safe document by default |
| Verify evidence / independent verifier | Immutable package/chain plus identity, consent, intent, time and trust material | A direct callback-triggered state write |
| Commit decision / lifecycle authority | Authenticated complete verifier decision, current attempt fence and revision | Permission for a browser/provider to set Signed |

Credentials remain server-side in a managed secret/key system with least privilege, environment separation and rotation. A simulation identity can never obtain operational credentials. Provider account/workspace + operation IDs are namespaced; map them to agency/contract/attempt from stored trusted bindings, not an `agencyId` supplied by a callback. Platform privileges and agency privileges remain separate.

## Idempotent request creation

1. Authenticate and authorize the operator and exact agency/contract scope. Validate current policy, immutable package, assigned party/order, request fingerprint and active attempt conditions.
2. Look up the supplied idempotency key **within the authorized scope**. If an exact matching intent already exists, return its original accepted receipt plus a separately labeled current-status read, without another state change/dispatch. Different payload, actor binding or scope with the same key rejects. Do not disclose another tenant's receipt.
3. For a new intent, check expected revision and allowed state. Consistently retain the command receipt, intent/session `prepared`, lifecycle revision/audit event and durable dispatch work. Failure to retain them must not be reported as a provider request.
4. A dispatch worker claims work with a concurrency fence/lease and checks authorization/attempt eligibility again. Use the stored provider idempotency/correlation value and payload digest exactly; never invent a new key on timeout.
5. Persist account/operation/party IDs and authenticated request-result material. A receipt means only what the provider actually attests: accepted for processing, confirmed rejection, or unknown. Never call accepted/dispatched “signed.”

Exactly-once external effects cannot be assumed. Dispatch leases do not solve a timeout after a provider accepted the request. Only documented provider semantics and reconciliation can establish whether it happened.

Create the agency-person operation first. Only after its evidence is independently verified and its intermediate artifact frozen may an explicit eligible continuation dispatch the customer operation against that artifact. Preserve both operation IDs; a generic envelope “complete” is not a substitute for per-party evidence/order verification.

## Callback authentication and durable admission

Define a provider-specific, reviewed message-authentication profile before opening any future receiving boundary. It must bind the raw body or an authenticated body digest, event identity, relevant target/method/context and delivery freshness/nonce metadata. Pin approved algorithms and configured keys/trust anchors; compare MACs safely where used. TLS/mTLS and IP restrictions may add controls but do not substitute for message authenticity, replay checks and tenant/operation binding.

HTTP Message Signatures is one possible standards-based profile, not an assertion that any provider implements it. [RFC 9421](https://www.rfc-editor.org/rfc/rfc9421.html). A proprietary profile must meet equivalent explicitly reviewed requirements; do not guess its signed components or use a generic JSON normalization that changes the authenticated bytes.

Before admission:

- Enforce byte/type limits and parse only after authenticating the required bytes/metadata. Bound decompression and document processing; do not invoke active document content or follow supplied URLs.
- Resolve key IDs only through configured, approved trust material. Never fetch a key/certificate from a callback-controlled URL. Rotation has an explicit overlap/expiry/revocation policy; unknown/revoked keys quarantine or reject, never fail open.
- Check delivery freshness and replay protection under the approved profile. Delivery time is separate from the original signature-event time: a legitimate delayed event may arrive in a new authenticated delivery, but old timestamps alone cannot replay an old request. Exact bounds must be approved for the selected profile; missing policy fails closed.
- Authenticate **before deduplicating** so an attacker cannot reserve a genuine event ID with forged content. Deduplication scope includes provider account/environment + operation + event identity. Same ID/different authenticated payload is a security discrepancy, not a harmless duplicate.
- Map the stored operation to agency/contract/revision/attempt/party and check all bindings. Unknown IDs remain unbound observations for controlled reconciliation, with generic responses and no tenant disclosure/fallback.

Retain a validated observation durably, with encrypted raw evidence where justified and a digest, authentication disposition/key version and trusted receipt metadata. Acknowledge successful admission only when it is durably recoverable under the chosen protocol. A storage outage must not cause an acknowledgement implying durable acceptance followed by silent loss. Provider redelivery behavior belongs in the profile and fault tests.

The gateway cannot mark Signed. It may have proven that a configured provider sent a message; it has not proved the person's consent, correct document, valid signature or trusted capture time.

## Duplicates and out-of-order facts

Treat observations as facts to validate, not imperative commands. Event timestamp ordering, arrival ordering or a “last status wins” update cannot determine the lifecycle.

| Situation | Required handling |
| --- | --- |
| Exact authenticated duplicate | Reference prior observation/receipt; no duplicate dispatch, verification acceptance or revision increment |
| Same event ID with different bytes | Preserve discrepancy, quarantine, alert; do not replace prior facts |
| Customer completion appears before expected evidence | Resolve stored operation and ordered artifact chain; no acceptance until the agency proof/order is verified |
| Completion after expiry/cancellation/revision supersession | Retain raw evidence for the original attempt; enforce local fence; never apply it to a new revision |
| Old failure after a completed operation | Link to its source/version; do not overwrite accepted evidence by arrival order; hold contradictions for reconciliation |
| One of two required signatures verified | Remain Pending with explicit partial status; no aggregate Signed |
| Second distinct capture for the same party | Deduplicate only if genuinely identical; conflicting proofs remain preserved/quarantined, not silently substituted |

Partial proof from an abandoned attempt is not recycled into a new attempt or revision. If a future business policy proposes reuse for unchanged content, it requires separate legal/security review and explicit new binding rules; this design defaults to new intent/consent/challenges.

## Timeout, cancellation and failure policy

| Outcome | Operation/session handling | Lifecycle consequence |
| --- | --- | --- |
| Confirmed not-dispatched rejection | Retain reason/receipt; an explicit new eligible command may be considered | No signing success |
| Accepted request | Store authenticated operation ID; observe/reconcile | Still Pending |
| Timeout / connection loss / malformed result | Mark uncertain/reconciling; retain original key/fingerprint and any known operation ID | Never infer success or rollback |
| Unknown operation ID after create | Read lookup by supported client correlation/account; if unavailable, escalate and block automatic resend | Do not create a second possible request |
| Partial provider outage | Fence writes as necessary, expose degraded/unknown status; bounded read-only reconciliation | No weaker method or automatic Signed fallback |
| Explicit cancel | Close local eligibility fence consistently, retain intent/audit; provider cancellation is a separate uncertain-capable operation | Late external evidence cannot authorize a new revision |
| Expiry / confirmed failure | Retain terminal substatus and evidence; stop eligible dispatch/acceptance | No automatic new attempt or Signed |
| Lost/delayed webhook | Bounded authenticated read-only reconciliation using stored IDs; same verifier as callback path | Absence of a callback is neither success nor proof that nothing happened |

No automatic write retry after an ambiguous result. A read-only reconciliation schedule can be bounded/backed off and audited; it cannot silently create, restart, resend or replace an intent. A manual retry/reconciliation decision must preserve the original intent/key when resolving that operation, and must not make a conflicting duplicate look new.

Local cancellation/supersession fences protect application acceptance even when provider cancellation fails or times out. They do not erase an already captured signature's possible legal effect. If trusted ordering cannot resolve capture vs cancellation/revocation, hold the record for review rather than choose a convenient timestamp.

If contradictory/compromised evidence appears after a Signed commitment, append a discrepancy/reverification disposition and suspend reliance/automatic downstream use. Preserve the historical decision; do not silently delete it, declare a new legal result or let a provider status callback overwrite it.

## Evidence retrieval, independent verification and audit

Retrieve artifacts only through configured accounts and allowlisted origins with size/media restrictions, no arbitrary redirects or metadata-service access. Quarantine untrusted files and verify digests/format in an isolated, resource-bounded verifier. Pin the exact package, agency-first/customer-second chain and allowed cryptographic changes. Inspect trust/certificate/revocation material at the required capture time and validate the approved time proof; unavailable status means not verified.

Store enough source/verification material for later review and export without relying solely on the provider dashboard remaining online. Encrypt by appropriate tenant/access boundary; segregate raw identity/signature material from general logs. Key custody, retention, provider subcontractors/international transfers and deletion/hold obligations require approval before real data leaves ContratPro.

Use the [existing audit-event envelope](rental-contracts-future-audit-event-contract-v1.md) to distinguish prepare, dispatch attempt, receipt, raw observation, rejection/quarantine, verification decision, cancellation, reconciliation and applied state change. Only the last verified consistent commit may establish the internal Signed state. Operational metrics must not turn provider latency/timeouts into inferred signatures.

## Required offline fault tests before a later sandbox proposal

Test a fake port with no external calls: accepted-but-response-lost; request not sent; unknown ID; duplicate delivery; same ID/different bytes; invalid/old/rotated/revoked key; old delivery vs delayed event; missing agency proof; customer-first capture; one party only; cancelled/superseded generation; stale expected revision; record/outbox/inbox failure; lost webhook recovered by read observation; read lookup unavailable; conflicting cancellation/completion; evidence/artifact substitution; unavailable trusted time; renderer content change; duplicate worker lease and duplicate verifier decision.

Every test must assert no accidental Signed state, no silent replacement key, no lost uncertainty and no cross-agency artifact/evidence access. A mock provider/verifier success remains explicitly synthetic and cannot pass into an operational state machine.
