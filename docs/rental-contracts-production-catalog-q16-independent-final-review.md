# Q16 — Final independent offline security re-review

**Independent verdict: SAFE — offline metadata collection candidate.**
**Package: SAFE 15 / NEEDS REVISION 0 / BLOCKED 1 (Q14).**
Production deployment remains **BLOCKED / NO-GO**. No SQL or connection was executed.
This is a source review and documentation artifact, not execution authorization.

## Sources and exact reviewed SQL

Read the [query package](rental-contracts-production-catalog-query-review.md),
[targeted fix](rental-contracts-production-catalog-q16-fix.md),
[earlier independent re-review](rental-contracts-production-catalog-independent-rereview.md)
and [remediation record](rental-contracts-production-catalog-remediation.md).
Their earlier verdicts remain historical evidence; none was modified.

Reviewed package SHA256: 95652f7dd7aeb8d47ae079a5094e6e22380b62982d04c1c02d44093c98326da4.
Reviewed Q16 SQL-block SHA256: 5f97a88087afa11eddb5e8ac92878bb01341a5ef160152c82f6490196675aa6c.
The following is an exact copy of the reviewed SQL block, including its final newline;
it is **NOT EXECUTED** and must not be treated as a deployment script.

```sql
WITH RECURSIVE wanted(schema_name,table_name) AS (VALUES ('identity','users'),('identity','supabase_users'),
 ('tenancy','agencies'),('tenancy','memberships'),('tenancy','roles'),('tenancy','membership_roles'),('tenancy','role_permissions'),
 ('tenancy','clients'),('tenancy','vehicles'),('tenancy','audit_events'),('supabase_migrations','schema_migrations'),
 ('tenancy','rental_contracts'),('app_private','rental_numbers'),('app_private','rental_creation_receipts'),('app_private','rental_confirmation_receipts')),
tables AS (SELECT c.oid FROM wanted w JOIN pg_catalog.pg_namespace n ON n.nspname=w.schema_name
 JOIN pg_catalog.pg_class c ON c.relnamespace=n.oid AND c.relname=w.table_name),
roots(classid,objid,objsubid) AS (
 SELECT 'pg_catalog.pg_class'::pg_catalog.regclass::pg_catalog.oid,oid,0 FROM tables
 UNION SELECT 'pg_catalog.pg_proc'::pg_catalog.regclass::pg_catalog.oid,p.oid,0 FROM pg_catalog.pg_proc p
 WHERE p.oid IN(pg_catalog.to_regprocedure('app_private.canonical_auth_user()'),pg_catalog.to_regprocedure('app_private.receipt_auth_uid()'))
 UNION SELECT 'pg_catalog.pg_constraint'::pg_catalog.regclass::pg_catalog.oid,k.oid,0 FROM pg_catalog.pg_constraint k WHERE k.conrelid IN(SELECT oid FROM tables)
 UNION SELECT 'pg_catalog.pg_class'::pg_catalog.regclass::pg_catalog.oid,i.indexrelid,0 FROM pg_catalog.pg_index i WHERE i.indrelid IN(SELECT oid FROM tables)
 UNION SELECT 'pg_catalog.pg_trigger'::pg_catalog.regclass::pg_catalog.oid,t.oid,0 FROM pg_catalog.pg_trigger t WHERE t.tgrelid IN(SELECT oid FROM tables)
 UNION SELECT 'pg_catalog.pg_policy'::pg_catalog.regclass::pg_catalog.oid,p.oid,0 FROM pg_catalog.pg_policy p WHERE p.polrelid IN(SELECT oid FROM tables)
 UNION SELECT 'pg_catalog.pg_type'::pg_catalog.regclass::pg_catalog.oid,t.oid,0 FROM pg_catalog.pg_type t WHERE t.typrelid IN(SELECT oid FROM tables)
),
expansion_candidates(classid,objid) AS (
 SELECT 'pg_catalog.pg_class'::pg_catalog.regclass::pg_catalog.oid,c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('identity','tenancy','app_private','public','supabase_migrations')
 UNION SELECT 'pg_catalog.pg_proc'::pg_catalog.regclass::pg_catalog.oid,p.oid FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN('identity','tenancy','app_private','public','supabase_migrations')
 UNION SELECT 'pg_catalog.pg_type'::pg_catalog.regclass::pg_catalog.oid,t.oid FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname IN('identity','tenancy','app_private','public','supabase_migrations')
 UNION SELECT 'pg_catalog.pg_constraint'::pg_catalog.regclass::pg_catalog.oid,k.oid FROM pg_catalog.pg_constraint k WHERE k.conrelid IN(SELECT oid FROM tables)
 UNION SELECT 'pg_catalog.pg_trigger'::pg_catalog.regclass::pg_catalog.oid,t.oid FROM pg_catalog.pg_trigger t WHERE t.tgrelid IN(SELECT oid FROM tables)
 UNION SELECT 'pg_catalog.pg_policy'::pg_catalog.regclass::pg_catalog.oid,p.oid FROM pg_catalog.pg_policy p WHERE p.polrelid IN(SELECT oid FROM tables)
 UNION SELECT 'pg_catalog.pg_attrdef'::pg_catalog.regclass::pg_catalog.oid,d.oid FROM pg_catalog.pg_attrdef d WHERE d.adrelid IN(SELECT oid FROM tables)
 UNION SELECT 'pg_catalog.pg_rewrite'::pg_catalog.regclass::pg_catalog.oid,r.oid FROM pg_catalog.pg_rewrite r WHERE r.ev_class IN(SELECT oid FROM tables)
),
extension_members(classid,objid,extension_oid) AS (
 SELECT d.classid,d.objid,d.refobjid FROM pg_catalog.pg_depend d
 WHERE d.refclassid='pg_catalog.pg_extension'::pg_catalog.regclass
 AND d.deptype='e' AND d.objsubid=0 AND d.refobjsubid=0
),
expandable(classid,objid) AS (
 SELECT c.classid,c.objid FROM expansion_candidates c
 WHERE NOT EXISTS(SELECT 1 FROM extension_members m WHERE m.classid=c.classid AND m.objid=c.objid)
),
walk(classid,objid,objsubid,depth,path,edge_classid,edge_objid,edge_subid,refclassid,refobjid,refsubid,deptype,direction) AS (
 SELECT r.classid,r.objid,r.objsubid,0,ARRAY[pg_catalog.format('%s:%s:%s',r.classid,r.objid,r.objsubid)],
 NULL::pg_catalog.oid,NULL::pg_catalog.oid,NULL::pg_catalog.int4,NULL::pg_catalog.oid,NULL::pg_catalog.oid,NULL::pg_catalog.int4,NULL::pg_catalog.text,'root'::pg_catalog.text FROM roots r
 UNION ALL
 SELECT next.classid,next.objid,next.objsubid,w.depth+1,
 w.path||pg_catalog.format('%s:%s:%s',next.classid,next.objid,next.objsubid),
 d.classid,d.objid,d.objsubid,d.refclassid,d.refobjid,d.refobjsubid,d.deptype::pg_catalog.text,
 CASE WHEN d.classid=w.classid AND d.objid=w.objid AND (w.objsubid=0 OR d.objsubid=w.objsubid) THEN 'outgoing' ELSE 'incoming' END
 FROM walk w JOIN expandable e ON e.classid=w.classid AND e.objid=w.objid
 JOIN pg_catalog.pg_depend d ON
  (d.classid=w.classid AND d.objid=w.objid AND (w.objsubid=0 OR d.objsubid=w.objsubid)) OR
  (d.refclassid=w.classid AND d.refobjid=w.objid AND (w.objsubid=0 OR d.refobjsubid=w.objsubid))
 CROSS JOIN LATERAL (SELECT
  CASE WHEN d.classid=w.classid AND d.objid=w.objid AND (w.objsubid=0 OR d.objsubid=w.objsubid) THEN d.refclassid ELSE d.classid END AS classid,
  CASE WHEN d.classid=w.classid AND d.objid=w.objid AND (w.objsubid=0 OR d.objsubid=w.objsubid) THEN d.refobjid ELSE d.objid END AS objid,
  CASE WHEN d.classid=w.classid AND d.objid=w.objid AND (w.objsubid=0 OR d.objsubid=w.objsubid) THEN d.refobjsubid ELSE d.objsubid END AS objsubid) next
 WHERE w.depth<2 AND NOT(pg_catalog.format('%s:%s:%s',next.classid,next.objid,next.objsubid)=ANY(w.path))
),
nodes AS (SELECT classid,objid,objsubid,pg_catalog.min(depth) AS depth FROM walk GROUP BY classid,objid,objsubid),
found AS (
 SELECT DISTINCT 'declared-edge'::pg_catalog.text AS kind,w.depth AS hop,w.direction,
 (pg_catalog.pg_identify_object(w.edge_classid,w.edge_objid,w.edge_subid)).identity AS object_identity,
 (pg_catalog.pg_identify_object(w.refclassid,w.refobjid,w.refsubid)).identity AS referenced_identity,
 pg_catalog.jsonb_build_object('classid',w.edge_classid,'objid',w.edge_objid,'subid',w.edge_subid,
 'refclassid',w.refclassid,'refobjid',w.refobjid,'refsubid',w.refsubid,'dependency_type',w.deptype) AS addresses
 FROM walk w WHERE w.depth>0
 UNION ALL
 SELECT DISTINCT 'extension-membership',n.depth+1,'outgoing',
 (pg_catalog.pg_identify_object(n.classid,n.objid,0)).identity,
 (pg_catalog.pg_identify_object('pg_catalog.pg_extension'::pg_catalog.regclass,m.extension_oid,0)).identity,
 pg_catalog.jsonb_build_object('classid',n.classid,'objid',n.objid,'subid',0,
 'refclassid','pg_catalog.pg_extension'::pg_catalog.regclass::pg_catalog.oid,
 'refobjid',m.extension_oid,'refsubid',0,'dependency_type','e')
 FROM nodes n JOIN extension_members m ON m.classid=n.classid AND m.objid=n.objid
 UNION ALL
 SELECT 'shared-edge',n.depth+1,'shared',
 (pg_catalog.pg_identify_object(s.classid,s.objid,s.objsubid)).identity,
 (pg_catalog.pg_identify_object(s.refclassid,s.refobjid,0)).identity,
 pg_catalog.jsonb_build_object('classid',s.classid,'objid',s.objid,'subid',s.objsubid,
 'refclassid',s.refclassid,'refobjid',s.refobjid,'dependency_type',s.deptype)
 FROM nodes n JOIN pg_catalog.pg_shdepend s ON s.classid=n.classid AND s.objid=n.objid AND (n.objsubid=0 OR s.objsubid=n.objsubid)
 WHERE s.dbid IN(0,(SELECT oid FROM pg_catalog.pg_database WHERE datname=pg_catalog.current_database()))
 UNION ALL
 SELECT 'root',0,'root',(pg_catalog.pg_identify_object(r.classid,r.objid,r.objsubid)).identity,NULL,
 pg_catalog.jsonb_build_object('classid',r.classid,'objid',r.objid,'subid',r.objsubid) FROM roots r
)
SELECT *,2 AS declared_hop_limit,false AS complete_dependency_closure,
 pg_catalog.count(*) OVER() AS rows_total FROM found ORDER BY kind,hop,object_identity,referenced_identity LIMIT 2000;
```

## Independent extension-membership assessment

The membership CTE uses pg_depend.refclassid=pg_catalog.pg_extension,
deptype='e', objsubid=0 and refobjsubid=0. This identifies a whole dependent object
that is a catalog extension member. The dependent address is classid+objid+objsubid;
the extension OID is refobjid. Extension membership cannot be independently assigned
to a column. No owning-role or namespace heuristic substitutes for membership.

The expandable anti-join matches BOTH classid and objid, preventing an equal numeric
OID in an unrelated catalog from excluding an ordinary application object. It omits
subid deliberately: an extension member table must also be stopped when reached as a
column node. Roots all have subid0; no root bypass exists because the recursive term
always joins expandable before reading incident pg_depend edges.

These cases are distinct:

| Catalog situation | Result |
|---|---|
| Direct e membership referencing pg_extension | Removed from expandable, regardless of candidate branch/schema/root status |
| Ordinary object referencing an extension-owned function/type/table | Remains eligible if otherwise in candidates; its own address has no e membership |
| Automatic dependency on extension itself (deptype=x) | Does not alone confer membership; remains eligible if otherwise in candidates |
| Equal object OID but different classid | Not excluded by another object's membership |
| Column visit of an e-member table | Table classid+objid exclusion applies to column too |
| Ordinary object in allowed scope with no membership | Original eligibility preserved |

Objects with internal/automatic dependencies on members are not recursively declared
members merely for that reason. Thus this enforces the documented *direct catalog
membership* boundary, not a claim to identify every object operationally controlled by
an extension. Dependent row types/indexes/internal objects can have their own candidate
eligibility without direct e membership. Their catalog edges may still lead to a
member endpoint, which cannot be expanded. Unknown extension implementation semantics
remain outside this metadata proof.

## Recursive expansion and dependency reporting

All eight expansion_candidates branches feed the same NOT EXISTS filter. There is
no alternate recursive UNION branch using unfiltered candidates or roots. Candidate
UNION removes duplicate classid+objid rows; NOT EXISTS does not multiply rows even if
membership metadata were duplicated. The new reporting branch does not feed walk or
nodes. It introduces no duplicate expansion. Existing UNION ALL traversal can revisit
an object through distinct root/path combinations; no claim of globally unique visits
is made.

The recursive WHERE still requires w.depth<2. Seeds are depth0; visited nodes reach
at most depth2. Path exclusion prevents repeating an exact classid:objid:subid within
that path. Finite depth bounds traversal even where different subobjects/paths revisit
related objects. LIMIT 2000 bounds output only, not fanout, memory or execution time.

Direct declared-edge orientation is correct: pg_depend.classid/objid/objsubid identifies
the dependent and refclassid/refobjid/refobjsubid the referenced object. Outgoing means
traversing dependent to referenced; incoming reverses traversal but does not reverse
the output's original catalog addresses. Discovered incoming edges to a member remain
in walk/found before expansion stops. A selected member root remains in the root output.
Other incident edges of blocked members are intentionally not enumerated: retaining
all such edges would contradict the traversal boundary. This is not a complete direct
edge inventory of every member.

The extension-membership UNION independently reports each visited member's whole-object
address and extension reference with dependency_type=e. It therefore retains membership
evidence even for a blocked root or depth2 endpoint. It is a direct catalog edge, not
an inferred transitive dependency. It can have hop3, but never adds a depth3 traversal
node. Different visited subobjects/depths can yield repeated membership labels; SELECT
DISTINCT removes exact duplicates only. These rows must not be counted as distinct
objects without grouping by catalog address.

The pg_shdepend branch still joins nodes, not expandable. Visited extension members
therefore retain outgoing shared owner/ACL/etc. references. Its dbid filter includes
only the current database and shared dbid0; no cross-database role dependents are
searched. Shared labels can also have hop3. Shared owner/ACL edges are neither grants
nor evidence that the current executor can assume a referenced role.

pg_identify_object labels raw catalog addresses using quoted qualified identity,
including function overload types, without executing the identified object. Numeric
addresses are scoped to the target database/cluster snapshot, not portable persistent
identities. No target/project or system-identifier binding is independently established.
Concurrent object changes or permission errors remain stop conditions.

## Query safety and sensitive-data assessment

The single-SELECT AST is supporting evidence, not the basis of safety by itself.
Reviewed exact relations, calls, casts, operators and data flow:

- Catalog reads only: namespace/class/procedure/constraint/index/trigger/policy/type,
  attribute-default/rewrite, pg_depend, pg_shdepend and pg_database. No application
  table contents, migration-history contents or function bodies are read.
- to_regprocedure resolves two fixed qualified helper signatures without invoking them.
  pg_identify_object formats object identity; it does not invoke functions, predicates,
  triggers or extension code. current_database reports context without changing it.
- count/min aggregate metadata; format/jsonb_build_object construct local labels and
  JSON. All seven explicit functions are pg_catalog-qualified built-ins. No modifying
  function, nextval, external call, application SECURITY DEFINER RPC or lock-acquisition
  function appears. Regclass casts name fixed pg_catalog relations; casts/operators
  use built-in types, not business-defined input/output routines.
- No DDL/DML, modifying CTE, role/session/transaction change or temporary object exists.
  Normal catalog-read locks and planner work still occur. Existing catalog SELECT and
  built-in EXECUTE privileges are required; this review authorizes no escalation.
- Output consists of object identities, catalog addresses, dependency labels, hops
  and counts. No credential/token/password/settings/source/argument payload fields are
  selected. Object names may themselves contain sensitive operational information;
  arbitrary names cannot be certified secret-free by reviewing query text. Keep
  outputs in approved custody and stop for unexpected sensitive metadata.

No new security or correctness defect was found in the targeted extension boundary.

## Verification and limits

Offline checks passed:

1. Installed pgsql-parser AST version 180004 parsed Q16 as exactly one SelectStmt;
   recursive AST inspection found no non-SELECT statements or modifying CTEs.
2. Explicit call inventory: pg_catalog.count, current_database, format,
   jsonb_build_object, min, pg_identify_object and to_regprocedure. Each was inspected
   for actual use/side effects as described above.
3. Source/data-flow inspection checked membership class/OID/subobject conditions,
   the one expansion filter, absence of recursive bypass, direction, direct membership
   and shared reporting, depth2, count and LIMIT2000.
4. Q01–Q15 matched the retained pre-fix SQL snapshot. Source documents remained
   byte-identical to their contents captured at review start. No query was edited.
5. The exact SQL embedded here matches the source Q16 block. Relative links and
   trailing whitespace were checked directly; git diff --check also passed.

These catalog fields and e/x dependency meanings are PostgreSQL 17 semantics.
No network documentation fetch or live catalog check occurred in this offline task.
The parser is PostgreSQL 18-based; parse success does not establish PG17 runtime
planning/type resolution, managed EXECUTE/catalog permissions or actual server state.
Those remain UNVERIFIED. No PostgreSQL binary/process, SQL or connection was used.

Coverage remains intentionally incomplete: dynamic SQL/string-body references,
external libraries/provider behavior, unrecorded/pinned dependencies, missing roots,
cycle-closing edges, noncandidate endpoints and depth/output caps remain unresolved.
Mixed-direction two-hop paths establish neighborhood reachability, not transitive
business dependencies or call chains. hop is traversal depth, not necessarily shortest
distance. complete_dependency_closure=false correctly denies complete coverage.
Truncated results or a limit-saturated output must not establish absence of dependencies.

## Final package decision and eligibility

**Q16: SAFE — offline metadata collection candidate**, within the above contract.
This resolves the previous specific Q16 NEEDS REVISION finding for this fingerprint.
It does not certify dependency completeness or Production compatibility.

Combined with the unchanged earlier accepted queries: **15 SAFE / 0 NEEDS REVISION /
1 BLOCKED**. Q14 remains BLOCKED; neither Q13 success nor this Q16 verdict authorizes
history-content inspection. The other verdicts are carried forward from the preserved
reviews, not re-audited beyond preservation in this targeted task.

Eligible for separately authorized limited metadata collection:
**Q01–Q13, Q15 and Q16** in the fingerprint-bound query package. **Exclude Q14.**
Authorization must bind project, exact executor, query IDs/fingerprint, output custody
and existing platform timeouts. Missing/ambiguous/truncated evidence, access errors,
unexpected roles/objects or unknown security semantics require stopping and review,
not retries, privilege changes or role substitution.

Production remains BLOCKED / NO-GO pending real metadata reconciliation, non-superuser
role/ADMIN/SET/grantor and ownership-transfer authority, exact temporary-authority
restoration, current helper/schema/ACL/default compatibility, collision/dependency
review, preservation of unrelated privileges/policies, an independently reviewed atomic
release/history/serialization/recovery plan and explicit deployment approval. Local
SUPERUSER-bootstrap tests do not discharge these requirements. The guarded rental
migration remains nondeployable and was not modified.

Semantic references for later verification (not fetched/executed in this offline task):
[PG17 pg_depend](https://www.postgresql.org/docs/17/catalog-pg-depend.html),
[extension membership](https://www.postgresql.org/docs/17/extend-extensions.html),
[pg_shdepend](https://www.postgresql.org/docs/17/catalog-pg-shdepend.html),
[object identification](https://www.postgresql.org/docs/17/functions-info.html).
