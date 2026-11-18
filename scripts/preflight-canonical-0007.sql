-- PREPARATION ONLY. Run manually with psql 17; never feeds the migration runner.
-- Catalog/history reads only. SET LOCAL changes transaction configuration, not data.
-- A failed guard rolls back, then raises SQLSTATE 22012 with a constant SELECT.
-- With ON_ERROR_STOP and psql 17 -f, that SQL error terminates with exit status 3.
-- Exit 0 means only automated checks passed; manual predicate review is mandatory.
\set ON_ERROR_STOP on
\set VERBOSITY terse
\pset pager off
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path = pg_catalog;
SET LOCAL statement_timeout = '5000ms';
SET LOCAL lock_timeout = '2000ms';
SET LOCAL idle_in_transaction_session_timeout = '10000ms';

SELECT current_database()='postgres' AND session_user='postgres' AND current_user='postgres'
 AND current_setting('server_version_num')::integer BETWEEN 170000 AND 179999
 AND NOT pg_is_in_recovery() AND current_setting('transaction_read_only')='on'
 AND current_setting('statement_timeout')::interval=interval '5 seconds'
 AND current_setting('lock_timeout')::interval=interval '2 seconds'
 AND current_setting('idle_in_transaction_session_timeout')::interval=interval '10 seconds' AS identity_ok
\gset
\if :identity_ok
\echo CHECK_OK: SQL identity, PostgreSQL 17, non-recovery and read-only limits; frontend TLS is enforced by libpq
\else
\echo BLOCKED: identity or transaction safeguards
ROLLBACK;
SELECT 1 / 0 AS preflight_blocked;
\endif
SELECT pg_backend_pid() AS initial_backend
\gset

SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
 AND to_regclass('identity.users') IS NOT NULL AND to_regclass('identity.supabase_users') IS NOT NULL
 AND to_regclass('auth.users') IS NOT NULL
 AND (SELECT count(*) FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','authenticator','service_role',
   'contratpro_runtime','contratpro_platform_runtime','contratpro_agency_writer'))=8
 AND (SELECT count(*) FROM pg_namespace WHERE nspname IN ('identity','app_private','auth','public'))=4 AS dependencies_ok
\gset
\if :dependencies_ok
\echo CHECK_OK: required relations, schemas and existing roles
\else
\echo BLOCKED: missing dependency
ROLLBACK;
SELECT 1 / 0 AS preflight_blocked;
\endif

-- No bridge invocation. ABSENT is expected before deployment; NULL checks are unverified.
-- If an object exists, show bounded security facts before the collision guard blocks it.
SELECT CASE WHEN p.oid IS NULL THEN 'ABSENT_EXPECTED_PREDEPLOYMENT' ELSE 'EXISTING_OBJECT_REQUIRES_REVIEW' END AS bridge_state,
 pg_get_userbyid(p.proowner) AS bridge_owner,
 CASE WHEN p.oid IS NULL THEN NULL ELSE p.proowner='postgres'::regrole END AS owner_ok,
 CASE WHEN p.oid IS NULL THEN NULL ELSE p.prokind='f' AND p.pronargs=0 AND p.prorettype='uuid'::regtype END AS signature_ok,
 CASE WHEN p.oid IS NULL THEN NULL ELSE p.prosecdef AND p.provolatile='v'
   AND cardinality(COALESCE(p.proconfig,'{}'::text[]))=2
   AND COALESCE(p.proconfig,'{}'::text[]) @> ARRAY['search_path=pg_catalog','row_security=on'] END AS settings_ok,
 CASE WHEN p.oid IS NULL THEN NULL ELSE NOT EXISTS(
   SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) acl WHERE acl.grantee<>p.proowner
   AND (acl.grantee IS DISTINCT FROM to_regrole('contratpro_identity_writer')::oid OR acl.privilege_type<>'EXECUTE' OR acl.is_grantable)) END AS acl_boundary_ok,
 CASE WHEN p.oid IS NULL OR to_regrole('contratpro_identity_writer') IS NULL THEN NULL
   ELSE has_function_privilege(to_regrole('contratpro_identity_writer')::oid,p.oid,'EXECUTE') END AS capability_execute,
 CASE WHEN p.oid IS NULL THEN NULL ELSE NOT EXISTS(SELECT 1 FROM pg_roles r
   WHERE r.rolname IN ('anon','authenticated','authenticator','service_role','contratpro_runtime','contratpro_platform_runtime','contratpro_agency_writer')
   AND has_function_privilege(r.oid,p.oid,'EXECUTE')) END AS ordinary_callers_denied
FROM (VALUES ('app_private.provisioning_subject()')) expected(signature)
LEFT JOIN pg_proc p ON p.oid=to_regprocedure(expected.signature);

SELECT NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated' AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls))
 AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticator'
   AND (NOT rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls))
 AND pg_has_role('authenticator','authenticated','SET')
 AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('contratpro_runtime','contratpro_platform_runtime','contratpro_agency_writer')
   AND (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit OR rolreplication OR rolbypassrls))
 AND NOT EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member
   WHERE r.rolname IN ('contratpro_runtime','contratpro_platform_runtime','contratpro_agency_writer'))
 AND NOT EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid
   WHERE r.rolname IN ('contratpro_runtime','contratpro_platform_runtime','contratpro_agency_writer')
   AND (m.member<>'postgres'::regrole OR NOT m.admin_option OR m.inherit_option OR m.set_option)) AS role_baseline_ok
\gset
\if :role_baseline_ok
\echo CHECK_OK: existing authenticated/runtime/capability role restrictions and administrative membership boundaries
\else
\echo BLOCKED: role attribute or membership drift
ROLLBACK;
SELECT 1 / 0 AS preflight_blocked;
\endif

SELECT COALESCE((SELECT array_agg(version ORDER BY version) FROM
 (SELECT version::text FROM supabase_migrations.schema_migrations ORDER BY version LIMIT 8) h)
 =ARRAY['20261115000000','20261115000100','20261115000200','20261115000300',
        '20261115000400','20261115000500','20261115000600'],false) AS history_ok
\gset
\if :history_ok
\echo CHECK_OK: exact native versions 0000-0006; 0007 absent
\else
\echo BLOCKED: unexpected or incomplete native history
ROLLBACK;
SELECT 1 / 0 AS preflight_blocked;
\endif

SELECT NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='contratpro_identity_writer')
 AND NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='contratpro_provision_identity')
 AND NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='app_private' AND p.proname='provisioning_subject')
 AND NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid IN ('identity.users'::regclass,'identity.supabase_users'::regclass)
   AND polname IN ('identity_writer_mapping_read','identity_writer_user_read','identity_writer_user_create','identity_writer_mapping_create')) AS collisions_ok
\gset
\if :collisions_ok
\echo CHECK_OK: new role, all provisioning/bridge overloads, and all four exact policy names absent
\else
\echo BLOCKED: exact object collision
ROLLBACK;
SELECT 1 / 0 AS preflight_blocked;
\endif

WITH expected(rel,col,typ,nn,def) AS (VALUES
 ('identity.users','id','uuid',true,'gen_random_uuid()'),
 ('identity.users','state','text',true,'''disabled''::text'),
 ('identity.users','created_at','timestamp with time zone',true,'now()'),
 ('identity.supabase_users','supabase_user_id','uuid',true,NULL),
 ('identity.supabase_users','user_id','uuid',true,NULL),
 ('identity.supabase_users','created_at','timestamp with time zone',true,'now()')),
actual AS (
 SELECT a.attrelid,a.attname,format_type(a.atttypid,a.atttypmod) AS typ,a.attnotnull AS nn,
   pg_get_expr(d.adbin,d.adrelid) AS def,a.attidentity,a.attgenerated
 FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
 WHERE a.attrelid IN ('identity.users'::regclass,'identity.supabase_users'::regclass) AND a.attnum>0 AND NOT a.attisdropped)
SELECT (SELECT count(*) FROM actual)=6
 AND NOT EXISTS(SELECT 1 FROM expected e LEFT JOIN actual a ON a.attrelid=to_regclass(e.rel) AND a.attname=e.col
   WHERE a.attname IS NULL OR a.typ<>e.typ OR a.nn<>e.nn OR a.def IS DISTINCT FROM e.def OR a.attidentity<>'' OR a.attgenerated<>'')
 AND (SELECT count(*) FROM pg_class WHERE oid IN ('identity.users'::regclass,'identity.supabase_users'::regclass)
   AND relkind='r' AND relowner='postgres'::regrole AND relrowsecurity AND relforcerowsecurity)=2 AS tables_ok
\gset
\if :tables_ok
\echo CHECK_OK: exact identity columns, types, nullability, defaults, owners and FORCE RLS; no sequences required
\else
\echo BLOCKED: identity table or column drift
ROLLBACK;
SELECT 1 / 0 AS preflight_blocked;
\endif

WITH expected(rel,name,definition) AS (VALUES
 ('identity.users','users_pkey','PRIMARY KEY (id)'),
 ('identity.users','users_state_check',$expected$CHECK ((state = ANY (ARRAY['active'::text, 'disabled'::text])))$expected$),
 ('identity.supabase_users','supabase_users_pkey','PRIMARY KEY (supabase_user_id)'),
 ('identity.supabase_users','supabase_users_user_id_key','UNIQUE (user_id)'),
 ('identity.supabase_users','supabase_users_supabase_user_id_fkey','FOREIGN KEY (supabase_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT'),
 ('identity.supabase_users','supabase_users_user_id_fkey','FOREIGN KEY (user_id) REFERENCES identity.users(id) ON DELETE RESTRICT'))
SELECT (SELECT count(*) FROM pg_constraint WHERE conrelid IN ('identity.users'::regclass,'identity.supabase_users'::regclass))=6
 AND NOT EXISTS(SELECT 1 FROM expected e LEFT JOIN pg_constraint c ON c.conrelid=to_regclass(e.rel) AND c.conname=e.name
   WHERE c.oid IS NULL OR NOT c.convalidated OR c.condeferrable OR c.condeferred
     OR pg_get_constraintdef(c.oid)<>e.definition)
 AND (SELECT count(*) FROM pg_index WHERE indrelid IN ('identity.users'::regclass,'identity.supabase_users'::regclass))=3
 AND NOT EXISTS(SELECT 1 FROM pg_index WHERE indrelid IN ('identity.users'::regclass,'identity.supabase_users'::regclass)
   AND (NOT indisvalid OR NOT indisready OR NOT indisunique OR NOT indimmediate))
 AND NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid IN ('identity.users'::regclass,'identity.supabase_users'::regclass) AND NOT tgisinternal)
 AND NOT EXISTS(SELECT 1 FROM pg_rewrite WHERE ev_class IN ('identity.users'::regclass,'identity.supabase_users'::regclass)) AS constraints_ok
\gset
\if :constraints_ok
\echo CHECK_OK: exact key/check/FK constraints, indexes, no extra user triggers or rules
\else
\echo BLOCKED: constraint, index, trigger or rule drift; catalog formatting differences require review, not bypass
ROLLBACK;
SELECT 1 / 0 AS preflight_blocked;
\endif

-- Existing policies include writer_user and writer_mapping: do not search only for 'provision'.
WITH expected(rel,name,role_name) AS (VALUES
 ('identity.users','users_self_read','contratpro_runtime'),
 ('identity.users','supabase_canonical_self_read','authenticated'),
 ('identity.users','writer_user','contratpro_agency_writer'),
 ('identity.supabase_users','supabase_mapping_self_read','authenticated'),
 ('identity.supabase_users','writer_mapping','contratpro_agency_writer'))
SELECT (SELECT count(*) FROM pg_policy WHERE polrelid IN ('identity.users'::regclass,'identity.supabase_users'::regclass))=5
 AND NOT EXISTS(SELECT 1 FROM expected e LEFT JOIN pg_policy p ON p.polrelid=to_regclass(e.rel) AND p.polname=e.name
   WHERE p.oid IS NULL OR p.polcmd<>'r' OR NOT p.polpermissive OR p.polroles<>ARRAY[to_regrole(e.role_name)::oid]
     OR p.polqual IS NULL OR p.polwithcheck IS NOT NULL OR length(pg_get_expr(p.polqual,p.polrelid))>2048) AS policies_ok
\gset
\if :policies_ok
\echo CHECK_OK: exact existing policy names, targets, SELECT-only commands and bounded definitions
\else
\echo BLOCKED: unexpected existing policy structure or oversized predicate
ROLLBACK;
SELECT 1 / 0 AS preflight_blocked;
\endif

-- MANUAL gate: compare all five complete predicates against 0003, 0004 and 0005.
-- users_self_read: id=context_uuid('contratpro.user_id') AND state='active'.
-- supabase_canonical_self_read / writer_user: id belongs to the current auth.uid() mapping.
-- supabase_mapping_self_read / writer_mapping: supabase_user_id=auth.uid().
SELECT n.nspname AS schema_name,c.relname AS table_name,p.polname,
 pg_get_expr(p.polqual,p.polrelid) AS predicate
FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE p.polrelid IN ('identity.users'::regclass,'identity.supabase_users'::regclass)
ORDER BY n.nspname,c.relname,p.polname LIMIT 6;

SELECT NOT EXISTS(
 SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a
 WHERE c.oid IN ('identity.users'::regclass,'identity.supabase_users'::regclass) AND a.grantee<>c.relowner
 AND NOT(c.oid='identity.users'::regclass AND a.grantee='contratpro_runtime'::regrole AND a.privilege_type='SELECT' AND NOT a.is_grantable))
 AND NOT EXISTS(
 SELECT 1 FROM pg_attribute col CROSS JOIN LATERAL aclexplode(col.attacl) a
 WHERE col.attrelid IN ('identity.users'::regclass,'identity.supabase_users'::regclass)
 AND NOT(a.grantee IN ('authenticated'::regrole,'contratpro_agency_writer'::regrole) AND a.privilege_type='SELECT' AND NOT a.is_grantable
   AND ((col.attrelid='identity.users'::regclass AND col.attname IN ('id','state'))
     OR (col.attrelid='identity.supabase_users'::regclass AND col.attname IN ('supabase_user_id','user_id')))))
 AND NOT EXISTS(
 SELECT 1 FROM pg_attribute col CROSS JOIN (VALUES ('authenticated'),('contratpro_agency_writer')) r(name)
 WHERE col.attrelid IN ('identity.users'::regclass,'identity.supabase_users'::regclass)
 AND col.attname IN ('id','state','supabase_user_id','user_id') AND col.attnum>0 AND NOT col.attisdropped
 AND NOT has_column_privilege(r.name,col.attrelid,col.attnum,'SELECT'))
 AND NOT EXISTS(
 SELECT 1 FROM (VALUES ('authenticated'),('anon'),('service_role'),('contratpro_runtime'),('contratpro_platform_runtime'),('contratpro_agency_writer')) r(name)
 CROSS JOIN (VALUES ('identity.users'),('identity.supabase_users')) t(name)
 WHERE has_table_privilege(r.name,t.name,'INSERT') OR has_table_privilege(r.name,t.name,'UPDATE') OR has_table_privilege(r.name,t.name,'DELETE')) AS existing_acl_ok
\gset
\if :existing_acl_ok
\echo CHECK_OK: expected direct identity ACLs, required existing column reads, no effective table-level writes
\else
\echo BLOCKED: existing identity ACL drift
ROLLBACK;
SELECT 1 / 0 AS preflight_blocked;
\endif

SELECT (SELECT rolcreaterole FROM pg_roles WHERE rolname=current_user)
 AND COALESCE(current_setting('createrole_self_grant',true),'')=''
  AND NOT EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname='identity' AND n.nspowner<>'postgres'::regrole)
  AND NOT EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname='app_private' AND n.nspowner<>'postgres'::regrole)
  -- public may retain PostgreSQL's database-owner role; no ownership changes needed.
  AND EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname='public'
    AND (n.nspowner='postgres'::regrole OR (
      n.nspowner='pg_database_owner'::regrole
      AND EXISTS(SELECT 1 FROM pg_database d WHERE d.datname=current_database() AND d.datdba='postgres'::regrole)
      AND pg_has_role('postgres','pg_database_owner','USAGE')
      AND pg_has_role('postgres','pg_database_owner','MEMBER'))))
 AND NOT EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname IN ('identity','app_private','public')
   AND NOT has_schema_privilege('postgres',n.oid,'USAGE WITH GRANT OPTION'))
 AND has_schema_privilege('postgres','auth','USAGE')
 AND has_schema_privilege('postgres','app_private','CREATE')
 AND has_schema_privilege('postgres','public','CREATE WITH GRANT OPTION')
 AND has_language_privilege('postgres','plpgsql','USAGE')
 AND NOT EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid IN ('identity.users'::regclass,'identity.supabase_users'::regclass)
   AND a.attnum>0 AND NOT a.attisdropped AND a.attname IN ('id','state','supabase_user_id','user_id')
   AND (NOT has_column_privilege('postgres',a.attrelid,a.attnum,'SELECT WITH GRANT OPTION')
     OR NOT has_column_privilege('postgres',a.attrelid,a.attnum,'INSERT WITH GRANT OPTION')))
 AND (SELECT count(*) FROM pg_proc p WHERE p.oid IN (to_regprocedure('auth.uid()'),to_regprocedure('auth.role()'),to_regprocedure('auth.jwt()'))
   AND p.prokind='f' AND p.pronargs=0
   AND p.prorettype=CASE p.proname WHEN 'uid' THEN 'uuid'::regtype WHEN 'role' THEN 'text'::regtype ELSE 'jsonb'::regtype END
    AND has_function_privilege('postgres',p.oid,'EXECUTE')
    AND EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) helper_acl
      WHERE helper_acl.grantee=0 AND helper_acl.privilege_type='EXECUTE'))=3 AS authority_ok
\gset
\if :authority_ok
\echo CHECK_OK: catalog prerequisites for CREATE ROLE, local schema/column delegation, bridge-owner auth access and ownership transfer
\else
\echo BLOCKED: executor grant authority, bridge-owner dependencies, language or creator-membership setting
ROLLBACK;
SELECT 1 / 0 AS preflight_blocked;
\endif

-- Default function ACLs for the actual creator, global AND public scoped.
SELECT NOT EXISTS(SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
 WHERE d.defaclrole='postgres'::regrole AND d.defaclobjtype='f'
 AND (d.defaclnamespace=0 OR d.defaclnamespace IN (SELECT oid FROM pg_namespace WHERE nspname IN ('public','app_private')))
 AND a.grantee NOT IN (0,'postgres'::regrole,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole,
   'contratpro_runtime'::regrole,'contratpro_platform_runtime'::regrole,'contratpro_agency_writer'::regrole)) AS defaults_ok
\gset
\if :defaults_ok
\echo CHECK_OK: no known unrevoked grantee in creator global/public function defaults
\else
\echo BLOCKED: new function would inherit an ACL not removed by migration 0007
ROLLBACK;
SELECT 1 / 0 AS preflight_blocked;
\endif

SELECT current_database()='postgres' AND session_user='postgres' AND current_user='postgres'
 AND current_setting('transaction_read_only')='on' AND NOT pg_is_in_recovery()
 AND pg_backend_pid()=:initial_backend AS final_ok
\gset
ROLLBACK;
\if :final_ok
\echo AUTOMATED_CHECKS_PASSED_MANUAL_REVIEW_REQUIRED
\echo Compare all five policy predicates separately; full preflight PASS and deployment are NOT established
\else
\echo BLOCKED: final safeguards
SELECT 1 / 0 AS preflight_blocked;
\endif
