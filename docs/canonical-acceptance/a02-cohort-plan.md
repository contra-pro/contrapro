# Development A02 synthetic cohort plan

**BLOCKED — preparation only; no execution approval and no writes performed.**
Target only gllsiklbvqpxzucvkehw. A01 is accepted and is not repeated. Provisioning
stays OFF; authenticated provisioning EXECUTE stays denied. No migration, grant,
new SQL capability, role change, RLS bypass or general fixture framework is proposed.

## Decisive constraint: no existing allowed canonical-write path

Migration 0004 lines 15–20 describes a separately authorized trusted mapping
workflow but does not implement one. Identity tables are FORCE RLS. Ordinary roles,
including service_role, have no direct identity INSERT privileges (0003 lines
25–26; 0004 lines 22–30). A Supabase Auth administrator is not thereby an authorized
ContratPro identity-table writer.

Migration 0007 lines 19–24 gives the NOLOGIN/NOBYPASSRLS identity writer limited
column INSERT/SELECT privileges. Its insert policies (lines 70–77) depend on
app_private.provisioning_subject(). The bridge (lines 29–61) requires session_user
authenticator, effective role authenticated and verified typed JWT context.
Postgres/SQL setting spoofing is not that gateway context. Final membership
boundaries do not permit ordinary roles to SET the writer role. The public
provisioning function's ordinary EXECUTE privileges are revoked (lines 109–113).

Therefore none of these is an allowed fixture creation mechanism:

- Direct postgres/service-role identity inserts using elevated RLS bypass.
- SET row_security off, disabling FORCE RLS, new permissive policies or table grants.
- SET ROLE identity_writer, manufactured request claims or authenticator impersonation.
- Temporarily enabling provisioning or granting authenticated provisioning EXECUTE.
- Calling the bridge directly, using agency creation, or modifying existing users.

**Stop before creating Auth users.** A/B cannot receive canonical mappings through
an existing supported path while all these restrictions hold. A new specifically
reviewed trusted mapping capability, or an explicit change to the constraints,
would require a separate design/security decision and authorization. Neither is
silently included here. No executable identity INSERT procedure is supplied.

## Four independent approval gates

| Gate | Required approval | Current disposition |
| --- | --- | --- |
| 1: procedure | Review this plan, resolve canonical-write authority, verify Auth API options, isolated executor, recovery and cleanup ownership | BLOCKED on canonical authority and missing executor |
| 2: Development writes | Exact three new Auth identities, two new canonical users/two links, bounded managed Auth side effects, and three sign-ins/session verification calls; explicit project/cohort/time window | Not authorized; do not start partial creation |
| 3: A02 reads | Exactly three GET auth-access RPCs, A/B/U, plus explicitly bounded independent evidence reads | Separate from creation/sign-in approval; not authorized by this document |
| 4: cleanup | Exact cohort IDs, dependency checks, canonical deletes and Auth administrator deletes/session invalidation | Separate destructive authority; never automatic compensation |

Gate 1 approval is not Gate 2 execution approval. Gate 2 does not authorize A02 or
cleanup. Any future mapping design requiring security changes is outside these
gates until separately reviewed; do not treat it as permission to weaken controls.

## Schema-specific invariants and bounded inventory

Use existing scripts/inventory-a02-identities.sql and its documented verified
Development psql 17/session-pooler/CA/verify-full procedure. This is an independent
privileged read observer, not a write authority. No population scan. It sees only
three nominated synthetic Auth UUIDs and outputs labels, booleans and UTC snapshot.

| Object | Required final cohort delta / invariants |
| --- | --- |
| auth.users | Exactly three new subjects, A/B/U distinct; ordinary authenticated, non-anonymous synthetic email users |
| identity.users | Exactly two new rows; fresh independent canonical UUIDs; explicit state active (default is disabled) |
| identity.supabase_users | Exactly two links, A and B; no U link; PK supabase_user_id and UNIQUE user_id; both FKs ON DELETE RESTRICT |
| tenancy.memberships | Zero for both canonical IDs, including revoked rows; U has no canonical principal to join |
| agencies, invitations, clients and other business data | Zero created or changed by this procedure; no business endpoints invoked |

Sources: 0001 lines 31–55, 0004 lines 17–20; business creator references also exist
in 0005/0006. A/B canonical IDs must differ from each other and all three Auth IDs.
Do not treat Auth UUID equality, email equality or metadata as a canonical mapping.
No reuse, activation, relinking or membership deletion of any existing account.
Managed Auth provider identities, password hashes, sessions and refresh-token rows
are owned by Supabase Auth; do not promise exactly three physical Auth rows total
or write its supporting tables directly.

## Conditional exact creation sequence — not executable until Gate 1 resolves

1. Before any Gate 2 call, confirm Development target and existing denial/gate
   evidence. Review live Auth signup triggers/hooks and effective application
   configuration for unintended canonical, agency, invitation or business writes.
   Repository migrations do not install Auth-user signup triggers, but cannot prove
   there are no managed/custom live hooks. Unknown side effects block creation.
2. Generate a private cohort nonce, three cryptographically random proposed Auth
   UUIDs and two separate random canonical UUIDs. No hardcoded mock IDs. Independently
   prove all five are unused using exact-ID read checks; inventory covers the three
   Auth IDs only, not absent orphan canonical IDs. All three inventory rows must
   initially be AUTH_NOT_FOUND. Keep a protected operator manifest outside the
   repository: logical labels, IDs, creation state and evidence references only.
3. The installed Auth SDK supports auth.admin.createUser({id,email,password,
   email_confirm:true,role:'authenticated',app_metadata:{...}}). Its implementation
   performs POST /auth/v1/admin/users (GoTrueAdminApi.ts:480); AdminUserAttributes
   includes explicit id, email_confirm and role. Use only an existing approved
   Development Auth admin authority in an isolated server-side operator process.
   This authority is project-wide, not restricted to three users by their labels:
   require a pinned project URL, exact-ID allowlist, no arbitrary URL/user inputs,
   and an independently reviewed request log with all credentials redacted.
   Never grant SQL service_role writes or export admin authority to a browser.
   Preassigning RANDOM IDs supports exact-ID reconciliation, not deterministic
   UUID impersonation or canonical-ID equality. Confirm this API option is supported
   by the deployed Auth service before approving Gate 2; installed types are not
   live provider proof.
4. After Gate 2, issue at most three sequential createUser calls, one per label,
   each <=7 seconds; no automatic retry. Use unique synthetic addresses on an
   operator-controlled test domain and strong independently generated passwords.
   All credentials/admin keys stay in the protected process or approved external
   secret store, never argv, logs, chat, transcripts or repository files. Auto-confirm
   only these synthetic users; do not send invitation/signup/magic-link emails.
   An optional admin-owned cohort/label marker is ownership evidence, not an app
   authorization grant. Verify returned IDs exactly; do not print raw Auth responses.
5. Independently inventory A/B/U after Auth creation: exactly three existing,
   unmapped subjects. If unexpected mappings or side effects appear, stop. Do not
   overwrite or invoke provisioning to repair them.
6. **BLOCKED mapping step:** once a compliant trusted mapping procedure is separately
   approved and exists, it must create BOTH active canonical users and BOTH A/B
   links in ONE bounded database transaction. That executor must enforce RLS under
   its approved contract, exact IDs, absence/collision guards and serialized cohort
   access; current scripts supply no such executor. Do not substitute privileged
   SQL. Use explicit active state, no ON CONFLICT UPDATE/DO NOTHING, no membership
   writes; assert exactly two users/two links before commit. On failure roll back
   all four inserts, leaving all three Auth accounts unmapped and zero candidate
   orphan rows. An approved exact-ID candidate observer must check both planned
   canonical IDs because inventory alone cannot detect unattached canonical rows.
7. Independently inventory after the mapping commit: A/B MAPPED_ACTIVE_NO_MEMBERSHIPS,
   U UNMAPPED, all auth_exists true, all_three_ready true. Verify expected two-row
   candidate delta and zero unrelated/business changes through the approved scoped
   observer. This is the required baseline before any session acquisition/A02.

Steps 3–7 are a review specification, not runnable commands. Auth API creation
cannot participate in the canonical database transaction. Partial Auth creation is
possible; no distributed atomicity or automatic rollback is claimed.

## Idempotency, ambiguity and rollback

Before initial creation, require absence. On a later explicitly authorized resume,
use exact proposed IDs and protected ownership/cohort evidence. Existing rows may
be accepted only if every expected relation/state matches; perform no write for
those rows. Unknown ownership or mixed/incorrect state blocks. Never update an
existing account because email matches. No broad Auth listUsers call or SQL scan.

If an Auth response is lost, do not repeat createUser. Reconcile by the preassigned
Auth UUID using separately approved admin getUserById or exact-ID read observation.
If none can confirm the outcome, retain uncertain state and stop. If mapping commit
acknowledgement is lost, reconcile both exact canonical IDs and links after the
writer session finishes; zero/two/partial outcomes require explicit review, not a
retry/repair. Absent rows permit a new operation only under renewed authorization.

Only the uncommitted canonical transaction can be rolled back automatically.
Committed Auth users and mappings must remain recorded for Gate 4. Do not delete
partial users as an unapproved failure handler.

## Secure fresh-session acquisition (separate from the three GETs)

There is no existing secure A02 session bootstrap. Gate 2 must explicitly include
issuing three fresh password sessions for these NEW synthetic accounts, and three
independent server-verification reads (or a reviewed equivalent). These are live
Auth operations and managed Auth writes, not part of Gate 3's three-RPC budget.
If login/session issuance is not approved, A02 remains blocked; no admin-created
user object, forged JWT, SQL claims or service-role token substitutes for a session.

Use a minimal isolated memory-only process with separate admin and user clients;
discard admin authority before user tests. User clients must use the Development
public key, persistSession:false, autoRefreshToken:false, detectSessionInUrl:false,
debug:false, no storage/logging adapters. Installed GoTrueClient.ts:1236 implements
signInWithPassword via POST /auth/v1/token?grant_type=password. Use one client per
label and one sign-in per label, deadlines <=7 seconds, no automatic retry/refresh.
Independently verify each access token against the pinned Auth service and bind
subject to the private expected UUID; record actual successful verification time.
Any unsupported captcha/rate-limit/provider requirement blocks rather than altering
shared Auth security settings. Review hooks for sign-in/verification too.

Keep passwords/access/refresh tokens only in operator-controlled memory; disable
transcripts, debugger/header/body logs and dumps. Do not send credentials through
CLI arguments or repository files. Expose only the access token and required
baseline/freshness fields to createCategoryAObserver in the same process; never
serialize the full Auth response. Tokens must satisfy existing authenticated,
non-anonymous issuer/audience/expiry checks and verification age <=60s with >10s
expiry margin before/after each A02 read. Do not relabel stale evidence as fresh.
Load plan and prepare observers before sign-in, then obtain Gate 3 approval before
issuing A/B/U GETs. If approval is delayed beyond freshness, stop; further Auth
operations require their own explicit authority. SDK defaults refresh/persist, so
normal application clients are not suitable without this reviewed configuration.

## Cleanup — Gate 4 only, no executable delete script

Reconfirm ownership, cohort manifest and exact dependencies immediately before
cleanup. Restrict cleanup to the three Auth IDs and two canonical IDs; no cascades,
global predicates or modifying unrelated users. Freshly check ALL foreign keys,
triggers and owned resources. In this repository canonical identities can be
referenced by identity.supabase_users, tenancy.memberships,
tenancy.agencies.created_by_user_id and tenancy.clients.created_by_user_id; inspect
the actual deployed dependency set for additional references. Any business use,
membership or unknown dependency blocks cleanup; do not delete business rows.

Canonical cleanup itself lacks an allowed executor under the present constraints:
the identity writer has no DELETE grant/policy. Resolve this separately before
approving creation, without granting ordinary writes or bypassing RLS. If an
approved cleanup capability later exists, delete only the two exact cohort links
then two canonical rows atomically, asserting counts and absence of dependencies.
FK RESTRICT forbids deleting Auth users while links remain. Only afterwards may
approved Auth admin deleteUser(id,false) delete the three exact Auth identities;
the installed SDK also performs a preliminary getUserById, which belongs in its
approved request budget. Verify hard deletion and session/resource handling under
the deployed Auth contract; do not assume already-issued JWTs vanish immediately.
No cleanup call, token revocation, RLS change or cascade is authorized here.

## Blocking decisions before any execution

- Resolve a schema-compatible canonical creation AND cleanup authority that does
  not violate the explicit no-bypass/no-grant/no-activation constraints. None exists
  in the inspected repository/deployed contract.
- Approve the Development-only Auth admin executor, proposed random IDs/test domain,
  secure external credential custody, side-effect checks and exact-ID recovery.
- Review/implement the minimal in-memory session bootstrap, pinned HTTPS transport
  and independent baseline/no-change observers; existing A02 harness is reused.
- Obtain Gates 1–4 separately as applicable. No gate is implied by this preparation.

No runnable creation command can honestly satisfy all current requirements. The
smallest next action is a Gate 1 security/design decision resolving the missing
trusted canonical-write/cleanup mechanism, before any partial Auth cohort creation.

## Offline preparation verification

```powershell
node --test scripts/a02-identity-inventory.test.mjs
node --test --test-name-pattern="A02|session|JWT|configuration|transport" scripts/canonical-category-a-observer.test.mjs
```

Results: 6 static inventory checks and 25 selected observer tests passed, zero
failures, both exit 0. Only this plan and the README pointer changed. No TypeScript
or lint rerun was needed for Markdown-only changes. Static tests and installed SDK
source do not prove live authority, Auth options, side effects or fixture creation.
No HTTP/SQL, credentials, user creation, grants, activation or cleanup was executed.
