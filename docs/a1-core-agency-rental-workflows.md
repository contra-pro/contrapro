# A1 — Core agency and rental workflows

2026-11-25. Local implementation from baseline `ae41f6c`; **not deployed or accepted
in a live environment**. Earlier reconciliation documents were already dirty and
were preserved/updated. No prior SQL migration or draft was edited. No environment
file, external account, provider, remote database or production host was changed;
no real invitation email, payment, commit or push was performed.

The next guarded forward draft is
`supabase/migration-drafts/20261125002100_agency_rental_workflows.sql`. It begins with
an unconditional exception and ends with `ROLLBACK`. Only a disposable PGlite test
projection removes those guards, in memory. This does not authorize deployment.

## Implemented behavior

| A1 area | Executable behavior | Primary source / automated evidence |
| --- | --- | --- |
| Team | Existing memberships, invitations, roles and role-permission contracts reused; list/status, custom role permission editing, role assignment, invitation prepare/accept/revoke/expiry, member deactivation/reactivation, durable receipts and audit | `apps/web/src/operations/{handler,model,repository,team,invitation}.ts*`; new `app/[locale]/app/team` and `team/accept` routes; `operations/handler.test.ts`, `model.test.ts`, `workspace.test.tsx`; DB `a1-workflows.test.ts` |
| Signers | Explicit per-member authorization/name, eligibility, grant/revoke, rental selection and server-side execution checks; existing `contracts.sign` capability remains necessary | 0021 `agency_signers`, signing authorization/selection guard and revocation helper; team and rental interfaces; actual signing RPC assertions in DB test |
| Branding | Reusable legal/commercial name, representative/role, existing colors, bounded PNG upload/replacement/read/removal and private objects; address/contact/ICE/IF/RC remain in existing profile editor | `operations/branding.tsx`, `logo.ts`, existing agency profile, 0021 branding/object policies; `operations/logo.test.ts`, DB asset and snapshot assertions |
| Locations | Pickup/return entered atomically with A1 rental creation, editable while draft, displayed on detail before handover/return, captured in immutable versions and exported | `rentals/workspace.tsx`, `operations/rental.tsx`, `locationInput`, 0021 rental operation/create/guard/capture and Sheets snapshot composition; DB persistence/lifecycle/export assertions |
| Rental accounting | Advance/partial rental payments, exact amount paid/remaining/status, separate deposit collection/return, date/method/reference, append-only history and full-entry correction/reversal | `operations/model.ts`, `rental.tsx`, 0021 `rental_payments` and summary/receipt/revision logic; model, handler, retry and actual SQL tests |
| Delivery | Prepared manual private invitation link and separately queued encrypted team-email option; reuses existing `delivery_jobs`, payloads, worker, Resend adapter, provider inbox and billing email quota | `delivery/team.ts`, `team.test.ts`, shared purpose/messages/copy, 0021 delivery wrappers; DB claim/arm/result/revoke tests. No real send |
| Documents | New mapping keys for captured legal/commercial/representative information and rental-payment balances/method/date/reference; opt-in agency logo uses captured issuance-time bytes | `documents/model.ts`, `service.ts`, mapping editor; `operations/logo.test.ts` plus existing document tests. No template redesign or preconfirmation preview added |
| Sheets/billing | Existing initial-create event remains singular; payment changes advance existing heads/jobs/events without changing signed rental versions; location/payment values exported; membership/storage/email quotas use existing 0020 triggers | 0021 composition; actual DB test through 0020/0021; existing regression suites retained |

## Concrete policies and compatibility

- **Team hierarchy:** only an active canonical owner with existing `agency.manage`
  administers members, invitations, roles and signer authorization. Assigning that
  capability to a non-owner custom role does not make it an owner or platform admin.
  The reserved owner and authorized-signer role definitions are not editable through
  custom role management. No platform role/identity grant is introduced.
- **Owner safety:** changes must leave an active owner whose canonical identity is
  active and whose owner role retains `agency.manage`. Self-deactivation is explicitly
  denied; another owner must perform it. Member changes have expected revisions.
  One agency-scoped transaction advisory lock serializes acceptance, reactivation,
  grants and owner checks. The RPC refuses isolation other than READ COMMITTED,
  matching the original rental boundary. Native concurrency still requires acceptance.
- **Invitation identity:** no email-to-canonical-user provisioning or new identity
  model is introduced. Acceptance requires an already verified/mapped Auth account.
  The server obtains a fresh `auth.getUser()` confirmed email and signs that value
  in the gateway MAC; submitted user IDs/emails cannot supply acceptance authority.
  SQL independently resolves the caller’s canonical identity. Both the inviting
  membership and its canonical identity must remain active and authorized.
- **Invitation secrecy/replay:** seven-day expiry, SHA-256 token digest only in the
  invitation record; retry-stable HMAC-derived 256-bit token. The URL fragment is
  removed on subscription, kept only in component memory, and submitted in same-origin
  no-store POST bodies. Accepted membership is bound to the canonical user. Replay
  returns that active membership and cannot reactivate a revoked one. Pending
  invitations do not consume team seats; acceptance/reactivation do, through 0020.
  Invitation preparation is bounded to 100 per agency/hour.
- **Email:** preparing a link does not send or claim delivery. The explicit queue
  action uses the existing expiring encrypted envelope/key-ID/AAD conventions and
  the same delivery worker. Only one job is admitted per invitation. Changed keys
  cannot silently generate a different token: digest mismatch requires revoke/reissue.
  Revoked/accepted/expired invitations are not newly dispatched. An armed uncertain
  send is never automatically redispatched. Provider acceptance is not recipient
  delivery. Worker observations retain the initiating inviter plus an explicit
  `performedBy: delivery-worker` audit disposition, not a fabricated human action.
- **Signer revocation:** a member needs both designation and actual `contracts.sign`.
  An explicit rental selection must match the session’s initiating agency member;
  absent selection retains the existing eligible-initiator default. Existing
  capability holders are represented during migration without granting signing to
  every owner. Revocation/deactivation/loss of capability cancels unfinished assigned
  sessions and revokes their client invitations. Completed sessions, typed identity,
  PDF bindings and event chains are preserved. Reactivation does not restore signer
  designation automatically. Agency-first/client-second order remains unchanged.
- **Branding:** optional business identifiers stay optional. A1 adds no speculative
  identity fields or full template redesign. PNG content is structurally screened,
  decoded by the existing PDF image engine, capped at 200 KiB and 2048×2048, and
  stored without overwrite in the existing private `contract-documents` bucket.
  No SVG, external URL or public asset URL is accepted. Authorization is checked on
  every operation and object policy. A template may explicitly opt into captured
  agency logo bytes while keeping its own placement; later branding edits cannot
  replace issued or signed bytes. Missing captured logo is an explicit error.
- **Logo recovery/retention:** the same branding revision cannot reserve two competing
  pending uploads. Uncertain upload results are recovered by reading/hashing exact
  bytes, never overwrite or eager delete. Removal detaches the current logo; original
  objects and snapshot bytes are retained. Abandoned/uncertain originals can still
  occupy billable storage. The branding UI reports unattached reservations and
  supports exact-request retry/refresh; reviewed reclamation/retention remains A5.
  A profile edit racing an upload can still leave one retained, unattached original;
  it is not hidden or claimed reclaimed.
- **Locations:** free-text contract-specific pickup/return, no invented defaults.
  The completion plan did not require a reusable location catalog, so none was added.
  Existing six-field create contracts remain compatible, but uncompleted legacy
  drafts must supply locations before confirmation once 0021 is installed. Existing
  issued records are not backfilled with invented locations. Changes are restricted
  to drafts; handover/return show the captured configured locations.
- **Money:** integer centimes throughout, JSON strings at accounting boundaries.
  Advance payments are a category of rental receipt, not a separate extra amount.
  Remaining rent and status are derived from net rental entries. Refundable deposits
  never become rental revenue. Rental paid is bounded by total, held deposit by its
  contractual amount, and neither balance may become negative. Changes reducing
  contractual amounts below recorded balances fail. Payment amount is not an editable
  status label, and the client checks RPC totals against the ledger.
- **Corrections/lifecycle:** reversal references exactly one original entry of the
  same contract and exact amount; it is append-only, reasoned, unique and cannot
  itself be reversed. Correct by reversing then adding the correct entry. Deposit
  return is a distinct movement. Accounting remains available after return/cancel;
  new collections after cancellation are denied, while exact corrections of past
  entries remain possible subject to balance bounds. No refund processor or fiscal
  compliance claim is introduced.
- **Financial authority/retries:** active owners with `agency.manage` or an explicitly
  granted `rentals.payments` capability may record/correct money. Per-rental operation
  revisions and durable actor/request receipts reject stale or changed replays.
  Lost-response UI retries preserve the entire request and request ID. Audit failure
  rolls back ledger, revision and outbox together. Payment updates use their own
  revision rather than invalidating an existing signature/document version.
- **Snapshots and sync:** confirmation captures original profile/logo, drivers,
  locations and then-current financial data. Later payments update current accounting
  and the existing one-way Sheets row, not old PDFs. Existing issued party snapshots
  persist across later rental versions. No second outbox or Google write path exists.

## Verification

Final `npm.cmd run verify` passed: TypeScript, zero-warning lint, **1,881 web tests
in 94 files**, **737 database tests in 28 files**, and production build. The final
FR/AR form-pattern suite passed three focused tests. A deliberate inversion of the
accounting balance guard caused the exact-payment/deposit regression to fail; the
original guard was restored and the normal verification passed. Git whitespace
checks found no issues and the earlier migration/draft source is unchanged.
Relevant suites:

- `npm.cmd run test --workspace=@contratpro/web -- src/operations src/documents src/delivery`
- `npm.cmd run test --workspace=@contratpro/database -- tests/a1-workflows.test.ts`
- `npm.cmd run verify`: workspace TypeScript, zero-warning lint, all web/database
  tests and production build.
- Git whitespace/diff checks, including new files and preservation of prior SQL.

The SQL test executes actual RLS/RPC/trigger/receipt/billing/outbox behavior in a
disposable PGlite composition. It covers cross-agency/unauthorized denial, last owner,
isolation rejection, verified-email binding, expired/revoked/duplicate acceptance,
team quota/reactivation, selected signer eligibility/revocation/history preservation,
private branding, issuance-time immutability, location lifecycle, exact partial
payments/reversals/deposit separation, stale operations/replay, shared email queue,
Sheets snapshot/events and injected audit rollback. Signature appearance rows in
the historical-preservation test are clearly synthetic fixtures, not legal evidence.

Web tests cover invalid money/dates/fields, private token binding, no send on prepare,
key-rotation refusal, PNG abuse/hash recovery, captured-logo selection, FR/AR controls
and real React lost-response retry behavior. Rendered markup/JSDOM are not full
browser/assistive-technology or real mobile acceptance.

Independent review corrections include isolation/owner checks, inviter identity
revocation, key-rotation token mismatch, pending-logo conflicts and cancellation-time
ledger corrections. No native concurrent sessions, live JWT/RLS/storage behavior,
real email, external providers or native converter/font fidelity is claimed.

## Configuration and remaining blockers

- New `CONTRATPRO_A1_VERIFIED` remains unset/closed. Provision a distinct random
  32-byte lowercase-hex `CONTRATPRO_AGENCY_OPERATIONS_SECRET` and matching private
  `a1_gateway_key` only through separately reviewed setup. It must not reuse Auth,
  renderer, signing, delivery or Sheets credentials. No secret was generated or set.
- Existing delivery gate, encryption key/key ID, worker access, verified sender,
  Resend credentials and infrastructure logging/privacy acceptance remain required
  for invitation emails. No worker was run against a live queue. Key-ring rotation/
  draining and unknown-provider-ID recovery remain the existing A3/A5 scope.
- Review exact native 0013–0021 dependency/ownership/ACL/default-privilege composition,
  owner-transfer authority, changed trigger/function/storage policies, transaction
  history/rollback and migration inventory. Do not remove guards and apply the draft.
- Accept real cross-tenant Auth/JWT/storage, multi-session member/last-owner/payment/
  invitation/worker races, deadlocks and retry reconciliation. Sequential stale-version
  tests are not native concurrency proof. Revocation cannot recall an external send
  already admitted/armed; the documented observed-state boundary requires acceptance.
- Font/converter/PDF/Arabic/layout/mobile/keyboard/accessibility, legal signature/
  authority/consent/privacy/fiscal validation and operational backup/monitoring/key/
  orphan recovery blockers are retained. Infrastructure request/response logging
  must exclude tokens, codes, email bodies and private data.

**Next implementation batch: A2 — templates, persisted clauses and populated
preconfirmation previews.** A1 does not implement A2’s clause editor or preconfirmation
document preview, or declare the whole MVP complete or production-ready.
