> Historical preparation record retained below. See the appended independent post-collection review: original Q12 FAIL; reported hotfix execution not directly verified; Production remains BLOCKED / NO-GO.

# Batch 3 — Offline verification (Q09–Q12)

**No database connections, SQL execution or PostgreSQL process.**
**Production Deployment: BLOCKED / NO-GO.** Q14 excluded/BLOCKED.

## Sources and exact independent review continuity

Canonical source: [query package](rental-contracts-production-catalog-query-review.md),
SQL block ordinals Q09=9 through Q12=12. Reviewed current package SHA256:
fd235793ae7e311f889b44b7e2c8626bc31bbdfba0eee54b3740d5bd4c8a368e.

Inspected the relevant catalog review/audit/remediation/final review documents present
under docs, including [original independent audit](rental-contracts-production-catalog-independent-audit.md),
[independent re-review](rental-contracts-production-catalog-independent-rereview.md),
[remediation](rental-contracts-production-catalog-remediation.md),
[final Q16 review](rental-contracts-production-catalog-q16-independent-final-review.md),
the Q03 hotfix/review and Batch 2 verification. These later artifacts identify unrelated
changes and historical fingerprint limitations; they are not evidence of live objects.

Original audited source snapshot SHA256:
33778254fc17b1296ad5cbd28b381b944332978522d2bbaf0c8410bc1d3c71aa.
Independent re-review snapshot SHA256:
8c7627a878a575f52b2ddd248a2796eadc6c0d94f0aebdcd4a38214d70d678bc.
The retained source-text snapshots were rehashed against these exact values. Current
Q09/Q11/Q12 matched original SAFE blocks byte-for-byte. Current Q09–Q12 matched the
re-review snapshot byte-for-byte, including Q10 independently classified SAFE after
remediation. Original Q10 was NEEDS REVISION; that old query is not used. The final
Q16 review carried the other accepted verdicts forward. Later Q03/Q16 changes did not
alter these four SQL blocks. Historical snapshots are retained session evidence, not
newly persisted repo artifacts; they cannot be regenerated from prose/hash alone.
Per-block hashes below pin the reviewed comparison result for repeat checks.

| Query | Canonical source | Independent evidence | Exact-match status | Offline PG17.11 assessment | Read-only | Verdict |
|---|---|---|---|---|---|---|
| Q09 | Canonical block 9 | Original audit Q09 SAFE, carried forward | Original/re-review/current/Batch 3 identical | Catalog fields/key deparse compatible by source review; runtime unverified | Catalog-only | SAFE |
| Q10 | Canonical block 10 | Independent re-review Q10 SAFE | Remediated re-review/current/Batch 3 identical | Trigger/procedure fields and JSON/hash types compatible by source review; runtime unverified | Catalog-only | SAFE |
| Q11 | Canonical block 11 | Original audit Q11 SAFE, carried forward | Original/re-review/current/Batch 3 identical | Catalog UNION shapes compatible by source review; runtime unverified | Catalog-only | SAFE |
| Q12 | Canonical block 12 | Original audit Q12 SAFE, carried forward | Original/re-review/current/Batch 3 identical | Extension/language fields and USAGE inquiry compatible by source review; runtime unverified | Catalog-only | SAFE |

## Per-query correctness, scope and evidence limits

### Q09 — SAFE

No CTE. k/c/n/i bind pg_constraint/pg_class/pg_namespace/pg_index. All catalog columns and joins were inspected: c.oid=k.conrelid, n.oid=c.relnamespace, i.indexrelid=k.conindid with LEFT JOIN. Names filter identity/tenancy and the listed relation names; this is the reviewed cross-product scope, not a newly tightened schema/name pairing. k.contype restricts p/u/f. pg_get_constraintdef(oid) deparses keys/FKs; count is metadata aggregation. No constraints, defaults or customer values execute.

**Truncation:** LIMIT 500 and count(*) OVER() on the full selected set. Compare rows_total to complete returned/exported rows; zero rows has no count. Export/grid cell and row truncation remain possible.

**Evidence limits:** conkey/confkey are attribute-number arrays; map them with prior Q03 catalog evidence. confrelid is a relation OID, not a customer identifier. For foreign keys conindid refers to the referenced supporting index; i flags do not alone prove the intended tenant composite key or all local-side indexes. Review column order, validation, deferrability and update/delete actions. NULL index metadata can be missing/unsupported evidence, not approval. Missing relations/constraints are not synthesized: compare against the required inventory. No CHECK/default definitions are selected.

### Q10 — SAFE

wanted explicitly exposes schema_name/table_name. Within targets, base c/n bind pg_class/pg_namespace and project oid/relname/nspname. In both found branches c binds that three-column CTE, and uses only those columns. Policy p binds pg_policy; local unnest(polroles) r is a scalar OID alias, with PUBLIC handled before pg_get_userbyid. Trigger t/f/fn bind pg_trigger/pg_proc/pg_namespace by OID. Local s(setting) exposes unnest(proconfig). found has five aligned outputs kind/nspname/relname/name/metadata; outer star/order names bind these. PG17 trigger fields, prosqlbody/prosupport and argument types were reviewed. JSON construction has at most 72 arguments, below normal PostgreSQL 100-argument limit.

**Truncation:** One final LIMIT 1000/count over the combined policy/trigger UNION ALL, not separate branch counts. JSON/array cells have no byte cap. Compare full received count to rows_total and preserve complete JSON.

**Evidence limits:** Includes internal and user triggers. A/O/R/D firing enablement is interpreted for current session_replication_role (local acts like origin); true only means enabled for that mode, not that WHEN/event/column/deferral/body enforces tenant rules. Missing targets emit no rows: compare to Q03 and expected inventory; new rental targets are expected absent before deployment. SHA256 fingerprints of node/source/arguments/WHEN/binary reference are drift hints, not semantic or cross-cluster equivalence or library-byte checks. No raw policy/body/args are exposed. hardened_settings_exact is spelling-sensitive and may be NULL; false can be a conservative false negative. Unknown settings keys/hashes need review, not configuration changes.

### Q11 — SAFE

found first branch defines kind/nspname/name/detail. All six branches project four compatible text/name fields in that order. Local c/n/p/t/k aliases bind their branch catalogs; reused p means pg_proc in the function branch and pg_policy in the policy branch, while t means pg_type or pg_trigger in separate branches. All join/field references and output ORDER BY names checked. Only explicit function is count. proargtypes is cast to text for overload evidence; no discovered function is invoked.

**Truncation:** LIMIT 1000 with one final count over all six UNION ALL branches. Compare rows_total with complete exported rows. Multiple rows for overloads/namespaces/object kinds are expected, not duplicate proof.

**Evidence limits:** Any result is a collision candidate needing reconciliation; no reuse/drop/overwrite follows. Function detail contains input type OIDs, not fully deparsed qualified type names. Policy/constraint/trigger detail is owning table name; relation detail is relkind; type detail is typtype. Scoped filters differ by object class and are intentionally preserved. Underscores in LIKE patterns are single-character wildcards, allowing broader matches; false positives need review. Empty result proves only scoped snapshot absence, not absence in other schemas, complete dependencies or correct PostgREST dispatch.

### Q12 — SAFE

e/n bind pg_extension/pg_namespace; l binds pg_language in the separate branch. Both branches align five fields. Name types align; version/schema_name cast text and NULLs resolve against those types; executor_usage is boolean. ORDER BY kind/name binds UNION output names. has_language_privilege(current_user,l.oid,USAGE) uses executor name, language OID and text inquiry supported in PG17. No extension/language installation or code execution.

**Truncation:** Final LIMIT 200 across both UNION ALL branches, no rows_total. If 200 rows are returned or platform output is truncated, stop: completeness is unknown. Verify both sql and plpgsql rows explicitly; absence cannot be inferred safe. Zero rows is missing required evidence.

**Evidence limits:** Extension rows have executor_usage=NULL deliberately; this is not denied EXECUTE. Language rows have NULL version/schema_name deliberately. Installed extensions are not automatically required/trusted; their schema/version need reconciliation if unexpected. No btree_gist installation is required by the reviewed design. USAGE does not prove ownership transfer, role creation or full migration DDL authority. Keep executor identity established independently because this query does not return session_user/current_user.

## Read-only, privilege and disclosure inspection

All four ASTs contain exactly one SelectStmt and no other statements/modifying CTEs.
This alone is not semantic proof. References were inventoried from ASTs and checked
against their lexical/catalog/CTE source shapes manually. No missing projection like
the Q03 incident was found. No complete semantic binder or live catalog descriptor
was used; planner/type overload resolution and managed access remain UNVERIFIED.

Explicit calls and their actual use:

- Q09: count and pg_get_constraintdef; OID deparse is restricted to p/u/f constraints,
  so application CHECK/default predicates are not selected or evaluated.
- Q10: cardinality, convert_to, count, current_setting, encode, jsonb_build_object,
  pg_get_userbyid, replace, sha256, split_part, unnest. Metadata conversion/hashing and
  role labels are local transformations. current_setting reads only the fixed
  session_replication_role setting, without changing it. Policy/trigger functions,
  predicates and source are not executed. pg_node_tree casts are catalog node output,
  not custom business-type casts. sha256 accepts bytea directly for tgargs and from
  convert_to for text/node values; encode outputs hex text. Inner role OIDs feed
  pg_get_userbyid after a PUBLIC=0 CASE. Names/settings keys and fingerprints remain
  sensitive operational metadata, not anonymization.
- Q11: count only. Catalog text casts/LIKE/comparisons invoke no discovered application
  functions. Broad wildcard matching creates reviewable false positives, not authority.
- Q12: has_language_privilege(current_user,l.oid,'USAGE') is a name/OID/text effective
  inquiry, not a grant, role switch or language/function execution. Extension installation
  and migration DDL authority are not inferred from installed/USAGE metadata.

All explicit calls are pg_catalog-qualified built-ins. No application/extension
SECURITY DEFINER call, sequence mutation, remote access, DDL/DML, grant/revoke, session/
transaction command, temporary object or explicit lock-acquisition call exists. Normal
metadata read locks and planner work still occur. Existing catalog SELECT/built-in
EXECUTE permissions are required; errors mean stop, never permission escalation.

No credential/token/connection-string/customer-data fields, raw function bodies,
policy literals or trigger arguments are emitted. Q09 only deparses key/FK definitions;
Q10 uses hashes/keys rather than raw source/settings/args. Arbitrary identifiers may
still contain sensitive strings, and hashes can reveal equality/permit guessing.
Treat output as restricted operational evidence; stop for unexpected sensitive content.

PG17 compatibility assessed from known catalog/interfaces: pg_constraint/conindid,
pg_index validity/readiness/immediacy; pg_trigger parent/arguments/constraint/transition
fields; pg_proc.prosqlbody/prosupport; pg_policy; pg_type; pg_extension/language and
has_language_privilege. No new network or live PG17.11 verification was performed.
Installed parser AST version 180004 is PostgreSQL 18-based, NOT runtime verification.

## Reproducible file-only exact-match check

SHA256 of extracted SQL UTF-8 content, including trailing newline:

- Q09: 4e2f98efab6c3f887dae71dc7b38ad10ca907edf11de5fd76a63f6af55205c35
- Q10: 9470daee155e5f3f4411f0e971f971e08a8609305f6fc3ae0e6d321e1050b6bd
- Q11: 373752f181f4588017eabe9881a29019e4aed849aec3b8e3984a5dca1526a50a
- Q12: 64744d31bd0253a146f293652b78232f26a76abd72b911064d206e8cf8e70b75

Run this Node.js file-only comparison from the repository root to repeat current
source/copy/reviewed-hash equality. Fence lines are ignored; SQL whitespace, newlines,
case and content are not normalized or trimmed. It performs no SQL or connection.
The canonical document must retain 16 SQL blocks and Batch 3 exactly four in order.

```javascript
const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const fence = String.fromCharCode(96).repeat(3);
const pattern = new RegExp('^[\\t ]*' + fence + 'sql[^\\r\\n]*\\r?\\n([\\s\\S]*?)^[\\t ]*' + fence + '[\\t ]*\\r?$', 'gm');
const blocks = s => [...s.matchAll(pattern)].map(m => m[1]);
const hash = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const canonical = blocks(fs.readFileSync('docs/rental-contracts-production-catalog-query-review.md', 'utf8'));
const batch = blocks(fs.readFileSync('docs/rental-contracts-production-catalog-batch3.md', 'utf8'));
const approved = {
  "Q09": "4e2f98efab6c3f887dae71dc7b38ad10ca907edf11de5fd76a63f6af55205c35",
  "Q10": "9470daee155e5f3f4411f0e971f971e08a8609305f6fc3ae0e6d321e1050b6bd",
  "Q11": "373752f181f4588017eabe9881a29019e4aed849aec3b8e3984a5dca1526a50a",
  "Q12": "64744d31bd0253a146f293652b78232f26a76abd72b911064d206e8cf8e70b75"
};
assert.equal(canonical.length, 16);
assert.equal(batch.length, 4);
for (const [i, id] of ['Q09','Q10','Q11','Q12'].entries()) {
  assert.equal(batch[i], canonical[i + 8], id + ': SQL differs');
  assert.equal(hash(canonical[i + 8]), approved[id], id + ': reviewed hash differs');
  console.log(id + ': exact reviewed SQL MATCH');
}
```

This script passed during preparation: all four blocks matched source and pinned
reviewed hashes. ASTs/function inventories were checked offline; no parsed SQL was
submitted to a server. Relative links and direct whitespace checks passed, as did
git diff --check. All inspected existing source documents remained byte-identical to
their review-start contents. Only the two requested Batch 3 documentation files were
created; no migration/application/environment changes occurred.

## Final decision and unresolved Production blockers

**Q09 SAFE / Q10 SAFE / Q11 SAFE / Q12 SAFE** for their limited catalog purposes.
No unresolved query-copy/source-status/CTE projection blocker was found. Batch 3 is
prepared for controlled manual sequential read-only execution with target/executor,
existing timeouts and output custody confirmed. Any prior stop under the approved
collection plan must be resolved by review, not bypassed by this guide. Stop for errors,
permissions, warnings needing review, unknown/missing evidence, context mismatch,
sensitive output or truncation. Stop after Q12; no automatic continuation/deployment.

User reports unresolved Q05 function-hardening, Q07 broad public default ACLs and Q08
role membership/migration ownership authority. These remain unresolved release blockers;
Batch 3 preparation neither assesses actual result files nor clears them. Earlier row
counts/success claims were user-supplied, not independently validated here. No inference
of safe helpers, final restricted ACLs, non-superuser ownership-transfer authority,
atomic history/serialization or Production deployability follows from query safety.
Actual results need separate evidence review. **Production Deployment: BLOCKED / NO-GO.**


---

# Independent post-collection offline review — Batch 3 and reported Q12 hotfix

**Executive verdict: BLOCKED / NO-GO for Production deployment.**
This section supersedes the earlier preparation section's Q12 executable-compatibility
and unconditional batch-readiness assessment. The original text above is preserved
verbatim as historical evidence; it is not corrected or erased. In particular, its
SAFE classification did not catch the invalid qualified type name.

Only this verification report was updated. No SQL/database connection, PostgreSQL
process, migration, application/test change, dependency installation or deployment
occurred. No additional Production queries or deployment script are proposed here.

## Evidence inventory and integrity

| Evidence class | Available evidence / label |
|---|---|
| Directly inspected repository source | PASS: canonical Q09–Q12, Batch 3 guide/prior verification, original independent audit, remediation, independent re-review, readiness/design docs and guarded rental draft |
| Additional relevant source | PASS: native clients 0006, vehicles 0008 draft and client receipt 0009 v3 candidate inspected to explain guard/capture security behavior; these files do not prove deployed bodies |
| User-supplied Production observations | Q09 37/37; Q10 121/121 = 46 policies + 75 triggers, including 72 internal/3 application; Q11 zero matches; corrected Q12 seven named rows with language USAGE true |
| Direct raw Production evidence | UNKNOWN: no supplied result CSV/JSON, session identity, timestamp or query text tied to those results was inspected. A bounded filename search under docs found no Batch3/Q09–Q12-named CSV/JSON. This does not prove no evidence exists elsewhere |
| Independent arithmetic/inference | PASS: 46+75=121 and 72+3=75; seven supplied Q12 rows are below its LIMIT200. Arithmetic consistency does not verify rows or ownership/policy semantics |
| Executed Q12 hotfix identity | UNKNOWN: user states boolean changed to bool and success, but an independently bound full executed SQL artifact/hash is unavailable. No canonical Q12 hotfix exists in the inspected package/guide |

The supplied observations are accepted as observations, not relabeled independently
verified catalog exports. All actual Production object definitions, grants, policies,
exact executor and snapshot freshness remain UNKNOWN unless independently evidenced.
Earlier local 20/20 integration evidence remains local-only, not new Production proof.

## Q09–Q12 verification matrix

| Query | Offline source result | Supplied execution evidence | Independent conclusion |
|---|---|---|---|
| Q09 | PASS: p/u/f-only constraint/index metadata query; expected fields/joins inspected | User reports 37/37 validated, nondeferrable constraints and valid/ready supporting indexes | Consistent with required composite-key design; exact per-table/key correspondence and complete Production verification UNKNOWN without raw rows |
| Q10 | PASS for metadata collection scope, not policy certification | User reports 46 policies, 75 mode-enabled triggers; two guards fail exact hardening flag | Counts consistent; hardening and actual role/predicate enforcement remain UNKNOWN / release BLOCKED |
| Q11 | PASS for scoped prefix discovery | User reports Success / no rows | Consistent with scoped absence; complete draft object/role/signature collision clearance UNKNOWN |
| Q12 original | FAIL: current canonical and Batch 3 still contain NULL::pg_catalog.boolean | User reports SQLSTATE 42704 | Confirmed source correctness defect; earlier syntax/SAFE checks were insufficient |
| Q12 reported correction | PASS for bool type-name correction by offline PG17 semantics; full executed-copy equality UNKNOWN | User reports successful seven-row result using pg_catalog.bool | Installed/language observations are consistent; no direct execution verification, executor-authority proof or independent complete hotfix artifact |

Q09/Q10/Q11 source-only PASS does not turn absent raw results into PASS for deployed
security. Q12 extension rows deliberately have executor_usage=NULL; language rows
have NULL version/schema. These intentional NULLs are not failed privilege checks.

## Q09 — constraint compatibility with the actual draft

References below are line numbers in
[supabase/migration-drafts/20261120001300_rental_contracts.sql](../supabase/migration-drafts/20261120001300_rental_contracts.sql).

| Draft dependency | Exact source | Observation relevance / unresolved evidence |
|---|---|---|
| tenancy.agencies(id) referenced by contracts and counter | lines 56,90 | Requires eligible unique/primary id key and executor REFERENCES authority; user summary does not enumerate that actual row |
| identity.users(id) referenced by creation receipts | line 95 | Same key/privilege dependency; raw mapping UNKNOWN |
| tenancy.clients(agency_id,id) | line 81 | Supplied composite tenant-key observation supports compatibility; exact ordered eligible key/validation/index still needs row evidence |
| tenancy.vehicles(agency_id,id) | line 82 | Same; no cross-tenant FK can be inferred merely from unrelated composite keys |
| tenancy.memberships(agency_id,id) for creator and return member | lines 83–84 | Both relationships require the intended same-tenant key; nullable return member is conditional until a return is recorded |
| New contracts UNIQUE(agency_id,id), number uniqueness, receipt foreign keys | lines 80,98,104 | Proposed DDL only; cannot be established by existing Q09 rows before deployment |

Q09 scope is pg_constraint contype p/u/f in listed identity/tenancy relation names.
Its conkey/confkey arrays must be resolved using attnums/OIDs from matching Q03 evidence,
including order. FK conindid describes referenced supporting index, not every local
index. Nondeferrability/validation and ready/valid flags are relevant but not proof of
all tenant relationships, expected data types, referenced uniqueness eligibility,
operator/collation semantics or successful future FK creation. Raw rows, exact schema
binding, executor REFERENCES/schema access and current deployed data are not available
here. Summary says composite keys were observed, not that every draft dependency was
independently matched. **UNKNOWN**, not a new schema defect or a verified full PASS.

CHECK constraints, independent indexes, exclusion constraints, all columns/types and
new rental constraints are outside Q09's assurance. Built-in FK integrity checks can
bypass RLS for consistency and do not certify authorization or membership/agency state.
The current draft separately enforces membership/state in its runtime path (lines
35–45); FKs alone cannot do that.

## Q10 — policy, trigger and privilege implications

**PASS (observation consistency):** 46 policies plus 75 triggers equals 121 rows;
72 internal FK triggers plus the three named application triggers equals 75.
No independent per-policy roles/commands/permissive flags or complete row export was
provided. Policy count is not the number of safe tenant authorization paths.

Applicable permissive policies combine by OR for the command/role; applicable
restrictive policies constrain the permissive result by AND. PUBLIC/inherited role
applicability, command, USING and WITH CHECK all matter. A permissive new rental policy
can coexist with a broader existing policy applicable to the writer, rather than
narrowing it. Grants and RLS are separate gates. Expression-node hashes expose drift
identity hints, not policy logic. OID-bearing node hashes are not cross-cluster semantic
proof; unknown hashes cannot certify canonical identity, active membership or tenant
predicates. Role memberships remain unresolved from Q08. **UNKNOWN / BLOCKED** for
comprehensive tenant-isolation approval.

Reported mode-enable true establishes only tgenabled relative to the inspected session's
replication role. Event/column applicability, WHEN, deferral, trigger body and runtime
executor still determine behavior; another session may have different mode. Internal
FK triggers enforce referential integrity, not application policy correctness.

[Clients migration 0006](../supabase/migrations/20261115000600_clients.sql) lines 110–129
and [vehicles draft 0008](../supabase/migration-drafts/20261118000800_vehicles.sql)
lines 78–99 define client_guard/vehicle_guard as SECURITY INVOKER. They validate identity,
permission/input and immutable fields in local source. This does not prove the deployed
functions remain identical. The [0009 v3 candidate](../supabase/migration-drafts/contratpro_0009_production_candidate_v3.sql)
lines 248–280 defines capture_client_creation as SECURITY DEFINER with pinned
search_path, row_security=on and receipt-writer ownership. The candidate hardens
client_guard's search_path at line 69, but that alone does not add row_security=on.
This source difference is consistent with an exact-two-settings flag being false;
it is not proof of actual deployed proconfig or a regression.

**UNKNOWN hardening meaning:** hardened_settings_exact requires exactly the spaced
search_path=pg_catalog, pg_temp entry plus row_security=on and cardinality=2.
False can mean an equivalent compact spelling, missing explicit row_security, extra
settings or an unsafe path/off setting. It does not identify which. True for capture
proves only those two metadata settings under the supplied observation, not source,
ACL, owner attributes, dependency safety or absence of bypass. Native vehicle source
uses search_path=pg_catalog alone; deployed exact settings are not available here.
Neither two false flags nor the true flag is standalone vulnerability/safety proof.

SECURITY INVOKER uses the caller's effective privileges; when called from a definer
entrypoint that may be the definer role, not the browser's database role. SECURITY
DEFINER executes under its owner; it does not automatically bypass RLS. A non-bypass
owner with FORCE RLS is normally subject to policies, but superusers/BYPASSRLS roles
still bypass even FORCE RLS. row_security=on is not a mechanism to remove those powers.
Table ownership, inherited privileges and actual special role attributes must be
independently reconciled. Restricted NOLOGIN/NOBYPASSRLS writer proposed at draft line12
is local design, not demonstrated Production authority. **BLOCKED** until unresolved
function/policy/owner/ACL evidence is reviewed; no privilege or hardening edits authorized.

## Q11 — collision coverage against every intended object category

**PASS (source inventory):** Draft explicitly creates four rental_* tables (lines
55,89,94,100), two rental_* indexes (86,88), nine app_private.rental_* helpers and
nine public.contratpro_rental_* RPCs (35–367), thirteen rental_* policies (26–130),
and three rental_* triggers (135–149). All their explicit local names and schemas
are covered by Q11's corresponding branches. Implicit row/array types and default
constraint/index names for these prefix tables are candidate matches, including
_rental% arrays. Underscores in Q11 LIKE patterns are wildcards: results may be broader,
never proof an unknown object can be reused. There is no sequence in this draft.

**UNKNOWN / incomplete scope:** CREATE ROLE contratpro_rental_writer (line12) is not
queried by Q11. Role existence/membership must be reconciled with existing Q01/Q08
evidence. Existing dependency schemas, helper signatures and table structures are
not name-collision-cleared by zero rental prefix rows. Q11 reports function name and
input type OID vector, not full default-argument/prokind/return/ownership semantics or
PostgREST dispatch behavior. It does not examine unrelated schemas, all possible
business duplicate names, extension/shared objects, operator classes or every dynamic
dependency. No raw no-row artifact/query hash/executor binding was supplied; accept
zero only as user-reported scoped absence. A snapshot also cannot rule out a later
concurrent creator. The draft's prefix ownership loop at lines376–383 remains unsafe
to promote as an exact-object release mechanism despite a prior scoped empty result.
No additional Production queries are proposed by this review.

## Q12 — hotfix and extension/language requirements

**FAIL (original executable copy):** Both source Q12 and Batch 3 guide still use
pg_catalog.boolean. PostgreSQL's actual built-in catalog type name is bool; BOOLEAN
is SQL type syntax, not the qualified catalog identifier pg_catalog.boolean. Raw AST
parsing accepts a qualified type name without looking it up and therefore missed this
semantic error. The prior preparation/independent assessments overstated executable
compatibility. Only this report may change in this task, so the defective source and
guide remain unchanged and **must not be reused as-is**. Required future documentation
remediation/review is the type spelling boolean → bool, with an exact reviewed executed
copy/fingerprint retained. No silent SQL repair or executable hotfix is generated here.

**PASS (reported result consistency):** Supplied seven rows list pg_stat_statements1.11,
pgcrypto1.3, plpgsql1.0, supabase_vault0.3.2, uuid-ossp1.1 plus sql/plpgsql language
USAGE=true. This is structurally consistent with the five-column UNION. Seven <200,
but the lack of raw result/context prevents independently validating completeness,
identity or versions. Extensions being installed does not prove the executor can
use every function or create/own new objects. Language USAGE is current_user-specific,
not automatically the future migration executor's permission. Intentional extension
executor_usage NULLs are NOT APPLICABLE, not denied access.

**NOT APPLICABLE: btree_gist missing is not a blocker for the current draft.**
Exact source checks:

- Lines86–88 create ordinary indexes without USING GiST or an exclusion constraint.
- Lines201–212 use pg_advisory_xact_lock/hashtextextended and the core tstzrange overlap
  operator in a query. UUID values identify the agency/vehicle; no UUID GiST equality
  operator class is required. Raising SQLSTATE23P01 does not create an EXCLUDE constraint.
- Lines56 and other UUID defaults use gen_random_uuid, a PostgreSQL17 core function
  resolved through pinned pg_catalog search_path; not uuid_generate_v4 or a pgcrypto
  schema call. The draft calls no extensions.*, vault.*, uuid-ossp or pgcrypto APIs.
- Draft functions use built-in SQL/plpgsql (e.g. lines36,216,352–367), built-in JSON,
  time/range/hash/advisory-lock functions and exact app_private helpers (line16).
  No CREATE EXTENSION, btree_gist, GiST or EXCLUDE statement occurs in the draft.

A later design that adds UUID equality in a GiST exclusion constraint could introduce
an operator-class/extension dependency; that is **conditional on a different future
artifact**, not a reason to install anything for this draft. Transitive behavior of
existing app_private helpers/provider infrastructure is still UNKNOWN. Extension
inventory alone does not prove those helpers safe or all runtime dependencies usable.

## Cross-batch consistency and remaining readiness blockers

| Earlier evidence | Refinement from Batch 3 / status |
|---|---|
| Q01/Q02 execution success, Q03 532 rows | Does not prove non-superuser role/ownership-transfer authority; raw complete executor/ACL evidence not reviewed here: UNKNOWN |
| Q04 zero sequences | Consistent with rental counter-table numbering at lines89–92,190–198; not evidence about every possible external sequence |
| Q05 hardening unresolved | Q10 exact-setting false guards reinforce need to inspect approved evidence, not proof of broader compromise or a contradictory deployed body |
| Q06 type USAGE, 34 rows | Does not establish REFERENCES, schema CREATE, helper EXECUTE, owner transfer or function-language authority |
| Q07 96 rows/broad public default ACLs | Existing policy/trigger counts do not neutralize unexpected new-object default grantees; final ACL closure remains BLOCKED |
| Q08 21 rows/membership authority unresolved | Q10/Q12 use current Editor context; neither proves new rental writer creation/SET/ADMIN/grantor path or authority after ownership transfer |

Preserve all readiness-report blockers: guarded draft aborts before DDL and ends
ROLLBACK (lines4–7,389); no atomic migration-history INSERT or migration serialization/
precondition design; no verified non-superuser temporary-membership/grantor recipe;
prefix-based owner transfer rather than exact signatures; no proven complete final
ACL allowlist/default handling or preservation of unrelated policies/memberships;
no full current Production helper/policy/tenant-key compatibility; target binding,
backup/recovery/lock bounds and explicit approvals outstanding. Source membership/state
races, uncertain-response handling outside receipt-backed operations, approved technical
policy acceptance and limited local JWT/superuser harness fidelity remain material.
Run7 local success does not establish Production release authority. None is cleared by
37 or 121 valid-looking metadata rows. **Production readiness: BLOCKED / NO-GO.**

## Required remediation and missing evidence (no execution proposed)

1. Preserve original failed Q12 evidence and prepare/review its minimal documentation
   hotfix under separate authorization; stale canonical/Batch 3 copies cannot be reused.
2. Review already-collected raw Q09–Q12 artifacts with exact SQL/hash, timestamp,
   project/executor labels, full headers/rows/counts and errors/warnings. Until available,
   direct Production result verification is UNKNOWN. Do not infer missing evidence PASS.
3. Resolve exact guard/helper hardening, owner attributes, applicable policy logic/roles,
   default ACL impact and temporary-role authority from approved evidence. If remediation
   is actually required, it needs a separate reviewed scope; no automatic SQL changes.
4. Match every draft FK to the actual referenced key/types/permissions, all object/role
   collision preconditions, exact-signature ownership/grants and the readiness report's
   atomic release/history/recovery requirements before deployment consideration.

No additional Production query or migration is offered here. Catalog interpretation
and explicit future approvals, not query counts or parser success, control readiness.

## Offline verification performed for this supplement

PASS: read exact current Q09–Q12 and draft; all four parse as single SELECTs using the
installed PG18-based parser. Both original Q12 and a qualified type-name typo can parse:
this is explicitly not name/type resolution or PG17 runtime validation. Q12 semantic
failure is acknowledged despite parse success. Source inventory found all explicit
created object categories above and no GiST/exclusion/extension installation. Reference
lines, metadata-only function uses, configured mode predicate and source security
settings were inspected; no SQL was run. Relative document links and trailing whitespace
were checked; git diff --check passed. Existing report history was preserved exactly
and all other inspected source files remained unchanged.

**Final decision: BLOCKED / NO-GO. No Production modification or deployment claimed.**
