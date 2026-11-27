# A3 — Signing, automatic reminders and delivery recovery

2026-11-25–26 UTC. BUILD-FIRST local implementation; **A3 is not fully complete**.
Provider-neutral reminder/recovery and external completion-admission code exists.
B3 provider selection is still unresolved; the selected adapter, independent
verification profile and raw provider evidence implementation remain code work.
They are not configuration-only blockers. No provider was selected or activated.

No migration was applied, external message sent, browser/live acceptance performed,
environment edited, infrastructure changed, commit, push or deployment performed.
Earlier A1/A2 working-tree changes and guarded drafts through 0022 are preserved.
New `CONTRATPRO_A3_VERIFIED` defaults closed; no value was added or enabled.

## Requirement status and source/test index

Paths beginning `signing/` or `delivery/` are relative to `apps/web/src/`.
SQL evidence below is the A3 section of
`packages/infrastructure/database/tests/a1-workflows.test.ts`, which preserves
the earlier A1/A2 scenario and executes actual SQL composition through 0023 in
disposable PGlite. Synthetic signature/provider appearances are clearly fixtures,
not evidence of legal identity or cryptographic signature verification.

| Requirement | Implementation status and behavior | Source / automated evidence |
| --- | --- | --- |
| Official source and agency-first signing | Existing local workflow preserved. Only issued artifacts can start sessions; previews remain in a separate table and cannot be signed | `signing/service.ts`, existing 0017/A1 signer guards; signing/service/model tests, composed document/signing SQL regressions |
| Agency authority and consent | Explicit A1 signer designation plus `contracts.sign`; assigned signer retained. Typed capture still requires review, declared identity, correct checksum and versioned consent | Existing `signing/model.ts`, `service.ts`, `workspace.tsx`, guarded 0017/0021; existing signing tests and A1 SQL assertions |
| Local verification and client signing | Existing hashed invitations/codes, separate channel enforcement, bounded verification challenges, one-time capture and scoped receipts remain authoritative | `signing/crypto.ts`, `service.ts`, 0017/0018; crypto/service/privacy/handler and composed SQL tests |
| Invitation recovery | New invitation-only revoke preserves the agency signature, increments session version and cancels obsolete delivery. Existing renew generates replacement token/code material and revokes old challenges/links, including expired invitations while the session remains eligible | 0023 signing-command wrapper; `signing/handler.ts`, `workspace.tsx`; SQL revoke→dispatch denial→renew assertions |
| Terminal session recovery | Completed/expired/cancelled/declined/failed evidence cannot be reopened. A session past its own deadline needs a new explicitly authorized session; renewal does not resurrect it | Existing terminal guards and 0023 version/expiry checks; existing signing SQL regressions |
| Provider capability discovery | Exposes only profiles satisfying existing sequencing, immutable bytes, idempotency, reconciliation, callback/evidence and independent verification capabilities; registry stays empty | `signing/providers.ts`, authenticated `providers` action; existing provider capability tests |
| Document submission and uncertainty | Existing durable dispatch claim precedes external effect. New submit path hashes the actual issued source and submits the agency revision for the client stage. It passes only stored operation/session bindings and bytes to the adapter; unknown results never redispatch automatically | `ProviderCoordinator.submit/dispatch/reconcile`; existing provider/webhook regressions |
| Hosted signing boundary | Optional provider-hosted link retrieval binds a stored operation and permits HTTPS only at adapter-approved origins. No arbitrary callback URL fetch or active hosted provider is supplied | `signing/external.ts`; concrete allowed origins and hosted API remain B3 adapter work |
| External completion admission | New generic orchestrator retrieves bounded PDF/result evidence, verifies original/previous/provider/transaction/party/assurance/hash bindings and requires an independent verifier's identity/consent/sequence/trust result. Callback observation alone never completes a session | `signing/external.ts`, 0023 external-stage/complete; `external.test.ts`, composed SQL wrong-proof/agency-first/stage/completion/replay tests |
| Unchanged external bytes | Provider bytes are stored without PDF parsing, re-saving or applying typed appearances. Agency and client stages use the same private signing object reservations and immutable session records | `ExternalCompletion`, existing storage adapters; byte identity and failed-storage unit tests |
| Provider-specific implementation | **UNFINISHED / B3 decision dependency:** selected API transport/authentication/freshness/transaction reconciliation; actual identity/certificate/signature/trusted-time/consent verifier; production hosted flow; reviewed raw certificate/evidence export/retention adapter. Generic proof summaries/hashes do not implement these | Empty `configuredProviders`; injectable verifier has no production implementation. Deterministic fixtures are tests only |
| Automatic reminder policy | Explicit agency enable/disable, manual permission, increasing minute offsets, per-invitation maximum and revision checks. No final commercial schedule or default policy is installed | `delivery/reminders.ts`, `recovery-workspace.tsx`, 0023 policy table/action; policy validation and SQL stale/foreign tests |
| Durable reminder generation | Existing internal worker tick claims one due slot, decrypts only the original link envelope and re-seals a reminder into the same outbox. Unique invitation-hash/ordinal slot and deterministic job identity prevent duplicate jobs after retries/restarts | `DeliveryService.automaticReminder`, `DeliveryWorker.reminderOnce`, existing internal route; reminder encryption/identity unit test and competing-claim/repeated-publish SQL assertions |
| Limits, eligibility and dispatch | Invitation/session/source validity, expiry, revocation, policy switches, maximum and ambiguous-send checks apply at generation/publication and immediately before dispatch. Existing worker arm and lease fences remain in force | 0023 delivery-valid/command wrappers and existing worker; SQL limit/disable/revoke-before-arm tests, existing worker crash/lease/source regressions |
| Reminder history and failure | Existing delivery job history shows actual reminder dispositions. New bounded preparation history shows slot ordinal, attempts and prepared/pending/exhausted disposition. No raw code or token is returned | `reminder-history`, `ReminderSettings`, existing delivery list/UI; FR/AR component tests and SQL slot behavior |
| Unknown provider ID | A verified Resend webhook's exact `delivery_job` tag may bind the missing ID only to an armed email job in processing/uncertain state. Existing immutable inbox dedupe and observation rules then apply. Conflicting ID correlation rejects transactionally | `delivery/resend.ts`, `webhook.ts`, 0023 webhook wrapper; signed Svix/tag tests and SQL unknown-ID→delivered/duplicate/out-of-order assertions |
| Known provider ID | Authorized operator can request the existing fixed-origin Resend GET reconciliation. State is recorded only from the actual server-side provider observation, not a browser-supplied disposition | `delivery/handler.ts`, `DeliveryWorker.reconcile`, existing `ResendAdapter.reconcile`; existing refusal-without-ID and provider adapter tests |
| No correlation available | Authorized manual review stores actor, request identity and case reference. Operators may retain uncertainty or retire an attempt without resend. Neither option asserts delivery or proof of non-send. Review history is visible and immutable | `manual-resolve`, `delivery_recoveries`, `UncertainRecovery`; SQL scoped receipt/unsafe retry tests and JSDOM identical-request retry test |
| Final PDF/evidence delivery | Existing simple finalization verifies source and appearance hashes, persists final bytes before completion and creates one durable completion event. New operator action retries failed final-event materialization. Another final send is blocked while an earlier unresolved, non-retired send is uncertain | Existing `SigningEngine.finalize`, delivery events/materializer and 0023 recovery guard; existing storage/uncertain completion tests; SQL unique completion event |
| Manual WhatsApp | Existing validated sharing links, separate verification-code channel and explicitly unverified copy/open/reported-sent observations retained. Automatic reminder generation may queue a manual WhatsApp task; it never sends it | Existing service/messages/manual UI and tests; new worker publishes to existing outbox only |
| Cross-module accounting | Existing completion/signing triggers update the same rental's Sheets head/events, not a new creation event. Existing signature/email reservations charge logical resources once; reminder publish and external completion retries reuse identities | Existing 0019/0020 integration; A3 SQL reservation uniqueness, same Sheets head after replay and one final-delivery event |
| FR/AR and RTL | Reminder policy/history, manual reconciliation/history, provider-state check, invitation revoke and final delivery recovery use existing components and translated controls. Unsupported external assurance choices are disabled | Signing/delivery workspaces, `recovery-workspace.tsx`; static FR/AR and JSDOM tests. No live browser/mobile/accessibility acceptance |
| Database/security | Guarded 0023 adds forced-RLS private policy/slot/review tables, explicit gateway allowlists, scoped receipts, row/lease fences and immutable reviews. Existing MAC-authenticated agency/worker split is reused | `supabase/migration-drafts/20261125002300_signing_reminders_recovery.sql`; composed PGlite tests and existing tenant/secret-access regressions |

## Operational semantics and limits

Reminder offsets are measured from preparation of the original link delivery job.
Email reminders start only after provider acceptance/delivery of that initial job;
manual WhatsApp reminders require an explicit user-reported original share. A
manual report remains an assertion, not verified delivery. An interval falling
after invitation expiry never produces a reminder. Reissuing an invitation starts
a new hash-bound history and invalidates the prior link, code and queued jobs.

The configurable maximum counts both manual and automatic reminders for that
invitation, including retired attempts. Policy updates retain histories and retire
pending reminder jobs, fencing in-flight preparation against the policy revision.
Disabling automatic reminders cancels unarmed automatic jobs; an already armed request may
be uncertain and cannot be unsent. An ambiguous send blocks additional reminders.
Manual closure cannot prove non-send or authorize a blind resend of the same job.
Explicit invitation replacement revokes the old access material before a new
invitation can be distributed.

Technical safety ceilings are 20 configured offsets/reminders, increasing whole
minute offsets from 1 to 10,080, 100 bounded candidate rows per tick, a two-minute
materialization lease and five attempts per slot. These are implementation bounds,
not commercial plan promises. No policy is enabled or seeded for actual agencies.
Candidate pruning excludes already leased, exhausted and ambiguous invitations;
there is no in-memory timer or separate delivery queue.

Original link envelopes needed for enabled reminders remain encrypted until their
own invitation expiry even if the original email was delivered. The existing purge
still removes expired/other eligible terminal material. The worker needs no raw
verification code or signing-secret derivation to prepare an automatic reminder.
Key rotation/draining, hosted scheduling and physical PDF orphan cleanup remain A5.

Authenticated tagged observations are positive correlation, not a guessed search.
Absent tags/events do not establish non-send. Resend's existing job-scoped
idempotency key remains bounded by its documented provider window; no exactly-once
external delivery guarantee is claimed. Acceptance is never renamed delivery.
Case references must exclude tokens/codes; the recovery UI requests no secret.

External completion admission records immutable verification summaries/hashes and
exports them with the existing event chain. The generic boundary does not validate
a certificate, certify a timestamp or archive a provider's full evidence package.
Those depend on a selected profile and are unfinished implementation, not missing
credentials. Simple typed appearances remain expressly distinct from cryptographic
or qualified signatures and carry no legal-equivalence/compliance assertion.

## Files

- New guarded draft `supabase/migration-drafts/20261125002300_signing_reminders_recovery.sql`,
  with unconditional guard and final `ROLLBACK`; earlier drafts are untouched.
- New `delivery/client.ts`, `reminders.ts`, `reminders.test.ts`,
  `recovery-workspace.tsx`, `recovery-workspace.test.tsx`.
- New `signing/external.ts`, `external.test.ts`.
- Extended signing model/provider/service/handler/workspace; delivery service,
  worker, handler, Resend adapter/webhook/workspace and Resend tests; bounded
  reminder call in the existing internal delivery tick route.
- Extended existing A1/A2 composed SQL test with A3 fixtures/assertions. Updated the
  reconciliation, completion plan, tracker, readiness checklist and this report.
- No new package, dependency, external account, environment value or host artifact.

## Automated verification

Final `npm.cmd run verify` completed successfully on **2026-11-26 UTC**:
workspace TypeScript, zero-warning lint, **1,898 web tests in 99 files**,
**737 database tests in 28 files**, and optimized production build. Existing
rental/document/signing/delivery/Sheets/billing regressions are included.
Focused signing/delivery suites and actual PGlite forward composition also passed.
`git diff --check` passed; an explicit scan of all new A3 source/test/SQL/report
files found no trailing whitespace. Earlier tracked SQL migrations/drafts have
no diff. No remote database or provider endpoint was used.
Mock providers/verifiers do not establish certificate validity, legal assurance,
native PostgreSQL concurrency, managed Storage/Auth or live provider acceptance.

## Remaining work, kept separate

**A3 implementation / decision dependency:** select and approve B3; implement its
concrete adapter, authenticated/fresh event and correlation formats, actual
independent verification/trust anchors, hosted UI integration and raw evidence
retention/export. No provider is selected by this batch and no fallback to simple
signing is permitted. **The documented full A3 exit criteria are not satisfied.**
Provider-neutral work is implemented locally; A3.3 remains blocked by B3 and its
dependent code, not merely deployment configuration. Stop here; A4 is not started.

**Other implementation queues:** A5 retained-logo, preview/generated/signing/provider
object reconciliation; independent key provisioning/rotation/draining and runner
artifacts. A4 remaining Sheets creation recovery and concrete billing provider code
remain outstanding. This batch does not implement those queues.

**Commercial/legal/configuration/acceptance:** B2 consent/channel/legal assurance
and provider recognition; final commercial reminder entitlements/catalog/fiscal
decisions; distinct keys and capabilities; Resend SMTP/domain/provider setup;
worker hosting/supervision; native migration/ACL/default-owner/history/rollback
composition through 0023; genuine concurrent sessions and cross-tenant JWT/Storage;
A1/A2 live acceptance; Arabic fonts/mixed bidi/visual fidelity; native DOCX conversion;
full FR/AR browser/mobile/keyboard/accessibility and provider sandbox acceptance.
Earlier blockers are preserved. No physical cleanup, live test or activation is
claimed by local test counts.

## Resend contract references inspected

- [Tags and webhook correlation](https://resend.com/docs/dashboard/emails/tags)
- [Sent-event payload](https://resend.com/docs/webhooks/emails/sent)
- [Retrieve an identified email](https://resend.com/docs/api-reference/emails/retrieve-email)
- [Idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys)

These references justify the supported correlation/read boundaries; no actual
provider endpoint was invoked during implementation or verification.
## B1 owner scope decision — 2026-11-27 (current authority)

The initial MVP uses ContratPro's internal **simple electronic signature**. External higher-assurance integrations, including SAFY and DamaneSign, are **optional and deferred**, not an initial-MVP implementation or provider-selection blocker. Earlier B3/A3 statements requiring a selected signature provider are historical and superseded for this scope. Payment-provider, email configuration and other independent requirements are unaffected. A contract requiring higher assurance is still refused rather than downgraded.

B1 adds a bounded optional drawing to the typed-name capture and authoritative hash-bound event, plus an appended final-PDF execution record with UTC signing dates and unique references. Existing sequential authorization, invitation/code verification, immutable evidence, durable finalization, delivery/recovery/archive and same-row Sheets behavior are reused. Local draft **0028** is guarded and unapplied. See [B1 report](b1-internal-signature-completion.md) and [manual acceptance](internal-signature-manual-acceptance.md).

Legal qualification, approved consent/privacy/retention, native/managed backend and actual delivery acceptance remain launch requirements. No legal approval, qualified/certified signature, automatic handwritten equivalence or complete MVP readiness is claimed. No feature activation, live connection, remote migration, installation, commit, push or deployment.

