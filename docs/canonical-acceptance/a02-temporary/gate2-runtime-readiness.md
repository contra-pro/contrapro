# Gate 2 runtime binding and evidence checklist

Offline preparation only. Gate 2, Gate 3 and Gate 4 remain unauthorized.
Principal execution and recovery operator: **project owner**, as supplied by the
operator. The installation/recovery assignments do not attest actual privileges.
Auth administrator, session custodian and observation are also assigned to project
owner by the latest decision. Authority, secure-channel and evidence-review receipts
still require confirmation privately before requesting approval. Three owned inboxes are available; their
addresses and credentials must never enter this packet or its receipts.

## Timing: capture once, approve before installation

The operator selected November 17, 2026 and a 120-minute planning duration; this is
not approval for a live operation. Actual start, end and wrapper expiry are UNBOUND.
The execution window includes prechecks, review, installation, setup, reconciliation
and removal. It does not extend the wrapper's existing **maximum 15-minute** lifetime.
Do not render an install until all other ports, roles and artifacts are reviewed.

At the final local binding checkpoint, run only this non-network PowerShell snippet.
It prints non-secret proposed timestamps, changes no packet and authorizes nothing:

```powershell
$a02Start = [DateTimeOffset]::UtcNow
if ($a02Start.ToString('yyyy-MM-dd') -ne '2026-11-17') {
  throw 'STOP: execution date needs a newly reviewed decision'
}
$a02End = $a02Start.AddMinutes(120)
$a02LifetimeText = Read-Host 'Approved wrapper lifetime in whole minutes (1-15)'
$a02Lifetime = 0
if (-not [int]::TryParse($a02LifetimeText, [ref]$a02Lifetime) -or
    $a02Lifetime -lt 1 -or $a02Lifetime -gt 15) { throw 'STOP: invalid lifetime' }
$a02Expiry = $a02Start.AddMinutes($a02Lifetime)
[ordered]@{
  authorizationWindowStartUtc = $a02Start.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  authorizationWindowEndUtc = $a02End.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  wrapperExpiresAtUtc = $a02Expiry.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  liveExecutionAuthorized = $false
} | ConvertTo-Json
```

Bind the exact proposed timestamps into the packet, render install/disable/removal
with the existing generator and SAME UUIDs/expiry, hash exact UTF-8 bytes, archive
recovery files and bind package roots/manifests. Review the completed packet and
obtain separate Gate 2 approval **before installation**. Run the offline validator:

```powershell
node scripts/a02-packet-readiness.mjs
```

It checks current source hashes, fixed nominations/versions and timing; its PASS
does not mean live readiness or authorization. The process checks local UTC again
immediately before native installation: start <= now < end, now < expiry <= end,
expiry-now <=15 minutes. The install guard independently checks the database clock
against that SAME absolute expiry. Compare local UTC with the independently
observed server UTC from preflight; unexpected clock disagreement stops the run.
Approve an operational margin sufficient for both bounded setup and removal; if
review/delay consumes it, stop and rebind/re-render/reapprove before any install.
Never silently refresh expiry, rewrite an applied install or automatically reinstall.
If already installed, use recovery/removal even after expiry. Window exhaustion
requires the approved recovery branch; no further setup or implicit extension.

## Bounded preflight specification — not executed

Use the existing verified Development route, PostgreSQL 17, pinned CA and
sslmode=verify-full. Recheck executable/CA hashes, credential-free target route and
hostname validation, inherited connection overrides and the operator's authority.
No password in argv/URL/files. Database name alone is not project attestation.
Control Plane route evidence and the explicit project-qualified connection must
bind this session to gllsiklbvqpxzucvkehw; never use a linked/default project.

Do not repeat successful historical authority/hook audits. Bind their accepted
receipts and a current scoped drift observation to this run. External Auth hooks
must remain absent. The current application process configuration must explicitly
evidence `CONTRATPRO_CANONICAL_PROVISIONING_VERIFIED` is not `true`; local files alone
cannot attest the running process. No A01 rerun or provisioning HTTP probe is needed.

Exact-ID inventory: execute `scripts/inventory-a02-identities.sql` once under
separate approval, with these non-secret psql parameters (plus approved connection):

```text
-X -v ON_ERROR_STOP=1
-v development_project_ref=gllsiklbvqpxzucvkehw
-v candidate_a=17eaeec9-37e1-4720-ba7a-c1e16f659af5
-v candidate_b=305fb936-588e-42f9-bc4d-f41a0d3f60c0
-v candidate_u=f7334db7-f402-4f00-9c1a-754eb3eb2f3e
-f scripts/inventory-a02-identities.sql
```

Expected three rows: AUTH_NOT_FOUND, auth_exists=false, mapping_exists=false.
The inventory has a read-only repeatable-read transaction, 5s statement/2s lock/10s
idle timeouts and ROLLBACK. Its privileged visibility guard must pass.

Email collision observer: use exactly the parameterized three-row query in
[secure-credential-input.md](secure-credential-input.md), once in a separate
`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY` transaction; set local search_path
to pg_catalog and the same 5s/2s/10s timeouts. Verify session/current user postgres,
database postgres, PostgreSQL 17, read-only state and privileged complete visibility
before the query; ROLLBACK after it on success or failure. Bound protocol sequence:
BEGIN, four SET LOCAL statements, one session guard SELECT, one parameterized
collision SELECT, ROLLBACK. No PREPARE/DDL, login probing or population enumeration.
All six parameters come from fixed UUIDs and hidden memory input; output only A/B/U
and two false booleans. Abort on collision, missing evidence or uncertainty.
Client/server parameter logging must be independently cleared first. The existing
HTTPS session transport is NOT a SQL or Admin transport. A reviewed private observer
executor/channel is still UNBOUND; this specification does not implement that port.

The observer must use this exact transaction shape, with the collision query from
the linked procedure as its single parameterized statement. Do not send the private
parameters unless `session_guard_ok` is true. A false/missing guard, SQL error or
deadline triggers ROLLBACK and a fixed sanitized failure, never raw diagnostics.

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path = pg_catalog;
SET LOCAL statement_timeout = '5000ms';
SET LOCAL lock_timeout = '2000ms';
SET LOCAL idle_in_transaction_session_timeout = '10000ms';
SELECT current_database() = 'postgres'
  AND session_user = 'postgres' AND current_user = 'postgres'
  AND current_setting('server_version_num')::integer BETWEEN 170000 AND 179999
  AND current_setting('transaction_read_only') = 'on'
  AND NOT pg_is_in_recovery()
  AND EXISTS (SELECT 1 FROM pg_roles
              WHERE rolname = current_user AND (rolsuper OR rolbypassrls))
  AS session_guard_ok,
  clock_timestamp() AS server_utc;
-- Only after the client validates the guard: parameterized collision SELECT.
-- Use the exact A/B/U query in secure-credential-input.md, with six bound values.
ROLLBACK;
```

The complete observer, including its callback branching, 20-second total deadline,
parameter binding, error redaction and rollback/disconnect handling, still requires
review. No operator should paste private emails into a SQL console as a substitute.

## Approval and evidence ledger

Every receipt must bind project, run reference, actor label, UTC start/end, reviewed
artifact hash, operation budget, exit/status and commit certainty; no emails, secrets,
raw Auth responses or credential-bearing strings. Keep canonical IDs private in the
approved observation channel. An independent observer must produce evidence, not
return constant true flags. Bind exact observer queries/artifacts and finite counts
before execution; the rows below are required outcomes, not permission for ad hoc SQL.

| Checkpoint | Independent evidence / required outcome |
| --- | --- |
| Before installation | Target/TLS and process gate OFF; original RPC authenticated EXECUTE false; exact baseline history 0000-0007, no wrapper or temporary rights; scoped no-drift receipt against accepted authority/hook evidence; nominated UUID/email absence; ready installer AND recovery authority |
| Native plan | Archived staged-file hashes/config, exact remote history, one pending 20261117000100; no seed/roles/repair/include-all; pinned CLI v3.1.0 |
| Post-install, before Auth | Exact rendered wrapper definition/owner/security/ACL/compiled A/B/absolute expiry; compare private source bytes or approved semantic representation, not a hash of unlike representations; original RPC false, writer NOBYPASSRLS and FORCE RLS unchanged; temporary SET/schema CREATE restored; exact install history receipt; current server UTC |
| After Auth creation | At most three creates, no retry; independently observe exact nominated A/B/U present and unmapped, no memberships/business delta; creation subject must equal nomination |
| Sessions | Six existing bootstrap operations, 7s each /30s phase; verified gateway subjects A/B/U, no refresh; sanitized label/status receipts only |
| Each wrapper attempt | One A then one B, 7s each; independent exact-subject mapping confirmation <=2s; record created/existing/uncertain honestly. Never U. Expected fresh run: created; unexpected existing stops for reconciliation |
| After provisioning | Two distinct active canonical users/links, U unmapped, zero memberships including revoked, no invitation/business changes; approved independent delta and request/in-flight accounting |
| Disable if approved | Separate one-pending 20261117000200 batch; wrapper remains but effective authenticated EXECUTE false, original false, no temporary rights; committed native receipt |
| Removal | Separate one-pending 20261117000300 batch with exact archived install (and disable if applied) receipts; post-removal.sql PASS, no overloads/rights, original fingerprints/ACL/policy/column grants unchanged, exact native history |

`authority-evidence.sql` and `post-removal.sql` cover only their defined predicates.
Neither substitutes for the still-unbound body/history, mapping, business-delta or
in-flight observers. No live state is newly verified by this offline packet.

## Approved path and failure path

Follow the existing packet's ordered ten-step sequence. Approval must include exact
hashes, timestamps, actors, bounded observations and recovery branch. Install,
disable and removal each use the native atomic SQL/history executor separately.
Removal does not delete fixtures. Original application provisioning stays OFF and
the original authenticated RPC stays denied throughout.

1. Known rolled-back install: observe absence of wrapper/rights/history; stop, no
   users and no history repair. Unknown install commit: wait for the original
   operation to finish and independently reconcile history/body/ACL, never replay.
2. Partial Auth creation or lost response: stop creates; reconcile only nominated
   IDs through the approved observer. No substitutions, password reset, retry or
   automatic compensation. Preserve private ownership receipts for Gate 4.
3. Lost wrapper response, expiry/credential failure after a write, wrong mapping or
   failed confirmation: uncertain until exact-ID independent read-back and in-flight
   accounting. Never infer rollback from 401/403/timeout. Stop further fixture writes.
4. Drain/reconcile every attempted write; expiry/revocation is not cancellation.
   Use approved removal even if cohort is partial or expiry has passed. Unknown
   removal commit: reconcile receipt/function/ACL before any replay.
5. DROP RESTRICT failure rolls its revoke back too. Only if the disable branch was
   explicitly approved, stage the separate disable batch and confirm denial; then
   resolve dependencies under new authority and remove with both receipts. No CASCADE.
6. Authority lost, deadline elapsed or unresolved in-flight work: stop setup; named
   recovery operator handles only the expressly approved branch. Expiry is not proof
   of removed access. If recovery scope is insufficient, obtain separate authorization;
   do not broaden grants, cancel unrelated sessions or claim completion.

Gate 3: separate approval for exactly three A02 GETs after independent removal
verification. Existing sessions must meet <=60s verification age and >10s expiry
margin; otherwise stop. Gate 2's 120 minutes does not extend session freshness or
authorize another login. Gate 4: separate exact-ID privileged RLS-bypass cleanup,
dependency/ownership/row-count checks and Auth deletion. Neither gate is included.

## Remaining decisions before execution approval

Confirm assignment and authority of installer, Auth administrator, session custodian,
independent observer and recovery operator; private ownership/domain and channel
references; reviewed Auth executor and missing observer artifacts/budgets/receipt
location; run reference; explicit wrapper lifetime; actual start/end and final
rendered/package hashes. Principal operator and inbox availability alone do not fill
these fields. Then approve the completed packet's exact Gate 2 scope separately.

## Prepared executor/observer artifacts

The Auth executor and pinned Admin transport are now prepared in scripts/a02-auth-create.mjs,
with the exact observer SQL and operation ceilings in executor-observer-procedure.md.
Their packet hashes bind actual files, not approval. Installation/recovery operator
is project owner; Auth administration, session custody and observation assignment
remain UNBOUND. Complete independent in-flight/write accounting and private channel/
destination references still require actual operator-supplied evidence. Remove
immediately after A/B read-back/accounting; never wait for the expiry ceiling.
