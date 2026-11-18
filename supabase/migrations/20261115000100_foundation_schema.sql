-- ContratPro native foundation 1; pending, NOT authorized for execution.
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

CREATE SCHEMA identity AUTHORIZATION postgres;
CREATE SCHEMA tenancy AUTHORIZATION postgres;
CREATE SCHEMA platform AUTHORIZATION postgres;
CREATE SCHEMA app_private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA identity, tenancy, platform, app_private FROM PUBLIC, contratpro_runtime, contratpro_platform_runtime;

CREATE TABLE identity.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL DEFAULT 'disabled',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_state_check CHECK (state IN ('active', 'disabled'))
);
CREATE TABLE tenancy.agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agencies_name_check CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  CONSTRAINT agencies_state_check CHECK (state IN ('pending', 'active', 'suspended'))
);
CREATE TABLE tenancy.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES tenancy.agencies(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  state text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memberships_agency_id_id_unique UNIQUE (agency_id, id),
  CONSTRAINT memberships_agency_user_unique UNIQUE (agency_id, user_id),
  CONSTRAINT memberships_state_check CHECK (state IN ('active', 'revoked'))
);
CREATE INDEX memberships_user_idx ON tenancy.memberships(user_id);
CREATE TABLE tenancy.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES tenancy.agencies(id) ON DELETE RESTRICT,
  key text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roles_agency_id_id_unique UNIQUE (agency_id, id),
  CONSTRAINT roles_agency_key_unique UNIQUE (agency_id, key),
  CONSTRAINT roles_key_check CHECK (key ~ '^[a-z][a-z0-9_.-]{0,63}$'),
  CONSTRAINT roles_name_check CHECK (length(btrim(name)) BETWEEN 1 AND 100)
);
CREATE TABLE tenancy.permissions (
  key text PRIMARY KEY,
  description text NOT NULL,
  CONSTRAINT permissions_key_check CHECK (key ~ '^[a-z][a-z0-9_.-]{0,63}$')
);
CREATE TABLE tenancy.role_permissions (
  agency_id uuid NOT NULL,
  role_id uuid NOT NULL,
  permission_key text NOT NULL REFERENCES tenancy.permissions(key) ON DELETE RESTRICT,
  PRIMARY KEY (agency_id, role_id, permission_key),
  CONSTRAINT role_permissions_agency_role_fk FOREIGN KEY (agency_id, role_id) REFERENCES tenancy.roles(agency_id, id) ON DELETE RESTRICT
);
CREATE TABLE tenancy.membership_roles (
  agency_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  role_id uuid NOT NULL,
  PRIMARY KEY (agency_id, membership_id, role_id),
  CONSTRAINT membership_roles_agency_member_fk FOREIGN KEY (agency_id, membership_id) REFERENCES tenancy.memberships(agency_id, id) ON DELETE RESTRICT,
  CONSTRAINT membership_roles_agency_role_fk FOREIGN KEY (agency_id, role_id) REFERENCES tenancy.roles(agency_id, id) ON DELETE RESTRICT
);
CREATE INDEX membership_roles_role_idx ON tenancy.membership_roles(agency_id, role_id);
CREATE TABLE tenancy.membership_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES tenancy.agencies(id) ON DELETE RESTRICT,
  role_id uuid NOT NULL,
  invited_by_membership_id uuid NOT NULL,
  recipient_email text NOT NULL,
  token_digest text NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invitations_token_digest_unique UNIQUE (token_digest),
  CONSTRAINT invitations_agency_role_fk FOREIGN KEY (agency_id, role_id) REFERENCES tenancy.roles(agency_id, id) ON DELETE RESTRICT,
  CONSTRAINT invitations_agency_inviter_fk FOREIGN KEY (agency_id, invited_by_membership_id) REFERENCES tenancy.memberships(agency_id, id) ON DELETE RESTRICT,
  CONSTRAINT invitations_state_check CHECK (state IN ('pending', 'accepted', 'revoked', 'expired')),
  CONSTRAINT invitations_digest_check CHECK (token_digest ~ '^[0-9a-f]{64}$'),
  CONSTRAINT invitations_email_check CHECK (length(recipient_email) BETWEEN 3 AND 320),
  CONSTRAINT invitations_expiry_check CHECK (expires_at > created_at)
);
CREATE INDEX invitations_agency_state_idx ON tenancy.membership_invitations(agency_id, state);
CREATE TABLE tenancy.agency_settings (
  agency_id uuid PRIMARY KEY REFERENCES tenancy.agencies(id) ON DELETE RESTRICT,
  default_locale text NOT NULL DEFAULT 'fr',
  time_zone text NOT NULL DEFAULT 'Africa/Casablanca',
  currency text NOT NULL DEFAULT 'MAD',
  CONSTRAINT settings_locale_check CHECK (default_locale IN ('fr', 'ar')),
  CONSTRAINT settings_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT settings_timezone_check CHECK (length(btrim(time_zone)) BETWEEN 1 AND 100)
);
CREATE TABLE tenancy.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES tenancy.agencies(id) ON DELETE RESTRICT,
  actor_membership_id uuid NOT NULL,
  action text NOT NULL,
  request_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_events_agency_actor_fk FOREIGN KEY (agency_id, actor_membership_id) REFERENCES tenancy.memberships(agency_id, id) ON DELETE RESTRICT,
  CONSTRAINT audit_events_action_check CHECK (action ~ '^[a-z][a-z0-9_.-]{0,99}$'),
  CONSTRAINT audit_events_metadata_check CHECK (jsonb_typeof(metadata) = 'object')
);
CREATE INDEX audit_events_agency_created_idx ON tenancy.audit_events(agency_id, created_at, id);
CREATE TABLE platform.admin_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL DEFAULT 'disabled',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_identities_state_check CHECK (state IN ('active', 'disabled'))
);

-- No runtime grants exist yet. Tables are forced/default-deny before this commit.
ALTER TABLE identity.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.users FORCE ROW LEVEL SECURITY;
ALTER TABLE tenancy.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy.agencies FORCE ROW LEVEL SECURITY;
ALTER TABLE tenancy.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy.memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE tenancy.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy.roles FORCE ROW LEVEL SECURITY;
ALTER TABLE tenancy.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy.role_permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE tenancy.membership_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy.membership_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE tenancy.membership_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy.membership_invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE tenancy.agency_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy.agency_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE tenancy.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy.audit_events FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.admin_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.admin_identities FORCE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA identity, tenancy, platform, app_private FROM PUBLIC, anon, authenticated, service_role, contratpro_runtime, contratpro_platform_runtime;
REVOKE ALL ON ALL TABLES IN SCHEMA identity, tenancy, platform FROM PUBLIC, anon, authenticated, service_role, contratpro_runtime, contratpro_platform_runtime;

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
