-- OFFLINE DRAFT. Requires 0001-0006. Native tooling must own the atomic file transaction.
-- Deliberately unreachable by authenticated: activation requires a separate reviewed GRANT.
DO $guard$
BEGIN
 IF session_user<>'postgres' OR current_user<>'postgres' THEN RAISE EXCEPTION 'Migration identity mismatch'; END IF;
 IF NOT pg_catalog.has_schema_privilege('postgres','auth','USAGE') THEN RAISE EXCEPTION 'Auth context owner schema dependency mismatch'; END IF;
 -- Rely on existing managed PUBLIC EXECUTE, never delegate or modify helper ACLs.
 IF (SELECT count(*) FROM pg_catalog.pg_proc p
   WHERE p.oid IN (to_regprocedure('auth.uid()'),to_regprocedure('auth.role()'),to_regprocedure('auth.jwt()'))
     AND p.prokind='f' AND p.pronargs=0
     AND p.prorettype=CASE p.proname WHEN 'uid' THEN 'uuid'::regtype WHEN 'role' THEN 'text'::regtype ELSE 'jsonb'::regtype END
     AND pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE')
     AND EXISTS(SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) helper_acl
       WHERE helper_acl.grantee=0 AND helper_acl.privilege_type='EXECUTE'))<>3
 THEN RAISE EXCEPTION 'Auth helper PUBLIC EXECUTE dependency mismatch'; END IF;
END;
$guard$;

CREATE ROLE contratpro_identity_writer NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
GRANT contratpro_identity_writer TO postgres WITH ADMIN FALSE, INHERIT FALSE, SET TRUE GRANTED BY postgres;
GRANT USAGE ON SCHEMA identity,app_private,public TO contratpro_identity_writer;
GRANT CREATE ON SCHEMA public TO contratpro_identity_writer;
GRANT SELECT(id,state), INSERT(id,state) ON identity.users TO contratpro_identity_writer;
GRANT SELECT(supabase_user_id,user_id), INSERT(supabase_user_id,user_id) ON identity.supabase_users TO contratpro_identity_writer;

-- Data-free bridge: only this postgres-owned function needs existing auth USAGE.
-- Trust is the JWT-verifying PostgREST gateway and its protected authenticator login.
-- Request settings and managed helpers are NOT independent cryptographic proof.
CREATE FUNCTION app_private.provisioning_subject() RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog SET row_security=on AS $bridge$
DECLARE subject uuid; claims jsonb; claim_role text; expires numeric;
BEGIN
 IF session_user<>'authenticator'
   OR pg_catalog.current_setting('role',true) IS DISTINCT FROM 'authenticated'
 THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 subject:=auth.uid(); claim_role:=auth.role(); claims:=auth.jwt();
 IF subject IS NULL OR pg_catalog.jsonb_typeof(claims) IS DISTINCT FROM 'object'
 THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF pg_catalog.jsonb_typeof(claims->'sub') IS DISTINCT FROM 'string'
   OR pg_catalog.jsonb_typeof(claims->'role') IS DISTINCT FROM 'string'
   OR pg_catalog.jsonb_typeof(claims->'iss') IS DISTINCT FROM 'string'
   OR pg_catalog.jsonb_typeof(claims->'aud') IS DISTINCT FROM 'string'
   OR pg_catalog.jsonb_typeof(claims->'is_anonymous') IS DISTINCT FROM 'boolean'
   OR pg_catalog.jsonb_typeof(claims->'exp') IS DISTINCT FROM 'number'
 THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF claim_role IS DISTINCT FROM 'authenticated'
   OR (claims->>'role') IS DISTINCT FROM claim_role
   OR (claims->>'sub')::uuid IS DISTINCT FROM subject
   OR (claims->>'iss') IS DISTINCT FROM 'https://gllsiklbvqpxzucvkehw.supabase.co/auth/v1'
   OR (claims->>'aud') IS DISTINCT FROM 'authenticated'
   OR (claims->>'is_anonymous') IS DISTINCT FROM 'false'
 THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 expires:=(claims->>'exp')::numeric;
 IF expires<>pg_catalog.trunc(expires) OR expires<=0 OR expires>9007199254740
   OR expires<=EXTRACT(EPOCH FROM pg_catalog.clock_timestamp())
 THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 RETURN subject;
EXCEPTION WHEN OTHERS THEN
 -- Never expose malformed claims, helper errors or database details.
 RAISE EXCEPTION 'Denied' USING ERRCODE='42501';
END;
$bridge$;
-- Created by postgres, retained as postgres owner. No table reads or writes in body.
REVOKE ALL ON FUNCTION app_private.provisioning_subject() FROM PUBLIC,anon,authenticated,authenticator,service_role,contratpro_runtime,contratpro_platform_runtime,contratpro_agency_writer,contratpro_identity_writer;
GRANT EXECUTE ON FUNCTION app_private.provisioning_subject() TO contratpro_identity_writer;

CREATE POLICY identity_writer_mapping_read ON identity.supabase_users FOR SELECT TO contratpro_identity_writer
 USING(supabase_user_id=(SELECT app_private.provisioning_subject()));
CREATE POLICY identity_writer_user_read ON identity.users FOR SELECT TO contratpro_identity_writer
 USING(id IN (SELECT link.user_id FROM identity.supabase_users link WHERE link.supabase_user_id=(SELECT app_private.provisioning_subject())));
CREATE POLICY identity_writer_user_create ON identity.users FOR INSERT TO contratpro_identity_writer
 WITH CHECK(state='active' AND id<>(SELECT app_private.provisioning_subject()));
CREATE POLICY identity_writer_mapping_create ON identity.supabase_users FOR INSERT TO contratpro_identity_writer
 WITH CHECK(supabase_user_id=(SELECT app_private.provisioning_subject()) AND user_id<>supabase_user_id);

CREATE FUNCTION public.contratpro_provision_identity() RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog SET row_security=on AS $f$
DECLARE subject uuid:=app_private.provisioning_subject(); canonical uuid; canonical_state text;
BEGIN
 IF subject IS NULL THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;

 SELECT link.user_id INTO canonical FROM identity.supabase_users link WHERE link.supabase_user_id=subject;
 IF FOUND THEN
   SELECT u.state INTO canonical_state FROM identity.users u WHERE u.id=canonical;
   IF canonical=subject OR canonical_state IS DISTINCT FROM 'active' THEN RAISE EXCEPTION 'Canonical identity unavailable' USING ERRCODE='42501'; END IF;
   RETURN 'existing';
 END IF;

 canonical:=gen_random_uuid();
 IF canonical=subject THEN RAISE EXCEPTION 'Canonical identity conflict' USING ERRCODE='23514'; END IF;
 BEGIN
   -- No RETURNING: the new user is not readable under RLS until its link exists.
   INSERT INTO identity.users(id,state) VALUES(canonical,'active');
   INSERT INTO identity.supabase_users(supabase_user_id,user_id) VALUES(subject,canonical);
 EXCEPTION WHEN unique_violation THEN
   -- This subtransaction rolls back BOTH inserts, including the candidate user.
   -- At READ COMMITTED a concurrent winner is now visible; other isolation levels
   -- may fail closed. Never repair, relink or automatically retry a conflict.
   SELECT link.user_id INTO canonical FROM identity.supabase_users link WHERE link.supabase_user_id=subject;
   IF NOT FOUND THEN RAISE EXCEPTION 'Canonical identity conflict' USING ERRCODE='23514'; END IF;
   SELECT u.state INTO canonical_state FROM identity.users u WHERE u.id=canonical;
   IF canonical=subject OR canonical_state IS DISTINCT FROM 'active' THEN RAISE EXCEPTION 'Canonical identity unavailable' USING ERRCODE='42501'; END IF;
   RETURN 'existing';
 END;
 RETURN 'created';
END;
$f$;

-- Revoke as postgres BEFORE ownership transfer (SET-only membership is not inheritance).
REVOKE ALL ON FUNCTION public.contratpro_provision_identity() FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime,contratpro_agency_writer;
ALTER FUNCTION public.contratpro_provision_identity() OWNER TO contratpro_identity_writer;
REVOKE CREATE ON SCHEMA public FROM contratpro_identity_writer;
REVOKE contratpro_identity_writer FROM postgres GRANTED BY postgres;

DO $assert$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='contratpro_identity_writer')
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='contratpro_identity_writer'
   AND (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit OR rolreplication OR rolbypassrls))
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid IN ('identity.users'::regclass,'identity.supabase_users'::regclass)
   AND (NOT relrowsecurity OR NOT relforcerowsecurity OR relowner<>'postgres'::regrole))
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members WHERE member='contratpro_identity_writer'::regrole)
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members WHERE roleid='contratpro_identity_writer'::regrole
   AND (member<>'postgres'::regrole OR NOT admin_option OR inherit_option OR set_option))
 OR pg_has_role('authenticated','contratpro_identity_writer','SET')
 OR pg_has_role('anon','contratpro_identity_writer','SET')
 OR pg_has_role('authenticator','contratpro_identity_writer','SET')
 OR pg_has_role('service_role','contratpro_identity_writer','SET')
 OR pg_has_role('contratpro_runtime','contratpro_identity_writer','SET')
 OR pg_has_role('contratpro_platform_runtime','contratpro_identity_writer','SET')
 OR pg_has_role('contratpro_agency_writer','contratpro_identity_writer','SET')
 OR has_schema_privilege('contratpro_identity_writer','public','CREATE')
 OR NOT pg_catalog.has_schema_privilege('postgres','auth','USAGE')
 OR NOT pg_catalog.has_schema_privilege('contratpro_identity_writer','app_private','USAGE')
 OR (SELECT count(*) FROM pg_catalog.pg_proc p
   WHERE p.oid IN (to_regprocedure('auth.uid()'),to_regprocedure('auth.role()'),to_regprocedure('auth.jwt()'))
     AND p.prokind='f' AND p.pronargs=0
     AND p.prorettype=CASE p.proname WHEN 'uid' THEN 'uuid'::regtype WHEN 'role' THEN 'text'::regtype ELSE 'jsonb'::regtype END
     AND pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE')
     AND EXISTS(SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) helper_acl
       WHERE helper_acl.grantee=0 AND helper_acl.privilege_type='EXECUTE'))<>3
 OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid='app_private.provisioning_subject()'::regprocedure
   AND p.proowner='postgres'::regrole AND p.prokind='f' AND p.pronargs=0 AND p.prorettype='uuid'::regtype
   AND p.prosecdef AND p.provolatile='v'
   AND pg_catalog.cardinality(COALESCE(p.proconfig,'{}'::text[]))=2
   AND COALESCE(p.proconfig,'{}'::text[]) @> ARRAY['search_path=pg_catalog','row_security=on'])
 OR NOT pg_catalog.has_function_privilege('contratpro_identity_writer','app_private.provisioning_subject()','EXECUTE')
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_roles r
   WHERE r.rolname IN ('anon','authenticated','authenticator','service_role','contratpro_runtime','contratpro_platform_runtime','contratpro_agency_writer')
   AND pg_catalog.has_function_privilege(r.oid,'app_private.provisioning_subject()','EXECUTE'))
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc p,
   LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) acl
   WHERE p.oid='app_private.provisioning_subject()'::regprocedure AND acl.grantee<>p.proowner
     AND NOT(acl.grantee='contratpro_identity_writer'::regrole AND acl.privilege_type='EXECUTE' AND NOT acl.is_grantable))
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc p,
   LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) acl
   WHERE p.oid='public.contratpro_provision_identity()'::regprocedure
     AND (NOT p.prosecdef OR p.proowner<>'contratpro_identity_writer'::regrole
       OR NOT(COALESCE(p.proconfig,'{}'::text[]) @> ARRAY['search_path=pg_catalog','row_security=on'])
       OR acl.grantee<>p.proowner))
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace,
   LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) acl
   WHERE n.nspname IN ('identity','tenancy','platform','migration_control') AND acl.grantee='contratpro_identity_writer'::regrole)
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_attribute col,
   LATERAL pg_catalog.aclexplode(col.attacl) acl
   WHERE acl.grantee='contratpro_identity_writer'::regrole
     AND NOT(acl.privilege_type IN ('SELECT','INSERT') AND NOT acl.is_grantable AND (
       (col.attrelid='identity.users'::regclass AND col.attname IN ('id','state')) OR
       (col.attrelid='identity.supabase_users'::regclass AND col.attname IN ('supabase_user_id','user_id')))))
 THEN RAISE EXCEPTION 'Canonical provisioning boundary mismatch'; END IF;
END;
$assert$;
