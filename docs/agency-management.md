# P2.3 Agency onboarding and management

Implemented offline. No Supabase/database request or SQL execution was performed.
The auth/foundation migrations and the new management migration remain unapplied.

## Existing product state

P2.1/P2.2A provided verified Supabase identity, explicit canonical mapping, a
membership gate and restricted self-discovery draft. Agencies had only name/state;
settings existed, but no product creation, owner assignment, management or agency
selection flow existed. There was no usable storage/signatory contract.

This slice extends the existing agency table and uses existing memberships, roles,
membership_roles, role_permissions, agency_settings and audit_events. It adds no
duplicate identity or agency model and no Auth.js integration.

## User flows

- `/fr/app/onboarding` and `/ar/app/onboarding`: sign in, resolve an active canonical
  user, enter agency details and submit. Name, address, city, phone and email are
  required. ICE, IF and RC are optional and may be completed later. Format checks are
  product validation, not tax/legal verification. All supplied owner/role/tenant IDs
  are rejected. New agencies are **active immediately**, explicitly selected by the
  user during implementation; this is not an unreviewed platform-approval bypass.
- Creation calls one fixed transactional RPC. It creates the agency, active owner
  membership, owner role/assignment, agency.manage permission, defaults and audit
  event. The server confirms the new membership through the existing gate, reads
  back the owner/profile and only then sets selection and reports success.
- `/app/profile`: active members can view their own agency details; only an owner
  with agency.manage can edit. Required legacy fields may be blank until completed.
- `/app/settings`: owner-only changes to default French/Arabic document language,
  Casablanca/UTC timezone and MAD currency. Existing settings are reused.
- `/app/select`: choose only among current active memberships. The server issues an
  HttpOnly, SameSite Lax, Secure-on-HTTPS session cookie containing a user-bound
  selection hint. Every request revalidates that hint against canonical identity and
  current memberships. Invalid/stale hints never grant access. Logout clears it.

All screens preserve localized lang/RTL, no-store behavior, shared responsive chrome,
accessible labels, field error associations, loading/busy states and generic failure
copy. Existing route loading/error boundaries cover the nested screens. Forms have
no fake success: acknowledgement and read-back are required. Transport failures
after a mutation are explicitly uncertain; there is no automatic retry. A request
key is stable for the rendered form and SQL deduplicates creation by canonical user
and key. Verify the dashboard before resubmitting or reloading after uncertainty.

No upload input, storage bucket, logo endpoint or signatory authorization was
invented. Those features remain unavailable until their security contracts exist.

## Database draft and authorization

`supabase/migrations/20261115000500_agency_management.sql` is a new, unapplied draft
after 0004; neither 0004 nor any foundation application is assumed. Frozen SQL,
runner and provisioning files are unchanged.

The draft adds optional agency contact/fiscal columns, creator and creation-key
metadata, checks and a unique per-creator request key. Existing tenant composite
foreign keys and original runtime policies remain intact. The global permission
catalogue remains intentionally outside tenant RLS. New RPCs are native-SQL-owned;
the frozen/offline foundation Drizzle schema is not a deployment source for them.

Current authenticated permissions cannot safely bootstrap owner membership with an
invoker-only multi-table write. The draft therefore introduces ONE narrow capability
owner: `contratpro_agency_writer`, NOLOGIN/NOINHERIT/NOSUPERUSER/NOBYPASSRLS, not a
table owner and never an application login. Its table access remains subject to
FORCE RLS. It cannot create identities or canonical mappings, delete data, change
agency state or assign membership to arbitrary existing agencies through any RPC.

Three fixed SECURITY DEFINER mutation functions are owned by that restricted role,
not postgres. They use pg_catalog search_path, qualified objects, row_security=on,
verified auth.uid() -> active canonical mapping, and scoped owner/permission checks.
Agency IDs are generated in SQL for creation. Updates accept only fixed profile or
settings fields, with narrow column UPDATE grants. Audit inserts use the server's
actor/agency relationship and contain no profile payload. Unhandled failures abort
the entire RPC transaction. Actual rollback enforcement still needs PostgreSQL tests.

The profile reader and ownership/canonical helpers are SECURITY INVOKER. Additional
authenticated reads have self-only RLS; ordinary authenticated users receive no
INSERT/UPDATE/DELETE grants. Existing contratpro_runtime/platform roles gain no
new grants or memberships. Public/anon/service_role cannot execute management RPCs.
No arbitrary SQL interface or postgres/service-role application connection exists.

The migration temporarily needs the executor's SET membership and schema CREATE
grant to transfer function ownership to the capability role, then revokes those
specific grants. Provider-issued administrative memberships are not changed.
Supabase role-creation/delegation/ownership authority is a **live prerequisite**, not
something proven by parsing. No custom provisioning executor was changed or run.

## Activation boundary

Keep `CONTRATPRO_AUTH_ACCESS_VERIFIED` and
`CONTRATPRO_AGENCY_WRITES_VERIFIED` absent/false until separately authorized tests
prove their respective boundaries. Selection requires the former; the new profile/
settings reader and all creation/management writes require both. Disabled code does
not report success or connect through an administrative fallback.

These flags protect application paths; they are NOT database kill switches. Applying
the draft's authenticated EXECUTE grants exposes its fixed RPC capabilities directly
through PostgREST. Do not deploy that migration before its security review and
activation authorization. Pending foundation/auth/history requirements still apply.

Required live tests: restricted owner-role authority/ownership, effective grants and
FORCE RLS; missing/disabled/unmapped users; cross-user and cross-tenant denial;
non-owner update denial; forced failure after each creation insert proving all rows
and audit roll back; concurrent same-key creation producing one agency; revocation
and suspension during requests; authenticated direct RPC calls with malicious IDs;
read-after-write, cookies, logout and real FR/AR browser flows. Use synthetic data.
Canonical-link provisioning, providers and email delivery remain separately gated.

## Offline verification and limits

```powershell
npm run test --workspace=@contratpro/web -- src/auth src/agency src/server src/components src/i18n
npm run test --workspace=@contratpro/database -- tests/agency-management.test.ts tests/supabase-native.test.ts tests/supabase-auth.test.ts
npm run typecheck --workspaces
npm run lint --workspaces
npm run build --workspace=@contratpro/web
```

Tests inject SDK/context responses into the production HTTP handler and exercise
real validators, policy gates, RPC argument construction, persisted-data checks and
cookie handling. UI tests render actual React components in French/Arabic. They do
not claim to be interactive browser E2E or real Auth/database tests. SQL/PLpgSQL parsing,
AST comparison and original frozen-artifact hashes pass without SQL execution.

## Files changed

- packages/application/src/agency-management.ts, agency-access.ts.
- apps/web/src/auth/identity.ts, identity.test.ts, handlers.ts (logout cleanup).
- apps/web/src/server/agency-access.ts, agency-management.test.ts.
- apps/web/src/agency/handler.ts, handler.test.ts, profile.ts, profile.test.ts,
  selection.ts.
- apps/web/src/components/agency-form.tsx, agency-selection.tsx,
  agency-navigation.tsx, agency-workspace.tsx, agency-management-page.tsx,
  agency-management.test.ts, agency-access-view.tsx.
- apps/web/src/app/[locale]/app/onboarding/page.tsx, profile/page.tsx,
  settings/page.tsx, select/page.tsx, agency-action/route.ts; app/globals.css.
- apps/web/src/i18n/agency-management.ts, agency-access.ts.
- supabase/migrations/20261115000500_agency_management.sql; supabase/README.md.
- packages/infrastructure/database/tests/agency-management.test.ts,
  supabase-native.test.ts (explicit new pending-file inventory).
- docs/agency-management.md, agency-access.md, supabase-auth.md.

No dependency installation, database connection, SQL application, commit or push
was performed. Next/TypeScript may regenerate ignored build/type artifacts.
