-- 0012: FORWARD-ONLY, UNAPPLIED agency SECURITY DEFINER search-path hardening.
-- Standalone candidate: one session, stop-on-error, separately authorized change
-- procedure and no concurrent administrative/schema changes. This file supplies
-- its own transaction/history INSERT; do not nest it in a native migration runner.
-- Only the three affected agency RPC search paths may change. No application
-- function invocations, body/owner/ACL/RLS changes, EXECUTE grants or activation.
BEGIN;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE;

DO $migration_0012$
DECLARE
  writer pg_catalog.oid := pg_catalog.to_regrole('contratpro_agency_writer');
  executor pg_catalog.oid := pg_catalog.to_regrole('postgres');
  targets pg_catalog.oid[] := ARRAY[
    pg_catalog.to_regprocedure('public.contratpro_create_agency(jsonb,text,uuid)'),
    pg_catalog.to_regprocedure('public.contratpro_update_agency(uuid,jsonb,uuid)'),
    pg_catalog.to_regprocedure('public.contratpro_update_agency_settings(uuid,jsonb,uuid)')];
  related_tables pg_catalog.oid[] := ARRAY[
    'identity.users'::pg_catalog.regclass,'identity.supabase_users'::pg_catalog.regclass,
    'tenancy.agencies'::pg_catalog.regclass,'tenancy.memberships'::pg_catalog.regclass,
    'tenancy.roles'::pg_catalog.regclass,'tenancy.membership_roles'::pg_catalog.regclass,
    'tenancy.role_permissions'::pg_catalog.regclass,'tenancy.agency_settings'::pg_catalog.regclass,
    'tenancy.audit_events'::pg_catalog.regclass];
  functions_before pg_catalog.jsonb;
  memberships_before pg_catalog.jsonb;
  roles_before pg_catalog.jsonb;
  tables_before pg_catalog.jsonb;
  columns_before pg_catalog.jsonb;
  policies_before pg_catalog.jsonb;
  observed pg_catalog.jsonb;
  added_membership pg_catalog.bool := false;
BEGIN
  IF session_user<>'postgres' OR current_user<>'postgres'
     OR pg_catalog.current_setting('server_version_num')::pg_catalog.int4 NOT BETWEEN 170000 AND 179999
     OR writer IS NULL OR executor IS NULL OR pg_catalog.array_position(targets,NULL) IS NOT NULL
  THEN RAISE EXCEPTION '0012 executor, PostgreSQL version or prerequisite object mismatch'; END IF;
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261115000500','20261118000900','20261118001000','20261119001100'))<>4
     OR EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version>='20261119001200')
  THEN RAISE EXCEPTION '0012 migration history mismatch'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE oid=writer
      AND NOT (rolsuper OR rolbypassrls OR rolcanlogin OR rolinherit OR rolcreatedb OR rolcreaterole OR rolreplication))
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members WHERE member=writer)
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members WHERE roleid=writer
                AND (member<>executor OR inherit_option))
     OR pg_catalog.pg_has_role('authenticated',writer,'SET')
     OR pg_catalog.pg_has_role('authenticated',writer,'USAGE')
     OR NOT pg_catalog.has_schema_privilege(writer,'public','USAGE')
     OR pg_catalog.has_schema_privilege(writer,'public','CREATE')
  THEN RAISE EXCEPTION '0012 agency writer boundary mismatch'; END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_proc p WHERE p.oid=ANY(targets)
      AND p.proowner=writer AND p.prokind='f' AND p.prosecdef AND p.provolatile='v'
      AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
      AND p.prorettype=CASE WHEN p.oid=targets[1] THEN 'pg_catalog.record'::pg_catalog.regtype ELSE 'pg_catalog.bool'::pg_catalog.regtype END
      AND p.proretset=(p.oid=targets[1])
      AND pg_catalog.cardinality(p.proconfig)=2 AND p.proconfig @> ARRAY['row_security=on']
      AND (p.proconfig @> ARRAY['search_path=pg_catalog'] OR p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp'])
      AND pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'))<>3
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p,
                LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
                WHERE p.oid=ANY(targets) AND a.grantee<>p.proowner
                  AND NOT (a.grantee='authenticated'::pg_catalog.regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable))
  THEN RAISE EXCEPTION '0012 agency function settings, ownership or ACL mismatch'; END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_class WHERE oid=ANY(related_tables)
      AND relowner=executor AND relrowsecurity AND relforcerowsecurity)<>9
  THEN RAISE EXCEPTION '0012 agency table RLS boundary mismatch'; END IF;

  SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p)-'proconfig' ORDER BY p.oid)
    INTO functions_before FROM pg_catalog.pg_proc p WHERE p.oid=ANY(targets);
  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(m) ORDER BY m.oid),'[]'::pg_catalog.jsonb)
    INTO memberships_before FROM pg_catalog.pg_auth_members m WHERE m.roleid=writer OR m.member=writer;
  SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(r) ORDER BY r.oid)
    INTO roles_before FROM pg_catalog.pg_roles r WHERE r.oid IN (writer,executor);
  SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(c.oid,c.relowner,c.relacl,c.relrowsecurity,c.relforcerowsecurity) ORDER BY c.oid)
    INTO tables_before FROM pg_catalog.pg_class c WHERE c.oid=ANY(related_tables);
  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(a.attrelid,a.attnum,a.attacl) ORDER BY a.attrelid,a.attnum),'[]'::pg_catalog.jsonb)
    INTO columns_before FROM pg_catalog.pg_attribute a WHERE a.attrelid=ANY(related_tables) AND a.attacl IS NOT NULL;
  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p) ORDER BY p.oid),'[]'::pg_catalog.jsonb)
    INTO policies_before FROM pg_catalog.pg_policy p WHERE p.polrelid=ANY(related_tables);

  -- Reuse existing SET authority. Otherwise add a distinct postgres-issued grant,
  -- preserving the provider-issued ADMIN-only grant and all its original options.
  IF NOT pg_catalog.pg_has_role(session_user,writer,'SET') THEN
    IF NOT pg_catalog.pg_has_role(current_user,writer,'MEMBER WITH ADMIN OPTION')
       OR EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members
                  WHERE roleid=writer AND member=executor AND grantor=executor)
    THEN RAISE EXCEPTION '0012 requires existing SET access or ADMIN authority for a new temporary grant'; END IF;
    EXECUTE 'GRANT contratpro_agency_writer TO postgres WITH ADMIN FALSE, INHERIT FALSE, SET TRUE GRANTED BY postgres';
    added_membership:=true;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members
                   WHERE roleid=writer AND member=executor AND grantor=executor
                     AND NOT admin_option AND NOT inherit_option AND set_option)
    THEN RAISE EXCEPTION '0012 temporary membership mismatch'; END IF;
  END IF;
  EXECUTE 'SET LOCAL ROLE contratpro_agency_writer';
  IF current_user<>'contratpro_agency_writer' THEN RAISE EXCEPTION '0012 owner switch failed'; END IF;
  -- Do not touch an already-hardened function. No helper or unrelated RPC is altered.
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc WHERE oid=targets[1] AND proconfig @> ARRAY['search_path=pg_catalog']) THEN
    EXECUTE 'ALTER FUNCTION public.contratpro_create_agency(jsonb,text,uuid) SET search_path=pg_catalog,pg_temp';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc WHERE oid=targets[2] AND proconfig @> ARRAY['search_path=pg_catalog']) THEN
    EXECUTE 'ALTER FUNCTION public.contratpro_update_agency(uuid,jsonb,uuid) SET search_path=pg_catalog,pg_temp';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc WHERE oid=targets[3] AND proconfig @> ARRAY['search_path=pg_catalog']) THEN
    EXECUTE 'ALTER FUNCTION public.contratpro_update_agency_settings(uuid,jsonb,uuid) SET search_path=pg_catalog,pg_temp';
  END IF;
  EXECUTE 'SET LOCAL ROLE postgres';
  IF current_user<>'postgres' THEN RAISE EXCEPTION '0012 executor restoration failed'; END IF;
  IF added_membership THEN
    EXECUTE 'REVOKE contratpro_agency_writer FROM postgres GRANTED BY postgres RESTRICT';
  END IF;

  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(m) ORDER BY m.oid),'[]'::pg_catalog.jsonb)
    INTO observed FROM pg_catalog.pg_auth_members m WHERE m.roleid=writer OR m.member=writer;
  IF observed IS DISTINCT FROM memberships_before THEN RAISE EXCEPTION '0012 final membership baseline mismatch'; END IF;
  SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(r) ORDER BY r.oid)
    INTO observed FROM pg_catalog.pg_roles r WHERE r.oid IN (writer,executor);
  IF observed IS DISTINCT FROM roles_before THEN RAISE EXCEPTION '0012 owner role attributes changed'; END IF;
  SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p)-'proconfig' ORDER BY p.oid)
    INTO observed FROM pg_catalog.pg_proc p WHERE p.oid=ANY(targets);
  IF observed IS DISTINCT FROM functions_before THEN RAISE EXCEPTION '0012 function body, owner or ACL changed'; END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_proc WHERE oid=ANY(targets)
      AND pg_catalog.cardinality(proconfig)=2
      AND proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'])<>3
  THEN RAISE EXCEPTION '0012 final function settings mismatch'; END IF;
  SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(c.oid,c.relowner,c.relacl,c.relrowsecurity,c.relforcerowsecurity) ORDER BY c.oid)
    INTO observed FROM pg_catalog.pg_class c WHERE c.oid=ANY(related_tables);
  IF observed IS DISTINCT FROM tables_before THEN RAISE EXCEPTION '0012 table security changed'; END IF;
  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(a.attrelid,a.attnum,a.attacl) ORDER BY a.attrelid,a.attnum),'[]'::pg_catalog.jsonb)
    INTO observed FROM pg_catalog.pg_attribute a WHERE a.attrelid=ANY(related_tables) AND a.attacl IS NOT NULL;
  IF observed IS DISTINCT FROM columns_before THEN RAISE EXCEPTION '0012 column privileges changed'; END IF;
  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p) ORDER BY p.oid),'[]'::pg_catalog.jsonb)
    INTO observed FROM pg_catalog.pg_policy p WHERE p.polrelid=ANY(related_tables);
  IF observed IS DISTINCT FROM policies_before THEN RAISE EXCEPTION '0012 RLS policies changed'; END IF;
END;
$migration_0012$;

-- All owner/membership/security checks must pass before history is recorded.
INSERT INTO supabase_migrations.schema_migrations(version)
VALUES ('20261119001200');
COMMIT;
