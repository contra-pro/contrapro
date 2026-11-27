# A4 — Archive, Sheets recovery and billing

2026-11-26 UTC. BUILD-FIRST local implementation. **Provider-independent A4
paths are implemented within the supported bounds below. The full A4 batch is
incomplete:** B5 has not selected a commercial payment provider, and its concrete
adapter, verification, recurring-policy and route/UI integration remain code work.
This is not a configuration-only or production-readiness claim.

No remote SQL, migration application, Google account connection, real provider
operation, payment, email/WhatsApp message, browser/live acceptance, infrastructure
mutation, gate activation, commit, push or deployment occurred. A1–A3 working-tree
changes and all earlier migration drafts are preserved. New
`CONTRATPRO_A4_VERIFIED` defaults closed; no environment value was added or enabled.

## Requirement implementation and evidence

Application paths below are relative to `apps/web/src/`. Database evidence is the
A4 section appended to `packages/infrastructure/database/tests/a1-workflows.test.ts`.
It runs the existing A1–A3 scenario and actual SQL composition through guarded 0024
inside disposable PGlite, not native PostgreSQL or managed Supabase.

| Requirement | Actual behavior and source | Automated evidence / limits |
| --- | --- | --- |
| Canonical contract archive | New localized `/app/archive` searches canonical rental, captured document parties, existing signatures/artifacts and A1 payment records; no second archive database | `rentals/archive-model.ts`, `archive-workspace.tsx`, rental handler, archive page, 0024 `contratpro_archive`; archive validation and composed SQL tests |
| Historical clients/vehicles/drivers | Earliest confirmed party snapshot takes precedence over today's mutable client/vehicle data. Drafts use the existing authorized projections; archived referenced records remain accessible | SQL historical-client rename/search assertion; no fabricated old values for legacy records lacking snapshots |
| Search/filter criteria | Bounded literal reference/client/driver/contact/identity/vehicle search, UTC rental overlap/creation ranges, lifecycle, signature/document, rental payment and archive-mark filters | Server validation and SQL allowlists; invalid page/control/oversized/date tests, completed/partial-payment/empty/foreign tests |
| Sensitive identifiers | Search may match authorized captured identifiers but results return only reference, name, vehicle, dates and status flags. Terms remain in POST bodies and component memory, never URLs or audit metadata | `archive-model`, handler and SQL projection; result minimization assertion and FR/AR markup test; infrastructure body-log exclusion still needs acceptance |
| Stable bounded pagination | Twenty rows per page ordered by creation timestamp and UUID, with a server `asOf` insertion cutoff reused between pages. Tenant/date/state/version indexes added | SQL fixture with 23 rentals verifies 20+3 disjoint results; not a cross-request MVCC snapshot of concurrent edits |
| Non-destructive archive policy | Only completed/cancelled rentals may receive an organizational archive marker; `agency.manage` required. Restore removes marker. No rental state/version/document/signature/payment/Sheets event changes | Scoped mark table, immutable idempotency receipts and audit; SQL document preservation, marker search and duplicate-audit prevention |
| Historical PDF/evidence access | Archive result links into existing detail/document/signing/delivery paths. Issued history downloads stored exact bytes; sessions expose intermediate/final PDFs and authorized evidence export. Previews remain separately stored and unsigned | Existing Documents/download, SigningEngine document/dossier, DeliveryPanel; full document/signing/storage regressions retained. No old signed PDF regeneration |
| Initial Sheets event / same logical row | Existing atomic creation event, aggregate head, private snapshot and one-way worker remain unchanged. A1 locations/payments already enrich the same snapshot | Existing 0019/0021 and Sheets/A1 tests. Google outages never run inside rental creation |
| Ambiguous spreadsheet creation | Durable agency/request/title record is armed before Google create. Same request never sends again; another creation is blocked while any unresolved request exists, including after reload/restart | 0024 creation table/RPCs; `sheets/handler.ts`; SQL first-send/replay/second-request denial/foreign tests |
| Positive creation recovery | Operator enters a file ID after locating the request-marked title in Drive. Server reads Google metadata and requires the exact title plus request UUID before durable binding. Confirmed replays read the recorded file, never create another | `GoogleSheets.recoverSpreadsheet`, `CreationRecovery`; exact/mismatching-title injected transport tests and SQL confirmed replay |
| Controlled abandonment | Explicit acknowledgment records that the old file may exist, releases the unresolved-creation block and retains an audit. It does not delete an object, assert non-creation or automatically resend the old request | SQL creation-abandon and UI checkbox; request list persists across reload |
| Row reconciliation | Existing metadata-ID addressing, visible-ID duplicate checks, header/ownership/formula guards, exact fingerprint reconciliation and lease/source/destination fences retained | Existing injected tests for moved/deleted/duplicated IDs, changed headers, formulas, uncertain append, 401/403/429/503, stale/lease/destination cases |
| Deleted/duplicate/changed structures | Safe refusal is preserved. Operator corrects duplicate/metadata/header conflicts externally or selects a new dedicated compatible destination. Unknown old writes require existing lease-expired destination-abandon acknowledgment; absence never permits blind append | Existing configure/reconcile/resolve-destination, new actionable status copy and safe resync; no automatic destructive duplicate-row deletion or adoption of unrelated tabs |
| Resync after correction/reconnect | Explicit `sheets.manage` resync requeues the current head without inventing a new creation/source event. Processing, armed and reconciliation-required jobs are rejected. Existing reconnect/configure/enable resumes eligible jobs | 0024 resync; SQL safe/resync-denial tests. Provider confirmation is still necessary for synchronized state |
| Bounded scans and visibility | Inspect grid row count, refuse >10,000 allocated rows and scan a bounded ID range. Do not silently truncate and proceed. Jobs gain 20-row pagination and counts; recent confirmed history remains explicitly labeled 100 maximum | `sheets/google.ts`, model/handler/workspace, 0024 dashboard-page; oversized-sheet refusal and page-two SQL tests. Pilot capacity acceptance remains B1/D4 |
| Billing lifecycle | Existing versioned plans, exact money, next-period changes/renewals, cancellation, lazy expiry/activation, manual approval/refund, entitlement reservations and completion allowances reused | Existing billing unit/SQL suites rerun; no invented prices/trials/limits/proration or tax rules |
| Billing history/downloads | New paginated agency payment history plus existing authorized internal JSON billing-record download. Records remain explicitly non-fiscal | `billing/history-workspace.tsx`, 0024 history wrapper; agency capability and page tests, existing download/tenant/security regressions |
| Platform support pagination | All agencies, subscriptions, payments, usage, unresolved provider events/operations and audit rows are reachable in bounded support pages. Manual approve/reject/refund and subscription suspend/reactivate/refresh reuse original mutation RPCs | `BillingSupport`, 0024 support-page; every resource tested under independent AAL2 admin; unauthorized caller/unknown resource denial. Existing overview lists are labeled bounded |
| Outgoing payment integrity | Gateway prepare now returns authoritative exact amount/currency. Orchestrator dispatch uses those values rather than caller-supplied prices; durable prepare claim still permits one send only | `billing/provider.ts`, 0024 gateway wrapper; exact prepared terms and repeated send:false SQL/unit tests |
| Unknown payment reference | New stored recovery context exposes persisted operation ID/kind/reference; optional selected-provider positive correlation may admit only authenticated matching events. Unsupported/absent lookup returns reconciliation-required and never recharges | `BillingPayments.recover`, 0024 recovery-context; unsupported and matching event unit tests, SQL null-reference/foreign-provider tests |
| Manual review/security | Existing independent platform identity, MFA, self-review prohibition, reference uniqueness, immutable history, raw webhook authentication and activation rules preserved | Existing billing regressions; A4 does not add a browser-return success path, webhook trust shortcut or manual conversion of provider uncertainty into payment confirmation |
| FR/AR/RTL | Archive search, paging, marker actions, creation recovery/abandonment, job paging/resync, billing history and platform support use existing responsive styles and labels | New FR/AR archive/recovery markup tests and existing component regressions; actual browser/mobile/assistive technology acceptance deferred |

## Reused architecture and access policy

No new authoritative archive, sync queue, identity store, rental payment model or
subscription ledger was introduced. Archive metadata records only an organizational
marker and idempotency receipt; search joins canonical data. Its audit never stores
the search text. Issued PDF and signature retrieval still go through existing
request authorization, scoped private storage and checksum verification. Historical
access remains independent of new-contract issuance quota; the underlying module's
explicit signer/evidence/delivery capabilities still apply. A3's raw provider
evidence limitation remains unresolved and is not fixed by an archive link.

Archive signature filters mean at least one historical session has the indicated
signature/completion, not that the current rental version inherits an old signature.
The detail page identifies exact rental/template/artifact/session versions. Marking
does not change any of those records. Partially signed/current contracts are
searchable, but only completed/cancelled rentals may be organizationally archived.
Historical records without an original captured snapshot use authorized retained
source records; the application does not invent issuance-time facts.

Twenty-row ordering plus an insertion cutoff makes ordinary pagination deterministic
and excludes later creations. Concurrent edits can still change filter membership
or visible names/statuses across requests; this is not a frozen database export.
There is no unbounded export, external identity verification or URL-based query.
Substring search favors functional coverage within tenant scope; indexes support
agency/state/date/history joins, not a promise of constant-time arbitrary substring
search at unaccepted production volumes.

## Actual Sheets guarantees and limits

The existing atomic row-insert/value/metadata batch, RAW literal updates and metadata
filters remain the write mechanism. Reconciliation is read-only until an exact
captured sequence and full row fingerprint are confirmed. An uncertain append is
never blindly repeated. Human copies, sorts of partial ranges, modified metadata
and schema races cannot be made exactly-once without a provider CAS/unique-key
primitive. Whole-row movement with retained metadata is supported and tested.

Duplicate IDs, a deleted previously confirmed row, header/formula conflicts and
unrelated tab data fail closed. Resync is appropriate only after a safe correction;
it cannot bypass these checks. A different physical file/tab plus the existing
audited unknown-destination procedure is the recovery path for an unrecoverable
old ambiguous write. Old destination outcomes remain explicitly unknown.

Spreadsheet creation recovery uses server reads of a user-provided file ID with
an exact request-marked title. This is positive correlation/manual selection under
the existing OAuth account, not automatic Drive-wide discovery or immutable
proof that the title was never edited/copied. A mismatch is rejected; the operator
must resolve the file or explicitly abandon the request. No Drive-wide scope,
background file search or automatic orphan-file deletion was added. Worksheet
creation retains the existing explicit sheet-ID atomic batch and conflict behavior.

The 10,000-row scan ceiling is a safety bound, not an approved commercial capacity.
Missing/non-grid shape information or oversized allocated grids refuse writes.
Reduce/migrate the dedicated tab to resume; no truncated scan may authorize an
append. Existing per-agency worker serialization, bounded retry/backoff and quota
handling remain; one tick does bounded work. Google/OAuth endpoints were never
called in verification—only injected transports were used.

## Remaining concrete payment implementation

B5 must select a provider and its actual merchant/currency capabilities. Then code
must implement checkout creation, immutable operation/payment/order correlation,
verified settlement activation, recurring renewal if B4 sells it, cancellation,
refunds, authenticated raw webhooks with freshness/replay and merchant binding,
positive reconciliation including unknown transaction IDs where supported,
provider transaction references and a credential/rotation profile. Routes and
agency checkout/recovery UI must wire the selected adapter. The production webhook
still receives a null service and fails closed; deterministic fake adapters are
tests only, not a concrete integration.

No generic provider can infer identity/trust from a browser redirect or absent
lookup result. Unsupported lookup retains uncertainty. Existing manual payment
review remains separate and cannot approve an agency user's own payment through
platform escalation. Rental customer advances/deposits are not SaaS payments.

Approved catalog/prices/currencies/trials/limits, grace/refund/next-period policy,
unattended renewal scope and fiscal requirements remain B4/B5/B6 decisions.
Lazy server enforcement is implemented; a sold unattended charging policy would
require its durable scheduling and selected-provider implementation, not just
credentials. Downloaded JSON records do not claim Moroccan tax/fiscal compliance.

## Files and migration

- New guarded `supabase/migration-drafts/20261126002400_archive_sheets_billing.sql`:
  unconditional guard, forward-only source additions/wrappers, final `ROLLBACK`.
  It is not a deployable release artifact and was not applied.
- New localized archive page; rental archive model, workspace and two test files.
- New Sheets client transport and creation-recovery workspace; updated Google
  metadata/scan/recovery, handler/model/workspace and injected transport tests.
- New billing client transport and history/support workspace; updated provider
  orchestration/tests, handler/model and existing agency/platform workspaces.
- Existing navigation/rental handler gain narrow archive integration. Extended
  the existing composed A1–A4 SQL test; no package/dependency/environment changes.
- Updated reconciliation, completion plan, tracker, readiness checklist and this
  report. No A5/A6 work, provider activation or production preflight.

## Verification

`npm.cmd run verify` passed workspace TypeScript, zero-warning lint,
**1,906 web tests in 101 files**, **737 database tests in 28 files**, and optimized
production build on 2026-11-26 UTC. The build includes the new FR/AR archive route.
The final archive/Sheets/billing focused rerun passed **67 tests in nine files**;
the composed A1–A4 SQL scenario also passed after the 23-rental pagination and
idempotent archive-audit assertions were added. Existing rental, document, signing,
delivery, Sheets and billing regressions are included in the full run.

`git diff --check` passed. An explicit new-file trailing-whitespace scan returned
no matches, and earlier tracked migrations/drafts have no diff. No test count
establishes Google/provider/native/browser acceptance.
PGlite executes real SQL constraints/RLS/RPCs but does not establish native parallel
sessions, production ACL ownership, managed Auth/Storage or provider semantics.

## Exit criteria and preserved blockers

Provider-independent A4 paths are implemented locally within the documented
non-destructive archive, exact-match recovery, scan and pagination limits.
**The full A4 batch remains incomplete** until the selected payment journey and
dependent verification/UI/recurring policy code are implemented after B5/B4.
No missing provider code is relabeled configuration-only. Stop after A4; A5 has
not started. The whole MVP remains incomplete and not production-accepted.

Preserve: A3 concrete signature transport, independent trust/identity/certificate
verification, hosted signing and raw evidence handling; legal signature/consent
validation; retained-logo and preview/generated/signing object cleanup; Arabic
font/visual fidelity and native DOCX acceptance; Resend SMTP/domain verification;
key provisioning/rotation and worker hosting; commercial catalog and fiscal
decisions; concrete payment code; native PostgreSQL concurrency; managed Auth and
Storage; migration/owner/ACL/default privileges/history/rollback compatibility;
cross-tenant and full FR/AR browser/mobile/accessibility acceptance. Larger pilot
volume acceptance remains explicit. No retention deletion, cleanup or live test
was performed.

## Official API references inspected

- [Sheets spreadsheet creation](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/create)
- [Spreadsheet metadata and field masks](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/get)
- [Grid dimensions](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/sheets#GridProperties)

These justify metadata-based recovery and bounded range inspection. They do not
provide an exactly-once append, immutable title or compare-and-swap guarantee.
