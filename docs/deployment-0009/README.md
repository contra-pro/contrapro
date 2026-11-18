# P3 0009 — offline Development deployment package

Target ONLY: `gllsiklbvqpxzucvkehw`. Status: prepared locally; no live operation,
deployment, fixture creation or flag activation is authorized by this package.
The generated manifest records the actual isolated staging directory and hashes.
The repository native migration directory is deliberately unchanged (0000–0007).
Vehicles 0008 is copied from the reviewed draft, never edited or rerun remotely.

## Fixed artifacts and reconstruction

`manifest.json` pins ten migration filenames, versions, repository source paths,
absolute source paths, SHA-256 values, native configuration and the prerequisite
inventory. The first nine versions must already exist remotely; only
`20261118000900` may be pending. Bind the CLI 3.1.0 executable and verified checksum
independently; no CLI is downloaded, discovered, invoked or approved here.

To reconstruct locally, choose a NEW empty directory outside the repository.
Read this manifest, verify every source hash BEFORE copying, then copy exactly
the ten listed files to `supabase/migrations/` under that directory, the pinned
configuration to `supabase/config.toml`, and the inventory/README/manifest for
review. Copy bytes without normalization, fail if any destination exists, and
verify destination hashes and exact migration filename set. Never delete or
repair a partial stage automatically. A changed source requires renewed review
and a new manifest, not silently recalculating its approved hash at execution.

The supplied 0008 bytes match the existing reviewed Vehicles manifest. This does
not independently establish the bytes actually deployed; reconcile that evidence
before live migration planning. Source hashes establish artifact identity, not
project identity, operator authority or database commit.

## Prerequisite evidence — separate read-only execution authorization

Prepared script: `scripts/preflight-client-idempotency-0009.sql` (copied into stage).
It uses a repeatable-read READ ONLY transaction, trusted search path, statement 5s,
lock 2s, idle 10s and final ROLLBACK. It calls no application RPC, performs no
SET ROLE, creates no temporary objects and reads no Auth/customer records. Its
only application-data read is a bounded check of four fixed permission keys. Failure exits under
ON_ERROR_STOP; incomplete connections must close, never retry automatically.

Required independent inputs, all currently UNBOUND:

- Current Control Plane evidence for the exact Development reference, session
  pooler hostname, port 5432, qualified postgres username and database postgres.
- Trusted CA absolute path/provenance/hash/validity and a protected process-only
  password channel; PostgreSQL 17 psql executable. Never supply secrets in argv,
  transcripts, receipts, connection URLs or repository files. No secret discovery.
- Independently captured database OID, backend address and backend port bound to
  that route; non-secret target/TLS evidence references. SQL compares these values
  but cannot independently authenticate a reference supplied by the caller.
- Confirmed credential custody, safe local/provider logging and an external
  20-second process deadline. On timeout terminate the client and reconcile;
  a timer or a disconnect alone is not proof of server termination or rollback.

Client setup must explicitly pin the reviewed host, port, database and qualified
user, `PGSSLMODE=verify-full`, and the approved `PGSSLROOTCERT`. Reject conflicting
service/password-file/proxy/TLS settings and unset target values. Do not fall back
to insecure TLS, verify-ca, a linked project or a default/local target.

Only AFTER independent bindings and separate read-only authorization, use the
staged one-purpose supervisor, never the raw psql/acceptance/migration commands:

```powershell
& $verifiedNode24 "$p3Stage/scripts/p3-readonly-preflight.mjs" --run-reviewed-preflight $approvedPrivatePreflightConfig
```

The absolute non-secret JSON config is operator-owned outside Git. It must contain
EXACTLY these fields (real values remain UNBOUND until independently supplied):
projectRef=`gllsiklbvqpxzucvkehw`, scope=`P3_READ_ONLY_CATALOG_PREFLIGHT`,
authorizationReference, targetEvidenceReference, tlsEvidenceReference, windowStart,
windowEnd (UTC epoch milliseconds, at most two hours), psqlPath, psqlSha256,
psqlMajor=17, caPath, caSha256, manifestPath (staged manifest), manifestSha256,
databaseOid (decimal string), serverAddress and serverPort. The manifest hash must
come from the separately reviewed packet, not a newly trusted self-description.
Pin the verified psql 17 binary and official CA bytes/provenance/validity. References
are assertions requiring independent review, not signatures or project proof.
Do not put passwords, tokens, private emails or credential-bearing URLs in config.
The only credential input is the existing, explicitly approved process PGPASSWORD;
no new prompt, credential discovery, refresh or login is implemented.

The supervisor is inert on import. Its explicit command starts a 20-second timer
before config I/O, checks monotonic elapsed time and expiry, and limits the entire
CLI lifetime, including stdout delivery. It validates manifest, fixed sibling SQL,
psql and CA hashes BEFORE launching exactly one native psql process, without a
shell. It supplies an explicit Development route, verify-full, CA, startup default
READ ONLY and server timeouts; inherited PG target/service/passfile/options and
proxy settings are excluded. -X disables startup scripts; -w prevents prompts.
Known debugger/preload/TLS-key logging settings block execution. No acceptance,
migration, dry-run or other SQL filename can be selected through this interface.

On expiry/failure/output overflow it requests SIGKILL (native process termination
on Windows), discards captured output and never retries or launches a continuation.
An outer timer aborts that child before exiting the supervisor nonzero at the
20-second deadline; a delayed exit zero is rejected by monotonic checks. Timers are
subject to OS/event-loop scheduling and cannot act during machine suspension.
Failed/unconfirmed termination is NOT proof that the process or backend stopped.
Even successful client termination does not prove server cancellation or completed
rollback; retain UNKNOWN status and investigate independently. Native termination,
pooler behavior and runtime timing remain live verification items.

Stdout is capped at 4 MiB, stderr at 16 KiB. Failure diagnostics are constants;
stderr and partial output are never replayed. Only successful bounded catalog
output is emitted, followed by CATALOG_CAPTURED_MANUAL_REVIEW_REQUIRED. Store it
only in an approved private evidence destination. A missing marker, stderr, nonzero
exit or timeout is failure, not partial success. Server/provider logging safeguards
and protected runtime custody remain prerequisites, not assertions of this code.
The SQL's own final marker remains
`CATALOG_CAPTURED_MANUAL_TARGET_AUTHORITY_PRIVILEGE_AND_CACHE_REVIEW_REQUIRED`.
Neither marker is migration readiness or live security acceptance.

Review every scoped row and full helper definition. Require exact 0000–0008 history,
all metadata/Clients/Vehicles ownership and FORCE RLS, required client constraints,
original Clients privileges and zero internal-role client-column privileges.
Require all fourteen helper/RPC definitions; safe managed auth.uid invoker/path;
unchanged client guard; absence of ALL partial 0009 objects. Oversized/missing or
truncated evidence blocks approval before metadata output. History validation reads
at most ten candidates, requires fourteen ASCII digits and exact nine-version
equality, then prints history. Column/constraint/trigger/policy candidate caps are
257/33/17/65 (one extra detects overflow); output caps are 256/32/16/64. Definitions
and predicates are limited to 8 KiB; helper definitions to 32 KiB, event handlers
to 16 KiB. proconfig permits at most eight 256-byte entries, only reviewed
search_path/row_security forms; duplicate/unknown keys and values fail without raw output. Review schema USAGE/CREATE delegation, table/
column SELECT delegation, helper EXECUTE delegation, role-creation authority,
creator membership configuration and language/PUBLIC auth.uid EXECUTE availability.
The new role's effective privileges and ownership transfer cannot be execution-
tested read-only; migration assertions must independently enforce them.

## Native pending plan and deployment — separate authorizations

Use the previously source-reviewed native CLI **3.1.0** procedure from
`../deployment-0007/README.md`. Do not substitute the custom migration runner.
`$p3Cli`, `$p3Stage`, `$p3Ca` and `$p3Target` are reviewed absolute paths/target
bindings, not ambient defaults. `$p3Target` is the password-free explicit URL for
the exact approved Development session-pooler route with sslmode=verify-full.
Credentials stay in the protected operator process. No fallback to a password file.
The CLI trust, CA file, effective TLS policy and exact target must be independently
rechecked before either command. Pin PGSSLROOTCERT to `$p3Ca`; reject overrides.

After separately authorized read-only preflight and dry-run access:

```powershell
& $p3Cli db push "--remote=$p3Target" --workdir $p3Stage --profile supabase --dns-resolver native --skip-vault --include-seed=false --include-roles=false --dry-run
```

Require exit 0 and EXACTLY `20261118000900_client_creation_idempotency.sql` pending.
Stop if 0008/any other version is pending, history differs or identity/TLS is unknown.
Capture the sanitized plan independently, recheck ALL staged hashes, then obtain
separate approval of that exact migration, authority, target and maintenance window.
Pause all client creation paths and drain old processes without changing unrelated
feature gates. Application gating alone does not revoke direct database access.

Only after explicit migration authorization:

```powershell
& $p3Cli db push "--remote=$p3Target" --workdir $p3Stage --profile supabase --dns-resolver native --skip-vault --include-seed=false --include-roles=false
```

The native executor must apply the whole compatible file AND its native
`supabase_migrations.schema_migrations` INSERT in one atomic batch. Do not add
explicit BEGIN/COMMIT around the migration, run fragments, manually insert history,
repair history, include seeds/role files or use --include-all. Role creation inside
0009 is part of the reviewed migration; --include-roles=false does not omit it.

## Postflight, schema cache and recovery

On a new verified read-only connection, independently require exact 0000–0009
history and all complete 0009 objects/definitions/owners/ACLs/policies/constraints.
Require effective authenticated matcher EXECUTE, no capture EXECUTE for ordinary
roles, correct restricted function owners/settings, metadata FORCE RLS and zero
client-table privileges for all six internal roles. Verify no residual temporary
SET/INHERIT membership or private-schema CREATE. Preserve original provisioning
EXECUTE denial, application provisioning OFF and Vehicles flag OFF.

The captured PostgREST DDL handler issues `NOTIFY pgrst, 'reload schema'` for relevant
DDL. Reconfirm that current handler/listener behavior; historical source is not
delivery proof. Require actual schema-cache visibility of contract marker 2 before
allowing the marker-2 application to create clients. A manual notification, if
needed, is a separately reviewed/authorized action, never an automatic repair.
Do not invoke create to test cache availability. No cache refresh is executed here.

Before commit: allow atomic rollback, independently verify it, no repair.
Lost response/timeout: stop; do not retry. Independently inspect native history,
complete catalog state and original deployment-session termination. Complete
matching state supports commit; absent state alone does not establish finality
while work may remain in flight. Partial, mixed or inaccessible evidence is UNKNOWN.
After commit: preserve history, rows and receipts; contain client creation via
separately approved controls and roll forward. Never restore the vulnerable create
RPC, drop/disable receipts or reconstruct them from mutable rows. Privileged
database containment/cleanup requires its own scoped approval.

No backfill is supplied: pre-0009 creation keys conflict rather than claim an
unknown original payload. Controlled PostgreSQL acceptance (including temporary
domains and rollback fixture writes), gateway identity tests and multi-session
concurrency are separate authorizations AFTER accepted deployment postflight.
