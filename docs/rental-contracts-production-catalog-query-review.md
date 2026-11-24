# Rental Contracts Phase 1A — Production catalog query security review

**OFFLINE REVIEW ONLY. ALL QUERIES BELOW: NOT EXECUTED.**
Production deployment remains **BLOCKED / NO-GO**. This file authorizes no connection,
SQL execution, role change, deployment or activation. It is documentation, not a
migration or runnable deployment script.

## Remediation revision status

The [independent audit](rental-contracts-production-catalog-independent-audit.md)
classified the prior package as 9 SAFE / 6 NEEDS REVISION / 1 BLOCKED. That report is
preserved and is not superseded by the initial SAFE labels below. Only SQL blocks
Q03, Q05, Q10, Q13, Q15 and Q16 changed in this revision; the nine accepted blocks and
Q14 are byte-identical. The old package fingerprint/approval does not approve this file.
See [remediation record](rental-contracts-production-catalog-remediation.md).

Post-remediation author self-review: **15 SAFE metadata queries / 0 NEEDS REVISION /
1 BLOCKED (Q14)**, pending a new independent review of the six changed blocks. SAFE
means bounded observational metadata for the stated purpose, not complete implementation,
dependency, visibility, actual privilege-exercise or deployment proof. Unknown types,
hashes/settings, truncation or missing metadata leave the corresponding fact unresolved.

Reviewed [readiness assessment](rental-contracts-production-readiness.md),
[Phase 1A design](rental-contracts-phase1a.md), the guarded rental draft, dependency
role/RLS patterns in native 0001-0007 and 0008-0012 drafts/candidates, and the already
accepted Production evidence. Repository files and the local superuser's 20/20 run
do not establish current Production authority. No new Production evidence was acquired.

## Original inventory and classification

The original assessment contains **15 SELECT statements**, plus BEGIN, SET LOCAL
and ROLLBACK. Under this request, the wrapper is excluded entirely. No application
RPC is invoked by the original SELECTs, but all 15 require revision for independent
search-path resolution, evidence coverage, result scope or disclosure controls.

| Original SELECT | Purpose/catalogs | Classification/revision |
|---|---|---|
| 1 executor | pg_roles, current_setting | NEEDS REVISION: qualify built-ins; include missing roles/effective authority |
| 2 languages | pg_language | NEEDS REVISION: qualify, bounded required-language presence |
| 3 schemas | pg_namespace | NEEDS REVISION: explicit/effective ACL separation and runtime roles |
| 4 tables/columns | pg_class, pg_attribute | NEEDS REVISION: types, missing objects, runtime effective privileges, scope |
| 5 constraints | pg_constraint | NEEDS REVISION: missing dependencies, exact FK/key columns and index support |
| 6 helpers | pg_proc | NEEDS REVISION: avoid full function bodies, exact overloaded signatures and ACL evidence |
| 7 defaults | pg_default_acl | NEEDS REVISION: relevant scope, decode owner/grantor/grantee/privilege/options |
| 8 role attributes | pg_roles | NEEDS REVISION: missing-role visibility and relevant capabilities |
| 9 memberships | pg_auth_members | NEEDS REVISION: include transitive ancestor edges and grantor/options |
| 10 policies | pg_policy | NEEDS REVISION: scope dependencies; do not emit potentially sensitive literals |
| 11 triggers | pg_trigger | NEEDS REVISION: function identity, enablement, no raw arguments/literals |
| 12 relation collisions | pg_class | NEEDS REVISION: types, sequences, indexes, constraints, policies/triggers |
| 13 function collisions | pg_proc | NEEDS REVISION: qualified signatures and default argument collision caveat |
| 14 history versions | schema_migrations.version | NEEDS REVISION: count duplicates/bound output; validate RLS/structure separately |
| 15 history privileges | has_table_privilege | NEEDS REVISION: separate privileges; OR-list result is not ownership or atomicity proof |

Original counts: SAFE 0 / NEEDS REVISION 15 / BLOCKED 0. This is a query-package
classification, not a finding that the original SELECTs performed writes. New package:
**15 author-reviewed SAFE SELECT-only queries plus Q14 BLOCKED**. Q13 success
alone cannot unblock Q14; independent evidence and explicit content approval are required.
No SELECT can establish future new-role authority or a correct deployment transaction
by itself; those conclusions remain BLOCKED even if these queries execute successfully.

## Common safety and interpretation rules

All referenced catalogs and callable inspection functions are explicitly pg_catalog
qualified. SQL keywords current_user/session_user are built in. Exact name lookup uses
schema-qualified identities and pg_catalog parameter types. There are no application
function calls, SECURITY DEFINER RPC invocations, external calls, extension functions,
sequence nextval/setval/currval, DDL, DML, locks, temporary objects, role switches,
transaction control or session changes. Built-in ACL/definition/metadata inspection
does not invoke application helper bodies or policy predicates.

Catalog SELECT access and existing EXECUTE rights on the listed pg_catalog inspection
functions are required. Typical roles can inspect these catalogs, but managed grants
must be respected: an access error is BLOCKED, never permission to grant access or use
a service key. pg_roles selects only non-secret fields; pg_authid, rolpassword,
pg_db_role_setting and auth/business tables are not queried. Q14 alone reads operational
migration version records and requires existing schema USAGE/table SELECT.

Roles, object names, ACL grantees and schema layout are operationally sensitive metadata;
keep results in the approved review channel. No password hashes, connection strings,
customer rows, stored migration statements, comments, function bodies, trigger arguments
or policy literal text are returned. Function and expression fingerprints are not a
substitute for source review: compare against approved fingerprints or mark unknown.

Limits include count(*) OVER() where sets may grow. If rows_total exceeds returned rows,
results are incomplete: BLOCKED pending a separately reviewed narrower page/filter.
If a query without rows_total reaches its LIMIT, also treat it as potentially truncated.
Limits bound output, not necessarily planner work. Separate SELECTs do not share a
snapshot; require a stable change window and compare consistency, never assume atomicity.
Do not add BEGIN/SET/ROLLBACK to this package. Platform timeout settings are external
execution prerequisites, not changes authorized by this document.

Explicit ACL text is the stored ACL, possibly NULL. NULL uses hard-wired object defaults,
not today's pg_default_acl. has_*_privilege reflects effective PUBLIC/inherited/owner/
superuser privileges. A list such as 'UPDATE,DELETE' means ANY privilege, not ALL.
Grant options, role SET, role inheritance and role ADMIN must be interpreted separately.

## Inventory, expected output and access

| Query | Expected columns/evidence | Access/safety |
|---|---|---|
| Q01 | session/executor, required role presence/flags, SET/USAGE/ADMIN | SAFE; pg_roles + built-ins; no role switch |
| Q02 | schema presence/owner/raw ACL; effective role USAGE/CREATE/owner SET | SAFE; catalog read; no schema change |
| Q03 | exact OIDs/attnums, decoded explicit grants, owner role and all effective table/column privileges/options | SAFE self-review; changed, independent re-review pending |
| Q04 | sequence owner/raw ACL/effective USAGE/SELECT/UPDATE | SAFE; never reads sequence relation values |
| Q05 | exact helper metadata, filtered settings, multiple implementation fingerprints, current/initial ACL provenance | SAFE self-review; changed, no source/config-secret disclosure |
| Q06 | relevant type ownership/ACL/effective USAGE | SAFE; pg_type metadata only |
| Q07 | default owner/schema/type, grantor/grantee/privilege/grant option | SAFE; ACL expansion only |
| Q08 | relevant transitive membership edges/options/grantor | SAFE; pg_auth_members; no SET ROLE |
| Q09 | keys/FKs, validation/deferral, columns and supporting index validity | SAFE; metadata only |
| Q10 | policies, internal/user trigger firing state, arguments/columns/deferral fingerprints and function security metadata | SAFE self-review; changed; semantics still need reconciliation |
| Q11 | proposed namespace collisions, including overloads/types/policies/indexes | SAFE; discovery only, false positives require review |
| Q12 | installed extensions and languages/effective USAGE | SAFE; no extension installation/function execution |
| Q13 | exact history identity/types/access/RLS/policies/keys and explicitly blocked content decision | SAFE self-review; changed; does NOT unblock Q14 |
| Q14 | version, occurrences, total count | BLOCKED pending Q13; then conditional SAFE with existing history SELECT privilege |
| Q15 | history SELECT/INSERT/schema access, MAINTAIN, ownership and lock-privilege evidence | SAFE self-review; changed; performs no write/lock/DDL |
| Q16 | labeled incoming/outgoing bounded dependencies, extension/shared-role edges | SAFE self-review; changed; explicitly incomplete graph |

No proposed query requires SUPERUSER, BYPASSRLS, CREATEROLE or a writer role. Use the
already authorized intended migration executor for its own effective privilege evidence.
Do not escalate merely to obtain a result. Q05 hashes function source rather than using
pg_get_functiondef, which could disclose embedded secrets even though it is read-only.

## Exact proposed SQL — NOT EXECUTED

Run in Q01–Q16 order only after separate explicit authorization and independent target
binding. Each block is one standalone SELECT (possibly WITH). Do not substitute a
different role to make an authority check pass.

### Q01 — identity, role attributes and effective role authority

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

Missing new rental writer is expected before deployment; its existence is a collision
requiring reconciliation. Missing required existing roles is not PASS. CREATEROLE is
not proof of ownership-transfer SET capability or grantor authority.

### Q02 — schemas, explicit ACL and effective privileges

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

### Q03 — exact dependency tables/columns and effective column privileges

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

Missing objects produce present=false; do not infer success from an empty child result.
atttypid is joined/reconciled through Q06/catalog metadata, not a guessed type name.
Explicit stored grants are decoded independently of effective privileges; no hard-wired
defaults are mislabeled explicit. Column privileges incorporate applicable table grants.
direct_owner, owner_role_usage and can_set_owner answer different ownership questions.
The RLS-active field is for current_user, not the cross-joined role. Superuser/bypass
flags and Q08's membership edges help interpretation; they do not identify one unique
grant path or prove DDL/CREATE ROLE/ownership-transfer ability. No table records are read.

### Q04 — sequence ownership and effective privileges, without sequence values

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

The rental draft creates NO sequence: numbering uses a counter table; UUID generation
uses pg_catalog.gen_random_uuid. Existing sequences may matter to history defaults.

### Q05 — exact helper identities, attributes, ACL and source fingerprint

```sql
WITH required(signature) AS (VALUES ('app_private.canonical_auth_user()'),('app_private.receipt_auth_uid()')),
roles AS (SELECT oid,rolname FROM pg_catalog.pg_roles WHERE rolname IN
 (current_user,'postgres','anon','authenticated','contratpro_rental_writer'))
SELECT x.signature,p.oid IS NOT NULL AS present,p.oid,pg_catalog.pg_get_userbyid(p.proowner) AS owner,
 pn.nspname AS function_schema,p.proname,p.proowner,owner_role.rolsuper AS owner_superuser,
 owner_role.rolbypassrls AS owner_bypassrls,owner_role.rolcanlogin AS owner_login,
 p.prokind,p.prosecdef,p.provolatile,p.proparallel,p.proisstrict,p.proleakproof,p.proretset,p.procost,p.prorows,
 p.prosupport,p.provariadic,p.pronargdefaults,p.proargnames,p.proargmodes,
 p.proargtypes::pg_catalog.text,p.proallargtypes,
 p.prorettype,p.proacl::pg_catalog.text AS explicit_acl,l.lanname,r.rolname,
 pg_catalog.cardinality(p.proconfig) AS configuration_entry_count,
 (p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on']::pg_catalog.text[]
  AND pg_catalog.cardinality(p.proconfig)=2) IS TRUE AS hardened_two_settings_exact,
 pg_catalog.has_function_privilege(r.oid,p.oid,'EXECUTE') AS effective_execute,
 pg_catalog.has_function_privilege(r.oid,p.oid,'EXECUTE WITH GRANT OPTION') AS execute_grant_option,
 pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.replace(p.prosrc,E'\r\n',E'\n'),'UTF8')),'hex') AS source_sha256,
 p.prosqlbody IS NOT NULL AS has_parsed_sql_body,
 pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosqlbody::pg_catalog.text,'UTF8')),'hex') AS parsed_body_node_sha256,
 p.probin IS NOT NULL AS has_binary_reference,
 pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.probin,'UTF8')),'hex') AS binary_reference_sha256,
 (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'key',CASE WHEN pg_catalog.split_part(s.setting,'=',1) ~ '^[a-z_][a-z_0-9.]*$'
     THEN pg_catalog.split_part(s.setting,'=',1) ELSE '<invalid-key-withheld>' END,
   'approved_value',CASE WHEN s.setting IN('search_path=pg_catalog, pg_temp','search_path=pg_catalog,pg_temp','row_security=on','row_security=off')
     THEN pg_catalog.substr(s.setting,pg_catalog.strpos(s.setting,'=')+1) ELSE NULL END,
   'unexpected_value_withheld',s.setting NOT IN('search_path=pg_catalog, pg_temp','search_path=pg_catalog,pg_temp','row_security=on','row_security=off')) ORDER BY s.setting)
  FROM pg_catalog.unnest(p.proconfig) s(setting)) AS configuration_metadata,
 (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('origin',ip.privtype,'initial_acl',ip.initprivs::pg_catalog.text))
  FROM pg_catalog.pg_init_privs ip WHERE ip.classoid='pg_catalog.pg_proc'::pg_catalog.regclass AND ip.objoid=p.oid AND ip.objsubid=0) AS initial_privilege_metadata,
 (SELECT pg_catalog.jsonb_agg(e.extname ORDER BY e.extname) FROM pg_catalog.pg_depend d
  JOIN pg_catalog.pg_extension e ON e.oid=d.refobjid WHERE d.classid='pg_catalog.pg_proc'::pg_catalog.regclass
  AND d.objid=p.oid AND d.refclassid='pg_catalog.pg_extension'::pg_catalog.regclass AND d.deptype='e') AS extension_membership
FROM required x LEFT JOIN pg_catalog.pg_proc p ON p.oid=pg_catalog.to_regprocedure(x.signature)
LEFT JOIN pg_catalog.pg_namespace pn ON pn.oid=p.pronamespace
LEFT JOIN pg_catalog.pg_roles owner_role ON owner_role.oid=p.proowner
LEFT JOIN pg_catalog.pg_language l ON l.oid=p.prolang CROSS JOIN roles r ORDER BY x.signature,r.rolname;
```

These dependencies have no arguments; exact lookup is retained. New overloads appear
in Q11 with namespace/name/input-type OIDs. Settings expose only syntactically valid key
names and approved literal values; unknown values (including unexpected search paths)
are withheld and must be reconciled, not accepted. No hash of secret-bearing config
values is emitted. The expected helper may legitimately have a different setting count;
compare its approved individual baseline, do not impose two settings universally.

prosrc SHA-256 is only one fingerprint. Parsed SQL nodes contain cluster-specific OIDs;
binary-reference hashing covers a stored reference, NOT library bytes. Support-function
OID, language, return/input types, strictness, volatility, parallel/leakproof and owner
attributes are separate evidence. No safe complete external-library/code fingerprint
is claimed. Unexpected body representation/language/support or unknown hashes remain
BLOCKED for semantic equivalence pending approved source/binary review. Fingerprints
can reveal equality/low-entropy guesses; keep them controlled. Initial ACLs in pg_init_privs
are provenance, not current/effective privileges or complete user-object grant history.

### Q06 — relevant type identities/owners/ACL/USAGE

```sql
SELECT n.nspname,t.typname,t.oid,t.typtype,t.typbasetype,t.typrelid,
 pg_catalog.pg_get_userbyid(t.typowner) AS owner,t.typacl::pg_catalog.text AS explicit_acl,
 r.rolname,pg_catalog.has_type_privilege(r.oid,t.oid,'USAGE') AS effective_usage,
 pg_catalog.count(*) OVER() AS rows_total
FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
CROSS JOIN pg_catalog.pg_roles r
WHERE ((n.nspname='pg_catalog' AND t.typname IN('uuid','jsonb','text','int4','int8','numeric','timestamptz','tstzrange','bool'))
 OR (n.nspname IN('identity','tenancy','app_private') AND (t.typname IN('users','supabase_users','agencies','memberships','clients','vehicles','audit_events') OR t.typname LIKE 'rental%'))
 OR t.oid IN(SELECT a.atttypid FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
   JOIN pg_catalog.pg_namespace ns ON ns.oid=c.relnamespace WHERE a.attnum>0 AND NOT a.attisdropped
   AND ((ns.nspname='identity' AND c.relname IN('users','supabase_users')) OR
   (ns.nspname='tenancy' AND c.relname IN('agencies','memberships','roles','membership_roles','role_permissions','clients','vehicles','audit_events')))))
AND r.rolname IN(current_user,'postgres','authenticated','contratpro_rental_writer')
ORDER BY n.nspname,t.typname,r.rolname LIMIT 500;
```

### Q07 — relevant default ACL entries decoded

```sql
SELECT pg_catalog.pg_get_userbyid(d.defaclrole) AS creating_owner,
 CASE WHEN d.defaclnamespace=0 THEN '<global>' ELSE n.nspname END AS target_schema,
 d.defaclobjtype,pg_catalog.pg_get_userbyid(a.grantor) AS grantor,
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee)::pg_catalog.text END AS grantee,
 a.privilege_type,a.is_grantable,pg_catalog.count(*) OVER() AS rows_total
FROM pg_catalog.pg_default_acl d LEFT JOIN pg_catalog.pg_namespace n ON n.oid=d.defaclnamespace
LEFT JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) a ON true
WHERE d.defaclnamespace=0 OR n.nspname IN('identity','tenancy','app_private','public','supabase_migrations')
ORDER BY creating_owner,target_schema,d.defaclobjtype,grantee,a.privilege_type LIMIT 1000;
```

Global defaults replace hard-wired defaults; per-schema entries add to that baseline.
No rows is not proof of no privileges. Existing ACLs are independent and defaults are
not retroactive. LEFT JOIN preserves even an explicitly empty default ACL record.

### Q08 — relevant transitive membership edges and exact grant options

```sql
WITH RECURSIVE reachable(oid) AS (
 SELECT oid FROM pg_catalog.pg_roles WHERE rolname IN(current_user,'postgres','anon','authenticated',
 'authenticator','service_role','contratpro_runtime','contratpro_platform_runtime','contratpro_rental_writer')
 UNION SELECT m.roleid FROM pg_catalog.pg_auth_members m JOIN reachable r ON m.member=r.oid
)
SELECT pg_catalog.pg_get_userbyid(m.roleid) AS granted_role,pg_catalog.pg_get_userbyid(m.member) AS member,
 pg_catalog.pg_get_userbyid(m.grantor) AS grantor,m.admin_option,m.inherit_option,m.set_option,
 pg_catalog.count(*) OVER() AS rows_total
FROM pg_catalog.pg_auth_members m WHERE m.member IN(SELECT oid FROM reachable)
 OR m.roleid=pg_catalog.to_regrole('contratpro_rental_writer')
ORDER BY granted_role,member,grantor LIMIT 1000;
```

Recursion intentionally discovers ancestors regardless of SET/INHERIT options; this
does NOT assert every path is usable. Q01's pg_has_role answers effective capability;
review every grantor/option edge when designing temporary authority/restoration.

### Q09 — required key/FK definitions and supporting indexes

```sql
SELECT n.nspname,c.relname,k.conname,k.contype,k.convalidated,k.condeferrable,k.condeferred,
 k.conkey,k.confrelid,k.confkey,k.confupdtype,k.confdeltype,
 pg_catalog.pg_get_constraintdef(k.oid) AS definition,
 i.indisunique,i.indisvalid,i.indisready,i.indimmediate,pg_catalog.count(*) OVER() AS rows_total
FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_catalog.pg_index i ON i.indexrelid=k.conindid
WHERE n.nspname IN('identity','tenancy') AND c.relname IN('users','supabase_users','agencies',
 'memberships','roles','membership_roles','role_permissions','clients','vehicles','audit_events')
AND k.contype IN('p','u','f') ORDER BY n.nspname,c.relname,k.conname LIMIT 500;
```

No CHECK/default expressions are emitted here. Compare exact key columns and validated
nondeferrable tenant keys, not just constraint names. FK supporting-index fields do
not substitute for inspecting the referenced UNIQUE/PK row.

### Q10 — policy/trigger shape and fingerprints, no application execution

```sql
WITH wanted(schema_name,table_name) AS (VALUES ('identity','users'),('identity','supabase_users'),
 ('tenancy','agencies'),('tenancy','memberships'),('tenancy','roles'),('tenancy','membership_roles'),
 ('tenancy','role_permissions'),('tenancy','clients'),('tenancy','vehicles'),('tenancy','audit_events'),
 ('tenancy','rental_contracts'),('app_private','rental_numbers'),('app_private','rental_creation_receipts'),('app_private','rental_confirmation_receipts')),
targets AS (SELECT c.oid,c.relname,n.nspname FROM wanted w JOIN pg_catalog.pg_namespace n ON n.nspname=w.schema_name
 JOIN pg_catalog.pg_class c ON c.relnamespace=n.oid AND c.relname=w.table_name),
found AS (
SELECT 'policy' AS kind,c.nspname,c.relname,p.polname::pg_catalog.text AS name,
 pg_catalog.jsonb_build_object('command',p.polcmd,'permissive',p.polpermissive,
 'policy_oid',p.oid,'table_oid',p.polrelid,
 'roles',ARRAY(SELECT CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(r)::pg_catalog.text END FROM pg_catalog.unnest(p.polroles) r),
 'using_node_sha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.polqual::pg_catalog.text,'UTF8')),'hex'),
 'check_node_sha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.polwithcheck::pg_catalog.text,'UTF8')),'hex')) AS metadata
FROM pg_catalog.pg_policy p JOIN targets c ON c.oid=p.polrelid
UNION ALL
SELECT 'trigger',c.nspname,c.relname,t.tgname::pg_catalog.text,
 pg_catalog.jsonb_build_object('enabled',t.tgenabled,'type',t.tgtype,'function_oid',t.tgfoid,
 'trigger_oid',t.oid,'table_oid',t.tgrelid,'internal',t.tgisinternal,'parent_trigger_oid',t.tgparentid,
 'update_column_attnums',t.tgattr::pg_catalog.text,'argument_count',t.tgnargs,
 'argument_sha256',pg_catalog.encode(pg_catalog.sha256(t.tgargs),'hex'),
 'constraint_oid',t.tgconstraint,'constraint_table_oid',t.tgconstrrelid,'constraint_index_oid',t.tgconstrindid,
 'deferrable',t.tgdeferrable,'initially_deferred',t.tginitdeferred,'old_transition_name',t.tgoldtable,'new_transition_name',t.tgnewtable,
 'replication_role',pg_catalog.current_setting('session_replication_role'),
 'enabled_for_current_replication_role',t.tgenabled='A' OR
   (t.tgenabled='O' AND pg_catalog.current_setting('session_replication_role') IN('origin','local')) OR
   (t.tgenabled='R' AND pg_catalog.current_setting('session_replication_role')='replica'),
 'function_schema',fn.nspname,'function_name',f.proname,'input_types',f.proargtypes::pg_catalog.text,
 'function_owner',pg_catalog.pg_get_userbyid(f.proowner),'security_definer',f.prosecdef,'language_oid',f.prolang,
 'volatility',f.provolatile,'parallel',f.proparallel,'strict',f.proisstrict,'leakproof',f.proleakproof,'support_oid',f.prosupport,
 'configuration_keys',ARRAY(SELECT CASE WHEN pg_catalog.split_part(s.setting,'=',1) ~ '^[a-z_][a-z_0-9.]*$'
   THEN pg_catalog.split_part(s.setting,'=',1) ELSE '<invalid-key-withheld>' END FROM pg_catalog.unnest(f.proconfig) s(setting)),
 'hardened_settings_exact',f.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on']::pg_catalog.text[]
   AND pg_catalog.cardinality(f.proconfig)=2,
 'source_sha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.replace(f.prosrc,E'\r\n',E'\n'),'UTF8')),'hex'),
 'parsed_body_node_sha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(f.prosqlbody::pg_catalog.text,'UTF8')),'hex'),
 'binary_reference_sha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(f.probin,'UTF8')),'hex'),
 'when_node_sha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(t.tgqual::pg_catalog.text,'UTF8')),'hex'))
FROM pg_catalog.pg_trigger t JOIN targets c ON c.oid=t.tgrelid
JOIN pg_catalog.pg_proc f ON f.oid=t.tgfoid JOIN pg_catalog.pg_namespace fn ON fn.oid=f.pronamespace
)
SELECT *,pg_catalog.count(*) OVER() AS rows_total FROM found ORDER BY kind,nspname,relname,name LIMIT 1000;
```

rows_total now covers the whole UNION result. Internal and user triggers are both shown.
Disabled (D) is always false in the current firing-mode field; A/O/R reflect PG17's
session_replication_role behavior. That field is mode evidence only: it does not assert
an operation's tgtype, UPDATE OF columns, WHEN condition or deferral will actually fire.
Arguments are hashed as bytea without rendering embedded strings. tgattr/constraint,
parent, transition-table and deferral metadata are retained. Function identity includes
schema/name/input-type OIDs, owner/security attributes, safe key-only configuration
metadata and source/body/reference fingerprints; bodies/settings/arguments never run.
Q16 provides declared dependency links. No hash proves tenant-safe logic: expression
nodes are cluster-specific and need an approved semantic baseline or separately reviewed
sanitized source. Internal trigger implementation changes may require provider review.

### Q11 — collision discovery across relation/function/type/policy/constraint namespaces

```sql
WITH found AS (
 SELECT 'relation'::pg_catalog.text AS kind,n.nspname,c.relname::pg_catalog.text AS name,c.relkind::pg_catalog.text AS detail
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN('tenancy','app_private','public') AND c.relname LIKE 'rental%'
 UNION ALL SELECT 'function',n.nspname,p.proname::pg_catalog.text,p.proargtypes::pg_catalog.text
 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
 WHERE (n.nspname='app_private' AND p.proname LIKE 'rental%') OR (n.nspname='public' AND p.proname LIKE 'contratpro_rental%')
 UNION ALL SELECT 'type',n.nspname,t.typname::pg_catalog.text,t.typtype::pg_catalog.text
 FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
 WHERE n.nspname IN('tenancy','app_private','public') AND (t.typname LIKE 'rental%' OR t.typname LIKE '_rental%')
 UNION ALL SELECT 'policy',n.nspname,p.polname::pg_catalog.text,c.relname::pg_catalog.text
 FROM pg_catalog.pg_policy p JOIN pg_catalog.pg_class c ON c.oid=p.polrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN('identity','tenancy','app_private') AND p.polname LIKE 'rental%'
 UNION ALL SELECT 'constraint',n.nspname,k.conname::pg_catalog.text,c.relname::pg_catalog.text
 FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN('tenancy','app_private') AND k.conname LIKE 'rental%'
 UNION ALL SELECT 'trigger',n.nspname,t.tgname::pg_catalog.text,c.relname::pg_catalog.text
 FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN('tenancy','app_private') AND t.tgname LIKE 'rental%'
)
SELECT *,pg_catalog.count(*) OVER() AS rows_total FROM found ORDER BY kind,nspname,name,detail LIMIT 1000;
```

Relation kinds include tables, sequences and indexes; composite/array type collisions
are included. Function input OIDs identify overloads; reconcile them against pg_type,
not an unqualified name. Prefix discovery is intentionally broader than exact proposed
names: any row is a review item, not automatic permission to reuse/drop/alter it.
Also inspect argument defaults/variadic attributes if any candidate overload exists;
name/type identities alone do not prove PostgREST dispatch is unambiguous.

### Q12 — installed extensions and required languages

```sql
SELECT 'extension' AS kind,e.extname AS name,e.extversion::pg_catalog.text AS version,
 n.nspname::pg_catalog.text AS schema_name,NULL::pg_catalog.boolean AS executor_usage
FROM pg_catalog.pg_extension e JOIN pg_catalog.pg_namespace n ON n.oid=e.extnamespace
UNION ALL
SELECT 'language',l.lanname,NULL,NULL,pg_catalog.has_language_privilege(current_user,l.oid,'USAGE')
FROM pg_catalog.pg_language l WHERE l.lanname IN('sql','plpgsql') ORDER BY kind,name LIMIT 200;
```

Both languages must appear and permit USAGE. No btree_gist is needed. This checks
installed metadata, not available packages, and invokes no extension-provided function.

### Q13 — migration-history structure and indexes (no history contents)

```sql
SELECT session_user,current_user,n.oid AS schema_oid,n.nspname,c.oid AS table_oid,c.relname,
 c.oid IS NOT NULL AS present,c.relkind,c.relpersistence,c.relhassubclass,c.relispartition,c.relhasrules,
 pg_catalog.pg_get_userbyid(c.relowner) AS owner,
 c.relacl::pg_catalog.text AS explicit_acl,c.relrowsecurity,c.relforcerowsecurity,
 pg_catalog.row_security_active(c.oid) AS rls_filters_current_role,
 pg_catalog.has_schema_privilege(current_user,n.oid,'USAGE') AS executor_schema_usage,
 pg_catalog.has_table_privilege(current_user,c.oid,'SELECT') AS executor_table_select,
 pg_catalog.has_column_privilege(current_user,c.oid,v.attnum,'SELECT') AS executor_version_select,
 v.attnum AS version_attnum,v.atttypid AS version_type_oid,vn.nspname AS version_type_schema,
 vt.typname AS version_type_name,vt.typtype AS version_type_kind,vt.typbasetype AS version_base_type,
 v.attgenerated AS version_generated,v.attidentity AS version_identity,
 (c.relkind='r' AND c.relpersistence='p' AND NOT c.relhassubclass
  AND vn.nspname='pg_catalog' AND vt.typname='text' AND vt.typtype='b'
  AND v.attgenerated='' AND v.attidentity=''
  AND pg_catalog.has_schema_privilege(current_user,n.oid,'USAGE') IS TRUE
  AND pg_catalog.has_column_privilege(current_user,c.oid,v.attnum,'SELECT') IS TRUE
  AND pg_catalog.row_security_active(c.oid) IS FALSE) IS TRUE AS observable_prerequisites_only,
 'BLOCKED_PENDING_INDEPENDENT_EVIDENCE_AND_EXPLICIT_CONTENT_APPROVAL'::pg_catalog.text AS q14_decision,
 a.attnum,a.attname,a.atttypid,a.atttypmod,a.attnotnull,a.atthasdef,a.attidentity,a.attgenerated,
 an.nspname AS column_type_schema,at.typname AS column_type_name,at.typtype AS column_type_kind,at.typbasetype,
 pg_catalog.has_column_privilege(current_user,c.oid,a.attnum,'SELECT') AS executor_column_select,
 CASE WHEN a.attname='version' THEN 'OPERATIONAL_VERSION_CONTENT_NOT_YET_APPROVED'
   ELSE 'PAYLOAD_COLUMN_CONTENT_NOT_AUTHORIZED' END AS disclosure_classification,
 (SELECT pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(d.adbin::pg_catalog.text,'UTF8')),'hex')
  FROM pg_catalog.pg_attrdef d WHERE d.adrelid=c.oid AND d.adnum=a.attnum) AS default_node_sha256,
 (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('unique',i.indisunique,'valid',i.indisvalid,
  'index_oid',i.indexrelid,'ready',i.indisready,'immediate',i.indimmediate,'primary',i.indisprimary,
  'keys_and_include',i.indkey::pg_catalog.text,'key_attribute_count',i.indnkeyatts,'total_attribute_count',i.indnatts,
  'nulls_not_distinct',i.indnullsnotdistinct,'plain',i.indexprs IS NULL AND i.indpred IS NULL))
  FROM pg_catalog.pg_index i WHERE i.indrelid=c.oid) AS indexes,
 (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('constraint_oid',k.oid,'name',k.conname,'kind',k.contype,
  'columns',k.conkey,'validated',k.convalidated,'deferrable',k.condeferrable,'initially_deferred',k.condeferred,
  'index_oid',k.conindid,'referenced_table_oid',k.confrelid,'referenced_columns',k.confkey))
  FROM pg_catalog.pg_constraint k WHERE k.conrelid=c.oid) AS constraints,
 (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
  'roles',ARRAY(SELECT CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(r)::pg_catalog.text END FROM pg_catalog.unnest(p.polroles) r),
  'using_node_sha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.polqual::pg_catalog.text,'UTF8')),'hex')))
  FROM pg_catalog.pg_policy p WHERE p.polrelid=c.oid AND p.polcmd IN('r','*')) AS select_policies,
 (SELECT pg_catalog.count(*) FROM pg_catalog.pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal) AS user_trigger_count,
 pg_catalog.count(*) OVER() AS rows_total
FROM (VALUES('supabase_migrations','schema_migrations')) w(schema_name,table_name)
LEFT JOIN pg_catalog.pg_namespace n ON n.nspname=w.schema_name
LEFT JOIN pg_catalog.pg_class c ON c.relnamespace=n.oid AND c.relname=w.table_name
LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
LEFT JOIN pg_catalog.pg_type at ON at.oid=a.atttypid
LEFT JOIN pg_catalog.pg_namespace an ON an.oid=at.typnamespace
LEFT JOIN pg_catalog.pg_attribute v ON v.attrelid=c.oid AND v.attname='version' AND v.attnum>0 AND NOT v.attisdropped
LEFT JOIN pg_catalog.pg_type vt ON vt.oid=v.atttypid
LEFT JOIN pg_catalog.pg_namespace vn ON vn.oid=vt.typnamespace
ORDER BY a.attnum LIMIT 200;
```

Map index key attnums to the explicit attnum result. Required columns without a default
can block a version-only INSERT. If history is a view/foreign relation rather than the
expected ordinary table without inheritance children (relhassubclass=false), BLOCK Q14:
selecting a substituted view/foreign table or foreign inheritance child could invoke rules/functions/remote
access. If RLS filters this role, version counts do not establish complete history.
The observable-prerequisites boolean is advisory and intentionally NOT a content-read
approval. The version type is conservatively required to be native pg_catalog.text;
other built-ins/domains require separate review, not a cast. Index key/include counts
and constraints allow a version-only uniqueness assessment without conflating included
columns. Defaults/policy expressions are fingerprints only. Other columns are labeled
payload-unapproved even if current_user could read them; no history values are returned.

Q13 decision framework: verify exact target/executor; present ordinary permanent relation
with no descendants; expected native version type and full structure; effective schema
USAGE and column SELECT; assess RLS and relevant SELECT policies against approved evidence;
review uniqueness and table changes/rules. Then independently establish acceptable
version-content disclosure and stable visibility, and request explicit content approval.
Catalogs do not prove contents contain no secrets or guarantee a later query sees the
same policy/table state. Thus q14_decision remains BLOCKED even when all observable
checks are true. Do not switch roles or disable RLS to make these fields pass.

### Q14 — operational migration versions only

```sql
SELECT version,pg_catalog.count(*) AS occurrences,
 pg_catalog.sum(pg_catalog.count(*)) OVER() AS rows_total
FROM supabase_migrations.schema_migrations GROUP BY version ORDER BY version LIMIT 200;
```

BLOCKED. Q13 success does not authorize this unchanged query. Independent evidence of
correct relation/structure, authorized SELECT, sufficient visibility, acceptable version
content disclosure and explicit history-content approval are all still required.
Never select statements/name/comments. Unexpected version types require review first.
Compare total occurrences, not just distinct row count, when checking truncation.

### Q15 — effective history privileges, no lock acquisition

```sql
SELECT session_user,current_user,n.nspname,c.relname,c.oid AS table_oid,
 pg_catalog.pg_get_userbyid(c.relowner) AS owner,c.relowner=r.oid AS direct_owner,
 r.rolsuper AS executor_superuser,r.rolcreaterole AS executor_createrole,
 pg_catalog.pg_has_role(current_user,c.relowner,'USAGE') AS owner_role_usage,
 pg_catalog.has_schema_privilege(current_user,n.oid,'USAGE') AS schema_usage,
 pg_catalog.has_table_privilege(current_user,c.oid,'SELECT') AS table_select,
 pg_catalog.has_column_privilege(current_user,c.oid,a.attnum,'SELECT') AS version_select,
 pg_catalog.has_table_privilege(current_user,c.oid,'INSERT') AS table_insert,
 pg_catalog.has_column_privilege(current_user,c.oid,a.attnum,'INSERT') AS version_insert,
 pg_catalog.has_table_privilege(current_user,c.oid,'UPDATE') AS table_update,
 pg_catalog.has_table_privilege(current_user,c.oid,'DELETE') AS table_delete,
 pg_catalog.has_table_privilege(current_user,c.oid,'TRUNCATE') AS table_truncate,
 pg_catalog.has_table_privilege(current_user,c.oid,'MAINTAIN') AS table_maintain,
 pg_catalog.has_table_privilege(current_user,c.oid,'MAINTAIN WITH GRANT OPTION') AS maintain_grant_option,
 (pg_catalog.has_table_privilege(current_user,c.oid,'MAINTAIN') OR
  pg_catalog.has_table_privilege(current_user,c.oid,'UPDATE') OR
  pg_catalog.has_table_privilege(current_user,c.oid,'DELETE') OR
  pg_catalog.has_table_privilege(current_user,c.oid,'TRUNCATE')) AS strong_lock_object_privilege_evidence_only,
 pg_catalog.pg_has_role(current_user,c.relowner,'SET') AS can_set_owner
FROM (VALUES('supabase_migrations','schema_migrations')) w(schema_name,table_name)
LEFT JOIN pg_catalog.pg_namespace n ON n.nspname=w.schema_name
LEFT JOIN pg_catalog.pg_class c ON c.relnamespace=n.oid AND c.relname=w.table_name
LEFT JOIN pg_catalog.pg_roles r ON r.rolname=current_user
LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attname='version' AND NOT a.attisdropped;
```

INSERT permission is not proof that an INSERT would satisfy constraints/triggers/RLS.
Write privileges/ownership inform a future lock plan; this query takes no migration
lock and does not prove serialization. Atomically inserting history still needs a
reviewed release transaction, approval, backup and failure/recovery procedure.
PG17 permits all lock modes with MAINTAIN, UPDATE, DELETE or TRUNCATE. The named OR
field reports only that object-privilege evidence; it neither acquires a lock nor
proves availability. MAINTAIN is NOT ALTER/DROP ownership and is not CREATEROLE.
Direct ownership, owner-role USAGE and owner-role SET are distinct. Column-only version
SELECT/INSERT can differ from table-wide grants. All facts apply only to current_user.

### Q16 — declared dependency edges, not dynamic-call completeness

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

Roots include exact required relations/helpers and attached indexes/constraints/policies/
triggers/row types; relation kinds include sequences. Declared dependencies are explored
both incoming and outgoing, at most two hops, with cycle exclusion. Only listed application
namespaces/attached metadata expand further; system/extension/other-schema endpoints
are shown but not recursively expanded. Shared-role/ACL ownership edges are added for
visited objects from the current database (or shared catalog), never business records.
extension_members identifies whole-object pg_depend membership (deptype=e) referencing
pg_extension; a classid+objid anti-join excludes those objects from every expansion
candidate branch, including roots and column visits. The boundary is catalog extension
membership, not the object's schema or owner role. deptype=x (automatic extension
dependency) alone does not make an ordinary object an extension member. Visited members
retain their incoming discovery edge/root row, outgoing extension-membership label and
shared dependencies; their other declared edges are not expanded. The membership
reporting branch does not add traversal nodes or bypass the depth limit.
pg_identify_object is a built-in metadata identification function: it supplies quoted,
schema-qualified identities, including overloaded function arguments, without invoking
the identified function. Roles can be named through shared addresses without selecting
pg_authid/password fields. Extension membership is visible as dependency_type=e to the
extension endpoint, not as an assumption that every function is user-owned.

hop is distance from the root set, not proof of a unique business call path. Shared
and extension-membership edges can be one hop beyond the declared-hop limit; objects beyond the application
expansion boundary, max depth or output cap are unresolved. complete_dependency_closure
is always false. Dynamic SQL, some string-body function references, external code/files,
provider/event-trigger behavior and shared references to unvisited objects are not
complete. No returned edge (or no rows) must be interpreted as absence of dependencies.
LIMIT bounds output, not recursive planner work; existing platform timeout/authorized
scope controls remain necessary. Unexpected graph growth requires narrower re-review.

## Coverage, limitations and approval

| Evidence category | Queries | What remains unproven |
|---|---|---|
| executor/role creation/ownership | Q01,Q02,Q03,Q05,Q08 | authority over a not-yet-created role; exact temporary membership/grantor recipe |
| schemas/tables/sequences/functions/types/audit | Q02–Q06,Q09,Q10 | source semantics for unknown hashes; provider DDL restrictions/event triggers |
| explicit/effective privileges | Q02–Q08,Q15 | absent future role's capabilities; final new-object ACLs/default effects |
| defaults | Q07 | actual final ACL after creation/ownership transfer; no retroactive inference |
| collisions/dependencies/extensions | Q09,Q11,Q12,Q16 | out-of-schema business duplicates, dynamic references, callable-overload ambiguity |
| history/atomicity/serialization | Q13–Q15 | future transaction implementation, history lock, duplicate guard and rollback behavior |

Interpret results only as timestamped metadata evidence for the independently bound
project/executor. No aggregate READY flag is produced. Missing expected rows, NULL
capability checks, truncation, malformed structure, unexpected owners/grants/defaults,
collisions or unknown helper/predicate semantics leave the relevant item BLOCKED.
Q14 is BLOCKED pending independent prerequisite evidence and explicit content approval;
later metadata probes must not be run
against substituted views/foreign tables. No query needs a role switch or privilege
grant to run; lack of existing access is itself missing evidence.

Remaining NO-GO items from the readiness assessment are preserved: non-superuser owner
creation/SET/grantor path; exact ACL allowlists and default handling; exact-signature
ownership loop; release preconditions/concurrency lock/history INSERT in one reviewed
transaction; preservation of unrelated privileges/policies; target binding and recovery
approval; limited local JWT/provider simulation; explicit technical-policy acceptance.
The cluster system identifier is not established by this package. Local 20/20 success
is not evidence to bypass these requirements.

Before any execution obtain explicit approval for this SELECT-only package, selected
Production project, intended executor, output custody, platform timeouts and Q14's
prerequisite. Do not execute the old transaction-wrapped block. No deployment, mutation,
role switch, migration preparation or activation is authorized by catalog approval.
Next safe step: independent review of this package, then separately authorize Q01–Q13,
Q15–Q16; consider separate Q14 authorization only after independently establishing
identity, structure, SELECT access, sufficient visibility and acceptable disclosure risk.

Offline validation: SQL parsed without a database using the installed PostgreSQL 18
parser (syntax only, not PG17 runtime proof); PG17 catalog/ACL semantics reviewed against
official documentation. All statements must be SELECT/CTE SELECT, built-in calls only.
Relative documentation links and whitespace checked. No SQL or PostgreSQL was executed.

References: PostgreSQL 17 `catalog-pg-auth-members`, `catalog-pg-default-acl`,
`functions-info`, `catalog-pg-index`, `catalog-pg-attribute` documentation.
