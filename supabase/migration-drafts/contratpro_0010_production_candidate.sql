-- 0010: FORWARD-ONLY, UNAPPLIED standalone production candidate.
-- Execute only under a separately authorized change procedure, in one session,
-- with stop-on-error and no concurrent administrative/schema changes.
-- This file owns its transaction AND history INSERT: do not nest it in a native
-- migration runner which supplies either. Do not rerun 0007 or 0009.
-- No provisioning call, authenticated EXECUTE grant, role attribute change,
-- function replacement, ownership transfer, RLS change or application activation.
BEGIN;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

-- Serialize history writers and reject missing prerequisites or replay.
LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE;

DO $migration_0010$
DECLARE
  writer pg_catalog.oid := pg_catalog.to_regrole('contratpro_identity_writer');
  executor pg_catalog.oid := pg_catalog.to_regrole('postgres');
  rpc pg_catalog.oid := pg_catalog.to_regprocedure('public.contratpro_provision_identity()');
  bridge pg_catalog.oid := pg_catalog.to_regprocedure('app_private.provisioning_subject()');
  functions_before pg_catalog.jsonb;
  memberships_before pg_catalog.jsonb;
  roles_before pg_catalog.jsonb;
  table_security_before pg_catalog.jsonb;
  added_membership pg_catalog.bool := false;
  observed pg_catalog.jsonb;
BEGIN
  IF session_user<>'postgres' OR current_user<>'postgres'
     OR pg_catalog.current_setting('server_version_num')::pg_catalog.int4 NOT BETWEEN 170000 AND 179999
     OR writer IS NULL OR executor IS NULL OR rpc IS NULL OR bridge IS NULL
  THEN RAISE EXCEPTION '0010 executor, PostgreSQL version or prerequisite object mismatch'; END IF;
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261116000700','20261118000900'))<>2
     OR EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version>='20261118001000')
  THEN RAISE EXCEPTION '0010 migration history mismatch'; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE oid=writer
      AND NOT (rolsuper OR rolbypassrls OR rolcanlogin OR rolinherit OR rolcreatedb OR rolcreaterole OR rolreplication))
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members WHERE member=writer)
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members WHERE roleid=writer
                AND (member<>executor OR inherit_option))
     OR NOT pg_catalog.has_schema_privilege(writer,'public','USAGE')
     OR pg_catalog.has_schema_privilege(writer,'public','CREATE')
  THEN RAISE EXCEPTION '0010 identity writer boundary mismatch'; END IF;

  -- Require the two original 0007 function configurations, including ownership.
  IF (SELECT count(*) FROM pg_catalog.pg_proc p WHERE p.oid IN (rpc,bridge)
      AND p.proowner=CASE WHEN p.oid=rpc THEN writer ELSE executor END
      AND p.prokind='f' AND p.pronargs=0 AND p.prosecdef AND p.provolatile='v'
      AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
      AND p.prorettype=CASE WHEN p.oid=rpc THEN 'pg_catalog.text'::pg_catalog.regtype ELSE 'pg_catalog.uuid'::pg_catalog.regtype END
      AND pg_catalog.cardinality(p.proconfig)=2
      AND p.proconfig @> ARRAY['search_path=pg_catalog','row_security=on'])<>2
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p,
                LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
                WHERE p.oid IN (rpc,bridge) AND a.grantee<>p.proowner
                  AND NOT (p.oid=bridge AND a.grantee=writer AND a.privilege_type='EXECUTE' AND NOT a.is_grantable))
     OR pg_catalog.has_function_privilege('authenticated',rpc,'EXECUTE')
     OR pg_catalog.has_function_privilege('authenticated',bridge,'EXECUTE')
     OR NOT pg_catalog.has_function_privilege(writer,bridge,'EXECUTE')
  THEN RAISE EXCEPTION '0010 function configuration or ACL boundary mismatch'; END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_class
      WHERE oid IN ('identity.users'::pg_catalog.regclass,'identity.supabase_users'::pg_catalog.regclass)
        AND relowner=executor AND relrowsecurity AND relforcerowsecurity)<>2
  THEN RAISE EXCEPTION '0010 identity table RLS boundary mismatch'; END IF;

  -- Preserve every pg_proc field except the intended proconfig change, including
  -- bodies, owners, ACLs, security mode, signatures and volatility.
  SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p)-'proconfig' ORDER BY p.oid)
    INTO functions_before FROM pg_catalog.pg_proc p WHERE p.oid IN (rpc,bridge);
  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(m) ORDER BY m.oid),'[]'::pg_catalog.jsonb)
    INTO memberships_before FROM pg_catalog.pg_auth_members m WHERE m.roleid=writer OR m.member=writer;
  SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(r) ORDER BY r.oid)
    INTO roles_before FROM pg_catalog.pg_roles r WHERE r.oid IN (writer,executor);
  SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(c.oid,c.relowner,c.relacl,c.relrowsecurity,c.relforcerowsecurity) ORDER BY c.oid)
    INTO table_security_before FROM pg_catalog.pg_class c
    WHERE c.oid IN ('identity.users'::pg_catalog.regclass,'identity.supabase_users'::pg_catalog.regclass);

  IF pg_catalog.pg_has_role(current_user,writer,'USAGE') THEN
    -- An already owner-capable executor needs no extra membership.
    EXECUTE 'ALTER FUNCTION public.contratpro_provision_identity() SET search_path=pg_catalog,pg_temp';
  ELSE
    IF NOT pg_catalog.pg_has_role(session_user,writer,'SET') THEN
      -- 0007's provider-issued ADMIN-only membership permits this narrow grant.
      -- Never overwrite an existing postgres-grantor row or impersonate its provider grantor.
      IF NOT pg_catalog.pg_has_role(current_user,writer,'MEMBER WITH ADMIN OPTION')
         OR EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members
                    WHERE roleid=writer AND member=executor AND grantor=executor)
      THEN RAISE EXCEPTION '0010 requires existing SET access or ADMIN authority for a new temporary grant'; END IF;
      EXECUTE 'GRANT contratpro_identity_writer TO postgres WITH ADMIN FALSE, INHERIT FALSE, SET TRUE GRANTED BY postgres';
      added_membership:=true;
      IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members
                     WHERE roleid=writer AND member=executor AND grantor=executor
                       AND NOT admin_option AND NOT inherit_option AND set_option)
      THEN RAISE EXCEPTION '0010 temporary membership mismatch'; END IF;
    END IF;
    EXECUTE 'SET LOCAL ROLE contratpro_identity_writer';
    EXECUTE 'ALTER FUNCTION public.contratpro_provision_identity() SET search_path=pg_catalog,pg_temp';
    EXECUTE 'SET LOCAL ROLE postgres';
  END IF;

  IF current_user<>'postgres' THEN RAISE EXCEPTION '0010 executor restoration failed'; END IF;
  EXECUTE 'ALTER FUNCTION app_private.provisioning_subject() SET search_path=pg_catalog,pg_temp';
  IF added_membership THEN
    EXECUTE 'REVOKE contratpro_identity_writer FROM postgres GRANTED BY postgres RESTRICT';
  END IF;

  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(m) ORDER BY m.oid),'[]'::pg_catalog.jsonb)
    INTO observed FROM pg_catalog.pg_auth_members m WHERE m.roleid=writer OR m.member=writer;
  IF observed IS DISTINCT FROM memberships_before THEN RAISE EXCEPTION '0010 final membership baseline mismatch'; END IF;
  SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(r) ORDER BY r.oid)
    INTO observed FROM pg_catalog.pg_roles r WHERE r.oid IN (writer,executor);
  IF observed IS DISTINCT FROM roles_before THEN RAISE EXCEPTION '0010 owner role attributes changed'; END IF;
  SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p)-'proconfig' ORDER BY p.oid)
    INTO observed FROM pg_catalog.pg_proc p WHERE p.oid IN (rpc,bridge);
  IF observed IS DISTINCT FROM functions_before THEN RAISE EXCEPTION '0010 function body, owner or ACL changed'; END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_proc p WHERE p.oid IN (rpc,bridge)
      AND pg_catalog.cardinality(p.proconfig)=2
      AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'])<>2
     OR pg_catalog.has_function_privilege('authenticated',rpc,'EXECUTE')
     OR pg_catalog.has_function_privilege('authenticated',bridge,'EXECUTE')
  THEN RAISE EXCEPTION '0010 final function settings or activation boundary mismatch'; END IF;
  SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(c.oid,c.relowner,c.relacl,c.relrowsecurity,c.relforcerowsecurity) ORDER BY c.oid)
    INTO observed FROM pg_catalog.pg_class c
    WHERE c.oid IN ('identity.users'::pg_catalog.regclass,'identity.supabase_users'::pg_catalog.regclass);
  IF observed IS DISTINCT FROM table_security_before THEN RAISE EXCEPTION '0010 table security changed'; END IF;
END;
$migration_0010$;

-- Only record success after temporary authority is removed and all checks pass.
INSERT INTO supabase_migrations.schema_migrations(version)
VALUES ('20261118001000');
COMMIT;
