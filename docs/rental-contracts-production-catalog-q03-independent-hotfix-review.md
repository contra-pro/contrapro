# Q03 — Independent Production hotfix review

**Independent verdict: SAFE — limited read-only metadata collection candidate.**
Production deployment remains **BLOCKED / NO-GO**. Q14 remains BLOCKED.
No SQL, PostgreSQL process or database connection was executed in this review.

## Sources and exact SQL

Read the [source package](rental-contracts-production-catalog-query-review.md),
[hotfix report](rental-contracts-production-catalog-q03-hotfix.md),
[stale Batch 1](rental-contracts-production-catalog-batch1.md) and
[earlier independent re-review](rental-contracts-production-catalog-independent-rereview.md).
No reviewed source or historical evidence was modified.

Package SHA256: fd235793ae7e311f889b44b7e2c8626bc31bbdfba0eee54b3740d5bd4c8a368e.
Q03 SQL-block SHA256: 875b16b5265c6aeff07b9567467a1f6abd3eacef9e3b01b768442ae05f74a60c.

Exact reviewed SQL, **NOT EXECUTED**:

```sql
WITH wanted(schema_name,table_name) AS (VALUES ('identity','users'),('identity','supabase_users'),
 ('tenancy','agencies'),('tenancy','memberships'),('tenancy','roles'),('tenancy','membership_roles'),
 ('tenancy','role_permissions'),('tenancy','clients'),('tenancy','vehicles'),('tenancy','audit_events')),
roles AS (SELECT oid,rolname,rolsuper,rolbypassrls FROM pg_catalog.pg_roles WHERE rolname IN
 (current_user,'postgres','anon','authenticated','authenticator','service_role','contratpro_runtime','contratpro_platform_runtime','contratpro_rental_writer'))
SELECT w.schema_name,w.table_name,c.oid IS NOT NULL AS present,c.relkind,
 c.oid AS table_oid,a.attnum,r.oid AS role_oid,r.rolname=current_user AS exact_executor,
 pg_catalog.pg_get_userbyid(c.relowner) AS owner,c.relrowsecurity,c.relforcerowsecurity,
 c.relacl::pg_catalog.text AS explicit_table_acl,a.attname,a.atttypid,a.atttypmod,
 c.relacl IS NULL AS table_acl_uses_hardwired_defaults,
 (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('grantor',pg_catalog.pg_get_userbyid(acl.grantor),
  'grantee',CASE WHEN acl.grantee=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(acl.grantee)::pg_catalog.text END,
  'privilege',acl.privilege_type,'grant_option',acl.is_grantable)) FROM pg_catalog.aclexplode(c.relacl) acl) AS explicit_table_grants,
 (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('grantor',pg_catalog.pg_get_userbyid(acl.grantor),
  'grantee',CASE WHEN acl.grantee=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(acl.grantee)::pg_catalog.text END,
  'privilege',acl.privilege_type,'grant_option',acl.is_grantable)) FROM pg_catalog.aclexplode(a.attacl) acl) AS explicit_column_grants,
 a.attnotnull,a.attgenerated,a.attidentity,a.attacl::pg_catalog.text AS explicit_column_acl,
 r.rolname,pg_catalog.pg_has_role(r.oid,c.relowner,'SET') AS can_set_owner,
 r.oid=c.relowner AS direct_owner,pg_catalog.pg_has_role(r.oid,c.relowner,'USAGE') AS owner_role_usage,
 r.rolsuper,r.rolbypassrls,
 pg_catalog.row_security_active(c.oid) AS rls_active_for_current_executor,
 (SELECT pg_catalog.jsonb_object_agg(v.privilege,pg_catalog.jsonb_build_object(
   'effective',pg_catalog.has_table_privilege(r.oid,c.oid,v.privilege),
   'grant_option',pg_catalog.has_table_privilege(r.oid,c.oid,v.privilege||' WITH GRANT OPTION')))
  FROM (VALUES('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) v(privilege)) AS effective_table_privileges,
 (SELECT pg_catalog.jsonb_object_agg(v.privilege,pg_catalog.jsonb_build_object(
   'effective',pg_catalog.has_column_privilege(r.oid,c.oid,a.attnum,v.privilege),
   'grant_option',pg_catalog.has_column_privilege(r.oid,c.oid,a.attnum,v.privilege||' WITH GRANT OPTION')))
  FROM (VALUES('SELECT'),('INSERT'),('UPDATE'),('REFERENCES')) v(privilege)) AS effective_column_privileges,
 pg_catalog.count(*) OVER() AS rows_total
FROM wanted w LEFT JOIN pg_catalog.pg_namespace n ON n.nspname=w.schema_name
LEFT JOIN pg_catalog.pg_class c ON c.relnamespace=n.oid AND c.relname=w.table_name
LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
CROSS JOIN roles r ORDER BY w.schema_name,w.table_name,a.attnum,r.rolname LIMIT 4000;
```

## Root cause and independent column-resolution findings

The old Batch 1 SQL exposes only oid/rolname from roles yet references r.rolsuper and
r.rolbypassrls. This explains the reported SQLSTATE 42703 without any privilege or
schema repair. A CTE range alias exposes only projected columns. Both columns exist
in pg_roles but were unavailable through the old r alias.

The actual corrected AST projects oid, rolname, rolsuper, rolbypassrls; its complete
r-reference set is exactly those four columns. No output, filter, join, limit, role
list or privilege expression changed. Independent comparison with the retained
pre-hotfix source snapshot confirms Q01/Q02/Q04–Q16 are byte-identical.

| Scope/source | Independent resolution check |
|---|---|
| wanted / w | Explicit schema_name/table_name aliases, two cells per VALUES row |
| roles / r | All four referenced columns projected from sole source pg_catalog.pg_roles; unqualified projection/filter names bind there |
| n | pg_namespace.oid/nspname |
| c | pg_class.oid/relkind/relowner/relrowsecurity/relforcerowsecurity/relacl/relnamespace/relname |
| a | pg_attribute.attnum/attname/atttypid/atttypmod/attnotnull/attgenerated/attidentity/attacl/attrelid/attisdropped |
| acl, two separate subqueries | aclexplode output grantor/grantee/privilege_type/is_grantable; correct local alias visibility |
| v, two separate subqueries | Explicit single VALUES output privilege, correct local visibility |

Correlated c.relacl/a.attacl/r.oid/c.oid/a.attnum references bind to the outer SELECT.
Local v/acl aliases do not escape or shadow incompatible outer aliases. All qualified
references were inventoried from the AST against these independently reviewed source
shapes; no unresolved reference was found. Scope/type meanings were also inspected
manually. This is a focused check, not a complete general-purpose SQL semantic binder.

## PostgreSQL 17 compatibility and argument review

The referenced pg_roles, pg_namespace, pg_class and pg_attribute fields exist in PG17.
role/relation/owner identifiers are OIDs; rolname is name; superuser/bypass/RLS flags
are boolean; attnum is smallint; ACL columns are aclitem[]. No custom-type input/output
or business-record data is used.

- has_table_privilege receives (role oid, relation oid, privilege text). The eight
  table privileges are SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER,
  MAINTAIN. PG17 supports MAINTAIN and each WITH GRANT OPTION form checked separately.
- has_column_privilege receives (role oid, relation oid, column-number smallint,
  privilege text). SELECT/INSERT/UPDATE/REFERENCES are the valid column privilege
  list here; MAINTAIN is not sent to this function. Applicable table grants contribute
  to column privilege answers. VALUES strings/concatenations resolve to text.
- pg_has_role receives two role OIDs and SET/USAGE text. SET means ability to switch;
  USAGE means immediately available role privileges. No role switch occurs and
  neither establishes ADMIN/CREATEROLE or a future ownership-transfer path.
- aclexplode receives catalog ACL arrays and returns role OIDs, privilege text and
  grant-option boolean. pg_get_userbyid receives OIDs; row_security_active receives
  relation OID and answers for current_user, not the cross-joined role.

No unsupported privilege argument or missing projection was found. Managed permissions,
actual object kinds, server overload/type resolution and live planning remain UNVERIFIED.
A read-only attempt to inspect the expected local PG17 share/postgres.bki file found
that path unavailable; no installation file or binary was modified/executed, and no
local system-catalog signature dump was available from that check. The catalog/signature
assessment above is source/PG17-interface review, not locally executed validation.

## ACL, security and disclosure assessment

Stored explicit ACL text/decoded entries remain separate from effective privilege
answers. NULL ACL means hardwired defaults, not no permissions or today's default ACL.
Effective privileges can reflect PUBLIC, inheritance and owner/superuser rules; no
unique grant path is proven. Grant options are checked separately, not inferred from
ordinary privileges. direct_owner, owner_role_usage and can_set_owner remain distinct.
RLS flags/row_security_active do not establish row visibility for every named role.
Object privileges do not establish schema access, successful DML or migration authority.

Explicit calls: pg_catalog.aclexplode, count, has_column_privilege,
has_table_privilege, jsonb_agg, jsonb_build_object, jsonb_object_agg, pg_get_userbyid,
pg_has_role, row_security_active. Their exact uses inspect/process metadata/ACL/context;
no application/extension function, policy or trigger is executed. The AST has one
SelectStmt and no modifying CTE/DDL/DML/role/session change. No sequence or explicit
lock-acquisition function is present. Normal catalog-read locks and planner work remain.

No passwords, auth tokens, connection strings, raw settings/source or customer rows
are selected. Role/object names, ACLs, OIDs and privilege flags are operationally
sensitive; metadata names cannot be proven free of deliberately embedded secrets.
Keep output restricted and stop if unexpected sensitive content appears.

## Verification, evidence preservation and limitations

Offline parsing used pgsql-parser AST version 180004 (PostgreSQL 18-based). It confirms
syntax/single SELECT, not PG17 semantic correctness. Column binding was inspected
separately as above; raw syntax parsing alone missed the original defect and does
not exercise privilege-function overloads. Catalog permissions, performance, live
identity/context and Production schema state are unverified.

The separate [corrected Q03 rerun artifact](rental-contracts-production-catalog-q03-rerun.md)
contains the exact SQL above, independently byte-compared to the source. Both new
artifacts' SQL copies, links and whitespace were checked. git diff --check passed.
All four reviewed source documents remained identical to review-start contents.
The original Batch 1 remains untouched and stale: **do not use its Q03**. Preserve
its failed-run evidence with SQLSTATE 42703, rather than replacing history.

The query preserves missing-object LEFT JOIN evidence; required-role absence must
be checked against Q01 because roles lists only existing roles. LIMIT4000/count
bounds/detects output truncation, not planner cost or JSON cell size. Unknown OIDs,
unexpected relation kinds, NULL required checks or output truncation are unresolved,
never PASS. Missing writer role is expected before deployment; an existing writer
requires collision review. Separate SELECTs do not share a snapshot or session guarantee.

**Q03 is eligible for a separately controlled Production metadata rerun** using the
new artifact, confirmed target/executor and existing platform limits. This task does
not execute it or authorize automatic retry/escalation. No broader package runtime
certification is implied. Production deployment still needs real dependency/ACL/owner
reconciliation, non-superuser execution authority, reviewed atomic release/history/
serialization/recovery design and explicit approval. Q14 remains excluded/BLOCKED.

PG17 reference identifiers for later verification (not fetched in this offline review):
[privilege inquiries](https://www.postgresql.org/docs/17/functions-info.html),
[pg_roles](https://www.postgresql.org/docs/17/view-pg-roles.html),
[pg_attribute](https://www.postgresql.org/docs/17/catalog-pg-attribute.html).
