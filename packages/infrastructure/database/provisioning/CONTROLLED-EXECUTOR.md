# P1.6L controlled executor — offline implementation

NOT EXECUTED. This document does not authorize a connection or consume the existing
one-attempt authorization. Independent review is required before use.

Future command from repository root, only under the separately approved execution step:

```powershell
node .\packages\infrastructure\database\scripts\provision-foundation-authority.ts --provision-foundation-authority gllsiklbvqpxzucvkehw
```

Reuse the approved CONTRATPRO_MIGRATION_* process configuration and CA file.
SQL identity/login and journal owner must be postgres, not the dotted routing
username. Never supply credentials in arguments or disclose the URL.
The internal bootstrap-stage config parse only validates configuration; it does
not call the migration runner.

## Immutable scope

The executor hashes all nine approved SQL/implementation files before constructing
a client, verifies the full migration manifest checksum, and separately pins
foundation-authority.sql to
902d50629df97516570afdc7656e833e3183a7de2da9c4e3ead5c25f456430aa.
The draft is read as bytes for integrity only, never executed. The only mutation
statements in the engine are the two approved fixed GRANTs.
There is no arbitrary SQL argument, filename selection, role impersonation,
ownership transfer, journal insertion, foundation execution or automatic retry.

## Execution states

ARGUMENTS -> immutable artifacts/configuration/CA -> one client/connect ->
TLS and exact target -> one explicit READ COMMITTED READ WRITE BEGIN ->
four fixed SET LOCAL controls -> nonblocking transaction lock -> complete preconditions -> GRANT CREATE ->
GRANT SET -> complete postconditions/delta comparisons -> COMMIT -> cleanup.

READ WRITE is intentional: this operation changes privileges. It must not reuse
the discovery tool's read-only startup setting. Effective transaction_read_only
must be off; statement/lock/idle limits remain exactly 5000/2000/10000ms.
The existing CA chain/hostname/SNI and TLS >=1.2 controls remain unchanged.
The client has a five-second connect timeout, seven-second query timeout and
bounded five-second cleanup. No metadata rows or raw errors are printed.

## Gate coverage

Before either GRANT: exact database/OID/login/backend address/port/version/recovery,
stable PID and TLS; full bootstrap journal columns/defaults/constraints/ownership,
rules/triggers/extra relations; one approved journal record; foundation absence;
three restricted roles and exact provider ADMIN memberships; owner CREATE/SET
absent; postgres database ownership and CREATE WITH GRANT OPTION; runner role
boundary; no runtime direct grants. Snapshot inventories are fixed and bounded:
four known role OIDs, memberships LIMIT 17, database ACL sentinel LIMIT 65,
journal rows LIMIT 5. Overflow rejects the operation.

After both GRANTs: all stable facts must still match. Owner CREATE/SET must be true;
exactly the additional postgres-granted membership has ADMIN false, INHERIT false,
SET true. Original provider rows are compared unchanged after normalizing only
the expected total-count window field. Database ACL must equal its prior multiset
plus precisely one CREATE entry (postgres grantor, owner grantee, no grant option).
Journal ACLs, ownership, rows including applied_at, structure, roles and role OIDs
must be identical. Runtime direct grants must remain absent; runner boundary and
foundationAuthority checks must pass. Final identity/TLS/timeouts are rechecked
before the sole COMMIT call.

## Failure semantics

Any pre-COMMIT rejection stops further grants/queries except rollback and cleanup.
ROLLBACK is attempted once BEGIN may have reached PostgreSQL, even with lost
acknowledgement or asynchronous errors. Primary failure is retained alongside
rollback/cleanup status. Failed rollback is INDETERMINATE.

COMMIT-attempted is set before sending COMMIT. Lost/unexpected acknowledgement or
transport failure at that point gives OUTCOME=INDETERMINATE, closes the client and
never retries or claims successful rollback. A confirmed COMMIT remains recorded
even if later cleanup/output fails; FINAL_VERDICT then stays INDETERMINATE.

Output is fixed status/stage enums only: PRECONDITIONS, POSTCONDITIONS, OUTCOME,
FINAL_VERDICT and diagnostic contact/rollback/cleanup. Exit 0 requires acknowledged
COMMIT, all checks passing and successful cleanup. Exit 1 never authorizes replay.
An uncertain outcome requires separately authorized read-only inspection.

## Duplicate invocation boundary and limitations

One invocation is consumed per CLI process after valid arguments; repeated use of
the same injected/real client is rejected. After a confirmed prior provisioning,
the strict unprovisioned baseline rejects a sequential rerun before GRANT.

P1.6N adds one fixed pg_try_advisory_xact_lock(1470359581, 1718059856) call after
BEGIN and timeout verification, before any mutable baseline capture. It never
waits/retries on contention. Require exactly one result row, locked=true, the
previously verified integer backend PID and a valid transaction ID.
False, null, malformed/missing data, query error or ownership uncertainty causes
rollback and cleanup with zero GRANTs.

Compatibility: both two-integer PostgreSQL advisory functions use the same
database-local advisory lock tag (classid 1470359581, objid 1718059856, objsubid 2).
The single-bigint namespace is different and is not used. Session and transaction
locks conflict in that tag namespace; their difference is lifetime/ownership.
The unchanged runner acquires its session lock before journal/history checks,
holds it across migration transactions, then explicitly unlocks in finally.
Provisioning holds its transaction lock through all checks, both GRANTs and
COMMIT/ROLLBACK, with automatic transaction-end release and no explicit unlock.

The acquisition SELECT also calls pg_current_xact_id()::text, allocating a
transaction ID if necessary. Its fixed, bounded value is retained only internally.
Held-lock checks inspect pg_locks in the exact database/key/ExclusiveLock namespace
and require the same backend PID and transaction ID. They occur immediately after
acquisition, at each snapshot start, before each GRANT and at the final COMMIT gate.
A new backend or transaction, missing lock or malformed evidence rejects execution.
pg_locks alone does not distinguish session versus transaction ownership; the fixed
acquisition function plus transaction continuity establishes the intended lifetime.

The shared lock coordinates only cooperating tools on the same database and key.
It is not a durable authorization ledger, does not coordinate another database,
and cannot prevent arbitrary administrative commands that ignore the key.
Only one operator invocation is authorized; do not intentionally launch duplicates.
A rollback/COMMIT acknowledgement loss or failed cleanup still requires uncertain
outcome handling; do not infer release or retry permission from a local exit code.
The original two-GRANT draft/hash is unchanged. The new lock/continuity SELECTs
must be included in the reviewed execution procedure before any future live use.
Offline concurrency tests execute the real provisioning and migration engines
against a shared lock model; they do not prove live PostgreSQL lock enforcement.

Offline tests establish parsing, orchestration and rejection behavior only.
Provider GRANT behavior and catalog formatting remain live-unverified. Existing
bootstrap-only verification intentionally rejects provisioned CREATE/SET state.
Do not weaken it. No foundation migration is authorized by successful provisioning.
