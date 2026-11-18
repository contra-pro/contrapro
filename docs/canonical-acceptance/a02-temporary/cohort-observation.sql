-- OFFLINE PREPARATION. Separate Development-only read authorization required.
-- Private capture: canonical UUIDs are required by confirmMapping, never public logs.
\set ON_ERROR_STOP on
\set VERBOSITY terse
\set ECHO none
\pset pager off
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path=pg_catalog;
SET LOCAL statement_timeout='5000ms';
SET LOCAL lock_timeout='2000ms';
SET LOCAL idle_in_transaction_session_timeout='10000ms';
SELECT current_database()='postgres' AND session_user='postgres' AND current_user='postgres'
 AND current_setting('server_version_num')::integer BETWEEN 170000 AND 179999
 AND current_setting('transaction_read_only')='on' AND NOT pg_is_in_recovery()
 AND EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR rolbypassrls))
 AS observation_guard_ok
\gset
\if :observation_guard_ok
\else
ROLLBACK;
SELECT 1/0 AS observation_blocked;
\endif
SELECT transaction_timestamp() AS snapshot_at_utc,
 NOT has_function_privilege('authenticated','public.contratpro_provision_identity()','EXECUTE') AS original_denied,
 NOT pg_has_role('postgres','contratpro_identity_writer','SET') AS temporary_set_absent,
 NOT has_schema_privilege('contratpro_identity_writer','public','CREATE') AS temporary_create_absent,
 NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid='contratpro_identity_writer'::regrole
   AND member='postgres'::regrole AND grantor='postgres'::regrole) AS temporary_self_grant_absent;
-- Bounded complete wrapper representation for independent body/owner/settings/ACL review.
SELECT p.oid::regprocedure::text AS signature,pg_get_userbyid(p.proowner) AS owner,
 p.prosecdef,p.proconfig,p.proacl::text,pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='contratpro_a02_fixture_provision'
ORDER BY p.oid LIMIT 2;
SELECT count(*) AS wrapper_overloads FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='contratpro_a02_fixture_provision';
SELECT count(*) AS history_count FROM supabase_migrations.schema_migrations;
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version LIMIT 12;
WITH nominated(label,subject) AS (
 VALUES ('A','17eaeec9-37e1-4720-ba7a-c1e16f659af5'::uuid),
        ('B','305fb936-588e-42f9-bc4d-f41a0d3f60c0'::uuid),
        ('U','f7334db7-f402-4f00-9c1a-754eb3eb2f3e'::uuid)
)
SELECT n.label,a.id IS NOT NULL AS auth_exists,link.user_id AS canonical_user_id,
 u.state='active' AS canonical_active,
 (SELECT count(*) FROM tenancy.memberships m WHERE m.user_id=link.user_id) AS memberships,
 (SELECT count(*) FROM tenancy.agencies g WHERE g.created_by_user_id=link.user_id) AS agencies,
 (SELECT count(*) FROM tenancy.clients c WHERE c.created_by_user_id=link.user_id) AS clients,
 (SELECT count(*) FROM tenancy.membership_invitations i JOIN tenancy.memberships m
   ON m.id=i.invited_by_membership_id AND m.agency_id=i.agency_id WHERE m.user_id=link.user_id) AS invitations_by_cohort,
 (SELECT count(*) FROM tenancy.audit_events e JOIN tenancy.memberships m
   ON m.id=e.actor_membership_id AND m.agency_id=e.agency_id WHERE m.user_id=link.user_id) AS audit_by_cohort
FROM nominated n LEFT JOIN auth.users a ON a.id=n.subject
LEFT JOIN identity.supabase_users link ON link.supabase_user_id=n.subject
LEFT JOIN identity.users u ON u.id=link.user_id ORDER BY n.label LIMIT 3;
ROLLBACK;
