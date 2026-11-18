# Check 7 — offline Option B implementation

IMPLEMENTED OFFLINE ONLY. Gate 2 is BLOCKED and UNAUTHORIZED. Provisioning stays OFF.
The real execution packet selects `strict`. Check 8 records the operator's policy-only
approval in `option-b-policy-approval.json`, bound to the exact proposal SHA-256.
Its source is operator-reported, approval time UNVERIFIED, with no independent
attestation. It grants no live operations, logging clearance or execution approval.
The original PROPOSAL is retained as the design/history and B01–B28 specification.

## Explicit composition

`createA02Acceptance()` in `scripts/a02-state-acceptance.mjs` defaults to the existing
`createA02Reconciler`; strict terminal imports/transaction guarantees are unchanged.
Choose `mode:'state-based-v1'` explicitly with a separately reviewed state policy and
the existing independently connected observer. There is no fallback from strict.
For offline packet evaluation, an operator may explicitly change the mode in a
review copy while preserving the recorded `statePolicyApprovalReference`. Policy
approval alone does not supply a run policy: missing runtime bindings and independent
controls still produce BLOCKED. Do not instantiate a live observer or enter credentials.
The approval reference uses the fixed record path plus `#sha256:<actual hash>`;
the validator reads only that fixed local file, verifies its bytes/manifest binding,
and checks the approved proposal hash and policy-only schema. A hash is integrity
evidence, not a signature, independently attested authority or approval timestamp.

The state policy fixes Development project, nominees, run/window, five exact attempt
UUIDs (A/B/U create then A/B provision), approved artifact hashes, policy/execution
approval references, observer reference, semantic wrapper definition/ACL fingerprints,
logging evidence and eight separately reviewed control receipts. No defaults supply
any missing live receipt. The five intent IDs are local correlation, not provider
request IDs. A code caller supplying review strings is an operator trust boundary,
not independently established authority. Actual reviews must exist outside the code.

`assessA02StatePolicy` reports every missing independent control. The packet validator
additionally binds the policy to the actual packet run, times, approval and logging
record. Even a perfect synthetic policy cannot authorize the real packet. Strict
terminal bindings are replaced only for a fully bound explicitly selected state policy;
logging, runtime, Admin authority and the actual state-source review stay independent.

## Existing ports, no new mutation runner

1. Create the existing observer with explicit state-mode observation approval:
   `acceptanceMode:'state-based-v1'`, `statePolicyReview`, `gate2Approval`, and,
   only when separately approved, `gate3Approval` / `gate4Approval`. Its original
   logging assessor, pinned PostgreSQL route/CA, guards, fresh read-only transactions,
   deadlines and successful ROLLBACK remain mandatory. Import opens no connection.
2. Pass the original observer's baseline capture to `initialize`; absence must be
   exact and fresh (20s). Following known native installation, pass the independently
   reviewed `post-install` capture to `installation`. Review includes exact native
   history, rendered semantics/ACL/expiry and original controls. The observer's
   pg_get_functiondef/ACL fingerprints must match the **same representation** reviewed
   by the policy; never compare migration SQL bytes with pg_get_functiondef bytes.
3. Capture private UUID/email absence once after installation; `collisions` binds its
   30s freshness. Continue using observer.absenceCheck in the existing Auth creator.
4. Inject this state instance as the optional `stateAcceptance` port of
   `createA02AuthCreator`. Each unchanged payload is preceded by a bounded sequential
   intent; matching transport ACK is recorded after response validation. Any incomplete
   attempted phase freezes state. Stop the one-shot creator; a new instance cannot
   resume/replay against this ledger. A second state controller for the same run is
   also rejected process-wide; no reset API is exported. Capture `after-auth` once and call `accept('auth',
   capture)` before any provisioning. Three ACKs alone remain UNKNOWN.
5. Inject the same state instance into `createFixtureProvisioner` and supply its
   `confirmMapping` port. The existing independent observer still owns the 2s mapping
   confirmation and original payload/session checks. The state port accepts after-A
   before B, pins canonical IDs, and rejects drift. Unexpected `existing` enters
   UNKNOWN; idempotency does not permit retry. U cannot provision.
6. After accepted A/B state, use the reviewed native removal procedure immediately.
   `lifecycle` accepts a separately reviewed native outcome and post-removal capture;
   no native command or SQL is issued by the state evaluator. Unknown installation
   remains a special barrier. Timeout/unknown removal requires existing native recovery,
   never wrapper-absence inference or history repair. Rejected DROP requires a separate
   independent native rollback review before the separate disable branch is considered.
   The evaluator deliberately cannot certify disable from an ACK; use the existing
   native ACL/history verifier. Expiry is not removal. A frozen fixture allows only the
   explicitly bound containment approval; containment never claims cancellation/drain.

These are offline interfaces, not an operator execution command. No automatic live
composition is installed or selected. An intent PASS means scope validation only,
never permission for an otherwise unauthorized write.

## Evidence and UNKNOWN recovery

Every public result separates status PASS/FAIL/UNKNOWN/BLOCKED, scope/reason,
transport observation, requestFinality UNPROVEN, retryAllowed false and
liveExecutionAuthorized false. Results never manufacture COMMITTED/ROLLED_BACK,
FINISHED, provider transaction/request IDs or a drain claim.

Observer captures are immutable, hashed, exact target/run/checkpoint/time/rollback
records. State mode requires process-local provenance from the existing observer,
not JSON supplied by an executor or a recomputed hash. `receiptFor` returns the
original capture for composition; `evidence()` still returns review copies. Copies
are not executable evidence. This lineage is not a signature or a tamper-proof audit
service. There is intentionally no unreviewed file-to-lineage importer. Independent
database sourcing remains a property of the reviewed client factory/connection;
synthetic factories in tests do not prove that property live.

Capture budgets: six normal checkpoints plus one private collision transaction.
Strict recovery remains one `reconcile-auth/A/B` slot. Explicit state recovery adds
only `reconcile-{auth|A|B}-{1|2}`, max six total, fresh transaction each, 20s each,
>=1s gap and <=45s pair, within the fixed window. Mapping normal captures retain 2s.
Failed/canceled slots are consumed; no polling, retries or deadline extension.
The engine's `recover` has no write capability. Two absent/changing observations
remain UNKNOWN. Two exact stable positive observations remain UNKNOWN until explicit
`project owner` adoption referencing those captures and acknowledging unproven
finality. Adoption is fresh, one-shot, accepts only the stage effect and retains the
freeze/late-write cleanup barrier. There is no continuation/resume API.

The intent ledger is memory-only, fixed-schema, append-only per instance. Its snapshots
are frozen copies with no private emails, headers, credentials, sessions or canonical
IDs. Capture canonical IDs belong only in the existing owner-only private evidence
destination. No private files are written by these modules. For an approved future
run, the operator must separately capture/review the ledger and observer manifests
through the already reviewed destination; a process restart cannot reconstruct or
resume this state automatically. Exclusive cohort/wrapper control remains an owner
operational assumption, not cryptographic exclusivity.

## Gate 3 evidence

`isolation` wraps the existing Category A observer, not an administrative mapping
shortcut. It prebinds exact A/B/U sessions/canonical IDs; existing <=60s verification
and >10s expiry checks run before GET. Exactly three existing pinned auth-access GETs
are permitted, one invocation, no login/refresh. Wrong A/B pair or unexpected U is FAIL.

A fresh (<=2s) post-removal capture can supply the before snapshot; otherwise the
separate Gate 3 read approval must include `isolation-before`. `isolation-after` is
always required. The existing fixed cohort SQL/security checks are reused. Gate 3's
observation approval covers at most two additional read-only transactions.

`readIndependentTransportReview` is a separately reviewed read-only capture source,
not executor request logs. It has a 2s import deadline, no retries, and returns only:
projectRef, runReference, sourceReviewReference, startedAt, endedAt, requests, sha256.
The source review must equal policy.gate3TransportReview. The capture covers the exact
GET window, is fresh and not future-dated. requests must be exactly three fixed-schema
entries {method,url,label,subject}, pinned GET URL and A/B/U order. SHA-256 covers the
other six fields in JSON insertion order. No headers/body/tokens are accepted.
The caller must independently obtain and review that source; the schema/hash does not
authenticate its truth. A constant `noDataChanges:true` callback cannot satisfy it.
Only both fresh state snapshots plus this independently reviewed request capture
allow the existing observer's confirmation port to return noDataChanges:true.
This means scoped stable cohort/security state plus the reviewed three-request trace,
not global/transient no-writes or agency/client RLS acceptance. If no such source is
available live, Gate 3 stays BLOCKED/UNKNOWN.

## Gate 4 evidence, not an automatic cleanup executor

Separate Gate 4 approval, owned exact IDs, no unresolved UNKNOWN, independently
reviewed dependencies/privileged RLS bypass, and existing cleanup SQL transaction/
locks/count assertions remain mandatory. `beginCleanup` requires the independent
`cleanup-before` capture; `acceptCleanup` needs ACK plus `cleanup-after` absence.
Optional Gate 4 observer captures add one fixed parameterized read-only summary:
exact two canonical IDs' row count and reverse mapping count. This catches lingering
canonical rows even when subject mappings are gone; there is no population scan.
The summary is a scope check, not a replacement for cleanup.sql.in's structural guards.
The separately approved cleanup read budget is one before/one after plus at most
`delete-A/B/U` once each (20s per transaction, existing SQL timeouts/ROLLBACK).

`beginDelete`/`acceptDelete` evaluate at most one exact Auth deletion per ID only after
known cleanup. They issue no Admin DELETE and do not expand the existing create-only
Admin transport. Gate 4 needs its separately approved executor/operation IDs and
before/after observation scope; Gate 2 cannot delete. Cached SDK pre-delete user is
not post-delete evidence. Unknown deletion + absence remains UNKNOWN, never retry.
Recreation detected at a later observation is FAIL. State adoption never itself
permits cleanup while retained creation/provisioning uncertainty could complete later.

## Limits and remaining approval

The existing 28 proposal scenarios are exercised with fake SQL clients, HTTPS ports,
clocks and synthetic sessions. These tests demonstrate adapter behavior, not actual
transaction rollback, live Auth Gateway/RLS, grants, logging clearance or credentials.
Native disable/removal finality remains with existing independently reviewed native
procedures, not an invented source in this module. The strict finality exporter is
still unavailable; Option B deliberately makes a narrower committed-state claim.

Remaining live prerequisites: logging clearance (reported parameter length -1 is
not clearance), verified TLS/target/20s inspection/credential transport, actual Admin
authority and protected runtime, ownership, run/window/expiry and artifact bindings,
real independently sourced observations/request capture, final run-policy/budget
review and separately scoped Gate 2, Gate 3 and Gate 4 approvals. Check 8's policy/risk
decision does not discharge these prerequisites. No evidence or
approval is inferred from tests, source hashes, or implementation approval.
