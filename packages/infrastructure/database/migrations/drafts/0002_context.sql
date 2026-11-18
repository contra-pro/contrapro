-- DRAFT ONLY. No SECURITY DEFINER functions or authentication implementation.
BEGIN;
SET LOCAL ROLE contratpro_migration_owner;

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
COMMIT;
