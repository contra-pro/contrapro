# Q03 — Corrected controlled Production rerun artifact

**Prepared only. NOT EXECUTED. Q03 ONLY.**
Independent verdict and limits: [hotfix review](rental-contracts-production-catalog-q03-independent-hotfix-review.md).
Production deployment remains BLOCKED / NO-GO; Q14 remains BLOCKED/excluded.

Use this corrected copy instead of Q03 in the stale
[original Batch 1 guide](rental-contracts-production-catalog-batch1.md). Do not replace
or erase earlier failed-run evidence. The [source package](rental-contracts-production-catalog-query-review.md)
SHA256 is fd235793ae7e311f889b44b7e2c8626bc31bbdfba0eee54b3740d5bd4c8a368e; Q03 SQL SHA256 is
875b16b5265c6aeff07b9567467a1f6abd3eacef9e3b01b768442ae05f74a60c. Changed bytes require re-review.

## Execution identity and manual controls

1. Obtain/confirm separate controlled-rerun authorization and independently confirm
   the intended Supabase Production project, database and approved SQL Editor role.
   This artifact initiates no connection or automatic retry. No credentials/service
   key or connection string is needed in evidence.
2. Keep the approved identity used for preceding Q01 evidence. Record Editor role and
   session_user/current_user evidence from that controlled context; if context changed
   or actual identity cannot be established, stop. Q03 does not itself return
   session_user/current_user. exact_executor marks the current_user role row;
   rls_active_for_current_executor is not a per-rolname RLS test.
3. Use existing approved platform timeouts. Copy only the following single SQL block
   into Editor and execute once manually. Do not add SET ROLE, wrappers, privilege
   changes or other queries. Do not proceed automatically to another query/batch.

## Exact independently reviewed SQL

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

## Expected output and interpretation

Columns, in order:

`schema_name`, `table_name`, `present`, `relkind`, `table_oid`, `attnum`, `role_oid`, `exact_executor`, `owner`, `relrowsecurity`, `relforcerowsecurity`, `explicit_table_acl`, `attname`, `atttypid`, `atttypmod`, `table_acl_uses_hardwired_defaults`, `explicit_table_grants`, `explicit_column_grants`, `attnotnull`, `attgenerated`, `attidentity`, `explicit_column_acl`, `rolname`, `can_set_owner`, `direct_owner`, `owner_role_usage`, `rolsuper`, `rolbypassrls`, `rls_active_for_current_executor`, `effective_table_privileges`, `effective_column_privileges`, `rows_total`.

One row per required table/positive non-dropped column/existing filtered role; missing
relations retain present=false evidence. Role absence must be reconciled with earlier
Q01. The ten named dependencies are identity.users/supabase_users and tenancy.agencies,
memberships, roles, membership_roles, role_permissions, clients, vehicles, audit_events.
Base dependency tables are expected ordinary relations with enabled/FORCE RLS according
to the reviewed design; reconcile actual evidence rather than assuming it.

Table JSON covers all eight PG17 privilege kinds including MAINTAIN with grant-option
booleans. Column JSON covers SELECT/INSERT/UPDATE/REFERENCES with grant options.
Stored explicit ACLs differ from effective privileges. NULL/missing evidence is not
false/approval. Owner SET, inherited USAGE and direct ownership answer different
questions. These inquiries do not establish row visibility, exercise writes or prove
migration executor authority. Missing proposed rental writer is expected; its presence
requires reconciliation, not reuse. Maximum output is 4000 rows; compare rows_total
with complete returned/exported count and ensure JSON/ACL cells are not truncated.

## Evidence and stop conditions

Save query ID Q03, source/SQL hashes, UTC execution time, independently confirmed
non-secret target/database label, selected/verified role context, full column headers,
rows/row count, errors/SQLSTATE and warnings in the approved restricted evidence channel.
Label this as the corrected rerun; preserve the original failure separately. Store
no credentials, tokens, connection strings or customer data. Catalog identifiers/ACLs
are sensitive operational metadata; do not export unrelated Editor history or auth data.

Stop for identity/target mismatch, permission or other error, warning requiring review,
unexpected object kind/column/owner/grants/grant options, missing dependency, unexpected
RLS/FORCE RLS state, unknown/ambiguous required evidence, sensitive content, timeout or
truncated rows/JSON/ACLs. Do not escalate permissions, change RLS, switch roles, modify
SQL or retry to get PASS. Quarantine unexpected sensitive content rather than publishing
it; record that evidence is incomplete. After collecting this query, stop for review.

## Preparation validation

The single embedded SQL block was compared byte-for-byte with the independently
reviewed source Q03 and the review's exact SQL copy. No logic or output fields changed.
Static AST/reference checks do not prove PG17 runtime correctness. No SQL executed by
Codex; no database connection or PostgreSQL process was started.
