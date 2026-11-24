# Rental Contracts MVP — local implementation

## Google Sheets progress — 2026-11-24

[Local Google Sheets implementation and guarantees](google-sheets-mvp.md) adds
transactional draft-creation events, an aggregate rental/signature head, durable
coalesced jobs, destination/version/lease fencing, bounded retries, metadata-based
same-row writes and unknown-outcome reconciliation. Initial enqueue does not wait
for confirmation, PDF or signatures and never calls Google in the create transaction.
OAuth/PKCE, encrypted refresh credentials, explicit capabilities, server-side file
and tab configuration, minimized mapping, FR/AR dashboard and per-contract health
are implemented locally. Guarded forward draft **0019** remains unapplied and the
Sheets gate remains disabled. Earlier references to a missing Sheets outbox are
historical; native integration and acceptance are still outstanding.

Implementation gaps: operational key-ring rotation/draining, unknown spreadsheet
creation recovery beyond title/request-ID lookup, and high-volume scan/pacing
optimization. Missing location/payment capture remains domain implementation work.
An unresolved row write is never blindly appended again; explicit abandonment
requires a physically different target and retains the old unknown outcome.

Final automated verification passed: workspace TypeScript, zero-warning lint,
**1,833 web tests (83 files)**, **735 database tests (26 files)**, production build
and tracked/new-file whitespace checks. The final signature-version binding guard
also passed the targeted embedded rerun. Google consent/API
setup, capability/key provisioning, worker hosting/scheduling, log redaction,
native concurrency/ACL/migration compatibility and cross-tenant/browser acceptance
remain deferred. No Google connection, remote SQL, setting change, feature-gate
activation, deployment preflight, commit, push or deployment was performed.

All existing blockers are preserved: higher-assurance signature providers,
provider-specific verification/completion, legal validation, Resend SMTP domain
verification, delivery worker hosting, unknown provider-ID recovery, automatic
reminder generation, key rotation/provisioning, preconfirmation document previews,
location/payment capture, Arabic fonts, DOCX conversion/layout acceptance,
generated/signing orphan reconciliation, migration inventory/compatibility and
cross-tenant acceptance. Local Sheets implementation does not close these gates.

## Delivery orchestration progress — 2026-11-24

[Local delivery implementation](delivery-orchestration-mvp.md) adds a durable outbox,
worker/materializer, gated Resend adapter and authenticated inbox, encrypted expiring
material, manual WhatsApp/copy/report actions, independent final-PDF grants and
FR/AR dashboards. Guarded draft **0018** is unapplied. No email/WhatsApp message,
deployment preflight, flag activation, provider setting or infrastructure change
was performed. Supabase Auth SMTP remains separate and unchanged.

Implementation gaps are explicit: key-ring rotation/draining, recipient override
verification, unknown provider-ID recovery and automatic reminder generation beyond
queued six-hour reminders. Worker hosting/scheduling and configuration/acceptance
remain deferred. Provider acceptance and manual sharing never imply recipient delivery.

Local verification on 2026-11-24: `npm run verify` passed workspace TypeScript,
zero-warning lint, **1,802 web tests (81 files)**, **735 database tests (26 files)**
and production build; diff checks passed. No live provider send, browser/Supabase
acceptance or migration/deployment preflight was performed.

All prior blockers remain: higher-assurance provider integration, provider-specific
verification/completion, legal signing validation, **Resend SMTP domain verification**,
preconfirmation previews, location/payment capture, Arabic fonts, real DOCX/layout,
renderer/signing keys, generated/signing orphans, migration inventory/compatibility,
cross-tenant acceptance and the Sheets outbox.

## Signing engine progress — 2026-11-24

The [local simple-signature engine and evidence workflow](signing-engine-mvp.md)
now implements agency-first typed signing, hashed expiring invitations/separate
code verification, client consent/capture, private intermediate/final PDFs,
append-only evidence/dossier export, retry recovery and FR/AR controls. Guarded
forward draft **0017** is unapplied. No signing flag, provider or credential is
activated. Existing demo Signed rejection and legal/digest blockers remain intact.

Implementation gaps remain distinct from release blockers: real provider adapters,
independent verification/external completion and delivery orchestration are not
complete. Capability/key/storage provisioning, native database/storage/concurrency,
legal/method/privacy review and browser/visual acceptance remain deferred.

Local verification passed on 2026-11-24: workspace TypeScript, zero-warning lint,
**1,786 web tests (75 files)**, **735 database tests (26 files)** and the production
build. Final provider-order/checksum guards and expanded signing security assertions
also passed the targeted embedded rerun. Database TypeScript/lint and diff checks
passed afterward. These results establish the local tested contracts, not legal
assurance, native concurrency, provider integration or deployment readiness.

Previously recorded gaps remain open: preconfirmation previews, location/payment
capture, renderer-key provisioning, Arabic fonts, real DOCX conversion/layout,
generated-orphan reconciliation, migration inventory/compatibility, cross-tenant
acceptance, **Resend SMTP configuration**, and the Sheets outbox requirements.

## MVP progress update — 2026-11-24

Template library/versioning, field mapping, real PDF generation, private artifact
storage adapters, signing preparation and FR/AR UI are implemented locally. See
[formats, implementation and remaining gaps](contract-documents-mvp.md). New guarded
draft **0016** was not applied. Existing 0013–0015, flags and all previously recorded
blockers remain unchanged. Final integration remains NO-GO.

Final local verification on 2026-11-24: `npm run verify` passed, including workspace
TypeScript, zero-warning ESLint, **1,765 web tests across 69 files**, **735 database
tests across 26 files**, and the optimized production build with the new routes.
The new document tests include actual configured-font Arabic PDF generation,
renderer attestation interoperability/forgery denial and private-storage policy
projections. No native converter, live database/storage or browser acceptance was
run. The existing 0013 SHA-256 remains
`3c27bc2a11de4d13a8003b35aa16d5d733eaeaa3be86557167a6fb2967214b79`.

Build-first implementation. No migration, flag activation, remote SQL, browser
acceptance, signing request or Google Sheets write is part of this work.

## Reused implementation

The existing timestamp/JSON/pricing/encoder contracts and `createRental` service
remain authoritative. Creation keys replay their original receipt, including after
later changes. `readRentalDetail` validates exact price, state and number contracts.
The existing 0013 mutation kernel supplies draft updates, confirmation numbering,
reservation conflicts, handover, explicit return, cancellation and extension.
Auth uses the existing verified Supabase subject, canonical mapping, selected agency
cookie and SSR client. The existing workspace shell and locale layout are reused.

The PDF renderer, five template presentations, inspection presentation, offline
template studio/lifecycle and signing-evidence contracts already exist. Those demo
components remain demonstrations; real contracts are never relabeled as simulations
or as signed documents to make them render.

## Added application workflow

- `/fr/app/rentals` and `/ar/app/rentals`: paginated list and detail links.
- `.../rentals/new`: searchable/paginated active client/vehicle choices, explicit
  offset timestamps, MAD entry, exact price preview and stable creation retries.
- `.../rentals/[rentalId]`: versioned draft terms, secondary driver from existing
  Clients, confirm, start, extend, cancel and explicit physical return.
- `.../rental-action`: same-origin POST-only handler with bounded UTF-8 JSON,
  request cookie refresh, trusted agency derivation, fixed RPC operations and
  sanitized errors. No browser-supplied agency or actor is accepted.

References remain immutable in a draft: cancel/recreate to change the primary
client or vehicle. Secondary-driver changes are draft-only and increment version.
All active agency members may operate rentals, matching 0013's existing approved
authorization contract; no new role name or client/vehicle write grant is required.
Choice RPCs expose only IDs/labels and use the rental writer's scoped policies.

Confirm/start/cancel/extend/return require explicit operator acknowledgement.
Return also requires its own physical-return checkbox. Terminal history exposes
no edit/lifecycle controls. Unknown mutation outcomes block further mutations until
reload; creation alone permits explicit replay of its exact body/key. No automatic
mutation retries, optimistic saved state or scheduled auto-completion are introduced.

The new server gate is `CONTRATPRO_RENTALS_VERIFIED === "true"`; it is not enabled.
The application also requires the version-2 capabilities RPC. Old schemas fail
closed. This application gate does not revoke database capabilities.

## Forward SQL draft

`supabase/migration-drafts/20261122001500_rental_mvp.sql` extends 0013 and requires
0014's vehicle state plus the existing canonical/receipt-auth helper dependencies.
Neither 0013 nor 0014 is assumed deployed. Historical files are not edited.
0013 and 0015 retain deliberate execution stops; 0015 also ends in ROLLBACK.
They are local design inputs, not files to paste into a SQL editor or promote
unchanged. Reviewed native ownership/ACL/transaction/history preparation is deferred.

The forward draft adds:

- A before-row guard rejecting archived vehicle assignment, confirmation and
  handover, immutable tenant/reference fields, and terminal-row changes.
- A matching invoker archive-lock trigger on Vehicles. A shared transaction
  advisory key serializes archive versus new assignment/confirmation. It grants
  no additional vehicle write privilege and does not replace vehicle authorization.
- Same-agency secondary-client foreign keys and a versioned driver RPC.
- Private FORCE-RLS document versions, immutable by trigger and without direct
  authenticated access. Existing rental/vehicle/client policies are not weakened.
- Version-2 detail transport using decimal strings for bigint money/serials;
  ordinary SDK JSON number parsing cannot preserve the largest allowed totals.
- Exact new-function ownership targets, revocations and ACL assertions.

Archived vehicles disappear from choices and cannot enter new contracts. Existing
contracts keep their FK/reference and detail/history. Return/cancellation remain
possible after archive. Issuance captures agency, primary/secondary driver and
vehicle data once. Later lifecycle/extension document versions retain those parties
and append the current terms. Edits/archives of source records do not rewrite issued
documents. Each version has a stable `agency:rental:version` synchronization key.
For pre-existing issued contracts without a snapshot, the trigger does not invent
issuance-time data; a separately reviewed historical import would be required.

## Document and integration preparation

`prepareRentalDelivery` accepts a same-agency saved template revision and issued
snapshot. It freezes a copy of template branding/conditions and document data for
an eventual artifact renderer. Current agency settings cannot replace the captured
parties. Money remains exact decimal strings. The output is explicitly unsigned,
requires a persisted artifact/digest, orders signatures agency first then client,
has null evidence, and marks Sheets delivery as not sent. It invokes no provider.

Final integration still needs durable template settings/artifact storage, an adapter
from issued snapshots to the existing PDF presentation, verified canonical digest,
provider callbacks and consent/evidence persistence, plus a durable versioned Sheets
outbox/retry worker. No signature evidence or successful synchronization is fabricated.

## Local verification

`tests/rental-mvp.test.ts` uses embedded PGlite only, synthetic users/agencies and
restricted authenticated role calls. It explicitly removes the guarded drafts'
execution barriers in memory and commits only to the ephemeral database. Repository
SQL bytes and remote migration inventories are never changed by the test.

Coverage includes creation replay/conflicts, tenant reference denial, secondary
drivers, stale versions, updates, overlap, confirmation replay, active-vehicle
checks, historical archive behavior, immutable parties, start/complete/cancel,
explicit return, audit-failure rollback, direct privilege denial and revoked members.
HTTP tests cover scope/gates, input injection, error sanitization, uncertain writes
and lossless totals. Component tests cover FR/AR, RTL, accessible labels, explicit
return, terminal immutability and exact creation retry preservation. Delivery tests
cover template scope/revision and refusal to invent signing evidence.

Embedded PostgreSQL does not establish native multi-session locking or Supabase
managed-role/JWT behavior. Those, real provider integration, schema-cache checks,
browser/accessibility acceptance and migration deployment remain final-integration
work, deliberately deferred in build-first mode.

Executed locally on 2026-11-22: full workspace suites passed (1,738 web tests in
63 files; 734 database tests in 25 files), workspace TypeScript and zero-warning
lint passed, and the optimized Next.js production build passed with the new rental
routes. No server/browser acceptance was performed. Existing 0013 SHA-256 remains
`3c27bc2a11de4d13a8003b35aa16d5d733eaeaa3be86557167a6fb2967214b79`.
