# Check 12 — synthetic Gate 4 deletion and deadline enforcement

OFFLINE IMPLEMENTATION ONLY. Gate 2/3/4 live execution is NOT authorized.
Application provisioning remains OFF; strict remains the selected packet mode.
Logging clearance is BLOCKED; actual Development Admin authority remains UNVERIFIED.

## Small composition surface

`scripts/a02-auth-delete.mjs` exports `createA02AuthDeleter`. Importing it is inert.
It imports no native HTTP client, SDK, default fetch, credential source or CLI runner.
Construction requires `executionMode:'offline-synthetic-only'`, an explicitly injected
**fake** request function, a disposable in-memory Admin provider, and the existing
state evaluator backed by a **synthetic observer**. Do not supply a live observer to
this offline entrypoint. There is no native DELETE adapter or live execution command.
The injected function is a trusted test port, not a network sandbox: replacing it
with real network code would violate this preparation's authorization and contract.
No real credential, session, user or live deletion workflow is prepared or invoked.

The input provider is the existing {provider,dispose} contract. No hidden prompt is
called by this module; no environment/argv/file lookup, key generation or persistence
is added. Factory failure leaves ownership with the caller. Once invoked, the one-shot
operation disposes the provider on success, preflight failure, cancellation and UNKNOWN;
disposal failure cannot yield complete cleanup. Existing strings/copies are not zeroized.
Results contain only fixed outcomes, A/B/U labels and validated local attempt IDs.

## Explicit Gate 4 scope

The synthetic authorization object has exactly:

```text
mode='offline-synthetic-only', gate='4', operation='auth-delete',
projectRef='gllsiklbvqpxzucvkehw', runReference, reference, start, end,
subjects={A,B,U}, operations=[{label,subject,attemptId} for A then B then U],
overallDeadlineMs, requestDeadlineMs, observationDeadlineMs,
ownershipReference, cleanupReference, sourceArtifactSha256,
liveExecutionAuthorized=false
```

All three subjects must equal the existing nominated UUIDs. Each attempt ID is a
distinct UUID, one attempt per ID; no email/bulk/wildcard/unknown fields are accepted
in this scope. Gate 2/3, live authorization, missing identities or mismatches block
before credentials or dispatch. Times must fit the active reviewed run/window;
overall <=30s, request <=7s and independent observation <=20s are mandatory.
An artifact hash/reference is an external review assertion, not a signature or proof
of actual Admin capability. No real authorization/artifact record is fabricated here.

`bindAuthDeletion` is a narrow addition to the existing Option B evaluator. It binds
the exact run, Gate 4 reference, owner reference and independently accepted cleanup
capture. It requires known canonical cleanup, removal, no unresolved UNKNOWN, no
previous deletion, fresh evidence and original fixed subjects. The returned port
has process-local validation lineage; a plain object claiming success cannot supply it.
The port is one-shot per state controller and checks each exact operation in order.
The existing strict factory/reconciler is unchanged and is not a deletion authority.

The injected request receives only one fixed Development DELETE path per nominated
Auth UUID, no request body, no cookies/redirects or SDK preliminary GET. This is a
synthetic protocol adapter; eventual live status/body/Gateway compatibility still
requires separate review. Only empty-object JSON 200 or empty 204 is treated as ACK.
Unexpected statuses, redirects, cookies, URLs, bodies or connection outcomes are UNKNOWN.
ACK is never committed deletion evidence.

## Independent acceptance and UNKNOWN

After each ACK, the existing observer opens its own fresh, guarded read-only capture
for delete-A/B/U, using the already pinned canonical IDs. The state evaluator requires
exact post-delete Auth absence, canonical/reverse-mapping absence, expected remaining
cohort state and no scoped business links. Failed ROLLBACK, stale/cached/forged evidence
or mismatched state cannot confirm success. No additional SQL or mutation contract
is introduced; cleanup.sql.in is unchanged and its administrative bypass/locks/counts
still need separate authority and approval.

Timeout, cancellation, connection loss, malformed response or missing confirmation
returns UNKNOWN after an intent/attempt and freezes subsequent mutation. There is
no retry/resume, compensation, automatic second controller or absence-to-rollback
transition. A later absence capture cannot recertify an ambiguous deletion. Partial
accepted labels stay explicitly partial; cleanupComplete is false unless all three
independent observations pass, with no outstanding UNKNOWN or disposal failure.
Even PASS says only observed exact-cohort cleanup state; requestFinality stays UNPROVEN,
retryAllowed false and liveExecutionAuthorized false. No drain/FINISHED/transaction-ID
claim is made. A new process is not retry authority or proof of backend quiescence.

## Overall deadline and limits

One monotonic operation deadline spans all three requests, body reads and independent
observations. It is clamped to the authorization window and propagated through child
AbortSignals; each step has its own smaller deadline. Both checks and timer setup
must succeed before dispatch. Invalid/backwards clocks, missing/failed timer setup
and deadline disposal fail closed. Parent cancellation and timeout use fixed causes,
never a caller's raw abort reason. Response readers are canceled on expiry.

Tests inject a deterministic monotonic scheduler and advance the synthetic wall clock;
noncooperative fake ports are bounded by Promise races and receive canceled signals.
Default timers use Node timers and performance.now. These are **cooperative JavaScript
deadlines**, not hard process termination: a blocked event loop or hostile injected
port can defeat timing assumptions. No process supervisor/kill mechanism is implemented
or claimed. Client cancellation does not prove backend cancellation or rollback.
Actual runtime/preload/debug/transcription/trust-store and hard overall-deadline
evidence remain independent blockers; no future live clearance follows from tests.

## Evidence and future boundary

Existing synthetic state-stage fixtures are shared in a02-state-fixtures.mjs so the
new tests exercise real observer lineage and Option B guards rather than duplicate
business logic. No fixture represents an actual Development user or authority.
Check 10/11 receipts remain historical; the new offline review records changed bytes.

Still required before any future live proposal: actual Admin capability/custody,
logging/provider clearance, protected runtime and current TLS/target evidence, exact
run/owned-ID/native artifacts, and separately approved Gate 2/3/4 operations. A live
DELETE adapter, if ever requested, requires a new bounded review and authorization;
this module supplies no such entrypoint. Preserve the original five private templates.
