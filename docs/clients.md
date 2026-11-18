# Clients management — P3.1

Implemented offline. No Supabase connection, SQL execution or dependency installation
was performed. No document upload, offline client storage or sample-success flow is
provided. Before this slice there was no client table, client adapter or client UI.

## User flow

After verified authentication, canonical identity mapping and agency selection,
the agency navigation leads to `/{fr|ar}/app/clients`. Authorized users can search
contact fields, filter by identity-document type, paginate, create a client and
open a detail view. Edit and archive controls require their respective permissions.
Arabic inherits the existing RTL layout; document numbers and contact identifiers
use LTR inputs. Forms have localized labels, validation, busy and error states.

First name, last name and phone are required. Email, nationality, address, city and
notes are optional. Identity is optional; selecting CIN or passport requires its
number. Foreign clients are not required to supply a Moroccan CIN. These are
conservative format checks, not government identity verification. A licence is
optional, but supplying its number requires valid issue and expiry dates; issue
must not be in the future and expiry must follow issue. Expired licences can be
recorded with a warning: this does not establish eligibility for a future rental.

Create uses an agency-scoped idempotency key and confirms the saved record before
showing success. Edit uses the current version; concurrent changes return a
conflict. Archive requires explicit confirmation and hides the record from both
list and detail access. There is no archive browser, restore or delete operation.
An unknown write outcome is reported as uncertain and is never retried automatically.

## Authorization and privacy

The server reuses the existing Supabase session/canonical identity/agency-access
gate and user-bound selection cookie. Requests cannot submit an agency, user or
role assignment. Client IDs remain untrusted and every lookup includes the
server-resolved agency. Foreign, archived and missing IDs share unavailable/404
behavior. Database failures fail closed.

The four capabilities are `clients.read`, `clients.create`, `clients.update` and
`clients.archive`; write capabilities also require read. Existing active agency
owners with `agency.manage` receive these capabilities through the existing owner
predicate. Other active members require explicit permissions through the existing
agency role and permission tables. No role-assignment UI or self-grant path is added.

The adapter uses the user's Supabase JWT and the restricted `authenticated` SQL
identity. It never queries as postgres, service_role or a table owner. All new RPCs,
helpers and the write guard are SECURITY INVOKER with a fixed pg_catalog search
path. The table has ENABLE/FORCE RLS and agency-scoped policies. Column grants and
an invoker trigger jointly protect metadata and distinguish update from archive,
including direct authenticated SQL writes. Platform runtime receives no new access.

List results contain contact information and document type, not document numbers,
licence data or notes. Detail data is returned only after permission checks. Search
terms travel in a same-origin POST body instead of URLs; wildcard characters are
literal. Requests are bounded, errors use fixed codes, and application handlers do
not log client fields or raw database errors. Responses are no-store and use the
existing sensitive-route caching protections. Database/provider log retention has
not been verified here. Creation metadata, version and timestamps are stored;
this slice does not claim a complete mutation audit trail.

## Database draft and live gate

`supabase/migrations/20261115000600_clients.sql` is a separate pending migration
after 0001–0005. It adds `tenancy.clients`, indexes, tenant/composite and idempotency
constraints, four permission catalogue entries, RLS, a write guard and six fixed
public RPCs: permissions, list, detail, create, update and archive. Native SQL is
the authoritative draft for this table; no existing foundation Drizzle model or
frozen migration was regenerated or modified.

`CONTRATPRO_CLIENTS_VERIFIED` must be exactly `true` to enable application client
operations. It remains unset/off by default. Existing authentication activation
requirements still apply. The flag is an application gate, not a database kill
switch: deploying the migration grants authenticated invoker access, so deployment
requires separate approval and security verification. No history reconciliation or
deployment command is authorized by this implementation.

Before enabling operations, separately authorize and verify the pending migrations,
Supabase Auth/canonical mapping and actual restricted-role behavior. Required live
checks include two-agency read/write isolation and ID enumeration, suspended and
permission-revoked memberships, independent create/update/archive grants, direct
table writes through the guard, archived-row invisibility, archive UPDATE without
RETURNING under RLS, idempotent creation, concurrent version conflicts, transaction
rollback, effective ACLs and platform/anonymous denials. Real browser interaction,
mobile layouts and end-to-end auth/session refresh also remain unverified.

## Offline verification

The client tests exercise validation, injected Supabase RPC boundaries, server
scope resolution, HTTP authorization/errors and FR/AR server rendering. SQL tests
parse SQL/PLpgSQL and inspect security contracts; frozen-artifact tests check the
nine approved hashes and full manifest. These tests do not prove PostgreSQL RLS or
trigger enforcement. No fake authentication is installed in the application.

Commands from the repository root:

```powershell
npm run test --workspace=@contratpro/web -- src/auth src/agency src/clients src/server src/components src/i18n
npm run test --workspace=@contratpro/database -- tests/clients.test.ts tests/supabase-native.test.ts
npm run typecheck --workspaces
npm run lint --workspaces
npm run build --workspace=@contratpro/web
```

## File inventory

Created:

- `packages/application/src/clients.ts`
- `supabase/migrations/20261115000600_clients.sql`
- `packages/infrastructure/database/tests/clients.test.ts`
- `apps/web/src/clients/{data,handler,server}.ts`
- `apps/web/src/clients/{data,handler,server,validation}.test.ts`
- `apps/web/src/i18n/clients.ts`
- `apps/web/src/components/{client-form,client-list,client-gate}.tsx`
- `apps/web/src/components/clients.test.ts`
- `apps/web/src/app/[locale]/app/client-action/route.ts`
- `apps/web/src/app/[locale]/app/clients/page.tsx`
- `apps/web/src/app/[locale]/app/clients/new/page.tsx`
- `apps/web/src/app/[locale]/app/clients/[clientId]/page.tsx`
- `apps/web/src/app/[locale]/app/clients/not-found.tsx`
- `docs/clients.md`

Modified:

- `apps/web/src/components/agency-navigation.tsx`
- `apps/web/src/i18n/agency-management.ts`
- `apps/web/src/app/globals.css`
- `packages/infrastructure/database/tests/supabase-native.test.ts` (pending-file inventory only)
- `supabase/README.md`
