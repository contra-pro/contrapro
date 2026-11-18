# Canonical identity provisioning — Development deployed, activation disabled

Migration `20261116000700_canonical_provisioning.sql` is deployed to **Development
project gllsiklbvqpxzucvkehw only**, after 0006. Operator postflight evidence is saved
in [postflight-output.txt](deployment-0007/postflight-output.txt): exact native history
0000-0007 (lines 37-52), restricted role/SET boundaries (54-73), matching function
definitions/ACLs (77-174), FORCE RLS/policies/grants (176-243), exit 0 (247).
The subsequent manual semantic review passed. This records supplied, reviewed
Development evidence; it does not claim Production deployment or runtime acceptance.
Provisioning remains OFF and authenticated EXECUTE remains denied. Preparation of
the [security acceptance harness](canonical-acceptance/README.md) makes no live calls.
Earlier offline preparation did not change existing migrations, auth callback,
auth-access RPC or probe; frozen migration hashes remain historical evidence.

## Authorization model

The zero-argument `public.contratpro_provision_identity()` obtains its only subject
through `app_private.provisioning_subject()`. No caller supplies an identity or claims.
Supabase's trusted JWT-verifying PostgREST gateway establishes authentication;
GUC values and managed Auth helpers alone are NOT cryptographic authentication.
The authenticator database credentials must remain confined to that gateway.
Direct SQL access using compromised authenticator/administrative credentials is
outside this trust boundary; the bridge does not independently verify JWT signatures.

The SECURITY DEFINER owner is the separate `contratpro_identity_writer`, NOLOGIN,
NOINHERIT and NOBYPASSRLS, never a table owner or application login. FORCE RLS stays
enabled. Only identity column SELECT/INSERT and required schema privileges are
granted; there is no UPDATE/DELETE, agency, membership, platform or journal access.
The writer receives USAGE on identity, app_private and public, never delegated auth
USAGE. All four new RLS policies and the provisioning function use the private bridge.
The three managed Auth helpers retain their existing PUBLIC EXECUTE ACLs. The draft
checks their exact signatures, return types and PUBLIC EXECUTE, and verifies ordinary
postgres EXECUTE and auth-schema USAGE. No managed helper/schema ACL is changed.
Policies expose only the current subject's mapping and its canonical user. Candidate
user INSERT permits active, distinct generated IDs; the non-login role is reachable
only through the fixed function, which accepts no target ID. No insert RETURNING
reads an as-yet-unlinked user. Fixed search_path and row_security settings apply.

## Data-free auth context bridge

`app_private.provisioning_subject()` is zero-argument, VOLATILE SECURITY DEFINER,
retained under postgres ownership, with exactly search_path=pg_catalog and
row_security=on. The owner already has ordinary auth-schema USAGE; no grant option
on that managed schema is needed. Its body accesses only managed Auth helpers,
the current session context and scalar validation functions, with no application
table reads, writes, dynamic SQL, file access or arbitrary function arguments.
The postgres role is privileged, so preserving this exact data-free body is a
security boundary; SECURITY DEFINER is not claimed to make postgres unprivileged.

The bridge requires session_user=authenticator and the current role setting to be
authenticated, even across nested SECURITY DEFINER calls. It validates a non-null
subject, object-shaped claims, typed sub/role/issuer/audience/anonymous/expiry claims,
managed uid versus JWT sub consistency, managed role versus JWT role consistency,
the pinned issuer, authenticated audience and is_anonymous=false. Expiry must be a
positive integer within the existing application's safe millisecond range and must
remain in the future. Missing/malformed claims or helper failures produce only
fixed Denied/42501 errors. It returns only the subject UUID, never a JWT or JSON claims.

PUBLIC, anonymous, authenticated, authenticator, service_role, runtime and agency
writer EXECUTE are explicitly revoked. Only the identity writer gets non-grantable
EXECUTE, apart from intrinsic owner privileges. Final assertions check exact bridge
owner/signature/security settings, ACLs, effective writer access and ordinary caller
denials. The public provisioning RPC remains denied to authenticated users.

**Runtime assumption still unverified:** deployed PostgREST must actually use the
authenticator session identity and authenticated role posture, preserve verified
claims across nested definer calls, and issue the typed claims above. Another login
or missing claim fails closed; do not broaden the allowlist based on a guess. Before
activation, separately verify the real gateway identity and these rejection paths.
The server-side verifiedSubject validation remains unchanged as defense in depth.

The read-only preflight checks both function-name collision sets, app_private owner
and creation/delegation authority, bridge-owner ordinary auth access, managed helper
dependencies, creator-role bounds and global/public/app_private function defaults.
It never calls the bridge. Before deployment it prints ABSENT_EXPECTED_PREDEPLOYMENT
and NULL bridge security checks, not successful runtime verification. If an unexpected
bridge exists, bounded catalog checks show owner, signature, settings, ACL boundary
and effective EXECUTE facts, and the collision/history checks still block deployment.
Actual post-creation bridge checks run in the migration's final assertions; live
invocation, cross-user denial, RLS and concurrency tests remain separately gated.

PUBLIC/anon/authenticated/service_role/runtime/agency-writer EXECUTE is revoked
before owner transfer. No authenticated EXECUTE grant is included: even after
deployment the RPC remains unavailable to application users until separate approval.
Final assertions reject unexpected ACLs, grant options, ownership, SET access,
outgoing memberships and owner role attributes. Existing provider administrative
postgres memberships may remain ADMIN-only, with neither INHERIT nor SET.

## Atomicity and idempotency

If an active, distinct linked user exists, return `existing`. A disabled, missing or
inconsistent linked user is rejected; it is never reactivated, repaired or relinked.
Otherwise generate a distinct internal UUID and insert an active user and unique
subject link together. No email is used and no agency/membership is created.

Both inserts are inside one PL/pgSQL exception subtransaction. A unique collision
rolls back both candidate inserts, preventing an orphan. At READ COMMITTED, concurrent
same-subject callers can read a committed winning active mapping and return `existing`.
A collision without a valid visible winner fails closed. Higher isolation levels
can reject a concurrent call; there is no automatic retry. The existing primary key,
unique internal-user link and foreign keys remain unchanged. Provider deletion and
disabled-user races require real PostgreSQL tests; later access revalidates identity.

The server-only adapter `auth/canonical-provisioning.ts` validates the user through
the existing `verifiedSubject` and calls only this fixed RPC, with no arguments.
It returns fixed `created`, `existing`, `blocked`, `unavailable` or `uncertain` states, without raw
errors or data. It defaults OFF through CONTRATPRO_CANONICAL_PROVISIONING_VERIFIED.
The prepared `POST /{locale}/auth/provision` entry point calls it only after exact
same-origin checks, an empty-body check and verified Supabase authentication.
Both CONTRATPRO_CANONICAL_PROVISIONING_VERIFIED and CONTRATPRO_AUTH_ACCESS_VERIFIED
must be true; neither flag is activated by this implementation. Disabled provisioning
does not construct a client or call an RPC. The existing GET auth callback never
provisions; there is no automatic form submission or retry and no UI activation.
The endpoint accepts no identity, role, tenant, redirect or other parameters.
Already mapped active users skip the write. Only a verified unmapped result can
reach the parameter-free provisioning RPC. After created/existing acknowledgement,
the same request client must resolve a valid active canonical identity for the
original verified subject before returning success and a fixed localized app
destination. Missing, malformed or disabled mappings fail closed. An ambiguous
write/read-back returns fixed uncertain/503 and is never automatically retried.
No agency or membership is created. Repeated/concurrent explicit requests rely on
the existing RPC's idempotency contract; offline fixtures do not prove SQL races.
No admin/service-role credentials are used. The existing session refresh behavior is unchanged; the
read-only Development probe still independently blocks refresh and writes.

## Separately authorized deployment and activation sequence

1. Review 0007 and execute it through the approved atomic native migration path,
   verifying role-creation/ownership authority and effective ACLs. Keep its EXECUTE
   unavailable, application flags OFF and all earlier migrations immutable.
2. Separately authorize restricted-role tests and the exact authenticated EXECUTE
   grant for this function only. Verify default-PUBLIC and managed-role grants are
   absent, runtime users have no direct identity writes or SET access, and RPC calls
   cannot choose a subject. This grant is an activation mutation, not included here.
   It must run with actual function-owner grant authority; SET-only membership does
   not inherit it. Any temporary owner SET authority and its removal require review.
   Do not repeat 0005's earlier post-transfer GRANT/REVOKE ordering mistake.
   Never grant ordinary application roles direct bridge EXECUTE, auth-schema USAGE
   or capability-role membership. Verify gateway identity/role and claim consistency,
   malformed/expired/anonymous denial and bridge-only helper access under the writer.
3. Review the prepared same-origin POST flow and separately authorize its UI caller
   and activation; enable only its new application gate after those checks.
   Do not silently enable the existing auth-access, agency-write or clients flags.
4. Authorize one synthetic test-user call. Repeat it to verify one mapping/user;
   test concurrent calls, injected insertion failures, disabled users, conflicting
   links and unauthenticated attempts. These are live tests, not this task's mocks.
5. Run the existing restricted read-only Development probe under its separate
   authorization. Expect `onboarding_ready` for an active user without memberships.
   This does not prove cross-tenant isolation or authorize the agency-access flag.

## Rollback and uncertainty

A pre-COMMIT migration failure must roll back its entire file; verify uncertain
commit/history state before retrying. After confirmed deployment, deactivate by
revoking authenticated EXECUTE and disabling its app integration under approval.
Do not delete canonical users/mappings to roll back: dependent records and identity
history may exist. Any removal needs a separate dependency-aware migration. A lost
provisioning response is uncertain; do not claim failure or create a replacement
identity. A later explicitly authorized repeat is idempotent for the same subject.

Offline tests parse SQL/PLpgSQL and inspect transaction/ACL/RLS contracts. Adapter
tests use injected SDK fixtures. They do not establish actual PostgreSQL role
authority, concurrent visibility, RLS enforcement or atomic rollback. No identity
audit table or complete identity audit trail is introduced by this minimal slice.
