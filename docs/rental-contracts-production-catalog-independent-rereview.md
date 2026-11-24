# Rental Contracts Phase 1A — Independent offline re-review

**Verdict: limited metadata subset eligible for separate authorization; Q16 NEEDS
REVISION; Q14 BLOCKED. Production deployment remains BLOCKED / NO-GO.**

No SQL was executed, no database connection or PostgreSQL process was started, and
no execution authority is conferred by this report. This assessment independently
examines expressions, joins, output and catalog semantics rather than adopting the
author's SAFE labels. Earlier reports and the query package were not modified.

Reviewed query-package SHA256:
`8c7627a878a575f52b2ddd248a2796eadc6c0d94f0aebdcd4a38214d70d678bc`.

## Sources and preservation

- [Exact query package](rental-contracts-production-catalog-query-review.md), all 16 SQL blocks.
- [Remediation record](rental-contracts-production-catalog-remediation.md).
- [Earlier independent audit](rental-contracts-production-catalog-independent-audit.md).
- [Readiness assessment](rental-contracts-production-readiness.md) and [design](rental-contracts-phase1a.md).
- Native foundation/context/RLS/auth/agency/client/provisioning migrations 0001–0007;
  relevant vehicle, client-receipt and provisioning/agency-hardening draft/candidate
  dependencies through 0012; guarded rental draft
  `supabase/migration-drafts/20261120001300_rental_contracts.sql`.

The retained original audited SQL snapshot was compared directly with the current
blocks. Q01/Q02/Q04/Q06/Q07/Q08/Q09/Q11/Q12 and Q14 are byte-identical. The retained
snapshot's whole-document SHA256 matches the earlier audit's
`33778254fc17b1296ad5cbd28b381b944332978522d2bbaf0c8410bc1d3c71aa`.
This establishes source preservation, not Production equivalence. Earlier SAFE
limitations, including executor binding and output saturation, still apply.

## Independent classifications

**Revised six: SAFE 5 / NEEDS REVISION 1 / BLOCKED 0.**
**Whole package: SAFE 14 / NEEDS REVISION 1 / BLOCKED 1.**

SAFE means observational metadata suitable for its limited purpose under separate
authorization and existing permissions. It does not mean sufficient release evidence,
runtime-tested PostgreSQL 17 SQL, or proof that an actual deployment can execute.

### Q03 — SAFE

The `wanted` LEFT JOIN namespace/class/positive non-dropped attribute chain preserves
missing relation evidence; CROSS JOIN roles reports only existing roles, so required
role absence must be reconciled with Q01. Exact table OIDs and attnums support joins.
Stored `relacl`/`attacl` are separately decoded with `aclexplode`; no substituted
hardwired/default ACL is mislabeled explicit. NULL ACL is not an empty effective ACL.

The table VALUES list includes SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES,
TRIGGER and PG17 MAINTAIN, each checked separately with and without grant option.
The column list correctly limits inquiries to SELECT/INSERT/UPDATE/REFERENCES;
has_column_privilege also recognizes applicable table-wide grants. These answers
include applicable inheritance/PUBLIC/owner/superuser rules, not a unique grant path.
Object privilege alone does not establish schema access, row access or successful DML.

`direct_owner`, `pg_has_role(...,'USAGE')` and `pg_has_role(...,'SET')` are distinct.
SET is not exercised; NOINHERIT and per-edge membership options must be reconciled
with Q08. `row_security_active(c.oid)` is correctly labeled for the current executor,
not the cross-joined role. Neither ownership nor these ACL checks proves future role
creation, ADMIN authority or ownership transfer. Missing OIDs yield unresolved checks.
All input relations are catalogs; no identity/client data is selected. LIMIT 4000
and rows_total bound/detect output truncation, not aggregate/planner resource use.

### Q05 — SAFE

`to_regprocedure(x.signature)` binds the two exact qualified zero-input helpers and
LEFT JOINs preserve absence. Namespace, argument/return type OIDs, language, owner,
security/volatility/parallel/strict/leakproof/cost/support attributes and current ACL
are returned. Execute/grant-option checks do not invoke either helper. Overload
identity is fixed by the signature; numeric type/support OIDs need same-cluster mapping.

The only setting values returned by the CASE are substrings of four exact literal
strings: the two listed pg_catalog/pg_temp search_path spellings and row_security
on/off. Unknown settings emit a syntactically valid key or a withheld-key label,
NULL approved_value and an unexpected flag. Ordering by the original setting does
not output it. Raw proconfig/prosrc/prosqlbody/probin are not selected as result values.
Configuration keys/order/count still disclose operational metadata; keys themselves
are not guaranteed innocuous arbitrary identifiers. Keep output within review custody.

The source, parsed-body-node and binary-reference hashes improve drift detection,
but are NOT complete implementation equivalence. Parsed nodes contain cluster OIDs;
probin hashes a reference, not installed library bytes; support/language implementations,
called objects, external state and catalog changes remain outside the fingerprint.
Unknown hashes cannot approve helper semantics. pg_init_privs is scoped by pg_proc
class/OID/subid0 and represents initial provenance, not effective current authority.
The extension join verifies class/refclass/deptype='e'; it does not execute extensions.

`hardened_two_settings_exact` accepts only the spaced spelling in its containment
array, although configuration_metadata recognizes both spellings. An equivalent compact
value can therefore be a conservative false negative; false/NULL is not proof of an
unsafe function. These existing helpers are not assumed to have the same settings as
new rental entrypoints. The bounded required set and role list cap outer rows; nested
configuration/initial-ACL aggregates have no independent byte cap. No raw secret-bearing
configuration value was found in the output expressions.

### Q10 — SAFE

`targets` resolves exact schema/name relations. Missing targets produce no policy or
trigger rows; absence must be checked against Q03/the expected inventory. Policies
and triggers are UNION ALL branches with one final count/LIMIT 1000, not per-branch
counts. No predicate, trigger or SECURITY DEFINER body is evaluated.

Triggers include `tgisinternal`, parent, type bits, update attnums, argument count/hash,
constraint relation/index/OID, deferral and transition names. `tgfoid` joins the exact
pg_proc OID; namespace/name/input OIDs describe its signature. Owner/SECURITY DEFINER,
settings keys/hardened boolean and implementation fingerprints are included without
source/argument/WHEN literals. Trigger input arguments are separate from function input
types; zero-argument trigger functions still receive tgargs.

The mode test handles A=always, O=origin/local, R=replica; D is false. It proves only
enablement for that session mode. WHEN, event/column match, constraint deferral,
partition propagation and the body still determine whether enforcement occurs.
Unknown hashes, missing expected triggers, NULL settings or output truncation cannot
establish tenant enforcement. The exact-spelling false-negative limitation from Q05
also applies here. No false-positive approval of trigger semantics is justified.

### Q13 — SAFE metadata; Q14 remains BLOCKED

The lookup reports exact namespace/relation OIDs, kind/persistence/inheritance/rules,
version and other column native type identity, effective schema/table/column SELECT,
RLS/FORCE RLS/current-executor activity, SELECT policy metadata and key structure.
`indnkeyatts` versus `indnatts` distinguishes keys from INCLUDE attributes; `plain`
excludes expression/partial indexes, while valid/ready/immediate/null flags still need
review. Uniqueness is not automatically inferred. Index/constraint JSON aggregates
are not independently row-limited; outer columns have count/LIMIT 200.

The native pg_catalog.text check avoids approving a custom domain/type solely by
column name. No defaults, policies or history records are executed/read. The advisory
`observable_prerequisites_only` does not include every displayed prerequisite: e.g.
relhasrules, relispartition and uniqueness require manual review. Its TRUE value is
not a complete preflight. Catalog metadata cannot certify the intended Supabase project,
complete row visibility across later snapshots, safe version contents or stable object
identity/policy state. row_security_active=false is current-context evidence, not an
all-role assertion or permission to disable RLS. Concurrent changes remain possible.

The constant `q14_decision='BLOCKED_PENDING_INDEPENDENT_EVIDENCE_AND_EXPLICIT_CONTENT_APPROVAL'`
is appropriate. Independent evidence must establish target/executor, ordinary intended
relation/structure, authorized access, sufficient visibility, acceptable content
disclosure and explicit history-content approval. Merely executing Q13 successfully
does none of the latter approvals. Q14 stays unchanged and BLOCKED. The inventory row
in the package saying "then conditional SAFE" must not override its stricter dedicated
Q14 section or this decision; that shorthand is insufficient authorization.

### Q15 — SAFE

The exact history relation LEFT JOIN and version attribute lookup inspect catalogs only.
It separates table and column SELECT/INSERT, schema USAGE, owner identity/USAGE/SET,
executor special attributes and MAINTAIN/grant option. `strong_lock_object_privilege_evidence_only`
ORs MAINTAIN/UPDATE/DELETE/TRUNCATE. PostgreSQL 17 allows all table lock modes with
any of these privileges; SELECT alone permits weaker modes. This is object-privilege
evidence, not unrestricted locking authority: target kind, schema access, inheritance
children, timing/contention, timeouts and actual command execution remain separate.
No explicit table lock or maintenance operation is acquired/executed by this query.
MAINTAIN is not arbitrary ALTER/DROP or role administration. INSERT answers do not
prove defaults/triggers/constraints/RLS will permit history recording. Missing relation
or column gives unresolved evidence. The exact name lookup naturally bounds rows.

### Q16 — NEEDS REVISION

The SQL is observational, but its claimed expansion boundary is not implemented.
The `expandable` CTE admits every pg_class/pg_proc/pg_type object in
`identity,tenancy,app_private,public,supabase_migrations`. It has no extension-membership
exclusion. An extension-owned function in public reached at depth 1 is therefore
expanded at depth 2 by `JOIN expandable e ... WHERE w.depth<2`. This contradicts the
package/remediation statement that extension endpoints are shown but not recursively
expanded. Extension membership is not equivalent to a system namespace. This is a
confirmed scope-description defect, not evidence of SQL writes or an actual Production
extension dependency.

Minimal correction before eligibility: either accurately describe and explicitly
accept expansion of extension-owned objects in allowed namespaces, or implement a
pg_depend/deptype='e' ownership boundary before expanding them. Re-review that correction;
do not silently claim the current query enforces the boundary. Neither source was edited.

Other reviewed semantics/limits:

- pg_depend classid/objid/objsubid is the dependent; refclassid/refobjid/refobjsubid is
  the referenced endpoint. The outgoing CASE and reverse incoming joins are correct.
- Each output declared edge is direct catalog evidence. Two-hop mixed-direction walks
  establish neighborhood reachability, NOT necessarily a transitive dependency chain:
  A referencing B and C referencing B does not establish A depends on C. `hop` is a
  particular traversal depth; it is not necessarily shortest distance or call depth.
- Whole-object subid0 matches column subobjects. Path cycle exclusion also omits
  cycle-closing/self edges, so this is not an exhaustive edge inventory. Missing roots
  are silently absent; check the required inventory separately.
- pg_shdepend adds outgoing shared references for visited objects, restricted to this
  database or shared dbid0. It is not a reverse cluster-wide inventory of everything
  depending on a role. Shared edges can have hop3; duplicates across root paths remain
  possible. Extension membership is a pg_depend edge to pg_extension; pinned objects
  and dependencies PostgreSQL does not record cannot be inferred absent.
- pg_identify_object provides quoted qualified object identity, including overload
  types, without invoking it. It may reveal operational identifiers. The query does
  not select pg_authid/password fields, even when identifying a shared role endpoint.
- LIMIT 2000/count detects output truncation, not two-hop walk cost. Root/edge fanout
  and identity formatting can still be substantial. Dynamic SQL/string bodies,
  external code and objects beyond the expansion/depth boundary remain unresolved.
  complete_dependency_closure=false correctly avoids a completeness assertion.

## Function-call and disclosure review

AST inventory was checked against exact expressions rather than assuming qualification
or SELECT makes calls harmless. All explicit calls are pg_catalog built-ins:

| Family | Calls and rationale |
|---|---|
| ACL/role/RLS | aclexplode; has_column/function/language/schema/sequence/table/type_privilege; pg_has_role; pg_get_userbyid; row_security_active: metadata inquiries, no grant/SET/row predicate execution |
| Object resolution/definition | to_regprocedure, to_regrole, pg_identify_object, pg_get_constraintdef: catalog lookup/identification/deparse; no identified function execution; constraint deparse in unchanged Q09 is limited to keys/FKs |
| Context | current_setting with fixed reviewed setting names; current_database; current_user/session_user keywords: no setting change or environment dump |
| Local transformations | cardinality, convert_to, encode, format, replace, sha256, split_part, strpos, substr, unnest; count/min/sum; jsonb_agg/jsonb_build_object/jsonb_object_agg: built-in metadata/value processing |

Catalog columns, casts and operators were also reviewed: named pg_catalog types,
OID/regclass/regprocedure representations, arrays, ordinary built-in comparison/regex,
JSON and hashing, not casts through business-defined types. No application RPC,
extension function, SECURITY DEFINER application call, nextval/setval, advisory lock,
DDL/DML, role/session change or modifying CTE appears. Normal catalog read locks and
planner work still occur. Current managed catalog SELECT/built-in EXECUTE access is
required; access denial is a stop condition, not grounds to escalate.

No business records, raw secret-bearing setting values, function bodies, trigger
arguments or migration statements are emitted by the revised six. Names, ACLs, settings
keys, OIDs and hashes remain sensitive infrastructure evidence. Unsalted fingerprints
can reveal equality/permit guesses; they are not anonymization. Output custody and
unexpected-result review remain mandatory. Arbitrary metadata names cannot be proven
free of intentionally embedded secrets by offline source review.

## PostgreSQL 17 compatibility and static verification

Used the PG17 semantics of prosqlbody/probin/prosupport, pg_trigger enablement/arguments,
pg_index key/include counts/indnullsnotdistinct, pg_init_privs, pg_depend/pg_shdepend,
membership SET/USAGE/ADMIN and MAINTAIN. These fields/features exist in PG17; references
are listed below. No fresh documentation/network or database access was performed in
this offline task. Provider-specific grants, actual PG17 overload resolution/planning,
runtime access and identity formatting remain UNVERIFIED.

- All 16 SQL blocks parsed offline with installed pgsql-parser AST version 180004.
- Exactly one SelectStmt per block; recursive AST inspection found no non-SELECT
  statements or modifying CTEs. Explicit function inventory was reviewed as above.
- Maximum explicit function argument count was 72, below PostgreSQL's normal 100 limit.
- Nine prior SAFE blocks and Q14 matched the retained original snapshot exactly.
- Source query package, earlier reports and rental draft hashes remained unchanged.
- Relative documentation links and trailing-whitespace checks passed; git diff --check
  was also run. The new untracked report was checked directly, not assumed covered by git.

The parser is PostgreSQL 18-based: this is syntax evidence, NOT PostgreSQL 17 runtime
verification. No SQL was executed to resolve remaining uncertainty.

## Eligibility and remaining NO-GO conditions

Eligible for separately authorized, bounded metadata collection, bound to the exact
package fingerprint and intended project/executor:
**Q01,Q02,Q03,Q04,Q05,Q06,Q07,Q08,Q09,Q10,Q11,Q12,Q13,Q15**.
Q16 needs its scope defect resolved/re-reviewed; Q14 must not be executed. Partial
collection cannot establish complete dependency reconciliation while Q16 is withheld.

Approval must specify query IDs, target/executor binding, existing platform timeouts
and output custody. Stop for permissions/errors, unexpected objects/roles, unknown
security hashes, missing required evidence or truncated output; do not switch roles,
grant privileges or retry automatically to obtain PASS.

Production deployment still requires exact non-superuser role creation/ADMIN/SET/grantor
and ownership-transfer authority, restoration of temporary memberships, current schema
and helper compatibility, final ACL/default handling, collisions/dependencies, unrelated
policy/privilege preservation, reviewed atomic release/history/serialization/recovery
procedures and explicit deployment approval. Local 20/20 SUPERUSER-bootstrap tests do
not establish those facts, authentic JWT verification or provider execution authority.
The original rental migration remains guarded and nondeployable.

References for later verification (not fetched/executed in this offline review):
[PG17 privilege inquiries](https://www.postgresql.org/docs/17/functions-info.html),
[LOCK](https://www.postgresql.org/docs/17/sql-lock.html),
[pg_proc](https://www.postgresql.org/docs/17/catalog-pg-proc.html),
[pg_trigger](https://www.postgresql.org/docs/17/catalog-pg-trigger.html),
[pg_depend](https://www.postgresql.org/docs/17/catalog-pg-depend.html),
[pg_shdepend](https://www.postgresql.org/docs/17/catalog-pg-shdepend.html).
