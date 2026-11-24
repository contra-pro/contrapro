# Rental contracts: isolated native PostgreSQL 17 harness (PREPARED, NOT RUN)

This is explicit local integration infrastructure. It is not imported by normal
Vitest tests or application code. No database URL, Supabase key, app environment
file or existing database is accepted. Do not run without separate authorization
to start PostgreSQL and execute SQL. Preparation alone is not runtime verification.

## Future prerequisites and command

- Node 24, installed repository dependencies (`pg` already exists).
- Native PostgreSQL **17.x**, including initdb, pg_ctl and postgres in one bin folder.
- An OS user permitted to run initdb (not Unix root).
- A new UUID v4 and a new, nonexistent workspace under a real local parent directory.
- No Docker, extension installation, cloud connection or existing database is needed.

Example for a FUTURE separately authorized execution, from repository root:

```powershell
node packages/infrastructure/database/integration/rentals/run.mjs --pg-bin "C:\Program Files\PostgreSQL\17\bin" --workspace "C:\Users\lenovo\AppData\Local\Temp\contratpro-rental-pg17-6ac9f12d-8c21-4ec5-9aae-37c5e63ec8d1" --disposable-id "6ac9f12d-8c21-4ec5-9aae-37c5e63ec8d1" --ack CREATE_NEW_LOCAL_CLUSTER_ONLY
```

The UUID above identifies only a disposable harness workspace, not a business record.
The path must not already exist. Change the UUID and corresponding path for another
run. No environment variables need changing. Do not use a managed or existing cluster.

Safe database-free preparation checks:

```powershell
node --test packages/infrastructure/database/integration/rentals/safety.test.mjs
node --test packages/infrastructure/database/integration/rentals/diagnostics.test.mjs
node --test packages/infrastructure/database/integration/rentals/lifecycle.test.mjs
node --test packages/infrastructure/database/integration/rentals/identity.test.mjs
node --test packages/infrastructure/database/integration/rentals/baseline.test.mjs
node --check packages/infrastructure/database/integration/rentals/run.mjs
node --check packages/infrastructure/database/integration/rentals/baseline.mjs
node --check packages/infrastructure/database/integration/rentals/scenarios.mjs
```

## Positive ownership and target checks

The runner accepts only four exact CLI arguments; URLs, optional database targets,
UNC paths and Supabase paths are rejected. It rejects existing workspaces and symlink
parents. Exclusive directory creation and an exclusive ownership marker bind the UUID
to a cluster created by this invocation. Database name alone is never proof of safety.

Both initdb and pg_ctl must report 17.x. Initdb creates fresh cluster roles, catalogs
and data. Server listens only on 127.0.0.1 at a selected free local port. HBA accepts
only loopback synthetic-fixture traffic. Unix socket access has no matching HBA rule.
No application credentials are read. Local trust auth is intentionally confined to
this disposable fixture cluster; local OS users can access it while it runs.

Every new connection is constructed with explicit host/port/database/user/password,
SSL/options; no connection string is accepted. It verifies actual PG17 version,
server address, data_directory, database and session user before setup or tests.
Before CREATE DATABASE, the newly created local cluster is verified too. A port race
cannot redirect setup to another cluster: data_directory verification must pass.
An explicit password callback rejects any unexpected password challenge; no empty
password can fall back to PGPASSWORD or pgpass. Nonempty options suppress PGOPTIONS.

Server binaries receive a reduced environment without PG* or application secrets.
The runner never starts an existing data directory. There is no network-host option.

## Baseline and explicit differences from Production

Unmodified local SQL artifacts are applied in transactions:

1. 20261115000100 foundation schema.
2. 20261115000200 foundation context helpers.
3. 20261115000300 foundation RLS/grants.
4. 20261115000400 Supabase identity mapping/RLS.
5. 20261115000500 agency RPCs/role.
6. 20261115000600 clients.
7. 20261118000800 vehicles draft.

Only the exact dependency projection from 0009 v3 is applied: receipt_auth_uid,
canonical_auth_user replacement and its listed helper hardening. Extraction requires
unique source markers; source hashes are recorded. This is NOT a claim of applying
0009 or reproducing all Production migrations. 0007 and 0010-0012 provisioning/agency
hardening are not rental dependencies; no migration history is fabricated.

Supabase-specific bootstrap dependencies are explicit local adapters:
- auth.users has synthetic UUID IDs only.
- auth.uid reads `rental_harness.subject`, set transaction-locally by the harness.
- authenticated/anon/service_role/runtime roles are fresh restricted NOLOGIN roles.
- authenticator is a NOLOGIN NOINHERIT restricted assertion-only role, with no
  memberships or object grants. It does not impersonate the Supabase gateway.
- postgres is the native cluster bootstrap SUPERUSER, unlike Supabase postgres.

This adapter tests canonical mapping, role privileges, RLS and function behavior; it
does NOT validate JWT signatures, gateway behavior, provisioning or Production owner
authority. Never deploy the adapter or use its GUC as a browser authentication scheme.
No Staff role is invented: role-less active memberships are tested.

No extensions are required; gen_random_uuid is built in to PG17. btree_gist is not
installed. The minimum baseline uses the verified composite tenant-key definitions.
Actual local artifacts still require reconciliation before any Production deployment.

## Applying the rental draft

The source is read and SHA-256 recorded. A strict in-memory transformation removes
only the exact known unconditional guard and changes the final ROLLBACK to COMMIT.
An unexpected guard/terminator aborts preparation. No generated SQL is written and
the original source hash is checked at teardown. The draft file is never edited.

Native bootstrap superuser can create the proposed writer and transfer function
ownership. No temporary writer membership is added to authenticated or a login.
This intentionally does NOT solve the outstanding Supabase PG17 owner-transfer path.

## Test roles, fixture authority and results

Synthetic Owner creates an agency/client/vehicle through existing RPCs solely to
prepare fixtures. No prior completed Production test is repeated. Test transactions
SET LOCAL ROLE authenticated before invoking rental RPCs; the owner of those RPCs
is the draft's restricted contratpro_rental_writer. No contract-table writes are
granted to authenticated. Admin is reserved for setup, inspection and named faults.

Catalog assertions check all four new tables' FORCE RLS and public RPC ownership,
SECURITY DEFINER and settings. Permission probes deny direct authenticated reads,
writes and private helper calls. Membership/user/agency tests exercise real RLS.
A rolled-back ownership experiment verifies that FORCE RLS filters all contract rows
for a non-bypass table owner with no matching policy; the bootstrap superuser itself
would bypass RLS and is never presented as evidence of owner-level enforcement.

Prepared scenarios cover authorization, tenant references, money/date validation,
creation replay/conflict, confirmation replay/audit, bigint numbering, concurrent
numbering, concurrent overlapping confirmations, confirmation-vs-extension,
same-row competing extensions, competing starts, cancellation/explicit return,
ongoing extensions, overdue physical unavailability, start-vs-completion, immutable
issued numbers/receipts and full rollback after audit failure.

Concurrency uses two real connections and explicit READ COMMITTED transactions.
After the first RPC completes but before COMMIT, the second RPC starts. The observer
requires pg_blocking_pids(second) to contain the first backend before releasing it.
This is a lock barrier, not a sleep-based assumption. Polling is bounded to 5 seconds;
statement/lock/idle transaction timeouts bound stalled tests. A separate race rolls
back the first confirmation and verifies the contender can reserve the vehicle and
reuse only that uncommitted number.

For overdue fixtures only, bootstrap sets an expired confirmed contract to en_cours
and increments its version. This represents an unreturned handover without changing
the server clock or editing the RPCs. A retained future booking must remain unchanged
after failed start; explicit completion unblocks a queued start under the same lock.
Bootstrap fault injection adds an audit trigger in this owned database; it is removed
in finally. Full snapshots compare contracts, counters, both receipts and audit rows.

Results contain fixed case names/status/SQLSTATE, source hashes and bounded sanitized
failure diagnostics. Raw SQL statements, environment dumps and error stacks are not
printed. Server logs
are retained locally in the owned workspace and must not be published wholesale.

## Cleanup and failure policy

Connections close; only pg_ctl with this invocation's owned data directory stops its
cluster after marker verification. No DROP DATABASE/ROLE or recursive filesystem
deletion occurs. Cluster, ownership marker, server log and results.json are retained
for diagnosis. No automated cleanup of other paths is provided.
If startup/setup/teardown fails, exit nonzero; inspect only this owned workspace.
A server that fails to stop needs manual attention against its recorded data directory.
Never point pg_ctl at an unrelated service. An initdb failure leaves the exclusive
workspace reserved; do not automatically adopt or retry in that directory.

## Diagnostic repair after first setup failure

The first authorized invocation failed after creating the ownership marker but before
creating a data directory. Its exact cause remains UNKNOWN: port selection and initdb
were outside reporting try/finally; stdout was discarded, stderr drained, child errors
replaced with LOCAL_BINARY_FAILED and the CLI catch printed only a generic message.
The previous workspace/artifacts remain untouched. No retry is authorized here.

The repaired runner wraps validation, binary checks, exclusive workspace creation,
port selection, initdb and startup in reporting. Reports distinguish setup, execution
and teardown and retain the failing stage. Native child failures include original
sanitized message, code, signal and exit code plus up to 4096 bytes per output stream.
Collection is memory-bounded even for excessive output; truncation flags indicate loss.
Messages are capped at 4096 characters. Both synchronous spawn errors and asynchronous
ENOENT are retained. Redaction occurs after bounded chunk assembly so split credentials
are not emitted. URLs, bearer/JWT tokens, known keys, sensitive assignments and emails
are redacted without reading secret environment variables. No environment dump occurs.

Primary failure remains immutable in report.failure. Further cleanup/report-writing
failures are separate report.cleanupFailures. Connection close, marker verification,
owned-cluster stop and draft integrity verification are individually protected.
A failed start checks only the owned data directory's pid marker before attempting
shutdown. Marker mismatch prevents shutdown authority. No retry or unrelated process
control is added. results.json remains exclusive-create.
If no workspace was acquired, sanitized results go only to stdout. If report writing
fails, stdout still contains primary and cleanup failures and exit status is nonzero.

Blind spots: bounded output can omit later details; arbitrary unlabeled secrets cannot
be identified reliably by pattern redaction; native server log content is separate and
must not be published without review. OS termination/power loss can prevent finally.
No native process or setup fault was actually reproduced during diagnostic repair.
Only mocked child events and simulated stages were tested; a future run still needs
separate authorization and a NEW approved workspace/UUID. The original failure is not
claimed fixed.

## Startup lifecycle repair after run #3

Run #3 initialized and started PG17.11, but pg_ctl disappeared while the wrapper
remained blocked. Stopping that owned server released the wrapper. The subsequent
ECONNREFUSED and missing-PID cleanup error were consequences of operator shutdown,
not proof of an initial PostgreSQL readiness failure. Existing artifacts were read
only during this repair; no old workspace or installation file was changed.

CONFIRMED code defect: command settled only on `close`, which also requires stdio
closure. Fake-child tests reproduce an exited child with either retained stdout or
stderr indefinitely blocking that design. Inherited Windows descendant handles are
still the HYPOTHESIS for the precise OS mechanism in run #3; no handle trace exists.
See Node documentation: https://nodejs.org/api/child_process.html#event-close .

Retain spawn for explicit stream ownership and bounded collection. Switching to
execFile buffered completion is not a readiness check and is not needed. The wrapper
now records actual exit code/signal on `exit`, gives streams up to 50ms to drain,
then destroys ONLY its local read handles and settles. Earlier `close` settles
immediately. Late output may be lost; outputMayBeIncomplete explicitly marks this.
The successful startup command's exit/drain diagnostic is retained in results.json.

Explicit deadlines: binary version 10 seconds; initdb 120 seconds; pg_ctl start/stop
30 seconds (in addition to pg_ctl's own 20-second wait). Timeout always fails with
ETIMEDOUT, even if termination then returns exit zero. It requests termination only
through the direct spawned ChildProcess handle, never a PID lookup or process-tree
kill, then waits at most one additional second for exit. Unknown exit remains null.
There is no automatic retry, startup success on timeout, or termination after a
normal observed exit. A deadline can still leave a background server: owned-cluster
finally cleanup remains mandatory and any cleanup failure is separately reported.

Readiness is a separate one-shot connect to 127.0.0.1/postgres plus the existing
server-version/data-directory/database/session identity checks BEFORE creating the
disposable database. Connection timeout is 5 seconds and client query timeout 10
seconds. Readiness failure stays a setup failure; a successful command is not enough.

Shutdown revalidates the exact ownership marker; an already absent owned PID file
is an idempotent already-stopped result rather than a second failing stop. Otherwise
pg_ctl stops only that owned data directory, and PID-file disappearance is checked.
Primary errors remain separate from shutdown errors. No service or unrelated PID
is terminated. File/PID checks are not protection against a hostile local OS user
tampering with an owned cluster; that is outside the local harness threat model.

23 database-free tests cover safety, redaction, bounded diagnostics, open-pipe exit,
spawn/exit failures, deadlines, missing readiness, already-stopped shutdown and primary
error preservation. They launch no subprocesses. Runtime PG17 compatibility and the
Windows fix remain unverified until another separately authorized integration run.

## Outstanding integration proof

### Baseline role dependency reconciliation after run #6

Run #6 passed identity, then 0005 failed with 42704 at
`pg_has_role('authenticator','contratpro_agency_writer','SET')`. The assertion must
remain unchanged. Before baselines, the adapter now creates authenticator with
NOLOGIN/NOSUPERUSER/NOBYPASSRLS/NOINHERIT/NOCREATEROLE/NOCREATEDB/NOREPLICATION.
It grants that role no memberships and no object privileges. No gateway connection
is needed by these tests; their session_user remains bootstrap postgres.

| Role | Source/dependency | Minimum local representation |
|---|---|---|
| postgres | 0001-0009 migration identity/DDL; harness setup | native local bootstrap superuser ONLY; not Supabase authority equivalence |
| anon | 0001-0009 revocations; 0005/0007 writer denial | NOLOGIN/NOSUPERUSER/NOBYPASSRLS; no memberships |
| authenticated | 0004 mapping; 0005/0006/0008 RPC grants and policies | restricted NOLOGIN role; existing migrations supply object privileges; test sessions SET LOCAL ROLE from local superuser |
| authenticator | 0005 denial assertion; full 0007 gateway/session check | restricted NOLOGIN/NOINHERIT assertion-only role; no memberships; LOGIN not needed for applied subset |
| service_role | revocations, full 0007/0009 denial checks | restricted NOLOGIN/NOBYPASSRLS placeholder, intentionally NOT Production service-role bypass semantics |
| contratpro_runtime | 0001-0003 role baseline, context, audit policy | NOLOGIN/NOINHERIT/non-bypass; privileges from 0003, no memberships |
| contratpro_platform_runtime | 0001-0003 separate runtime boundary | NOLOGIN/NOINHERIT/non-bypass; no tenant privileges or memberships |
| contratpro_agency_writer | 0005 creates owner, narrow grants and RLS | unchanged migration-created NOLOGIN/NOINHERIT/non-bypass role; temporary postgres SET-only membership revoked by 0005 |
| contratpro_identity_writer | full 0007, 0010/0011 | not pre-created or used: full provisioning migrations are outside this harness subset |
| contratpro_client_receipt_writer | full 0009 | not pre-created: harness applies only identity-helper projection, not client receipt deployment |
| contratpro_rental_writer | rental draft | unchanged draft-created restricted capability owner; no runtime membership |
| contratpro_migration_owner | full 0009 restricted-role catalog filter; legacy operational model | no creation needed by applied subset; a name in a catalog filter does not require role existence |

In PG17 SET TRUE authorizes switching identity; INHERIT TRUE controls automatic
object privileges; ADMIN TRUE authorizes membership administration. NOINHERIT role
attribute alone is not evidence of existing grants' inherit_option. The adapter
therefore validates pg_roles flags AND zero outgoing memberships for all six bootstrap
runtime roles before any native baseline. Missing roles, elevated flags, or even a
SET-only runtime membership fail BASELINE_ROLE_MISMATCH.

There is NO required authenticator -> authenticated SET path in the current harness:
native postgres superuser supplies SET ROLE independently. Creating this role without
memberships is sufficient specifically for 0005's negative assertion, not a faithful
model of full PostgREST. If gateway/provisioning tests are added, login/session_user,
auth.role/auth.jwt and narrowly scoped SET memberships need separate design/evidence.
Do not add authenticated/anon/service_role memberships speculatively. Original 0005
and 0007 denial checks require no path to their writer roles; 0010-0012 owner authority
checks remain deployment concerns, not local runtime permissions.

The inspected applied subset and 0009 projection reveal no other missing externally
provided named role dependency. This is source evidence, not proof that later SQL will
execute. The full migration set requires additional managed auth behavior not modeled.
No Production role flags/memberships were queried; no equivalence is claimed.
The six new database-free adapter tests use a recording mock only; no SQL is executed.
Run #7 still requires separate authorization and a new workspace/UUID.

### Server identity diagnostics after run #4

Run #4 progressed past startup but failed verifyServer before baseline SQL. Its
probe result was not retained, so the exact historical failed comparison is UNPROVEN.
The retained log/configuration show PG17.11, loopback listening, configured port 61924
and the intended data directory. They do not prove the row returned by the connection.
No database was restarted or queried during this investigation.

Previous checks were version range, exact address, normalized directory, database and
session_user. Port and cluster system identifier were NOT checked. The ownership
marker is independently checked through filesystem validation, not SQL identity.
New probe includes inet_server_port and requires exact expected numeric port too.
Run #5 subsequently identified address as the sole mismatch: 127.0.0.1/32 versus
127.0.0.1. The probe now uses `host(inet_server_addr()) AS address` instead of
`inet_server_addr()::text`. PostgreSQL's explicit inet-to-text cast includes the mask;
host(inet) returns the address without it. See PostgreSQL 17 functions-net documentation.
This is a representation fix at the trusted server probe, not application parsing
of caller-supplied CIDR. Exact equality with 127.0.0.1 remains unchanged. No address
range, IPv6, localhost alias or masked string is accepted by the JavaScript gate.

SERVER_IDENTITY_MISMATCH now has a stable error code and identityComparisons containing
every failed field, expected/actual values, normalization method and verification stage.
Only this allowlisted data survives error serialization; paths redact user-profile
names and values use credential redaction. Comparisons happen BEFORE redaction.
Version must be a finite integer in 170000..179999; missing/NaN previously could pass
the range expression if the remaining fields happened to match. That fail-open parsing
defect is corrected but is NOT claimed to explain the real run's mismatch.

Paths must be absolute, normalized using the expected path flavor (Windows or POSIX),
and compared exactly. Separators/dot segments normalize; there is no case folding,
short-name expansion, prefix matching or symlink acceptance. These remain potential
sources of conservative rejection. Absent fields fail closed. Cluster system identifier
is still not probed and no assertion of that independent check is made. Adding it would
require a separately trusted expected value, not comparing the server to itself.

45 database-free tests now cover the identity checks and existing safety/lifecycle
behavior. Runtime identity acceptance remains unverified. A new separately authorized
run can capture the exact failed fields without weakening validation. Previous run
workspaces and the migration draft were not modified.

The revised harness has NOT been executed. Syntax and safety unit tests do not prove that
baseline SQL loads, rental RPCs run, RLS works or concurrency assertions pass.
Any discovered execution defect must be reported; the harness must not silently
patch function bodies, relax policies or convert a failing case to a pass.
Production readiness also requires a non-superuser execution-authority rehearsal,
exact deployed-definition/default-ACL reconciliation, and the separately approved
transactional migration/history procedure. None is inferred from this local harness.
