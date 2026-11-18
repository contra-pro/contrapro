# Temporary A02 capability — offline review package

See [Gate 2 final preflight](gate2-preflight.md) for isolated native packaging,
secure random nominations/credential custody, authority/hook evidence and the
separately committed disable path if DROP RESTRICT fails. All remain offline-only.

**NOT DEPLOYED. NO EXECUTION AUTHORIZED.** Development gllsiklbvqpxzucvkehw only.
The Gate 1 design is accepted for preparation, not Gate 2 writes. A01 is not rerun.
Provisioning flag stays OFF and the original provisioning RPC stays denied to
authenticated. These templates are deliberately OUTSIDE supabase/migrations;
no native pending plan, migration manifest, schema/config or application was changed.

## Artifacts and preparation

| File | Purpose |
| --- | --- |
| install.sql.in | Draft Development-only native migration for public.contratpro_a02_fixture_provision() |
| remove.sql.in | Draft removal migration: revoke wrapper, DROP RESTRICT, restore install-role boundary |
| disable.sql.in | Draft separately committed emergency revoke without DROP; usable after expiry |
| authority-evidence.sql | Bounded read-only authority/ACL/hook metadata, requiring live manual review |
| post-removal.sql | Independent bounded read-only absence/privilege checks |
| cleanup.sql.in | Gate 4 privileged exact-ID canonical cleanup, explicit RLS bypass |
| scripts/a02-cohort-artifacts.mjs | In-memory rendering only; no CLI, DB, automatic file writes or deployment |
| scripts/a02-session-transport.mjs | Explicit memory-only Auth bootstrap, one-attempt fixture caller and pinned HTTPS port |
| scripts/a02-temporary-cohort.test.mjs | Static SQL/ownership checks, offline parsing and injected behavior tests |

Operator must nominate three cryptographically random, previously unused synthetic
Auth UUIDs A/B/U and a short absolute UTC expiry. Do not use test UUIDs. Render
with renderCohortArtifact('install',cohort,{now}); cohort contains exactly
{projectRef:'gllsiklbvqpxzucvkehw',A,B,U,expiresAt}. The ISO timestamp must be canonical
YYYY-MM-DDTHH:mm:ss.sssZ, future and <=15 minutes away; SQL repeats the check at
installation. Missing/invalid placeholders cannot be used as executable inputs.
Removal uses the same approved cohort/expiry; allowExpiredRemoval:true permits
rendering removal after expiry, not an installation extension.

Rendering returns a string for review; it does not approve, write or execute it.
After approval, a separately reviewed native deployment package must assign the
new migration version, bind exact rendered bytes/hash to the project, and keep
SQL plus native history atomic. No ready deployment command is supplied. Native
install/removal templates have NO explicit transaction boundaries and MUST NOT
be run statement-by-statement or by plain psql -f. Original migration 0007 is not
edited/replayed. Cleanup is a separate explicit administrative transaction, not
a migration. Never repair migration history manually.
Stage installation and removal in SEPARATE authorized migration plans/windows:
do not place both in the native pending batch and remove the capability before
fixture setup. Both rendered versions remain immutable once applied.

## Ownership/EXECUTE and gateway security

This is not an assumption that owners always retain ordinary EXECUTE privileges.
Reviewed postflight-output.txt line 161 explicitly records EXECUTE for
contratpro_identity_writer on public.contratpro_provision_identity(). The new
wrapper is created while current_user is that same role; inside SECURITY DEFINER
it executes as the writer. Install guards explicitly verify owner AND effective
EXECUTE with has_function_privilege before creating the wrapper and after restoring
installation permissions. If the privilege has since changed, installation fails.

The wrapper calls the ORIGINAL bridge before comparing its result with hardcoded
A/B UUIDs, then calls the original parameter-free function once. It preserves
session_user and the gateway role setting through nested definers, as the existing
bridge expects. It does not set JWT claims, impersonate authenticator, read client
metadata, accept subject parameters or implement identity inserts itself. Original
issuer checks, NOBYPASSRLS writer, FORCE RLS and policies are unchanged. Post-read
requires an active own mapping distinct from all three Auth UUIDs. A post-write
expiry/malformed read-back raises within the PL/pgSQL exception block, rolling back
that invocation before sanitized denial. A lost HTTP response remains uncertain.

The original RPC is NEVER granted to authenticated. The wrapper SQL ACL permits
authenticated callers to reach its guard, but only verified A/B subjects before
expiry may write. U, other subjects and anonymous/invalid gateway credentials do
not gain provisioning access. This distinction was explicitly accepted at Gate 1.
Concurrent unrelated callers cannot change the fixed allowlist or pass a target ID.
Same-subject database concurrency/idempotency delegates unchanged to 0007's unique
constraint/subtransaction handling; this preparation does not prove it live.

PUBLIC EXECUTE is revoked after creation and before the authenticated wrapper grant
inside the SAME transaction; no intermediate committed default-public exposure.
Installing a writer-owned function needs temporary CREATE on public and a new
postgres-granted SET-only membership, using the same installation pattern as 0007.
Both are revoked before commit; the pre-existing supabase_admin-granted postgres
ADMIN-only membership must remain unchanged. These are privileged DDL operations,
not ordinary table-write grants. Live admin/grantor ability, all current memberships,
schema grant options and event-trigger behavior remain prerequisites. A guard
failure rolls back the ENTIRE installation transaction; no partial grants may
be committed. Merely being named postgres or having BYPASSRLS is not proof of
ownership-transfer/grant authority.

## Secure session and HTTPS ports

No credentials are discovered from env, argv, files, cookies, clipboard or browser
storage. No public or admin key was read in preparation. Importing either module
does no I/O beyond module loading. There is no live CLI or automatic fixture action.

bootstrapA02Sessions takes the fixed project, subjects, canonical baseline, public
publishable key and synchronous credentialProvider(label). The provider must
ALREADY hold approved new synthetic credentials in the isolated process. It must
not retrieve/refresh credentials or perform I/O. Pass an explicit AbortSignal,
trusted clock and reviewed send port; there is no default bootstrap send.

For initial wrapper setup use phase:'fixture-setup' and canonical:{A:null,B:null,U:null}.
It obtains all three ordinary password sessions and independently verifies each
through GET /auth/v1/user: six calls max, <=7s each, <=30s phase. Actual server user ID,
authenticated role/audience, non-anonymous status and JWT issuer/expiry must match.
JWT decoding alone is not signature proof; the real Auth verification response
is the authority. No SDK persistence, refresh, debug hooks or session listeners.
Raw Auth responses/refresh tokens are not returned. JavaScript strings cannot be
guaranteed zeroized; keep the process isolated, disable dumps/transcripts/debuggers
and release it after the approved run. Memory-only is not a secure-erasure claim.

createFixtureProvisioner(cohort,{send,confirmMapping,now}) allows one attempt each
for A and B in this process, never U. Each request <=7s; independent exact-subject
mapping confirmation <=2s. Returns confirmed only after valid active, membership-free
read-back; otherwise any attempted write returns uncertain, including lost response,
invalid response or post-write expiry. No automatic retry, including concurrent
duplicate local calls. It does not establish global SQL serialization or authenticate
mocked sessions. Use a separately approved independent mapping observer.

After the two confirmed mappings, independent inventory must report all_three_ready.
Bind those observed canonical IDs to copies of the verified in-memory session objects,
WITHOUT changing tokens, subjects, verifiedAt or expiry. Alternatively bootstrap
phase:'a02' accepts that existing canonical baseline; any additional sign-in calls
need explicit approval. Then remove/drain the wrapper and independently verify
original denial before A02. Arrange approval/observers in advance: the existing
observer requires <=60s verification age and >10s expiry margin. Expired freshness
blocks, never automatically refreshes or changes timestamps.

createA02HttpsTransport() uses direct native HTTPS with certificate/hostname
verification, no proxy, cookies, redirect or retry support, and 7s absolute/idle
limits. Exact allowlist: password issuance POST, Auth user GET, temporary wrapper
POST and auth-access GET on ONLY the pinned project. Admin, refresh, original
provisioning RPC and arbitrary destinations are rejected. Headers are whitelisted;
password request bodies contain only email/password; wrapper accepts no body or IDs.
RPC bodies <=8KiB and Auth bodies <=32KiB. Dependencies are trusted ports, not a
sandbox; no wrapper may add logging, refresh or extra requests. Native TLS success
has not been established offline.

For A02 reuse createCategoryAObserver and collectCase unchanged. Only its three
GETs count toward Gate 3. Independent egress and no-change observers are still
required; do NOT reuse A01's local-server trace as evidence for these HTTPS calls.
Only fixed boolean outcomes and non-secret timing/run metadata may be persisted.

## Removal, ambiguity and cleanup

Expiry closes future wrapper writes, but does not remove the object or cancel an
already-running transaction. Before removal/reconciliation, an approved observer
must establish that this cohort's in-flight transactions finished. Do not kill
unrelated PostgREST sessions or assume REVOKE cancels work. If the function's
post-write check observes expiry, it raises and rolls back. Commit acknowledgements
or network delivery can occur later; expiry is not a transaction-cancellation or
delivery guarantee. The client reports those post-deadline responses as uncertain.
Removal performs a temporary SET-only ownership path, revokes wrapper access,
drops only the wrapper RESTRICT, restores membership and asserts original denial.
If install fails before commit, native transaction rollback restores its grants.
If removal fails, rollback leaves the existing bounded-expiry wrapper; stop and
seek separately approved recovery. Do not touch the original functions or history.

After successful removal, run post-removal.sql through the existing separately
authorized Development verify-full read-only connection, and compare original
function definitions/ACLs, four writer policies, column grants and memberships
with accepted postflight. The script is one component, not a full drift attestation.
No privilege change is authorized by that read-only check. Future JWTs cannot reach
a removed wrapper; original provisioning remains denied.

Gate 4 cleanup explicitly uses an operator role with existing superuser/BYPASSRLS
visibility and DELETE authority. This IS privileged RLS bypass, NOT an RLS-enforced
cleanup function. No new DELETE grant, public admin RPC or CASCADE is introduced.
renderCleanup requires {cohort,canonical:{A:actualUuidOrNull,B:actualUuidOrNull},
authPresent:{A:boolean,B:boolean,U:boolean},privilegedBypassApproved:true}.
That boolean is a rendering guard, not evidence of Gate 4 approval or ownership.
Use actual independently reconciled mappings from the private creation manifest;
never substitute guessed or preplanned canonical IDs (the core generates its own).

The template handles confirmed partial cohorts (zero/one/two pairs) through exact
expected counts. It checks known FK dependencies, custom triggers/rules, Auth
presence and exact mapping pairs; unknown dependencies or business use abort.
Short SHARE ROW EXCLUSIVE identity-table locks can block other Development writes;
the lock wait is <=2s and statement <=5s. Exact canonical rows are locked against
new business FK references. Two deletes, links first then users, assert affected
counts and commit together. Serializable/lock/FK failure rolls back both; never
retry automatically. U is never mapped/deleted from identity tables.
The separately rendered cleanup must be run with the existing verified psql 17
connection and -X -w -v ON_ERROR_STOP=1; do not wrap its explicit transaction in a
native migration or an additional --single-transaction. No cleanup command is
authorized or supplied as an executable entry point in this preparation.

Auth deletion is deliberately separate: after confirmed canonical cleanup, an
approved Development Auth administrator deletes only the three manifested Auth IDs
that actually exist. Installed SDK deleteUser(id,false) includes a preliminary
getUserById: authorize up to six requests, <=7s each, no automatic retries. Its
managed-resource/session effects and live Auth hooks must be reviewed. No SQL
DELETE on auth.users is supplied. On lost response, reconcile that exact ID;
retain an uncertain cleanup record rather than recreating or deleting other users.
Auth deletion does not promise immediate invalidation of already-issued JWTs.
Final independent inventory must show Auth absent and all manifested canonical IDs
absent through exact-ID observation; no broad user enumeration. Keep receipts of
completed partial cleanup, and obtain approval for any resumed operation.

## Exact approvals still required

- **Gate 2:** approved actual A/B/U random IDs, rendered hashes/expiry/native versions,
  verified target/CA and owner-capable installation/removal authority; temporary
  schema CREATE and SET-only membership in one atomic native migration; no original
  RPC grant or app activation. Separately approve three synthetic Auth creations
  through Auth Admin (not implemented by these ports), six session operations,
  at most two wrapper calls, bounded independent observations and the removal
  migration/read-only verification. Auth/mapping recovery calls need explicit bounds.
- **Gate 3:** three A02 GETs only, existing synthetic sessions and independently
  approved egress/no-change observers. Setup approval does not authorize these reads.
- **Gate 4:** bypass acknowledgement, verified administrative DELETE and Auth-delete
  authority, exact reconciled IDs/ownership, dependency checks, temporary table-lock
  impact, canonical transaction and bounded Auth deletes/reconciliation. It is not
  automatic compensation for Gate 2 failures.

Blocked execution prerequisites: actual nominations/ownership, current deployment
and cleanup authority, live Auth hook/dependency review, protected credential input,
native deployment package/history/version review, PostgREST schema-cache visibility,
independent mapping/no-change/egress/in-flight observers and all separate approvals.
No root script, password prompt, admin credential loader or unattended executor is
provided. All live gateway/RLS, same-subject concurrency, revocation and cleanup
semantics require authorized Development verification; parser and mocks are not
substitutes. Unresolved requirements block execution, not permission to improvise.

## Offline validation

Commands and results are recorded after verification below. SQL parsing uses the
installed pgsql-parser 18.x locally; it parses statements without a database and
does not compile PL/pgSQL bodies or prove PostgreSQL 17 runtime semantics. Actor,
concurrency and ambiguity tests exercise injected operator ports; SQL security
checks verify the rendered guards/ACLs and unchanged gateway delegation structurally.

```powershell
node --test scripts/a02-temporary-cohort.test.mjs scripts/a02-identity-inventory.test.mjs
node --test --test-name-pattern="A02|session|JWT|configuration|transport" scripts/canonical-category-a-observer.test.mjs
npm run test --workspace=@contratpro/web -- src/auth src/agency src/clients src/components/dashboard.test.ts src/components/mvp-journey.test.ts src/components/agency-access-view.test.ts src/components/agency-management.test.ts src/components/clients.test.ts
npm run typecheck --workspaces
npm exec -- eslint --config apps/web/eslint.config.mjs --rule "@next/next/no-html-link-for-pages:off" scripts/a02-cohort-artifacts.mjs scripts/a02-session-transport.mjs scripts/a02-temporary-cohort.test.mjs --max-warnings=0
```

Results: 29 new cohort tests + 6 inventory checks + 25 existing selected observer
tests + 435 application regressions = 495 passing tests, zero final failures.
Workspace web/database TypeScript and targeted ESLint pass. An initial static
test incorrectly classified PL/pgSQL BEGIN as a transaction boundary; it was
corrected to inspect statement parsing as well. No application test failed.
No live HTTP/SQL, credentials, users, grants, deployment, activation or A01 live
requests were used. The only affected files are this package, its three scripts
and the acceptance README pointer; unrelated files were not edited.
