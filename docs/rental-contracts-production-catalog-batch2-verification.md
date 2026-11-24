# Batch 2 — Offline verification

**No SQL executed. No connection or PostgreSQL process.**
**Production deployment remains BLOCKED / NO-GO.** Q14 stays excluded/BLOCKED.

## Source and independent review continuity

Read [canonical query package](rental-contracts-production-catalog-query-review.md),
[original independent audit](rental-contracts-production-catalog-independent-audit.md),
[remediation record](rental-contracts-production-catalog-remediation.md),
[independent re-review](rental-contracts-production-catalog-independent-rereview.md),
[final Q16 review](rental-contracts-production-catalog-q16-independent-final-review.md),
and [Batch 1](rental-contracts-production-catalog-batch1.md).
Created only [Batch 2](rental-contracts-production-catalog-batch2.md) and this report.
Existing source files, queries, migrations, historical evidence and environment unchanged.

Canonical SQL blocks are ordinal Q01=1 through Q16=16; Batch 2 copies ordinals 5–8.
Current canonical package SHA256: fd235793ae7e311f889b44b7e2c8626bc31bbdfba0eee54b3740d5bd4c8a368e.

The original independent audit fingerprint is
33778254fc17b1296ad5cbd28b381b944332978522d2bbaf0c8410bc1d3c71aa.
Q06–Q08 were independently SAFE there. Original Q05 was NEEDS REVISION and is not used.
The independent re-review fingerprint is
8c7627a878a575f52b2ddd248a2796eadc6c0d94f0aebdcd4a38214d70d678bc;
it classified remediated Q05 SAFE and carried Q06–Q08 forward. The final Q16 review
carried all these verdicts forward, while Q14 remained BLOCKED.

During preparation retained exact source-text snapshots were hash-checked against
both historical fingerprints. Current Q06–Q08 matched their original audited blocks;
current Q05–Q08 matched the re-review snapshot blocks exactly. Thus unrelated later
Q16/Q03 package changes did not alter these blocks. The retained snapshots are session
evidence, not new repository files; they cannot be regenerated from prose or hashes.
Block hashes below pin those comparison results for repeat current-source/batch checks.

| Query | Independent review source | Exact-match status | PG17.11 source assessment | Read-only | Verdict |
|---|---|---|---|---|---|
| Q05 | Independent re-review, Q05 SAFE | Current = retained reviewed block = Batch 2 | Catalog/interface compatible by offline review; runtime unverified | Metadata built-ins only | SAFE |
| Q06 | Original independent audit Q06 SAFE; carried forward | Current = original/re-review block = Batch 2 | Type catalog/inquiry compatible by offline review; runtime unverified | Metadata only | SAFE |
| Q07 | Original independent audit Q07 SAFE; carried forward | Current = original/re-review block = Batch 2 | Default ACL/aclexplode compatible by offline review; runtime unverified | Metadata only | SAFE |
| Q08 | Original independent audit Q08 SAFE; carried forward | Current = original/re-review block = Batch 2 | PG17 membership option fields reviewed; runtime unverified | Metadata only | SAFE |

## Per-query binding, catalog and result review

### Q05 — SAFE

x is the explicit signature CTE; r exposes only oid/rolname and only those are used. p/pn/owner_role/l bind pg_proc/pg_namespace/pg_roles/pg_language. Local s(setting) is unnest(proconfig); ip is pg_init_privs; d/e are pg_depend/pg_extension in their own subquery. All p.pro* references, ip.classoid/objoid/objsubid/privtype/initprivs and owner_role flags were checked. Extension join checks both catalog classes and e membership. has_function_privilege receives role OID, procedure OID, EXECUTE text or EXECUTE WITH GRANT OPTION; sha256 receives bytea from convert_to and encode returns text.

**Result bounds:** No explicit LIMIT or rows_total. Two required signatures multiplied by at most five existing distinct named roles yield at most ten outer rows. Nested config/initial-ACL/extension aggregates and string/JSON/array sizes have no byte cap; exported cells must be complete.

**Interpretation limits:** Missing helpers remain present=false via LEFT JOIN; roles emits only existing roles. to_regprocedure resolves exact zero-input signatures, not helper execution. Stored ACL differs from effective EXECUTE. Unknown config values are withheld; only four literal-approved settings reveal values. Configuration keys remain operational metadata. hardened_two_settings_exact accepts only the spaced search_path spelling: FALSE can be a conservative false negative, not proof of unsafe behavior. Unknown fingerprints must be reconciled; source/parsed-body/binary-reference hashes do not prove complete semantic equivalence, library bytes or cross-cluster identity. pg_init_privs is initial provenance, not current/effective ACL. The helpers are existing dependencies, not presumed identical to new rental entrypoints.

### Q06 — SAFE

t/n/r bind pg_type/pg_namespace/pg_roles directly, not a narrowed CTE. The local subquery aliases a/c/ns bind pg_attribute/pg_class/pg_namespace; only type OID escapes. All referenced type/attribute/class fields checked; the complete type predicate is parenthesized before the role filter. has_type_privilege uses role OID, type OID and USAGE text.

**Result bounds:** LIMIT 500 with count(*) OVER(). Stop if rows_total exceeds complete returned/exported rows. If exactly 500 rows, verify the count and platform export limit before claiming completeness; zero rows has no rows_total value.

**Interpretation limits:** Column types are selected by exact atttypid joins in addition to named built-ins/row types and rental prefix. Type USAGE is not object ownership-transfer authority. Type metadata does not execute domain checks or user type I/O. Missing expected types/roles are not separately synthesized: reconcile the expected inventory and prior role evidence. An empty set does not prove dependencies absent or safe. OIDs are same-cluster snapshot metadata.

### Q07 — SAFE

d/n bind pg_default_acl/pg_namespace. a is the LATERAL aclexplode(aclitem[]) result exposing grantor/grantee/privilege_type/is_grantable. creating_owner/target_schema/grantee in ORDER BY resolve output aliases. Catalog OIDs feed pg_get_userbyid. No user function or default privilege modification is executed.

**Result bounds:** LIMIT 1000 with count(*) OVER(). ACL expansion can multiply rows. Compare full returned/exported count to rows_total; zero rows does not supply a count.

**Interpretation limits:** Includes global entries for all creators plus entries in five target schemas. LEFT JOIN LATERAL preserves a default-ACL record even with no expanded grant; NULL expanded fields do not mean no default behavior. Absent pg_default_acl rows mean hardwired defaults, not denial. Global/per-schema defaults affect future objects created under that role; they are not current grants, historical effective privileges or proof of final ACL after transfer. PUBLIC is explicitly labeled for grantee=0; creator/grantor are role metadata.

### Q08 — SAFE

reachable explicitly declares oid; seed SELECT projects pg_roles.oid and recursive SELECT m.roleid has matching OID type. Recursive r.oid resolves; local and outer m aliases independently bind pg_auth_members roleid/member/grantor/admin_option/inherit_option/set_option. The unqualified oid subquery binds reachable. granted_role/member/grantor in ORDER BY are output labels. to_regrole resolves a fixed name without role switching; pg_get_userbyid reads names only.

**Result bounds:** LIMIT 1000 with count(*) OVER(). Recursive UNION on single OID eliminates repeat nodes and terminates over the finite role graph; it has no depth cap. LIMIT bounds output, not traversal/planner work. Existing approved timeouts remain necessary.

**Interpretation limits:** reachable(oid) seeds named existing roles and recursively follows m.member to m.roleid (ancestor roles). This intentionally follows edges regardless of usable options. Result reports edges from reachable members plus any edge granting the proposed rental writer. Rows are not proof of a usable SET/INHERIT path; interpret every per-edge option and exact executor separately. ADMIN does not equal SET or immediate inheritance. This is not all role edges in the cluster. Missing roles/empty results must be reconciled with Q01. Missing writer gives NULL to_regrole, not a reason to create it.

## Read-only and disclosure assessment

All four parse as exactly one SelectStmt. Recursive AST inspection found no non-SELECT
statements/modifying CTEs. Alias references were inventoried separately and checked
against projected CTE/VALUES/function output shapes and catalog sources; lexical
scope/unqualified names were also reviewed manually. No narrowed-projection error
like Q03 was found. No complete general-purpose semantic binder was used.

Exact explicit function inventory (all pg_catalog-qualified):

- Q05: cardinality, convert_to, encode, has_function_privilege, jsonb_agg,
  jsonb_build_object, pg_get_userbyid, replace, sha256, split_part, strpos, substr,
  to_regprocedure, unnest. Procedure lookup/ACL inquiry does not call helpers;
  remaining functions transform metadata locally.
- Q06: count, has_type_privilege, pg_get_userbyid. No custom casts/domain execution.
- Q07: aclexplode, count, pg_get_userbyid. No default privilege modification.
- Q08: count, pg_get_userbyid, to_regrole. No role switch or membership modification.

No application/extension SECURITY DEFINER call, DDL/DML, session/transaction change,
temporary object, explicit lock acquisition, sequence mutation or remote call occurs.
Catalog SELECT and built-in EXECUTE rights must already exist. Normal read locks,
planner work and timeout risks remain. Metadata is not actual migration authority.

No raw settings/source, tokens, credentials, connection strings or customer records
are selected. Q05 emits values only for four literal approved settings; unknown values
are withheld. Keys/names, ACLs, OIDs and unsalted hashes are sensitive infrastructure
metadata and may reveal equality/permit guessing. Arbitrary identifiers cannot be
proven free of embedded secrets offline. Approved custody/stop conditions are required.

PG17 fields reviewed include prosqlbody/prosupport, pg_init_privs, type owner/ACL,
default ACL and pg_auth_members admin_option/inherit_option/set_option. OID inquiry
arguments and ACL-array/aclexplode outputs were checked. Actual PG17.11 overload
resolution/planning, managed permissions, live schema/state and performance remain
UNVERIFIED. Parser AST version 180004 is PostgreSQL 18-based, NOT PG17 runtime proof.
No network documentation fetch, SQL or PostgreSQL binary execution occurred.

## Reproducible file-only equality verification

SHA256 of exact extracted SQL UTF-8 content, including trailing newline:

- Q05: 0ebdfe781a44ede2d99a3835be7f86c2a8cda961ddbe7f8ffac27910234d3e04
- Q06: 4db707bb6c8700024ad366f6d753b78957e461020699a9b4d4c8426ce90974e3
- Q07: 9dbfdabc6b574b84148a06e00a6727869ba03bc01274b2d896eeda4653119cfc
- Q08: c6d20eca74b9425532c84511c78228a292b6ed79a3327a8b7013837f0a68ed5c

Repeat the following Node.js file-only check from the repository root. It ignores
Markdown fence lines only, not SQL spaces/newlines/case/content. It neither connects
to a database nor executes SQL. Source/Batch 2 must retain their documented SQL-block
ordinal structure. It compares both exact content and the reviewed block hash manifest.

```javascript
const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const fence = String.fromCharCode(96).repeat(3);
const pattern = new RegExp('^[\\t ]*' + fence + 'sql[^\\r\\n]*\\r?\\n([\\s\\S]*?)^[\\t ]*' + fence + '[\\t ]*\\r?$', 'gm');
const blocks = s => [...s.matchAll(pattern)].map(m => m[1]);
const hash = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const canonical = blocks(fs.readFileSync('docs/rental-contracts-production-catalog-query-review.md', 'utf8'));
const batch = blocks(fs.readFileSync('docs/rental-contracts-production-catalog-batch2.md', 'utf8'));
const approved = {
  "Q05": "0ebdfe781a44ede2d99a3835be7f86c2a8cda961ddbe7f8ffac27910234d3e04",
  "Q06": "4db707bb6c8700024ad366f6d753b78957e461020699a9b4d4c8426ce90974e3",
  "Q07": "9dbfdabc6b574b84148a06e00a6727869ba03bc01274b2d896eeda4653119cfc",
  "Q08": "c6d20eca74b9425532c84511c78228a292b6ed79a3327a8b7013837f0a68ed5c"
};
assert.equal(canonical.length, 16);
assert.equal(batch.length, 4);
for (const [i, id] of ['Q05','Q06','Q07','Q08'].entries()) {
  assert.equal(batch[i], canonical[i + 4], id + ': SQL differs');
  assert.equal(hash(canonical[i + 4]), approved[id], id + ': reviewed hash differs');
  console.log(id + ': exact reviewed SQL MATCH');
}
```

All four content/hash matches passed during preparation. Relative documentation
references, direct trailing-whitespace checks and git diff --check passed. All six
sources were compared to review-start contents and remained identical. Batch 2 has
exactly four SQL blocks, one per eligible query, and no blocked query SQL.

## Final decision

Q05 SAFE / Q06 SAFE / Q07 SAFE / Q08 SAFE, within the limited metadata contract.
No unresolved source-match/projection blocker was found. Batch 2 is prepared for
manual sequential read-only execution under the separate controlled target/executor
authorization, not automatic execution/retry or progression to another batch.
Stop for errors, missing/unknown required evidence, unexpected privileges/security
metadata, sensitive output or truncation. User-reported Batch 1 successes/counts
were not independently inspected here. Actual results must be reviewed after collection.
No database execution or Production compatibility testing is claimed.
**Production deployment remains BLOCKED / NO-GO.**
