# Fixed A02 executor and independent observation procedure

PREPARED, NOT REVIEW-APPROVED OR AUTHORIZED. Development gllsiklbvqpxzucvkehw only.
No CLI entry point calls the Auth executor. Importing it is inert. It accepts only
injected dependencies; no key, password or channel is discovered from files/env.

## Auth executor

`scripts/a02-auth-create.mjs` exports `createA02AuthCreator` and the separate pinned
`createA02AuthAdminTransport`. The ordinary A02 session transport stays unchanged.
Local source support: `node_modules/@supabase/auth-js/src/GoTrueAdminApi.ts`
createUser uses POST `/admin/users`; `lib/types.ts` AdminUserAttributes supports
explicit id and email_confirm. This is not proof of the live Gateway's behavior.

Future approved isolated executor composition:

1. Use the existing hidden input helper once; retain the synchronous A/B/U provider.
   Admin header provider comes separately from the operator-approved memory-only
   channel. It supplies only apikey and Authorization; never put them in packets,
   receipts, argv, errors or logs. The exact private channel reference remains UNBOUND.
2. Supply `send:createA02AuthAdminTransport()`, the credential provider, the separate
   adminHeaderProvider and independently captured `absenceCheck` to
   `createA02AuthCreator`. Do not wrap it in an SDK with retries, proxies or logging.
3. Pass an explicitly approved receipt with projectRef, runReference, reference,
   maximumCreates:3, start/end milliseconds (120 minutes), and wrapperExpiry matching
   the rendered SQL. A local object is an authority assertion, not cryptographic
   proof of approval; the human must verify the referenced signed/reviewed packet.
4. `absenceCheck` must match the exact UUID AND private address against independently
   captured evidence, returning runReference, subject, email, idExists:false,
   emailExists:false, receiptReference and observedAt (<=30s old). It performs no
   login, refresh or creation. The email-bearing response stays inside private memory.
   No constant true callback. Reobserve only with an expressly approved budget.
5. One sequential A/B/U attempt each, no substitution. Body keys only id, email,
   password, email_confirm:true. No metadata, roles, phone, invitations or updates.
   Admin confirmation is privileged attestation of privately verified inbox ownership;
   it must be included explicitly in Gate 2 approval. No confirmation email is sent
   by createUser per the local SDK documentation. Creation responses must match both
   nominated ID and email, but remain acknowledged, never independently confirmed.
6. Each absence callback <=2s; HTTP <=7s; body parse <=2s/32KiB; whole create phase
   <=30s. TLS peer/hostname verification, fixed URL, no redirect/retry/cookies/proxy.
   Any failure after an attempt is uncertain, stops all creates and requires exact-ID
   read-back. The one-shot instance cannot be reused. Creating a new instance/process
   does not authorize retry. Dispose provider in finally after approved session work.

Review the artifact and its SHA-256 before use. Offline fixtures are not approvals.
The bounded callback consumes an independent capture; it does not claim that the
separate observation itself completed within its callback's two-second budget.

## Independent observer and operation ceilings

Use a separate read-only PostgreSQL 17 observer process with verify-full and the
approved CA/Development route. Observer may be operated by the owner, but must
capture evidence separately from the mutation process; the observation role and
private destination must be explicitly bound. Do not infer success from executor
receipts. Every capture has target/run/checkpoint/start/end/exit/ROLLBACK/file SHA-256
in a non-secret manifest. Keep private canonical IDs in the approved private capture.
No passwords, emails, JWTs, headers or raw Auth errors in that manifest.

Normal ceilings (no automatic repeats):

| Artifact/operation | Maximum runs | Expected result |
| --- | ---: | --- |
| Existing exact-ID inventory | 1 before install | All exact nominated IDs and mappings absent |
| Private parameterized email collision transaction in secure-credential-input.md/runtime-readiness | 1 immediately before create phase | Three UUID/email pairs absent; exact inputs privately bound; full transaction <=20s |
| cohort-observation.sql | 6: baseline, post-install, after three Auth creates, after A, after B, post-removal | Baseline unmapped; post-Auth three unmapped; A then B active/distinct; U never mapped; zero scoped business references |
| post-removal.sql | 1 after removal | removal_ok, no temporary access |
| Native dry-run | 2 normal, one per install/removal package | Exactly the reserved pending stage each time |
| Auth creation | 3 total | A/B/U acknowledged then independently observed |
| Existing session bootstrap | 6 HTTP total | Exact server-verified subjects; no refresh |
| Wrapper | 2 HTTP total | One A then one B, independent mapping confirmation |

Each cohort observation is one read-only transaction, four timeout/search-path SETs,
one guard SELECT and six bounded result SELECTs, then ROLLBACK; apply an external
20s total process deadline. SQL guard failure exits nonzero. On timeout/disconnect,
ROLLBACK if possible, close the observer connection and mark capture incomplete.
Private mapping read-back uses the exact subject/label in the capture; reject missing,
stale (>2s at consumption), duplicate or mismatched captures. Capture after each write
before returning confirmMapping; if the two-second confirmation limit is exceeded,
retain uncertain and use separately approved reconciliation rather than inventing PASS.

Capture wrapper source/settings/ACL/history and compare against the exact rendered
file plus archived baseline. `pg_get_functiondef` differs from migration text: compare
semantically, or fingerprint like representations, never compare unlike hashes.
For wrapper effective EXECUTE verification use the existing reviewed authority
evidence query scope; its exact checkpoint subset and run budget require review.
The new cohort snapshot does not itself prove every inherited/effective ACL boundary.

Scoped business queries cover memberships (including revoked), created agencies,
clients, invitations and audit references to the cohort. They do NOT prove absence
of arbitrary unrelated writes or transient rows later deleted. Bind separately
reviewed complete mutation/egress and in-flight accounting if that stronger claim is
required. No global counts or constant booleans may stand in for that evidence.
This independent evidence-source reference remains UNBOUND, a live readiness blocker.

## Immediate removal and failure branch

After A/B attempts are accounted for and independent read-back captured, immediately
remove the wrapper; do not wait for expiry or perform further setup. The original
RPC stays denied and application provisioning OFF. Unknown writes must first be
accounted for under the approved in-flight procedure; expiry is not cancellation.

Recovery ceilings, only if explicitly included in approval: one extra cohort snapshot
per uncertain phase (install, Auth, A, B, disable, removal; max six); one disable
dry-run and native disable stage; one post-disable snapshot; one replacement removal
dry-run using both receipts. No repeated write attempts or open-ended polling.
Reconciliation must prove the original attempt is finished before a later stage;
the exact in-flight observer/source is still UNBOUND. If unavailable, stop setup
and obtain specifically scoped recovery authority. No automatic session cancellation.

Existing install/disable/remove templates and native generator remain the only DDL
path. Preserve reserved versions and original applied bytes. DROP RESTRICT failure
rolls back its revoke: use separately approved disable, verify denied access, then
resolve dependency under separate scope and remove. Removal works after expiry;
never refresh applied expiry. Gate 4 cleanup is separate privileged RLS-bypass
authority, never automatic compensation. Gate 3's three GETs also remain separate.

## Review/reference slots (no fabricated references)

Packet reviewBindings stores executorReview, observerReview, adminChannelReview,
privateEvidenceDestinationReview and inFlightEvidenceReview as UNBOUND until actual
review receipts exist. Private references identify an operator-controlled resource
without containing its secret contents or private addresses. The operator supplies
the real destination/channel identifier; this document does not invent one.
No READY status or execution permission follows from preparation or offline tests.
