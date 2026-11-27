# A2 — Contract wording and preconfirmation documents

Local implementation, 2026-11-25. No migration applied, environment edited, provider
activated, message sent, browser/live acceptance performed, commit, push or deployment.
The existing A1 working tree is preserved. This is not a production readiness claim.

## Requirement and source evidence

| Requirement | Implemented behavior | Source and automated evidence |
| --- | --- | --- |
| Persisted clauses | Agency-owned titles and FR/AR content; enabled/disabled; append-only revisions; optimistic editing; owner plus `agency.manage` required to edit | `documents/clauses.ts`, `clause-workspace.tsx`, guarded 0022, `clauses.test.ts`; composed `a1-workflows.test.ts` A2 section |
| Reusable ordered wording | Template configuration selects explicit clause version IDs in order. Saving materializes authorized clause snapshots; later library edits cannot change those versions | `model.ts`, `workspace.tsx`, 0022 save wrapper; composed SQL checks historical selection |
| Contract customization | Draft may explicitly replace the template's ordered clause selection with other versions from its own agency library. No unrestricted executable wording expressions | `draft-workspace.tsx`, 0022 `draft-configure`, immutable `contract_confirmed_inputs` |
| Custom definitions and values | Existing bounded string definitions in immutable template configuration; actual per-draft values persisted, required mapping checks, unknown keys rejected; values frozen at confirmation | `model.ts`, `service.ts`, draft/official workspaces; composed SQL persistence/foreign-key tests |
| Dynamic fields | Existing allowlisted agency/drivers/vehicle/date/location/exact-money/reference mappings; adds selected authorized signer name. Draft has no invented official reference | `field-labels.ts`, `model.ts`, `a2_snapshot`; `model.test.ts`, composed A1/A2 assertions |
| PDF/DOCX compatibility | Reuses upload screening, private originals, immutable versions, PDF overlays and whole-run DOCX substitution plus isolated converter | Existing `uploads.ts`, `render.ts`, `converter.ts`, corresponding regressions |
| Populated preview | Actual saved unconfirmed rental, captured branding, selected immutable template, clauses and custom values pass through the same renderer as official generation | `Documents.preview`, `DraftPreview`, 0022; `service.test.ts`, `draft-workspace.test.tsx`, composed SQL |
| No issuance effects | Separate preview records and draft storage objects; no official artifact/job, allocation, signing session, invitation or contract creation event | 0022 preview branches; SQL state/number/job/artifact/session assertions; service action-sequence test |
| Non-final marking | PDF title and each page visibly identify an unsigned non-final preview; UI repeats that distinction | `render.ts`, `render.test.ts`, FR/AR workspace tests |
| Freshness | SHA-256 operational input fingerprint binds agency, rental version/current canonical data, operations and branding revisions, template bytes/config and persisted custom/clause values | `a2_fingerprint`, preview publication/retrieval/confirmation guards; stale location and in-flight publication tests |
| Concurrency and retries | Agency advisory lock and rental row lock; read-committed isolation required; 60-second lease, five attempts/request and 30 new requests/agency/hour. Failed render/upload releases its lease; uncertain publication never eagerly deletes bytes | 0022, `service.ts`; competing begin/lease recovery and failed storage tests |
| Private access and expiry | Existing request-JWT private bucket, tenant ownership and hashes; retrieval and direct Storage read policy reject stale, expired or postconfirmation previews; no public URLs | 0022 object-access wrapper, `downloadPreview`, existing `storage.ts`; foreign retrieval and stale Storage predicate tests |
| Confirmation and official issue | Associated template requires a fresh completed preview. Confirmation freezes template/custom/date/clause selection; later official begin rejects changed inputs and uses authoritative confirmed snapshot | `a2_confirmation_guard`, `contract_confirmed_inputs`, `Documents.generate`, `RentalDocuments`; SQL confirmed-input and official-begin assertions |
| A1 integration | Same canonical projection for draft and first confirmed capture: branding/logo revision, primary/secondary driver, vehicle, locations, ledger-derived rent/deposit balance and last payment; later versions preserve original parties | 0022 `a2_snapshot` and replacement capture function, composed SQL preview/final comparison |
| FR/AR UI | Clause editor/history/order, contract override, custom inputs, template choice, stale warnings/regeneration, retry, errors, private PDF preview/download; translated built-in field labels and RTL | `clause-workspace.tsx`, `draft-workspace.tsx`, `workspace.tsx`, `field-labels.ts`, rental integration; static FR/AR and JSDOM retry tests |
| Arabic and overflow | Existing fontkit embedding/RTL alignment retained; multiline wording measured/wrapped/paginated on separate appendix pages, hard failure at 50 pages or unavailable glyph/oversized word | `render.ts`, existing font fixture and new multiline fixture test; no visual shaping/converter acceptance claim |

Paths above are relative to `apps/web/src/`, except SQL and database tests.
Database evidence is the A2 section appended to
`packages/infrastructure/database/tests/a1-workflows.test.ts`: it preserves and
runs the entire preceding A1 scenario and composes actual guarded SQL through 0022
inside disposable PGlite only. It is not native or managed Supabase acceptance.

## Reused architecture and supported policy

No second template engine or approximate preview renderer was added. The existing
document RPC, request-JWT repository/storage adapters, original checksums, renderer
HMAC, fontkit/PDF engine, DOCX substitution and isolated converter remain the path.
`documents/client.ts` extracts the existing transport so the clause and preview
components do not depend circularly on the library component.

The documented custom type is a bounded string (2,000 characters); a typed schema
designer was explicitly not mandatory in P4-05. Requiredness continues to use the
existing mapping contract. No invented number or missing business value is supplied.
`contract.number` is left empty in previews and required normally after confirmation.
The explicit issue date and custom values persist and are locked in the issued UI.

Wording customization adds a separate appendix; it does not erase or replace legal
paragraphs already present in an uploaded PDF/DOCX. Agencies must remove conflicting
source wording in their original document and upload another immutable version.
No legally approved wording or compliance claim is supplied. All example wording
is labeled fixture content in tests. A contract override chooses existing agency
clause versions; editing reusable wording first creates a new library version.

PDF remains a supported unencrypted, unrotated, bounded overlay format. DOCX
placeholders must occupy a complete text run; split runs, unsupported parts and
unsafe structures fail explicitly. DOCX populated preview uses the same converter
as issue and meaningfully fails when it is absent. Original DOCX files are not
advertised as directly viewable PDFs. Signature zones remain on the original pages;
appendix pages cannot cover them. Signing remains agency-first/client-second and
only accepts existing issued artifacts, never a preview record.

The fingerprint is an operational freshness check over server-side PostgreSQL JSON,
not an approved semantic signature digest. Official signature evidence continues
to bind actual issued bytes through the existing engine. No old issued artifact,
template version, clause version or completed signing evidence is rewritten.

## Retention and recovery

Preview access expires after 24 hours and becomes invalid earlier on relevant data
changes or confirmation. Existing private storage accounting still charges actual
stored bytes; preview generation consumes no official document issuance quota.
Metadata and objects remain retained for reconciliation. No object deletion is
claimed merely because access expired. Pending uploads and uncertain publication
are retained so retries do not destroy an object whose metadata commit succeeded.
Crash recovery waits out the lease; ordinary failures release the exact lease.
The UI retains the request identity after an uncertain rendering response.

A5 must implement physical preview/generated-document/signing-object cleanup and
orphan inventory, retention approval, claim/recheck/delete reconciliation and quota
settlement. A1 retained/unattached-logo reconciliation remains a separate blocker.
This batch adds no scheduler, cleaner or production infrastructure activation.

## New and changed artifacts

- Guarded `supabase/migration-drafts/20261125002200_contract_previews_clauses.sql`
  begins with an unconditional exception and ends with `ROLLBACK`. Earlier SQL and
  drafts, including unapplied 0021, are preserved.
- New document files: `clauses.ts`, `clauses.test.ts`, `clause-workspace.tsx`,
  `draft-workspace.tsx`, `draft-workspace.test.tsx`, `field-labels.ts`, `client.ts`.
- Updated document model, handler, service, renderer, library/workspace and related
  tests; rental detail integrates `DraftPreview`; database A1 test adds A2 composition.
- Updated reconciliation, completion plan, tracker and readiness checklist, plus
  this report. No dependency, environment or production host change.

## Automated verification

Final `npm.cmd run verify` passed: workspace TypeScript, zero-warning lint,
**1,889 web tests in 96 files**, **737 database tests in 28 files**, and production
build. This includes rental, signing, delivery, Sheets and billing regressions.
Focused clause, renderer, service, FR/AR and JSDOM runs also passed. The composed
database scenario exercises actual SQL through 0022, including ordered/disabled
contract overrides, tenant denial, persisted custom values, actual payment data,
expiry, concurrent render admission, lost-lease denial, failure recovery, stale
publication/retrieval, confirmation and archived-but-confirmed template issuance.
Arabic and mixed FR/AR fixture generation uses the existing locally available
font when present; it does not establish visual shaping or native conversion.

`git diff --check` passed. A separate trailing-whitespace scan of new A2 source,
SQL and report files returned no matches. Earlier tracked migrations/drafts have
no diff; 0021 remains unapplied and was not edited. No live/browser/managed Storage
or native PostgreSQL acceptance is inferred from these local results.

## Remaining configuration and acceptance

- New `CONTRATPRO_A2_VERIFIED` defaults closed/unset for the new UI/actions.
  Existing `CONTRATPRO_DOCUMENTS_VERIFIED` and A1/other gates remain unchanged and
  unverified. Renderer key, private bucket/Auth policies and A1 configuration need
  separately authorized setup; no secret was read from the IDE's environment file.
- Licensed Arabic font configuration; actual Arabic shaping/mixed bidi/long-value
  layout and signature-zone visual acceptance; real isolated native DOCX conversion
  with representative agency templates. The local Arabic font test proves only
  generation/embedding, not visual correctness.
- Native migration/owner/default ACL/object-policy composition through 0022,
  rollback/history packaging, genuine concurrent sessions/deadlocks and managed
  Auth/JWT/Storage cross-tenant acceptance. Sequential PGlite checks do not replace
  these. Browser/mobile/keyboard/assistive-technology acceptance remains D3.
- All earlier blockers remain: A1 native/live acceptance and retained logos;
  generated/signing orphan reconciliation; external signing provider; automatic
  reminders; delivery recovery; key rotation; worker hosting; commercial billing
  decisions; final migration/cross-tenant acceptance. A2 does not close A3–A6.

The documented A2 local exit path is implemented within these supported-format
bounds: edit wording → select/configure draft → populated preview → fresh-input
confirmation → immutable official generation/download. Configuration and acceptance
remain open; the overall MVP remains incomplete. Stop after A2; A3 is not started.
