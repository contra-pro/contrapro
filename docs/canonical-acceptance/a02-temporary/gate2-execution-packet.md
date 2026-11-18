# A02 Gate 2 approval packet — incomplete run binding

**NO EXECUTION AUTHORIZED.** Machine-readable packet:
`gate2-execution-packet.json`. Status INCOMPLETE_UNBOUND_NOT_AUTHORIZED.
Security-design readiness is accepted on the operator-confirmed evidence; that
does not fill in names, IDs, versions, expiry, observer bindings or approve writes.

## Bound / UNBOUND

Bound: exact Development project/issuer/session-pooler route, wrapper identifier,
writer role, existing PostgreSQL 17 and CA paths, previously measured CA fingerprint,
CLI version, security invariants, fixed operation budgets and procedural checks.
Connection paths/fingerprints are prior evidence, not a fresh handshake/client check.
The packet records the accepted live authority/supplement/handler/Auth-hook evidence
as operator confirmations, not operations performed during packet preparation.

Locally nominated A/B/U and locally reserved native versions are now recorded
below and in JSON. Their status is NOT_CREATED/NOT_DEPLOYED; neither database
absence nor an exclusive remote version reservation is claimed. CLI path/hash are
bound by byte comparison with the locally checksum-matched release ZIP.

UNBOUND: expiry/approval window, rendered SQL/package hashes, named installer/Auth/session/
observer/recovery operators, synthetic domain/ownership, secure admin channel,
reviewed Auth creation executor and exact independent observer procedures/budgets.
No OS username, guessed operator, test fixture or current-time expiry substitutes
for these inputs. UUID candidates were generated ONLY by the existing approved
nominateSyntheticCohort function. Only A/B/U were retained; its internal validation
expiry was discarded and is NOT the wrapper expiry. No secret generation, SQL
rendering or package materialization occurred.

| Slot | Locally bound value | Status |
| --- | --- | --- |
| A | 17eaeec9-37e1-4720-ba7a-c1e16f659af5 | NOMINATED_NOT_CREATED |
| B | 305fb936-588e-42f9-bc4d-f41a0d3f60c0 | NOMINATED_NOT_CREATED |
| U | f7334db7-f402-4f00-9c1a-754eb3eb2f3e | NOMINATED_NOT_CREATED |
| Install version | 20261117000100 | RESERVED_NOT_DEPLOYED |
| Reserved disable version | 20261117000200 | RESERVED_NOT_DEPLOYED |
| Removal version | 20261117000300 | RESERVED_NOT_DEPLOYED |

Version IDs follow the 14-digit naming/order rule: the client UTC date 2026-11-17
plus ordered 000100/000200/000300 suffixes. They are identifiers, NOT execution
timestamps or an authorization window. Collision checking found no use in the
eight normal migration filenames or existing documentation/captures/packets before
this binding. Actual remote history and other operator reservations remain execution
prechecks; no live check was performed and no native migration file was added.

CLI path: C:\Users\lenovo\AppData\Local\Temp\contratpro-cli-verify-1qoicy\supabase.exe.
Executable SHA-256: f6adec9cab13b017eea61f75e1c54769eb520e0760453fd8a722877a8c0b30ff.
It matches the supabase.exe entry inside the local v3.1.0 archive; archive SHA-256
4881f8ee3019d159c7c5f276f90a14918dd8846b796f8c71e0dd8ff7efbe2267
matches the existing release checksums.txt entry. This reuses previously accepted
release provenance; no download or independent signature/attestation verification
occurred. A fresh --version call was blocked by the local shell allowlist, was not
executed or rerouted, and is not claimed as a current runtime PASS. Version binding
uses the previously verified runtime plus exact release-archive byte identity.

Canonical IDs and cleanup SQL hash are DEFERRED Gate 4 bindings: the core generates
the IDs. They must come from actual independent read-back; do not preassign them or
treat this unavoidable deferral as permission to run cleanup under Gate 2.

## Finalization using existing generators (offline only)

1. Obtain operator-approved UUID proposals, named operators, unused versions and
   observer/executor artifacts and request limits. The operator may explicitly use
   nominateSyntheticCohort, but no generated proposal is a database-absence claim.
2. Arrange all approvals/observers first. Select an explicit UTC expiry <=15 minutes
   away only when the run can proceed within it. Bind the authorization window too.
3. Use renderCohortArtifact for install/remove/disable with that SAME cohort/expiry.
   Compute SHA-256 of the exact UTF-8 bytes returned; no line-ending normalization.
   Removal/disable can render after expiry using allowExpiredRemoval:true, but do
   not refresh or edit an applied install's expiry or native history.
4. prepareA02NativePackage verifies baseline hashes and stages one pending stage.
   materializeA02NativePackage may be called explicitly offline into a new operator
   temp root, outside normal migration discovery. Bind manifest/file hashes and root
   to this packet. Nothing is executed by rendering/materialization.
5. Archive exact rendered removal/disable SQL as reviewed recovery artifacts; stage
   their native packages only with the correct committed history receipts. Do not
   put installation and removal into one pending batch. No history repair.
6. Replace every Gate 2 UNBOUND field, preserving the no-execution status. Obtain
   explicit approval for this completed packet, exact hashes/IDs and finite scope.
   A missed expiry/changed artifact requires a newly reviewed packet, not a silent
   edit or an automatic retry. Approval never follows from source hashes alone.

SourceArtifactSha256 binds the current templates/tooling/read-only procedures only.
Those values are NOT rendered migration hashes. No rendered hashes can be produced
honestly while the cohort and expiry are UNBOUND. No standalone deployment command
is supplied for an incomplete packet.

## Proposed ordered operation sequence — requires separate Gate 2 approval

| Step | Preconditions / operation | Expected result; stop condition |
| --- | --- | --- |
| 1 | All run bindings/approvals complete; existing verified Development credential-bearing operator session, TLS verify-full, current target/client/CA binding; scoped exact-ID absence and no drift | All nominated Auth IDs and privately supplied emails absent under the separately approved bounded observer. Stop on collision, wrong target, missing observer or changed security state. Do not reuse accounts or repeat general audits. |
| 2 | Verify staged hashes/native history and authorized native dry-run; install only if its exact one-file plan is approved | One installation version pending; no earlier/missing/unexpected migration. Any discrepancy stops. |
| 3 | Native installation transaction, including SQL and history | Wrapper committed as writer, exact A/B allowlist/expiry, original RPC denied; same-transaction PUBLIC revoke and restoration of temporary SET/schema CREATE. |
| 4 | Independent post-install checks from bound observer list | Exact rendered body/owner/settings/ACL; original fingerprints/policies/grants unchanged; no lingering installation rights; correct history. Stop BEFORE Auth creation on mismatch. |
| 5 | Approved Auth administrator creates only nominated A/B/U, at most three calls, no retries; operator-owned addresses/passwords via hidden interactive memory provider | Exactly three owned synthetic Auth IDs. Existing inventory confirms all three unmapped. Unexpected mappings/side effects stop. |
| 6 | bootstrapA02Sessions phase fixture-setup in the protected process | Six Auth operations max, 7s/request, 30s/phase; exact verified subjects, non-anonymous/authenticated claims. No refresh, persistence, debug output or extra sign-in. |
| 7 | createFixtureProvisioner: one POST as A, independently confirm; one POST as B, independently confirm; NEVER U | Fresh run expects created for each and two active distinct mappings. Acknowledgement alone is not confirmation. Stop/reconcile uncertain or unexpected existing responses. |
| 8 | Independent cohort/delta/in-flight observation | all_three_ready; U unmapped; zero memberships/business changes; exact committed canonical IDs privately recorded; all attempted transactions accounted for. |
| 9 | Stage/remove with exact archived installation receipt and one new pending version, using approved removal authority | Wrapper removed RESTRICT; original provisioning still denied; temporary membership/schema rights absent. Partial cohort or expiry does not prevent removal. |
| 10 | Independent post-removal.sql plus bound baseline/history comparison | No wrapper overloads, no temporary access, original definitions/ACLs/RLS/column grants unchanged, expected native history. Stop before Gate 3 unless complete. |

Auth creation and the two provisioning requests do not form a distributed atomic
operation. Each user/link pair is transactional; A/B are separate transactions.
Original application provisioning stays OFF and original authenticated RPC EXECUTE
stays denied for every step. No agency, invitation or client endpoint is called.

Independent observation is not an always-true callback. Bind its exact read-only
artifacts, private canonical-ID output handling, limits and operator before approval.
The existing sanitized identity inventory does NOT output canonical UUIDs and cannot
alone satisfy confirmMapping. A reviewed exact-ID private observer is required.
Post-install/removal reads occur after mutations to verify their result; they are
not a request to rerun the completed historical audits during this preparation.

## Recovery decision tree — no automatic retries

1. Installation outcome known rolled back: confirm wrapper/grants/history absence
   through approved observation; stop. Do not create users or repair history.
2. Installation commit unknown: wait for its session to finish and reconcile exact
   native version, wrapper and privileges. No replay until explicitly authorized.
3. Partial Auth creation: retain exact nominated IDs and success/uncertainty receipts;
   stop. Read only the approved exact IDs to reconcile. No replacement user or auto-delete.
4. Provisioning response lost/timeout/expiry/mismatch: retain uncertain state, account
   for in-flight work and observe exact mappings. Never infer no commit from an error.
   Continue to approved revocation/removal; cohort disposal belongs to Gate 4.
5. DROP RESTRICT fails: its revoke rolls back too. If explicitly approved in Gate 2,
   stage the reserved disable version as a separate atomic native batch to commit
   revocation WITHOUT DROP. Independently confirm denied EXECUTE; then resolve the
   dependency and stage removal with BOTH applied receipts. No CASCADE.
6. Disable/removal authority lost or drift found: stop and use the named recovery
   operator within the approved scope. Expiry denies writes but does not revoke an
   ACL or cancel a transaction. Never report removal complete based on expiry alone.
7. Any unexpected business data/ownership/dependency: preserve evidence and stop;
   no repair, relink, activation, grants beyond this packet or unrelated cleanup.

Recovery read/DDL budgets must be enumerated in observerStatementAndRequestListWithLimits.
No open-ended SQL, polling, cancellations, sign-ins or RPC repeats are authorized.

## Exact approval boundaries

**Gate 2 requested scope, NOT approved:** named Development operators, final UUIDs/
hashes/versions/window, one installation native batch and one removal native batch,
temporary SET-only membership/schema CREATE restored before commit, three Auth
creations, six session operations, two wrapper POSTs and the bound independent
observations. Include a separately staged disable/reconciliation branch only if
expressly approved with exact version/hash/budgets. Do not infer emergency authority.

**Gate 3, excluded:** exactly three A02 auth-access GETs, A/B/U, after removal and
independent confirmation. Existing sessions must still meet <=60s verification
age and >10s expiry margin. If stale, stop; Gate 3 does not permit login/refresh.
Additional fresh password issuance/verification needs explicit separate scope.

**Gate 4, excluded:** privileged administrative RLS-bypass cleanup of reconciled
cohort IDs. Render cleanup only after actual IDs/presence/ownership are known;
bind its hash/operator and independently recheck dependencies/business use. Delete
exact mapping pairs then canonical users atomically with row-count assertions;
Auth deletion follows separately by exact ID. No cascades or automatic compensation.

The last READY decision was readiness to request scoped approval, not an approval
or a claim that these run-specific bindings exist. This packet is BLOCKED until
its required Gate 2 fields and approval record are supplied.

## Secure credential preparation

Follow [secure-credential-input.md](secure-credential-input.md). Both addresses and
passwords are entered without echo in a dedicated approved executor, supplied through
the existing synchronous in-memory provider, and never placed in this packet.
The new input path generates no credentials. Default console/JSON redaction does
not make explicit field extraction or HTTP payload logging safe.

The exact-ID inventory alone does not establish email absence. A separately reviewed
parameterized private-email observer, channel and client/server logging protections
remain UNBOUND. No collision check, credential input or Auth operation occurred.

## Local packet validation

Source hashes now bind the updated credential provider/transport and private-input
procedure. SQL templates, UUID nominations, reserved versions and security design
remain unchanged. No rendered SQL or native package was generated. Gate 2 remains
unauthorized; operators, expiry/windows, private ownership/domain evidence, executor,
observers, secure channels, rendered artifacts and explicit approvals remain UNBOUND.

## November 17 runtime readiness preparation

Operator supplied: execution date November 17, 2026; 120-minute planning duration;
principal operator project owner; three operator-owned inboxes available. Actual
UTC start/end and explicit wrapper lifetime/expiry remain UNBOUND. The 120-minute
window does not replace the wrapper maximum of 15 minutes or session freshness.

Follow [gate2-runtime-readiness.md](gate2-runtime-readiness.md) for timestamp capture,
bounded preflight, evidence ledger and failure recovery. Validate locally with
`node scripts/a02-packet-readiness.mjs`. A successful offline validation leaves live
readiness FAIL while role/artifact/channel/timing bindings and approval are missing.
No current live ACL or running application gate claim is made from local evidence.
Gate 2 remains unauthorized.

## Final offline package preparation

Confirmed: principal execution/installation and recovery operator project owner,
120-minute runtime window, wrapper lifetime at most 15 minutes, immediate removal
after A/B provisioning and independent reconciliation, three owned inboxes and
existing hidden interactive input. Actual timestamps are still NOT captured.

See [executor-observer-procedure.md](executor-observer-procedure.md) for the fixed
three-create executor, separate pinned Admin transport, independent private cohort
snapshots, operation ceilings and recovery budgets. Source hashes bind these prepared
artifacts; review receipts, private channels/destinations and complete mutation/
in-flight evidence remain UNBOUND. No assumed admin privilege follows from owner
assignment. Gate 2 remains unauthorized; no rendered lifecycle package exists.

## Private evidence binding preparation

All execution/recovery, Auth administration, session custody and observation roles
are now assigned to project owner, as explicitly confirmed. Independent evidence
remains a separately captured/reviewable record, even with the same human operator.

See [private-evidence.md](private-evidence.md). A configurable owner-only NTFS
initializer prepares fixed ownership/channel/destination references and separate
execution/observation manifests. Its execution was blocked by the local shell
allowlist before any filesystem action. Candidate directory is not an existing
verified destination: actual references and permission receipt remain UNBOUND.
Review receipts, timestamps, rendered hashes and live approval also remain UNBOUND.
Gate 2 remains unauthorized.

## Independent local private-evidence verification

The operator-created directory and five exact templates were read back independently.
Owner-only NTFS directory/file ACLs, current-user ownership and no reparse/Git path
were verified read-only. See private-evidence-verification.json for measured hashes
and the bounded non-secret receipt. No private file was modified. References now
bind actual files; they remain templates, not ownership/channel reviews or live
execution/observation evidence. Original operator checksum comparison is UNVERIFIED
because no checksum values were supplied. All review receipts and Gate 2 approval
remain UNBOUND; current private snapshot must be rechecked before use.

## Original receipt reconciliation and completed offline reviews

Original hashes now match all five private files and packet bindings. This resolves
the earlier original-checksum UNVERIFIED finding without changing private files.
See gate2-final-offline-review.json/.md for scoped PASS/FAIL receipts. Executor and
private-destination reviews are now PASS for their offline scopes; complete observer,
actual Admin channel and in-flight evidence reviews are FAIL for execution readiness.
These are completed reviews, not pending review requests. Packet validation retains
the FAIL findings as blockers even though their receipt references are bound.
No live authority, ownership proof, actual timestamps or approval was invented.

## Observer and reconciliation adapter completion

Independent absence/mapping and exact-ID reconciliation adapters now have scoped
offline PASS reviews in observer-reconciliation-review.json. Existing earlier FAIL
receipts remain historical. See observer-reconciliation-integration.md for fixed
composition, exact budgets and fail-closed recovery. Parameterized queries and
terminal imports do not execute on import; no private files were changed.

Admin channel remains FAIL/UNBOUND. Actual parameter-log clearance and authoritative
independent terminal source/review/directory remain UNBOUND and are explicit live
readiness blockers, rather than fabricated completion flags. No approval, live
evidence, timestamps, rendered lifecycle artifacts or provisioning activation
follows from this implementation. Gate 2 remains unauthorized.

## Final security blocker review

Memory-only Admin input/provider implementation now passes a scoped offline review
and reuses the existing hidden TTY mechanism. See security-blockers.md and
security-blockers-review.json. No real credential was read/requested/generated.
Actual Admin authority, runtime diagnostics, server logging and authoritative terminal
sources remain UNVERIFIED. The validator reports these separately even when artifact
or source-reference strings are populated. Original private files remain untouched;
no local review, access role, hash or executor status is treated as live commit proof.
Gate 2 remains unauthorized.

## Reported PostgreSQL logging result and validation fixes

The operator reports a read-only inspection ending in ROLLBACK with ordinary
parameter length -1, error parameter length 0 and pgaudit parameter logging off.
postgresql-logging-observation.json preserves exactly that provenance. Actual
20-second deadline enforcement, credential transport, current target/TLS guard
and observation time were not supplied and remain UNVERIFIED. This supersedes the
earlier no-observation state, not the missing clearance review.

New structured logging assessment rejects reported settings or a flat PASS flag
as clearance. The observer refuses private email queries without complete reviewed
evidence. Reconciliation now validates receipt correlation/hash, successful
rollback, exact checkpoint/labels/types, chronology/freshness and cancellation.
See security-blocker-closure-review.json for the actual code/test scope. The
operator-TTY-to-memory-provider remains the only Admin credential mechanism; its
upstream authority and actual finality source are still UNBOUND. Gate 2 is not READY
or authorized. No live access or Supabase setting change occurred.

## Check 4 authoritative completion adapter

A bounded reviewed-policy/operation-ledger adapter is now integrated with the file
reader and reconciler. See authoritative-completion-adapter.md and
check4-completion-adapter-review.json. Plain terminal JSON or typed verified flags
no longer qualify. Gate 4 deletion receipt validation does not authorize Gate 2
delete actions or replace independent post-delete observation.

The prepared source categories describe a normalized reviewed-export contract, not
a deployed Supabase evidence producer. Actual provider/database authority, semantics,
policy, operation ledger and source receipts remain UNBOUND/UNVERIFIED. No real
receipt, policy, credential, request or transaction was generated. Gate 2 remains
BLOCKED and unauthorized.
