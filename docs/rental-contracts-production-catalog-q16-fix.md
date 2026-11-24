# Q16 — Targeted extension-boundary remediation

**PREPARED, NOT EXECUTED. Ready for independent re-review, not independently approved.**
Production deployment remains **BLOCKED / NO-GO**. Q14 remains BLOCKED.

Sources inspected: [query package](rental-contracts-production-catalog-query-review.md),
[remediation record](rental-contracts-production-catalog-remediation.md) and
[independent re-review](rental-contracts-production-catalog-independent-rereview.md).
Earlier reports are historical evidence and were not changed.

## Original defect

Q16's expandable CTE admitted all relation/function/type objects in the listed
application namespaces and selected attached metadata. An extension-owned function
in public reached at depth 1 could therefore be expanded at depth 2, contradicting
the documented extension boundary. Schema location and owning role do not establish
catalog extension membership.

## Exact changes

Only the Q16 section of the query package changed:

1. Renamed the original expandable UNION to expansion_candidates without changing
   its namespace/attached-object selection.
2. Added extension_members(classid,objid,extension_oid), selecting pg_depend rows
   with refclassid='pg_catalog.pg_extension'::pg_catalog.regclass, deptype='e',
   objsubid=0 and refobjsubid=0.
3. Added expandable as the candidate set filtered by NOT EXISTS an extension member
   with the same classid AND objid. This applies uniformly to every candidate branch.
4. Added an extension-membership reporting branch for visited nodes. It emits the
   member's whole-object identity, extension identity and original catalog addresses
   with dependency_type=e. It does not add nodes to the recursive walk.
5. Documented the classification, retained evidence and membership-reporting hop limit.

## PostgreSQL 17 semantics and behavior

pg_depend records the dependent object as classid/objid/objsubid and its referenced
object as refclassid/refobjid/refobjsubid. Extension membership uses deptype=e and
references pg_extension. Membership applies to whole objects; columns cannot be
independently added to an extension. Matching classid prevents unrelated catalogs'
equal numeric OIDs from excluding one another. Matching objid across column visits
prevents expanding a member table through one of its column nodes.

deptype=x is an automatic extension dependency, not membership: e.g. an application
function may depend on an extension without being an extension member. It is not
excluded solely for that reason. No assumption is made from schema or owner identity.
Objects with only internal/automatic dependencies on extension members are not
recursively classified as members by this fix; the exclusion is direct catalog
membership. That distinction does not imply those objects are independently owned
or safe to modify. Unknown ownership/dependency cases require further review.

| Case | Before | After |
|---|---|---|
| Ordinary in-scope application object, no e membership | Expandable | Still expandable |
| In-scope object with only x dependency | Expandable | Still expandable |
| In-scope extension member reached before depth 2 | Expandable | Reported endpoint, not expandable |
| Extension member explicitly selected as root | Expandable if candidate | Root reported, not expandable |
| Member table reached through a column | Could expand | Excluded by whole-object classid/objid |
| Member outside candidate namespaces | Not expandable | Still not expandable |
| Visited member's extension and shared role/ACL edges | Extension edge depended on traversal eligibility | Explicit membership and existing shared-edge reporting retained |

Incoming discovery edges and roots remain available. Other declared edges incident
to a member are intentionally not traversed: that is the documented boundary.
The extra reporting branch preserves extension identification even when recursion
stops at a member or depth 2. Shared dependencies still come from pg_shdepend for
visited nodes, restricted to the current database/shared dbid0. No global reverse
role-dependency scan is introduced. The new branch can repeat a whole-object
membership label for different visited subobjects; it is evidence, not object counts.

## Offline verification

- Q16 parsed with installed pgsql-parser AST version 180004 as exactly one SELECT.
  Recursive AST inspection found no modifying/other statements.
- Explicit calls remain count, to_regprocedure, format, min, pg_identify_object,
  jsonb_build_object and current_database, all pg_catalog-qualified. No new function
  calls were introduced. Their reviewed roles are catalog lookup/identification,
  local formatting/aggregation/context; no application/extension function is invoked.
- Inspected the anti-join over all candidates, whole-object membership conditions,
  and separate membership reporting from nodes rather than expandable. The recursive
  walk still joins expandable and retains w.depth<2, path cycle exclusion and its
  original incoming/outgoing address orientation.
- Final LIMIT 2000, count(*) OVER(), declared_hop_limit=2 and
  complete_dependency_closure=false are unchanged. Membership/shared reporting may
  show one edge beyond the traversal depth, without further recursion.
- Q01–Q15 SQL blocks remained byte-identical. Text before/after the Q16 section also
  remained identical. Earlier audit/remediation reports and guarded rental draft
  were compared with pre-edit contents and remained unchanged.
- Relative documentation references, direct trailing-whitespace checks and
  git diff --check passed. Direct checking includes these untracked documentation files.

These checks are source/AST evidence only. The parser is PostgreSQL 18-based, not
PostgreSQL 17 runtime proof. PG17's extension membership semantics were reviewed
offline; no fresh network documentation, SQL or catalog results were fetched.
Actual catalog access, provider grants, planner behavior/performance and target
contents remain UNVERIFIED. No PostgreSQL process or connection was started.

## Remaining limits and decision

This remains a bounded dependency neighborhood, not complete dependency closure or
a transitive application call graph. Mixed-direction paths do not prove transitive
dependency. Missing roots, unrecorded/dynamic SQL references, external code, omitted
cycle-closing edges, depth/namespace boundaries and truncated output remain unresolved.
Extension membership labels do not certify an extension's implementation or privileges.
LIMIT bounds output, not planner work; graph growth still requires controlled existing
timeouts and narrower review. Catalog names/addresses remain operationally sensitive;
no business records, raw source, settings, credentials or new sensitive fields were added.

**Q16 is ready for independent re-review.** This targeted fix does not supersede
the earlier NEEDS REVISION verdict or authorize metadata execution. No whole-package
SAFE count is newly certified. Separate approval remains required for metadata
collection, and Production deployment remains BLOCKED / NO-GO.

Semantic references for later verification (not fetched in this offline task):
[PG17 pg_depend](https://www.postgresql.org/docs/17/catalog-pg-depend.html),
[extension membership](https://www.postgresql.org/docs/17/extend-extensions.html),
[pg_shdepend](https://www.postgresql.org/docs/17/catalog-pg-shdepend.html).
