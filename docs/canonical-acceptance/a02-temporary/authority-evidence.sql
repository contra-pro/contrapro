-- PREPARATION ONLY. Separate authorization + verified Development verify-full connection.
-- Metadata only; no function invocation, role change, Auth rows or secrets.
\set ON_ERROR_STOP on
\set VERBOSITY terse
\pset pager off
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path=pg_catalog;
SET LOCAL statement_timeout='5000ms';
SET LOCAL lock_timeout='2000ms';
SET LOCAL idle_in_transaction_session_timeout='10000ms';
SELECT current_database()='postgres' AND session_user='postgres' AND current_user='postgres'
 AND current_setting('server_version_num')::integer BETWEEN 170000 AND 179999
 AND current_setting('transaction_read_only')='on' AND NOT pg_is_in_recovery()
 AND to_regprocedure('public.contratpro_provision_identity()') IS NOT NULL
 AND to_regprocedure('app_private.provisioning_subject()') IS NOT NULL
 AND to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
 AS evidence_guard_ok
\gset
\if :evidence_guard_ok
\else
ROLLBACK;
SELECT 1/0 AS evidence_blocked;
\endif

SELECT count(*)<=11 AS native_history_within_cohort_bound FROM supabase_migrations.schema_migrations;
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version LIMIT 12;

SELECT transaction_timestamp() AS evidence_at,
 EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid='contratpro_identity_writer'::regrole
   AND member='postgres'::regrole AND admin_option AND NOT inherit_option AND NOT set_option) AS postgres_admin_only_membership,
 NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid='contratpro_identity_writer'::regrole
   AND member='postgres'::regrole AND grantor='postgres'::regrole) AS temporary_self_grant_absent,
 NOT pg_has_role('postgres','contratpro_identity_writer','SET') AS postgres_cannot_currently_set_writer,
 has_schema_privilege('postgres','public','CREATE WITH GRANT OPTION') AS postgres_can_delegate_public_create,
 has_schema_privilege('postgres','public','USAGE') AS postgres_public_usage,
 NOT has_schema_privilege('contratpro_identity_writer','public','CREATE') AS writer_create_absent,
 EXISTS(SELECT 1 FROM pg_roles WHERE rolname='contratpro_identity_writer' AND NOT
   (rolcanlogin OR rolsuper OR rolbypassrls OR rolinherit OR rolcreatedb OR rolcreaterole OR rolreplication)) AS writer_restricted;

SELECT p.proname,pg_get_userbyid(p.proowner) AS owner,p.prosecdef,
 p.proconfig @> ARRAY['search_path=pg_catalog','row_security=on'] AS fixed_settings_present,
 cardinality(p.proconfig) AS setting_count,
 has_function_privilege('contratpro_identity_writer',p.oid,'EXECUTE') AS writer_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
 md5(pg_get_functiondef(p.oid)) AS definition_fingerprint
FROM pg_proc p WHERE p.oid IN (to_regprocedure('public.contratpro_provision_identity()'),
 to_regprocedure('app_private.provisioning_subject()'),to_regprocedure('public.contratpro_a02_fixture_provision()'))
ORDER BY p.proname;
SELECT p.proname,acl.grantee AS grantee_oid,acl.privilege_type,acl.is_grantable
FROM pg_proc p,LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) acl
WHERE p.oid IN (to_regprocedure('public.contratpro_provision_identity()'),
 to_regprocedure('app_private.provisioning_subject()'),to_regprocedure('public.contratpro_a02_fixture_provision()'))
ORDER BY p.proname,acl.grantee;
SELECT c.relname,a.attname,acl.privilege_type,acl.is_grantable
FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid,
 LATERAL aclexplode(a.attacl) acl
WHERE c.oid IN ('identity.users'::regclass,'identity.supabase_users'::regclass)
 AND acl.grantee='contratpro_identity_writer'::regrole ORDER BY c.relname,a.attname,acl.privilege_type;
SELECT polname,polcmd,md5(COALESCE(pg_get_expr(polqual,polrelid),'')||'|'||COALESCE(pg_get_expr(polwithcheck,polrelid),'')) AS predicate_fingerprint
FROM pg_policy WHERE polrelid IN ('identity.users'::regclass,'identity.supabase_users'::regclass)
 AND 'contratpro_identity_writer'::regrole=ANY(polroles) ORDER BY polrelid,polname;

SELECT n.nspname AS schema_name,c.relname AS table_name,c.relrowsecurity,c.relforcerowsecurity,
 pg_get_userbyid(c.relowner) AS owner,
 has_table_privilege(current_user,c.oid,'SELECT') AS observer_select,
 has_table_privilege(current_user,c.oid,'DELETE') AS administrative_delete
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.oid IN ('identity.users'::regclass,'identity.supabase_users'::regclass,
 'tenancy.memberships'::regclass,'tenancy.agencies'::regclass,'tenancy.clients'::regclass,'auth.users'::regclass)
ORDER BY n.nspname,c.relname;
SELECT rolsuper OR rolbypassrls AS administrative_cleanup_bypasses_rls FROM pg_roles WHERE rolname=current_user;

-- Bounded hook inventory: count >16 blocks completeness, never silently truncate proof.
-- Fingerprints are metadata, NOT a review of function behavior or a security signature.
SELECT count(*)<=16 AS hook_inventory_within_bound FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='auth' AND NOT t.tgisinternal;
SELECT c.relname AS auth_table,t.tgname AS trigger_name,t.tgenabled,t.tgtype,
 p.oid::regprocedure AS handler,pg_get_userbyid(p.proowner) AS owner,
 md5(pg_get_functiondef(p.oid)) AS definition_fingerprint
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_proc p ON p.oid=t.tgfoid WHERE n.nspname='auth' AND NOT t.tgisinternal
ORDER BY c.relname,t.tgname LIMIT 16;
SELECT count(*)<=16 AS auth_rule_inventory_within_bound FROM pg_rewrite r JOIN pg_class c ON c.oid=r.ev_class
 JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='auth' AND r.ev_type<>'1';
SELECT c.relname AS auth_table,r.rulename,r.ev_type,md5(pg_get_ruledef(r.oid)) AS definition_fingerprint
FROM pg_rewrite r JOIN pg_class c ON c.oid=r.ev_class JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='auth' AND r.ev_type<>'1' ORDER BY c.relname,r.rulename LIMIT 16;
SELECT count(*)<=16 AS event_trigger_inventory_within_bound FROM pg_event_trigger WHERE evtenabled<>'D';
SELECT evtname,evtevent,evtenabled,evtfoid::regprocedure AS handler,md5(pg_get_functiondef(evtfoid)) AS definition_fingerprint
FROM pg_event_trigger WHERE evtenabled<>'D' ORDER BY evtname LIMIT 16;
ROLLBACK;
\echo METADATA_CAPTURED_MANUAL_AUTHORITY_AND_HOOK_REVIEW_REQUIRED
