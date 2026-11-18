# A02 independent observer and reconciliation integration

OFFLINE PREPARED. Gate 2 is not authorized. No real session, credential, completion
export or live result was generated. This adapter guide supersedes earlier statements
that absence/mapping/reconciliation code ports were unimplemented; actual live source
and parameter-log reviews remain unbound.

## Fixed composition, no new harness or migration runner

Use `createA02ObserverClientFactory` from scripts/a02-independent-observer.mjs with
the existing verified Development connection's memory-only password supplier and CA
bytes/hash. It uses the existing database package's pg dependency, exact session
pooler host/user/database and explicit peer/hostname validation. There is no default
credential lookup, pool, retry, CLI or import-time connection. The factory enforces
default_transaction_read_only before the first SQL statement. No production route
or caller-selected SQL is accepted.

Construct `createA02IndependentObserver` with that factory, the existing in-memory
A/B/U credential provider and a separately approved read-only observation receipt:
projectRef, runReference, reference, start/end milliseconds (120 minutes),
parameterLoggingCleared:true and parameterLoggingReview. Set recoveryAllowed:true
only if the bounded recovery branch was explicitly approved. That logging assertion
must reference actual reviewed client AND server parameter-log protections; a test
fixture flag is not operational clearance.

The constructor now also requires approval.loggingEvidence to pass
assessA02LoggingEvidence (scripts/a02-logging-evidence.mjs). This includes reviewed
capture provenance, target/TLS/credential-transport safeguards, enforced 20-second
inspection deadline, rollback and provider/runtime/audit clearance. The reported
-1/0/off settings in postgresql-logging-observation.json are observations only and
do not satisfy that contract. Neither the old boolean/reference pair nor a packet
PASS flag bypasses this validation. No setting is changed by the assessment.

Run observeAbsence once immediately before the Auth phase. It uses the existing
three-row parameterized query shape, with exact nominated UUID/email parameters;
no email enters its output capture. Supply observer.absenceCheck directly to the
existing Auth creator. It consumes the exact private run/input binding, <=30s old,
instead of echoing a create response. Do not run an additional duplicate email query.

Supply observer.confirmMapping directly to createFixtureProvisioner. It opens its
own read-only connection after the A or B request and uses the fixed cohort query,
not the RPC response. A requires B still unmapped. A/B canonical IDs must be active,
distinct and separate from Auth IDs, U unmapped and all scoped business counts zero.
Captured mapping output matches the existing contract without changing mutations.

The normal observer budget remains six checkpoint transactions: baseline,
post-install, after-auth, after-A, after-B, post-removal. Call observeCohort for the
first three/last checkpoint; confirmMapping owns after-A/after-B. Each checkpoint
executes the same five metadata SELECTs plus cohort SELECT from cohort-observation.sql,
with one session guard, BEGIN, four SET LOCAL statements and ROLLBACK. No duplicate
manual full snapshot at the same checkpoint. Existing separately approved native
planning/post-removal checks retain their own original budgets.

The adapter checks original RPC denial, absence of temporary installation rights,
wrapper owner/settings/count and exact permitted native history. Captures contain
wrapper definition/ACL fingerprints; these are drift evidence, not a substitute for
the existing post-install semantic/ACL comparison against the rendered artifact.
Do not compare a pg_get_functiondef hash to unlike migration SQL bytes.

Absence and general checkpoint deadlines: 20s total each; after-A/after-B: 2s total
including connect/query/rollback/close. Short deadlines can fail safely on a slow
live connection; do not increase/retry them automatically. Server statement/lock/idle
timeouts remain 5s/2s/10s. Failed rollback, guard, query, disconnect or deadline
produces no successful capture and consumes the checkpoint. Timeout closes the
observer connection; it never queues more SQL behind a stuck query.

observer.evidence() returns separate immutable/hash-correlated capture snapshots,
not executor success logs. They include target/run/checkpoint/time, rollback state,
sanitized metadata and exact cohort facts. Canonical IDs are private evidence; never
console-log those captures or put them into repository files. No auto-writer changes
the existing five private templates. Persist only through the separately approved
private capture procedure after rechecking its ACL; hash and review that capture
separately. observer.dispose() disables further observation and clears private email
bindings; dispose the credential provider and terminate the protected process too.

## Exact-ID reconciliation and finality

scripts/a02-reconciliation.mjs has no write, HTTP, login, provisioning, retry or
cleanup capability. It combines an independent finished-operation receipt with a
fresh independent DB snapshot; executor acknowledgements cannot supply either.

Use createA02TerminalReceiptReader with an actual approved local absolute directory,
approvedSource and sourceReviewReference. It reads only `<attemptId>.json` for the
exact approved UUID and supplied SHA-256, <=8KiB, outside Git/reparse paths. It accepts
only these fields:

```text
projectRef, runReference, source, attemptId, kind (auth|provision), label (A|B|U),
subject, state (FINISHED|IN_FLIGHT|UNKNOWN),
commit (COMMITTED|ROLLED_BACK|UNKNOWN), completedAt (UTC milliseconds|null)
```

This is a receipt-import contract, NOT an implementation or invention of Supabase
Gateway log guarantees. The operator must bind a real independently reviewed source
which can correlate the actual attempted request, its exact subject, terminal backend
completion and commit certainty. Request IDs/source names/hashes typed by the executor
or copied success logs are not proof. A valid shape/hash or owner-only file does not
authenticate its claims. If the platform cannot provide this evidence for an ambiguous
request, leave the source UNBOUND and reconciliation blocked. Do not create a fake
FINISHED export, infer completion from pg_stat_activity absence, or silently add
request-correlation headers to the reviewed transports.

Give the reader and observer to createA02Reconciler. Supply the actual attempted
operation ID, kind, label, attemptedAt, terminalSha256 and cancellation signal. The
terminal file must match target/run/operation/subject, and completion must precede
the new snapshot. Per operation there is one bounded import, no polling/retry.

Outcomes:

| Independent evidence | Reconciliation outcome |
| --- | --- |
| Finished + committed + correct fresh observed state | confirmed-committed |
| Finished + rolled back + expected absent write | confirmed-no-write |
| In-flight, unknown, missing or untrusted source | blocked; no DB absence inference |
| Partial, cross-subject, inactive, membership/business side effect or conflicting state | blocked |
| HTTP lost response/expiry without proven finality | blocked, even if a snapshot appears empty |

Recovery adds at most one snapshot for each of reconcile-auth, reconcile-A and
reconcile-B (within the previously allowed six recovery-phase ceiling). Partial Auth
attempts share one post-completion snapshot; if any terminal completion is later than
that snapshot, it cannot establish that operation. No automatic second capture.
Install/disable/removal unknown commits still use the existing bounded native-history
and independently reviewed completion procedures; this adapter does not run DDL.

Observe and account for every attempt, then remove the wrapper immediately. Expiry,
revocation and client cancellation are not backend cancellation. Unknown finality
stops setup; the approved disable/recovery branch requires its own exact evidence
and scope. Do not claim all work drained or proceed to cleanup without proof.

Offline tests prove the adapters fail closed and reconcile deterministic synthetic
terminal/capture fixtures. Only separately authorized live work can provide actual
terminal exports, TLS/target/absence, mapping, commit and removal evidence. Scoped
cohort counts do not prove arbitrary unrelated or transient database writes absent.
