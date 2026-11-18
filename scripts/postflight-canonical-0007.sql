-- PREPARATION ONLY: manual psql 17 evidence collection after separate authorization.
-- Reads catalogs/native history only; never invokes provisioning or reads user rows.
-- Exact target and frontend verify-full TLS must be enforced by the operator.
-- Exit 0 is NOT a full security PASS: complete manual source/ACL comparison is required.
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
 AND NOT pg_is_in_recovery() AND current_setting('transaction_read_only')='on' AS identity_ok
\gset
\if :identity_ok
\echo IDENTITY_CHECK_PASSED_NOT_PROJECT_PROOF
\else
ROLLBACK;
SELECT 1 / 0 AS postflight_blocked;
\endif

SELECT current_database(), (SELECT oid FROM pg_database WHERE datname=current_database()) AS database_oid,
 session_user, current_user, inet_server_addr(), inet_server_port(), pg_backend_pid();

SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
 AND to_regclass('identity.users') IS NOT NULL
 AND to_regclass('identity.supabase_users') IS NOT NULL
 AND to_regrole('contratpro_identity_writer') IS NOT NULL
 AND to_regprocedure('public.contratpro_provision_identity()') IS NOT NULL
 AND to_regprocedure('app_private.provisioning_subject()') IS NOT NULL
 AND (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE (n.nspname='public' AND p.proname='contratpro_provision_identity')
   OR (n.nspname='app_private' AND p.proname='provisioning_subject'))=2 AS objects_present
\gset
\if :objects_present
\echo REQUIRED_OBJECTS_PRESENT_MANUAL_DEFINITION_REVIEW_REQUIRED
\else
ROLLBACK;
SELECT 1 / 0 AS postflight_blocked;
\endif

SELECT COALESCE((SELECT array_agg(version::text ORDER BY version)
 FROM supabase_migrations.schema_migrations)=ARRAY[
 '20261115000000','20261115000100','20261115000200','20261115000300',
 '20261115000400','20261115000500','20261115000600','20261116000700'],false) AS exact_history_ok;
SELECT version, name, cardinality(statements) AS recorded_statement_count
 FROM supabase_migrations.schema_migrations ORDER BY version LIMIT 9;

SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole,
 rolinherit, rolreplication, rolbypassrls
 FROM pg_roles WHERE rolname='contratpro_identity_writer';
SELECT parent.rolname AS parent, member.rolname AS member, grantor.rolname AS grantor,
 m.admin_option, m.inherit_option, m.set_option
 FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid
 JOIN pg_roles member ON member.oid=m.member JOIN pg_roles grantor ON grantor.oid=m.grantor
 WHERE m.roleid='contratpro_identity_writer'::regrole
 OR m.member='contratpro_identity_writer'::regrole ORDER BY parent.rolname,member.rolname;
SELECT rolname, pg_has_role(oid,'contratpro_identity_writer','SET') AS can_set_writer
 FROM pg_roles WHERE rolname IN ('anon','authenticated','authenticator','service_role',
 'contratpro_runtime','contratpro_platform_runtime','contratpro_agency_writer');

SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS arguments,
 pg_get_userbyid(p.proowner) AS owner, p.prokind, p.prosecdef, p.provolatile,
 p.proconfig, pg_get_function_result(p.oid) AS result,
 pg_get_functiondef(p.oid) AS definition
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE (n.nspname='public' AND p.proname='contratpro_provision_identity')
 OR (n.nspname='app_private' AND p.proname='provisioning_subject')
 ORDER BY n.nspname,p.proname,p.oid LIMIT 10;
SELECT p.oid::regprocedure AS function, a.grantor::regrole AS grantor,
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
 a.privilege_type, a.is_grantable
 FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
 WHERE p.oid IN ('public.contratpro_provision_identity()'::regprocedure,
 'app_private.provisioning_subject()'::regprocedure)
 ORDER BY p.oid,a.grantee;
SELECT rolname,
 has_function_privilege(oid,'public.contratpro_provision_identity()','EXECUTE') AS rpc_execute,
 has_function_privilege(oid,'app_private.provisioning_subject()','EXECUTE') AS bridge_execute,
 has_schema_privilege(oid,'public','CREATE') AS public_create
 FROM pg_roles WHERE rolname IN ('anon','authenticated','authenticator','service_role',
 'contratpro_runtime','contratpro_platform_runtime','contratpro_agency_writer','contratpro_identity_writer')
 ORDER BY rolname;

SELECT oid::regclass AS relation, pg_get_userbyid(relowner) AS owner,
 relrowsecurity, relforcerowsecurity
 FROM pg_class WHERE oid IN ('identity.users'::regclass,'identity.supabase_users'::regclass);
SELECT polrelid::regclass AS relation, polname, polcmd, polpermissive,
 ARRAY(SELECT pg_get_userbyid(r) FROM unnest(polroles) r) AS roles,
 pg_get_expr(polqual,polrelid) AS using_predicate,
 pg_get_expr(polwithcheck,polrelid) AS check_predicate
 FROM pg_policy WHERE polrelid IN ('identity.users'::regclass,'identity.supabase_users'::regclass)
 ORDER BY polrelid,polname LIMIT 20;
SELECT count(*)=9 AS exact_identity_policy_count_ok FROM pg_policy
 WHERE polrelid IN ('identity.users'::regclass,'identity.supabase_users'::regclass);
-- Complete writer ACL inventory, including any unexpected business-table access.
SELECT c.oid::regclass AS relation, a.privilege_type, a.is_grantable
 FROM pg_class c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('identity','tenancy','platform','migration_control')
 AND a.grantee='contratpro_identity_writer'::regrole ORDER BY c.oid,a.privilege_type;
SELECT c.attrelid::regclass AS relation,c.attname,a.privilege_type,a.is_grantable
 FROM pg_attribute c CROSS JOIN LATERAL aclexplode(c.attacl) a
 WHERE a.grantee='contratpro_identity_writer'::regrole
 ORDER BY c.attrelid,c.attname,a.privilege_type;
SELECT n.nspname,a.privilege_type,a.is_grantable
 FROM pg_namespace n CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a
 WHERE a.grantee='contratpro_identity_writer'::regrole ORDER BY n.nspname,a.privilege_type;
-- Effective ordinary-role writes must remain false at both table and column levels.
SELECT r.rolname,c.oid::regclass AS relation,
 has_table_privilege(r.oid,c.oid,'INSERT') OR has_table_privilege(r.oid,c.oid,'UPDATE')
 OR has_table_privilege(r.oid,c.oid,'DELETE') AS table_write,
 EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
   AND (has_column_privilege(r.oid,c.oid,a.attnum,'INSERT')
     OR has_column_privilege(r.oid,c.oid,a.attnum,'UPDATE'))) AS column_write
 FROM pg_roles r CROSS JOIN pg_class c
 WHERE r.rolname IN ('anon','authenticated','service_role','contratpro_runtime',
   'contratpro_platform_runtime','contratpro_agency_writer')
 AND c.oid IN ('identity.users'::regclass,'identity.supabase_users'::regclass)
 ORDER BY r.rolname,c.oid;

ROLLBACK;
\echo EVIDENCE_COLLECTED_MANUAL_REVIEW_REQUIRED_NOT_ACTIVATION_APPROVAL
