# P2.2A Supabase Auth foundation

## Approved decision

Supabase Auth is the authentication provider for both Email Magic Link and Google
OAuth. Do not integrate Auth.js. Next.js browser/server integration must use the
supported `@supabase/ssr` approach with `@supabase/supabase-js`; do not implement a
custom token parser or substitute a second authentication architecture.

Authentication and agency authorization remain separate. A verified Supabase user
must resolve through a trusted persisted canonical identity mapping before P2.1
receives an active ContratPro user. Memberships must then be revalidated separately.
No Supabase session, email, user metadata or provider role claim grants agency or
platform access. No automatic membership creation belongs in an auth callback.

## Installed SDKs and source contract

Pinned by npm and package-lock.json: `@supabase/ssr` 0.12.7 and
`@supabase/supabase-js` 2.119.0. npm resolves a single compatible JavaScript SDK.
Installation used ignore-scripts; no SDK or provider connection was executed.
The installed SSR README, createServerClient/createBrowserClient implementations
and cookie types were inspected. Server clients force PKCE and support lazy session
initialization; their getAll/setAll bridge forwards cookie chunks and cache headers.
No Auth.js or deprecated Supabase auth-helper package is used.

## Product flow

`/fr/sign-in` and `/ar/sign-in` offer native POST forms for Magic Link and Google.
Unconfigured environments show a disabled, localized sign-in form. Magic Link
requests use a fixed callback and generic confirmation. Auth accounts may be created
by Supabase, but no canonical user or agency membership is created by the callback.

`/{locale}/auth/start` requires an exact configured request origin and a bounded
form. It generates a cryptographic 10-minute HttpOnly correlation cookie scoped to
the callback. Google redirects are restricted to the pinned project's authorize
endpoint. No browser-supplied redirect destination is accepted.

`/{locale}/auth/callback` accepts one code and one matching nonce. It consumes the
correlation cookie, exchanges the code through PKCE and validates identity before
redirecting to the fixed localized dashboard. Invalid/missing/duplicate state,
provider errors and failed exchanges use fixed error copy. Failed identity checks
clear newly written auth cookies. Code replay protection ultimately depends on
Supabase's one-use code/PKCE enforcement and requires a live test.

Magic Links must open in the SAME browser that requested them. This implementation
uses the PKCE code redirect flow, not a token_hash confirmation endpoint. The future
provider/template setup must preserve that flow and the callback's nonce query.
Cross-browser links fail closed and users can request a new link.

`/{locale}/auth/sign-out` is same-origin POST only and calls SDK local sign-out,
clears both localized correlation cookies and reports failure without claiming
successful logout. The SDK clears its session cookie chunks. The browser listener
refreshes server-rendered state on sign-out/token refresh; it never authorizes access.

## SSR and configuration

The proxy refreshes before agency/sign-in rendering, writing cookie changes to both
the downstream request and response. It preserves multiple chunk/header writes.
Server Components use request-local clients; no server client is shared between
users. The browser client uses the same SSR cookie contract and explicitly disables
URL-code auto-detection, so it cannot bypass the protected server callback.

Required local configuration names (no values or credentials collected here):

- `NEXT_PUBLIC_SUPABASE_URL`: the exact Development project's HTTPS API URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable key or legacy anon key only.
- `CONTRATPRO_APP_ORIGIN`: exact application origin, HTTPS except localhost/127.0.0.1
  HTTP development. It is not derived from Host or forwarded headers.

The auth project is pinned to gllsiklbvqpxzucvkehw. Private/service-role keys are
rejected, including at Next configuration load before public values are bundled.
The legacy-key payload check only classifies the public key kind; it never verifies
a user identity. No secret Supabase key or PostgreSQL URL is required by the web app.

Session validation uses getUser (Auth server verification) and getClaims (SDK JWT
verification), requiring matching subject, pinned issuer, authenticated audience and
unexpired integer expiry. No getSession user object, browser user metadata, email
or decoded JWT is used as authorization evidence. Browser-readable SSR session
cookies are required by the browser SDK; they are not claimed to be HttpOnly.
Cookies are Secure in production, host-only and SameSite Lax. Nonce cookies are
also HttpOnly. Auth responses/fetches are no-store; no tokens are placed in local
application storage or error UI. The SDK owns token persistence and refresh.

## Canonical identity and restricted membership adapter

New DRAFT migration: `20261115000400_supabase_auth.sql`, ordered after the three
foundation migrations. It was parsed offline and NOT applied. It adds:

- `identity.supabase_users`: unique Supabase subject FK to auth.users and a unique
  canonical user FK to identity.users. The project-local FK plus pinned JWT issuer
  binds the provider namespace. No email linking or UUID-equality assumption.
- ENABLE/FORCE RLS and narrowly column-scoped SELECT grants to authenticated.
- Four self-only SELECT policies for mapping, canonical user, memberships and agency
  metadata. They do not replace the existing contratpro_runtime tenant policies.
- Fixed, argument-free `public.contratpro_auth_access()` with SECURITY INVOKER,
  fixed pg_catalog search_path, qualified references and a 101-row overflow sentinel.
  PUBLIC/anon/service_role/runtime/platform cannot execute it. No SECURITY DEFINER
  or write grant is added. Its schema remains native-SQL-owned; the Drizzle schema
  is not used to generate Supabase-managed auth.users definitions.

The server calls the RPC with the verified user's JWT and public key, as the
restricted authenticated database role. It never uses postgres, service-role keys
or a direct database connection. Missing mapping produces unmapped; conflicting,
disabled or malformed evidence denies access. Existing P2.1 membership checks still
run separately. Multi-agency accounts require selection and gain no default agency.

P2.3 adds explicit agency onboarding/management and revalidated agency selection;
see [agency management](agency-management.md). Those capabilities have a separate
unactivated write boundary and do not change authentication into automatic membership.

Mapping insertion/activation is intentionally absent from auth callbacks and from
runtime grants. A separately authorized trusted onboarding/admin workflow must
create the canonical row/link and agency membership with audit evidence. No fixture
or privileged identity-provisioning shortcut is supplied here.

## Remaining live gate

`CONTRATPRO_AUTH_ACCESS_VERIFIED` must remain absent/false until separately authorized
tests prove effective authenticated-role grants, RLS/FORCE RLS, auth.uid routing,
cross-user/cross-tenant denial, disabled users, mapping uniqueness, and platform/
anonymous denial. Only an explicit exact `true` enables the RPC-backed dashboard
gate afterward. It does not bypass identity validation, RLS or P2.1 membership checks.

No live Supabase operation was performed. Provider enablement, Google credentials,
email delivery/rate limits, redirect allowlists, PKCE template behavior, cookie
refresh/logout across tabs and actual restricted-role enforcement remain untested.
Do not apply the draft, enable providers, provision mappings, or enable the gate
without separate authorization. This foundation does not authorize production use.

## Focused verification

```powershell
npm run test --workspace=@contratpro/web -- src/auth src/server/agency-access.test.ts src/components/agency-access-view.test.ts src/components/sign-in-view.test.ts src/i18n
npm run test --workspace=@contratpro/database -- tests/supabase-auth.test.ts tests/supabase-native.test.ts
npm run typecheck --workspaces
npm run lint --workspaces
```

Transport is injected or SDK factories are mocked in tests, never real Auth/data
requests. Tests cover invalid/expired identities, callback state/PKCE failures,
missing/conflicting mappings, tenant mismatch, multi-agency behavior, cookie refresh,
logout, redaction and FR/AR rendering. SQL/PLpgSQL parsing and AST/frozen-artifact
checks are static evidence, not actual PostgreSQL enforcement. Production build
also passes without calling dynamic Auth routes or contacting Supabase.

## Files changed in P2.2A

- apps/web/package.json; package-lock.json (pinned SDK dependencies).
- apps/web/next.config.ts; apps/web/src/proxy.ts.
- apps/web/src/auth/config.ts, server.ts, browser.ts, identity.ts, handlers.ts,
  session-sync.tsx, identity.test.ts, handlers.test.ts, ssr.test.ts.
- apps/web/src/app/[locale]/auth/start/route.ts, auth/callback/route.ts,
  auth/sign-out/route.ts, sign-in/page.tsx.
- apps/web/src/components/sign-in-view.tsx, sign-in-view.test.ts,
  agency-access-view.tsx, agency-access-view.test.ts.
- apps/web/src/i18n/auth.ts, agency-access.ts; apps/web/src/app/globals.css.
- apps/web/src/server/agency-access.ts, agency-access.test.ts.
- packages/application/src/agency-access.ts (unmapped state).
- supabase/migrations/20261115000400_supabase_auth.sql (unapplied draft).
- packages/infrastructure/database/tests/supabase-auth.test.ts, supabase-native.test.ts.
- docs/supabase-auth.md, agency-access.md, architecture.md; supabase/README.md.

TypeScript/Next verification may regenerate ignored build/type artifacts. Frozen
migrations, runner, provisioning and original foundation SQL are unchanged.
