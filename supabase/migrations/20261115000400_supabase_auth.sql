-- P2.2A DRAFT ONLY: apply separately after all three native foundation migrations.
-- postgres is a migration executor only, never the application connection identity.
DO $guard$
BEGIN
  IF session_user <> 'postgres' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'ContratPro auth migration identity mismatch';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated'
    AND (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole)) THEN
    RAISE EXCEPTION 'ContratPro auth role must be restricted';
  END IF;
END;
$guard$;

-- Mapping is provisioned by a separately authorized trusted workflow, not a callback.
-- Explicit one-to-one link: neither email nor UUID equality establishes this mapping.
CREATE TABLE identity.supabase_users (
  supabase_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL UNIQUE REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE identity.supabase_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.supabase_users FORCE ROW LEVEL SECURITY;
REVOKE ALL ON identity.supabase_users FROM PUBLIC, anon, authenticated, service_role,
  contratpro_runtime, contratpro_platform_runtime;
GRANT USAGE ON SCHEMA identity, tenancy TO authenticated;
GRANT SELECT (supabase_user_id, user_id) ON identity.supabase_users TO authenticated;
GRANT SELECT (id, state) ON identity.users TO authenticated;
GRANT SELECT (id, agency_id, user_id, state) ON tenancy.memberships TO authenticated;
GRANT SELECT (id, name, state) ON tenancy.agencies TO authenticated;

CREATE POLICY supabase_mapping_self_read ON identity.supabase_users
  FOR SELECT TO authenticated USING (supabase_user_id = (SELECT auth.uid()));
CREATE POLICY supabase_canonical_self_read ON identity.users
  FOR SELECT TO authenticated USING (id IN
    (SELECT link.user_id FROM identity.supabase_users AS link
      WHERE link.supabase_user_id = (SELECT auth.uid())));
-- This separately scoped self-discovery path does not change the tenant-GUC policies
-- of contratpro_runtime or grant any agency business-table/write permission.
CREATE POLICY supabase_memberships_self_read ON tenancy.memberships
  FOR SELECT TO authenticated USING (user_id IN
    (SELECT link.user_id FROM identity.supabase_users AS link
      JOIN identity.users AS u ON u.id = link.user_id AND u.state = 'active'
      WHERE link.supabase_user_id = (SELECT auth.uid())));
CREATE POLICY supabase_agencies_self_read ON tenancy.agencies
  FOR SELECT TO authenticated USING (EXISTS
    (SELECT 1 FROM tenancy.memberships AS m
      WHERE m.agency_id = tenancy.agencies.id AND m.state = 'active'));

-- PUBLIC API surface is a fixed read-only function, executing AS THE CALLER with RLS.
-- No SECURITY DEFINER, SQL identity impersonation, parameters or privilege bypass.
CREATE FUNCTION public.contratpro_auth_access()
RETURNS TABLE (supabase_user_id uuid, user_id uuid, user_state text,
  membership_id uuid, agency_id uuid, agency_name text, membership_state text, agency_state text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog
AS $function$
  SELECT link.supabase_user_id, u.id, u.state, m.id, m.agency_id, a.name, m.state, a.state
  FROM identity.supabase_users AS link
  JOIN identity.users AS u ON u.id = link.user_id
  LEFT JOIN tenancy.memberships AS m ON m.user_id = u.id
  LEFT JOIN tenancy.agencies AS a ON a.id = m.agency_id
  WHERE link.supabase_user_id = (SELECT auth.uid())
  ORDER BY m.id NULLS FIRST
  LIMIT 101
$function$;
REVOKE ALL ON FUNCTION public.contratpro_auth_access() FROM PUBLIC, anon, authenticated,
  service_role, contratpro_runtime, contratpro_platform_runtime;
GRANT EXECUTE ON FUNCTION public.contratpro_auth_access() TO authenticated;

DO $acl$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c
    WHERE c.oid = 'identity.supabase_users'::regclass
      AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity OR c.relowner <> 'postgres'::regrole))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid = 'public.contratpro_auth_access()'::regprocedure
        AND (p.prosecdef OR p.proowner <> 'postgres'::regrole))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p,
      LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f',p.proowner))) acl
      WHERE p.oid = 'public.contratpro_auth_access()'::regprocedure
        AND acl.grantee <> p.proowner
        AND NOT (acl.grantee = 'authenticated'::regrole AND acl.privilege_type = 'EXECUTE' AND NOT acl.is_grantable))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_class c,
      LATERAL pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r',c.relowner))) acl
      WHERE c.oid = 'identity.supabase_users'::regclass AND acl.grantee <> c.relowner)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_attribute col,
      LATERAL pg_catalog.aclexplode(col.attacl) acl
      WHERE col.attrelid = 'identity.supabase_users'::regclass
        AND NOT (acl.grantee = 'authenticated'::regrole AND acl.privilege_type = 'SELECT'
          AND col.attname IN ('supabase_user_id','user_id') AND NOT acl.is_grantable))
  THEN RAISE EXCEPTION 'ContratPro auth ACL mismatch';
  END IF;
END;
$acl$;
