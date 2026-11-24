-- PREPARED ONLY. Catalog inspection; no application RPCs, user-data reads or writes.
-- Run only under separate authorization against an independently verified target.
-- An empty/missing result or any false check is not PASS. Policy predicates require
-- manual comparison with migrations 0004/0005; policy names alone prove nothing.
-- Successful catalog checks do NOT prove restricted-user execution/concurrency.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='2s';

SELECT current_database() AS database_name, session_user, current_user,
       current_setting('server_version_num')::integer BETWEEN 170000 AND 179999 AS postgres_17,
       current_setting('transaction_read_only')='on' AS read_only;

WITH expected(version) AS (VALUES
 ('20261115000500'),('20261118000900'),('20261118001000'),('20261119001100'),('20261119001200'))
SELECT e.version,count(h.version)=1 AS recorded_once
FROM expected e LEFT JOIN supabase_migrations.schema_migrations h ON h.version=e.version
GROUP BY e.version ORDER BY e.version;

-- Body hashes are SHA-256 of prosrc with CRLF normalized to LF. Sources: 0005,
-- plus the deployed 0009 v3 canonical_auth_user/receipt_auth_uid definitions.
-- 0012 changes only settings, so these body fingerprints must remain unchanged.
WITH expected(signature,owner_name,definer,volatility,settings,callers,body_hash) AS (VALUES
 ('public.contratpro_create_agency(jsonb,text,uuid)','contratpro_agency_writer',true,'v',ARRAY['search_path=pg_catalog, pg_temp','row_security=on'],ARRAY['authenticated'],'41db9444e065a8004a09fa45377578f108a269c52881e960a3fcfaf549b223df'),
 ('public.contratpro_update_agency(uuid,jsonb,uuid)','contratpro_agency_writer',true,'v',ARRAY['search_path=pg_catalog, pg_temp','row_security=on'],ARRAY['authenticated'],'dda0348b236d1194742f46a90943fc7662ab180fcc6605ee8df43d80e7efcdba'),
 ('public.contratpro_update_agency_settings(uuid,jsonb,uuid)','contratpro_agency_writer',true,'v',ARRAY['search_path=pg_catalog, pg_temp','row_security=on'],ARRAY['authenticated'],'5387640d5e176a4c295ea996262eb30af044bf3d983638c5f5c0c90fd115f849'),
 ('public.contratpro_agency_profile(uuid)','postgres',false,'s',ARRAY['search_path=pg_catalog'],ARRAY['authenticated'],'21acb8755108b87df007d5d59bf73a5b87d2748d2eb216e4dfe3cbc329a4323a'),
 ('app_private.canonical_auth_user()','postgres',false,'s',ARRAY['search_path=pg_catalog, pg_temp'],ARRAY['authenticated','contratpro_agency_writer','contratpro_client_receipt_writer'],'735bfdc8b6863b703bb58b1f4ef820c40c66bd3dde2ed12ea41999c963bd9fad'),
 ('app_private.agency_owner(uuid)','postgres',false,'s',ARRAY['search_path=pg_catalog, pg_temp'],ARRAY['authenticated','contratpro_agency_writer','contratpro_client_receipt_writer'],'1b9a8a5c79b407256bf7c06c314ed26db6ee6236d5b79e2c4d0d798ff22bc4f2'),
 ('app_private.valid_agency_profile(jsonb)','postgres',false,'i',ARRAY['search_path=pg_catalog'],ARRAY['contratpro_agency_writer'],'156799cc096c314b2da5cc340122194a85a9c7dd60430e1d19caf17281f771ee'),
 ('app_private.receipt_auth_uid()','postgres',true,'s',ARRAY['search_path=pg_catalog, pg_temp'],ARRAY['authenticated','contratpro_agency_writer','contratpro_client_receipt_writer'],'c628b78ce1d2a3b15ddbaf7b0a5838fa26c925d332103e53f34ba73b9b227604')
)
SELECT e.signature,p.oid IS NOT NULL AS present,
       pg_get_userbyid(p.proowner) AS owner,p.proconfig AS settings,
       (p.proowner=to_regrole(e.owner_name) AND p.prokind='f'
        AND p.prosecdef=e.definer AND p.provolatile::text=e.volatility
        AND cardinality(p.proconfig)=cardinality(e.settings)
        AND p.proconfig @> e.settings) IS TRUE AS definition_attributes_match,
       (encode(sha256(convert_to(replace(p.prosrc,E'\r\n',E'\n'),'UTF8')),'hex')=e.body_hash) IS TRUE AS body_matches_repository,
       (p.oid IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
         WHERE a.grantee<>p.proowner AND NOT (
           pg_get_userbyid(a.grantee)=ANY(e.callers) AND a.privilege_type='EXECUTE' AND NOT a.is_grantable))
        AND NOT EXISTS (SELECT 1 FROM unnest(e.callers) caller
          WHERE has_function_privilege(caller,p.oid,'EXECUTE') IS DISTINCT FROM true)) AS execute_allowlist_matches,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
       pg_get_function_result(p.oid) AS result_type,p.proacl::text AS acl
FROM expected e LEFT JOIN pg_proc p ON p.oid=to_regprocedure(e.signature)
ORDER BY e.signature;

-- Expected: writer_exists/restricted_writer/no_outgoing_memberships/no_residual_grants
-- true; postgres_can_set_writer false. Provider ADMIN-only grants may remain.
-- Compare with the pre-0012 baseline if an authorized SET path existed beforehand:
-- current catalogs alone cannot prove historical byte-for-byte restoration.
SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='contratpro_agency_writer') AS writer_exists,
       EXISTS(SELECT 1 FROM pg_roles WHERE rolname='contratpro_agency_writer'
         AND NOT (rolsuper OR rolbypassrls OR rolcanlogin OR rolinherit OR rolcreatedb OR rolcreaterole OR rolreplication)) AS restricted_writer,
       NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE member=to_regrole('contratpro_agency_writer')) AS no_outgoing_memberships,
       NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid=to_regrole('contratpro_agency_writer')
         AND (member<>to_regrole('postgres') OR grantor=to_regrole('postgres')
              OR NOT admin_option OR inherit_option OR set_option)) AS no_residual_grants,
       pg_has_role('postgres','contratpro_agency_writer','SET') AS postgres_can_set_writer;
SELECT pg_get_userbyid(m.roleid) AS granted_role,pg_get_userbyid(m.member) AS member,
       pg_get_userbyid(m.grantor) AS grantor,m.admin_option,m.inherit_option,m.set_option
FROM pg_auth_members m
WHERE m.roleid=to_regrole('contratpro_agency_writer') OR m.member=to_regrole('contratpro_agency_writer')
ORDER BY m.roleid,m.member,m.grantor;
SELECT role_name,
       NOT pg_has_role(role_name,'contratpro_agency_writer','SET') AS cannot_set_writer,
       NOT pg_has_role(role_name,'contratpro_agency_writer','USAGE') AS cannot_inherit_writer
FROM unnest(ARRAY['anon','authenticated','authenticator','service_role','contratpro_runtime','contratpro_platform_runtime']) role_name;
SELECT schema_name,has_schema_privilege('contratpro_agency_writer',schema_name,'USAGE') AS writer_usage,
       NOT has_schema_privilege('contratpro_agency_writer',schema_name,'CREATE') AS writer_cannot_create
FROM unnest(ARRAY['identity','tenancy','app_private','auth','public']) schema_name;
SELECT has_function_privilege('contratpro_agency_writer','auth.uid()','EXECUTE') AS writer_can_use_managed_uid;

-- Expected effective column privileges from 0005. '*' means table-wide SELECT.
-- Every Boolean in this result must be true. No business-table rows are selected.
WITH expected(table_name,reads,inserts,updates) AS (VALUES
 ('identity.supabase_users',ARRAY['supabase_user_id','user_id'],ARRAY[]::text[],ARRAY[]::text[]),
 ('identity.users',ARRAY['id','state'],ARRAY[]::text[],ARRAY[]::text[]),
 ('tenancy.agencies',ARRAY['*'],ARRAY['id','name','state','ice','if_number','rc','address','city','phone','email','created_by_user_id','creation_key'],ARRAY['name','ice','if_number','rc','address','city','phone','email']),
 ('tenancy.memberships',ARRAY['*'],ARRAY['id','agency_id','user_id','state'],ARRAY[]::text[]),
 ('tenancy.roles',ARRAY['*'],ARRAY['id','agency_id','key','name'],ARRAY[]::text[]),
 ('tenancy.membership_roles',ARRAY['*'],ARRAY['agency_id','membership_id','role_id'],ARRAY[]::text[]),
 ('tenancy.role_permissions',ARRAY['*'],ARRAY['agency_id','role_id','permission_key'],ARRAY[]::text[]),
 ('tenancy.agency_settings',ARRAY['*'],ARRAY['agency_id','default_locale','time_zone','currency'],ARRAY['default_locale','time_zone','currency']),
 ('tenancy.audit_events',ARRAY[]::text[],ARRAY['agency_id','actor_membership_id','action','request_id','metadata'],ARRAY[]::text[])
)
SELECT e.table_name,c.oid IS NOT NULL AS present,
       (c.relowner=to_regrole('postgres') AND c.relrowsecurity AND c.relforcerowsecurity) IS TRUE AS owner_and_force_rls_match,
       (c.oid IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM unnest(e.reads||e.inserts||e.updates) required_column
         WHERE required_column<>'*' AND NOT EXISTS (
           SELECT 1 FROM pg_attribute col WHERE col.attrelid=c.oid
             AND col.attname=required_column AND col.attnum>0 AND NOT col.attisdropped))
        AND bool_and(
         has_column_privilege('contratpro_agency_writer',c.oid,a.attnum,'SELECT')=('*'=ANY(e.reads) OR a.attname=ANY(e.reads))
         AND has_column_privilege('contratpro_agency_writer',c.oid,a.attnum,'INSERT')=(a.attname=ANY(e.inserts))
         AND has_column_privilege('contratpro_agency_writer',c.oid,a.attnum,'UPDATE')=(a.attname=ANY(e.updates))
         AND NOT has_column_privilege('contratpro_agency_writer',c.oid,a.attnum,'SELECT WITH GRANT OPTION,INSERT WITH GRANT OPTION,UPDATE WITH GRANT OPTION,REFERENCES'))
        AND NOT has_table_privilege('contratpro_agency_writer',c.oid,'DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')) IS TRUE AS writer_privileges_match,
       (c.oid IS NOT NULL AND bool_and(NOT has_column_privilege('authenticated',c.oid,a.attnum,'INSERT,UPDATE,REFERENCES'))
        AND NOT has_table_privilege('authenticated',c.oid,'DELETE,TRUNCATE,TRIGGER,MAINTAIN')) IS TRUE AS authenticated_has_no_direct_writes
FROM expected e LEFT JOIN pg_class c ON c.oid=to_regclass(e.table_name)
LEFT JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
GROUP BY e.table_name,e.reads,e.inserts,e.updates,c.oid,c.relowner,c.relrowsecurity,c.relforcerowsecurity
ORDER BY e.table_name;

-- Full predicates below MUST be reviewed against the named 0004/0005 policy.
-- shape_matches only checks table, name, role, command and permissiveness.
-- Unexpected effective policies are shown too; never treat presence alone as PASS.
WITH expected(table_name,policy_name,command,role_name) AS (VALUES
 ('identity.supabase_users','writer_mapping','r','contratpro_agency_writer'),
 ('identity.users','writer_user','r','contratpro_agency_writer'),
 ('tenancy.memberships','writer_membership_read','r','contratpro_agency_writer'),
 ('tenancy.agencies','writer_agency_read','r','contratpro_agency_writer'),
 ('tenancy.agencies','writer_agency_insert','a','contratpro_agency_writer'),
 ('tenancy.memberships','writer_membership_insert','a','contratpro_agency_writer'),
 ('tenancy.roles','writer_role_read','r','contratpro_agency_writer'),
 ('tenancy.roles','writer_role_insert','a','contratpro_agency_writer'),
 ('tenancy.membership_roles','writer_member_role_read','r','contratpro_agency_writer'),
 ('tenancy.membership_roles','writer_member_role_insert','a','contratpro_agency_writer'),
 ('tenancy.role_permissions','writer_permission_read','r','contratpro_agency_writer'),
 ('tenancy.role_permissions','writer_permission_insert','a','contratpro_agency_writer'),
 ('tenancy.agencies','writer_agency_update','w','contratpro_agency_writer'),
 ('tenancy.agency_settings','writer_settings_read','r','contratpro_agency_writer'),
 ('tenancy.agency_settings','writer_settings_insert','a','contratpro_agency_writer'),
 ('tenancy.agency_settings','writer_settings_update','w','contratpro_agency_writer'),
 ('tenancy.audit_events','writer_audit','a','contratpro_agency_writer'),
 ('identity.supabase_users','supabase_mapping_self_read','r','authenticated'),
 ('identity.users','supabase_canonical_self_read','r','authenticated'),
 ('tenancy.memberships','supabase_memberships_self_read','r','authenticated'),
 ('tenancy.agencies','supabase_agencies_self_read','r','authenticated'),
 ('tenancy.roles','auth_role_read','r','authenticated'),
 ('tenancy.membership_roles','auth_member_role_read','r','authenticated'),
 ('tenancy.role_permissions','auth_permission_read','r','authenticated'),
 ('tenancy.agency_settings','auth_settings_read','r','authenticated')
), actual AS (
 SELECT p.* FROM pg_policy p
 WHERE p.polrelid IN (SELECT to_regclass(table_name) FROM expected)
   AND EXISTS(SELECT 1 FROM unnest(p.polroles) policy_role
     WHERE CASE WHEN policy_role=0 THEN true ELSE
       pg_has_role('authenticated',policy_role,'USAGE') OR pg_has_role('contratpro_agency_writer',policy_role,'USAGE') END)
)
SELECT COALESCE(e.table_name,p.polrelid::regclass::text) AS table_name,
       COALESCE(e.policy_name,p.polname) AS policy_name,
       (p.oid IS NOT NULL AND e.policy_name IS NOT NULL AND p.polcmd::text=e.command
        AND p.polroles=ARRAY[to_regrole(e.role_name)]::oid[] AND p.polpermissive) IS TRUE AS shape_matches,
       ARRAY(SELECT CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r)::text END FROM unnest(p.polroles) r) AS actual_roles,
       pg_get_expr(p.polqual,p.polrelid) AS using_expression,
       pg_get_expr(p.polwithcheck,p.polrelid) AS check_expression
FROM expected e FULL JOIN actual p ON p.polrelid=to_regclass(e.table_name) AND p.polname=e.policy_name
ORDER BY table_name,policy_name;

-- Inspect the definitions, not only names: creator/key uniqueness and composite
-- tenant foreign keys underpin retry and Owner-assignment integrity.
WITH expected(table_name,constraint_name) AS (VALUES
 ('tenancy.agencies','agencies_creation_unique'),
 ('tenancy.memberships','memberships_agency_user_unique'),
 ('tenancy.memberships','memberships_agency_id_id_unique'),
 ('tenancy.roles','roles_agency_key_unique'),
 ('tenancy.roles','roles_agency_id_id_unique'),
 ('tenancy.membership_roles','membership_roles_agency_member_fk'),
 ('tenancy.membership_roles','membership_roles_agency_role_fk'),
 ('tenancy.role_permissions','role_permissions_agency_role_fk'),
 ('tenancy.audit_events','audit_events_agency_actor_fk')
)
SELECT e.table_name,e.constraint_name,(c.oid IS NOT NULL AND c.convalidated) AS present_and_valid,
       pg_get_constraintdef(c.oid) AS definition
FROM expected e LEFT JOIN pg_constraint c ON c.conrelid=to_regclass(e.table_name) AND c.conname=e.constraint_name
ORDER BY e.table_name,e.constraint_name;

ROLLBACK;
-- No automatic PASS: review all result sets and policy/constraint definitions.
