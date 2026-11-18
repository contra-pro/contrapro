-- P2.3 DRAFT ONLY. Requires native foundation 0001-0003 and Supabase Auth 0004.
-- No execution is authorized. Native tooling must own one atomic file transaction.
DO $guard$
BEGIN
  IF session_user <> 'postgres' OR current_user <> 'postgres' THEN RAISE EXCEPTION 'Migration identity mismatch'; END IF;
END;
$guard$;

ALTER TABLE tenancy.agencies
  ADD COLUMN ice text,
  ADD COLUMN if_number text,
  ADD COLUMN rc text,
  ADD COLUMN address text,
  ADD COLUMN city text,
  ADD COLUMN phone text,
  ADD COLUMN email text,
  ADD COLUMN created_by_user_id uuid REFERENCES identity.users(id) ON DELETE RESTRICT,
  ADD COLUMN creation_key uuid,
  ADD CONSTRAINT agencies_creation_unique UNIQUE (created_by_user_id, creation_key),
  ADD CONSTRAINT agencies_creation_pair CHECK ((created_by_user_id IS NULL) = (creation_key IS NULL)),
  ADD CONSTRAINT agencies_ice_check CHECK (ice IS NULL OR ice ~ '^[0-9]{15}$'),
  ADD CONSTRAINT agencies_if_check CHECK (if_number IS NULL OR if_number ~ '^[0-9]{1,20}$'),
  ADD CONSTRAINT agencies_rc_check CHECK (rc IS NULL OR length(rc) BETWEEN 1 AND 50),
  ADD CONSTRAINT agencies_address_check CHECK (address IS NULL OR length(address) BETWEEN 1 AND 400),
  ADD CONSTRAINT agencies_city_check CHECK (city IS NULL OR length(city) BETWEEN 1 AND 100),
  ADD CONSTRAINT agencies_phone_check CHECK (phone IS NULL OR phone ~ '^\+?[0-9]{8,15}$'),
  ADD CONSTRAINT agencies_email_check CHECK (email IS NULL OR (length(email) BETWEEN 3 AND 320 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));

-- A function capability owner, never a login or table owner; FORCE RLS still applies.
CREATE ROLE contratpro_agency_writer NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
-- Temporary migration-only SET authority; provider-issued memberships are not changed.
GRANT contratpro_agency_writer TO postgres WITH ADMIN FALSE, INHERIT FALSE, SET TRUE GRANTED BY postgres;
GRANT USAGE ON SCHEMA identity, tenancy, app_private, auth, public TO contratpro_agency_writer;
GRANT CREATE ON SCHEMA public TO contratpro_agency_writer;
GRANT EXECUTE ON FUNCTION auth.uid() TO contratpro_agency_writer;
GRANT SELECT (supabase_user_id,user_id) ON identity.supabase_users TO contratpro_agency_writer;
GRANT SELECT (id,state) ON identity.users TO contratpro_agency_writer;
GRANT SELECT ON tenancy.agencies, tenancy.memberships, tenancy.roles, tenancy.membership_roles,
  tenancy.role_permissions, tenancy.agency_settings TO contratpro_agency_writer;
GRANT INSERT (id,name,state,ice,if_number,rc,address,city,phone,email,created_by_user_id,creation_key)
  ON tenancy.agencies TO contratpro_agency_writer;
GRANT UPDATE (name,ice,if_number,rc,address,city,phone,email) ON tenancy.agencies TO contratpro_agency_writer;
GRANT INSERT (id,agency_id,user_id,state) ON tenancy.memberships TO contratpro_agency_writer;
GRANT INSERT (id,agency_id,key,name) ON tenancy.roles TO contratpro_agency_writer;
GRANT INSERT (agency_id,membership_id,role_id) ON tenancy.membership_roles TO contratpro_agency_writer;
GRANT INSERT (agency_id,role_id,permission_key) ON tenancy.role_permissions TO contratpro_agency_writer;
GRANT INSERT (agency_id,default_locale,time_zone,currency), UPDATE (default_locale,time_zone,currency)
  ON tenancy.agency_settings TO contratpro_agency_writer;
GRANT INSERT (agency_id,actor_membership_id,action,request_id,metadata)
  ON tenancy.audit_events TO contratpro_agency_writer;
INSERT INTO tenancy.permissions(key,description) VALUES ('agency.manage','Manage own agency profile and defaults') ON CONFLICT (key) DO NOTHING;

CREATE POLICY writer_mapping ON identity.supabase_users FOR SELECT TO contratpro_agency_writer
  USING (supabase_user_id = (SELECT auth.uid()));
CREATE POLICY writer_user ON identity.users FOR SELECT TO contratpro_agency_writer
  USING (id IN (SELECT user_id FROM identity.supabase_users WHERE supabase_user_id = (SELECT auth.uid())));
CREATE FUNCTION app_private.canonical_auth_user() RETURNS uuid
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $f$
  SELECT u.id FROM identity.supabase_users link JOIN identity.users u ON u.id=link.user_id
  WHERE link.supabase_user_id=(SELECT auth.uid()) AND u.state='active'
$f$;
-- SET search_path prevents SQL-function inlining. The helper's separate SELECT
-- uses only self-read policies, not the INSERT policy that bootstraps membership.
CREATE FUNCTION app_private.agency_owner(target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $f$
  SELECT EXISTS (SELECT 1 FROM tenancy.memberships m
    JOIN tenancy.membership_roles mr ON mr.agency_id=m.agency_id AND mr.membership_id=m.id
    JOIN tenancy.roles r ON r.agency_id=mr.agency_id AND r.id=mr.role_id
    JOIN tenancy.role_permissions rp ON rp.agency_id=r.agency_id AND rp.role_id=r.id
    WHERE m.agency_id=target AND m.user_id=app_private.canonical_auth_user() AND m.state='active'
      AND r.key='owner' AND rp.permission_key='agency.manage')
$f$;
CREATE POLICY writer_membership_read ON tenancy.memberships FOR SELECT TO contratpro_agency_writer
  USING (user_id=app_private.canonical_auth_user());
CREATE POLICY writer_agency_read ON tenancy.agencies FOR SELECT TO contratpro_agency_writer
  USING (created_by_user_id=app_private.canonical_auth_user() OR app_private.agency_owner(id));
CREATE POLICY writer_agency_insert ON tenancy.agencies FOR INSERT TO contratpro_agency_writer
  WITH CHECK (created_by_user_id=app_private.canonical_auth_user() AND creation_key IS NOT NULL AND state='active');
CREATE POLICY writer_membership_insert ON tenancy.memberships FOR INSERT TO contratpro_agency_writer
  WITH CHECK (user_id=app_private.canonical_auth_user() AND state='active' AND EXISTS
    (SELECT 1 FROM tenancy.agencies a WHERE a.id=agency_id AND a.created_by_user_id=app_private.canonical_auth_user()));
CREATE POLICY writer_role_read ON tenancy.roles FOR SELECT TO contratpro_agency_writer
  USING (agency_id IN (SELECT agency_id FROM tenancy.memberships WHERE state='active'));
CREATE POLICY writer_role_insert ON tenancy.roles FOR INSERT TO contratpro_agency_writer
  WITH CHECK (key='owner' AND EXISTS (SELECT 1 FROM tenancy.agencies a WHERE a.id=agency_id AND a.created_by_user_id=app_private.canonical_auth_user()));
CREATE POLICY writer_member_role_read ON tenancy.membership_roles FOR SELECT TO contratpro_agency_writer
  USING (EXISTS (SELECT 1 FROM tenancy.memberships m WHERE m.id=membership_id AND m.agency_id=tenancy.membership_roles.agency_id AND m.state='active'));
CREATE POLICY writer_member_role_insert ON tenancy.membership_roles FOR INSERT TO contratpro_agency_writer
  WITH CHECK (EXISTS (SELECT 1 FROM tenancy.memberships m JOIN tenancy.roles r ON r.agency_id=m.agency_id
    JOIN tenancy.agencies a ON a.id=m.agency_id WHERE m.id=membership_id AND m.agency_id=tenancy.membership_roles.agency_id
    AND r.id=role_id AND r.key='owner' AND a.created_by_user_id=app_private.canonical_auth_user()));
CREATE POLICY writer_permission_read ON tenancy.role_permissions FOR SELECT TO contratpro_agency_writer
  USING (agency_id IN (SELECT agency_id FROM tenancy.memberships WHERE state='active'));
CREATE POLICY writer_permission_insert ON tenancy.role_permissions FOR INSERT TO contratpro_agency_writer
  WITH CHECK (permission_key='agency.manage' AND EXISTS (SELECT 1 FROM tenancy.roles r JOIN tenancy.agencies a ON a.id=r.agency_id
    WHERE r.id=role_id AND r.agency_id=tenancy.role_permissions.agency_id AND r.key='owner' AND a.created_by_user_id=app_private.canonical_auth_user()));

-- Authenticated readers see only their own role assignments/agency, never write grants.
GRANT SELECT (ice,if_number,rc,address,city,phone,email) ON tenancy.agencies TO authenticated;
GRANT SELECT (id,agency_id,key) ON tenancy.roles TO authenticated;
GRANT SELECT ON tenancy.membership_roles, tenancy.role_permissions, tenancy.agency_settings TO authenticated;
CREATE POLICY auth_role_read ON tenancy.roles FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM tenancy.memberships WHERE state='active'));
CREATE POLICY auth_member_role_read ON tenancy.membership_roles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tenancy.memberships m WHERE m.id=membership_id AND m.agency_id=tenancy.membership_roles.agency_id AND m.state='active'));
CREATE POLICY auth_permission_read ON tenancy.role_permissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tenancy.membership_roles mr WHERE mr.role_id=tenancy.role_permissions.role_id AND mr.agency_id=tenancy.role_permissions.agency_id));
CREATE POLICY auth_settings_read ON tenancy.agency_settings FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM tenancy.memberships WHERE state='active'));

CREATE POLICY writer_agency_update ON tenancy.agencies FOR UPDATE TO contratpro_agency_writer
  USING (state='active' AND app_private.agency_owner(id)) WITH CHECK (state='active' AND app_private.agency_owner(id));
CREATE POLICY writer_settings_read ON tenancy.agency_settings FOR SELECT TO contratpro_agency_writer
  USING (agency_id IN (SELECT agency_id FROM tenancy.memberships WHERE state='active'));
CREATE POLICY writer_settings_insert ON tenancy.agency_settings FOR INSERT TO contratpro_agency_writer
  WITH CHECK (app_private.agency_owner(agency_id));
CREATE POLICY writer_settings_update ON tenancy.agency_settings FOR UPDATE TO contratpro_agency_writer
  USING (app_private.agency_owner(agency_id)) WITH CHECK (app_private.agency_owner(agency_id));
CREATE POLICY writer_audit ON tenancy.audit_events FOR INSERT TO contratpro_agency_writer
  WITH CHECK (app_private.agency_owner(agency_id) AND EXISTS (SELECT 1 FROM tenancy.memberships m
    WHERE m.id=actor_membership_id AND m.agency_id=tenancy.audit_events.agency_id AND m.user_id=app_private.canonical_auth_user() AND m.state='active'));

CREATE FUNCTION app_private.valid_agency_profile(p jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog AS $f$
 SELECT COALESCE(jsonb_typeof(p)='object'
 AND NOT EXISTS (SELECT 1 FROM jsonb_each(p) e WHERE e.key NOT IN ('name','ice','ifNumber','rc','address','city','phone','email')
   OR jsonb_typeof(e.value) NOT IN ('string','null') OR (e.value #>> '{}') ~ '[[:cntrl:]]')
 AND length(btrim(p->>'name')) BETWEEN 1 AND 200
 AND length(btrim(p->>'address')) BETWEEN 1 AND 400 AND length(btrim(p->>'city')) BETWEEN 1 AND 100
 AND (p->>'phone') ~ '^\+?[0-9]{8,15}$'
 AND length(p->>'email') BETWEEN 3 AND 320 AND (p->>'email') ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 AND (COALESCE(p->>'ice','')='' OR (p->>'ice') ~ '^[0-9]{15}$')
 AND (COALESCE(p->>'ifNumber','')='' OR (p->>'ifNumber') ~ '^[0-9]{1,20}$')
 AND length(COALESCE(p->>'rc',''))<=50, false)
$f$;

CREATE FUNCTION public.contratpro_create_agency(p_profile jsonb,p_locale text,p_request_id uuid)
RETURNS TABLE(agency_id uuid,user_id uuid,membership_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET row_security=on AS $f$
DECLARE actor uuid:=app_private.canonical_auth_user(); aid uuid; mid uuid; rid uuid;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF NOT app_private.valid_agency_profile(p_profile) OR p_locale NOT IN ('fr','ar') OR p_request_id IS NULL THEN RAISE EXCEPTION 'Invalid input' USING ERRCODE='22023'; END IF;
 INSERT INTO tenancy.agencies(name,state,ice,if_number,rc,address,city,phone,email,created_by_user_id,creation_key)
 VALUES(btrim(p_profile->>'name'),'active',NULLIF(p_profile->>'ice',''),NULLIF(p_profile->>'ifNumber',''),NULLIF(p_profile->>'rc',''),
   btrim(p_profile->>'address'),btrim(p_profile->>'city'),p_profile->>'phone',lower(p_profile->>'email'),actor,p_request_id)
 ON CONFLICT (created_by_user_id,creation_key) DO NOTHING RETURNING id INTO aid;
 IF aid IS NULL THEN
   SELECT a.id INTO aid FROM tenancy.agencies a WHERE a.created_by_user_id=actor AND a.creation_key=p_request_id AND a.state='active';
   IF aid IS NULL OR NOT app_private.agency_owner(aid) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
   SELECT m.id INTO mid FROM tenancy.memberships m WHERE m.agency_id=aid AND m.user_id=actor AND m.state='active';
   RETURN QUERY SELECT aid,actor,mid; RETURN;
 END IF;
 mid:=gen_random_uuid(); rid:=gen_random_uuid();
 INSERT INTO tenancy.memberships(id,agency_id,user_id,state) VALUES(mid,aid,actor,'active');
 INSERT INTO tenancy.roles(id,agency_id,key,name) VALUES(rid,aid,'owner','Owner');
 INSERT INTO tenancy.membership_roles(agency_id,membership_id,role_id) VALUES(aid,mid,rid);
 INSERT INTO tenancy.role_permissions(agency_id,role_id,permission_key) VALUES(aid,rid,'agency.manage');
 INSERT INTO tenancy.agency_settings(agency_id,default_locale,time_zone,currency) VALUES(aid,p_locale,'Africa/Casablanca','MAD');
 INSERT INTO tenancy.audit_events(agency_id,actor_membership_id,action,request_id,metadata) VALUES(aid,mid,'agency.created',p_request_id,'{}'::jsonb);
 RETURN QUERY SELECT aid,actor,mid;
END;
$f$;

CREATE FUNCTION public.contratpro_update_agency(p_agency_id uuid,p_profile jsonb,p_request_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET row_security=on AS $f$
DECLARE mid uuid;
BEGIN
 IF NOT app_private.agency_owner(p_agency_id) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF NOT app_private.valid_agency_profile(p_profile) OR p_request_id IS NULL THEN RAISE EXCEPTION 'Invalid input' USING ERRCODE='22023'; END IF;
 UPDATE tenancy.agencies SET name=btrim(p_profile->>'name'),ice=NULLIF(p_profile->>'ice',''),if_number=NULLIF(p_profile->>'ifNumber',''),rc=NULLIF(p_profile->>'rc',''),
   address=btrim(p_profile->>'address'),city=btrim(p_profile->>'city'),phone=p_profile->>'phone',email=lower(p_profile->>'email')
 WHERE id=p_agency_id AND state='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 SELECT id INTO mid FROM tenancy.memberships WHERE agency_id=p_agency_id AND user_id=app_private.canonical_auth_user() AND state='active';
 INSERT INTO tenancy.audit_events(agency_id,actor_membership_id,action,request_id,metadata) VALUES(p_agency_id,mid,'agency.updated',p_request_id,'{}'::jsonb);
 RETURN true;
END;
$f$;

CREATE FUNCTION public.contratpro_update_agency_settings(p_agency_id uuid,p_settings jsonb,p_request_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET row_security=on AS $f$
DECLARE mid uuid;
BEGIN
 IF NOT app_private.agency_owner(p_agency_id) OR NOT EXISTS (SELECT 1 FROM tenancy.agencies WHERE id=p_agency_id AND state='active') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_settings)<>'object' OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_settings) k WHERE k NOT IN ('defaultLocale','timeZone','currency'))
   OR COALESCE(p_settings->>'defaultLocale','') NOT IN ('fr','ar') OR COALESCE(p_settings->>'timeZone','') NOT IN ('Africa/Casablanca','UTC')
   OR COALESCE(p_settings->>'currency','')<>'MAD' OR p_request_id IS NULL THEN RAISE EXCEPTION 'Invalid input' USING ERRCODE='22023'; END IF;
 INSERT INTO tenancy.agency_settings(agency_id,default_locale,time_zone,currency)
 VALUES(p_agency_id,p_settings->>'defaultLocale',p_settings->>'timeZone','MAD')
 ON CONFLICT (agency_id) DO UPDATE SET default_locale=EXCLUDED.default_locale,time_zone=EXCLUDED.time_zone,currency=EXCLUDED.currency;
 SELECT id INTO mid FROM tenancy.memberships WHERE agency_id=p_agency_id AND user_id=app_private.canonical_auth_user() AND state='active';
 INSERT INTO tenancy.audit_events(agency_id,actor_membership_id,action,request_id,metadata) VALUES(p_agency_id,mid,'agency.settings_updated',p_request_id,'{}'::jsonb);
 RETURN true;
END;
$f$;

GRANT USAGE ON SCHEMA app_private TO authenticated;
REVOKE ALL ON FUNCTION app_private.canonical_auth_user(),app_private.agency_owner(uuid),app_private.valid_agency_profile(jsonb)
 FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime;
GRANT EXECUTE ON FUNCTION app_private.canonical_auth_user(),app_private.agency_owner(uuid) TO authenticated,contratpro_agency_writer;
GRANT EXECUTE ON FUNCTION app_private.valid_agency_profile(jsonb) TO contratpro_agency_writer;
-- Harden ACLs while postgres still owns these functions. The temporary SET-only,
-- INHERIT FALSE membership does not inherit the new owner's grant authority.
REVOKE ALL ON FUNCTION public.contratpro_create_agency(jsonb,text,uuid),public.contratpro_update_agency(uuid,jsonb,uuid),public.contratpro_update_agency_settings(uuid,jsonb,uuid)
 FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime;
GRANT EXECUTE ON FUNCTION public.contratpro_create_agency(jsonb,text,uuid),public.contratpro_update_agency(uuid,jsonb,uuid),public.contratpro_update_agency_settings(uuid,jsonb,uuid) TO authenticated;
ALTER FUNCTION public.contratpro_create_agency(jsonb,text,uuid) OWNER TO contratpro_agency_writer;
ALTER FUNCTION public.contratpro_update_agency(uuid,jsonb,uuid) OWNER TO contratpro_agency_writer;
ALTER FUNCTION public.contratpro_update_agency_settings(uuid,jsonb,uuid) OWNER TO contratpro_agency_writer;
REVOKE CREATE ON SCHEMA public FROM contratpro_agency_writer;
REVOKE contratpro_agency_writer FROM postgres GRANTED BY postgres;

CREATE FUNCTION public.contratpro_agency_profile(p_agency_id uuid)
RETURNS TABLE(agency_id uuid,is_owner boolean,profile jsonb,settings jsonb)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $f$
 SELECT a.id,app_private.agency_owner(a.id),
 jsonb_build_object('name',a.name,'ice',a.ice,'ifNumber',a.if_number,'rc',a.rc,'address',a.address,'city',a.city,'phone',a.phone,'email',a.email),
 jsonb_build_object('defaultLocale',COALESCE(s.default_locale,'fr'),'timeZone',COALESCE(s.time_zone,'Africa/Casablanca'),'currency',COALESCE(s.currency,'MAD'))
 FROM tenancy.agencies a LEFT JOIN tenancy.agency_settings s ON s.agency_id=a.id
 WHERE a.id=p_agency_id AND a.state='active'
$f$;
REVOKE ALL ON FUNCTION public.contratpro_agency_profile(uuid) FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime;
GRANT EXECUTE ON FUNCTION public.contratpro_agency_profile(uuid) TO authenticated;

DO $assert$
DECLARE violations text[]; unexpected_acl jsonb;
BEGIN
 -- Preserve every rejection predicate; ACL diagnostics below are scoped and bounded.
 violations := array_remove(ARRAY[
 CASE WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='contratpro_agency_writer'
   AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolinherit OR rolreplication))
   THEN 'WRITER_ROLE_ATTRIBUTES' END,
 CASE WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname IN ('identity','tenancy') AND c.relkind='r'
     AND NOT(n.nspname='tenancy' AND c.relname='permissions') AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity))
   THEN 'FORCE_RLS' END,
 CASE WHEN pg_has_role('authenticated','contratpro_agency_writer','SET') THEN 'AUTHENTICATED_CAN_SET_WRITER' END,
 CASE WHEN pg_has_role('anon','contratpro_agency_writer','SET') THEN 'ANON_CAN_SET_WRITER' END,
 CASE WHEN pg_has_role('authenticator','contratpro_agency_writer','SET') THEN 'AUTHENTICATOR_CAN_SET_WRITER' END,
 CASE WHEN pg_has_role('contratpro_runtime','contratpro_agency_writer','SET') THEN 'RUNTIME_CAN_SET_WRITER' END,
 CASE WHEN pg_has_role('contratpro_platform_runtime','contratpro_agency_writer','SET') THEN 'PLATFORM_RUNTIME_CAN_SET_WRITER' END,
 CASE WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
   LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) acl
   WHERE n.nspname='public' AND p.proname IN ('contratpro_create_agency','contratpro_update_agency','contratpro_update_agency_settings','contratpro_agency_profile')
     AND acl.grantee<>p.proowner AND NOT(acl.grantee='authenticated'::regrole AND acl.privilege_type='EXECUTE' AND NOT acl.is_grantable))
   THEN 'PUBLIC_FUNCTION_ACL' END
 ],NULL);
 IF 'PUBLIC_FUNCTION_ACL'=ANY(violations) THEN
   SELECT jsonb_agg(jsonb_build_object(
     'function',entry.function_name,'identity_arguments',entry.identity_arguments,
     'grantee',entry.grantee_name,'privilege',entry.privilege_type,'grantable',entry.is_grantable)
     ORDER BY entry.function_name COLLATE "C",entry.identity_arguments COLLATE "C",
       entry.function_oid,entry.grantee_oid,entry.privilege_type COLLATE "C",entry.is_grantable,entry.grantor_oid)
   INTO unexpected_acl
   FROM (
     SELECT p.proname AS function_name,pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       CASE WHEN acl.grantee=0 THEN 'PUBLIC' ELSE COALESCE(r.rolname::text,'UNRESOLVED_ROLE_OID_'||acl.grantee::text) END AS grantee_name,
       acl.privilege_type,acl.is_grantable,p.oid AS function_oid,acl.grantee AS grantee_oid,acl.grantor AS grantor_oid
     FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
     CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) acl
     LEFT JOIN pg_catalog.pg_roles r ON r.oid=acl.grantee
     WHERE n.nspname='public' AND p.proname IN ('contratpro_create_agency','contratpro_update_agency','contratpro_update_agency_settings','contratpro_agency_profile')
       AND acl.grantee<>p.proowner AND NOT(acl.grantee='authenticated'::regrole AND acl.privilege_type='EXECUTE' AND NOT acl.is_grantable)
     ORDER BY p.proname COLLATE "C",pg_catalog.pg_get_function_identity_arguments(p.oid) COLLATE "C",
       p.oid,acl.grantee,acl.privilege_type COLLATE "C",acl.is_grantable,acl.grantor
     LIMIT 10
   ) entry;
 END IF;
 IF cardinality(violations)>0 THEN
  RAISE EXCEPTION 'Agency capability boundary mismatch'
      USING DETAIL = array_to_string(violations,',')||CASE WHEN unexpected_acl IS NULL THEN '' ELSE '; unexpected_acl='||unexpected_acl::text END,
       HINT = 'Fixed assertion identifiers describe the failed in-transaction boundary checks; rollback removes the new role and functions';
END IF;
END;
$assert$;
