# Production catalog evidence collection — Batch 1

**PREPARED ONLY — NOT EXECUTED BY CODEX.**
The user will manually execute approved metadata SELECTs in Supabase Production SQL
Editor. This batch contains **Q01, Q02, Q03, Q04 only**. Q14 is excluded and remains
BLOCKED. No Batch 2 execution or Production deployment is authorized by this document.
Production deployment remains **BLOCKED / NO-GO**.

## Reviewed source binding

SQL is copied verbatim from the [reviewed query package](rental-contracts-production-catalog-query-review.md).
Its SHA256 is 95652f7dd7aeb8d47ae079a5094e6e22380b62982d04c1c02d44093c98326da4.
The [final independent review](rental-contracts-production-catalog-q16-independent-final-review.md)
approves limited metadata eligibility for this fingerprint. The
[earlier re-review](rental-contracts-production-catalog-independent-rereview.md)
contains the detailed Q03 privilege limitations; its older package fingerprint and
Q16 verdict are historical, not the current source binding. No logic was reconstructed.
If source bytes change, stop and reconcile against the independent review before use.

## Manual execution checklist

1. Open the independently confirmed Supabase **Production** project. Verify its project
   identity in the dashboard against the intended project using trusted records; do
   not paste credentials or connection URLs into evidence. SQL output alone does not
   establish project identity.
2. Confirm the intended database and SQL Editor execution-role selection before Run.
   The proposed migration executor is postgres, but do not switch roles to obtain a
   desired answer. If the approved actual Editor identity is unclear, stop for review.
   Record the intended database/role using non-secret labels, not connection strings.
3. Ensure existing platform timeout controls are accepted for this bounded metadata
   run. Do not add SET, role switches, transaction wrappers or permission changes.
4. Copy **only Q01's SQL block**, without surrounding prose or another query. Execute
   once. Confirm returned session_user/current_user match the approved identity,
   PostgreSQL major version is 17, and the intended database/project selection remains
   correct. Q01 does not return current_database; record the dashboard/database context
   separately. Stop if SQL Editor selection or session identity is unexpected.
5. Save Q01's complete columns/rows/messages with its query ID and timestamp. Review
   stop conditions before executing Q02, then Q03, then Q04, individually. Confirm the
   same intended project/database/Editor role before each execution; do not assume
   pooled SQL Editor sessions or separate SELECTs share a snapshot or identity.
6. Preserve errors/warnings verbatim only after checking for secrets/personal data.
   Record SQLSTATE if provided; do not retry, escalate privileges, alter grants/RLS,
   substitute credentials or modify SQL to get a successful result.
7. Stop on unexpected objects/roles/privileges, missing required evidence, NULL or
   ambiguous capability evidence, permission/timeout errors, incomplete output or
   sensitive disclosure. Quarantine unexpected sensitive output in the approved
   restricted channel; do not copy it into repository evidence or chat.
8. After Q04, **stop**. Review Batch 1 evidence before preparing/proceeding to Batch 2.
   This preparation performs no SQL and schedules no automatic execution.

SQL Editor current_user/session_user evidence and actual migration executor authority
are separate questions. Even if the names match, these SELECTs do not exercise future
role creation, ownership transfer, grants, locks or migration-history INSERT. Q02–Q04
mostly show named-role metadata, not an independently returned session identity.
A role-selection change, reconnect or unexplained session difference requires stopping.

## Evidence handling

Save each query separately in an approved access-controlled evidence location chosen
by the user, using a label such as Batch1-Q01-<UTC timestamp>. This task creates no
result files and prescribes no credential-bearing location. Preserve:

| Field | Required evidence |
|---|---|
| Query ID/source | Q01/Q02/Q03/Q04; reviewed source fingerprint and corresponding SQL-block SHA256 below |
| Execution time | UTC timestamp with offset from Editor execution history; if unavailable, clearly labeled operator-recorded UTC time |
| Target context | Non-secret Production project/database label, independently confirmed; no URLs with credentials |
| Execution identity | Editor selected role plus actual Q01 session_user/current_user; for later queries distinguish selected-role evidence from unavailable returned session identity |
| Columns | Exact column names/order, even for zero rows; retain JSON field names and NULL values |
| Rows | Complete export/result rows, returned-row count and rows_total where present; preserve booleans/NULL/ACL/JSON without summaries replacing raw evidence |
| Errors/warnings | Sanitized message, SQLSTATE if available, query ID/time and whether rows were returned; do not interpret partial output as success |

Use an existing safe CSV/JSON export or text copy of the result grid, not screenshots
that include account details or credentials. Do not export unrelated tabs, full Editor
history, environment variables, auth records or business tables. Check Editor/export
row limits; retain column headers for empty results. Do not truncate ACL/JSON cells.
Names, roles, ACLs and object layout are operationally sensitive metadata; use approved
custody. Do not store tokens, passwords, connection strings, customer data or unexpected
personal identifiers. Record a fixed redaction/withheld marker if needed, stop collection,
and report that evidence is incomplete rather than exposing the sensitive value.

## Q01

**Purpose:** Establish the actual SQL session/executor context and required role presence, attributes and effective SET/USAGE/ADMIN authority.

**Exact reviewed SQL — manual execution only:**

```sql
WITH required(name) AS (VALUES ('postgres'),('anon'),('authenticated'),('authenticator'),
 ('service_role'),('contratpro_runtime'),('contratpro_platform_runtime'),('contratpro_rental_writer'))
SELECT session_user,current_user,pg_catalog.current_setting('server_version_num') AS server_version,
 pg_catalog.current_setting('createrole_self_grant',true) AS self_grant_behavior,
 x.name,r.oid IS NOT NULL AS present,r.rolcanlogin,r.rolsuper,r.rolbypassrls,r.rolinherit,
 r.rolcreatedb,r.rolcreaterole,r.rolreplication,
 pg_catalog.pg_has_role(current_user,r.oid,'SET') AS executor_can_set,
 pg_catalog.pg_has_role(current_user,r.oid,'USAGE') AS executor_inherits,
 pg_catalog.pg_has_role(current_user,r.oid,'MEMBER WITH ADMIN OPTION') AS executor_admin
FROM required x LEFT JOIN pg_catalog.pg_roles r ON r.rolname=x.name ORDER BY x.name;
```

**SQL-block SHA256:** 777b63f583f47fb32e7e444e5b561954a6fff6dab5051ce44cd91052f8350cbe.

**Expected output columns (in order):**

`session_user`, `current_user`, `server_version`, `self_grant_behavior`, `name`, `present`, `rolcanlogin`, `rolsuper`, `rolbypassrls`, `rolinherit`, `rolcreatedb`, `rolcreaterole`, `rolreplication`, `executor_can_set`, `executor_inherits`, `executor_admin`.

**Execution identity:** Run first under the already approved SQL Editor role. Returned session_user/current_user must match that approved context; no SET ROLE is permitted.

**Sensitive-data precautions:** Catalog-only output is still operationally sensitive. Apply the evidence-handling rules above; never include credentials, auth tokens or customer records. Inspect unexpected identifiers/messages before saving.

**Interpretation:** server_version is server_version_num text, not a display version. Expect eight named-role rows, including absent roles with present=false. The proposed contratpro_rental_writer is expected absent before deployment; its absence is not an error. An existing rental writer is a collision requiring review. SET, inherited USAGE and ADMIN are distinct; CREATEROLE does not prove authority over a future role or ownership-transfer capability. If the actual executor is outside the fixed required list, its special attributes are not independently supplied as a role row: stop for executor-specific review rather than infer them.

**Stop conditions:** Stop for unexpected session identity, non-17 version, missing required existing roles, a pre-existing rental writer, unexpected special privileges/options or ambiguous NULL role checks. An unset self_grant_behavior is unresolved configuration evidence, not false. No expected privilege value is invented here.

## Q02

**Purpose:** Inspect required schema presence/ownership/stored ACLs and named-role effective USAGE/CREATE plus owner-role SET capability.

**Exact reviewed SQL — manual execution only:**

```sql
WITH wanted(name) AS (VALUES ('identity'),('tenancy'),('app_private'),('public'),('supabase_migrations')),
roles AS (SELECT oid,rolname FROM pg_catalog.pg_roles WHERE rolname IN
 (current_user,'postgres','anon','authenticated','authenticator','service_role','contratpro_runtime','contratpro_platform_runtime','contratpro_rental_writer'))
SELECT w.name,n.oid IS NOT NULL AS present,pg_catalog.pg_get_userbyid(n.nspowner) AS owner,
 n.nspacl::pg_catalog.text AS explicit_acl,r.rolname,
 pg_catalog.has_schema_privilege(r.oid,n.oid,'USAGE') AS effective_usage,
 pg_catalog.has_schema_privilege(r.oid,n.oid,'CREATE') AS effective_create,
 pg_catalog.pg_has_role(r.oid,n.nspowner,'SET') AS can_set_owner
FROM wanted w LEFT JOIN pg_catalog.pg_namespace n ON n.nspname=w.name CROSS JOIN roles r
ORDER BY w.name,r.rolname;
```

**SQL-block SHA256:** 93bccd985520a96ffd7cec72fc8f5015ff944750bbd30c69f55d9c8382b92e1a.

**Expected output columns (in order):**

`name`, `present`, `owner`, `explicit_acl`, `rolname`, `effective_usage`, `effective_create`, `can_set_owner`.

**Execution identity:** Keep the same approved target/database/Editor role as Q01. current_user is included among queried roles, but this output does not return session_user/current_user as independent context columns.

**Sensitive-data precautions:** Catalog-only output is still operationally sensitive. Apply the evidence-handling rules above; never include credentials, auth tokens or customer records. Inspect unexpected identifiers/messages before saving.

**Interpretation:** Expect five schema names crossed with existing filtered roles. Missing roles are not emitted; reconcile with Q01. present=false means a required schema is absent. explicit_acl is stored ACL, not an expanded effective grant list; NULL uses hardwired defaults, not today's pg_default_acl. effective_usage/create and can_set_owner answer different questions. SET capability is not current ownership or evidence that an ownership transfer/grant would succeed.

**Stop conditions:** Stop for a missing schema, unexpected owner/ACL/effective privilege, ambiguous NULL capability evidence, missing executor role rows, errors or unexplained mismatch with Q01. Do not grant USAGE/CREATE to obtain a result.

## Q03

**Purpose:** Inspect exact dependency relations/columns, RLS flags, explicit grants and effective table/column privileges including grant options.

**Exact reviewed SQL — manual execution only:**

```sql
WITH wanted(schema_name,table_name) AS (VALUES ('identity','users'),('identity','supabase_users'),
 ('tenancy','agencies'),('tenancy','memberships'),('tenancy','roles'),('tenancy','membership_roles'),
 ('tenancy','role_permissions'),('tenancy','clients'),('tenancy','vehicles'),('tenancy','audit_events')),
roles AS (SELECT oid,rolname FROM pg_catalog.pg_roles WHERE rolname IN
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

**SQL-block SHA256:** 960edca44f843497754437eaaa112a57c9a853862419c2bb825a43f63f055fbf.

**Expected output columns (in order):**

`schema_name`, `table_name`, `present`, `relkind`, `table_oid`, `attnum`, `role_oid`, `exact_executor`, `owner`, `relrowsecurity`, `relforcerowsecurity`, `explicit_table_acl`, `attname`, `atttypid`, `atttypmod`, `table_acl_uses_hardwired_defaults`, `explicit_table_grants`, `explicit_column_grants`, `attnotnull`, `attgenerated`, `attidentity`, `explicit_column_acl`, `rolname`, `can_set_owner`, `direct_owner`, `owner_role_usage`, `rolsuper`, `rolbypassrls`, `rls_active_for_current_executor`, `effective_table_privileges`, `effective_column_privileges`, `rows_total`.

**Execution identity:** Maintain the approved Q01 context. exact_executor identifies the cross-joined current_user role row; rls_active_for_current_executor is always about the querying session, never each rolname.

**Sensitive-data precautions:** Catalog-only output is still operationally sensitive. Apply the evidence-handling rules above; never include credentials, auth tokens or customer records. Inspect unexpected identifiers/messages before saving.

**Interpretation:** Ten required relations are joined by exact schema/name, with positive non-dropped attributes and existing filtered roles. Missing tables are retained as present=false; missing roles require Q01. table_oid/attnum/type OIDs support same-cluster reconciliation. Expected base dependency tables have relkind=r and enabled/FORCE RLS according to the reviewed design; deviations require review. Explicit ACLs/grants are distinct from effective privileges, which may come from PUBLIC/inheritance/table grants or owner/superuser rules. direct_owner, owner_role_usage and can_set_owner are distinct. Effective object privileges do not prove schema access, row visibility, successful writes, CREATEROLE or ownership transfer. JSON covers all eight PG17 table privilege kinds and four applicable column kinds with grant options. Compare rows_total with complete returned/exported rows; LIMIT 4000 bounds output, not work.

**Stop conditions:** Stop for missing or unexpected relation kind/column/owner, disabled required RLS/FORCE RLS, unexplained grants or grant options, identity mismatch, NULL/ambiguous required checks, unknown type metadata or truncated ACL/JSON/results. If rows_total exceeds rows received, evidence is incomplete. Review unexpected privileges without revoking/changing anything.

## Q04

**Purpose:** Inventory sequences in relevant schemas with stored ACL/owner and named-role effective USAGE/SELECT/UPDATE, without reading sequence values.

**Exact reviewed SQL — manual execution only:**

```sql
SELECT n.nspname,c.relname,pg_catalog.pg_get_userbyid(c.relowner) AS owner,
 c.relacl::pg_catalog.text AS explicit_acl,r.rolname,
 pg_catalog.has_sequence_privilege(r.oid,c.oid,'USAGE') AS effective_usage,
 pg_catalog.has_sequence_privilege(r.oid,c.oid,'SELECT') AS effective_select,
 pg_catalog.has_sequence_privilege(r.oid,c.oid,'UPDATE') AS effective_update,
 pg_catalog.count(*) OVER() AS rows_total
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
CROSS JOIN pg_catalog.pg_roles r WHERE c.relkind='S'
AND n.nspname IN('tenancy','app_private','supabase_migrations')
AND r.rolname IN(current_user,'postgres','authenticated','contratpro_rental_writer')
ORDER BY n.nspname,c.relname,r.rolname LIMIT 500;
```

**SQL-block SHA256:** 9b027566aa5f2946756df1d6d7e91c83371df93b263357920ab05effbecf0ccf.

**Expected output columns (in order):**

`nspname`, `relname`, `owner`, `explicit_acl`, `rolname`, `effective_usage`, `effective_select`, `effective_update`, `rows_total`.

**Execution identity:** Keep the same approved context. The filtered role set includes current_user, postgres, authenticated and an existing rental writer; unlike Q02/Q03 it deliberately does not include every runtime role.

**Sensitive-data precautions:** Catalog-only output is still operationally sensitive. Apply the evidence-handling rules above; never include credentials, auth tokens or customer records. Inspect unexpected identifiers/messages before saving.

**Interpretation:** Only relkind=S in tenancy/app_private/supabase_migrations is selected. Sequence rows are metadata, not nextval/setval/currval or relation-value reads. The rental design uses a counter table and creates no sequence; existing sequences may relate to dependencies/history. Zero rows is valid inventory evidence for this scope but not proof schemas exist or that all possible defaults are safe. Reconcile Q02 and later authorized default/dependency evidence. LIMIT 500/count apply after role expansion; repeated sequence names for different roles are expected.

**Stop conditions:** Stop for unexpected sequence ownership/grants, unexplained sequence presence, errors, inconsistent context or incomplete output. If rows_total exceeds received rows, or an export truncates without trustworthy counts, stop. Do not advance/reset/read sequence values to investigate.

## Preparation validation

All four embedded SQL blocks were compared byte-for-byte with Q01–Q04 in the
reviewed source. Column names were extracted offline from the parsed SELECT target
lists. No SQL logic, wrappers, role changes or other queries were added. Source
documents remain unchanged. Static parsing uses the installed PostgreSQL 18-based
parser, not PostgreSQL 17 runtime verification. No SQL was executed by Codex.
