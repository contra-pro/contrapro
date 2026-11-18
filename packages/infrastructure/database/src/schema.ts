import { sql } from "drizzle-orm";
import { check, foreignKey, index, jsonb, pgSchema, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const identity = pgSchema("identity");
export const tenancy = pgSchema("tenancy");
export const platform = pgSchema("platform");
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

// Identity anchors only. No passwords, sessions, auth provider or provisioning shortcut.
export const users = identity.table("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  state: text("state", { enum: ["active", "disabled"] }).default("disabled").notNull(),
  createdAt: createdAt(),
}, (t) => [check("users_state_check", sql`${t.state} in ('active', 'disabled')`)]).enableRLS();

export const agencies = tenancy.table("agencies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  state: text("state", { enum: ["pending", "active", "suspended"] }).default("pending").notNull(),
  createdAt: createdAt(),
}, (t) => [
  check("agencies_name_check", sql`length(btrim(${t.name})) between 1 and 200`),
  check("agencies_state_check", sql`${t.state} in ('pending', 'active', 'suspended')`),
]).enableRLS();

export const memberships = tenancy.table("memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "restrict" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  state: text("state", { enum: ["active", "revoked"] }).default("active").notNull(),
  createdAt: createdAt(),
}, (t) => [
  unique("memberships_agency_id_id_unique").on(t.agencyId, t.id),
  unique("memberships_agency_user_unique").on(t.agencyId, t.userId),
  check("memberships_state_check", sql`${t.state} in ('active', 'revoked')`),
  index("memberships_user_idx").on(t.userId),
]).enableRLS();

export const roles = tenancy.table("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "restrict" }),
  key: text("key").notNull(),
  name: text("name").notNull(),
  createdAt: createdAt(),
}, (t) => [
  unique("roles_agency_id_id_unique").on(t.agencyId, t.id),
  unique("roles_agency_key_unique").on(t.agencyId, t.key),
  check("roles_key_check", sql`${t.key} ~ '^[a-z][a-z0-9_.-]{0,63}$'`),
  check("roles_name_check", sql`length(btrim(${t.name})) between 1 and 100`),
]).enableRLS();

// Global, non-sensitive permission vocabulary; never browser role claims.
export const permissions = tenancy.table("permissions", {
  key: text("key").primaryKey(),
  description: text("description").notNull(),
}, (t) => [check("permissions_key_check", sql`${t.key} ~ '^[a-z][a-z0-9_.-]{0,63}$'`)]);

export const rolePermissions = tenancy.table("role_permissions", {
  agencyId: uuid("agency_id").notNull(),
  roleId: uuid("role_id").notNull(),
  permissionKey: text("permission_key").notNull().references(() => permissions.key, { onDelete: "restrict" }),
}, (t) => [
  primaryKey({ columns: [t.agencyId, t.roleId, t.permissionKey] }),
  foreignKey({ name: "role_permissions_agency_role_fk", columns: [t.agencyId, t.roleId], foreignColumns: [roles.agencyId, roles.id] }).onDelete("restrict"),
]).enableRLS();

export const membershipRoles = tenancy.table("membership_roles", {
  agencyId: uuid("agency_id").notNull(),
  membershipId: uuid("membership_id").notNull(),
  roleId: uuid("role_id").notNull(),
}, (t) => [
  primaryKey({ columns: [t.agencyId, t.membershipId, t.roleId] }),
  foreignKey({ name: "membership_roles_agency_member_fk", columns: [t.agencyId, t.membershipId], foreignColumns: [memberships.agencyId, memberships.id] }).onDelete("restrict"),
  foreignKey({ name: "membership_roles_agency_role_fk", columns: [t.agencyId, t.roleId], foreignColumns: [roles.agencyId, roles.id] }).onDelete("restrict"),
  index("membership_roles_role_idx").on(t.agencyId, t.roleId),
]).enableRLS();

export const membershipInvitations = tenancy.table("membership_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "restrict" }),
  roleId: uuid("role_id").notNull(),
  invitedByMembershipId: uuid("invited_by_membership_id").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  tokenDigest: text("token_digest").notNull(),
  state: text("state", { enum: ["pending", "accepted", "revoked", "expired"] }).default("pending").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
}, (t) => [
  unique("invitations_token_digest_unique").on(t.tokenDigest),
  foreignKey({ name: "invitations_agency_role_fk", columns: [t.agencyId, t.roleId], foreignColumns: [roles.agencyId, roles.id] }).onDelete("restrict"),
  foreignKey({ name: "invitations_agency_inviter_fk", columns: [t.agencyId, t.invitedByMembershipId], foreignColumns: [memberships.agencyId, memberships.id] }).onDelete("restrict"),
  check("invitations_state_check", sql`${t.state} in ('pending', 'accepted', 'revoked', 'expired')`),
  check("invitations_digest_check", sql`${t.tokenDigest} ~ '^[0-9a-f]{64}$'`),
  check("invitations_email_check", sql`length(${t.recipientEmail}) between 3 and 320`),
  check("invitations_expiry_check", sql`${t.expiresAt} > ${t.createdAt}`),
  index("invitations_agency_state_idx").on(t.agencyId, t.state),
]).enableRLS();

export const agencySettings = tenancy.table("agency_settings", {
  agencyId: uuid("agency_id").primaryKey().references(() => agencies.id, { onDelete: "restrict" }),
  defaultLocale: text("default_locale", { enum: ["fr", "ar"] }).default("fr").notNull(),
  timeZone: text("time_zone").default("Africa/Casablanca").notNull(),
  currency: text("currency").default("MAD").notNull(),
}, (t) => [
  check("settings_locale_check", sql`${t.defaultLocale} in ('fr', 'ar')`),
  check("settings_currency_check", sql`${t.currency} ~ '^[A-Z]{3}$'`),
  check("settings_timezone_check", sql`length(btrim(${t.timeZone})) between 1 and 100`),
]).enableRLS();

export const auditEvents = tenancy.table("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "restrict" }),
  actorMembershipId: uuid("actor_membership_id").notNull(),
  action: text("action").notNull(),
  requestId: uuid("request_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>().default({}).notNull(),
  createdAt: createdAt(),
}, (t) => [
  foreignKey({ name: "audit_events_agency_actor_fk", columns: [t.agencyId, t.actorMembershipId], foreignColumns: [memberships.agencyId, memberships.id] }).onDelete("restrict"),
  check("audit_events_action_check", sql`${t.action} ~ '^[a-z][a-z0-9_.-]{0,99}$'`),
  check("audit_events_metadata_check", sql`jsonb_typeof(${t.metadata}) = 'object'`),
  index("audit_events_agency_created_idx").on(t.agencyId, t.createdAt, t.id),
]).enableRLS();

// Separate principal namespace. No user/membership FK, platform role or tenant access.
export const platformAdminIdentities = platform.table("admin_identities", {
  id: uuid("id").defaultRandom().primaryKey(),
  state: text("state", { enum: ["active", "disabled"] }).default("disabled").notNull(),
  createdAt: createdAt(),
}, (t) => [check("admin_identities_state_check", sql`${t.state} in ('active', 'disabled')`)]).enableRLS();
