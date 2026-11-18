-- ContratPro native foundation 2; pending, NOT authorized for execution.
-- Execute as postgres inside the native runner's verified atomic migration transaction.
-- No custom owner provisioning; no global default privilege changes.
DO $native_guard$
BEGIN
  IF session_user <> 'postgres' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'ContratPro native migration requires postgres';
  END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_roles WHERE rolname IN
    ('contratpro_runtime','contratpro_platform_runtime')) <> 2
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname IN
      ('contratpro_runtime','contratpro_platform_runtime')
      AND (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit OR rolreplication OR rolbypassrls))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles r ON r.oid=m.member
      WHERE r.rolname IN ('contratpro_runtime','contratpro_platform_runtime'))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m
      JOIN pg_catalog.pg_roles r ON r.oid=m.roleid JOIN pg_catalog.pg_roles u ON u.oid=m.member
      WHERE r.rolname IN ('contratpro_runtime','contratpro_platform_runtime')
      AND (u.rolname<>'postgres' OR NOT m.admin_option OR m.inherit_option OR m.set_option))
  THEN RAISE EXCEPTION 'ContratPro restricted runtime baseline mismatch';
  END IF;
END;
$native_guard$;


CREATE FUNCTION app_private.context_uuid(setting_name text) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = pg_catalog
AS $$
BEGIN
  IF setting_name NOT IN ('contratpro.user_id', 'contratpro.agency_id') THEN
    RETURN NULL;
  END IF;
  RETURN NULLIF(current_setting(setting_name, true), '')::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

-- Reads self membership only. It never queries agencies or permission-protected tables.
CREATE FUNCTION app_private.active_membership_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog
AS $$
  SELECT m.id
  FROM tenancy.memberships AS m
  JOIN identity.users AS u ON u.id = m.user_id
  WHERE m.agency_id = app_private.context_uuid('contratpro.agency_id')
    AND m.user_id = app_private.context_uuid('contratpro.user_id')
    AND m.state = 'active' AND u.state = 'active'
$$;

-- Agency policy depends on active_membership_id(), never on this function itself.
CREATE FUNCTION app_private.tenant_is_active() RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenancy.agencies AS a
    WHERE a.id = app_private.context_uuid('contratpro.agency_id')
      AND a.state = 'active'
      AND app_private.active_membership_id() IS NOT NULL
  )
$$;

-- Role-join table policies depend on tenant_is_active(), not has_permission().
CREATE FUNCTION app_private.has_permission(permission_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog
AS $$
  SELECT app_private.tenant_is_active() AND EXISTS (
    SELECT 1 FROM tenancy.membership_roles AS mr
    JOIN tenancy.role_permissions AS rp
      ON rp.agency_id = mr.agency_id AND rp.role_id = mr.role_id
    WHERE mr.agency_id = app_private.context_uuid('contratpro.agency_id')
      AND mr.membership_id = app_private.active_membership_id()
      AND rp.permission_key = permission_name
  )
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_private FROM PUBLIC, contratpro_runtime, contratpro_platform_runtime;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_private FROM PUBLIC, anon, authenticated, service_role, contratpro_runtime, contratpro_platform_runtime;

-- Reject inherited/default ACL surprises, including unlisted grantees.
DO $native_acl$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n WHERE n.nspname IN
    ('identity','tenancy','platform','app_private') AND n.nspowner <> 'postgres'::regrole)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('identity','tenancy','platform','app_private') AND c.relowner <> 'postgres'::regrole)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='app_private' AND p.proowner <> 'postgres'::regrole)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n,
      LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) a
      WHERE n.nspname IN ('identity','tenancy','platform','app_private') AND a.grantee<>n.nspowner
      AND NOT (false))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace,
      LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
      WHERE n.nspname IN ('identity','tenancy','platform') AND c.relkind='r' AND a.grantee<>c.relowner
      AND NOT (false))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
      LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      WHERE n.nspname='app_private' AND a.grantee<>p.proowner
      AND NOT (false))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_attribute c
      JOIN pg_catalog.pg_class t ON t.oid=c.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace,
      LATERAL pg_catalog.aclexplode(c.attacl) a
      WHERE n.nspname IN ('identity','tenancy','platform') AND c.attnum>0 AND NOT c.attisdropped
      AND NOT (false))
  THEN RAISE EXCEPTION 'ContratPro native ownership or ACL mismatch';
  END IF;
END;
$native_acl$;
