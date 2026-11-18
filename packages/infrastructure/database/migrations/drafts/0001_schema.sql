-- DRAFT ONLY. Owner must already have CREATE on the explicitly approved target database.
BEGIN;
SET LOCAL ROLE contratpro_migration_owner;
CREATE SCHEMA identity AUTHORIZATION contratpro_migration_owner;
CREATE SCHEMA tenancy AUTHORIZATION contratpro_migration_owner;
CREATE SCHEMA platform AUTHORIZATION contratpro_migration_owner;
CREATE SCHEMA app_private AUTHORIZATION contratpro_migration_owner;
REVOKE ALL ON SCHEMA identity, tenancy, platform, app_private FROM PUBLIC, contratpro_runtime, contratpro_platform_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity, tenancy, platform, app_private REVOKE ALL ON TABLES FROM PUBLIC;
-- Per-schema REVOKE cannot remove PostgreSQL's global PUBLIC EXECUTE default.
ALTER DEFAULT PRIVILEGES FOR ROLE contratpro_migration_owner REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

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
COMMIT;
