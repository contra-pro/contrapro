# Q03 — Offline CTE projection hotfix

**PREPARED for independent re-review. NOT EXECUTED.**
Production deployment remains **BLOCKED / NO-GO**. Q14 remains BLOCKED.

## Confirmed defect and exact correction

The reported Production SQLSTATE 42703 is explained by the exact SQL in the
[query package](rental-contracts-production-catalog-query-review.md): roles projected
only oid and rolname, but the outer query referenced r.rolsuper and r.rolbypassrls.
An alias for a CTE exposes the CTE's output, not every column of its underlying
pg_roles relation. Both outer references were unresolved; PostgreSQL reported the
first. This is a query defect, not evidence of missing Production catalog columns,
insufficient privileges, RLS failure or a rental-migration defect.

Only Q03's roles projection changed:

```diff
-roles AS (SELECT oid,rolname FROM pg_catalog.pg_roles WHERE rolname IN
+roles AS (SELECT oid,rolname,rolsuper,rolbypassrls FROM pg_catalog.pg_roles WHERE rolname IN
```

All joins, filters, result expressions/field names, role lists, ordering, LIMIT,
ACL interpretation and membership inquiries are unchanged. The two flags were already
intended output fields; this supplies their missing source values. Q01/Q02/Q04–Q16
remain byte-identical. No migration, batch document or earlier audit was modified.

## Additional alias and column review

Reviewed the complete corrected Q03, including correlated subqueries and CTE bodies:

| Alias/source | Columns referenced / resolution |
|---|---|
| w / wanted | schema_name, table_name; explicitly named two-column VALUES CTE |
| r / roles | oid, rolname, rolsuper, rolbypassrls; now all explicitly projected from pg_catalog.pg_roles |
| n / pg_namespace | oid, nspname |
| c / pg_class | oid, relkind, relowner, relrowsecurity, relforcerowsecurity, relacl, relnamespace, relname |
| a / pg_attribute | attnum, attname, atttypid, atttypmod, attnotnull, attgenerated, attidentity, attacl, attrelid, attisdropped |
| acl / aclexplode | grantor, grantee, privilege_type, is_grantable; local to each ACL aggregate subquery |
| v / VALUES | privilege; explicitly named single output, local to each privilege aggregate subquery |

All qualified references were inventoried from the AST. Correlated c/a/r references
inside aggregates bind to the outer query. Reused acl and v aliases are in separate
subquery scopes, with identical output shapes; neither leaks out. The unqualified
roles CTE projections and its rolname filter bind to its sole FROM pg_catalog.pg_roles.
No additional unresolved reference was found by this focused review. This is not a
claim that every query in the package has undergone full semantic binding.

## PostgreSQL 17 argument and catalog review

- pg_roles exposes oid (oid), rolname (name), rolsuper and rolbypassrls (boolean).
  Selecting these non-secret view columns does not select password hashes.
- pg_has_role uses role OIDs r.oid/c.relowner and fixed text SET/USAGE inquiries.
  SET capability and immediately inherited USAGE remain separate; neither is executed.
- has_table_privilege uses role OID, relation OID and text privilege. PostgreSQL 17
  supports SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN and the
  WITH GRANT OPTION suffix used here. No multi-privilege OR-list is substituted.
- has_column_privilege uses role OID, relation OID, pg_attribute.attnum (smallint
  column-number form), and text privilege. Its list correctly includes only
  SELECT/INSERT/UPDATE/REFERENCES. MAINTAIN is a table privilege, not a column privilege.
- VALUES privilege literals resolve as text; concatenation with WITH GRANT OPTION
  remains text. pg_get_userbyid takes catalog role OIDs. aclexplode receives aclitem[]
  from relacl/attacl and exposes the four referenced output columns. row_security_active
  receives relation OID and still reports the current executor, not each cross-joined role.
- NULL/missing-relation/role evidence remains unresolved, not approval. No cast,
  schema-access assumption or new missing-object fallback was introduced.

The catalog/type/privilege forms above are PostgreSQL 17 interfaces. Managed catalog
SELECT/built-in EXECUTE permissions, live object kinds/types/state and actual PG17
parse analysis/planning have NOT been tested. An unexpected relation kind/collision
can still invalidate privilege inquiries and must be reviewed, not hidden.

## Security impact and read-only contract

No ACL, membership, RLS, result scope or ownership interpretation changed. Stored
explicit table/column grants remain distinct from effective privileges and grant
options. Owner identity, owner-role USAGE and owner-role SET remain distinct.
The flags do not establish migration executor authority, successful writes, role
creation or ownership-transfer authority. LIMIT 4000/count and missing-object rows
are preserved. No secrets/customer records or additional result fields were added.

The exact explicit calls are pg_catalog.aclexplode, count, has_column_privilege,
has_table_privilege, jsonb_agg, jsonb_build_object, jsonb_object_agg, pg_get_userbyid,
pg_has_role and row_security_active. These uses inspect/process catalogs, ACLs and
context; they do not execute predicates, triggers or application helpers. Built-in
casts/operators handle catalog types. No DDL/DML, modifying CTE, SECURITY DEFINER
application RPC, sequence mutation, role/session change or explicit lock acquisition
is present. Normal metadata read locks/planner work remain. The failed SELECT did
not perform database writes through this query; no Production state was inspected
to make a broader statement about unrelated activity.

## Why previous validation missed it

The installed parser returns a raw syntax AST. It accepts r.rolsuper as a syntactically
valid ColumnRef without binding r to roles or comparing that reference against the
CTE target list. Single-SELECT/function-call checks detect neither undefined columns
nor overload/type-resolution errors. Previous independent source reviews also missed
the projection/reference mismatch. Their Q03 semantic correctness assessment was
insufficient; the Production error contradicts that assessment. This hotfix does not
silently rewrite those historical reports.

Stronger offline validation should implement a fail-closed semantic reference pass:

1. Build a lexical scope for each SELECT, CTE, derived table and correlated subquery.
2. Derive CTE output columns from explicit aliases/target lists; bind each range alias
   to that derived schema rather than its underlying base relation.
3. Resolve qualified and unqualified references in scope; reject unknown/ambiguous
   names, invalid alias visibility and unsupported star/record/lateral cases.
4. Validate catalog columns and function overload/return schemas against a pinned,
   versioned PostgreSQL 17 descriptor obtained from trusted source artifacts offline.
   Mark unsupported inference UNVERIFIED rather than treating syntax acceptance as PASS.
5. Require negative controls: missing CTE projections, unknown catalog/function-result
   columns and scope-shadowing mutations must fail. Add type/overload checking separately.

This task ran a narrower in-memory Q03-specific reference check: derive roles outputs
from its AST and compare all qualified references against those outputs and manually
reviewed expected catalog/VALUES/aclexplode shapes. It is not a general SQL binder or
independently generated PG17 catalog snapshot; scope validity was additionally reviewed
manually. No checker/source/test infrastructure file was added outside the authorized
documentation scope.

## Offline validation results

- Original Q03: focused check detected r.rolsuper AND r.rolbypassrls as unresolved.
- Corrected Q03: zero unknown qualified references in the reviewed alias shapes.
- Negative control replacing r.rolsuper with r.nonexistent_role_flag: rejected.
- Corrected Q03 parsed as one SelectStmt; recursive AST inspection found no non-SELECT
  statements. Explicit function-call inspection preserved the metadata-only allowlist.
- Exact-delta check confirmed the entire package differs only by the one Q03 projection
  edit. Other 15 SQL blocks remained identical. Source after correction and the new
  report passed direct link/trailing-whitespace checks; git diff --check also passed.

AST parser version is 180004 (PostgreSQL 18-based), not PostgreSQL 17 runtime evidence.
No PostgreSQL binaries/processes, SQL, connections or harness were used.

## Independent re-review and evidence handling

**Q03 is ready for independent re-review**, not certified runnable by these static
checks. Re-review the complete corrected query, CTE binding and PG17 argument forms;
bind any subsequent execution to the corrected package fingerprint and exact target/
executor. Earlier package fingerprints do not approve the changed bytes.

The existing [Batch 1 document](rental-contracts-production-catalog-batch1.md) retains
the original defective Q03 because this task authorizes changing only the source Q03.
**Do not rerun that stale Batch 1 Q03.** Its equality/fingerprint claims predate this
hotfix. A separately authorized refresh/review must reconcile the approved manual
execution copy before another attempt. No automatic retry is authorized here.

Production deployment remains BLOCKED / NO-GO. No new whole-package SAFE count or
independent approval is claimed. Q14 remains excluded/BLOCKED.

PG17 semantic references for later verification (not fetched in this offline task):
[privilege inquiries](https://www.postgresql.org/docs/17/functions-info.html),
[pg_roles](https://www.postgresql.org/docs/17/view-pg-roles.html),
[pg_attribute](https://www.postgresql.org/docs/17/catalog-pg-attribute.html).
