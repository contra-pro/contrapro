\set ON_ERROR_STOP on
\set VERBOSITY terse
\pset pager off
-- PREPARED ONLY, NOT EXECUTED. psql 17 -X -w. No application RPC invocation.
-- Required non-secret -v inputs: project_ref, database_oid, server_address,
-- server_port, target_evidence_ref, tls_evidence_ref. References are assertions,
-- not independent proof. The operator must first authenticate their provenance.
-- libpq must enforce verify-full with the approved CA/hostname BEFORE connection.
-- pg_stat_ssl behind a pooler cannot prove the client-to-pooler TLS handshake.
-- Run only via the reviewed p3-readonly-preflight.mjs 20-second supervisor.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='2s';
SET LOCAL idle_in_transaction_session_timeout='10s';

SELECT :'project_ref'='gllsiklbvqpxzucvkehw'
 AND :'target_evidence_ref' ~ '^[A-Za-z0-9_./:#-]{1,256}$' AND :'target_evidence_ref'<>'UNBOUND'
 AND :'tls_evidence_ref' ~ '^[A-Za-z0-9_./:#-]{1,256}$' AND :'tls_evidence_ref'<>'UNBOUND'
 AND current_database()='postgres' AND session_user='postgres' AND current_user='postgres'
 AND current_setting('server_version_num')::integer BETWEEN 170000 AND 179999
 AND current_setting('server_encoding')='UTF8' AND NOT pg_is_in_recovery()
 AND (SELECT oid::text FROM pg_database WHERE datname=current_database())=:'database_oid'
 AND inet_server_addr()::text IS NOT DISTINCT FROM :'server_address'
 AND inet_server_port()::text IS NOT DISTINCT FROM :'server_port'
 AND current_setting('transaction_read_only')='on'
 AND current_setting('transaction_isolation')='repeatable read'
 AND current_setting('statement_timeout')::interval=interval '5 seconds'
 AND current_setting('lock_timeout')::interval=interval '2 seconds'
 AND current_setting('idle_in_transaction_session_timeout')::interval=interval '10 seconds' AS connection_ok
\gset
\if :connection_ok
\echo MATCHED_OPERATOR_BOUND_TARGET_FINGERPRINT_TLS_REMAINS_CLIENT_EVIDENCE
\else
ROLLBACK;
SELECT 1/0 AS blocked_target_or_guards;
\endif
SELECT current_database() AS database_name, session_user, current_user,
 current_setting('server_version_num') AS postgres_version_num,
 (SELECT oid FROM pg_database WHERE datname=current_database()) AS database_oid,
 inet_server_addr() AS backend_address,inet_server_port() AS backend_port;

SELECT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='supabase_migrations' AND c.relname='schema_migrations' AND c.relkind='r' AND NOT c.relrowsecurity AND pg_get_userbyid(c.relowner) IN ('postgres','supabase_admin'))
 AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('supabase_migrations.schema_migrations') AND attname='version' AND NOT attisdropped AND atttypid IN ('pg_catalog.text'::regtype,'pg_catalog.varchar'::regtype))
 AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('tenancy.permissions') AND attname='key' AND NOT attisdropped AND atttypid IN ('pg_catalog.text'::regtype,'pg_catalog.varchar'::regtype))
 AND EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tenancy' AND c.relname='permissions' AND c.relkind='r' AND NOT c.relrowsecurity)
 AND (SELECT count(*) FROM pg_namespace WHERE nspname IN ('identity','tenancy','app_private','auth','public'))=5
 AND (SELECT count(*) FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','authenticator','service_role',
 'contratpro_migration_owner','contratpro_runtime','contratpro_platform_runtime','contratpro_agency_writer','contratpro_identity_writer'))=10
 AND (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE
 (n.nspname='identity' AND c.relname IN ('users','supabase_users')) OR
 (n.nspname='tenancy' AND c.relname IN ('agencies','memberships','roles','membership_roles','role_permissions','clients','vehicles')))=9 AS dependencies_ok
\gset
\if :dependencies_ok
\else
ROLLBACK;
SELECT 1/0 AS blocked_dependencies;
\endif
-- Limit candidates BEFORE validation/aggregation. Ten rows detect any excess.
WITH candidates AS MATERIALIZED (
 SELECT CASE WHEN octet_length(version::text)=14 THEN version::text END AS v
 FROM supabase_migrations.schema_migrations LIMIT 10
)
SELECT count(*)=9 AND count(v)=9 AND bool_and(v COLLATE pg_catalog."C" ~ '^[0-9]{14}$')
 AND array_agg(v ORDER BY v)=ARRAY[
 '20261115000000','20261115000100','20261115000200','20261115000300','20261115000400',
 '20261115000500','20261115000600','20261116000700','20261118000800']::text[] AS history_ok
FROM candidates
\gset
\if :history_ok
\else
ROLLBACK;
SELECT 1/0 AS blocked_history;
\endif
-- The repeatable-read snapshot has exactly nine validated, 14-byte versions.
SELECT CASE WHEN octet_length(version::text)=14 THEN version::text END AS version
FROM supabase_migrations.schema_migrations ORDER BY version LIMIT 9;

-- ALL count/byte/configuration guards precede variable-length metadata output.
-- LIMIT is applied to candidate sets before aggregates/deparsing where practical.
WITH cols AS MATERIALIZED (
 SELECT a.attnum FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE a.attnum>0 AND NOT a.attisdropped AND ((n.nspname='identity' AND c.relname IN ('users','supabase_users')) OR (n.nspname='tenancy' AND c.relname IN ('agencies','memberships','roles','membership_roles','role_permissions','clients','vehicles'))) LIMIT 257
), constraints AS MATERIALIZED (
 SELECT oid,conbin FROM pg_constraint WHERE conrelid='tenancy.clients'::regclass LIMIT 33
), triggers AS MATERIALIZED (
 SELECT oid,tgnargs,tgqual FROM pg_trigger WHERE tgrelid='tenancy.clients'::regclass AND NOT tgisinternal LIMIT 17
), policies AS MATERIALIZED (
 SELECT p.polrelid,p.polroles,p.polqual,p.polwithcheck FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE (n.nspname='identity' AND c.relname IN ('users','supabase_users')) OR (n.nspname='tenancy' AND c.relname IN ('agencies','memberships','roles','membership_roles','role_permissions','clients')) LIMIT 65
)
SELECT (SELECT count(*)<=256 FROM cols)
 AND current_setting('createrole_self_grant',true) IN ('','set','inherit','set,inherit','set, inherit','inherit,set','inherit, set')
 AND (SELECT count(*)<=32 AND COALESCE(bool_and(CASE WHEN conbin IS NOT NULL AND octet_length(conbin::text)>8192 THEN false ELSE octet_length(pg_get_constraintdef(oid))<=8192 END),true) FROM constraints)
 AND (SELECT count(*)<=16 AND COALESCE(bool_and(tgnargs=0 AND CASE WHEN tgqual IS NOT NULL AND octet_length(tgqual::text)>8192 THEN false ELSE octet_length(pg_get_triggerdef(oid))<=8192 END),true) FROM triggers)
 AND (SELECT count(*)<=64 AND COALESCE(bool_and(COALESCE(cardinality(polroles),0) BETWEEN 1 AND 16 AND array_position(polroles,NULL) IS NULL
 AND CASE WHEN polqual IS NOT NULL AND octet_length(polqual::text)>8192 THEN false ELSE COALESCE(octet_length(pg_get_expr(polqual,polrelid)),0)<=8192 END
 AND CASE WHEN polwithcheck IS NOT NULL AND octet_length(polwithcheck::text)>8192 THEN false ELSE COALESCE(octet_length(pg_get_expr(polwithcheck,polrelid)),0)<=8192 END),true) FROM policies) AS output_bounds_ok
\gset
\if :output_bounds_ok
\else
ROLLBACK;
SELECT 1/0 AS blocked_metadata_bounds;
\endif
SELECT count(*)=14 AND bool_and(CASE WHEN octet_length(p.prosrc)>32768 OR NOT (CASE WHEN COALESCE(cardinality(p.proconfig),0)>8 OR COALESCE(array_ndims(p.proconfig),1)>1 THEN false ELSE NOT EXISTS(SELECT 1 FROM (SELECT setting FROM unnest(p.proconfig) setting LIMIT 9) config WHERE CASE WHEN setting IS NULL OR octet_length(setting)>256 OR setting COLLATE pg_catalog."C" ~ U&'[\0001-\001F\007F]' THEN true ELSE setting COLLATE pg_catalog."C" !~ '^(search_path=(pg_catalog(, ?pg_temp)?|"")|row_security=(on|off))$' END) AND (SELECT count(*)=count(DISTINCT split_part(setting,'=',1)) FROM (SELECT setting FROM unnest(p.proconfig) setting LIMIT 9) config) END) THEN false ELSE octet_length(pg_get_functiondef(p.oid))<=32768 END) AS helpers_ok
FROM pg_proc p WHERE p.oid=ANY(ARRAY[to_regprocedure('auth.uid()'),to_regprocedure('app_private.canonical_auth_user()'),to_regprocedure('app_private.agency_owner(uuid)'),
 to_regprocedure('app_private.client_allowed(uuid,text)'),to_regprocedure('app_private.client_payload(tenancy.clients)'),
 to_regprocedure('app_private.valid_client(jsonb)'),to_regprocedure('app_private.client_guard()'),
 to_regprocedure('public.contratpro_clients_permissions(uuid)'),to_regprocedure('public.contratpro_clients_list(uuid,text,text,integer,integer)'),
 to_regprocedure('public.contratpro_client_detail(uuid,uuid)'),to_regprocedure('public.contratpro_client_create(uuid,uuid,jsonb)'),
 to_regprocedure('public.contratpro_client_update(uuid,uuid,integer,jsonb)'),to_regprocedure('public.contratpro_client_archive(uuid,uuid,integer)'),
 to_regprocedure('public.contratpro_vehicle_create(uuid,uuid,jsonb)')])
\gset
\if :helpers_ok
\else
ROLLBACK;
SELECT 1/0 AS blocked_helper_evidence;
\endif
SELECT count(*)=2 AND bool_and(CASE WHEN COALESCE(cardinality(e.evttags),0)>32 OR COALESCE(array_ndims(e.evttags),1)>1 OR EXISTS(SELECT 1 FROM (SELECT tag FROM unnest(e.evttags) tag LIMIT 33) tags WHERE CASE WHEN tag IS NULL OR octet_length(tag)>64 OR tag COLLATE pg_catalog."C" ~ U&'[\0001-\001F\007F]' THEN true ELSE tag COLLATE pg_catalog."C" !~ '^[A-Z][A-Z ]{0,63}$' END) OR octet_length(p.prosrc)>16384 OR NOT (CASE WHEN COALESCE(cardinality(p.proconfig),0)>8 OR COALESCE(array_ndims(p.proconfig),1)>1 THEN false ELSE NOT EXISTS(SELECT 1 FROM (SELECT setting FROM unnest(p.proconfig) setting LIMIT 9) config WHERE CASE WHEN setting IS NULL OR octet_length(setting)>256 OR setting COLLATE pg_catalog."C" ~ U&'[\0001-\001F\007F]' THEN true ELSE setting COLLATE pg_catalog."C" !~ '^(search_path=(pg_catalog(, ?pg_temp)?|"")|row_security=(on|off))$' END) AND (SELECT count(*)=count(DISTINCT split_part(setting,'=',1)) FROM (SELECT setting FROM unnest(p.proconfig) setting LIMIT 9) config) END) THEN false ELSE octet_length(pg_get_functiondef(p.oid))<=16384 END) AS handlers_ok
FROM pg_event_trigger e JOIN pg_proc p ON p.oid=e.evtfoid WHERE e.evtname IN ('pgrst_ddl_watch','pgrst_drop_watch')
\gset
\if :handlers_ok
\else
ROLLBACK;
SELECT 1/0 AS blocked_handler_evidence;
\endif

-- Catalog authority, not an ownership-transfer execution test. A future newly
-- created role must still satisfy the migration's effective-privilege assertions.
SELECT rolname,rolsuper,rolcreaterole,rolbypassrls,rolinherit,
 (rolsuper OR rolcreaterole) AS can_create_restricted_role,
 CASE WHEN current_setting('createrole_self_grant',true) IN ('','set','inherit','set,inherit','set, inherit','inherit,set','inherit, set') THEN current_setting('createrole_self_grant',true) ELSE 'UNVERIFIED' END AS creator_membership_configuration
FROM pg_roles WHERE rolname='postgres';
SELECT rolname,rolsuper,rolbypassrls,rolcanlogin,rolinherit,rolcreaterole FROM pg_roles
WHERE rolname IN ('postgres','anon','authenticated','authenticator','service_role','contratpro_migration_owner',
 'contratpro_runtime','contratpro_platform_runtime','contratpro_agency_writer','contratpro_identity_writer') ORDER BY rolname LIMIT 10;
SELECT count(*)=8 AND bool_and(NOT rolsuper AND NOT rolbypassrls) AS ordinary_roles_ok FROM pg_roles
WHERE rolname IN ('anon','authenticated','authenticator','contratpro_migration_owner','contratpro_runtime',
 'contratpro_platform_runtime','contratpro_agency_writer','contratpro_identity_writer')
\gset
\if :ordinary_roles_ok
\else
ROLLBACK;
SELECT 1/0 AS blocked_role_bypass;
\endif
SELECT n.nspname,pg_get_userbyid(n.nspowner) AS owner,
 has_schema_privilege(current_user,n.oid,'USAGE WITH GRANT OPTION') AS can_delegate_usage,
 has_schema_privilege(current_user,n.oid,'CREATE WITH GRANT OPTION') AS can_delegate_create
FROM pg_namespace n WHERE n.nspname IN ('identity','tenancy','app_private','auth','public') ORDER BY n.nspname;
SELECT l.lanname,l.lanpltrusted,has_language_privilege(current_user,l.oid,'USAGE') AS deployment_usage,
 EXISTS(SELECT 1 FROM aclexplode(COALESCE(l.lanacl,acldefault('l',l.lanowner))) a
 WHERE a.grantee=0 AND a.privilege_type='USAGE') AS public_usage_for_future_writer
FROM pg_language l WHERE l.lanname='plpgsql';
SELECT r.rolname,owner_role.rolname AS granted_role,m.admin_option,m.inherit_option,m.set_option
FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member JOIN pg_roles owner_role ON owner_role.oid=m.roleid
WHERE r.rolname='postgres' AND owner_role.rolname IN ('supabase_admin','contratpro_agency_writer','contratpro_identity_writer')
ORDER BY owner_role.rolname LIMIT 8;

SELECT n.nspname,c.relname,pg_get_userbyid(c.relowner) AS owner,c.relrowsecurity,c.relforcerowsecurity,
 has_table_privilege(current_user,c.oid,'SELECT WITH GRANT OPTION') AS can_delegate_select,
 has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated_table_select,
 has_table_privilege('authenticated',c.oid,'INSERT') AS authenticated_broad_insert,
 has_table_privilege('authenticated',c.oid,'UPDATE') AS authenticated_broad_update
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE
 (n.nspname='identity' AND c.relname IN ('users','supabase_users')) OR
 (n.nspname='tenancy' AND c.relname IN ('agencies','memberships','roles','membership_roles','role_permissions','clients','vehicles'))
ORDER BY n.nspname,c.relname;
SELECT count(*)=9 AND bool_and(c.relrowsecurity AND c.relforcerowsecurity AND c.relowner='postgres'::regrole) AS rls_ok
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE
 (n.nspname='identity' AND c.relname IN ('users','supabase_users')) OR
 (n.nspname='tenancy' AND c.relname IN ('agencies','memberships','roles','membership_roles','role_permissions','clients','vehicles'))
\gset
\if :rls_ok
\else
ROLLBACK;
SELECT 1/0 AS blocked_rls_or_owners;
\endif
-- Per-column effective privileges include table-level and inherited grants.
SELECT n.nspname,c.relname,a.attname,
 has_column_privilege(current_user,c.oid,a.attnum,'SELECT WITH GRANT OPTION') AS can_delegate_select,
 has_column_privilege('authenticated',c.oid,a.attnum,'SELECT') AS auth_select,
 has_column_privilege('authenticated',c.oid,a.attnum,'INSERT') AS auth_insert,
 has_column_privilege('authenticated',c.oid,a.attnum,'UPDATE') AS auth_update
FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE a.attnum>0 AND NOT a.attisdropped AND ((n.nspname='identity' AND c.relname IN ('users','supabase_users'))
 OR (n.nspname='tenancy' AND c.relname IN ('agencies','memberships','roles','membership_roles','role_permissions','clients','vehicles')))
ORDER BY n.nspname,c.relname,a.attnum LIMIT 256;
SELECT r.rolname,COALESCE(bool_or(has_column_privilege(r.oid,a.attrelid,a.attnum,'SELECT')
 OR has_column_privilege(r.oid,a.attrelid,a.attnum,'INSERT') OR has_column_privilege(r.oid,a.attrelid,a.attnum,'UPDATE')),false) AS any_client_column_privilege
FROM pg_roles r CROSS JOIN pg_attribute a WHERE r.rolname IN ('contratpro_migration_owner','contratpro_runtime',
 'contratpro_platform_runtime','contratpro_agency_writer','contratpro_identity_writer')
 AND a.attrelid='tenancy.clients'::regclass AND a.attnum>0 AND NOT a.attisdropped GROUP BY r.rolname ORDER BY r.rolname;
SELECT conname,contype,CASE WHEN octet_length(pg_get_constraintdef(oid))<=8192 THEN pg_get_constraintdef(oid) END AS definition FROM pg_constraint
WHERE conrelid='tenancy.clients'::regclass ORDER BY conname LIMIT 32;
SELECT count(*)=4 AND count(DISTINCT key)=4 AS permission_keys_ok FROM (SELECT key FROM tenancy.permissions
WHERE key COLLATE pg_catalog."C" IN ('clients.read','clients.create','clients.update','clients.archive') LIMIT 5) candidates
\gset
\if :permission_keys_ok
\else
ROLLBACK;
SELECT 1/0 AS blocked_permission_keys;
\endif

SELECT p.oid::regprocedure AS signature,pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.proconfig IS NOT NULL AS proconfig_present,
 ARRAY(SELECT setting FROM unnest(p.proconfig) setting WHERE octet_length(setting)<=256 AND setting COLLATE pg_catalog."C" ~ '^(search_path=(pg_catalog(, ?pg_temp)?|"")|row_security=(on|off))$' LIMIT 8) AS safe_proconfig,
 has_function_privilege(current_user,p.oid,'EXECUTE WITH GRANT OPTION') AS can_delegate_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
 EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
 WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute,
 octet_length(pg_get_functiondef(p.oid)) AS definition_bytes,
 CASE WHEN octet_length(pg_get_functiondef(p.oid))<=32768 THEN pg_get_functiondef(p.oid) END AS complete_definition
FROM pg_proc p WHERE p.oid=ANY(ARRAY[
 to_regprocedure('auth.uid()'),to_regprocedure('app_private.canonical_auth_user()'),to_regprocedure('app_private.agency_owner(uuid)'),
 to_regprocedure('app_private.client_allowed(uuid,text)'),to_regprocedure('app_private.client_payload(tenancy.clients)'),
 to_regprocedure('app_private.valid_client(jsonb)'),to_regprocedure('app_private.client_guard()'),
 to_regprocedure('public.contratpro_clients_permissions(uuid)'),to_regprocedure('public.contratpro_clients_list(uuid,text,text,integer,integer)'),
 to_regprocedure('public.contratpro_client_detail(uuid,uuid)'),to_regprocedure('public.contratpro_client_create(uuid,uuid,jsonb)'),
 to_regprocedure('public.contratpro_client_update(uuid,uuid,integer,jsonb)'),to_regprocedure('public.contratpro_client_archive(uuid,uuid,integer)'),
 to_regprocedure('public.contratpro_vehicle_create(uuid,uuid,jsonb)')]) ORDER BY p.oid::regprocedure::text LIMIT 14;
SELECT t.tgname,t.tgenabled,t.tgtype,p.oid::regprocedure AS handler,p.prosecdef,pg_get_userbyid(p.proowner) AS owner,
 CASE WHEN t.tgnargs=0 AND octet_length(pg_get_triggerdef(t.oid))<=8192 THEN pg_get_triggerdef(t.oid) END AS definition FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
WHERE t.tgrelid='tenancy.clients'::regclass AND NOT t.tgisinternal ORDER BY t.tgname LIMIT 16;
SELECT n.nspname AS schemaname,c.relname AS tablename,p.polname AS policyname,p.polroles AS role_oids,p.polcmd AS cmd,p.polpermissive,
 CASE WHEN COALESCE(octet_length(pg_get_expr(p.polqual,p.polrelid)),0)<=8192 THEN pg_get_expr(p.polqual,p.polrelid) END AS qual,
 CASE WHEN COALESCE(octet_length(pg_get_expr(p.polwithcheck,p.polrelid)),0)<=8192 THEN pg_get_expr(p.polwithcheck,p.polrelid) END AS with_check
FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE (n.nspname='identity' AND c.relname IN ('users','supabase_users')) OR (n.nspname='tenancy' AND c.relname IN ('agencies','memberships','roles','membership_roles','role_permissions','clients')) ORDER BY n.nspname,c.relname,p.polname LIMIT 64;
SELECT NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='contratpro_client_receipt_writer')
 AND to_regclass('app_private.client_creation_receipts') IS NULL
 AND NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE
 (n.nspname='app_private' AND p.proname IN ('client_unicode_case','normalize_client_creation','capture_client_creation','match_client_creation'))
 OR (n.nspname='public' AND p.proname='contratpro_client_creation_contract'))
 AND NOT EXISTS(SELECT 1 FROM pg_policy WHERE polname IN ('receipt_mapping_read','receipt_user_read','receipt_membership_read',
 'receipt_agency_read','receipt_role_read','receipt_assignment_read','receipt_permission_read','client_receipts_read','client_receipts_insert'))
 AND (SELECT count(*) FROM pg_trigger WHERE tgrelid='tenancy.clients'::regclass AND NOT tgisinternal)=1
 AND EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE t.tgrelid='tenancy.clients'::regclass
 AND t.tgname='clients_guard' AND t.tgtype=23 AND t.tgenabled='O' AND p.oid=to_regprocedure('app_private.client_guard()')
 AND NOT p.prosecdef AND p.proowner='postgres'::regrole) AS clean_boundary_ok
\gset
\if :clean_boundary_ok
\else
ROLLBACK;
SELECT 1/0 AS blocked_partial_installation_or_trigger;
\endif
-- No handler invocation: catalog capture cannot prove notification delivery or
-- the active PostgREST listener/schema cache. Oversized definitions require review.
SELECT e.evtname,e.evtenabled,ARRAY(SELECT tag FROM unnest(e.evttags) tag WHERE octet_length(tag)<=64 AND tag COLLATE pg_catalog."C" ~ '^[A-Z][A-Z ]{0,63}$' LIMIT 32) AS safe_tags,p.oid::regprocedure AS handler,p.prosecdef,p.proconfig IS NOT NULL AS proconfig_present,
 ARRAY(SELECT setting FROM unnest(p.proconfig) setting WHERE octet_length(setting)<=256 AND setting COLLATE pg_catalog."C" ~ '^(search_path=(pg_catalog(, ?pg_temp)?|"")|row_security=(on|off))$' LIMIT 8) AS safe_proconfig,
 pg_get_userbyid(p.proowner) AS owner,octet_length(pg_get_functiondef(p.oid)) AS definition_bytes,
 CASE WHEN octet_length(pg_get_functiondef(p.oid))<=16384 THEN pg_get_functiondef(p.oid) END AS complete_definition
FROM pg_event_trigger e JOIN pg_proc p ON p.oid=e.evtfoid
WHERE e.evtname IN ('pgrst_ddl_watch','pgrst_drop_watch') ORDER BY e.evtname LIMIT 2;
ROLLBACK;
\echo CATALOG_CAPTURED_MANUAL_TARGET_AUTHORITY_PRIVILEGE_AND_CACHE_REVIEW_REQUIRED
