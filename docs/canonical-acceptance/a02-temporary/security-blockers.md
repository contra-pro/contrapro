# A02 final security blockers — offline evidence

No real credential, session, login or live check is part of this preparation. Gate 2
remains unauthorized. The owner's Development access is not proof that a supplied
credential is an accepted Development Auth Admin credential.

## Prepared memory-only Admin channel: PASS offline

scripts/a02-private-input.mjs now exports readA02AdminCredentials and
createInMemoryAdminHeaderProvider. This reuses the same dedicated non-echoing raw TTY
as A/B/U input, with no import-time prompts, files/env/argv/key discovery or output.
Only during separately approved execution call readA02AdminCredentials({signal}).
It asks for an API key and raw bearer token (no "Bearer " prefix) through hidden
fields. Do not run this now, pass keys in shell arguments, ask ChatGPT to receive
them or substitute fixture strings. A noninteractive/recorded/debugged terminal is
not an approved credential channel.

Pass its synchronous provider directly as adminHeaderProvider to the existing
fixed Auth creator. The provider returns the existing exact apikey/Authorization
header contract, redacts default inspection/JSON, rejects whitespace/control-header
injection and invalid target labels, and invalidates previously returned handles
after dispose(). Dispose in finally and close the protected process. No refresh
token is requested or retained. JavaScript strings/copies cannot be securely zeroized.

The key's actual authority/project, current validity and compatibility with the
Gateway are UNVERIFIED. The provider does not validate a signature or infer authority
from caller labels, decoded claims or a key prefix. The operator must privately
select an approved Development-only authority source/channel and verify it before
use. The pinned transport limits this tool's requests; it does not attenuate the
underlying Admin key's broad privileges or protect against hostile same-user code.
No key is created, read, requested from the operator or persisted in this task.

## Logging: static client PASS; running client/server UNVERIFIED

Static paths reviewed: a02-auth-create, a02-session-transport,
a02-independent-observer, a02-reconciliation and a02-private-input. There are no
client logging/file-persistence sinks in these modules. Private emails are protocol
parameters, not interpolated SQL. Errors returned by adapters are fixed sanitized
states/messages; captures omit emails, passwords, tokens, headers and raw responses.
Offline tests exercise provider diagnostics, cancellation, transport errors and
the prepared Admin-provider/executor boundary with fictional strings only.

This does not attest a future execution process's preload hooks, NODE_DEBUG,
NODE_OPTIONS, debugger, dumps, transcript or OS monitoring. Explicit getter access,
object spreading and request-body logging can disclose plaintext. Before credential
entry the owner must verify a dedicated protected process with these diagnostics
disabled; runtime review remains UNVERIFIED.

Repository source/config provides no deployed server parameter-logging attestation.
Parameterized queries protect SQL structure but do not suppress PostgreSQL, audit,
proxy or provider logs. In separately authorized read-only Development review, capture
effective session settings for log_parameter_max_length,
log_parameter_max_length_on_error, log_statement, log_duration,
log_min_duration_statement and applicable pgaudit parameter logging, plus provider
logging/retention policy. Current effective settings and all relevant logging layers
must demonstrate private bind values cannot be recorded, including errors. No
particular default is assumed; do not change settings as an automatic workaround.
The observer's parameterLoggingCleared flag must refer to an actual reviewed receipt,
not a typed assertion or this offline document. No live settings were inspected.

## Authoritative terminal source: FAIL readiness / UNVERIFIED live

No locally evidenced authoritative Auth-create or provisioning completion exporter
exists in the reviewed repository. The terminal JSON importer is a validated
interface, not an authoritative source. These candidates are insufficient:

| Candidate | Limit |
| --- | --- |
| Executor response/success message | Same mutation path; cannot independently prove commit or drain |
| File hash / protected directory | Integrity/access control only; does not authenticate claimed database facts |
| Gateway access status/duration | No repository evidence proving correlation to exact backend transaction completion and commit |
| Auth audit entry | No captured source or reviewed semantics proving exact request commit/finality |
| pg_stat_activity absence | Snapshot cannot exclude queued, delayed or differently correlated work |
| Native migration history | Relevant to lifecycle migration receipts, not Auth-create/provisioning HTTP transaction finality |

Before source binding, the owner must supply a non-secret source/review reference
whose documented/captured semantics independently bind the exact request/subject,
backend completion and commit outcome, separately for Auth creation and provisioning.
Actual source existence, visibility, correlation and semantics require separately
authorized Development/provider evidence. Do not fabricate an exporter, claim a
Supabase guarantee from a source string, or create FINISHED JSON by copying executor
logs. If no source can prove an ambiguous request final, leave it blocked and use
only separately authorized recovery. No automatic retry or implicit cleanup.

## Independently observed exact-ID state: PASS offline requirement

The reconciler rejects nonterminal, mismatched, missing or unavailable receipts.
Even a FINISHED/COMMITTED receipt must be followed by a fresh independent observer
transaction whose snapshot starts after completion and matches the nominated Auth
subject, canonical state and scoped business invariants. ROLLED_BACK also requires
the expected absent write. Partial or conflicting state remains blocked. Tests cover
committed lost responses, rollback, in-flight/unknown, missing state, partial Auth
phases and canceled sources. None proves that a live terminal source exists.

## Remaining decisions and boundaries

Owner roles, 120-minute window, <=15-minute wrapper ceiling, immediate removal and
private directory are already decided. Still required: private inbox/domain ownership
proof/reference; approved actual Development Admin authority supplier; protected
runtime and logging review; authoritative Auth/provisioning source evidence and
capture destination; run reference, runtime timestamps, rendered hashes and scoped
execution approval. No secret needs to enter chat or repository files. Existing
five private reference/manifest files remain untouched and historical reviews remain
historical. The new review receipt supersedes only the offline Admin implementation
FAIL; it does not convert any live prerequisite to PASS.
