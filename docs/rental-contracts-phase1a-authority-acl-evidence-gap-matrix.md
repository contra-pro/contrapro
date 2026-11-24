# Phase1A — Authority and ACL evidence gap matrix

**OFFLINE EVIDENCE ANALYSIS ONLY. Production Migration / Deployment: NO-GO.**
Only this new report was created. No query/SQL, database connection, role/privilege
operation, migration or application change occurred. Q14 remains BLOCKED. Previous
Q01–Q16 approvals are not blanket permission for new collection or execution.

## 1. Evidence inventory and confidence

Read all23 existing rental-contracts Markdown reports, especially the
[restrictive policy proposal](rental-contracts-phase1a-restrictive-acl-policy-proposal.md),
[initial ACL baseline review](rental-contracts-phase1a-initial-acl-baseline-review.md),
[exact ownership design](rental-contracts-phase1a-exact-ownership-scope-design.md),
[remediation plan](rental-contracts-phase1a-remediation-plan.md),
[consolidated assessment](rental-contracts-production-catalog-q01-q16-consolidated-readiness.md),
[evidence reconciliation](rental-contracts-production-catalog-evidence-reconciliation.md),
[canonical query pack](rental-contracts-production-catalog-query-review.md), batch/audit/
hotfix/final-review reports and [current inactive draft](../supabase/migration-drafts/20261120001300_rental_contracts.sql).
[Manifest](../packages/infrastructure/database/manifests/rental-contracts-phase1a.json)
was inspected as source/design metadata, not actual Production ACL evidence.

### Directly read raw artifacts

| Artifact | Independent file observations | Limits |
|---|---|---|
| Existing local Q03 CSV: C:/Users/lenovo/Downloads/Supabase Snippet Untitled query (3).csv | Complete quoted-CSV parse:532 records,32 columns, all rows_total=532. SHA256430321b092abd1ebdccf0d0c182e39ac2b1fda70e568aa9fe1d157bc0d8568ce | Outside repository; read only, not copied/renamed. No embedded project/database/timestamp/session_user or executed SQL hash. Binding to Production is reported context, not independently server-proven |
| [Q16 JSON](evidence/q16-production-catalog-export.json) |2000 records, all rows_total2746; only declared-edge kind. SHA25663e94d2f89fd324c8480ce14393ca6259391205403faba52d1788f8ec66cc88a |746 omitted result rows; no returned root/shared/extension-membership groups; no role/ACL/default proof or execution-context binding |

The recovered Q03 file was previously identified by its header; earlier reports had
not independently processed its complete contents. This report adds that file-level
verification without rewriting their historical limitations. docs/evidence still has
only the Q16 JSON. No raw Q01/Q02/Q05/Q07/Q08/Q12/Q13/Q15 file was supplied/found there;
other local originals may exist but their locations are not established. Do not call
them definitely lost or assume absence means nonexecution.

Q03 has76 exact_executor=true rows naming postgres. All report rolsuper=false,
rolbypassrls=true, direct_owner=true, owner_role_usage=true and can_set_owner=true;
all ten inspected dependency tables report owner postgres, enabled/FORCE RLS, and
rls_active_for_current_executor=false. Their executor table-privilege maps report all
eight table privileges and grant options true. This is internally consistent with
owner/BYPASSRLS behavior, not evidence that application roles bypass RLS. It is only
that export snapshot: no CREATE ROLE, schema CREATE, function ACL or role-membership
claim is inferred from these table-level facts.

### Reported but not independently raw-verified results

Q01/Q02 execution success; Q05 unresolved hardening; Q06 type USAGE/34 rows; Q07 default
ACLs/96 rows with broad schema-public defaults; Q08 memberships/21 rows; Q09 constraints/
37 rows; Q10 policies/triggers/121 rows; Q11 scoped zero results; corrected Q12 seven
rows; Q13 three rows and Q15 one row. Counts and summaries are not field values. The
[evidence reconciliation](rental-contracts-production-catalog-evidence-reconciliation.md)
separates Q12 stale-copy FAIL from corrected reported success, and Q13/Q15 reported
collection from raw-export gaps. Neither is relabeled unexecuted here.

## 2. Authority matrix

| Authority item | Known source/file evidence | Unknown / why it matters | Minimum resolution |
|---|---|---|---|
| Actual Production migration executor | Q03 file identifies its query current_user as postgres via exact_executor; source captures current_user for function creation-owner checks | Future migration tool/session/database/role may differ. SQL Editor success is not that executor profile | Bind original session/project/time evidence and intended migration execution identity/role-selection mechanism; do not infer from table ownership |
| CREATE ROLE | Draft line12 proposes restricted rental writer. Q03 postgres is non-superuser | CREATEROLE and provider restrictions/new-role grant behavior not in Q03. Non-superuser does not mean unable to create roles | Recover Q01 executor role attributes and intended executor binding; actual non-superuser creation behavior needs authorized rehearsal |
| SET ROLE / ADMIN / INHERIT | Q03 owner SET/USAGE=true for postgres-owned dependency tables; Q08 reportedly21 rows | Own-role SET says nothing about new writer. ADMIN, SET and usable inheritance/grantor paths differ | Complete raw Q08 option/grantor graph plus exact executor; new writer lifecycle recipe must not borrow another writer role authority |
| Schema CREATE/USAGE | Draft grants USAGE and temporary writer CREATE; Q02 reportedly ran | Q03 table privileges do not establish schema privileges, authorization to grant them or inherited/PUBLIC CREATE after cleanup | Recover complete Q02 ACL/effective rows and owner/grant-option context; verify actual grant path |
| Existing dependency ownership/grants | Q03 ten table owners postgres; exact query executor is direct owner, all table privilege/grant-option maps true | Supports conditional table operations for that same bound role/snapshot, not all future execution or helper privileges | Match actual executor/context/freshness; inspect required schemas/helper EXECUTE and existing-policy authority separately |
| Function ownership transfer | Current exact allowlist has18 entries and creator/definition checks; final owner intended writer | No actual new-function owner/SET-to-writer/schema CREATE evidence; metadata test success not transfer authority | Creator/source binding, exact new-owner rights and separately reviewed non-superuser transfer/grant-order rehearsal |
| GRANT/REVOKE grantor | Q03 table-level grant options observed; draft has target-specific function commands | Function owner/grant options, actual grantor, dependent chains, post-transfer grant path and defaults remain unknown | Actual creator/function-default tuple evidence and authorized function-owner/grantor path; no blanket cascade or self-approved snapshot |
| SECURITY DEFINER execution identity | Nine public DEFINER/nine private INVOKER from source; all intend pinned settings and writer ownership | Actual writer attributes/effective memberships/ACL/dependencies and genuine auth/RLS not verified. Editor postgres BYPASSRLS cannot serve as restricted-user proof | Bind final owner/attribute/role metadata; separate genuine-auth restricted execution and audit tests |
| Role/privilege restoration | Draft introduces no SET ROLE or role memberships here; temporary direct schema CREATE is granted then revoked | No future authority recipe restoring grantor/ADMIN/SET/INHERIT/session state; direct revoke not effective inherited/PUBLIC isolation | Approved before/after authority snapshot and exact restoration design; runtime validation later |

These are evidence limits, not conclusions that permissions are denied. Current source
can assert and abort; it cannot manufacture the absent authority. Other modules known
to have migrated with different writer roles do not prove rental-writer authority.

## 3. Per-signature ACL evidence matrix

Expected final owner W=contratpro_rental_writer. W must have ordinary EXECUTE as policy,
while its implicit ownership management authority is a different concept. P means
intended final EXECUTE W plus authenticated without grant option; H means W only.
PUBLIC/direct grants to other unapproved runtime roles are forbidden final policy.
The matrix reports no actual new-function grant from that desired policy.

Shared gap codes:
G1 actual creator/executor binding; G2 creator-global and schema function default ACLs;
G3 role inheritance/SET/ADMIN and function-grantor paths; G4 approved initial/final
ACL acceptance policy and tuples; G5 full final definition/owner/ACL/runtime checks.
Verification V: recover/review existing originals offline; then compare exact identity,
owner, decoded grantor/grantee/privilege/option tuples and effective/SET paths under
separately authorized metadata/runtime scopes if still required. No query is included.

| # | Exact signature | Expected owner | Intended EXECUTE | Direct ACL evidence | PUBLIC evidence | Potential inherited EXECUTE | Creator/default dependency | Missing / method |
|---|---|---|---|---|---|---|---|
| 1 | app_private.rental_member(pg_catalog.uuid) | W (desired) | H — W only | UNKNOWN for this proposed new object | UNKNOWN; not inferred from defaults | UNKNOWN; role graph required | Creator C global(f) + C/app_private(f) | G1–G5 / V |
| 2 | app_private.rental_receipt_immutable() | W (desired) | H — W only | UNKNOWN for this proposed new object | UNKNOWN; not inferred from defaults | UNKNOWN; role graph required | Creator C global(f) + C/app_private(f) | G1–G5 / V |
| 3 | app_private.rental_history_guard() | W (desired) | H — W only | UNKNOWN for this proposed new object | UNKNOWN; not inferred from defaults | UNKNOWN; role graph required | Creator C global(f) + C/app_private(f) | G1–G5 / V |
| 4 | app_private.rental_price(pg_catalog.timestamptz,pg_catalog.timestamptz,pg_catalog.numeric,pg_catalog.numeric) | W (desired) | H — W only | UNKNOWN for this proposed new object | UNKNOWN; not inferred from defaults | UNKNOWN; role graph required | Creator C global(f) + C/app_private(f) | G1–G5 / V |
| 5 | app_private.rental_input(pg_catalog.jsonb) | W (desired) | H — W only | UNKNOWN for this proposed new object | UNKNOWN; not inferred from defaults | UNKNOWN; role graph required | Creator C global(f) + C/app_private(f) | G1–G5 / V |
| 6 | app_private.rental_number(pg_catalog.uuid,pg_catalog.timestamptz) | W (desired) | H — W only | UNKNOWN for this proposed new object | UNKNOWN; not inferred from defaults | UNKNOWN; role graph required | Creator C global(f) + C/app_private(f) | G1–G5 / V |
| 7 | app_private.rental_lock(pg_catalog.uuid,pg_catalog.uuid) | W (desired) | H — W only | UNKNOWN for this proposed new object | UNKNOWN; not inferred from defaults | UNKNOWN; role graph required | Creator C global(f) + C/app_private(f) | G1–G5 / V |
| 8 | app_private.rental_available(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.uuid,pg_catalog.timestamptz,pg_catalog.timestamptz) | W (desired) | H — W only | UNKNOWN for this proposed new object | UNKNOWN; not inferred from defaults | UNKNOWN; role graph required | Creator C global(f) + C/app_private(f) | G1–G5 / V |
| 9 | public.contratpro_rental_create(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.jsonb) | W (desired) | P — W + authenticated | UNKNOWN for this proposed new object | UNKNOWN; not inferred from defaults | UNKNOWN; role graph required | Creator C global(f) + C/public(f) | G1–G5 / V |
| 10 | public.contratpro_rental_detail(pg_catalog.uuid,pg_catalog.uuid) | W (desired) | P — W + authenticated | UNKNOWN for this proposed new object | UNKNOWN; not inferred from defaults | UNKNOWN; role graph required | Creator C global(f) + C/public(f) | G1–G5 / V |
| 11 | public.contratpro_rental_list(pg_catalog.uuid,pg_catalog.int4) | W (desired) | P — W + authenticated | UNKNOWN for this proposed new object | UNKNOWN; not inferred from defaults | UNKNOWN; role graph required | Creator C global(f) + C/public(f) | G1–G5 / V |
| 12 | app_private.rental_change(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.text,pg_catalog.jsonb) | W (desired) | H — W only | UNKNOWN for this proposed new object | UNKNOWN; not inferred from defaults | UNKNOWN; role graph required | Creator C global(f) + C/app_private(f) | G1–G5 / V |
| 13 | public.contratpro_rental_update_draft(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.jsonb) | W (desired) | P — W + authenticated | UNKNOWN for this proposed new object | UNKNOWN; not inferred from defaults | UNKNOWN; role graph required | Creator C global(f) + C/public(f) | G1–G5 / V |
| 14 | public.contratpro_rental_confirm(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid) | W (desired) | P — W + authenticated | UNKNOWN for this proposed new object | UNKNOWN; not inferred from defaults | UNKNOWN; role graph required | Creator C global(f) + C/public(f) | G1–G5 / V |
| 15 | public.contratpro_rental_start(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid) | W (desired) | P — W + authenticated | UNKNOWN for this proposed new object | UNKNOWN; not inferred from defaults | UNKNOWN; role graph required | Creator C global(f) + C/public(f) | G1–G5 / V |
| 16 | public.contratpro_rental_complete(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.bool) | W (desired) | P — W + authenticated | UNKNOWN for this proposed new object | UNKNOWN; not inferred from defaults | UNKNOWN; role graph required | Creator C global(f) + C/public(f) | G1–G5 / V |
| 17 | public.contratpro_rental_cancel(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid) | W (desired) | P — W + authenticated | UNKNOWN for this proposed new object | UNKNOWN; not inferred from defaults | UNKNOWN; role graph required | Creator C global(f) + C/public(f) | G1–G5 / V |
| 18 | public.contratpro_rental_extend(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.jsonb) | W (desired) | P — W + authenticated | UNKNOWN for this proposed new object | UNKNOWN; not inferred from defaults | UNKNOWN; role graph required | Creator C global(f) + C/public(f) | G1–G5 / V |

All18 are plain new CREATE FUNCTION declarations; a pre-existing exact identity would
error rather than supply a reusable initial ACL. Actual Production absence/existence
is not freshly certified here; Q11 scoped absence is reported and Q16 is truncated.
No explicit function grant/revoke affects these18 between their creation and the first
ownership-block mutation. Grants on the two existing identity helpers and table/schema
grants are not ACL evidence for these18. The creator defaults are C current_user, not
automatically those of W or every inherited role.

No exact initial ACL is independently verified for any of18. Q03 recovered raw table
privileges do not change that conclusion. Q16 endpoint identities cannot supply proacl,
grantor, SECURITY DEFINER status or effective membership. NULL proacl uses hardwired
object defaults, not an empty ACL or current pg_default_acl; relevant creator defaults
may have replaced/augmented creation privileges. Final ACL normalization alone cannot
prove effective privilege isolation or defeat trusted superuser/owner control.

## 4. Prioritized missing-evidence and approval list

Categories: **R** recover/read existing local artifacts; **I** offline code/migration
inspection; **M** separately authorized Production read-only metadata collection;
**X** separately authorized database execution/runtime/privilege operations.
R does not mean an unlocated file is known to exist. “M if missing” classifies an
evidence need; it is not a new query proposal or reuse of earlier blanket approval.

| Priority / blocker | Category and available recovery | Minimum missing evidence | Proposed action / approval boundary |
|---|---|---|---|
| P0 G2 initial default-ACL baseline | R candidate: complete original Q07 export, location not yet known; I for default merge semantics; M only if no adequate original exists | Actual creator role and complete global/schema function-kind rows with grantor/grantee/options, context/time and truncation status | Recover and parse original only: no additional approval for read-only offline analysis. Fresh Production metadata requires explicit approval for its exact scope |
| P0 G1 migration executor | R candidate Q01/session records; I intended executor configuration/design; M if actual role metadata unavailable; X behavior later | Intended execution-role binding, CREATEROLE/special attributes and actual session/database provenance | Offline review needs no extra approval; altering local draft needs explicit local-change approval; new Production metadata and runtime each separately approved |
| P0 G3 membership/grantor | R candidate Q08 plus Q05 ownership/ACL and Q02; M missing role/options metadata; X transfer/revoke/SET tests | Per-edge grantor/ADMIN/SET/INHERIT, new-writer lifecycle/owner path and function grant chains including grant options | Read originals offline without extra approval; no inferred privilege change. Any SET/grant/revoke or rehearsal needs separate database-execution/privilege approval |
| P0 schema/object grant authority | R confirmed Q03 recovered; Q02/Q05 originals still unlocated; I operation mapping; M gaps | Schema CREATE/USAGE owner/grant options, helper function rights and binding to the actual migration actor | Continue read-only offline mapping without extra approval; metadata queries require explicit Production read-only approval; draft edits separately approved |
| P0 G4 policy approval | I policy proposal/design/source; no raw file can itself approve policy | Explicit acceptance of initial/final allowed tuples, grantors, normalizable deviations and trusted administrative exceptions | Analysis needs no extra approval; policy acceptance is explicit human approval; implementing it in local SQL needs explicit local-draft-change approval |
| P0 G5 exact SQL gate and final assertions | I current source/manifest/test comparison | Real pre-mutation comparison for all18 and complete final-set checks, evidence-backed authority handling | Read-only gap analysis no extra approval. Any SQL/validator/test implementation requires a separately scoped local approval; runtime is a separate X gate |
| P0 history/serialization | R candidates reported Q13 three rows and Q15 one row; I transaction design; M/X only separately approved | Actual returned shape/privilege values and creator context, bounded lock/history/rollback/restore recipe | Recover existing originals offline; no Q14. Fresh metadata explicit approval; real locking/history insertion/DDL/rollback or role changes separate execution approval |
| P0 dependency/provenance coverage | R confirmed Q16 prefix; any existing suffix artifact unlocated; I exact object/dependency map; M if gap persists | Required omitted root/shared/extension edges, exact query/context and reviewed scope sufficient for release | Offline analysis no extra approval. Any new bounded Production collection needs explicit approval; do not remove LIMIT automatically |
| P1 effective privileges/definer/RLS | R role/function metadata originals; I source/fixtures; M missing facts; X genuine restricted invocation | Actual final owner/EXECUTE, no unauthorized inherited/SET escalation, authenticated tenant checks and audit behavior | Offline simulation not privilege proof; metadata and runtime/write verification separately approved; no bypass credentials |
| P1 rollback/restoration/reliability | I atomicity plan and mock tests; X actual non-superuser PG17 transactions | Actual ownership/default/ACL/grantor semantics, late failure rollback, session/membership restoration and concurrency evidence | Source review no extra approval. Local draft changes explicit approval; any database process/SQL/privilege rehearsal or Production writes require separate approval |

### What is already recoverable versus only hoped-for

The complete Q03 CSV and Q16 JSON are confirmed readable local files and were inspected
without alteration. Q03 yields table authority facts only; Q16 yields structural graph
facts only. Q01/Q02/Q05/Q07/Q08/Q13/Q15 originals are **recovery candidates**, not proven
present in this repository. Do not manufacture them from summaries or infer all booleans
true from counts. If unavailable, document loss/unknown chronology before deciding what
new evidence needs independently reviewed authorization.

## 5. Approval boundaries and unresolved blockers

- This task permits only read-only analysis plus this single new report. No source
  correction, manifest regeneration or new fixture is implied.
- Existing-file reading, hashing, parsing and source comparison require no additional
  approval in an offline analysis task; privacy/output custody still applies.
- Any local SQL draft change requires explicit local implementation approval, never
  inferred from policy approval or catalog collection. Existing evidence is preserved.
- Any new Production metadata statement requires explicit approval of target, executor,
  exact scope, existing timeouts and custody. Prior Q01–Q16 approvals are not a blanket.
- PostgreSQL startup, SQL execution (even local), SET/role/grant changes, owner transfer,
  migrations, runtime writes and Production deployment require separate appropriate
  execution/privilege approvals. Read-only query authority is not any of these.

Current evidence cannot unblock the restrictive policy. The actual migration actor,
function creation defaults, approved independent initial ACL policy, grantor/SET paths
and effective inherited rights remain unknown. Current exact-object selection avoids
prefix targeting, but does not implement the missing independent initial ACL gate or
full final-set definition/settings validation. Q16 truncation/history/atomicity/recovery
and genuine restricted runtime gates remain. Q03 postgres BYPASSRLS is especially a
reason not to use Editor access as a tenant-isolation test; it is not proof the proposed
restricted writer will bypass. All18 new-function initial ACLs remain UNKNOWN.

## 6. Exactly one recommended next action

**Recover and independently parse the complete original Q07 default-ACL export with
its existing execution context from the local export archive/evidence custodian.**
Hash the original, retain creator/object-kind/global-versus-schema/grantor/grantee/
option fields and completeness/context limits; do not reconstruct rows or rerun SQL.
This is one read-only offline recovery action, requiring no new database authorization.
If the original cannot be located, record that fact and stop for scope/approval review
rather than substituting desired policy or issuing a new query. Its output should
identify which actual creator/schema function defaults are supported and which remain
UNKNOWN, providing the smallest concrete input to the blocked initial-ACL decision.

## Verification of this report

Only this report was created. All read existing reports, draft/manifest and raw evidence
remained byte-identical. Links and trailing whitespace were checked; git diff --check
passed. Full Q03 CSV parsing was read-only, with all532 record widths and totals
verified; executor/table findings were aggregated without printing credentials or
customer records. Q16 hash/count/truncation were checked without a database. No new
Production SQL or executable query is provided.

**Production Migration / Deployment remains NO-GO. Q14 remains BLOCKED.**
