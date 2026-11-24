# Q16 Production export — Independent offline results verification

**Executive verdict: PARTIAL. Export integrity PASS; graph coverage incomplete.**
**Final Production status: NO-GO.** No SQL execution or database connection occurred.
This review supersedes the missing-file status in the preserved historical report
below. Only this report was updated; the supplied JSON and other evidence are unchanged.

## 1. Evidence, provenance and reproducibility

**Observed input:** [complete exported JSON](evidence/q16-production-catalog-export.json).
Absolute path: C:/Users/lenovo/contratpro/docs/evidence/q16-production-catalog-export.json.
File size: **1,043,821 bytes**. UTF-8 JSON parses completely as an array of 2,000 objects.
SHA256: **63e94d2f89fd324c8480ce14393ca6259391205403faba52d1788f8ec66cc88a**.
Every record was processed; no sampling or truncated excerpt was used.

Reviewed [canonical Q16](rental-contracts-production-catalog-query-review.md),
[original audit](rental-contracts-production-catalog-independent-audit.md),
[Batch 3 evidence review](rental-contracts-production-catalog-batch3-verification.md),
[final Q16 review](rental-contracts-production-catalog-q16-independent-final-review.md)
and [extension-boundary fix](rental-contracts-production-catalog-q16-fix.md).
Canonical Q16 block SHA256:
5f97a88087afa11eddb5e8ac92878bb01341a5ef160152c82f6490196675aa6c,
matching the independent final review. Repository content binds the approved query;
the export itself does not embed executed SQL/hash, timestamp, project ID or executor.
Those execution-provenance facts remain UNKNOWN. The project binding is user-supplied,
not independently established by the JSON.

Method: full JSON parse; validate expected field sets, allowed type/range/constant
values and address keys; group records by kind/hop/direction/dependency type; group
edges by the complete original directed seven-field address tuple below. Exact-row
comparison preserved field values/order. Endpoint identity consistency was checked
against classid/objid/subid. Schema counts use a schema-qualified-name boundary match
in either object_identity or referenced_identity, never application record inspection.

## 2. Export integrity — observed facts

| Check | Result |
|---|---|
| Actual exported records | **PASS: 2,000** |
| rows_total | **PASS: 2,746 in all 2,000 records** |
| declared_hop_limit | **PASS: integer 2 in every record** |
| complete_dependency_closure | **PASS: boolean false in every record** |
| Top-level field set | **PASS: same nine expected columns, no missing/extra fields** |
| Row/address type, range and classification validation | **PASS: zero malformed records** |
| NULL top-level/address values in this prefix | **0 / 0**; root rows would legitimately differ, but none are returned |
| Same address with conflicting identity label | **0** |
| Exact duplicate exported rows | **0** |
| Query LIMIT | Source: **2,000**; actual exported count matches |

Columns: kind, hop, direction, object_identity, referenced_identity, addresses,
declared_hop_limit, complete_dependency_closure, rows_total. Here kind/direction/identity
fields are strings, hop/totals are integral JSON numbers, closure is boolean and
addresses is an object. Every returned address object has seven keys: classid, objid,
subid, refclassid, refobjid, refsubid, dependency_type. **OID values are decimal strings**
within unsigned 32-bit range; subobject IDs are nonnegative integral JSON numbers.
This OID serialization is valid catalog JSON output, not malformed data. No coercion
was used to hide inconsistent rows. All returned identity strings are nonempty.

**Observed truncation:** 2,000 returned rows versus window count2,746 means **746
result rows omitted** (27.17%). It is not evidence that 746 unique objects/dependencies
are missing. This is a complete file of a truncated query result, not the full query
result or dependency graph. The user-specified total is now independently confirmed
against every exported row, although original server provenance remains unverified.

## 3. Exact classification tables

| kind | Exported rows |
|---|---:|
| declared-edge | 2,000 |
| extension-membership | 0 |
| root | 0 |
| shared-edge | 0 |
| **Total** | **2,000** |

| hop | incoming | outgoing | Total |
|---|---:|---:|---:|
| 1 | 556 | 537 | 1,093 |
| 2 | 513 | 394 | 907 |
| **Total** | **1,069** | **931** | **2,000** |

| dependency_type | Meaning | hop1 | hop2 | Rows | Unique directed addresses |
|---|---|---:|---:|---:|---:|
| n | normal dependency | 512 | 436 | 948 | 321 |
| a | automatic dependency | 358 | 348 | 706 | 198 |
| i | internal dependency | 223 | 123 | 346 | 131 |
| **Total** | | **1,093** | **907** | **2,000** | **650** |

No e membership or x automatic-extension dependency is present in this returned
prefix. That is not evidence such dependencies are absent from the full result/cluster.

| Direction | normal n | automatic a | internal i | Total |
|---|---:|---:|---:|---:|
| incoming | 453 | 381 | 235 | 1,069 |
| outgoing | 495 | 325 | 111 | 931 |

## 4. Edges, repetitions and endpoint identities

Unique edge key is the ordered tuple
(classid,objid,subid,refclassid,refobjid,refsubid,dependency_type).
It always preserves dependent → referenced orientation. hop/direction/kind are reported
separately, not included in unique catalog-edge identity. These are same-database
addresses, not portable identifiers or application data IDs.

| Measure | Count |
|---|---:|
| Unique directed dependency address tuples | **650** |
| Tuples represented more than once | **603** |
| Extra hop/direction representations beyond one per tuple | **1,350** |
| Tuples with both incoming and outgoing traversal labels | **534** |
| Tuples with incoming labels only | **56** |
| Tuples with outgoing labels only | **60** |
| Unique endpoint addresses across both sides | **419** |
| Unique dependent-side addresses | **334** |
| Unique referenced-side addresses | **171** |

| Representations per address tuple | Number of tuples |
|---|---:|
| 1 | 47 |
| 2 | 144 |
| 3 | 171 |
| 4 | 288 |

Within each of the four hop/direction buckets every edge key is unique. Repetitions
are across those buckets. Incoming and outgoing labels on the same address tuple do
**not** prove reciprocal dependencies or a cycle. They mean the stored catalog edge
was visited in both traversal orientations. Actual individual traversal paths are
not exported; DISTINCT removes some path multiplicity before rows_total is computed.
Therefore 2,746 is neither a path count nor a unique-edge count. The full-result
unique-edge count cannot be recovered from this prefix.

| Endpoint catalog class | Distinct address/identity labels across either side |
|---|---:|
| pg_type (1247) | 22 |
| pg_proc (1255) | 16 |
| pg_class (1259), including columns/indexes/TOAST | 128 |
| pg_attrdef (2604) | 35 |
| pg_constraint (2606) | 82 |
| pg_language (2612) | 1 |
| pg_namespace (2615) | 4 |
| pg_trigger (2620) | 79 |
| pg_policy (3256) | 52 |
| **Total addresses** | **419** |

Identical human labels can identify distinct catalog classes, e.g. a table and its
row type. Grouping only by identity text would conflate them. No conflicting label
for a single complete address was found.

## 5. Security-relevant schema coverage — observed prefix only

| Schema mentioned on either edge endpoint | Rows | Unique edge tuples |
|---|---:|---:|
| identity | 330 | 103 |
| tenancy | 1,709 | 541 |
| app_private | 172 | 84 |
| auth | 16 | 9 |
| supabase_migrations | 15 | 6 |

These overlapping counts must not be summed. A cross-schema edge contributes to
both schema rows. Schema membership here is label-based qualified identity evidence,
not a new catalog lookup.

### Canonical identity, auth and helpers

The 16 pg_proc endpoint identities include canonical_auth_user(), receipt_auth_uid(),
auth.uid(), provisioning_subject(), capture_client_creation(), client_guard(),
vehicle_guard(), client_allowed(uuid,text), vehicle_allowed(uuid,text), agency_owner(uuid),
client_payload(tenancy.clients), vehicle_payload(tenancy.vehicles), and the legacy
active_membership_id(), context_uuid(text), has_permission(text), tenant_is_active()
helpers in app_private. These are function identities only. **Q16 provides no
SECURITY DEFINER flags, owners, ACLs, settings or bodies.** Their actual security
semantics cannot be inferred from their names or graph presence.

Nine auth-related unique edges include the identity.supabase_users foreign key to
auth.users.id/auth.users_pkey, two FK trigger dependencies on auth.users, and policy
references to auth.uid() from supabase_canonical_self_read, supabase_mapping_self_read,
supabase_memberships_self_read, writer_mapping and writer_user. This supports the
presence of structural auth/mapping dependencies, not correctness of policy predicates,
JWT verification or active/disabled identity behavior. No auth user rows were read.

Legacy helper edges do not prove that the rental authorization path relies on them.
The current draft uses canonical mapping and explicit membership/state checks; the
observed existing-policy neighborhood is broader than that proposed path.

### Policy/trigger scope reconciliation with Q10

**Observed:** 52 policy identities, 79 trigger identities. Restricting their owning
table labels to the actual Q10 target set yields **46 policies and 75 triggers**,
matching the earlier user-supplied Q10 counts. The other six policies are:

- auth_settings_read, writer_settings_read, settings_tenant_read on tenancy.agency_settings;
- invitations_authorized_read on tenancy.membership_invitations;
- client_receipts_insert and client_receipts_read on app_private.client_creation_receipts.

The four extra trigger identities are two RI_ConstraintTrigger labels on
tenancy.permissions and two on auth.users. Three application trigger identities are
clients_capture_creation on tenancy.clients, clients_guard on tenancy.clients and
vehicles_guard on tenancy.vehicles, matching the earlier supplied names. The other
76 trigger labels have PostgreSQL RI_ConstraintTrigger naming; 72 are within Q10 scope.
These names are consistent with internal FK triggers, but Q16 does not carry tgisinternal
or contype, so classification as internal/FK is supported by prior Q10 observations,
not independently proven by this export alone.

The broader counts therefore reflect neighborhood/scope differences, not a demonstrated
contradiction. Policy edges include policy→function and policy→table/column dependencies;
they cannot prove safe USING/WITH CHECK, applicable roles, permissive-policy combination,
trigger activation, hardening or tenant isolation. Existing Q05/Q10 hardening findings
remain unresolved. Node/source hashes and role/ACL evidence require separate artifacts.

### Migration-history metadata

Six unique history-related tuples (15 representations) concern the schema_migrations
relation/namespace, row/array types, schema_migrations_pkey constraint/index/version
column and a dependent TOAST table. A table and row type share a label but different
catalog addresses. The primary-key/version linkage is structural evidence only;
column type/SELECT/RLS/complete visibility/content safety still require Q13 evidence.
No migration version values, statements or customer records appear. Q14 remains
BLOCKED; this graph does not authorize history-content inspection or history INSERT.

## 6. Coverage gaps and truncation bias

All 2,000 rows belong to the lexically first kind group, declared-edge. Within it,
1,093 hop1 rows precede a **partial hop2 segment** of907. Canonical ordering places
extension-membership/root/shared-edge kinds later. Consequently none of those groups
is represented in the export. The746 omitted result rows include the remaining
returned-query suffix, but their breakdown cannot be calculated from this file.

**Root reporting:** zero root-kind rows is a truncation artifact, not proof of absent
root tables/functions. Several intended root objects are visible as edge endpoints,
including required identity/tenancy tables, canonical helpers and schema_migrations;
the selected root inventory itself cannot be reconstructed or certified complete.
Absent proposed rental objects cannot be proved from this prefix. **Shared authority:**
no shared-edge rows means Q16 supplies no exported owner/ACL role-dependency evidence.
It does not mean no owners/ACLs exist. Extension boundary behavior cannot be runtime
verified from the missing membership group; only its SQL implementation was reviewed.

Even all2,746 rows would be incomplete by design: two-hop neighborhood, application
expansion boundaries, excluded extension members, per-path cycle-closing suppression,
dynamic/unrecorded SQL and external/provider behavior remain unresolved. Mixed-direction
paths are not transitive business dependencies. Shared/membership labels can have hop3
without recursive expansion beyond2. LIMIT bounds output, not planner time/fanout;
count/sort run over the pre-limit result. This successful exported prefix does not
establish future runtime cost or permissions for another executor/snapshot.

## 7. Cross-batch assessment and remaining blockers

**Confirmed consistency:** Q10-scoped counts and three application trigger identities
match the earlier supplied observations. Auth mapping and same-tenant structural
relationships are plausible expected dependencies. None of this supplies missing raw
Q01–Q15 role/settings/ACL/history results or proves current exact helper implementation.
The 82 constraint identities are a broader neighborhood and are not comparable directly
to Q09's37 p/u/f rows; Q16 does not export constraint type/validation/key arrays.
No contradiction is established by those different counts.

**Unknowns:** exact executed query/executor/time/project binding; omitted result kind
counts; complete root/shared-role/extension evidence; Q13/Q15 raw outcomes; actual
SECURITY DEFINER/INVOKER owners, BYPASSRLS and final ACL/default behavior; referenced
constraint and policy semantics; future ownership-transfer/role-grant authority.
No new unexpected-object vulnerability is established merely by deeper-scope objects.
No complete security certification follows from a consistent graph prefix.

Production blockers persist: unresolved helper/guard hardening, broad default ACL impact,
non-superuser ADMIN/SET/grantor and ownership-transfer recipe, temporary authority
restoration, dependency/collision/tenant compatibility, exact release ACLs/policy
preservation, atomic migration-history/serialization/recovery and explicit deployment
approval. Original rental migration remains guarded and nondeployable. No source,
role, privilege or Production state was changed here.

## 8. Recommended next evidence step

Preserve this export/hash and bind it to the actual approved execution context and
already-collected Q01–Q15 artifacts. Do not treat it as complete dependency evidence.
Next catalog collection should be separately authorized and independently reviewed to
recover omitted declared-hop2, root, extension-membership and shared-edge evidence,
using bounded nonoverlapping scopes and complete catalog-address ordering. Address
snapshot stability and same-object duplicates explicitly. Do not blindly remove LIMIT,
use unstable offset paging or assume separately collected pages share a snapshot.
No executable SQL or permission to run additional queries is provided by this report.

## 9. Offline verification controls

Observed-file validation accepted decimal-string OIDs deliberately and checked all
2,000 records. Full-file parse, row/constants/type checks, classification grouping,
address deduplication and scope comparison were performed in memory without a database.
Input byte hash was recorded and checked unchanged after review. Reviewed query and
other existing documents remained unchanged. Links/trailing whitespace and
git diff --check passed. Only this report changed; its prior missing-file report is
preserved below verbatim as history.

**Final verdict: PARTIAL. Export integrity PASS; full dependency/security review remains
BLOCKED by truncation and missing cross-batch/provenance evidence. Production NO-GO.**

---

## Historical report — before the Q16 file became available (superseded)

# Q16 Production results — Offline verification status

**Executive verdict: PARTIAL — required Q16 result export unavailable.**
**Production NO-GO.** This is an evidence-availability and query-contract review,
not verification of actual returned Production records. No SQL or connection occurred.

## Evidence inventory

| Evidence | Status / provenance |
|---|---|
| Approved canonical Q16 | Observed repository source: [query package, Q16](rental-contracts-production-catalog-query-review.md), heading at line597, SQL lines600–682 |
| Query review history | Read [original audit](rental-contracts-production-catalog-independent-audit.md), [final Q16 review](rental-contracts-production-catalog-q16-independent-final-review.md) and [boundary fix](rental-contracts-production-catalog-q16-fix.md) |
| Existing cross-batch findings | Read [Batch 3 verification](rental-contracts-production-catalog-batch3-verification.md); these preserve supplied observations and outstanding source/security limitations |
| Q16 total 2746 | User-specified expected value only; not independently observed in any exported row |
| Complete Q16 CSV/JSON | UNKNOWN / missing. No such supplied file/path was available in this turn |
| Candidate Downloads export | Header-only check of Supabase Snippet Untitled query (3).csv identified Q03 fields, not Q16. Its contents were not repurposed as Q16 evidence |
| Search coverage | Repository catalog/CSV filenames, attachment file inventory and Downloads candidate inventory checked. This is not a full-disk search or proof the export does not exist elsewhere |
| Exact executed SQL, project/executor/time binding, result hash | UNKNOWN: unavailable with the missing Q16 export |

A clarification requesting the local path was issued. No path was received before
this report. Missing records are not substituted with excerpts, invented identifiers,
zero counts or inferred Production objects. No existing evidence was modified.

## Result integrity and exact-count status

| Required check | Actual verified value | Interpretation |
|---|---|---|
| File bytes/hash/format | UNKNOWN | Q16 file unavailable |
| Actual exported record count | UNKNOWN | Do not assume 2000 based solely on LIMIT |
| Every rows_total equals 2746 | UNKNOWN | No rows inspected |
| LIMIT 2000 in approved SQL | Observed: 2000 | Source fact, not actual export count |
| Source two-hop declaration | Observed: declared_hop_limit=2 | Not proof of complete dependency coverage |
| Source complete_dependency_closure | Observed: false | Deliberately incomplete |
| Schema/types/nullability/malformed CSV or JSON | UNKNOWN | Requires complete actual exported file |
| Omitted output rows | Conditional inference: 746 | Only if a matching execution had 2746 pre-limit rows and returned/exported all first 2000 |

Conditional arithmetic: 2746−2000=746 omitted result rows, about27.17% of the query's
pre-limit result. This is NOT 746 distinct objects/dependencies: traversal direction,
hop and overlapping roots can repeat the same dependency address. A file containing
all 2000 returned rows is a complete export of a truncated result, not the complete
2746-row query result and certainly not complete dependency closure.

## Classification tables — not measurable without the export

| kind expected from source | Observed count |
|---|---|
| declared-edge | UNKNOWN |
| extension-membership | UNKNOWN |
| shared-edge | UNKNOWN |
| root | UNKNOWN |

| hop/direction/dependency dimension | Observed count |
|---|---|
| hop0 / root | UNKNOWN |
| hop1 / incoming or outgoing or shared | UNKNOWN |
| hop2 / incoming or outgoing or shared | UNKNOWN |
| hop3 / membership/shared reporting | UNKNOWN |
| dependency_type by actual value | UNKNOWN |
| Repeated exact result rows | UNKNOWN |
| Unique directed dependency address tuples | UNKNOWN |
| Same edge shown with incoming/outgoing traversal | UNKNOWN |
| Unique root/node addresses | UNKNOWN |

These are expected classes, not assertions that each exists. Source allows root rows
without dependency_type/ref-address fields and referenced_identity=NULL. Edge rows
carry JSON addresses; declared/membership/shared rows need classification-specific
shape checks rather than a blanket NOT NULL rule for every JSON key.

Expected top-level columns, in order: kind, hop, direction, object_identity,
referenced_identity, addresses, declared_hop_limit, complete_dependency_closure,
rows_total. Output text/JSON and integer/boolean representations must be validated
according to export format; raw CSV lines must not be counted as records because
quoted fields can contain newlines. Parsing must inspect the entire file and reject
malformed records; no such parse was possible in this review.

For actual classification, unique directed edges must use the complete catalog
address tuple (classid,objid,subid,refclassid,refobjid,refsubid,dependency_type), not
object label alone. Traverse direction/hop separately; incoming/outgoing labels do
not reverse the original stored edge orientation. Root JSON is a node address, not
an edge. Shared dbid is filtered by the source but not emitted, so the complete
cross-database edge provenance cannot be reconstructed from this output alone.

## Security-relevant dependency checks

**Observed source contract:** Q16 reads PostgreSQL catalogs only, including pg_depend,
pg_shdepend and object identification. It does not select application rows, auth
records, function bodies, credentials or migration-history contents. The history
relation is a metadata root, not a request to inspect its values; Q14 stays BLOCKED.
Metadata identifiers/role names remain operationally sensitive.

**UNKNOWN actual findings:** dependencies involving identity, tenancy, app_private,
auth and supabase_migrations; policy/trigger/FK/helper endpoints; owners and role/ACL
edges; extension membership; unexpected objects. These cannot be listed or counted
from the approved source's intended roots. auth may appear as a boundary endpoint,
but its actual presence is not established.

Q16 does not return SECURITY DEFINER flags or policy predicates. A function address
must be reconciled with matching Q05/Q10 function metadata before labeling it a
verified definer. Catalog edges alone do not prove safe tenant predicates, privileges
or successful restricted-user execution. No absence/security certification follows
from a missing endpoint in a truncated two-hop graph.

## Coverage and ordering effects

The approved source traverses in both directions up to two hops, excludes direct
catalog extension members from expansion, retains membership/shared edges separately,
and excludes per-path repeated exact addresses. It does not fully enumerate dynamic
SQL, external code, unrecorded dependencies, nonexpandable neighborhoods or cycle-closing
edges. Shared/membership labels can have hop3 without further recursion. Mixed-direction
paths do not necessarily establish transitive business dependencies.

Output is sorted by kind,hop,object_identity,referenced_identity before LIMIT. Consequently
truncation is a biased prefix, not a representative sample: later kind groups (including
root/shared-edge) can be entirely absent. Without actual kind counts it is UNKNOWN
whether that happened. Missing root rows would therefore not prove absent roots, even
before accounting for missing-object joins. Ordering has no complete address tie-breaker,
so separate snapshots/pages must not be assumed stable or safely composable.

Worst-case fanout, final sort/count and repeated paths are not bounded by LIMIT2000.
Neither 2746 nor a successful export would prove the query inexpensive on a future
snapshot. This report authorizes no new execution or SQL alteration.

## Cross-check against Q01–Q15 and unresolved questions

Existing documents preserve Q01/Q02 success reports, Q03 532 rows, Q04 no sequences,
Q05 unresolved hardening, Q06 type USAGE, Q07 broad public default ACLs, Q08 unresolved
role/ownership authority, and Batch3 constraint/policy/trigger/collision/extension
observations. Those supplied summaries are not a complete independent raw evidence
set here. Q13/Q15 actual exported results are not supplied in this task; Q14 remains
excluded. No Q16 contradiction or confirmation can be independently established while
the Q16 export is unavailable. The claimed 2746 total does not itself contradict any
prior object count because Q16 is a different, path/edge-expanded result.

Preserve Production blockers: helper/guard hardening and policy semantics, restricted
final ACL/default handling, exact non-superuser role creation/ADMIN/SET/grantor and
ownership-transfer authority, temporary-authority restoration, collisions/dependency
compatibility, atomic release/history/serialization, recovery/target binding and
explicit approval. The draft remains guarded/nondeployable. Metadata alone cannot
clear these blockers even if a full Q16 export later parses successfully.

## Recommended next evidence step

First provide the exact local path or attach the complete existing Q16 exported
CSV/JSON, with non-secret query/execution/project/role/time context. Do not rerun SQL
just to supply an already collected file. Preserve its bytes and hash, then perform
full-file parse/count/classification and raw cross-batch evidence reconciliation.
Do not include credentials or customer data.

If that file confirms 2000 rows with consistent rows_total2746, record PARTIAL coverage;
the additional 746 result rows and deeper/untracked dependencies remain missing. Any
further catalog collection needs its own reviewed bounded scope and separate
read-only authorization, with stable ordering/snapshot limitations addressed. This
report supplies no executable query or approval to bypass the original LIMIT.

## Verification of this report

Only this new Markdown report was created. Existing catalog/evidence documents stayed
unchanged. Relative links and whitespace were checked. No SQL, database connection,
PostgreSQL process, migration, role/ACL change, commit, push or deployment occurred.

**Final status: PARTIAL verification; required raw-result review BLOCKED by missing
input. Production NO-GO.**
