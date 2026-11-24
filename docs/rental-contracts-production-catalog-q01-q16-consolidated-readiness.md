# Rental Contracts Phase 1A — Q01–Q16 consolidated Production readiness

## Executive decision

**Independent consolidated verdict: BLOCKED / NO-GO for Production migration,
deployment and activation.** No new Production operation is authorized. No SQL,
connection, migration, PostgreSQL process or application change occurred in this review.
Only this new report was created; previous evidence and the draft were preserved.

Query evidence-check counts: **PASS0 / PARTIAL12 / BLOCKED3 / FAIL1 (16 total)**.
These measure execution/result evidence and readiness coverage, not earlier SAFE-query
classifications. PASS would require adequate independently verified evidence for the
stated check. No query alone provides full release clearance. Q16 integrity has PASS
subchecks but its overall coverage is PARTIAL. Q12 FAIL concerns a confirmed stale
executable query artifact, not proof of an unsafe extension/database. BLOCKED for Q13/
Q15 means evidence missing, not that their metadata SELECTs are forbidden by definition.
Q14 is deliberately excluded and must not be executed under this assessment.

## 1. Evidence inventory and provenance hierarchy

### Directly inspected files

All existing rental-contracts Markdown documents under docs were read: design/readiness,
canonical query package, original audit/remediation/independent re-review, Batch1,
Batch2/3 guides/verifications, Q03 hotfix/review/rerun, Q16 fix/final-review/results.
The inactive draft and complete Q16 JSON were also inspected. Relevant references:

- [Original readiness assessment](rental-contracts-production-readiness.md) and
  [Phase1A design](rental-contracts-phase1a.md).
- [Canonical Q01–Q16](rental-contracts-production-catalog-query-review.md),
  [original independent audit](rental-contracts-production-catalog-independent-audit.md),
  [remediation](rental-contracts-production-catalog-remediation.md),
  [independent re-review](rental-contracts-production-catalog-independent-rereview.md).
- [Batch1 guide](rental-contracts-production-catalog-batch1.md),
  [Q03 hotfix](rental-contracts-production-catalog-q03-hotfix.md),
  [independent hotfix review](rental-contracts-production-catalog-q03-independent-hotfix-review.md),
  [corrected Q03 execution copy](rental-contracts-production-catalog-q03-rerun.md).
- [Batch2 guide](rental-contracts-production-catalog-batch2.md) and
  [verification](rental-contracts-production-catalog-batch2-verification.md).
- [Batch3 guide](rental-contracts-production-catalog-batch3.md) and
  [post-collection verification/history](rental-contracts-production-catalog-batch3-verification.md).
- [Q16 boundary fix](rental-contracts-production-catalog-q16-fix.md),
  [independent final review](rental-contracts-production-catalog-q16-independent-final-review.md),
  [results verification](rental-contracts-production-catalog-q16-production-results-verification.md),
  [full supplied export](evidence/q16-production-catalog-export.json).
- [Inactive rental draft](../supabase/migration-drafts/20261120001300_rental_contracts.sql).

**Observed source facts:** draft SHA256
9167005379e363fbad3c83fe769db43ca3d17739574774fc8ca00d141e16efac;
canonical package SHA256 fd235793ae7e311f889b44b7e2c8626bc31bbdfba0eee54b3740d5bd4c8a368e.
Draft retains unconditional abort before DDL and final ROLLBACK. It is not deployable.

**Direct result facts:** docs/evidence contains the Q16 JSON only at review time.
SHA256 63e94d2f89fd324c8480ce14393ca6259391205403faba52d1788f8ec66cc88a; all2000 array records parsed. Recomputed rows_total=2746 in every
row, all kind=declared-edge, hops1093/907, 650 unique original directed edge addresses.
No database was consulted to validate export provenance.

**Reported observations:** Q01–Q12 execution outcomes/counts are recorded in prior
reports/user-supplied summaries, not complete raw exports under docs/evidence. They
remain reported rather than directly independently verified in this consolidation.
No Q13/Q15 execution artifact or result is supplied; no execution is inferred.
The proposed Production project gllsiklbvqpxzucvkehw is user-bound context, not verified
from the export. The Q16 file lacks executed SQL/hash, timestamp, database and executor
metadata. Its shape is consistent with approved Q16, but cannot prove who executed it
or that its bytes represent a particular server snapshot. Prior query execution success
is distinct from adequate evidence or future migration authority.

## 2. Q01–Q16 execution/evidence matrix

| Query | Execution status | Actual available evidence | Independent verification | Coverage limits / unresolved questions | Status |
|---|---|---|---|---|---|
| Q01 | Reported success | Session/role inquiry reportedly executed; no raw attributes/context export under docs/evidence | Source reviewed; result not independently checked here | Role presence/CREATEROLE/SET/ADMIN values, target/executor and freshness unverified | PARTIAL |
| Q02 | Reported success | Schema owner/ACL/capability query reportedly executed; raw rows unavailable | Source reviewed; no direct result verification | Actual schema CREATE/USAGE, owner SET/grant-option paths unresolved | PARTIAL |
| Q03 | Original 42703; corrected rerun reportedly successful | 532 rows reported; roles projection defect fixed in canonical SQL and independent rerun artifact | Corrected query independently reviewed; raw 532-row export not present under docs/evidence | Effective role/column/table grants and RLS state not independently reconciled for release | PARTIAL |
| Q04 | Reported success | Zero sequence rows reported | Source reviewed; no raw zero-row artifact/context inspected | Scoped sequence absence only; no counter/helper/DDL authority proof | PARTIAL |
| Q05 | Reported success; hardening unresolved | Helper metadata/fingerprints reported; no complete raw result artifact | Remediated source independently SAFE; actual settings/owners/ACL unresolved | Exact safe search_path/row_security and source/dependency compatibility unknown | PARTIAL |
| Q06 | Reported success | 34 rows/type USAGE reported | Source reviewed; no direct raw-result validation | Type USAGE does not establish REFERENCES, CREATE, EXECUTE or owner-transfer authority | PARTIAL |
| Q07 | Reported success | 96 rows; broad public default ACLs reported | Source semantics reviewed; actual grantor/grantee/options not reconciled | Final default-derived privileges/custom grantees and preservation requirements unresolved | PARTIAL |
| Q08 | Reported success | 21 membership rows reported; authority unresolved | Source semantics reviewed; no direct raw edge/option verification | SET/INHERIT/ADMIN/grantor paths and new writer creation/transition unknown | PARTIAL |
| Q09 | Reported success | 37/37 validated nondeferrable p/u/f rows; valid/ready referenced indexes reported | Source reviewed; Q16 corroborates structural neighborhoods, not raw Q09 semantics | Exact ordered FK/key/type/REFERENCES compatibility and independent indexes unknown | PARTIAL |
| Q10 | Reported success | 121/121 = 46 policies +75 triggers reported; guard hardening flags false | Q16 independently reproduces 46 policy/75 trigger identities within Q10 scope | No raw predicates/role applicability/settings/owner enforcement or activation proof | PARTIAL |
| Q11 | Reported success | Zero scoped matching rental objects reported | Source scope reviewed; no raw zero-result context proof | New role not covered; snapshot/namespaces/default-arg/dispatch/exact signatures not fully cleared | PARTIAL |
| Q12 | Original 42704; bool hotfix success reported | Seven extension/language rows reported; sql/plpgsql USAGE true | Original current canonical/Batch3 copy still has pg_catalog.boolean; executed hotfix identity unavailable | FAIL applies to persistent executable artifact; reported corrected outcomes remain partial, not a failed Production extension state | FAIL |
| Q13 | Execution NOT ESTABLISHED | Prepared history-structure prerequisite SQL only; no export/result supplied | Independently reviewed metadata candidate; not collected evidence | History relation shape/type/access/RLS/full visibility/content approval unknown | BLOCKED |
| Q14 | Excluded; no authorized execution | No history-content evidence | Intentionally BLOCKED; Q13 success would not authorize contents | Do not execute or treat as necessary to bypass scope; independent prerequisites/content approval required | BLOCKED |
| Q15 | Execution NOT ESTABLISHED | Prepared history privilege/MAINTAIN metadata query only; no export/result supplied | Independently reviewed candidate; not collected evidence | History INSERT/schema access/object lock privileges and exact executor authority unknown | BLOCKED |
| Q16 | Export supplied; server provenance not embedded | Directly parsed 2000 records, all totals2746; 650 unique edges;746 omitted output rows | Export integrity PASS; graph/security coverage PARTIAL | No root/shared/membership groups in prefix; missing suffix/deeper/unrecorded edges and context | PARTIAL |

Prepared SQL, author classifications and parser passes are not collected Production
evidence. Historical 15 SAFE/1 BLOCKED counts classify metadata-query candidates; they
must not be substituted for this 16-check readiness matrix or override later incidents.
Q13/Q15 appear at canonical headings lines468/558, not as collected batches/results.

## 3. Cross-evidence consistency and contradictions

| Area | Consistency / tension | Independent assessment |
|---|---|---|
| Roles/ownership/membership | Q01/Q08 reportedly ran; creation/transition authority still unresolved | No contradiction: usable SET/ADMIN depends on options, grantor and exact executor; count21 is not a capability proof |
| Schema/table/function privileges | Q02/Q03/Q05/Q06 cover different gates | Type USAGE/schema grants/object privileges/ownership are not interchangeable. Raw effective grants/owners remain unverified |
| Default ACLs | Q07 reports broad public defaults; final draft revokes only named runtime grantees | P0 closure risk if unexpected grantees survive; not proof all objects are already exposed. Creator role/global/per-schema defaults and grant options must be reconciled |
| Policies/triggers | Q10 reports46 policies/75 triggers; Q16 has52/79 identities | Consistent scope difference: limiting Q16 owning-table identities to Q10 scope reproduces46/75. Six extra policies and four triggers belong to adjacent objects, not contradictory counts |
| FK/unique indexes | Q09 reports37 validated/nondeferrable rows; Q16 has82 constraint identities | Different neighborhood/category scope; Q16 lacks contype/validation/key arrays. No raw row-by-row tenant-key proof or contradiction can be inferred |
| Collision check | Q11 reports zero scoped rental objects | Consistent with inactive draft, but role creation, unscoped/deeper dependencies and future/concurrent collisions remain unresolved |
| Extensions/languages | Q12 corrected run reports7 rows, SQL/plpgsql USAGE; btree_gist absent | Consistent with built-in-language/range/advisory-lock design. No extension installation required. Actual future executor rights not established |
| History | Q16 includes structural schema_migrations edges | Does not supply Q13 structure/type/RLS/select or Q15 INSERT/MAINTAIN evidence; no history contents read or authorized |
| Dependencies | Q16 valid export but all2000 rows are declared-edge prefix | 746 omitted rows and missing root/shared/membership output prevent full metadata reconciliation; zero missing-group rows do not prove absent dependencies |

### Confirmed query/document correctness incidents

1. Original Q03 references exceeded its CTE projection (42703). Canonical Q03 now
   projects the required role flags; corrected independent review/rerun artifact exists.
   Old Batch1 Q03 remains stale intentionally. Reported successful532-row rerun is not
   converted into a full raw-result verification here.
2. Original Q12 uses pg_catalog.boolean (42704). **Current canonical Q12 and Batch3
   guide still contain that invalid qualified type name.** The reported pg_catalog.bool
   hotfix ran successfully, but no exact independent hotfix execution artifact is present.
   Do not reuse stale Q12 SQL; no fix is made by this consolidation.
3. Earlier SAFE/compatibility claims missed both semantic errors. They were contradicted
   by reported execution errors, not resolved by syntax parsing. Raw PG18 AST checks
   do not bind CTE columns, resolve catalog type names or prove PG17 runtime correctness.
4. The canonical inventory's shorthand “Q14 then conditional SAFE” cannot override
   dedicated Q14 BLOCKED language and explicit content-approval prerequisites. Q13
   success alone never unblocks Q14. No Q14 execution is required or authorized here.
5. Some old readiness/source labels sound stronger than their supporting evidence:
   proposed postgres executor is not an independently verified migration session;
   “VERIFIED FROM EVIDENCE” in earlier design matrices includes supplied observations.
   Preserve those records historically, but do not promote them to fresh direct proof.

### Q16 detailed implications

Directly observed:2000 rows, 2746 total, 746 omitted;650 unique directed tuples and1350
additional hop/direction representations, no exact duplicate rows in the full file.
534 tuples appear in both traversal orientations; this is not proof of reciprocal
catalog edges. All OIDs serialize as decimal strings; source addresses distinguish
classes/objects/subobjects. The 419 endpoint addresses include16 function identities,
52 policies and79 triggers. No conflicting endpoint labels were found in the prior
full-file check. Q16 carries no function owner/SECURITY DEFINER/config/ACL flags or
policy expressions; identities alone cannot establish safe execution behavior.

Observed schema endpoint mentions include identity, tenancy, app_private, auth and
supabase_migrations. Auth mapping/FK/policy edges corroborate structural dependencies,
not JWT validation or safe policy predicates. History edges describe schema/table/type/
constraint/index/version-column/TOAST metadata, never version values. Legacy GUC helper
edges show an existing-policy neighborhood, not that rental authorization uses them.

Canonical ORDER BY kind/hop/labels plus LIMIT2000 yields only the first kind group and
partial hop2 output. Root/shared-edge/extension-membership groups are absent from the
export. Their full-result counts, role/ACL edges, extension labels and root inventory
are UNKNOWN. Even all2746 output rows would not establish dynamic dependency closure,
all paths, current owner authority or absence of provider/external dependencies.

## 4. P0 blockers — must resolve before any Production migration

P0 includes confirmed artifact deficiencies AND unknown prerequisites whose failure
could invalidate atomicity/security. Unknown does not mean a vulnerability is proven;
it means release cannot fail open. Evidence keys refer to existing documents above.

| ID / blocker | Supporting evidence and why it matters | Confirmed vs unknown | Minimum evidence/artifact needed | Separate authorization? |
|---|---|---|---|---|
| P0-1 No deployable release artifact | Draft lines4–7 abort and389 ROLLBACK; no history INSERT. Removing guard alone is not a release design | CONFIRMED local artifact state | Independently reviewed future forward-only atomic candidate with approved pre/postconditions; retain this guarded draft | Yes for candidate preparation/change; explicit migration approval later |
| P0-2 Exact executor and role lifecycle | Draft line12 CREATE ROLE; lines372–386 ownership/grants; Q01/Q08 raw authority unresolved. Role creation is not proof of SET/ADMIN/grantor permissions | UNKNOWN Production identity/options/path | Bound target/database/current_user/session_user and relevant CREATEROLE/ADMIN/SET/INHERIT/grantor evidence; exact temporary membership restoration and non-superuser rehearsal evidence | Existing offline artifacts may be supplied now; new collection/rehearsal needs separate scope/authorization |
| P0-3 Existing-object ownership/ACL authority | Lines15–33/48–53 alter grants/policies on dependencies; lines381–383 change ownership then grant. Schema/object privileges alone do not authorize policy/owner operations | UNKNOWN exact owners/SET/grant options and post-transfer authority | Full raw owner/ACL/role path evidence, schema CREATE/USAGE, language/type USAGE, REFERENCES, helper EXECUTE and audit INSERT/policy authority for intended executor/definer | Yes for new operations; read/reconcile already-collected evidence offline first |
| P0-4 Final privilege closure/default ACLs | Q07 broad defaults reported; draft114–118/381 revoke only named grantees, no exhaustive ACL assertion. Custom/default grants could survive | Reported defaults; CONFIRMED absence of exhaustive release assertion; actual exposure UNKNOWN | Exact creator/global/schema default ACLs and complete final table/column/function/schema ACL+grant-option allowlists, inheritance and unrelated-grant preservation design | Yes for any privileges/candidate change; no indiscriminate default alteration |
| P0-5 History authorization, sequencing, locking and atomicity | Q13/Q15 not evidenced; draft388 explicitly lacks history INSERT. Counter/advisory business locks do not serialize deployments | CONFIRMED release-design gap; actual history permissions UNKNOWN | Bound metadata for intended history relation/type/access/RLS and exact history write/lock authority, reviewed expected history/preconditions, bounded serialization/timeouts/rollback plan | New metadata/authority tests and deployment separately authorized; Q14 stays excluded |
| P0-6 Exact ownership list/collisions | Draft376–383 prefix loop affects matching pre-existing functions; Q11 scoped zero does not prove new role absent or future absence | CONFIRMED broad loop; real collision state UNKNOWN beyond supplied snapshot | Exact reviewed function signatures/object inventory, absence/baseline guards, new-role identity and preservation assertions, race-safe release sequencing | Yes for candidate changes and any new collection |
| P0-7 Security/dependency compatibility unresolved | Q05 hardening unresolved; Q10 two guard exact flags false; hashes not predicate semantics; missing raw Q09/RLS/owner evidence | UNKNOWN deployed unsafe vs benign hardening variance; not a proven exploit | Approved settings/body-semantic baseline and actual owner/ACL/bypass/policy role/command evidence; exact FK/key/type matches; explain each false/unknown flag | Offline reconciliation first; remediation/restricted execution separately authorized |
| P0-8 Incomplete evidence/provenance | Q16 truncated; shared/extension/root groups omitted; Q01–Q12 raw artifacts absent under docs/evidence | CONFIRMED coverage loss; missing executor/snapshot evidence UNKNOWN | Bind collected exports to query/executor/time/project; review required missing dependency categories by a separately reviewed scope. Do not require arbitrary complete dynamic closure or waive known gaps | Supplying existing files needs no DB work; any fresh collection requires separate authorization |

No remediation SQL is supplied. P0-8 is satisfied by sufficient reviewed release-scope
evidence with accepted documented residual limits, not by claiming every possible
PostgreSQL dependency can be catalog-certified.

### Draft-specific dependency requirements

Draft lines56/90 reference tenancy.agencies(id); line95 references identity.users(id).
Lines81–84 reference clients/vehicles/memberships via (agency_id,id), including creator
and return membership. Eligible keys/types, ordered columns and executor REFERENCES
rights must match actual evidence. New UNIQUE constraints at80 and receipt FKs98/104
are proposed objects, not already proven by existing Q09 results. A non-null same-tenant
FK does not prove active membership/agency or valid canonical auth; those checks are
separate (35–45). Nullable return-membership relationship is conditional until populated.

No CREATE EXTENSION, GiST or EXCLUDE occurs. Ordinary indexes86–88, advisory lock201–205
and core tstzrange overlap206–212 implement the draft approach. Core gen_random_uuid
under pinned pg_catalog provides UUID defaults. **btree_gist: NOT APPLICABLE to the
current draft**; absence is not a migration blocker. UUID GiST equality would matter
only if a different future design introduced such an operator-class requirement.
Existing helper transitive dependencies still need evidence; installed extensions do
not certify every function is safe/usable.

## 5. P1 blockers — before Production activation

| ID | Requirement / reasoning | Evidence and uncertainty | Minimum condition and authority |
|---|---|---|---|
| P1-1 Real authentication and tenant isolation | Local synthetic JWT/superuser bootstrap is not genuine gateway/identity authority; metadata does not evaluate policies | Readiness harness limitations; draft35–45 and216–367 runtime checks; actual restricted-user execution UNKNOWN | Separately authorized bounded genuine-auth restricted-user verification for intended Owner/Staff, cross-tenant/revoked/disabled/suspended denial; no service-role/RLS bypass |
| P1-2 Runtime definer/audit behavior | Correct owner/ACL/settings and FORCE RLS must actually cooperate; row_security=on cannot strip superuser/BYPASSRLS authority | Draft12/106–130, public definer entrypoints and audit writes; existing Q05/Q10 evidence incomplete | Verify final metadata and restricted invocation/readback/audit rollback under reviewed isolated authority; any runtime writes separately authorized |
| P1-3 Production-like transactional reliability |20 local integration scenarios do not cover provider authority/all interleavings; uncertain responses need reconciliation | Existing receipts/numbering/availability/immutable guards; readiness local test limitations | Separately scoped non-superuser rehearsal, idempotent creation/confirmation and concurrency/audit rollback evidence; no rerun of completed tests without a concrete gap |
| P1-4 Operational policy and recovery | Concurrent revocation/suspension is not forced cancellation of running transaction; explicit return acknowledgment is not independent physical proof | Readiness transaction risks6–9; draft membership snapshot/return/lifecycle behavior | Explicit acceptance of timing/retry/return policy, bounded rollback/recovery/activation stop conditions and final release approval; no feature flags changed here |

P1 validation gates must be designed before a release is approved; where a P1 property
changes migration structure/security, it also blocks that migration under P0-7.
There is no instruction to deploy first and discover tenant-security failures later.
No real Production mutation or test is authorized by this report.

## 6. P2 follow-up / documentation controls

- Preserve failed Q03/Q12 artifacts and corrected execution provenance; retire stale
  runnable copies only in a separately scoped documentation change. Q12 canonical fix
  is still needed before reusing that inspection query; it is not a reason to alter
  the rental schema or install an extension.
- Strengthen offline semantic checks beyond a single-SELECT AST: lexical CTE/alias
  binding, pinned PG17 catalog type/function signatures and negative controls. No test
  or tool installation occurs in this consolidation.
- Maintain a hash/UTC/executor/project evidence index and distinguish historical query
  approval from observed results; metadata names/hashes stay in restricted custody.
- Avoid misleading “all safe”/“complete graph” labels: Q16 count is not unique-edge or
  path count, false hardening flags need explanation and missing evidence stays UNKNOWN.

These improve repeatability but do not replace the P0/P1 gates.

## 7. Conditions for reconsidering readiness

1. Reconcile already-collected raw artifacts and exact query contexts; resolve Q12
   failed-vs-corrected copy history. Establish Q13/Q15 evidence availability explicitly,
   without assuming execution or unblocking Q14.
2. Close each P0 with independently reviewed bounded evidence or a clearly accepted
   residual limitation; identify the actual executor and exact new writer authority
   transitions without borrowing another role's authority as proof.
3. Review a separate atomic forward release artifact using exact signatures/ACLs,
   dependency/collision/history preconditions, bounded serialization and complete
   temporary-authority restoration. Do not promote or edit this guarded local draft.
4. Establish P1 test/activation/recovery controls with genuine auth and restricted
   roles; obtain separately scoped authorization for any rehearsal or writes.
5. Obtain explicit Production migration/deployment approval only after those reviews.
   Catalog metadata and local integration PASS alone can never mark Production READY.

**Recommended immediate next offline action:** build an evidence-to-P0 closure ledger
from the existing raw Q01–Q15 exports and exact execution context, requesting those
files from their custodian rather than rerunning SQL. Prioritize Q01/Q02/Q03/Q05/Q07/
Q08 and any existing Q13/Q15 artifacts. Record which are genuinely unavailable. Resolve
source/hotfix provenance and specify the smallest remaining evidence gaps before any
new separately authorized collection or candidate work. This report supplies no new
Production queries, remediation SQL or deployment script.

## 8. Offline verification of this consolidation

The full Q16 JSON was reparsed and its hash/count/totals/kinds/hops/unique edge tuples
recomputed; they match the existing result report. Original draft hash/guard and
current Q12 invalid type spelling were checked. All17 existing rental-contracts docs
and the draft were read; none was edited. Relative links and trailing whitespace were
checked, git diff --check passed, and source/evidence hashes were compared unchanged
after this work. No SQL, database connection, PostgreSQL process, migration, application
or environment change, commit/push/deployment occurred.

**Final consolidated decision: Production Migration / Deployment NO-GO.**
