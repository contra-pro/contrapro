# Agency dashboard access — offline product slice

## Existing state and delivered behavior

Before this slice: authentication, sessions, agency creation and membership adapters were
missing. FR/AR routes, responsive chrome and no-store headers existed. Membership
entities and the tenant transaction helper existed as offline database foundation.
There were no production mocks or real authentication workflows to reuse.

The agency page now awaits server access resolution before rendering its agency
panel. French and Arabic messages cover signed-out, unavailable, forbidden,
onboarding, multiple-agency selection and authorized states. The route also has
loading and unexpected-error boundaries. Platform and public signing remain separate
development placeholders; agency membership grants neither platform access nor
signing authority.

**P2.2A implements Supabase Auth Magic Link and Google OAuth through Supabase SSR.**
Auth.js must not be integrated. See [the implemented flows, setup and pending
runtime verification](supabase-auth.md). P2.3 adds [agency creation and management](agency-management.md)
behind a separate unactivated write boundary.
The dashboard remains unavailable until the separate restricted-user RLS verification
gate is explicitly enabled. Missing canonical mappings produce an unmapped state;
successful authentication never creates an agency membership.

## Trust boundary

`packages/application/src/agency-access.ts` owns the use case without framework or
database imports. Only server composition in `apps/web/src/server/agency-access.ts`
may supply its ports. `server-only` is explicitly declared by the web package using
the already installed/locked dependency; no package download was performed.

The session adapter validates Supabase Auth identity server-side and maps its
provider principal through a trusted persisted link to an active `identity.users`
UUID. Never assume the provider UUID equals the canonical UUID. Its `expiresAt` is
an absolute millisecond timestamp. Email, request headers, query strings, browser
role claims and browser agency IDs are not verified identities.

The membership adapter reads a fixed SECURITY INVOKER RPC with the verified user's
JWT and public key. A new, unapplied native migration adds authenticated self-only
RLS policies for canonical identity and membership discovery, bounded to 100 rows
with an overflow sentinel. It changes no original tenant-runtime policy. It returns
canonical IDs and states, never browser claims. No postgres/service-role application
connection or direct PostgreSQL client is used. Live enforcement is not proven offline.

The use case rejects invalid/expired/disabled identity, mismatched users, malformed
IDs, duplicate evidence, inactive agencies and revoked memberships. It does not
pick an agency when multiple eligible agencies exist without a revalidated selection
hint. A hint is bound to the current canonical user and must match an active membership.
It rechecks expiry after the
membership read and returns only sanitized states after adapter errors. It uses no
cross-request cache. Dashboard eligibility grants no contract-write permissions.
Future server actions and APIs must independently reauthorize each operation and
use the existing transaction-scoped tenant boundary. A rendered dashboard is not
authorization for another operation.

## Offline verification

From the repository root:

```powershell
npm run test --workspace=@contratpro/web -- src/auth src/server/agency-access.test.ts src/components/agency-access-view.test.ts src/components/sign-in-view.test.ts src/i18n
npm run typecheck --workspace=@contratpro/web
npm run lint --workspace=@contratpro/web
```

Core tests inject synthetic server ports. Route integration tests mock only the
server adapter and exercise the real async page and React server rendering. Tests
cover denied-content exclusion, malicious query claims, HTML escaping, expiry,
revocation, tenant mismatch, malformed/duplicate evidence, output redaction and
the unavailable production composition. These tests prove neither real Supabase Auth
verification nor PostgreSQL/RLS enforcement. No browser E2E or live provider test
has been performed.

## Next product slice

Review the pending auth and agency-management drafts and arrange separately authorized
provider configuration and restricted-user verification. Keep dashboard/management
access unavailable until their respective boundaries are validated. Invitations and
trusted canonical-link provisioning remain future product work. Do not modify the
frozen migration runner or provision its custom owner.
