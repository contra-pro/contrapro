# Rental Contracts — independent offline catalog-query audit

**Verdict: partial metadata collection only; complete package NEEDS REVISION.
Production deployment remains BLOCKED / NO-GO.** No SQL was executed.

Independently reviewed the 16 exact SQL blocks in
[the original query package](rental-contracts-production-catalog-query-review.md),
against PostgreSQL 17 catalog/function semantics, rather than adopting its SAFE labels.
Also consulted [readiness assessment](rental-contracts-production-readiness.md) and
the guarded rental draft's dependencies. This audit changes neither artifact.

Reviewed package SHA-256:
`33778254fc17b1296ad5cbd28b381b944332978522d2bbaf0c8410bc1d3c71aa`.
Query IDs correspond exactly to SQL block ordinals Q01=1 through Q16=16 in that file.
If its bytes change, this eligibility decision must be reconsidered.

## Classifications

**SAFE 9 / NEEDS REVISION 6 / BLOCKED 1.** SAFE means suitable for a separately
authorized, limited metadata fact—not sufficient for deployment. NEEDS REVISION can
mean insufficient evidence as well as a disclosure risk; it does not imply SQL writes.

| Query | Independent classification | Function/catalog review, limits and conclusion |
|---|---|---|
| Q01 | SAFE | pg_roles non-secret fields; current_setting and pg_has_role only. SET/USAGE/ADMIN are distinct. Correctly retains absent named roles. SQL Editor establishes its current session's privileges, not another login's. If current_user is outside the hard-coded role list, its own attributes are not returned; collect an executor-specific row before assessing its CREATEROLE. No future-role authority proof. |
| Q02 | SAFE | pg_namespace + pg_roles and has_schema_privilege/pg_has_role. Explicit ACL text is separate from effective USAGE/CREATE. No schema access is exercised or role switched. Owner SET does not mean current owner privilege or grant option. Missing roles depend on Q01. |
| Q03 | NEEDS REVISION | pg_class/pg_attribute metadata and column privilege inquiries are read-only, but omit effective DELETE/TRUNCATE/TRIGGER/MAINTAIN and most grant options. These can confer dangerous access without column INSERT/UPDATE. Raw ACL does not by itself settle inherited privileges. Also omits table OID and attnum, weakening independent FK/index/dependency joins. Add complete effective privilege/ownership/grant-option evidence for the intended release checks. |
| Q04 | SAFE | pg_class sequence metadata and has_sequence_privilege only; no sequence relation or nextval/setval/currval access. Empty result is not absence of schemas; Q02 supplies presence. Reconcile any history sequence defaults separately. Limit/count guards are required. |
| Q05 | NEEDS REVISION | Exact no-argument lookup, has_function_privilege and source hashing do not invoke helpers. However raw proconfig is unfiltered, and prosrc is not all function implementation state: prosqlbody/probin/support and related attributes are omitted. A prosrc-only hash cannot establish identical SQL-standard-body/C implementation. Require expected language/body representation and relevant attribute checks; filter setting values as discussed below. |
| Q06 | SAFE | pg_type ownership/base/row-type metadata and has_type_privilege; no domain checks, casts to user types, or type input/output execution. Relevant column types are included by OID. Requires separate presence interpretation and complete, untruncated output; type USAGE is not authority to alter its owner. |
| Q07 | SAFE | pg_default_acl + aclexplode is appropriate for future defaults; correctly preserves empty ACL records and distinguishes global from per-schema entries. Includes grantor/grantee/options. Does not inspect pg_init_privs and must not be used as historical/current ACL evidence. |
| Q08 | SAFE | Recursive pg_auth_members ancestor discovery is finite via UNION; includes option flags/grantor without taking role actions. It deliberately traverses unusable edges too. Only paths with the correct per-edge options confer SET/INHERIT; Q01's effective inquiries do not make every displayed edge usable. No password catalog fields. |
| Q09 | SAFE | pg_constraint/pg_index inspection limited to PK/UNIQUE/FK; pg_get_constraintdef deparses those definitions, not application execution. No CHECK/default literals are selected. References are metadata OIDs/column arrays, not customer IDs. Supporting-index validity does not replace checking the referenced tenant key. Missing tables/constraints must be checked against Q03/expected inventory. |
| Q10 | NEEDS REVISION | JSON/hash/unnest/role-name functions inspect metadata, not predicates. But trigger fingerprint omits tgargs, tgattr and constraint/deferral details; unchanged output can hide materially changed trigger behavior. Trigger implementation/owner/SECURITY DEFINER settings are not checked. Internal node MD5s are correctly described as nonportable hints, not predicate proof. Add complete, non-disclosing drift evidence and a separately reviewed semantic baseline. |
| Q11 | SAFE | Catalog-only broad discovery covers relation kinds including indexes/sequences, functions by namespace/name/input OIDs, types and local policies/constraints/triggers. Underscores in LIKE patterns are wildcards: this creates extra matches, not authority to reuse them. Any result requires reconciliation; empty result proves only scoped name absence at that snapshot. No PostgREST overload-dispatch proof. |
| Q12 | SAFE | pg_extension/pg_language metadata and language USAGE only. No extension functions/installations. Installed does not mean required or trusted for all uses. Missing languages and LIMIT saturation block conclusions. No btree_gist installation is required by this design. |
| Q13 | NEEDS REVISION | Catalog-only and safe from history payload reads, but NOT a sufficient Q14 preflight: lacks schema USAGE and version-column/table SELECT, explicit history type validation, session binding in output and index key/include distinction. See dedicated decision below. |
| Q14 | BLOCKED | Reads an ordinary relation rather than catalogs. Q13 currently fails to establish all prerequisites. Depending on substituted relation/type/policies, SELECT could read unintended data or invoke functions/foreign access. Even a correct table can contain malformed/sensitive version strings; no safe content format is enforced by Q14. Do not execute it under the current package. |
| Q15 | NEEDS REVISION | Privilege inquiries do not write/lock or run view contents. But MAINTAIN is absent: PostgreSQL 17 permits every table lock mode to MAINTAIN holders. Omitting it can falsely reject available lock authority. Version SELECT and schema USAGE prerequisites are also absent. Include these and keep lock authority separate from successful INSERT/serialization. |
| Q16 | NEEDS REVISION | pg_depend reads no application code, but returns only incoming edges to selected objects. It misses their outgoing dependencies and extension membership, and omits pg_shdepend owner/ACL role edges. Numeric addresses lack enough object labels for this package's independent review. Dynamic references remain untracked even after revision. |

All 16 blocks parse as single SELECT statements, including WITH/UNION forms. No
data-modifying CTE, DDL, SET ROLE, session/transaction command, explicit lock, application
RPC, nextval or external call occurs in the SQL text. Every FuncCall is pg_catalog
qualified. Automatic catalog/relation read locks and planner work still exist; a
metadata SELECT is not literally lock-free or resource-free. Output LIMIT is not a
work/time bound. Existing platform timeouts and controlled execution remain necessary.

## Confirmed defects and required revisions

1. **Q13 does not discharge Q14's prerequisite.** Safe metadata collection and safe
   subsequent history reading are separate decisions. Do not label the pair approved.
2. **Q05's source equivalence claim needs stronger representation checks.** pg_proc
   documents prosqlbody for parsed SQL-standard bodies and probin for relevant binary
   implementations. A hash of only prosrc is not an implementation-equivalence proof.
   Expected representation/language can fail closed instead of exposing full source.
3. **Q05 raw configuration disclosure:** arbitrary function settings can contain
   application-specific sensitive values. No evidence of an actual secret is alleged,
   but the package's blanket no-secret-output claim is unsupported. Output approved
   search_path/row_security settings; for unknown keys record key/presence/fingerprint,
   not raw values. Never dump all proconfig or full function definitions to resolve drift.
4. **Q15 omits PG17 MAINTAIN**, causing a false negative for lock authority. Add its
   effective boolean; UPDATE/DELETE/TRUNCATE are not the complete PG17 set. Still do
   not acquire locks as part of this metadata approval.
5. **Q03/Q10/Q16 are incomplete for their release-evidence purposes.** Add omitted
   privileges, exact metadata identities, complete trigger fingerprints and declared
   outbound/shared dependencies. Do not claim direct-write denial, unchanged audit
   behavior or complete dependency closure from their current output.

These are assessment/query defects, not demonstrated Production schema defects.
No original query was revised by this audit, and no deployment script was generated.

## Q13 / Q14 independent decision

| Prerequisite | Does Q13 establish it? |
|---|---|
| Logical relation lookup | Yes: pg_namespace/pg_class joins bind the requested schema/name at that snapshot. Output should add schema/name/OID for external evidence binding. It does not establish selected Supabase project identity. |
| Ordinary local table/no children | It returns relkind and relhassubclass; reviewer must require relkind='r' and false. It does not enforce that result as a gate. |
| Version column structure | Attnum/type OID/modifier/nullability/default presence are shown. pg_type namespace/base/domain/custom-type safety is not established for history by Q13; Q06 does not generally include history column types. |
| Required SELECT | No: Q13 exposes ACL text but not effective table/version-column SELECT or schema USAGE. Q15 reports table SELECT, but no version SELECT. Column-only SELECT may suffice; absence of table SELECT is not automatically denial. |
| RLS status | Yes, for current_user at that instant. row_security_active=false means RLS is not applying in that context; relrowsecurity alone does not prove filtering or complete access. |
| Complete history visibility | Conditional only: needs ordinary relation, no descendants, effective access, same intended executor and stable table/policy state. Separate SELECTs have a time-of-check/time-of-use gap. |
| Duplicate-prevention structure | Partial: index keys include included attributes; without indnkeyatts, some UNIQUE indexes cannot be distinguished as unique(version) INCLUDE(...) versus unique(version,...). Missing index/constraint details prevent universal conclusions. |
| No sensitive payload disclosure | Q13 itself reads no payload. It cannot prove that arbitrary text in version contains only migration identifiers; Q14 emits raw version values. Other sensitive history columns are not selected, which is good but not sufficient for an absolute claim. |

**Q14 stays BLOCKED.** Required revision: a separately reviewed prerequisite query
must establish ordinary relation identity/type/access/RLS visibility and a trusted
version format. A revised content query should avoid emitting malformed values
(e.g. report only an invalid-count indicator instead of the invalid strings), without
casting through custom types or assuming a column name proves its contents. Establish
the intended executor/target and a stable change window; do not claim race-proof
atomic preflight from separate statements. No transaction/role/lock commands are
authorized by this review.

## ACL and role semantics

- pg_roles is the right non-secret view; selecting its named attributes is not a
  password-hash query. No proposed query directly selects pg_authid or rolpassword.
- has_*_privilege answers effective authority, including applicable PUBLIC/inheritance,
  owner and superuser rules. It does not show which explicit ACL grant supplied it,
  establish row visibility, execute a grant, or exercise the privilege in a transaction.
- Raw ACL text preserves explicit grantor/options. NULL ACL means hard-wired defaults,
  not today's pg_default_acl. Owner identity is separately recorded; ordinary owner
  privileges can be revoked, while ownership still confers management authority.
- pg_has_role MEMBER is membership, USAGE immediate inherited role privileges, SET
  ability to switch. WITH ADMIN OPTION is a supported test of ADMIN authority; it is
  not shorthand for SET or ownership. PUBLIC is a pseudo-role, never a membership
  subject. Q01/Q08 do not misuse PUBLIC as a pg_has_role subject.
- NOINHERIT on a role is not a replacement for reviewing per-grant inherit_option.
  CREATEROLE/LOGIN and other special attributes are not ordinary inherited object
  privileges. SQL Editor current_user/session_user must match the proposed executor;
  its results cannot be transplanted to a CI/service login.
- pg_default_acl applies only when objects are created; global/per-schema entries have
  distinct semantics. Q07 handles this correctly. It is NOT a historical grant audit.
- **pg_init_privs is absent from the package.** It records nondefault initial ACLs set
  by initdb/extension creation, not all user-object history or effective current ACLs.
  Its absence is a provenance gap where an extension-managed dependency is relevant,
  not permission to replace current ACL inspection with initprivs or demand initprivs
  for every ordinary user table. Identify extension membership first, then propose a
  scoped initial-versus-current ACL supplement if required. No such query was executed.

## Information disclosure and side effects

SAFE subset reads catalogs only. pg_get_userbyid reveals role names, not user records.
pg_get_constraintdef in Q09 is limited to PK/UNIQUE/FK; no application CHECK predicates
or business rows are evaluated. Privilege inquiries inspect ACL metadata. Functions
such as sha256/convert_to/md5/aclexplode/jsonb_build_object are built-ins operating
on returned metadata; they do not invoke the named application helpers. Q10 does
not evaluate policy expressions. Type metadata inspection does not run user casts.

Operational schema/role/ACL details remain sensitive infrastructure information.
Fingerprints can reveal equality or enable guessing low-entropy contents; treat them
as review metadata, not anonymization or cryptographic proof of safe behavior. Full
config/source disclosure is especially inappropriate in Q05. Q14 is the only
non-catalog relation read and remains forbidden pending revision/prerequisite review.

Existing SELECT rights on referenced catalogs and EXECUTE on the particular built-ins
are required; privileges may be customized by the managed platform. None of the SAFE
queries requires acquiring SUPERUSER/BYPASSRLS/CREATEROLE or assuming a writer role.
An access error is missing evidence: do not escalate or substitute credentials.

## Exact queries eligible for separate authorization

Only the following **unchanged SQL blocks** in the SHA-256-bound package above are
eligible for a limited, separately approved metadata run, in this order:

**Q01, Q02, Q04, Q06, Q07, Q08, Q09, Q11, Q12.**

Use the complete original SELECT block for each listed ID, not the surrounding
prose and not all 16 blocks. This identifies exact SQL without creating a second,
potentially divergent executable package. Do not execute Q03/Q05/Q10/Q13/Q15/Q16
under this eligibility decision; revise and independently review them first. Do not
execute Q14. SAFE query outputs are facts only for their documented limited purposes.

Approval must bind the selected Production project, intended SQL Editor executor,
query IDs/package fingerprint, custody of output and existing platform timeouts.
Check missing expected rows and compare rows_total to returned rows (per branch in
UNION output); LIMIT saturation without totals requires follow-up. SQL Editor access
does not independently prove target binding. Permission/timeout errors or an unexpected
executor require stopping, not permission changes, retries or role switches.

## Evidence coverage and NO-GO conditions

Metadata can establish current owner/ACL/role relationships and object presence at a
snapshot. Actual privilege exercise, non-superuser role creation/owner transfer,
post-transfer grants, migration rollback, lock acquisition and atomic history recording
require a separately reviewed execution plan/rehearsal. None is proven by these
queries or by unrelated schema privileges. New writer absence prevents querying its
future memberships. Unknown hashes do not establish SECURITY DEFINER helper safety.

NO-GO persists for deployment until exact executor authority, temporary membership
restoration, source/settings/ACL compatibility, object collisions, unchanged existing
privileges/policies, audited transaction/history/serialization, independent target
binding and recovery approvals are established. The local superuser/synthetic JWT
adapter remains a limitation, as does absent system-identifier verification. No
semantic/runtime claim may be inferred from syntax parsing or raw OID equality across
different clusters. Q16 cannot prove all dynamic dependencies even after revision.

## Offline verification and sources

All 16 original blocks were parsed offline with the installed PostgreSQL 18 parser:
single SELECT AST per block, no modifying CTEs, all explicit function calls pg_catalog
qualified. This is NOT PostgreSQL 17 runtime validation. PG17 field meanings were
checked against official documentation; relative links and whitespace were checked.
The original query package fingerprint was verified unchanged after this audit.
No SQL, connection, PostgreSQL process or previous workspace modification occurred.

- https://www.postgresql.org/docs/17/functions-info.html — privilege and role inquiries.
- https://www.postgresql.org/docs/17/catalog-pg-auth-members.html — grant options.
- https://www.postgresql.org/docs/17/catalog-pg-default-acl.html — creation defaults.
- https://www.postgresql.org/docs/17/catalog-pg-init-privs.html — initial privilege provenance.
- https://www.postgresql.org/docs/17/catalog-pg-proc.html — prosrc/probin/prosqlbody/settings.
- https://www.postgresql.org/docs/17/catalog-pg-index.html — index key/include distinction.
- https://www.postgresql.org/docs/17/sql-lock.html — PG17 MAINTAIN lock authority.
