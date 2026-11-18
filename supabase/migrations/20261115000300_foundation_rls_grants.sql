-- ContratPro native foundation 3; pending, NOT authorized for execution.
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

REVOKE ALL ON ALL TABLES IN SCHEMA identity, tenancy, platform FROM PUBLIC, anon, authenticated, service_role, contratpro_runtime, contratpro_platform_runtime;
REVOKE ALL ON SCHEMA identity, tenancy, platform, app_private FROM PUBLIC, anon, authenticated, service_role, contratpro_runtime, contratpro_platform_runtime;
GRANT USAGE ON SCHEMA identity, tenancy, app_private TO contratpro_runtime;
GRANT EXECUTE ON FUNCTION app_private.context_uuid(text), app_private.active_membership_id(), app_private.tenant_is_active(), app_private.has_permission(text) TO contratpro_runtime;

CREATE POLICY users_self_read ON identity.users FOR SELECT TO contratpro_runtime
USING (id = app_private.context_uuid('contratpro.user_id') AND state = 'active');

-- Non-recursive root: does not query memberships or agencies.
CREATE POLICY memberships_self_read ON tenancy.memberships FOR SELECT TO contratpro_runtime
USING (agency_id = app_private.context_uuid('contratpro.agency_id')
  AND user_id = app_private.context_uuid('contratpro.user_id') AND state = 'active'
  AND EXISTS (SELECT 1 FROM identity.users AS u WHERE u.id = tenancy.memberships.user_id AND u.state = 'active'));

CREATE POLICY agencies_member_read ON tenancy.agencies FOR SELECT TO contratpro_runtime
USING (id = app_private.context_uuid('contratpro.agency_id') AND state = 'active'
  AND app_private.active_membership_id() IS NOT NULL);

CREATE POLICY roles_tenant_read ON tenancy.roles FOR SELECT TO contratpro_runtime
USING (agency_id = app_private.context_uuid('contratpro.agency_id') AND app_private.tenant_is_active());
CREATE POLICY role_permissions_tenant_read ON tenancy.role_permissions FOR SELECT TO contratpro_runtime
USING (agency_id = app_private.context_uuid('contratpro.agency_id') AND app_private.tenant_is_active());
CREATE POLICY membership_roles_self_read ON tenancy.membership_roles FOR SELECT TO contratpro_runtime
USING (agency_id = app_private.context_uuid('contratpro.agency_id') AND app_private.tenant_is_active()
  AND membership_id = app_private.active_membership_id());
CREATE POLICY settings_tenant_read ON tenancy.agency_settings FOR SELECT TO contratpro_runtime
USING (agency_id = app_private.context_uuid('contratpro.agency_id') AND app_private.tenant_is_active());
CREATE POLICY invitations_authorized_read ON tenancy.membership_invitations FOR SELECT TO contratpro_runtime
USING (agency_id = app_private.context_uuid('contratpro.agency_id') AND app_private.has_permission('memberships.read'));
CREATE POLICY audit_authorized_read ON tenancy.audit_events FOR SELECT TO contratpro_runtime
USING (agency_id = app_private.context_uuid('contratpro.agency_id') AND app_private.has_permission('audit.read'));
CREATE POLICY audit_member_append ON tenancy.audit_events FOR INSERT TO contratpro_runtime
WITH CHECK (agency_id = app_private.context_uuid('contratpro.agency_id') AND app_private.tenant_is_active()
  AND actor_membership_id = app_private.active_membership_id());

GRANT SELECT ON identity.users, tenancy.agencies, tenancy.memberships, tenancy.roles,
  tenancy.permissions, tenancy.role_permissions, tenancy.membership_roles, tenancy.agency_settings, tenancy.audit_events TO contratpro_runtime;
-- No recipient email or token digest access, even with the invitation-read permission.
GRANT SELECT (id, agency_id, role_id, invited_by_membership_id, state, expires_at, created_at)
  ON tenancy.membership_invitations TO contratpro_runtime;
-- IDs/timestamps use server defaults; callers cannot backdate audit evidence.
GRANT INSERT (agency_id, actor_membership_id, action, request_id, metadata) ON tenancy.audit_events TO contratpro_runtime;
-- No platform policies or grants. Separate platform authorization/MFA is a future slice.

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
      AND NOT (a.grantee='contratpro_runtime'::regrole AND n.nspname IN ('identity','tenancy','app_private') AND a.privilege_type='USAGE' AND NOT a.is_grantable))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace,
      LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
      WHERE n.nspname IN ('identity','tenancy','platform') AND c.relkind='r' AND a.grantee<>c.relowner
      AND NOT (a.grantee='contratpro_runtime'::regrole AND n.nspname<>'platform' AND c.relname<>'membership_invitations' AND a.privilege_type='SELECT' AND NOT a.is_grantable))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
      LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      WHERE n.nspname='app_private' AND a.grantee<>p.proowner
      AND NOT (a.grantee='contratpro_runtime'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_attribute c
      JOIN pg_catalog.pg_class t ON t.oid=c.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace,
      LATERAL pg_catalog.aclexplode(c.attacl) a
      WHERE n.nspname IN ('identity','tenancy','platform') AND c.attnum>0 AND NOT c.attisdropped
      AND NOT (a.grantee='contratpro_runtime'::regrole AND n.nspname='tenancy' AND NOT a.is_grantable AND (
        (t.relname='membership_invitations' AND a.privilege_type='SELECT'
          AND c.attname IN ('id','agency_id','role_id','invited_by_membership_id','state','expires_at','created_at'))
        OR (t.relname='audit_events' AND a.privilege_type='INSERT'
          AND c.attname IN ('agency_id','actor_membership_id','action','request_id','metadata')))))
  THEN RAISE EXCEPTION 'ContratPro native ownership or ACL mismatch';
  END IF;
END;
$native_acl$;
