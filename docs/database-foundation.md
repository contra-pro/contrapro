# P1.2A — Portable offline PostgreSQL foundation

P1.2B-1R adds an inert-by-default [migration execution mechanism](migration-execution.md),
corrects owner-wide function defaults and adopts the explicit
[trusted server SQL boundary](tenant-sql-trust-boundary.md). The P1.2A history below
remains useful; the operational CLI has not been invoked during offline work.

## Scope and trust boundary

This slice defines schema and reviewable security drafts only. No PostgreSQL
server, Supabase project, container, authentication flow or business workflow was
created or contacted. npm registry/documentation access is separate from database
access. No environment credentials are read, requested, embedded or logged.

Target portable PostgreSQL 16+ syntax, with no Supabase Auth, Storage, JWT helper,
extension or provider-specific schema dependency. Parsing currently uses bundled
PostgreSQL 18 parser assets; execution must be validated against the chosen actual
server version in P1.2B. Drizzle 0.45.4 and node-postgres 8.23.1 are pinned.

Threats addressed in the design: forged agency selection or role claims,
cross-tenant foreign keys, privilege escalation through membership edits, owner/RLS
bypass, stale pooled context, recursive policies, public function execution and
platform-to-tenant privilege leakage. Static checks alone do not eliminate them.

## Entity inventory

| Table | Purpose / relationships |
| --- | --- |
| `identity.users` | UUID identity anchor, disabled by default; no passwords/sessions/auth provider |
| `tenancy.agencies` | Agency name and pending/active/suspended lifecycle |
| `tenancy.memberships` | One user/agency membership; active/revoked; unique `(agency_id,id)` and `(agency_id,user_id)` |
| `tenancy.roles` | Agency-specific role vocabulary; unique agency/key and agency/id |
| `tenancy.permissions` | Global non-sensitive permission vocabulary; not tenant data |
| `tenancy.role_permissions` | Agency-scoped role-to-permission mapping |
| `tenancy.membership_roles` | Agency-scoped membership-to-role mapping |
| `tenancy.membership_invitations` | Email, one proposed role, inviter, digest, state and expiry |
| `tenancy.agency_settings` | One settings row per agency: French/Arabic default, zone and currency |
| `tenancy.audit_events` | Agency-scoped append-only runtime evidence, actor membership, action and correlation ID |
| `platform.admin_identities` | Independent UUID principal namespace, disabled by default; no agency/user FK |

Every link to a tenant child uses `(agency_id,child_id)` foreign keys. Links to the
agency root and global identity/permission anchors are intentionally single-key.
Deletes are RESTRICT; cascading deletion of audit/identity references is not allowed.
UUIDs use built-in `gen_random_uuid()`; timestamps use `timestamptz`. No real
identities, agencies, role assignments or permission assignments are seeded.

### Data classification and unfinished validation

- Agency names and invitation emails may be personal data. Invitation emails are
  not granted to ordinary runtime reads. Encryption/minimization/retention must be
  approved before real invitation data is collected.
- Invitation digests must represent hashes of high-entropy single-use tokens;
  the CHECK validates format, not entropy, safe delivery or token consumption.
- Audit metadata must be allowlisted/redacted by future server producers. JSON
  object validation and TypeScript types do not prove absence of secrets or PII.
- Time-zone text is bounded, not validated against IANA by the database CHECK.
  Email deliverability, currency support and locale-specific validation belong
  in future validated application operations.
- Auth.js and platform MFA will need additional reviewed schemas. These UUID
  anchors do not implement authentication or grant anyone platform privileges.

## Database roles

| Role | Properties / permissions |
| --- | --- |
| `contratpro_migration_owner` | NOLOGIN, NOSUPERUSER, NOBYPASSRLS, NOCREATEROLE, NOCREATEDB, NOREPLICATION; owns private schemas/tables/functions |
| `contratpro_runtime` | NOLOGIN restricted capability role; specific schema USAGE, helper EXECUTE, scoped reads and audit INSERT only |
| `contratpro_platform_runtime` | Independent NOLOGIN role; no schema/table/function grants or tenant policies in this slice |

All three also use NOINHERIT. Actual login identities are deliberately not created.
Future restricted login provisioning must verify effective privileges, inherited
memberships and PUBLIC grants; setting a role's own flags is not enough.
Application credentials must never belong to the owner, a superuser or a BYPASSRLS
principal, nor be capable of assuming one. Platform credentials must remain distinct.

FORCE RLS subjects the table owner to policies, but a sufficiently privileged owner
can change schema/policies, and superusers/BYPASSRLS still bypass RLS. Protect migration
credentials separately. RLS does not protect TRUNCATE; runtime is not granted it.

## RLS and permission behavior

All original identity/tenant/platform private tables have ENABLE and FORCE RLS. The
new administrative migration journal is separate control-plane state with restricted
ACLs, not a tenant table. PUBLIC receives no private schema,
table or helper-function privileges. Policies apply only to `contratpro_runtime`.

| Table group | Runtime behavior |
| --- | --- |
| Identity anchor | Read own active user anchor only |
| Membership root | Read own active membership for selected agency, with active user |
| Agency root | Read selected active agency only with active membership |
| Roles / role permissions / settings | Read selected active tenant only |
| Membership-role assignments | Read current membership's assignments in active tenant only |
| Invitations | Read non-email/non-digest columns only with `memberships.read` |
| Audit | Read with `audit.read`; append only for the current membership in the active tenant |
| Platform identities | No runtime/platform policies or grants; default-deny |
| Permission catalog | Global SELECT only; cannot grant capability by itself |

There are no tenant UPDATE/DELETE policies or grants. All INSERT operations except
the constrained audit INSERT remain denied. Audit INSERT excludes ID/timestamp
columns, so runtime uses server defaults and cannot backdate events through these
grants. This is not tamper-proof evidence against database owners/operators.
Agency/team provisioning and staff-management mutations require later authorized
capabilities; they must not be enabled by widening these grants ad hoc.

The RLS lookup graph is deliberately non-recursive: context -> self membership ->
active agency -> role joins/permission checks. Root identity/self-membership metadata
can remain readable for an otherwise suspended agency; the transaction wrapper
and all other tenant policies deny suspended agencies. This avoids a policy cycle
between agency and membership lookup. Role claims from browsers are never evaluated.

## Transaction-scoped context

`withTenantTransaction` accepts an injected Drizzle database, not a URL or pool.
It is server-only and currently unused by web routes. It:

1. Rejects non-UUID context identifiers before transaction work.
2. Opens a Drizzle transaction and binds user/agency through parameterized
   `set_config(..., true)` calls, making values transaction-local.
3. Checks active user, membership and agency through the RLS/invoker helper.
4. Invokes work using that transaction only; failures propagate to Drizzle.

Future callers must derive user ID from validated server authentication and
authorize agency selection and the specific operation. An agency ID is merely a
selection until checked. This wrapper cannot authenticate a user. UUID validation
or a TypeScript context type does not make browser claims trustworthy.

Custom PostgreSQL settings are writable by the runtime connection. RLS therefore
does not defend against stolen runtime credentials or arbitrary SQL execution that
sets another user context. Parameterized queries, trusted server code, protected
credentials and per-operation authorization remain essential.

Use no session-level tenant SETs, no tenant queries outside the wrapper, no raw pool
exports to request handlers, and no nested wrapper calls switching contexts.
Always await transaction work; do not start detached asynchronous queries. The
database handle remains private to future infrastructure composition. At commit or
rollback local settings should cease to apply; **actual pool reuse, cancellation,
error recovery and transaction-pooler behavior require PostgreSQL tests**. A wrapper
cannot clean up a session value incorrectly introduced by other code.

Malformed/missing context returns NULL in SQL; comparisons fail closed. Permission
functions are SECURITY INVOKER, fixed to `pg_catalog` search paths, with fully
qualified application relations and explicit PUBLIC execution revocation. No
security-definer shortcut is used.

## Supabase Free connection requirements — future only

Before P1.2B, explicitly approve a dedicated development project/test target and
region; use synthetic data. Do not use an existing production project. Check current
Free limits and the project's actual PostgreSQL version without assuming portability.

Requirements to verify after approval:

- Separate migration/provisioning and restricted runtime identities, supported by
  the project's role-provisioning privileges. Managed-role limitations are blockers
  to resolve, never reasons to use `postgres` for ordinary requests.
- Approved direct/session endpoint for migrations and administrative inspection;
  chosen runtime endpoint/pooling mode must support whole interactive transactions.
- TLS certificate verification, appropriate CA/network reachability, small connection
  pools, timeouts and cancellation behavior.
- Keep custom private schemas outside exposed Data API schemas. Do not grant
  Supabase `anon`, `authenticated`, service roles or PUBLIC access to private tables.
- Verify all effective privileges, especially CREATE via PUBLIC schemas, TEMP,
  inherited role memberships, table ownership, function EXECUTE and BYPASSRLS.
- Future secret variable names may be `DATABASE_RUNTIME_URL` and
  `DATABASE_MIGRATION_URL`; neither value is required or read in P1.2A. Never use a
  `NEXT_PUBLIC_` prefix, log URLs, commit `.env` files or share secrets in chat.
- Backups and restores must cover schemas, role/grant reconstruction and eventually
  object bytes separately. No Supabase-specific helpers are required by these drafts.

## Offline test coverage and limits

Tests parse draft SQL locally, inspect roles/grants/policies, compare Drizzle table
inventory, columns/types/nullability/default presence, PKs, unique keys, CHECK
expressions, FK shapes/actions and indexes. They check ENABLE/FORCE RLS, invoker
search paths and the static policy/function dependency graph. SQL helper bodies
and the PL/pgSQL function are parsed without executing them.

Transaction tests use doubles to check parameter binding, transaction-local flags,
denial before callbacks and exception propagation. They are **not** proof of real
rollback, context reset, constraints, grants, policy execution or absence of all
schema drift. Defaults are checked for presence, not complete semantic equivalence.

## P1.2B proposed scope

Only after explicit approval:

1. Select an isolated existing PostgreSQL development target (Supabase Free only
   if explicitly selected), establish approved secret handling and inspect version,
   roles, grants, namespace collisions and connection mode.
2. Review/finalize the drafts, a checksum journal and safe migration execution;
   provision the minimum approved test roles/login identities and apply in order.
3. Seed synthetic users, agencies, memberships/roles/permissions via a separate
   privileged fixture setup channel. No ordinary runtime privilege escalation.
4. Verify actual owners, NOLOGIN/group/login separation, NOSUPERUSER/NOBYPASSRLS,
   effective privileges and inability to assume migration/platform roles.
5. Exercise missing/malformed context, forged agency selection, two agencies,
   non-members, revoked users/memberships, pending/suspended agencies and permissions.
6. Test actual composite FK/CHECK/unique constraints, cross-tenant relationships,
   invitation column restrictions, audit append/read rules and mutation denial.
7. Prove invoker functions execute without recursion or privilege errors; verify
   platform-runtime and PUBLIC access remain denied.
8. Test pool-size-one reuse after commit, rollback, callback failure and cancellation;
   run concurrent agencies and the selected managed transaction pooler if used.
9. Rehearse failed migration recovery and backup/restore on the disposable target;
   preserve checksums and publish observed results and remaining limitations.

P1.2B does not include Auth.js integration, real agency onboarding, platform MFA,
business workflows, contracts, signing, billing, production deployment or migration.
No Docker/container creation is implicitly authorized. A target requiring such work
needs an explicit scope decision.

## Decisions before connected work

- Approve isolated target/provider/version, region, provisioning authority and login
  role strategy; resolve PUBLIC/managed-role constraints.
- Approve the read-only-plus-audit initial runtime capability surface and the later
  provisioning strategy; active-user/agency fixture creation is test-only for P1.2B.
- Confirm UUID identity anchors and separate platform principals before Auth.js work.
- Approve invitation-email handling, audit allowlists/retention and later lifecycle
  mutation rules before any real data collection.
- Retain draft status until observed PostgreSQL tests pass; offline checks are not
  an authorization to apply these files anywhere.

## Primary references

- [PostgreSQL RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html)
- [PostgreSQL transaction-local set_config](https://www.postgresql.org/docs/17/functions-admin.html)
- [PostgreSQL function security](https://www.postgresql.org/docs/17/sql-createfunction.html)
- [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
- [Drizzle transactions](https://orm.drizzle.team/docs/transactions)
- [Supabase connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres)
