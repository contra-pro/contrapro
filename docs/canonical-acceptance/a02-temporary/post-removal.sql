-- Independent, separately authorized Development read-only verification; no RPC call.
\set ON_ERROR_STOP on
\set VERBOSITY terse
\pset pager off
BEGIN READ ONLY;
SET LOCAL search_path=pg_catalog;
SET LOCAL statement_timeout='5000ms';
SET LOCAL lock_timeout='2000ms';
SELECT current_database()='postgres' AND session_user='postgres' AND current_user='postgres'
 AND to_regprocedure('public.contratpro_a02_fixture_provision()') IS NULL
 AND NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='contratpro_a02_fixture_provision')
 AND NOT has_function_privilege('authenticated','public.contratpro_provision_identity()','EXECUTE')
 AND NOT pg_has_role('authenticated','contratpro_identity_writer','SET')
 AND NOT pg_has_role('postgres','contratpro_identity_writer','SET')
 AND NOT has_schema_privilege('contratpro_identity_writer','public','CREATE')
 AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='contratpro_identity_writer'
   AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolinherit OR rolcreatedb OR rolcreaterole OR rolreplication))
 AS removal_ok
\gset
\if :removal_ok
\echo A02_REMOVAL_CHECK_PASSED: no wrapper, original provisioning denied, writer boundary preserved
\else
ROLLBACK;
SELECT 1/0 AS removal_blocked;
\endif
ROLLBACK;
