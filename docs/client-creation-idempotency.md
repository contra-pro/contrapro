# P3 client original-creation idempotency — local implementation only

Draft: `supabase/migration-drafts/20261118000900_client_creation_idempotency.sql`.
Nothing has been deployed or executed against a database. P3 live acceptance remains
BLOCKED. Canonical provisioning and vehicle persistence remain OFF. No flags changed.
Git status is unavailable: this supplied workspace has no Git repository metadata.
The deployed 0006 bytes are pinned by an offline SHA-256 regression; no deployed
migration, frozen inventory, A02 artifact or vehicle implementation is changed.

## Storage and authority

The receipt is `(agency, creation key, creator, client ID, format version, digest)`
in `app_private.client_creation_receipts`, postgres-owned with ENABLE/FORCE RLS.
No payload or digest column is added to publicly readable clients. No plaintext
original data is duplicated. The SHA-256 input is a domain/version-framed JSONB
object containing agency/key/creator and canonical details. It is not an HMAC,
encryption, anonymization or protection against dictionary attacks if compromised.
Confidentiality relies on table/column ACLs and RLS; privileged administrators can
still see digests and potentially guess original data. No secret-management burden
or hardcoded key is introduced. Equality is an intentional authorized replay oracle.

One new capability role is necessary: `contratpro_client_receipt_writer`, NOLOGIN,
NOINHERIT, NOBYPASSRLS, no superuser/role/database creation/replication. Reusing the
agency writer would require widening its owner-specific agency visibility and
would unnecessarily couple receipt access to its existing agency write powers.
The receipt role has only self-scoped identity/active-membership/permission metadata
reads, receipt SELECT/INSERT, and explicitly needed helper EXECUTE. It has **zero
client-table SELECT/INSERT/UPDATE**, as do the five existing internal roles.

Only two fixed-schema, fixed-search-path, row_security=on functions are definer:
an AFTER INSERT trigger that captures the actual guarded row, and a comparison
returning boolean/NULL, never an ID or digest. Their owner is the restricted role,
not postgres and not either table owner. Ordinary callers cannot insert, update,
delete or read receipts, disable the trigger, or directly invoke a trigger-returning
function with invented NEW values. Foreign-key integrity checks are PostgreSQL's
normal RI machinery; no new administrative table-read bypass is exposed.

The public create RPC remains SECURITY INVOKER. Normal client RLS, canonical subject,
read/create permission, agency and creator checks are retained. New metadata policies
apply only to the new non-inheritable role and do not broaden authenticated policies.
Temporary migration-only SET membership and private-schema CREATE are revoked in the
same atomic batch. The postcondition rejects residual SET/INHERIT membership, unsafe
role flags, wrong definer ownership/settings, unexpected receipt ACLs or any internal
role client-column privilege. A provider's independent postgres ADMIN-only membership
may remain, but not SET/INHERIT. Live ownership-transfer authority remains unverified.
The matcher EXECUTE grant is completed while postgres still owns it, before
transfer to the SET-only receipt writer, following 0005's safe grant pattern.
After temporary membership revocation, an independent postcondition requires
effective authenticated EXECUTE; an absent grant can no longer pass ACL review.

The draft explicitly uses `pg_catalog,pg_temp` (temporary schema last), qualified
sensitive types and qualified application relations. Forward ALTERs harden the
existing invoker canonical/agency/client helper paths, including client_guard,
without editing historical files or helper owners/ACLs. The managed auth.uid is
not modified: an unsafe path override fails deployment; effective auth schema
USAGE, auth.uid EXECUTE and PL/pgSQL USAGE for the new writer are mandatory
postconditions. A managed SECURITY DEFINER auth.uid also fails the precondition.
Nullable catalog settings fail closed. Temporary failing uuid/jsonb/text/date/
regclass domains are prepared adversarial acceptance vectors, not executed tests.

## Canonical form and replay

The HTTP boundary still uses `validateClient`; no public HTTP or create RPC signature
changes. Optional fields become empty strings; omitted identity type becomes `none`;
explicit null/non-string/unknown keys and empty identity type are invalid. Whitespace
uses the ECMAScript trim set. Fields are bounded in UTF-16 units before casing, like
TypeScript. Internal notes tabs/newlines remain significant; forbidden controls are
rejected. Document/licence formats and date validity/order/UTC future-date rules
are explicit in both validators. A forward-only valid_client wrapper delegates to
the new bounded normalizer, so existing client guard/update validation shares the
contract. SQL date NULLs serialize back to empty strings.

Both runtimes use one generated Unicode 17.0 default-case profile, including
contextual Greek Final_Sigma and multi-character expansions, independent of provider
locale/ICU. Profile SHA-256:
`1acc7a0731e8290d474c4dd76c0b0b37447d71bf228d6c3c1986412e3e6958ef`.
`node scripts/generate-client-unicode.mjs --check` reproduces both artifacts and
requires Unicode 17.0 locally. TypeScript tests compare every Unicode scalar with
the pinned generator runtime, plus contextual strings. Actual PostgreSQL execution
parity remains UNVERIFIED. No NFC, IDNA or case-insensitive name matching is added.
SQL format/control regexes explicitly use the pg_catalog C collation, matching
TypeScript's explicit ASCII ranges instead of depending on database locale.
Never change a deployed profile in place: that requires a separately versioned migration.

Before expensive processing, raw fields are limited to 8,192 UTF-8 bytes and raw
JSON to 32,768 bytes. SQL checks datum size before JSON expansion, actual serialized
size before field iteration and raw/character length before UTF-16 scans. Scans
are bounded by the field limits; the casing helper and definer comparison also
enforce bounds. PostgreSQL/PostgREST must still parse received JSON: supported
gateway body limits and server timeouts remain deployment prerequisites. TypeScript
additionally rejects unpaired surrogates; JSONB cannot represent these. Raw padding
above the new caps and case-expanded values exceeding field limits are rejected.
These are deliberate bounded-input restrictions; normal supported casing is retained.

New rows acquire an immutable receipt in the same transaction, including direct
authenticated inserts. Trigger failure rolls back the row; there is no partial
receipt save or retry. Updates and archives never overwrite the original receipt.

At READ COMMITTED, transaction advisory locking serializes each agency/key across
RPC requests. The lock input is `contratpro.client-create.v1:<agency>:<key>`;
Vehicles' lock implementation is unchanged. Hash collisions can over-serialize,
never establish replay equality. Comparison uses a VOLATILE fresh snapshot after acquiring the lock.
Identical original payload/creator returns the same active ID after edits. Changed
payload or creator returns 40001, mapped to HTTP 409 without IDs/digests. A matching
archived original returns P0002/404; changed or legacy archived keys may return the
same generic conflict. Key collisions with direct INSERT races fail closed with
40001; a subsequent explicit authorized replay can reconcile. Never auto-retry.

The active-row SELECT is the replay linearization point. FOR UPDATE is deliberately
absent: its UPDATE RLS requirement would exclude legitimate read+create-only members.
A concurrent archive after that point can cause HTTP read-back to become uncertain;
no active detail/success is then claimed. Other transaction isolation levels may
yield serialization conflicts rather than a successful replay and need review.

## Legacy rows, application rollout and rollback

There is NO backfill. Even version 1 or current fields cannot prove the original
creation request. All existing rows without receipts remain readable/editable under
existing rules, but replay of their old key conflicts. Archives retain their receipt;
physical deletion is restricted. Do not recreate an uncertain legacy operation with
a new key to force success: reconcile its already persisted row first.

The data-free invoker RPC `contratpro_client_creation_contract()` returns integer 2.
It is installed atomically with the hardening. Before create, the new handler requires
exactly 2; missing/error/malformed markers stop before mutation. This prevents an
application-first deployment from trusting the old vulnerable UUID-returning RPC.
After create/replay, authorized active detail read-back is still mandatory, but
current fields need not match the immutable original. Update read-back still compares
fields and the expected version. All public response shapes and 40001→409 stay intact.

Deploy only after separate review/authorization via the existing atomic native CLI
procedure and immutable package hashes. Do not put the draft into either frozen
inventory automatically. 0006/0005/0004/foundation are dependencies; vehicle 0008 is
not. Select migration 0009 only under a separately reviewed actual-history plan.
The isolated package, pinned ten-file inventory, prerequisite SQL and exact native
dry-run/deployment/recovery procedures are in [deployment-0009/README.md](deployment-0009/README.md)
and [manifest.json](deployment-0009/manifest.json). Its stage contains byte-verified
0000–0008 baseline files plus 0009; only 0009 may be pending. Project identity,
authority, TLS and live checks remain unverified until independently observed.
Preflight must verify new-role/object/policy absence, existing FORCE RLS/column ACLs,
provider CREATE ROLE/SET/ownership-transfer authority, managed Auth helper semantics
and statement/lock timeouts. The migration refuses unknown/disabled client triggers
or a changed guard owner/security type. It must not silently adopt existing role/receipt objects.
If an earlier local variant of 0009/marker 1 was already deployed, STOP: this draft
cannot be rerun or substituted for deployed history. Prepare a separate forward migration.

Pause client creates during cutover and drain old application processes. Apply the
whole migration plus native history atomically; old application code can conservatively
return uncertain for post-edit replay until replaced. Deploy the new application,
verify schema-cache marker visibility and independently validate actual permission,
RLS, receipt confidentiality and canonicalization before re-enabling any client gate.
No gate is activated by this implementation. Missing marker safely blocks create.

On pre-commit failure: transaction rollback, no repair. On lost response: stop; review
native history, complete catalogs, role memberships, trigger/ACL state and completed
deployment session independently before another action. Never blindly rerun.
After commit: keep client creation disabled through separately authorized operations
if needed, preserve receipts/rows/history, and roll forward. Do not restore the old
RPC, drop receipts, disable their trigger or recompute digests from edited rows.
Any eventual retention/administrative cleanup needs separate exact-ID review.

## Tests and blocked live acceptance

Current offline suites exercise the real HTTP handler with injected RPCs, SQL and
PL/pgSQL parsers, static privileges/ownership/order assertions, TypeScript canonical
vectors and an explicitly labelled in-memory serialization specification. They are
not PostgreSQL execution, lock behavior, transaction atomicity or live RLS proof.

Local verification commands and results:

```text
npm run test --workspace=@contratpro/web -- --maxWorkers=2
  631 passed, 0 failed
npm run test --workspace=@contratpro/database -- --maxWorkers=2
  711 passed, 0 failed
npm run test --workspace=@contratpro/database -- tests/client-idempotency.test.ts tests/clients.test.ts --maxWorkers=2
  34 passed, 0 failed (includes explicit isolation regression)
npm run test --workspace=@contratpro/web -- src/clients/validation.test.ts src/clients/handler.test.ts src/clients/idempotency.test.ts src/clients/unicode.test.ts src/components/mvp-journey.test.ts --maxWorkers=2
  118 passed, 0 failed
node --test scripts/client-idempotency-acceptance.test.mjs
  8 passed, 0 failed; includes installed/locked exact driver regression; never executor invocation
node scripts/generate-client-unicode.mjs --check
  PASS; Unicode 17.0, 1488 lower / 1580 upper mappings
npm run typecheck
  Both workspaces passed
npm exec --workspace=@contratpro/web -- eslint --config eslint.config.mjs src/clients/handler.ts src/clients/handler.test.ts src/clients/idempotency.test.ts src/clients/unicode.test.ts src/components/mvp-journey.test.ts --max-warnings=0
  Passed
npx --no-install eslint --config packages/infrastructure/database/eslint.config.mjs packages/application/src/clients.ts packages/application/src/client-unicode.ts packages/application/src/client-unicode-data.ts packages/infrastructure/database/tests/client-idempotency.test.ts scripts/generate-client-unicode.mjs scripts/client-idempotency-acceptance.mjs scripts/client-idempotency-acceptance.test.mjs --max-warnings=0
  Passed
```

The earlier pre-remediation all-workspaces-concurrent check timed out one existing
frozen-artifact test at 5 seconds. Current complete two-worker suites pass without
changing that test or its timeout. Focused web tests also passed 118/118.
The full-suite counts above precede the driver/isolation readiness correction;
that correction reran the focused database and launcher suites plus typecheck,
targeted lint, formatting and frozen-hash checks, without database execution.
Targeted formatting checks cover UTF-8/no BOM, no trailing whitespace and final
newlines for all 15 touched artifacts; no repository-wide reformat was performed.
Eight original native hashes, Vehicles draft/configuration and 56 A02 source hashes
still match their existing manifests. No database-backed test or prepared acceptance
launcher was executed. SQL and PL/pgSQL parsing is static validation only.

Prepared launcher: `scripts/client-idempotency-acceptance.mjs`, deliberately without
a CLI, import-time execution or executable invocation in offline tests. A future
reviewed operator entrypoint must first call prepareClientAcceptance with explicit
approval scope/window/reference, exact Development metadata, fresh independently
captured database OID/server address/port, control-plane/database evidence references,
four distinct synthetic subject/agency UUIDs and an ownership reference. Every one
of those actual run bindings is currently UNBOUND. References are not signatures.
Only after separate approval may executeClientAcceptance receive that one-shot plan
and an existing memory-only observer credential provider (provide/dispose), with
password and trusted CA bytes supplied outside command arguments/repository files.
Do not invoke the SQL directly using ambient psql connection settings.

The launcher pins native Node pg 8.23.1, matching the exact dependency, lockfile
and installed package, the Development session pooler, qualified
username, database, CA hash and reviewed SQL hash. Native TLS enforces chain and
hostname verification (`rejectUnauthorized`, SNI and checkServerIdentity), the
verify-full security requirement rather than a libpq sslmode string. Any ambient
PG configuration or known debugger/preload/TLS-key logging configuration stops
execution. A read-only fingerprint probe and verified TLS socket precede acceptance
SQL. Connection/query/statement/lock/idle deadlines are bounded and an overall
20-second monotonic timer closes the transport. This is cooperative cancellation,
not proof of server termination or rollback; ambiguous results remain UNKNOWN and
must never be automatically retried. Protected runtime/provider logging is still
independent required evidence. JavaScript credential copies are memory-only, not
guaranteed zeroized; disposal and process custody remain required.

Requires separately authorized Development/disposable test-database writes, verified
verify-full target/CA/process-only credentials and permission to SET ROLE authenticated.
Two independently established synthetic mapped subjects must have read+create in A;
subject A also needs update+archive and must have no access to B. No A02 cohort is
created/reused. The script creates no Auth identities or roles. All client/receipt
writes and hostile temporary-domain DDL are in one ROLLBACK transaction; these
temporary objects also require explicit acceptance authorization. Failure closes
the connection; the script is neither a deployment nor a complete acceptance suite.
The transaction explicitly begins at READ COMMITTED; the prerequisite guard
independently asserts transaction_isolation before any temporary DDL or client
mutation. Unexpected session isolation defaults cannot silently select another mode.
Its synthetic SQL claim settings test database RLS, **not JWT/gateway verification**.
No real tokens/passwords or PII belong in variables, logs or fixtures.

Still BLOCKED: real gateway subject preservation through the new definer role;
anonymous/unmapped/revoked permission rejection; real non-owner read+create-only
creators; legacy key replay; rollback without orphan row/receipt; metadata privilege
assertions; canonical Unicode/date vectors on PostgreSQL 17; real two-session locking.
For concurrency, use separately authorized disposable test state: session A holds an
open create transaction, session B calls the same agency/key, verify B waits, then
commit A. Same creator/payload must return A's ID, different payload/creator must
raise 40001; rollback A must allow one new row+receipt. Independent persisted-state
checks and cleanup authority are required before those committed test writes.
No live acceptance result is claimed or marked complete here.

## Remediation decision

| Boundary / finding | Offline result | Still requires PostgreSQL / gateway evidence |
|---|---|---|
| Definer ownership, explicit trusted paths, transitive helpers, no temporary-type resolution | PASS: parsed SQL, settings/ACL assertions, prepared hostile domains | Ownership transfer, effective privileges, real adversarial execution |
| Raw JSON/field budgets before Unicode/UTF16 work | PASS: bounded source and oversized regressions | Real RPC rejection, gateway body budget and server timing |
| One SQL/TypeScript normalization profile | PASS: generated shared data and exhaustive JS scalar/context tests | Actual PostgreSQL normalization/date/UTF16 vectors |
| Development-only acceptance transport | PASS: pure negative preparation/TLS identity checks, pinned SQL | Actual approval/custody/target bindings and TLS handshake |
| Clients-specific advisory namespace | PASS: domain prefix and unchanged Vehicles hash | Multiple sessions, commit/rollback races and supported isolation |
| Immutable receipts, creator/tenant/archive/legacy behavior, atomicity | PASS: static and synthetic/handler tests | Real RLS, receipts with failed writes, independent persisted-state reads |
| Contract marker 2, conflict 409, no mutation retry | PASS: real handler with injected RPCs | Deployed schema cache and authenticated gateway contract |

Offline remediation is complete. **Live acceptance verdict: BLOCKED** until its
separate authorization, actual run bindings and remaining PostgreSQL/gateway tests
exist. The prepared launcher is not itself a completed acceptance result. No SQL,
launcher, role change, fixture creation, deployment or flag change occurred.

## Final ownership and staging remediation

The local deployment package is **READY FOR READ-ONLY DEVELOPMENT PREFLIGHT**,
not authorized for any connection or migration. Its manifest binds the actual
outside-repository stage, ten ordered migration hashes and the prerequisite SQL.
Read-only preflight must establish missing target, TLS, authority and prerequisite
evidence; exit 0 still requires manual review. Live acceptance remains BLOCKED.

Verification for this final ownership/package batch:

```text
npm run test --workspace=@contratpro/database -- --maxWorkers=2
  716 passed, 0 failed
npm run test --workspace=@contratpro/database -- tests/client-idempotency.test.ts tests/clients.test.ts --maxWorkers=2
  38 passed, 0 failed after final inventory edits
node --test scripts/client-idempotency-acceptance.test.mjs
  8 passed, 0 failed; execution function never invoked
npm run typecheck
  Passed after correcting test AST nullability
npx --no-install eslint --config packages/infrastructure/database/eslint.config.mjs packages/infrastructure/database/tests/client-idempotency.test.ts --max-warnings=0
  Passed
node scripts/generate-client-unicode.mjs --check
  PASS; generated profile unchanged
```

SQL/PLpgSQL parsing remains offline only. Inventory AST tests allow only SELECT,
transaction-control and local-settings statements, with an explicit catalog-reader
function allowlist. Initial verification found an unsupported assertion matcher
and a test AST nullability error; both were corrected without weakening checks.
No PostgreSQL behavior or actual deployment authority has been tested.

## Read-only preflight safety closure

The prerequisite inventory now limits migration-history candidates to ten BEFORE
aggregation, validates exact fourteen-digit versions and the expected nine-version
set, and checks the result before printing history. Materialized candidate sets
bound column/constraint/trigger/policy checks. Pre-output guards reject excess
rows, oversized definitions/predicates, invalid policy roles and malformed,
duplicate, unknown or oversized proconfig entries. Output projects only bounded
definitions and reviewed settings; event-trigger tags are bounded too. No raw
rejected value is emitted. This is catalog evidence, not PostgreSQL behavior proof.

`scripts/p3-readonly-preflight.mjs` is the only documented operator execution
entrypoint. The command, exact non-secret configuration fields and limitations are
in deployment-0009/README.md. It pins the approved manifest/SQL/binary/CA, explicit
Development connection and startup READ ONLY settings, then supervises only that
psql script. A 20-second deadline covers configuration I/O, execution and final
output delivery. Cancellation requests process termination, suppresses late
continuations/output and never retries. No failed termination, timeout or disconnect
is represented as proof of server cancellation or rollback. OS suspension can
delay timers; native/pooler behavior remains independently unverified.

Offline verification includes injected-process deadline/error/output-cap tests,
adversarial bound specifications (explicitly not SQL execution), production-source
guard assertions, SQL/PLpgSQL parsing, database regressions, typecheck, targeted lint,
formatting and source/stage hash comparisons. No native psql process or live
operation is performed by these tests. The migration draft and all historical,
Vehicles, Provisioning and A02 artifacts remain unchanged by this closure.
