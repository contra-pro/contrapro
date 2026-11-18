# Migration execution model — offline implementation, connected execution unverified

The operational CLI was NOT invoked in P1.2B-1R. Unit tests inject doubles; SQL
parsers inspect text without executing it. Connected execution requires separate
approval of a specific isolated PostgreSQL target, role provisioning, synthetic
fixtures and recovery/cleanup actions. No Docker or production authority is implied.

## Inert by default

Normal package imports, Next.js startup/build, test commands and importing the CLI
do not connect. There is no application migration endpoint. Only the CLI's direct
entry point calls main. Validation occurs before dynamic pg import/client creation.

Future authorized operator workflow, NOT executed in this task:

1. Review canonical UTF-8/LF SQL files. Use `npm run migrations:plan
   --workspace=@contratpro/database` to print ordered raw-file SHA-256 checksums and
   the combined plan digest. This command is offline and reads no credentials.
2. Obtain actual target identity through separately approved read-only connection
   preflight. Keep credentials in the operator environment, never command arguments,
   browser bundles, logs, `.env` commits or chat.
3. Supply all settings below and invoke the CLI only after explicit authorization.

| Environment variable prefix: `CONTRATPRO_MIGRATION_` | Required value |
| --- | --- |
| `ENVIRONMENT` | `development` only |
| `CONNECTION_MODE` | Verified `direct` or `session`; declaration alone does not prove provider mode |
| `TARGET_ID` | Explicit approved target label, 8–64 lowercase alphanumeric/underscore/hyphen characters |
| `DATABASE` | Expected database name |
| `DATABASE_OID` | Expected database OID from approved preflight |
| `LOGIN` | Expected SQL session_user/current_user, separate from NOLOGIN capability roles |
| `JOURNAL_OWNER` | Original administrative bootstrap login owning the control schema/table |
| `SERVER_ADDRESS` | Expected database backend IP from approved preflight |
| `SERVER_PORT` | Expected database backend port, potentially different from pooler endpoint port |
| `PLAN_SHA256` | Reviewed combined plan digest |
| `URL` | Explicit PostgreSQL URL with host/port/user/password/database; no query options or fragment |

The CLI requires exactly:

```text
npm run migrations:apply --workspace=@contratpro/database -- --apply --stage bootstrap --confirm-target TARGET_ID
npm run migrations:apply --workspace=@contratpro/database -- --apply --stage foundation --confirm-target TARGET_ID
```

These are separate invocations with separately approved credentials/settings as
appropriate. Bootstrap applies only 0000 and creates the journal in the same
transaction. An operator then reviews/grants owner SET/CREATE and migration-login
journal access as described in [role strategy](database-role-strategy.md).
Foundation requires that committed bootstrap and applies 0001–0003 in order.
There is no force/adopt/down flag or environment fallback to DATABASE_URL/PGUSER.

Only reviewed PostgreSQL 16–18 targets are accepted. TLS verification remains on;
no URL sslmode/options parameters can override the driver's SSL policy. Database
name/OID, backend address/port, initial session/effective login, version and recovery
state are checked before DDL. The plan digest is checked before connection creation.
IP/OID drift or a restored/renamed target requires renewed preflight/approval, not
automatic replacement of expected values. These controls are operator safeguards,
not cryptographic proof that an operator has selected a development system.

## Serialization and transaction ownership

- One dedicated pg.Client for the entire invocation; no pool.query or transaction
  pooler. Session timeouts are bounded. No tenant request credential is accepted as
  an operational login.
- A nonblocking session advisory lock with fixed two-integer key serializes
  cooperating runners for the database. A busy lock fails before DDL.
- Backend PID/lock ownership are checked inside each transaction before changes.
  A lost connection is not retried. The CLI closes its client on every exit path.
- The SQL parser requires plain outer BEGIN/COMMIT, rejects inner transaction
  control/session SET, and removes only the parsed outer wrappers using byte
  offsets. PL/pgSQL blocks and quoted semicolons remain intact.
- The runner issues BEGIN, checks the session, executes the body, returns to the
  original login with SET LOCAL ROLE NONE, validates control/role boundaries,
  inserts the journal row and commits. It never blindly nests draft transactions.
- Bootstrap control-schema creation, roles and the first journal row are in one
  transaction. Later file changes and their journal rows commit together.
- Fixed role names are cluster-scoped, while advisory locks are database-scoped.
  Use one approved isolated ContratPro installation per cluster/project. Other
  database installations sharing those role names are collisions, not reusable roles.

## Journal and replay contract

`migration_control.journal` is owned by the approved administrative bootstrap login.
It is control-plane state, not a tenant table. It uses private ACLs rather than
tenant RLS. PUBLIC, tenant runtime, platform runtime and the migration owner have
no access. A distinct migration login receives only approved USAGE/SELECT/INSERT.

The table contains migration ID (PK), ordinal (unique), raw-file SHA-256, target ID,
runner version, server timestamp and session actor. The runner checks ownership,
column signature, version marker, primary/ordinal uniqueness and unexpected triggers.
History must be an exact prefix of the reviewed plan with matching hashes/target/
version. Complete stages replay as no-ops; an interrupted completed prefix resumes
only its suffix. No ON CONFLICT or IF NOT EXISTS masks unknown baseline state.

Unexpected control namespaces, empty existing journals, unknown history, gaps,
checksum mismatch, existing private schemas/roles without the journal, or wrong
role authority stop execution. The runner does not auto-adopt manually applied SQL.

## Failure and recovery

- A statement failure rolls back the current file and journal row, stops the run,
  and leaves previously committed rows intact. This is a design contract, not yet
  observed PostgreSQL durability evidence.
- A lost COMMIT acknowledgement is an uncertain outcome. Do not claim rollback or
  retry the SQL. Close the connection and inspect journal/catalog state using a new
  approved connection. Atomic rows should identify which prefix committed; prove
  this with actual crash/network tests before relying on it.
- Rollback/lock-release failures require session closure and investigation. Driver
  errors are not printed raw because they can contain sensitive details.
- Never edit a migration after applying it, change a stored checksum, delete history,
  disable RLS, broaden runtime grants, or DROP CASCADE to make a retry pass. Use a
  reviewed forward correction or separately approved restore on a disposable target.
- Do not mark an existing manual baseline as applied automatically. Its provenance,
  ownership, ACLs and schema must be reconciled separately.

## PostgreSQL acceptance gates after separate approval

Verify real journal ACLs, owner SET authority, the function-default ACL correction,
RLS/constraints, actual restricted logins and inability to recover admin session
authority. Run two real concurrent clients, interrupted statements, lost COMMIT
acknowledgements, replay/checksum/gap cases and restore tests. Also verify selected
Supabase managed-role permissions and session pooling. Offline doubles and syntax
parsing cannot establish any of these enforcement/durability guarantees.
