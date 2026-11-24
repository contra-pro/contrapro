# Email, WhatsApp and delivery orchestration — local MVP

Build-first, 2026-11-24. Nothing was deployed, preflighted against a deployment,
sent to recipients, activated, committed or pushed. No Supabase/Resend setting or
environment file was changed. New guarded forward draft **0018** remains unapplied,
as do 0014–0017. No new package dependency was introduced.

## Existing functionality reused

Reuses verified SSR/canonical identities, selected agencies, membership/permission
contracts, immutable rental-party snapshots, issued/final PDF checksums and private
storage, the signing engine's agency-first ordering, deterministic invitation
derivation, hashed invitations, separate-code verification, revocation, server MAC
gateway pattern and append-only signing evidence. The existing delivery-preparation
types remain available; no duplicate signing or document-generation engine exists.

Supabase Auth SMTP remains responsible for authentication mail. This module uses a
separate application transactional Resend API adapter. Email confirmation was not
disabled and the known Resend testing-domain restriction was not bypassed.

## Implemented workflows

- Authorized operators with explicit `contracts.deliver` can queue invitations and
  separate code jobs, queue six-hour reminders, prepare final-PDF delivery, reveal
  one manual sharing payload at a time, retry eligible failures, cancel pending
  jobs, view history and revoke download grants. Owners receive no automatic grant.
- Invitations require an agency-signed session already awaiting the client, an
  active unconsumed invitation and the exact issued document hash. Renewal uses the
  existing signing engine and revokes obsolete delivery. Reminders re-use the same
  scoped invitation and expiry; at most three per invitation are allowed.
- Email links can be paired with manually shared WhatsApp codes or phone/in-person
  codes. WhatsApp links require phone/in-person codes. The SQL boundary prevents
  mixed channels both within a queue bundle and across existing jobs/reminders.
  Changing an established channel policy requires invitation renewal.
- Branded FR/AR plain-text and escaped RTL/LTR HTML messages contain the captured
  agency name, contract reference, link and expiry. Sender/reply-to addresses are
  validated. Recipient contacts come from immutable captured parties; arbitrary
  recipient overrides are not supported. National-only numbers require correction
  to international form; Moroccan `+212` numbers and international E.164-like numbers
  are validated rather than guessed from a local prefix.
- WhatsApp uses a validated `wa.me` link with encoded text and explicit user action,
  without a paid API or automation. [Supported sharing URL](https://faq.whatsapp.com/5913398998672934).
  Clipboard success is recorded only after the
  clipboard operation succeeds. A click records an **open request**, not proof the
  app opened or a message was sent. Manual sent reports remain explicitly unverified.
- Signing completion atomically creates a unique durable notification event. A
  materializer creates one client final-document email and, when an agency email is
  present, an agency notification. Notification materialization does not itself send.
  Invalid captured contacts are visible as materialization failures, with manual
  alternatives available. Transient materialization failures retain a recoverable
  lease; attempts are bounded to five.
- Completed PDF links use independent 48-hour, hashed, revocable grants bound to the
  same session, expected client and immutable final checksum. `/fr/contract` and
  `/ar/contract` remove fragment tokens from the address bar and use same-origin
  no-store POST authorization. The server mediates private Storage reads and checks
  actual PDF bytes. Evidence dossiers are never included or made accessible here.

## Outbox, worker and actual guarantees

Job dispositions are queued, processing, accepted, delivered, failed, bounced,
cancelled and uncertain. Manual sharing has a separate observation status, so a
copy/open/reported-sent action is not converted into provider-confirmed delivery.
Job IDs, event keys and keyed material fingerprints provide durable idempotency.
Duplicate enqueue attempts retain the original encrypted material and disposition.

The worker uses session-before-job row locking, `FOR UPDATE SKIP LOCKED`, lease
tokens, a two-minute lease, source-validity checks and a durable dispatch arm. Due
definite rate-limit rejections can retry with bounded exponential backoff (up to
five attempts); other permanent rejections cannot automatically retry. An expired
unarmed lease can be reclaimed with a fresh fence. Once dispatch was armed, expiry
or transport ambiguity becomes uncertain and never automatically requeues.

`ResendAdapter` uses stable job-scoped idempotency keys, fixed HTTPS API origins,
timeouts, sender/reply-to validation, sanitized errors and explicit configuration
gates. Acceptance yields a provider ID, not a delivered claim. Provider read
reconciliation is supported when a trusted ID is known. Unknown outcomes without
an ID remain blocked for manual provider reconciliation; there is no guessed
lookup or blind resend. Resend documents a 24-hour idempotency window; this module
does not extend that promise into an exactly-once guarantee.
[Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

Webhooks verify bounded **raw bytes**, Svix HMAC signatures and five-minute delivery
freshness before admission. Key overlap is supported for webhook rotation. Event IDs
deduplicate authenticated observations; changed bytes under an ID conflict. Only
opaque IDs, payload hash, disposition and event time are retained, not provider
recipient/body/error payloads. Early unbound observations are retained and applied
after the provider ID is durably recorded. Late acceptance cannot regress a known
delivered/bounced disposition. Delivery does not prove human reading.
[Resend verification](https://resend.com/docs/webhooks/verify-webhooks-requests),
[Svix raw-body protocol](https://docs.svix.com/receiving/verifying-payloads/how-manual).

Obsolete invitation jobs are cancelled before dispatch. A revocation racing an
already armed request may leave an email accepted or delivered; it cannot be
unsent, and the old link is still revoked. The audit preserves the actual provider
outcome plus an obsolete marker. Download revocation stops future authorizations,
not bytes already received by an authorized recipient.

## Security, encrypted material and retention

[ADR-003](decisions/003-expiring-encrypted-delivery-material.md) records the locally
reviewed AES-256-GCM, authenticated expiry/AAD and channel-separation profile.
Ciphertext is kept in a separate private table; ordinary jobs/evidence contain no
raw token, plaintext code, recipient address or provider credential. Manual payload
access is authorized, scope checked and short-lived. Evidence exports contain only
delivery observations and opaque job/grant references.

Forced tenant RLS, no direct anon/authenticated/service-role metadata rights,
immutable job/download bindings, one-way revocation and an immutable webhook inbox
protect database contracts. A dedicated NOLOGIN worker role has fixed MAC-protected
entry points, narrow source reads and no business/lifecycle mutation interface.
Its signing-session `UPDATE(id)` grant exists solely for row locking; the existing
immutable-binding trigger rejects identifier changes.

Queue admission is capped at 100 jobs per agency/hour, with three reminders per
invitation. Final downloads are limited to 30 per valid grant/minute and 300 globally
per minute, including invalid-token attempts. No untrusted forwarded IP is used.

`purge-expired` deletes up to 1,000 expired or delivered/bounced/cancelled encrypted
payloads per run. Evidence/status metadata is retained. Maintenance hosting and
legal retention policy acceptance are still required; a stopped worker does not
erase ciphertext on its own. Decryption and SQL validity checks still fail closed
after expiry. Automatic encryption-key-ring rotation is not implemented.

## Runtime configuration — not configured by this work

- `CONTRATPRO_DELIVERY_VERIFIED` and `CONTRATPRO_RESEND_VERIFIED` stay disabled.
- Separate 32-byte hex gateway and encryption secrets, matching private gateway
  MAC-key provisioning, and a stable `CONTRATPRO_DELIVERY_KEY_ID` are required.
- Agency invitation preparation also uses the existing signing secret. Workers do
  not require that secret or a Storage service-role key.
- `CONTRATPRO_RESEND_API_KEY`, a verified-domain `CONTRATPRO_EMAIL_FROM`, optional
  validated `CONTRATPRO_EMAIL_REPLY_TO`, HTTPS application origin and webhook secrets
  are required for real email. `resend.dev` senders are refused by this adapter.
- Sender acceptance must also confirm that provider click/open tracking or URL
  rewriting does not collect invitation/download tokens; disable such tracking
  where applicable. No provider tracking settings were inspected or changed here.
- The private one-tick worker route additionally requires a separate
  `CONTRATPRO_DELIVERY_WORKER_ACCESS_SECRET`. Nothing schedules or calls it here.
- Guest final download mediation reuses the existing server-only private Storage
  broker/key, after scoped grant authorization. No private key reaches a browser.

## Files and verification

New source: `apps/web/src/delivery/` (models, encryption, messages, Resend, repository,
service, worker, runtime, handlers, UI and six test files). New routes include the
agency delivery dashboard/action, public final-contract page/action, Resend webhook
and restricted worker tick. Existing navigation/signing/rental/document components
receive only gated integration. New draft:
`supabase/migration-drafts/20261124001800_delivery_orchestration.sql`.
Earlier migration bytes remain unchanged. Existing embedded document/signing
fixtures are extended, without another duplicate database harness.

Tests cover tenant/capability denial, separation and confidential payloads, FR/AR
messages, phone and WhatsApp URLs, duplicate queues/claims, lease reclamation and
fences, acceptance vs delivery, definite rejection vs uncertainty, safe retry,
authenticated webhook replay/conflict, invalid/revoked final grants, immutable
revocation and restricted metadata reads. All provider sends use injected fake
transports. No real email, WhatsApp, Supabase or native browser acceptance occurred.
Final local `npm run verify` passed on 2026-11-24: workspace TypeScript, zero-warning
lint, **1,802 web tests across 81 files**, **735 database tests across 26 files**, and
the optimized Next.js production build. `git diff --check` passed. The delivery
slice contributes 16 web tests in six files and extends the existing embedded
document/signing scenario with delivery-specific assertions. These checks establish
local tested contracts, not real-provider, native concurrency or delivery acceptance.

## Remaining implementation vs integration

Implementation gaps: automatic key-ring rotation/draining, arbitrary recipient
override/verification workflows, automatic provider-ID recovery for unknown sends,
and automated reminder policy generation beyond explicitly queued six-hour reminders.
The worker and materializer are implemented, but no hosting/scheduler is activated.

Integration/acceptance requirements: verified Resend sending domain and the existing
Auth SMTP/testing-domain blocker, sender/reply-to/webhook configuration, private
keys/capability grants, native PG17 ownership/RLS/default-policy/locking and migration
inventory compatibility, managed Storage/JWT and cross-tenant acceptance, log
redaction, FR/AR email-client/mobile/browser/accessibility and legal retention review.

Preserved earlier work: higher-assurance provider adapters, provider-specific
verification and completion, legal validation of signing methods, preconfirmation
previews, location/payment capture, Arabic fonts, DOCX conversion/layout, renderer
and signing key provisioning, generated/signing-orphan reconciliation and Sheets.
