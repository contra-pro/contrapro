# ContratPro finite MVP completion plan

## Current gate — 2026-11-27 UTC

**D1 complete; D2 SYNTHETIC_NATIVE_ACCEPTANCE_PASSED.** Final receipt/source/lineage review confirms all sixteen 0013–0028 native commits and completion of the prepared synthetic scenario contract, including final drawn payload/typed client/idempotency/finalization/evidence and authority/Auth/history/replay guard checks. Owned disposable server shutdown verified. No completed test, SQL, startup or deletion repeated during closure review. [Evidence](d2-synthetic-closure-evidence.json), [scope and next-stage plan](d2-synthetic-closure-and-faithful-upgrade.md).

The next dependency is **faithful existing-target upgrade**, not another synthetic run or clean foundation installation. Prepare a single pinned bounded read-only missing-definition/security capture package using D1 evidence and explicit UNKNOWN 0008/0009 historical identity. Bundle later owner approval of the observed-state-baseline route with exact-package read-only execution authority. Then reconcile the actual prefix/managed owner/permission/Auth/Storage/data-preservation contract, derive separately reviewed managed artifacts, accept only changed baseline/provider-dependent boundaries in an isolated reproduction, and request separate managed execution authority after backup/recovery proof. Neither synthetic success nor metadata capture authorizes mutation. Existing Auth users/all application data and original history remain preserved.

No synthetic contract obligation remains; provider fidelity/full drawn rendering/untested business paths are scope limits, not fabricated passes. A6/dashboard/manual acceptance, remaining infrastructure/provider integration and full original MVP acceptance stay open; payment/pricing/final legal documents remain deferred before commercial launch. The four work queues and complete original scope below remain intact. No implementation batch is reopened without a demonstrated defect. Cleanup is proposed only for the exact disposable data path (~69.9 MiB) after evidence retention and separate confirmation; no installation/unrelated database or tooling is removed. Earlier D1/D2 planning paragraphs below are historical.

2026-11-27 D2 native environment preparation: matching complete PG17.11 resources are available in an existing known installation; no existing data/service was accessed or changed. A private fixed-target lifecycle, independent model baseline (no historical 0009 selection), ordered native candidate runner and staged acceptance scenarios are executable but unrun. Ten offline/mocked tests and inert Plan/resource checks pass. [Current package/commands/authorization request](d2-native-environment-package.md), [historical baseline strategy](d2-historical-baseline-strategy.md). Next requires a separately authorized synthetic native batch and available memory/port gates; faithful upgrade/managed migrations remain blocked. No earlier implementation batch or general MVP audit is reopened.

2026-11-27 D2 offline progress: bounded historical-source investigation, sixteen native-test executable candidate packages/contracts (0013–0028) and read-only infrastructure feasibility are complete. [D2 report](d2-offline-migration-preparation.md) records source identities versus unproven deployment provenance, including an additional Downloads v3 variant. Offline SQL parsing/order/dependency checks pass; 0013 retains an explicit native-catalogue PL/pgSQL obligation. Local PG17.11 programs exist but share resources remain unresolved; Docker daemon is unavailable. Next is scoped resource/fixture authorization and native-only candidate acceptance, not managed migrations. Keep all old drafts, existing data/Auth users and D1 evidence intact. No production or commercial/legal/provider readiness is newly declared.

2026-11-27 D1 closure: scoped target read-only collection/review is complete; final classification B. Recorded native prefix 0000–0012, existing application schema, Auth aggregate 2 and Storage 0/0 rule out clean installation. Preserve exact-source uncertainty, especially deployed 0008 and the 0009 variant. Next dependency is D2 offline candidate/predecessor packaging and separately authorized native PG17.11 acceptance, using [the complete 0000–0028 matrix](d1-migration-reconciliation-worksheet.md) and [D2 plan](d2-native-postgresql-acceptance-plan.md). Proposed forward logical suffix is 0013–0028 in order, through reviewed executable candidates, never all 37 artifacts or guard removal. No database mutation or provisioning is authorized here. Payments/pricing/final legal/provider/manual acceptance remain deferred; existing completed batches are not reopened. Full MVP/production readiness is not declared.

2026-11-25 — BUILD-FIRST. **MVP incomplete; no production readiness claim.**
Source: [requirement matrix and code/test index](mvp-scope-reconciliation.md).
This originated as a documentation-only plan. Batch A1 was subsequently authorized
and implemented locally: see [A1 implementation](a1-core-agency-rental-workflows.md).
Configuration, provider activation and live acceptance remain deferred.
The user-designated plan/tracker locations replace generic skill task filenames.

## Four separate work queues

| Queue | Purpose | Completion evidence |
| --- | --- | --- |
| A | Remaining code/UI: six batches below | Executable paths, focused regression tests, current local verify, updated matrix; no mock/interface counted as functionality |
| B | Product-owner commercial decisions, legal validation and provider selection | Recorded concrete decisions/validated texts and provider requirements; does not replace implementing adapters |
| C | Configuration, credentials, assets and independent infrastructure | Reviewed provisioning/configuration records with no secrets in reports; separate from code and acceptance |
| D | Final integration, ordered deployment, security and live acceptance | Dated evidence against exact artifact/version/environment, with explicit later authorization |

Queue A includes provider-neutral work that can proceed offline. A provider decision
unblocks a concrete adapter subtask, not a reason to move unfinished adapter code
into queue D. Credentials are not needed to write fixture-driven adapter tests.
Likewise hosted scheduling cannot supply missing reminder generation, and a private
bucket cannot supply missing generated-object reconciliation.

## A — Ordered implementation batches

Six batches group related gaps without reimplementing working modules. The task
slices within a batch should be delivered separately; these are not six enormous
single changes. No new generic workflow engine, duplicate identity/driver store,
second outbox or replacement billing model is proposed. Existing protected migration
drafts and prior decisions must remain intact; schema additions need separately
reviewed forward artifacts when implementation is later authorized.

### A1 — Core agency and rental workflows (implemented locally)

Local code/SQL/UI and regression evidence: [A1 report](a1-core-agency-rental-workflows.md).
The criteria below remain the traceable original scope; live acceptance is still D.

Dependencies: existing Auth/canonical memberships, agency/profile, client, vehicle,
rental/version/audit and billing-entitlement contracts. Obtain B1 field/authority
policy before dependent schema choices; other A1 slices can proceed independently.
No external provider choice or live credentials are required for local work.

| Slice | Concrete behavior and likely source areas | Exit criteria and verification |
| --- | --- | --- |
| A1.1 Team lifecycle | Agency member list, invitation and acceptance bound to verified canonical identity, owner-authorized role/capability changes and revocation; `agency/`, agency UI, foundation membership/role/audit contracts | Owner/staff/foreign-tenant denial, duplicate/replayed invite, expired invitation, revoke and concurrent quota behavior tested; no arbitrary Auth ID or cross-tenant membership assignment; owner safety policy enforced |
| A1.2 Signers and branding | Manage signer designation/authority/revocation and explicit `contracts.sign`; persist reusable agency logo/branding defaults using existing private-storage validation; `agency/`, `signing/`, `documents/` integration | Authorized member can be designated/revoked; assigned signing session remains bound to its actor and history; profile branding survives restart and appears in new template defaults without rewriting historical versions; privacy and owner tests pass |
| A1.3 Complete rental terms | Pickup/return locations and approved rental-payment fields in form, strict decoder/encoder, create/update RPC, immutable snapshots/detail; identity fields only if B1 confirms additional mandatory omissions; `packages/domain/src/rentals/`, `rentals/`, client contracts and forward SQL | FR/AR create→update→confirm→history preserves locations/payment exactly; paid/balance/deposit semantics tested at centime boundaries; conflicting replay/stale version/foreign references/audit rollback covered; existing six-field callers have an explicit compatibility policy |

Batch exit: all three slices persist and authorize real data locally; new fields
flow into authoritative snapshots, not template-only custom values. Team/signature
permissions remain distinct from platform administration. Existing rental lifecycle,
creation receipts, immutable histories, resource quotas and tenant tests still pass.
Update matrix P2, P3-02 and P5-01/04/05/06. Run focused agency/client/rental/domain/DB
tests per slice, then root `npm run verify` at the batch checkpoint. Native managed
acceptance remains queue D, not a reason to omit local behavior.

### A2 — Templates, clauses and preconfirmation documents

Implemented locally on 2026-11-25: [A2 source, policy and verification report](a2-templates-clauses-previews.md).
Guarded 0022 remains unapplied. The original criteria below are retained for
traceability; native/live/font/converter acceptance and A5 physical-object cleanup
remain open. A2 does not authorize starting A3.
Local checkpoint: `npm.cmd run verify` PASS (TypeScript, lint, 1,889 web tests,
737 database tests and production build); whitespace checks PASS.

Dependencies: A1 rental terms and branding, existing D renderer/storage/version
contracts; B1 supported clause-editing policy. Font/converter configuration is C3;
tests can use approved local fixtures without claiming deployment fidelity.

| Slice | Concrete behavior and likely source areas | Exit criteria and verification |
| --- | --- | --- |
| A2.1 Persisted clauses | Versioned agency-editable clauses using supported template layout/token semantics; reuse `documents/model.ts`, library UI and renderer; keep demonstration studio separate | Clause change creates new version, survives reload and changes new rendered contracts; older issued/signed bytes remain unchanged; escaping, overflow, authorization and rollback covered; do not claim editing existing PDF text by overlay |
| A2.2 Actual preconfirmation preview | Server-authorized draft snapshot rendering with explicit template version, custom values, clauses, drivers, locations and payments; `documents/service.ts`, rental draft/review path and forward DB contract | Draft can preview populated PDF before confirmation; preview is visibly unsigned/non-issued; confirmation rejects stale source/template changes or binds reviewed inputs; preview cannot be signed as issued; retry and failed storage/metadata publication tested |
| A2.3 Complete selection and format UX | Clear draft→associate→review→confirm handoff; surfaced load failures/retry; DOCX-to-PDF preview where converter is available; translated field labels, required/overflow feedback and supported-format limits | Selection is persisted and visible before confirmation, with no silent failures; PDF and supported DOCX examples render/preview; missing converter/font fails meaningfully; all A1 fields/custom fields and signature zones map without invented values |

Batch exit: a user can edit wording, select a real template, preview a populated
unconfirmed draft, confirm and download the issued version. Test snapshot freshness,
template/rental replay, DOCX failure/resource boundaries, FR/AR glyph handling and
unauthorized preview. Reuse D suites plus rental workflow tests and composed DB
tests; run `npm run verify` at checkpoint. Arabic shaping/bidi and actual converter
layout acceptance remain explicit D3 work. Supported-format limits are not a promise
of OCR, arbitrary PDF paragraph reflow or split-run DOCX repair.

### A3 — Signing and delivery completion

Local follow-up: [A3 implementation and remaining provider code](a3-signing-reminders-delivery-recovery.md).
A3.1/A3.2 now have executable local reminder generation and recovery paths in
guarded 0023. A3.3 has provider-independent completion admission and byte-preserving
storage, but B3 selection, the selected adapter/verifier and full provider evidence
implementation remain unfinished. **A3 is not complete.** Stop after A3 work;
A4 is not started. No migration or feature gate was activated.
Final local verification on 2026-11-26 UTC: TypeScript/lint, 1,898 web tests,
737 database tests, production build and whitespace checks PASS. This does not
close A3.3's provider decision and implementation dependency.

Dependencies: A1 signer policy, A2 issued artifacts; B2 consent/channel policy.
Provider-specific subtask additionally needs B3. Keep local simple signing working
and external requests fail-closed throughout.

| Slice | Concrete behavior and likely source areas | Exit criteria and verification |
| --- | --- | --- |
| A3.1 Automatic reminders | Durable due-reminder generator/admission attached to current invitation/session; `delivery/service.ts`, worker and 0018 follow-on contracts | Clock-controlled tests generate each due reminder once under competing ticks; honor channel separation, limits, expiry, renewal, decline, cancellation, completion and quotas; never remind a superseded invitation |
| A3.2 Uncertain delivery recovery | Provider-neutral correlation lookup/reconciliation workflow and operator evidence; recipient-correction workflow only if included by B2; `delivery/worker.ts`, `resend.ts`, dashboard | Lost response before provider-ID persistence enters uncertainty; positive authenticated correlation can recover once; absence cannot authorize duplicate send; unsupported lookup has an explicit audited manual resolution path. No guessed IDs or false delivered status |
| A3.3 Optional external signing completion | DEFERRED_OPTIONAL after owner selected B1 internal simple signing. Retain provider interfaces, empty production registry and independent verification boundaries. | Not an initial-MVP implementation gate. Any future external extension needs separate approval, actual provider verification and unchanged signed-byte retention; no assurance downgrade. |

Batch exit for the selected internal-signature MVP: automatic reminders operate
locally; delivery unknown outcomes have a safe supported resolution; the internal
signature path has explicit success/failure/recovery implementations. A3.3 is an
optional deferred external extension and does not block this implementation exit.
Run S/E suites and composed DB evidence/fault tests plus `npm run verify`. Actual
provider sandbox/legal/recipient delivery acceptance stays in B/D.

### A4 — Archive, synchronization and commercial workflow completion

2026-11-26 local follow-up: [A4 implementation and exact limits](a4-archive-sheets-billing.md).
A4.1 and provider-independent A4.2/A4.3 now have executable archive/search,
durable exact-match spreadsheet creation recovery, safe resync, bounded scans/job
paging, billing/platform pagination and authoritative payment-operation recovery
contracts in guarded **0024**. B5 remains unselected; its concrete adapter,
merchant verification, checkout/renew/cancel/refund/hosted UI wiring and any sold
unattended billing policy remain unfinished implementation. Full A4 is incomplete.
No migration/gate/provider was activated. This A4 checkpoint was followed by the
separately authorized A5 local implementation report below. Stop after A5.
Local verification: TypeScript/lint, 1,906 web tests, 737 database tests, production
build and whitespace checks PASS; focused archive/Sheets/billing rerun 67 tests PASS.

Dependencies: A1 captured rental terms; existing Sheets/billing/outbox/receipt
contracts. B4/B5 control provider/commercial subtask; B6 controls any fiscal addition.

| Slice | Concrete behavior and likely source areas | Exit criteria and verification |
| --- | --- | --- |
| A4.1 Contract archive retrieval | Authorized reference/client/date/state search, pagination and explicit non-destructive archive policy in rental list/history | Search returns only agency contracts, including historical/archived references; lifecycle/issued/signature evidence never deleted or rewritten; bounded filters/index/tenant denial and pagination tests pass |
| A4.2 Sheets recovery and complete data | Export A1 location/payment fields; durable spreadsheet-creation correlation recovery; bounded scan/pacing at agreed pilot volume and explicit truncation/recovery feedback | Initial-create event and same-row update remain atomic/version-fenced; lost-create response cannot create a second spreadsheet blindly; recover via positively matched request identity or explicit manual selection with recorded uncertainty; RAW literal values and exact money preserved; rate-limit/lease/stale/destination-change tests pass |
| A4.3 Concrete payment integration | Now: enrich unknown-ID recovery/correlation and unattended-operation contracts only where needed. After B5: selected checkout/renew/cancel/refund adapter, raw webhook authentication/merchant binding, route and agency UI wiring; `billing/provider.ts`, webhook route, workspace, SQL provider operations | Fixture tests execute actual adapter wire format; wrong merchant/currency/amount/order/replay rejected; uncertain charge reconciles without recharging; redirect never activates subscription; manual review remains independent; approved renewal policy is implemented, with durable scheduling if unattended renewal is sold |

Batch exit: archive retrieval works; Sheets exports complete authoritative data and
exposes safe creation recovery; selected payment journey is executable, not a port
or null service. Product owner must explicitly accept bounded platform lists at
pilot size or implement pagination/search for those lists here; silent truncation
cannot satisfy required support tasks. General agency lifecycle administration is
added only to the agreed B1 scope, not presumed from a billing dashboard. Implement
tax invoice issuance only if B6 requires it, with validated numbering/fields/tax
fixtures; otherwise retain honest internal-record labeling. Drive Picker/avatar
remain optional. Run R/G/B suites, composed DB tests and `npm run verify`.

### A5 — Operational code and reproducible hosting artifacts

Dependencies: A1–A4 state/object contracts (runner/monitoring scaffolding can start
earlier), B7 retention/recovery objectives and C4 chosen independent target. No
production infrastructure mutation is part of this offline implementation batch.

| Slice | Concrete behavior and likely source areas | Exit criteria and verification |
| --- | --- | --- |
| A5.1 Keys and object recovery | Least-privilege provisioning/rotation/key-ring/draining tooling for renderer/signing/delivery/Sheets/billing; generated/signing orphan inventory and claim/recheck/delete recovery | Old ciphertext and in-flight jobs remain readable during overlap; new writes use new key; dry-run inventory leaks no secrets; claims cannot delete live/issued/evidence-bound objects; retry after deletion/commit ambiguity is safe; storage usage remains accurate |
| A5.2 Supervised execution and monitoring | Reproducible scheduler/runner artifacts for existing one-tick delivery/Sheets endpoints and reminder generator; health/queue-age/uncertain-job/key-expiry/backup-age telemetry and redacted operator runbooks | Bounded retries and shutdown/lease recovery tested; secrets never logged; existing endpoint authentication retained; missing configuration fails closed; tick failure and stale queue alert are observable. Reuse existing root verification scripts; a new CI system is not mandatory scope |
| A5.3 Backup/restore and portability | DB + private-object + key metadata recovery tooling/manifests; independent VPS app/proxy/worker deployment artifacts; document and implement minimal Auth/JWT/Storage portability adapter/config boundary needed for chosen PostgreSQL host | Offline/config tests demonstrate complete backup inventory and restore ordering; isolated restore rehearsal plan covers object hashes, evidence, keys and outboxes without accidental external resend. Clearly choose Supabase-managed backend or equivalent self-hosted services; a plain PostgreSQL dump is insufficient for Auth/Storage portability |

Batch exit: operations have runnable reviewed artifacts, not only interfaces or
aspirational worker directories. Dry runs and injected-fault tests pass locally;
no orphan deletion/rotation/restore is run on live data. Run focused scripts/worker/
storage/DB tests and `npm run verify`. Actual secrets, host provisioning, scheduled
execution and restore/alert drills are C/D evidence. Preserve earlier exact-owner,
ACL/history/rollback constraints; packaging release migrations is D1, not removing
guards from local drafts.

### A6 — Complete professional FR/AR journeys

Dependencies: A1–A5 user-facing paths; can polish each slice as it lands. Does not
postpone localization/accessibility of newly implemented features until the end.

| Slice | Concrete behavior and likely source areas | Exit criteria and verification |
| --- | --- | --- |
| A6.1 Dashboard and navigation | Authorized operational overview and next actions for rentals, signatures, delivery, sync and billing; entry points for team/signers/branding/archive; shared shell/workspaces | Real scoped summaries, no fake metrics; role/gate-aware actions lead to working paths or meaningful setup/recovery state; no unresolved required control |
| A6.2 Copy and state completion | Whole-journey FR/AR inventory; translated mapping labels and meaningful custom labels; consistent loading/empty/success/conflict/uncertain/restricted states | Automated copy/route/state inventory covers every required journey; technical keys/raw provider states are not unexplained product labels; configuration absence and denied access have clear next steps |
| A6.3 Mobile and accessibility fixes | Responsive dense editors/admin screens, bidi data, keyboard/focus/error associations/contrast/PDF fallbacks | Implementation includes responsive and semantic behavior plus focused component regressions; later authorized D3 checks 320px-class mobile, desktop, FR/AR/RTL, keyboard and assistive technology. Historical rental-only screenshots do not close the full-app requirement |

Batch exit: local complete-journey fixtures cover account→agency→team/signer→client/
drivers/vehicle→template/clauses→rental preview/confirm→agency/client signing→final
delivery/archive→same-row Sheets update, plus subscription/manual/provider and
platform recovery. `npm run verify` passes with meaningful new behavior tests.
Actual browser/provider/managed-backend acceptance remains D, with any discovered
code defect returned to the owning A batch instead of relabeled configuration.

## B — Product-owner decisions and legal validation

| ID | Decision required | Unblocks / exact recorded output |
| --- | --- | --- |
| B1 | Minimum identity fields; rental-payment method/paid/balance/deposit semantics; team invite/owner safety/signer authority; supported clause-editing approach; contract archiving policy; pilot volume and platform support scope | A1/A2/A4: field list and invariants, authority matrix, representative FR/AR contract/template examples and bounded-volume criteria. Existing CIN/passport/licence fields are already implemented; do not automatically add speculative identity collection |
| B2 | Validate signature method/assurance, consent/agency authority, identity evidence, verification-code channels, recipient corrections, privacy/retention and semantic digest decision | A1/A3/A5 and legal acceptance. Record qualified legal assessment separately; typed name + code is not government identity proof or qualified signature |
| B3 | Resolved for initial MVP: owner selected internal simple signing | External higher-assurance provider/profile selection and A3.3 adapter work are optional deferred extensions. Legal qualification and live acceptance of the internal mechanism remain required. |
| B4 | Commercial catalog: FR/AR descriptions, MAD/other explicitly approved currency, exact prices, trials/features/limits; next-period changes/no-proration, grace/refunds, completion overages and renewal policy | Configure versioned catalog; A4 unattended lifecycle only if promised. No invented prices/tax defaults |
| B5 | Payment provider and merchant capabilities for intended market/currency, refunds/cancellation/recurring payments | Concrete API/auth/freshness/merchant/recovery profile for A4.3; manual payment process remains distinct |
| B6 | Fiscal invoice/issuer/numbering/mandatory fields/tax/VAT and record retention validation | Determine whether A4 must add real invoice issuance; current internal JSON/history is not a compliant tax invoice assertion |
| B7 | Recovery objectives, retention, backup encryption/custody, operational ownership and expected pilot capacity | A5 acceptance thresholds and C4/D5 drills; no indefinite retention silently changed |

Do not block provider-neutral work awaiting B3/B5. Do keep dependent provider-specific
code visibly unfinished until the decision arrives and the adapter is implemented.

## C — Configuration and operational setup

| ID | Required setup (separate later authorization) | Depends on / acceptance handoff |
| --- | --- | --- |
| C1 | Verified Auth SMTP/domain and transactional Resend sender/reply-to/API/webhook configuration; correct HTTPS app origin/callbacks; Google OAuth consent/client/APIs and approved scopes; selected provider sandbox/merchant profiles | B2/B3/B5; D2/D4. Auth confirmation must not be weakened to bypass SMTP problems |
| C2 | Independent secret provisioning and matching DB key rows; key custody/overlap; explicit signing/delivery/Sheets/billing capabilities; platform AAL2 identities/MFA; private bucket/object policies; worker access credentials | A1/A5; D1/D2. Do not reuse auth-flow secret, expose credentials or grant owners implicit platform power |
| C3 | Licensed Arabic font and pinned isolated DOCX converter with required fonts/permissions/resource limits; approved plan/catalog values | A2/B4; D3/D4. No unreviewed images, fonts or commercial values |
| C4 | Independent VPS/environment, TLS/proxy/runtime/backend choice; worker scheduler/supervision; backup/object/key storage; redacted monitoring/alert destination and operator ownership | A5/B7; D5. Existing production VPS excluded from heavy ContratPro testing |

No credential inventory values, secret contents or production assumptions belong
in these reports. Feature flags remain unchanged until their original acceptance
and activation requirements are met.

## D — Deferred integration, deployment and final acceptance

| ID | Gate | Exact exit evidence |
| --- | --- | --- |
| D1 | Ordered migration composition and deployment | Reconcile actual history/current catalog with all native/candidate 0000–0012 and protected 0013–0020 drafts plus later additions; exact object/signature allowlists, owner/SET/ADMIN/default ACL preservation, role grants, FORCE RLS, source/trigger ordering, bounded locks, one transaction/history insert and rollback/restore rehearsed. Separately reviewed deploy artifact and explicit deployment authorization; never apply guarded drafts unchanged |
| D2 | Managed Auth, PostgreSQL and storage security | Exact deployed version tested with verified JWTs/roles, cross-tenant/anonymous/revoked/suspended denial, explicit capabilities, no direct writes/key/helper exposure; native multi-session races/deadlocks/quotas, audit-failure rollback, metadata sizes/finalization and source/signing revocation semantics |
| D3 | Full document/browser/FR/AR acceptance | Representative real supported PDF/DOCX templates and licensed font/converter; Arabic shaping/mixed bidi/overflow/signature placement; mobile/desktop/keyboard/accessibility journeys, all empty/error/conflict/uncertain states and private previews/downloads. This review performs no browser acceptance |
| D4 | Real provider and worker integration | Real sandbox/authenticated callbacks/unknown outcomes for selected signing/payment provider; actual Resend acceptance vs delivery; separate-code/manual WhatsApp behavior; unattended reminder/final-PDF events; Google consent/revocation/sort/copy/delete/formula/header/quota/lost-write/reconnect tests and same-row sync after initial create. Verify hosted ticks and no duplicate effects |
| D5 | Independent hosting and operational recovery | Rehearse deployment and restore on independent environment; DB+object+key consistency, evidence/hash verification, worker lease/drain/replay fencing, no accidental replay of email/payment/signature effects, key rotation, orphan inventory/delete safeguards, alerts and backup freshness; validate selected PostgreSQL portability architecture |
| D6 | Pilot and production decisions | D1–D5 and required legal/commercial decisions accepted against exact versions; bounded pilot closes findings and proves support/recovery; explicit later production authorization. No count of modules/tests substitutes for this gate |

The [existing final checklist](rental-contracts-production-readiness.md) remains
authoritative for its detailed historical blockers. This plan changes build order,
not previous acceptance facts or approvals. A previously recommended production
metadata step is not the current next implementation batch.

## Dependency order and closure rule

Primary sequence: **A1 → A2 → A3 → A4 → A5 → A6**, then final D acceptance.
B/C decisions may run alongside independent implementation; no live work is implied.
A3 provider-specific work waits only on B3; A4 payment-specific work waits only on
B5. Independent operations/copy improvements can proceed while these decisions are
pending. Do not close a batch while required dependent slices are unresolved.

At every batch checkpoint: update requirement rows with actual source/test evidence,
run focused tests and the existing local verification command, preserve gates and
unrelated changes, and record remaining B/C/D blockers. Reuse the matrix instead of
commissioning another whole-repository audit. Newly discovered defects are assigned
to an existing batch unless they introduce a genuinely new mandatory requirement.

**A2 local implementation checkpoint:** persisted versioned wording and populated
draft previews now reuse the existing renderer and canonical A1 sources. See the
A2 report for evidence and supported-format limits. Stop after A2. The subsequent
ordered batch is A3, but no A3 work, deployment preflight or external activation
is authorized or started by this checkpoint.

## A5 implementation checkpoint (2026-11-26)

The later user-authorized A3/A4 provider-independent slices and A5 operational
slice supersede the historical A2 stop point above. See
[A5 implementation matrix](a5-operational-readiness.md) and its linked operational
runbooks for source-level evidence and limitations. Existing outboxes and domain
leases are reused; 0025 adds disabled durable schedules, rotation CAS/progress,
exact-key cleanup claims/tombstones and restricted MFA administration.

Final A5 local verification passed: TypeScript/lint, 1,913 web tests, 737 database
tests, 8 operational-tool tests, standalone build and whitespace checks. Documented
provider-independent A5 local implementation exit criteria are satisfied. Native
concurrency, actual managed Auth/Storage, encrypted restore, container/private-TLS
and provider acceptance remain separate authorized work. A3 concrete signature
and trust integration and A4 concrete payment integration remain unfinished code,
not configuration. Legal/commercial decisions and all earlier acceptance blockers
remain open. Stop after A5; no A6, preflight, activation, commit or deployment.
# A6 verification follow-up — 2026-11-26 UTC

The later A6 authorization supersedes historical stop-at-A5 wording only for
local A6 work. See [A6 implementation and verification report](a6-professional-ui-ux.md)
for focused route/source coverage, actual verification results and explicit gaps.
**A6 remains incomplete; its local exit criteria are not satisfied.** The overview
currently covers a bounded rental list, not all required operational summaries.
Whole-journey FR/AR state coverage and composed fixture/visual/accessibility
verification remain open. No completed browser or screenshot evidence is claimed.
The browser tool stopped because it could not establish Chrome's current URL;
the user subsequently stopped the isolated synthetic review server on port 3316.
It was not restarted in the verification follow-up.

The recovered first verification passed TypeScript and stopped on a dashboard
render-time clock lint error, since corrected through a server observation-time
helper. The first resumed database run passed 737 tests. Final resumed results
are recorded in the A6 report rather than inferred from historical A5 counts.
Application/provider environment sources were excluded by the local verification
preload; no real integration, flag or migration was activated.

The pre-existing uncommitted guarded 0026 navigation projection remains unapplied
and requires permission/SQL compatibility validation. It was not created merely
as part of this verification follow-up. Earlier guarded drafts are preserved.
All A3 signature transport/trust/identity/certificate/hosted/raw-evidence and A4
payment transport/merchant/checkout/refund/cancellation/recurrence code gaps,
commercial/legal decisions, Resend/OAuth, Arabic font/DOCX, native PostgreSQL,
Auth/Storage, migration, container/worker, backup restoration, hosting and full
cross-tenant/live-browser acceptance blockers remain open. No commit, push,
deployment or overall MVP completion is claimed.

Final resumed A6 automated verification: TypeScript and zero-warning lint PASS,
1,924 web tests / 104 files PASS, 737 database tests / 28 files PASS, 8 operational
tests PASS, production build (including final TypeScript) and whitespace PASS.
Successful existing results were recovered; database tests were not redundantly
rerun after presentation-only corrections. Browser/axe/responsive measurements
and FR/AR screenshots remain unavailable, so these results do not close A6.

### A6 remaining-implementation follow-up

The dashboard projection/presentation gap is now implemented locally. The existing
guarded 0026 draft adds a minimal read-only tenant/capability-scoped task projection:
active rentals, 24-hour exclusive-cutoff pickups/returns plus overdue, drafts,
recent contract modifications, signing/invitation/finalization actions, delivery
failures/uncertainty and pending/problematic Sheets work. Lists are capped at 20,
with no provider calls, unbounded totals or implied vehicle availability. One
request-scoped UTC observation time is shared across at most four module queries.
Disabled/denied/error modules do not display fabricated zeroes.

Navigation now respects Sheets manage authority and A1's canonical-owner condition
for team/branding. Operational enum labels have FR/AR copy. The existing composed
PGlite scenario tests the projection, cross-agency and role denial, bounded/minimal
outputs, exact time boundary and cancelled-rental exclusion. 0026 remains guarded
and unapplied; native ownership/RLS/migration compatibility remains a later gate.

See the [updated A6 report](a6-professional-ui-ux.md) for current source/test evidence
and the [manual review guide](a6-manual-visual-review.md) for exact isolated startup,
localhost routes, synthetic identities, screenshot/keyboard/RTL/responsive checks
and shutdown/PID/port verification. The final fixture bundle and populated Latin
renderer preview were built without starting a server. No automated browser
interaction was retried and no screenshot acceptance was claimed.

Full A6 exit remains open: complete persistent whole-journey fixture coverage is
not established, and manual visual/accessibility/full-browser review is pending.
Fixture limitations are documented as verification-support gaps, not completed
functionality or configuration-only provider work. All previous concrete A3/A4
provider implementation, A5 operational, commercial/legal, Resend/OAuth, font/DOCX,
native/managed backend, migration, worker/container/restore, hosting and live
cross-tenant acceptance blockers remain. No commit, push, deployment or next phase.

Latest targeted follow-up verification PASS: TypeScript in both workspaces,
zero-warning lint, **1,933 web tests / 105 files**, the extended composed A1–A6
PGlite scenario, production build and whitespace. Manual fixtures and the actual
synthetic populated renderer preview compiled with `--build-only`, without a
listener. Historical 737 database / 8 operational passing results remain evidence
for unaffected suites, not newly rerun full-suite counts. Manual browser,
accessibility and complete whole-journey acceptance remain pending.


## V4.1 main-application integration — 2026-11-26

Owner-authorized batches I1–I7 are integrated locally: original Dusk landing and clearly simulated marketing demonstrations; real authentication and capability-aware Light Violet shell; actual agency switching/theme/language/search/notifications; six bounded operational KPIs, daily priorities before five visualizations and recent contracts/activity in a responsive 65/35 grid. Existing client/vehicle/rental, complete Studio, signing/delivery/archive, team/branding/Sheets/billing/platform screens share the approved tokens and shell while retaining authoritative handlers and gates. Rental filters/search/sort explicitly apply to the current server page. Agency/canonical-user changes replace client shell state.

See [integration report](v4.1-integration-report.md), [file manifest](v4.1-integration-files.json) and [manual acceptance](v4.1-manual-acceptance.md) for exact routes, verification evidence and limitations. No dependency installation, new migration draft, migration application, feature activation, real credential/provider access, commit, push or deployment. Existing source notices retained; owner-managed licensing questions are not declared resolved. The V4.1 reference remains unchanged.

This is a local implementation checkpoint only. A6 final visual/accessibility/responsive/browser acceptance remains **OPEN** under the retained Computer Use stop. No screenshots were generated or claimed. Authenticated whole-journey acceptance needs a separately authorized isolated synthetic backend. All P0–P12 scope and the previously recorded provider, assurance, document/DOCX/Arabic-font, infrastructure/restore, commercial/legal and live cross-tenant blockers remain open; no complete MVP production-readiness claim. Verification results are recorded in the linked report, without replacing prior evidence.
<!-- registration-onboarding-checkpoint-2026-11-27 -->
## Registration and agency onboarding checkpoint — 2026-11-27

Implemented locally: FR/AR personal registration fields and server validation, secure canonical profile seeding/settings, encrypted invitation continuation, a four-step saved agency wizard, atomic idempotent owner bootstrap, scoped agency administrative settings and future contract snapshot fields. Existing authentication, role authority, historical document versions and provider gates remain in place.

See [implementation and security report](registration-agency-onboarding.md) and [manual acceptance/restart instructions](registration-onboarding-manual-acceptance.md). Draft **0027** is guarded and unapplied. Final approved legal documents/versions are absent: registration remains unavailable rather than fabricating consent. A6 visual/authenticated acceptance, native PostgreSQL/managed backend concurrency and rollout verification, and all existing MVP production blockers remain open. No migration, provider activation, installation, commit, push or deployment.

## B1 owner scope decision — 2026-11-27 (current authority)

The initial MVP uses ContratPro's internal **simple electronic signature**. External higher-assurance integrations, including SAFY and DamaneSign, are **optional and deferred**, not an initial-MVP implementation or provider-selection blocker. Earlier B3/A3 statements requiring a selected signature provider are historical and superseded for this scope. Payment-provider, email configuration and other independent requirements are unaffected. A contract requiring higher assurance is still refused rather than downgraded.

B1 adds a bounded optional drawing to the typed-name capture and authoritative hash-bound event, plus an appended final-PDF execution record with UTC signing dates and unique references. Existing sequential authorization, invitation/code verification, immutable evidence, durable finalization, delivery/recovery/archive and same-row Sheets behavior are reused. Local draft **0028** is guarded and unapplied. See [B1 report](b1-internal-signature-completion.md) and [manual acceptance](internal-signature-manual-acceptance.md).

Legal qualification, approved consent/privacy/retention, native/managed backend and actual delivery acceptance remain launch requirements. No legal approval, qualified/certified signature, automatic handwritten equivalence or complete MVP readiness is claimed. No feature activation, live connection, remote migration, installation, commit, push or deployment.

## C1 owner decision and technical integration — 2026-11-27

Current decision labels: **B2 payments/provider**, **B3 commercial plans/pricing/limits** and **B4 final legal documents/validation** are deferred, remain in MVP scope and must be revisited before commercial launch. Existing billing and legal safeguards are retained. B1 internal simple signature is locally implemented; external signature providers are optional deferred extensions. Earlier queue labels are historical where they differ.

C1 reuses the actual A1/A3/A4/A5 email, Google Sheets and worker architecture. It adds early OAuth/key-ring configuration validation, refusal of credential-bearing redirects, bilingual technical Auth templates, isolated test-only legal fixture support and targeted configuration/orchestration regression coverage. Production signup still fails closed without approved real legal documents; no runtime route accepts synthetic identity or legal fallback. No new database draft was necessary after 0028.

See [C1 implementation report](c1-technical-integration-completion.md), [configuration matrix](c1-environment-configuration-matrix.md) and [C2/live acceptance sequence](c1-live-integration-acceptance.md). Native/managed backend, actual SMTP/Resend/Google delivery, infrastructure/worker and owner visual acceptance remain separate. The known unchanged Unicode scalar test can time out under concurrent build/SQL load; retain that observation and run the full web suite separately.

A6 remains OPEN; the full MVP is not production-ready. No real environment read/change, live provider access, production Hostinger/Coolify testing, migration application, purchase, gate activation, dependency installation, payment implementation, final legal drafting, commit, push or deployment occurred in C1.
## C2 infrastructure/worker checkpoint — 2026-11-27

C2 prepares independent production app/HTTP-worker entries, explicit deployment stages, static/public asset packaging, worker health snapshots and safe failure/backoff, private networking and deployment templates. Existing A5 durable schedules, least-privilege gateway, retry/lease/uncertainty protections, key rotation and backup/restore holds are reused. No schema/history/guarded draft through 0028 was changed; no new migration was needed.

See [C2 readiness](c2-infrastructure-worker-readiness.md), [deployment configuration](c2-deployment-configuration.md), [resource estimates](c2-infrastructure-requirements.md) and [D1 prerequisites](d1-migration-compatibility-prerequisites.md). Container/image/proxy/TLS behavior and native migration compatibility remain unverified. The optional DOCX host-container launcher needs separately approved isolated execution before use in the hardened app; no Docker socket is supplied.

B2 payments, B3 plans/pricing, B4 final legal validation, complete rental-workflow manual acceptance and D5 actual backup/restore acceptance remain deferred and retained. A6 remains OPEN. No Docker creation/build, dependency install, service activation, real secrets/services, infrastructure provisioning, existing production Hostinger/Coolify VPS use, backup/restore, remote SQL, commit, push or deployment. The Unicode parallel-load observation is retained; web regression is run separately from heavy build/SQL checks.
