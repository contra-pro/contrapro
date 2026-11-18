-- DRAFT ONLY. Minimal reads plus audit INSERT; all other writes remain denied.
BEGIN;
SET LOCAL ROLE contratpro_migration_owner;
REVOKE ALL ON ALL TABLES IN SCHEMA identity, tenancy, platform FROM PUBLIC, contratpro_runtime, contratpro_platform_runtime;
REVOKE ALL ON SCHEMA identity, tenancy, platform, app_private FROM PUBLIC, contratpro_runtime, contratpro_platform_runtime;
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
COMMIT;
