# Electronic signature engine and evidence — local MVP

Build-first implementation, 2026-11-24. Drafts 0014–0017 remain unapplied. No live
Supabase, browser acceptance, message delivery, paid provider, production change,
commit, push or deployment was performed. No environment flag or credential was
changed. `CONTRATPRO_SIGNING_VERIFIED` defaults closed.

## Reused architecture

Reuses SSR verified subjects, selected-agency/canonical identity, scoped memberships
and permissions, rental version/state contracts, 0015 immutable captured parties,
0016 issued artifact/version/checksum/storage contracts, existing typed signature
zones, exact PDF/font rendering, private downloads and workspace/FR/AR conventions.
The old demo lifecycle and synthetic evidence validators remain unchanged. New
[ADR-002](decisions/002-local-simple-signature-workflow.md) separates the local
technical profile from ADR-001/predicate S and from legal/qualified assurance.

## Implemented local workflow

1. An authenticated member with explicit `contracts.sign` starts a session against
   a current issued PDF. A role owner without that capability is refused. The
   initiating membership is assigned as agency signer; another capable member
   cannot substitute themselves. Source artifact, client, locale, assurance and
   original hash are immutable. At least one agency and client zone is required.
2. The agency reviews/downloads the original, enters their typed name, confirms
   declared identity/authority and explicitly accepts the versioned consent text.
   Signature capture is typed-name only. Nothing is prechecked. The server validates
   original bytes, glyph support and placement before recording a signature.
3. A separate agency-appearance PDF is reserved/uploaded before transactional
   signature commitment. Actual canonical user, membership, capability disposition,
   capture artifact checksum, consent text/version, original/revision hash and server
   time are retained. An upload failure cannot produce an agency-signed receipt.
4. Agency-first ordering unlocks a client invitation. The private invitation is a
   256-bit HMAC-derived pseudorandom token scoped to agency/session/request, valid
   at most 24 hours and bounded by the seven-day session deadline. Only SHA-256
   token hashes and peppered verification-code hashes are stored. Deterministic
   keyed derivation permits exact invitation-response retry without persisting raw
   tokens or codes. Renewal revokes prior invitations; no message is sent.
5. The guest page uses a URL fragment, removes it from the address bar, keeps it in
   JS memory, and sends it only in same-origin no-store POST bodies. It uses no
   agency account, local/session storage or analytics. The signing page has a
   same-origin CSP, no-referrer and noindex headers. Requests/response bodies must
   also be excluded from infrastructure logging at integration acceptance.
6. Token possession alone reveals no client name and cannot download the PDF.
   A separate eight-digit code unlocks preview and a ten-minute challenge. Five
   failed attempts lock that invitation. The policy proves possession plus a
   self-declared name, **not legal identity**. The typed client name must match the
   captured primary client, and the challenge, review hash, consent/version and
   current session version must all match. Signature authorization is consumed.
7. Client signing retains its exact typed capture artifact and transitions to
   client-signed. Explicit finalization produces a separate PDF with both typed
   appearances in the issued version's zones. It reads/hashes both original and
   intermediate bytes, checks the pinned font identity and never rewrites them.
   Final output is stored privately before committing completion/checksum.
8. Failed finalization remains pending/reconciliation-required with both signatures
   retained. Retries reproduce the same appearance bytes and recover an uncertain
   successful completion by reading it before recording failure. No recapture is
   required. Decline, cancellation, expiry and supersession preserve history.

Persisted states: awaiting agency, agency signed, awaiting client, client signed,
finalization pending, completed, expired, declined, cancelled, failed, reconciliation
required. Terminal sessions and existing signatures/revision bindings cannot be
rewritten. Every command uses durable scoped receipts and expected-version checks.
Agency/document locks and row locks serialize conflicting transitions. New issued
artifacts and authoritative rental version changes fence pending sessions and
revoke invitations. Completed historical sessions stay intact. Expiry is checked
and persisted on access/list/create; no background expiry worker is activated.

## Assurance and providers

| Requested assurance | Actual support |
| --- | --- |
| Simple | Local typed appearance with explicit consent and the evidence above |
| External advanced | Capability-checked provider port; none configured |
| External qualified requested | Same fail-closed selection; no legal qualification asserted |

Provider capabilities require sequencing, immutable bytes, idempotency, correlation
reconciliation, authenticated callbacks, evidence export and independently verified
results. Dispatch claims precede external effects and are unique per session/party.
Unknown outcomes and lost worker results require reconciliation, not redispatch.
The reconciliation port records pending/rejected/unknown outcomes without inventing
certificates or successful signatures.

`/api/signing/webhook/[providerId]` is closed without a configured adapter/profile.
The generic path authenticates bounded raw bytes before durable admission. Provider,
operation and transaction IDs come from stored bindings. Authenticated duplicates
are harmless; an event ID with changed bytes conflicts. A callback cannot complete
a session. No callback URLs or arbitrary certificates are fetched. Tests use
explicit fixtures, not production simulated provider responses.

Provider-specific dispatch adapters, actual authentication/key/freshness profiles,
independent signature/certificate/time/evidence validators and external completion
are still implementation gaps. Local PDF rendering refuses external assurance.
Provider-signed bytes must be stored unchanged by the future completion adapter;
this module neither generates nor modifies provider cryptographic signatures.

## Evidence and storage

Append-only events retain exact UTF-8 event text, sequence, previous hash and SHA-256
chain hash. They capture the original artifact/rental/template version, requested
assurance, authenticated agency actor/authority, client verification disposition,
typed capture hash, consent text/version, ordered stages, revision/final hashes,
invitation preparation/renewal, verification failures, decline/cancel/expire/failure
events and authenticated provider observations. No raw token, code, IP, device data,
provider credential or signing secret is persisted in the evidence.

Authorized agency JSON dossier export includes session bindings, ordered events,
exact typed capture JSON texts and their checksums, and explicit integrity/time
limitations. Export verifies the event chain and signature-artifact checksums.
It is not a certificate, independently certified timestamp or absolute tamper proof.

Original, intermediate and final PDFs use private `contract-documents` storage.
Signing objects have tenant/session/content-hash keys under the existing `issued`
namespace, no update/delete policy, no public URL and no upsert. Failed stage
uploads/commits retain reserved objects conservatively. Signing-stage/generated
orphan reconciliation and retention operations remain outstanding.

## Server configuration and database boundary

0017 registers `contracts.sign` but grants it to **no role automatically**. Its
tables have forced RLS, no direct anon/authenticated/service-role metadata grants,
immutable evidence/receipt guards and restricted fixed definer entry points.

Separately provision `CONTRATPRO_SIGNING_SECRET` as a random 32-byte lowercase hex
key and its matching private `signing_gateway_key` row. It is distinct from auth
and renderer secrets. Both agency and guest RPC payloads require a server MAC;
agency operations additionally verify the caller's JWT-derived authority. Guest
operations resolve agency/session from the stored token hash, not request scope.
Direct clients cannot use token hashes or forge server stage/finalization commands.
Durable guest limits are 30 requests per token/minute and 300 globally/minute,
plus five failed code attempts per invitation. No proxy/IP trust is assumed.

Agency storage uses the request JWT. Guest file mediation additionally requires a
server-only `CONTRATPRO_SIGNING_STORAGE_SERVICE_KEY` (or a future narrower storage
broker). It is used solely after invitation authorization for private file I/O,
never for lifecycle RPC authorization, and is never sent to a browser. Provisioning,
least privilege, log redaction and rotation remain integration requirements. Local
unit/embedded tests need no external credentials or connection.

Arabic typed appearances need the existing licensed configured font path. Tests
generate an actual Arabic PDF with local Windows Arial; visual shaping/bidi,
long-name/zone, mobile and accessibility acceptance remain deferred.

## Files and verification

- `apps/web/src/signing/`: profile/types, crypto, PDF appearances, provider ports,
  repository, service, storage mediation, handlers, webhook, FR/AR UI/styles/tests.
- New agency signing action, guest action and provider webhook routes; existing
  `/[locale]/sign` now conditionally renders the guest flow. Rental document history
  conditionally embeds the agency workflow. Existing features remain gated as before.
- New guarded `supabase/migration-drafts/20261124001700_signing_engine.sql`.
- Extended the existing embedded document database fixture to test signing against
  its actual immutable artifact contracts, without duplicating a database harness.
- No new package dependency. Prior migration files remain untouched.

Tests cover FR/AR consent, ordering/assignment/capabilities, tenant denial, invitation
hashing/scope/renewal/expiry/code lockout/challenge lifetime, consumed/replayed and
stale commands, private document verification, source supersession, immutable
history, evidence/checksum integrity, actual FR/AR PDF appearances, partial storage
failure and finalization retry/uncertainty, provider ambiguity/authentication and
duplicate observations, headers, size/origin gates and token-fragment privacy.
Native concurrent sessions, managed Supabase role/storage semantics and actual
browser/provider acceptance are not established by PGlite, unit or jsdom tests.

Final local verification on 2026-11-24: `npm run verify` passed workspace TypeScript,
zero-warning ESLint, **1,786 web tests in 75 files**, **735 database tests in 26 files**
and the optimized Next.js production build. The final SQL provider-binding checks
and their negative cases passed a subsequent targeted embedded-database rerun.
Database TypeScript/lint and `git diff --check` were also rerun after those tests.
The signing slice adds 21 web tests in six files and extends the existing embedded
document scenario with signing, rate, replay, evidence and supersession assertions.
No native browser, Supabase, provider or deployment acceptance was run.

## Remaining work, separated

Implementation gaps: provider-specific adapters and independent verification/
byte-preserving external completion; real delivery/email outbox/WhatsApp orchestration
in the next module; narrower guest storage broker if required; signing-stage orphan
reconciliation and scheduled retention/expiry housekeeping. Drawn signatures are
not implemented; typed signatures are the supported local method.

Deployment/acceptance blockers: private key/capability/storage provisioning, reviewed
PG17 ACL/ownership/locking and migration inventory/compatibility; native concurrency,
JWT/revocation and cross-tenant acceptance; FR/AR visual/mobile/accessibility/browser
and real DOCX acceptance; Moroccan legal/identity/consent/privacy/retention/provider
recognition review. No provider legal or qualified assurance claim is authorized.

All earlier outstanding work is retained: preconfirmation previews, authoritative
location/payment capture, renderer-key provisioning, Arabic font configuration,
real DOCX conversion/layout acceptance, generated-orphan reconciliation, migration
compatibility/deployment inventory, cross-tenant acceptance and Resend SMTP setup.
## B1 owner scope decision — 2026-11-27 (current authority)

The initial MVP uses ContratPro's internal **simple electronic signature**. External higher-assurance integrations, including SAFY and DamaneSign, are **optional and deferred**, not an initial-MVP implementation or provider-selection blocker. Earlier B3/A3 statements requiring a selected signature provider are historical and superseded for this scope. Payment-provider, email configuration and other independent requirements are unaffected. A contract requiring higher assurance is still refused rather than downgraded.

B1 adds a bounded optional drawing to the typed-name capture and authoritative hash-bound event, plus an appended final-PDF execution record with UTC signing dates and unique references. Existing sequential authorization, invitation/code verification, immutable evidence, durable finalization, delivery/recovery/archive and same-row Sheets behavior are reused. Local draft **0028** is guarded and unapplied. See [B1 report](b1-internal-signature-completion.md) and [manual acceptance](internal-signature-manual-acceptance.md).

Legal qualification, approved consent/privacy/retention, native/managed backend and actual delivery acceptance remain launch requirements. No legal approval, qualified/certified signature, automatic handwritten equivalence or complete MVP readiness is claimed. No feature activation, live connection, remote migration, installation, commit, push or deployment.
Local verification results and their limits are recorded in the B1 report.
