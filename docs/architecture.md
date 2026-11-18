# Bootstrap architecture

## Executable shell

The root npm workspace manages `apps/web`: Next.js App Router, React and strict
TypeScript. Plain CSS avoids a UI framework for this small shell. Multiple root
layouts allow localized HTML `lang` and `dir` without trusting a request header.
The entry root only redirects; localized pages render dynamically.

`src/components` contains presentation only. `src/i18n` owns the supported locale
boundary and typed dictionaries. Agency, platform and signing have separate route
entry points. Shared placeholder chrome is not shared authorization.

## Future modular monolith

- `packages/domain`: tenancy, customers, fleet, rentals, templates, signatures,
  integrations and billing; no Next.js or provider imports.
- `packages/application`: authorized use cases and transaction orchestration.
- `packages/infrastructure`: future PostgreSQL, storage and provider adapters.
- `apps/document-worker`: isolated template inspection/conversion/rendering.
- `apps/integration-worker`: durable export and notification processing.

`packages/infrastructure/database` is now an offline tooling workspace with Drizzle
schema, SQL drafts and an injected transaction helper. It constructs no client,
reads no environment credentials and is not imported by the web application.
Its public entry is marked `server-only`. A separate guarded operational migration
CLI exists after P1.2B-1R; it is not exported to web request handlers and opens a
connection only after explicit apply/configuration/approved-plan checks. It was not
invoked during offline work. Other package/worker directories still
reserve boundaries through documentation. Supabase Auth now provides SSR Magic Link
and Google OAuth flows; agency authorization remains separately gated pending live
RLS tests. See [Supabase Auth](supabase-auth.md) and [database foundation](database-foundation.md).

The approved database threat model is a trusted server SQL executor, described in
[tenant SQL boundary](tenant-sql-trust-boundary.md). PostgreSQL settings do not prove
identity or defend against arbitrary SQL using compromised runtime credentials.

Agency membership will never grant platform privileges. Platform principals,
sessions and MFA are separate concerns. The agency gate verifies Supabase identity
and membership separately; its new restricted lookup is disabled pending live tests.
Platform administration remains a placeholder with no enabled administrative access.
Future server operations require their own permission boundary and non-privileged
database roles with RLS. Public signing will use narrowly scoped invitations, not
dashboard sessions. Never use route naming as evidence of protection.

## Cache and privacy baseline

The locale layout forces dynamic rendering and no-store fetch defaults. Response
headers request private/no-store caching; production smoke tests check the actual
HTML responses because framework behavior may override configured headers.
Security headers also prevent framing and referrer disclosure and disable sniffing
and indexing. These controls are not authentication or a complete production
security policy. Immutable framework assets may still be publicly cached.

There is no service worker, manifest or offline storage. Future PWA caching must
allowlist public static assets only. Never cache authenticated responses, contracts,
identity documents, signature evidence or token-bearing pages for offline access.
Contract creation, signing and export remain online-first.

Future route handlers must explicitly enforce authorization and no-store behavior;
future service/data adapters must not opt into caching sensitive values. Separate
server caches, browser memory and session cleanup also require review when auth lands.

## Preserved future guarantees

Contracts and durable export jobs commit atomically. Signing remains agency first,
client second, against immutable document revisions. Google export is one-way:
reserved row bindings, same-row status updates, no blind append retry, reconciliation
on structural conflicts. No business or external-service functionality is implemented
in this bootstrap.
