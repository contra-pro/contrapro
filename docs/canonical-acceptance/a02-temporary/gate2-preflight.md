# Gate 2 final offline preflight

Current run bindings and accepted evidence are recorded in gate2-execution-packet.json.
The historical UNVERIFIED labels and generated-credential examples below are not
the current run procedure. Use gate2-runtime-readiness.md and secure-credential-input.md
for this operator-owned-inbox run. Previously accepted authority, supplement, handler
and external Auth-hook evidence is not reopened by this document. Current drift
checks and missing executable observer bindings remain execution prerequisites.

Recovered operator evidence supersedes earlier UNVERIFIED labels for established
SELECT/DELETE and event-reference facts. See [authority-supplement.md](authority-supplement.md)
for the consolidated current status and the single minimal supplemental file.

**OFFLINE PACKAGE READY FOR REVIEW; LIVE EXECUTION BLOCKED.** No target connection,
Auth call, grant, fixture creation or migration has occurred. No full 495-test
suite or A01 live acceptance rerun is needed for these packaging-only additions.

## Dependency and authority findings

| Requirement | Local finding | Current execution status |
| --- | --- | --- |
| Original core callable by writer-owned wrapper | Accepted postflight records writer EXECUTE; install checks effective EXECUTE and ownership before creating wrapper as that role | Historically evidenced; current live state UNVERIFIED |
| Writer SET installation path | Templates use 0007's temporary postgres-granted SET-only membership and restore it before commit | Current ADMIN-only membership, grantor authority and ability to SET after grant UNVERIFIED |
| Schema CREATE delegation | Needed only during installation; revoked in same transaction | Existing postgres public-schema grant option/ownership UNVERIFIED |
| Cleanup | Exact-ID deletes require existing administrative SELECT/DELETE and superuser/BYPASSRLS; no new grant supplied | Authority and explicit Gate 4 bypass acceptance UNVERIFIED |
| Dependency set | Cleanup expects four specific RESTRICT FKs to identity.users, no custom identity-table triggers/rules, no business references | Live schema/dependency drift UNVERIFIED |
| Auth hooks | Repository migrations contain only clients_guard on tenancy.clients; no Auth-table signup trigger. Local config defines no Auth hooks | Managed/deployed triggers, external Auth hooks and transitive effects UNVERIFIED |
| Native execution | Existing runbook supports pinned CLI 3.1.0 explicit --remote/--workdir, verify-full and one atomic SQL/history batch | Current target, TLS, history and exact pending plan require separately authorized live checks |

Do not equate function ownership with an unconditional EXECUTE grant, ADMIN OPTION
with current SET permission, or BYPASSRLS with schema grant/DDL authority. Read-only
metadata can establish prerequisites, but cannot prove a mutation will succeed:
native transactional guards/rollback remain necessary. Removal authority must be
verified and available before installation; a backup/recovery operator needs its
own independently verified authority. No admin key or password is retrieved here.

## Native Development-only packaging

scripts/a02-native-package.mjs exports fixed-cohort packaging, not a migration runner.
It verifies all eight baseline migration SHA-256 values against the reviewed 0007
manifest, includes the exact baseline files/config, and stages ONE pending lifecycle
migration. No actual file is added to the normal repository supabase/migrations.
No seed, role file, bootstrap or linked-project metadata is included.

For a reviewed non-secret cohort and chosen unused 14-digit native version:

```javascript
import { prepareA02NativePackage, materializeA02NativePackage,
  nominateSyntheticCohort, syntheticCredentialProvider } from './scripts/a02-native-package.mjs';

const cohort = nominateSyntheticCohort(); // UUID proposals only; no Auth users
// Review A/B/U UUIDs; independently verify exact-ID absence before any creation.
const input = {stage:'install',version:reviewedInstallVersion,cohort,appliedTemporary:[]};
const preview = await prepareA02NativePackage(input); // in-memory files + hashes
// Only after local review, explicitly materialize NON-SECRET files outside project:
const staged = await materializeA02NativePackage(input);
```

materialize creates a NEW operator-temp contratpro-a02-package-* root, writes only
its controlled supabase/config.toml/migration files and writes the manifest LAST.
It does not run any command. Reject partial directories without the complete manifest;
verify every actual staged hash again immediately before live planning/deployment.
The manifest always says liveExecutionAuthorized:false; it is not an approval.
Nominations/versions in tests are synthetic examples, never real account evidence.

For disable/removal, appliedTemporary contains exact archived committed receipts
{kind,version,sql,sha256}: [install] normally, or [install,disable] after an emergency
disable. The package preserves those applied files and requires the remote history
to match them exactly before selecting one NEW pending stage. Original expiry/UUIDs
remain unchanged; expired installation bytes are never regenerated with a fresh
expiry. Hash/template/cohort mismatch, missing receipt, wrong order, reused version
or changed baseline stops packaging. A source-template change that alters an applied
file requires reviewed archival handling, not rewriting migration history.

Proposed future plan command, copied from the verified CLI 3.1.0 runbook flags:

```powershell
# NOT run in preparation. Inputs are previously verified executable/CA/package paths.
$env:PGSSLMODE = 'verify-full'
$env:PGSSLROOTCERT = $ca0007
$a02Remote = 'postgresql://postgres.gllsiklbvqpxzucvkehw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=verify-full'
& $cli0007 db push "--remote=$a02Remote" --workdir $a02PackageRoot --profile supabase --dns-resolver native --skip-vault --include-seed=false --include-roles=false --dry-run
```

Before this command, require the operator's credential-bearing process, approved
CA fingerprint, verified current Development Control Plane route, PostgreSQL 17,
exact remote history and complete staged hashes. No password in argv/URL/output;
do not request it in chat. Reject inherited alternate libpq routing/TLS overrides
as in the approved connection procedure. Do not use cached linking, IP replacement,
TLS bypass, include-all, repair or automatic yes. A live dry run itself needs explicit
authorization and is not executed here. Accept exactly manifest.requiredPending,
no missing earlier version and no other pending file. After separate deployment
approval the native command is identical with --dry-run removed; never do that
automatically. No custom executor or separate history INSERT is introduced.

Install, disable and removal are DISTINCT native batches. Do not stage install
and removal together. Never point normal Production discovery at a staged root.
CLI history creation/repair is not authorized; existing native history is required.

## Nomination and secret custody

nominateSyntheticCohort uses cryptographic randomUUID for three distinct proposals,
fixed Development ref and <=15-minute UTC expiry. This is not a database absence
test or permission to reserve/create those identities. Preserve a non-secret private
manifest of approved IDs/hashes/expiry and creation/reconciliation receipts only.

After review of an operator-owned synthetic email domain, an isolated Node process
may call syntheticCredentialProvider(cohort,{approvedDomain,domainOwnershipConfirmed:true}).
It generates three synthetic addresses and independent random 256-bit passwords;
returns only a synchronous provider(label) closure and dispose(). It does NOT log,
serialize, save, read or transmit credentials. Pass the same memory provider to
the separately approved Auth Admin creation calls and bootstrapA02Sessions; never
console.log its return values, write them to manifests, put them in argv or paste
them into a shell. No secrets need to be typed into a command or echoed by a prompt.
No existing credentials or tokens are inspected by nomination/packaging functions.

Admin API authority and the database password must come from the existing approved
operator-controlled secure channel; this helper neither discovers nor loads them.
Keep admin authority separate from ordinary session clients and A02 transport.
Dispose only after approved creation/session work is complete; close the isolated
process when finished. JS strings, previously returned copies, dumps and debuggers
cannot be securely erased by dispose(). Disable transcripts/debuggers/dumps and
protect the operator process. If memory is lost, do NOT recover by updating existing
users or silently rotating passwords: reconcile exact IDs and obtain separately
approved recovery or Gate 4 cleanup. No persistence fallback is supplied.

## Minimal independent evidence checkpoints

| Checkpoint | Required evidence, privately correlated to target/cohort/window |
| --- | --- |
| Before installation/creation | Verified target/TLS/native history; authority-evidence.sql; full private review of discovered Auth/DDL hooks and called functions; effective external Auth-hook configuration; exact A/B/U absence using existing inventory; installation AND revocation authority; cleanup authority and dependencies |
| After installation, before setup | One new native history row, exact approved wrapper body/hash/owner/settings/ACL, original core denied, writer restricted, four original writer policies/column grants unchanged, temporary SET/schema CREATE restored, remaining expiry window |
| After Auth creation, before provisioning | Exactly nominated synthetic Auth IDs, all initially unmapped; review creation-side effects; ordinary verified sessions. No invite/agency/client calls |
| After provisioning | Original inventory all_three_ready, exactly two active distinct users/two links, no U mapping/memberships; independent scoped write/no-business-change evidence; reconcile every attempted write |
| Before disable/removal | Complete cohort request/in-flight transaction accounting; native history and exact archived files; expiry is not cancellation |
| After disable, if used | Independent metadata: wrapper still present but authenticated EXECUTE false, original core false, temporary SET/schema CREATE absent; corresponding native history row |
| After removal | post-removal.sql, original function/ACL/policy/role snapshots unchanged, no wrapper overloads or temporary grants, corresponding native history row; no inference from expiry alone |
| Before/after Gate 4 cleanup | Exact owned mapping/canonical/Auth IDs, current dependency and hook review, no business use, affected-row receipts and exact-ID absence after each committed stage |

authority-evidence.sql is a prepared bounded read-only metadata capture, not an
executed check. It avoids Auth rows, credentials and raw function sources. Hook
fingerprints are change indicators, not proof that hooks are harmless or cryptographic
attestations. The script lists at most 16 Auth triggers/event triggers and flags
overflow; overflow blocks completeness. Private function-body/transitive review
and Supabase Auth Control Plane hooks require separate authorized read access.
Review managed Auth defaults/rules and transitive calls too; the bounded rule
fingerprints are not a proof of harmless expressions or managed provider behavior.
Zero local Auth triggers is not live hook clearance. Metadata guard successes do
not authorize writes or replace proof of current project identity.

Independent mapping, no-change, egress and in-flight observers remain required
ports, not fabricated true flags. Three expected HTTP responses or unchanged
global counts cannot establish these facts. No new general observer framework is
introduced. If those evidence sources cannot be made complete, Gate 2 stays blocked.

## Removal / partial failure decision

- Install transaction fails: native rollback must remove its function/grants/history
  together. Confirm independently; do not apply a removal migration for an absent
  install or repair history. Unknown commit requires finished-session reconciliation.
- Partial Auth/mapping setup or expiry: removal does not depend on any fixture rows
  or an unexpired allowlist. Keep the original rendered removal/authority ready.
- DROP RESTRICT fails: its transaction also rolls back its revoke. A separately
  approved disable.sql.in migration commits revocation WITHOUT DROP. Verify denial
  independently, then resolve the dependency and later remove using a new native
  version and both archived receipts. No CASCADE or automatic retry.
- Authority lost or unknown drift: both disable and removal may fail. Expiry rejects
  new provisioning but does not remove the EXECUTE ACL. Escalate to the preapproved
  owner-capable recovery operator; do not claim cleanup complete or weaken RLS.

Thus expired/partial-cohort removal is supported under the verified unchanged
authority baseline, not guaranteed despite arbitrary privilege/dependency changes.
No live removal or emergency-revocation test has been performed.

## Minimal approval sequence and unresolved blockers

1. Review non-secret nominations, final rendered package hashes/versions, generated
   secret custody and removal/disable/cleanup plans OFFLINE. Preparation is not a grant.
2. Separately authorize only the bounded Development read-only target/history,
   authority, hook and exact-ID baseline checks. Review all results first.
3. Only if accepted, request Gate 2 for exact lifecycle migrations/temporary DDL
   rights, three Auth creations, six session operations, two wrapper calls and the
   explicitly bounded evidence/recovery operations. Stage one migration at a time.
4. Gate 3 remains separate for three A02 GETs; Gate 4 remains separate for privileged
   canonical cleanup/Auth deletes. No approval is implied by a passing offline test.

Gate 2 is still BLOCKED on actual nominations and account absence, current project/TLS/
history, deployment/revocation and cleanup authority, live hook/event-trigger review,
approved native versions/hashes, independently complete observers and explicit
execution authorization. All live prerequisites above are UNVERIFIED, not assumed.

## Targeted offline checks

```powershell
node --test scripts/a02-gate2-preflight.test.mjs scripts/a02-temporary-cohort.test.mjs scripts/a02-identity-inventory.test.mjs
npm exec -- eslint --config apps/web/eslint.config.mjs --rule "@next/next/no-html-link-for-pages:off" scripts/a02-native-package.mjs scripts/a02-cohort-artifacts.mjs scripts/a02-gate2-preflight.test.mjs --max-warnings=0
```

The materialization test writes only an isolated temporary package containing
deterministic offline UUID fixtures, outside the repository; it is explicitly
BLOCKED/non-authorized and contains no credentials. No actual cohort was nominated,
no secret provider was used with real credentials and no live operation occurred.
SQL parsing is local, not SQL execution; PL/pgSQL compilation and PostgreSQL 17
authority semantics remain live prerequisites. The full 495-test suite was not
rerun because no application/session transport behavior changed.

Final result: 45 targeted tests passed (10 new packaging/custody checks plus 35
existing cohort/inventory checks), zero failures; targeted ESLint passed. A static
test initially mistook a quoted privilege name for executable GRANT; its statement
check was corrected. No existing application test failed. Only this preflight
documentation, authority/disable templates, fixed packaging helper, renderer and
targeted tests changed; no normal migration, app config or credential file changed.
