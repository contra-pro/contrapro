# ContratPro MVP scope reconciliation

Reviewed 2026-11-25. **MVP incomplete; production readiness not established.**
Scope: the original P0–P12 roadmap supplied for this review. This is a build-first,
read-only source review with documentation changes only. No application/migration
changes, flag changes, SQL execution, external calls, live browser acceptance,
infrastructure changes, commits or deployments were performed.

**A1 follow-up:** the user subsequently authorized local implementation. The A1
rows below are updated with evidence code **X** and the
[A1 implementation report](a1-core-agency-rental-workflows.md); the initial audit’s
read-only constraint describes that earlier review only. No full scope audit was
repeated. A1 gates, deployment, legal and live/native acceptance remain open.
**A2 follow-up:** [local clauses and populated previews](a2-templates-clauses-previews.md)
now adds guarded 0022, persisted wording/custom values, shared draft/confirmed
projection and freshness-fenced previews. No live/native acceptance is inferred.
A3 was subsequently authorized; see the A3 follow-up below. A2 evidence remains scoped to its checkpoint.
Final local A2 verification: TypeScript/lint, 1,889 web tests, 737 database tests,
production build and whitespace checks PASS. These do not close live/native gates.

## Evidence rules

**A4 follow-up, 2026-11-26:** [requirement/source/test evidence](a4-archive-sheets-billing.md).
Canonical private archive/search/markers, durable spreadsheet creation recovery,
safe resync, bounded scan/job/platform/billing history paging and provider-neutral
payment correlation now exist in guarded 0024. Full A4 remains incomplete pending
B5/B4 and concrete payment code. A3 provider/verifier/hosted/raw evidence blockers
and all prior native/live/operational acceptance remain open. A5 now has a separate
local implementation report below; no operational acceptance is implied.
Local A4 verification: TypeScript/lint, 1,906 web tests, 737 database tests,
production build and whitespace checks PASS. Final focused module rerun 67 tests PASS.

**A3 local follow-up:** [implementation evidence and exact remaining code](a3-signing-reminders-delivery-recovery.md).
Automatic reminder generation and controlled delivery uncertainty recovery now
exist in guarded 0023 and the existing outbox/UI. External completion admission
is implemented provider-independently; selected provider transport/verifier/hosted
integration/raw evidence remain unfinished after B3 selection. A3 stays incomplete;
no A4, live acceptance or deployment is implied. Earlier reports retain their dates.
Final A3 local verification on 2026-11-26 UTC: TypeScript/lint, 1,898 web tests,
737 database tests, production build and whitespace checks PASS.

Source, route composition, server authorization, SQL drafts, storage/provider
adapters, workers and test bodies were inspected. Test references below mean
existing automated coverage, **not tests rerun during this review**. The tracker’s
1,860 web / 736 database results are historical reported verification from November
24, with the later focused billing reruns described there. They are not completion
measurements. Scripted SDKs and embedded PGlite do not prove managed JWT/Storage,
native multi-session concurrency, legal validity or deployed behavior.

Status vocabulary (multiple statuses may apply):

- `IMPLEMENTED_LOCALLY`: executable implementation exists within stated bounds.
- `PARTIALLY_IMPLEMENTED`: required sub-behavior is missing.
- `NOT_IMPLEMENTED`: no executable product path found for the required behavior.
- `CONFIGURATION_REQUIRED`: credentials, grants, assets or approved values needed.
- `BUSINESS_DECISION_REQUIRED`: product/provider/policy choice needed.
- `LEGAL_VALIDATION_REQUIRED`: legal/fiscal/privacy validation outstanding.
- `LIVE_ACCEPTANCE_REQUIRED`: real integration or visual/security evidence needed.
- `DEPLOYMENT_REQUIRED`: implementation must later be packaged and deployed.

No whole-module completion or overall percentage is inferred. Environment flag
values supplied in IDE context are not acceptance evidence and were not changed.
Repository migration files are not a trustworthy inventory of deployed SQL.

## Source and test index

The evidence codes in every matrix row resolve to these actual files. Paths are
relative to repository root. A source directory in this index identifies a concrete
module; named files identify the inspected behavior. Missing-feature rows explicitly
have no positive feature test: related tests prove only the existing boundary.

| Code | Actual implementation files | Relevant existing automated evidence and limits |
| --- | --- | --- |
| F | `package.json`; `apps/web/src/app/[locale]/layout.tsx`; `apps/web/src/auth/handlers.ts`, `identity.ts`, `canonical-provisioning.ts`; `apps/web/src/server/agency-access.ts`; `packages/infrastructure/database/src/schema.ts`, `tenant-transaction.ts`; `supabase/migrations/20261115000100_foundation_schema.sql`, `20261115000200_foundation_context.sql`, `20261115000300_foundation_rls_grants.sql`, `20261115000400_supabase_auth.sql`, `20261116000700_canonical_provisioning.sql` | `apps/web/src/auth/identity.test.ts`, `handlers.test.ts`, `password.test.ts`, `canonical-provisioning.test.ts`, `security-headers.test.ts`; `apps/web/src/server/agency-access.test.ts`; DB `schema-contract.test.ts`, `supabase-auth.test.ts`, `canonical-provisioning.test.ts`, `tenant-transaction.test.ts`. Mostly boundary/SQL-contract evidence; see historical native evidence separately. |
| A | `packages/application/src/agency-management.ts`; `apps/web/src/agency/profile.ts`, `handler.ts`, `selection.ts`; `apps/web/src/components/agency-management-page.tsx`, `agency-form.tsx`, `agency-navigation.tsx`; `supabase/migrations/20261115000500_agency_management.sql` | `apps/web/src/agency/profile.test.ts`, `handler.test.ts`; `apps/web/src/components/agency-management.test.ts`, `agency-creation-retry.test.tsx`, `mvp-journey.test.ts`; DB `agency-management.test.ts`, `agency-hardening.test.ts`. Owner bootstrap is not team administration. |
| C | `packages/application/src/clients.ts`; `apps/web/src/clients/handler.ts`, `data.ts`, `server.ts`; `apps/web/src/components/client-form.tsx`, `client-list.tsx`; `supabase/migrations/20261115000600_clients.sql`; `supabase/migration-drafts/20261118000900_client_creation_idempotency.sql` and reviewed 0009 candidates | `apps/web/src/clients/validation.test.ts`, `unicode.test.ts`, `idempotency.test.ts`, `handler.test.ts`; component `clients.test.ts`, `client-creation-retry.test.tsx`; DB `clients.test.ts`, `client-idempotency.test.ts`, `client-receipt-boundary.test.ts`. No government identity verification. |
| V | `packages/application/src/vehicles.ts`; `apps/web/src/vehicles/handler.ts`, `server.ts`, `data.ts`; `apps/web/src/components/vehicle-list.tsx`, `vehicle-archive.tsx`; drafts `20261118000800_vehicles.sql`, `20261122001400_vehicle_module.sql` | `apps/web/src/vehicles/module.test.ts`, `persistence.test.ts`, `server.test.ts`; component `vehicle-module.test.tsx`; DB `vehicles.test.ts`, `vehicle-module.test.ts`. |
| R | `packages/domain/src/rentals/create-input.ts`, `pricing.ts`, `timestamps.ts`, `rpc-request.ts`; `apps/web/src/rentals/workspace.tsx`, `handler.ts`, `data.ts`; drafts `20261120001300_rental_contracts.sql`, `20261122001500_rental_mvp.sql` | `apps/web/src/rentals/workspace.test.tsx`, `persistence.test.ts`, `create-input.test.ts`, `pricing.test.ts`, `timestamps.test.ts`, `rpc-request.test.ts`; DB `rental-contracts-draft.test.ts`, `rental-mvp.test.ts`; native harness `packages/infrastructure/database/integration/rentals/scenarios.mjs` and historical 20-scenario report. |
| D | `apps/web/src/documents/model.ts`, `workspace.tsx`, `handler.ts`, `service.ts`, `repository.ts`, `render.ts`, `uploads.ts`, `converter.ts`, `storage.ts`; draft `20261124001600_contract_documents.sql` | Corresponding `model.test.ts`, `workspace.test.tsx`, `handler.test.ts`, `service.test.ts`, `render.test.ts`, `converter.test.ts`; DB `contract-documents.test.ts`. PDF bytes generated in tests; container conversion and Arabic visual fidelity unaccepted. |
| T | `packages/application/src/rentals/contract-settings.ts`, `contract-settings-memory.ts`; `apps/web/src/rentals/contract-settings-studio.tsx`, `contract-document.tsx`, `contract-pdf-export.tsx` | `contract-settings.test.ts`, `contract-document.test.tsx`, `contract-pdf-export.test.tsx` in `apps/web/src/rentals`. Explicit demonstration/memory model, not persisted real template configuration. |
| S | `apps/web/src/signing/model.ts`, `service.ts`, `providers.ts`, `webhook.ts`, `pdf.ts`, `storage.ts`, `crypto.ts`, `workspace.tsx`; draft `20261124001700_signing_engine.sql`; route `apps/web/src/app/api/signing/webhook/[providerId]/route.ts` | `apps/web/src/signing/model.test.ts`, `service.test.ts`, `webhook.test.ts`, `handler.test.ts`, `workspace.test.tsx`, `privacy.test.tsx`; composed SQL assertions in DB `contract-documents.test.ts`. Provider fixtures are not commercial adapters. |
| E | `apps/web/src/delivery/service.ts`, `worker.ts`, `runtime.ts`, `resend.ts`, `webhook.ts`, `secrets.ts`, `workspace.tsx`; `apps/web/src/app/api/internal/delivery/run/route.ts`; draft `20261124001800_delivery_orchestration.sql` | `apps/web/src/delivery/service.test.ts`, `worker.test.ts`, `resend.test.ts`, `handler.test.ts`, `workspace.test.tsx`, `model.test.ts`; DB composition in `contract-documents.test.ts`. No real send/SMTP acceptance. |
| G | `apps/web/src/sheets/model.ts`, `oauth.ts`, `google.ts`, `worker.ts`, `runtime.ts`, `handler.ts`, `workspace.tsx`; `apps/web/src/app/api/internal/sheets/run/route.ts`; draft `20261124001900_google_sheets.sql` | `apps/web/src/sheets/sheets.test.ts`, `handler.test.ts`; composed DB `contract-documents.test.ts`. Fake HTTP tests exercise concrete Google adapter logic; no Google account consent or real row mutation accepted. |
| B | `apps/web/src/billing/model.ts`, `repository.ts`, `handler.ts`, `provider.ts`, `webhook.ts`, `workspace.tsx`, `platform.tsx`; `apps/web/src/app/api/billing/webhook/[provider]/route.ts`; draft `20261124002000_billing.sql` | `apps/web/src/billing/model.test.ts`, `provider.test.ts`, `handler.test.ts`, `workspace.test.tsx`, `errors.test.ts`; DB `billing.test.ts` and composed `contract-documents.test.ts`. Route injects `null` provider service. |
| U | `apps/web/src/components/agency-navigation.tsx`, `area-shell.tsx`; `apps/web/src/app/[locale]/app/page.tsx`, `loading.tsx`; `apps/web/src/app/globals.css`; `apps/web/src/i18n/`; module workspaces/messages/copy in R/D/S/E/G/B | `apps/web/src/components/dashboard.test.ts`, `mvp-journey.test.ts`; `apps/web/src/i18n/messages.test.ts`, `locales.test.ts`; module workspace tests. Rendered markup is not mobile/keyboard/screen-reader browser acceptance. |
| O | `packages/infrastructure/database/src/migrations/runner.ts`, `manifest.ts`; `packages/infrastructure/database/scripts/migrate.ts`; `packages/infrastructure/database/provisioning/`; `scripts/`; `docs/deployment-0009/manual-production-backup.md` | DB `migration-runner.test.ts`, `migration-manifest.test.ts`, `migration-config.test.ts`, `provision-authority.test.ts`; `scripts/*.test.mjs`; historical native rental harness. No general production backup/restore/monitoring service found. |
| X | `apps/web/src/operations/model.ts`, `handler.ts`, `repository.ts`, `invitation.ts`, `logo.ts`, `client.tsx`, `team.tsx`, `branding.tsx`, `rental.tsx`, `accept.tsx`; new team/branding/operations-action routes; `apps/web/src/delivery/team.ts`; integrated rental/document paths; guarded `supabase/migration-drafts/20261125002100_agency_rental_workflows.sql` | `apps/web/src/operations/model.test.ts`, `handler.test.ts`, `logo.test.ts`, `workspace.test.tsx`, `client.test.tsx`; `apps/web/src/delivery/team.test.ts`; DB `a1-workflows.test.ts` executes composition through 0021. No live services/native concurrent sessions or actual browser acceptance claimed. |

DB test filenames above are under `packages/infrastructure/database/tests/`.
Historical scope/limitations are retained in [tracker](mvp-tracker.md),
[final checklist](rental-contracts-production-readiness.md), and the module reports
linked there. Older bootstrap prose (notably `architecture.md` and agency report
deployment statements) predates later implementations; executable source takes
precedence for local functionality, and no new deployment conclusion is drawn.

## Traceable original-scope matrix

“Next” references batches A1–A6 and queues B/C/D in the
[completion plan](mvp-completion-plan.md). Each row includes expected behavior,
actual evidence, status, remaining work and dependencies. “None locally” never
waives final integration/security acceptance. Related test evidence for a missing
feature is explicitly not proof of that feature.

### P0 — Architecture and planning

| ID | Expected user-visible outcome | Source / tests | Status | Missing functionality or evidence | Dependencies / next action |
| --- | --- | --- | --- | --- | --- |
| P0-01 | Coherent application architecture supports all journeys | F/R/D/S/E/G/B; tests in index | IMPLEMENTED_LOCALLY | Bootstrap architecture prose is stale; no need for a new architecture | Existing modules; maintain docs as batches land |
| P0-02 | Durable tenant-safe relational data | F/O plus drafts 0013–0020; DB suites | IMPLEMENTED_LOCALLY; DEPLOYMENT_REQUIRED | Reviewed deployment composition/inventory, not more parallel schemas | O; D1 |
| P0-03 | Explicit security and trust boundaries | F/A/S/E/G/B; authorization tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Current managed-role/JWT/storage/security sign-off | C credentials; D2 |
| P0-04 | Stable validated operations and error behavior | F/R/D/S/E/G/B handlers/models; handler tests | IMPLEMENTED_LOCALLY | Add contracts for missing workflows; no generic API rewrite | A1–A5 |
| P0-05 | Finite roadmap to the complete MVP | This matrix and completion plan; documentation checks | IMPLEMENTED_LOCALLY | Execution and closure evidence still outstanding | A1–A6 then D |

### P1 — Foundation and multi-agency

| ID | Expected user-visible outcome | Source / tests | Status | Missing functionality or evidence | Dependencies / next action |
| --- | --- | --- | --- | --- | --- |
| P1-01 | Next.js app with PostgreSQL persistence | F/R; root scripts and DB tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Full current stack integration | D1/D2 |
| P1-02 | Register, confirm, sign in, recover password and sign out | F; auth and password suites | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | SMTP/domain and actual Auth/canonical journey acceptance | C1; D2 |
| P1-03 | Create agency, select membership, enter workspace | A; agency handler/retry/journey tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Current production mapping/ACL evidence scoped to deployed version | D1/D2 |
| P1-04 | Enforced roles/capabilities | F/A/S/B/X; access/handler/DB tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Enforcement plus A1 owner-authorized team/role/permission management exists; managed acceptance outstanding | C2/D2 |
| P1-05 | Cross-agency isolation for all modules | F and all module SQL; tenant/handler suites | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Real JWT, revocation and native concurrency across full composition | D2 |

### P2 — Agency management

| ID | Expected user-visible outcome | Source / tests | Status | Missing functionality or evidence | Dependencies / next action |
| --- | --- | --- | --- | --- | --- |
| P2-01 | View/edit legal and contact profile | A; profile/handler/component tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Business information exists; no missing basic profile CRUD found | D2/D3 |
| P2-02 | Reusable agency logo and branding | X branding/logo/private policies; D captured logo; X/D tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Reusable branding and opt-in captured logo exist; retained/unattached uploads are visible and not physically reclaimed | C2/D2/D3; A5 retention/reconciliation |
| P2-03 | Owner manages agency users and roles | A/B/X existing memberships/invitations/roles; X/DB tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | A1 invite/accept/list/roles/permissions/revoke/reactivate/audit implemented with last-owner/quota/receipt checks | C2/D2/D3 |
| P2-04 | Manage authorized agency signers | S/X designation, eligibility, selection and revocation; X/DB tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LEGAL_VALIDATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Pending-session cancellation and completed-evidence preservation implemented; actual authority/legal/native race acceptance outstanding | B2/C2/D2 |
| P2-05 | Configure agency signature behavior | D zones; S typed consent; X signer/representative configuration | IMPLEMENTED_LOCALLY; LEGAL_VALIDATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Local typed method and authorized signer policy implemented; external assurance remains P6-04 | B2/D3 |
| P2-06 | Set locale, timezone and currency | A; settings validator/handler tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | FR/AR, Casablanca/UTC, MAD bounds deliberate | D3; do not invent extra currencies |

### P3 — Clients, drivers and vehicles

| ID | Expected user-visible outcome | Source / tests | Status | Missing functionality or evidence | Dependencies / next action |
| --- | --- | --- | --- | --- | --- |
| P3-01 | Create/read/update/archive clients | C; handler/validation/component/DB tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | No basic client CRUD gap found | D2/D3 |
| P3-02 | Capture CIN/passport/licence information | C clientFields; R captured driver payload; C/R tests | IMPLEMENTED_LOCALLY; BUSINESS_DECISION_REQUIRED | Type/number, nationality, licence number/issue/expiry exist. DOB, birthplace, document issue/expiry beyond licence not present; not explicit roadmap fields | Owner validates exact required identity schema in B1; add only approved omissions in A1 |
| P3-03 | Select primary and secondary driver | R workspace/0015 driver RPC/snapshots; workspace/DB tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Primary is client; secondary set while draft. No independent duplicate driver database needed | D2; preserve historical driver capture |
| P3-04 | Manage active/archive vehicle fleet | V/R; module/persistence/DB tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Existing module and lifecycle availability rules | D2/D3 |
| P3-05 | Search/edit/archive without losing references | C/V searchable lists, R immutable versions; tests C/V/R | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Resource history preserved; contract-wide archive search is P7-07 | D2; A4 for archive retrieval |
| P3-06 | Restrict exposure of identity information | C/R/D/S authorized detail/private downloads; privacy/handler/DB tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LEGAL_VALIDATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Retention/redaction/backup policy and managed-access verification | B2/C4/D2; no unsupported encryption-at-field claim |

### P4 — Contract template studio

| ID | Expected user-visible outcome | Source / tests | Status | Missing functionality or evidence | Dependencies / next action |
| --- | --- | --- | --- | --- | --- |
| P4-01 | Upload existing PDF and DOCX | D uploads/render/converter; model/render/converter/handler tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Restricted PDF/OOXML formats; real isolated converter and source-layout acceptance | C3/D3; A2 handles supported-format UX |
| P4-02 | Maintain private agency template library | D workspace/service/0016; D/DB tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Actual tenant library exists, separate from demo | D2/D3 |
| P4-03 | Edit clauses and preserve contract wording by version | D clauses/clause-workspace/render, 0022; clauses/render and composed A1/A2 SQL tests | IMPLEMENTED_LOCALLY; LEGAL_VALIDATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | FR/AR append-only clause versions, ordering, template selection and contract overrides persist as immutable snapshots; wording is an appendix, not replacement of existing PDF paragraphs | Legal wording validation; D2/D3 |
| P4-04 | Map dynamic business values | D/X model/resolveValues/captured snapshots; D/X/DB tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | A1 locations, payment summary/balances/method/date/reference and branding keys exist; missing legacy values stay absent and required mappings fail | D3; A2 preview |
| P4-05 | Define and supply agency custom fields | D config.custom, draft-workspace, 0022 draft/confirmed inputs; model/service/JSDOM and composed SQL tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Bounded string definitions and required mappings are reused; contract values persist through preview/confirmation/issue. Typed schema designer is not mandatory scope | D2/D3 |
| P4-06 | Place agency/client signature zones | D MappingEditor and S PDF placement; D/S tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Numeric page-point editor exists; visual drag editor not required | D3, fonts |
| P4-07 | Append immutable template versions | D save/repository/0016; D/DB tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Defaults/archive/history and original checksums exist | D2 |
| P4-08 | Preview and select actual contract template | D draft-workspace/service/render, 0022; document/JSDOM/composed SQL tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Selected version/custom/clause inputs persist before confirmation; populated PDF and supported DOCX preview share official renderer; actual converter/font/layout acceptance remains | C3/D3 |

### P5 — Contract creation engine

| ID | Expected user-visible outcome | Source / tests | Status | Missing functionality or evidence | Dependencies / next action |
| --- | --- | --- | --- | --- | --- |
| P5-01 | Complete rental form through authoritative save | R/X creation and A2 draft-workspace, 0013–0022; R/X/D tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | A1 terms/accounting and A2 template→populated preview→freshness-fenced confirmation handoff implemented locally | D2/D3 |
| P5-02 | Select current client/drivers/vehicle | R Choices and driver action; C/V/R tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Tenant lookup and active-state checks exist | D2 |
| P5-03 | Capture dates and calculate duration | R timestamps/pricing/workspace; timestamp/pricing/DB tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Existing offset/microsecond/business duration bounds require acceptance | D2; retain approved rental decisions |
| P5-04 | Capture pickup and return locations | R/X atomic create/draft edit/detail/capture/export; X/DB tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | No invented legacy values; legacy drafts must be completed before confirmation after 0021 | D2/D3; A2 preview |
| P5-05 | Capture rental price/deposit/payment information | R/X append-only ledger/receipts/panel; X/DB tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Advances/partial payments, method/date/reference, status/balance, reversals and separate deposit collection/return implemented; no real processing/fiscal claim | C2/D2/D3; separate from SaaS billing |
| P5-06 | Exact monetary calculations | R/X integer money/ledger-derived summaries; pricing/model/DB tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Local exact rent/payment/deposit accounting implemented; native concurrent acceptance outstanding | D2 |
| P5-07 | Preview populated document before confirmation | D DraftPreview/Documents.preview, 0022; service/render/JSDOM and A1/A2 SQL composition | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Actual draft projection, nonfinal watermark, leases/retries, fingerprints, expiry/private retrieval and confirmation fencing implemented; native/converter/browser acceptance remains | C3/D2/D3; physical orphan reconciliation A5 |
| P5-08 | Generate/download actual PDF | D service/render/private storage; render/service/DB tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Licensed font, converter if DOCX, renderer key/storage; no claim arbitrary PDF/DOCX/Arabic fidelity | C2/C3/D3 |
| P5-09 | Run rental lifecycle and retain history | R 0013/0015 workspace/snapshots; R/native historical tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Confirm/handover/extend/return/cancel and immutable history exist; no generalized archive search | D2; P7-07/A4 |

### P6 — Electronic signatures

| ID | Expected user-visible outcome | Source / tests | Status | Missing functionality or evidence | Dependencies / next action |
| --- | --- | --- | --- | --- | --- |
| P6-01 | Agency signs before client | S service/0017 assigned membership and zones; S/DB tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Signer capability must be explicitly provisioned; owner alone insufficient | P2-04; C2/D2 |
| P6-02 | Client signs second | S guest challenge/state machine; S model/service/handler tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Real device, invitation and revocation acceptance | D2/D3 |
| P6-03 | Internal simple electronic signature | B1 typed-name/optional bounded drawing, final PDF and evidence; service/UI/SQL tests | IMPLEMENTED_LOCALLY; LEGAL_VALIDATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Owner-selected initial MVP; no certified or qualified assurance claimed | B2; D3 |
| P6-04 | Optional external higher-assurance extension | Existing provider interfaces and empty production registry retained | DEFERRED_OPTIONAL | SAFY, DamaneSign and other providers excluded from mandatory initial MVP implementation; no silent downgrade | Future separately authorized extension |
| P6-05 | Verify signer at chosen internal assurance | Existing code hash/lockout/challenge/name and designated agency signer controls | IMPLEMENTED_LOCALLY; LEGAL_VALIDATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Account authority or code possession plus declared identity; no independent legal identity proof. Higher-assurance verification deferred with optional providers. | B2; B1/D3 |
| P6-06 | Obtain explicit versioned consent | S workspace/service/0017; S service/workspace tests | IMPLEMENTED_LOCALLY; LEGAL_VALIDATION_REQUIRED | Consent text/method and authority require legal acceptance | B2/D3 |
| P6-07 | Bind signatures to immutable exact bytes | S hashes/original/intermediate/final/font binding; S/DB tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Provider-produced byte preservation/independent validation missing for external mode; semantic digest decision remains separate | A3/D2; preserve digest blocker |
| P6-08 | Produce internal final signed PDF | B1 versioned typed/drawn rendering, UTC execution record, private immutable storage and checksum tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Original page layout retained; old pending renderer preserved; Arabic font/layout and managed storage acceptance required | B1/D3; external finalization optional deferred |
| P6-09 | Retain durable audit evidence and export dossier | S append-only events/hash chain/export; S/DB tests | IMPLEMENTED_LOCALLY; LEGAL_VALIDATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Not trusted timestamp or absolute tamper proof; provider certificate/time/evidence validation missing | B2/B3; A3/D2 |

### P7 — Delivery and archive

| ID | Expected user-visible outcome | Source / tests | Status | Missing functionality or evidence | Dependencies / next action |
| --- | --- | --- | --- | --- | --- |
| P7-01 | Transactional email delivered from durable jobs | E concrete Resend adapter/worker; E tests | IMPLEMENTED_LOCALLY; PARTIALLY_IMPLEMENTED; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Final-event materialization automatic; invitation queue initiated by agency, automatic reminder policy missing; actual provider delivery unaccepted | A3/C1/C2/D4 |
| P7-02 | Manually share by WhatsApp | E service/workspace/manual states; E tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Opening app/copy or manual report does not prove delivery | D3/D4 |
| P7-03 | Use secure signing links | S fragment token/expiry/revocation; E envelopes; privacy/handler tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | HTTPS, infrastructure log exclusion and token handling acceptance | C1/C2/D2 |
| P7-04 | Deliver verification code separately | S/E mixed-channel invariant; E service/DB tests | IMPLEMENTED_LOCALLY; BUSINESS_DECISION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Manual WhatsApp/out-of-band code path exists; automatic SMS adapter not present or mandated | B2 channel policy; D4 |
| P7-05 | Generate automatic reminders | E reminders/service/worker/recovery-workspace and 0023; reminder/FR-AR and composed SQL tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Explicit policy, hash/ordinal slots, leases, existing-outbox publication, limit/expiry/revoke/ambiguity and dispatch fences exist; no enabled default policy or hosted scheduler | C worker/keys; D2/D4 |
| P7-06 | Deliver final signed PDF automatically | E worker.materializeOnce/0018 completion event/private grant; E/DB tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Configure runner/provider; real final grant/delivery acceptance | C1/C2/D4 |
| P7-07 | Search/archive/retrieve historical contracts | R archive-model/archive-workspace/rental handler and 0024; archive/FR-AR and composed SQL tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Canonical agency/historical search, date/state/signature/payment filters, 20-row pages, non-destructive markers and existing private artifact/evidence/delivery access; no old signed regeneration | D2/D3; insertion-cutoff paging is not frozen concurrent-edit export |
| P7-08 | Inspect delivery history and recover failures | E recovery-workspace/handler/resend and 0023; signed-tag/JSDOM/composed SQL tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Authenticated job-tag observations recover missing IDs; known-ID provider reads and immutable manual review/retirement are available. Absence of correlation retains uncertainty, never authorizes automatic resend | D2/D4; recipient correction remains B2 scope decision |

### P8 — Google Sheets auto-sync

| ID | Expected user-visible outcome | Source / tests | Status | Missing functionality or evidence | Dependencies / next action |
| --- | --- | --- | --- | --- | --- |
| P8-01 | Enqueue immediately on “Créer le contrat” | G 0019 zz_sheets_rental AFTER INSERT; G/composed DB tests | IMPLEMENTED_LOCALLY; DEPLOYMENT_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Source/outbox commit atomic locally; not waiting for confirmation/signature | D1/D2; do not build second outbox |
| P8-02 | One-way export without domain mutation | G worker/google/repository; G tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Managed columns reserved to app; no external CAS promise | D4 |
| P8-03 | Update same row on contract/signature changes | G/X existing heads/jobs/events and captured location/payment fields; G/X/DB tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | A1 source data and accounting-change events implemented; same-row/fingerprint guarantees preserved; real Google acceptance outstanding | D4; A4 remaining creation recovery |
| P8-04 | Configure destination per agency | G workspace/handler/0019; G handler/DB tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | ID entry and worksheet selection exist; Picker/account avatar not required MVP | D3/D4 |
| P8-05 | OAuth with encrypted credentials | G oauth/runtime/AAD/CAS; G tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Google consent/scopes/HTTPS/client configuration and key ring | C1/C2; A5 rotation |
| P8-06 | Durable sync/reconciliation | G worker/google/creation-workspace and 0024; G/composed SQL tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Durable create claim blocks blind retry; exact request-title/manual file recovery, safe resync, 20-job pages and explicit >10,000-row refusal. No external CAS/exactly-once guarantee; confirmed history labeled recent 100 | B1 pilot capacity; C/D4; key rotation remains A5 |

### P9 — SaaS and billing

| ID | Expected user-visible outcome | Source / tests | Status | Missing functionality or evidence | Dependencies / next action |
| --- | --- | --- | --- | --- | --- |
| P9-01 | Configure subscription plans | B platform/catalog/versioning; B/DB tests | IMPLEMENTED_LOCALLY; BUSINESS_DECISION_REQUIRED; CONFIGURATION_REQUIRED | No approved commercial catalog installed; bounded numeric/string policy | B4/C3 |
| P9-02 | Subscription lifecycle | B model/0020 lifecycle/refresh; B/DB tests | IMPLEMENTED_LOCALLY; PARTIALLY_IMPLEMENTED; BUSINESS_DECISION_REQUIRED | Request-time lifecycle exists; unattended paid renewals/reconciliation require adapter/scheduling if sold | B4/B5; A4 |
| P9-03 | Server-side entitlements | B resource/feature triggers and RPC enforcement; B/composed DB tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Real composition incl. storage enforcement and in-flight completions | D2 |
| P9-04 | Track usage and enforce limits | B reservations/current/period buckets; B/DB tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Physical orphan bytes remain counted; native races/metadata acceptance | A5 orphans; D2 |
| P9-05 | Billing history and internal downloads | B history-workspace, existing document action, 0024 history; B/SQL tests | IMPLEMENTED_LOCALLY; LEGAL_VALIDATION_REQUIRED | Twenty-record paginated history and authorized internal JSON downloads; no fiscal invoice assertion | B6; conditional fiscal implementation |
| P9-06 | Independent manual payment review | B platform/manual confirm/reject/refund/audit; B/DB tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Provision independent authorized reviewers/AAL2; actual bank settlement is external | C2/D4 |
| P9-07 | Payment provider architecture | B BillingProvider/BillingPayments and 0024 gateway; provider/SQL tests | IMPLEMENTED_LOCALLY | Exact authoritative prepared terms, durable one-send claim and positive stored-operation recovery added; absent lookup retains reconciliation-required | B5 actual adapter/merchant/recurring/route code remains unfinished |
| P9-08 | Concrete provider-backed payment journey | B webhook route passes null; no concrete adapter test | NOT_IMPLEMENTED; BUSINESS_DECISION_REQUIRED | Checkout/renew/cancel/refund, authenticated webhook, merchant binding and unknown-ID recovery adapter/wiring | B5; A4 offline fixtures first, then sandbox D4 |
| P9-09 | Platform administration | B platform/history-workspace and 0024 support-page; B/SQL tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Existing independent AAL2 billing mutations plus paginated agencies/subscriptions/payments/usage/events/operations/audit; overview limits labeled. No unrequested general tenant lifecycle administration | B1 general admin scope; C2/D2/D3 |

### P10 — UI/UX FR and AR

| ID | Expected user-visible outcome | Source / tests | Status | Missing functionality or evidence | Dependencies / next action |
| --- | --- | --- | --- | --- | --- |
| P10-01 | Professional agency dashboard | U dashboard only links client flow; dashboard/journey tests | PARTIALLY_IMPLEMENTED | No operational overview of rentals/signing/delivery/sync/billing; new management journeys absent | A1–A5; A6 |
| P10-02 | Consistent navigation/design | U shared shell/navigation plus module workspaces; component tests | PARTIALLY_IMPLEMENTED | Complete entry points for team/signers/branding/archive; consistent forms/status/recovery polish | A6 after feature slices |
| P10-03 | Complete French and Arabic copy | U typed dictionaries/module copy; i18n/workspace tests | PARTIALLY_IMPLEMENTED; LIVE_ACCEPTANCE_REQUIRED | Technical field keys shown by MappingEditor/custom fields; demo studio French labels; no whole-journey translation inventory | A2/A6; distinguish internal/demo routes |
| P10-04 | Correct RTL and bidirectional data | U locale layouts/module dir/bdi; locale/workspace tests | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Full mixed Arabic/Latin UI and PDF visual correctness unproven | C3/D3 |
| P10-05 | Usable mobile layouts | U globals/module CSS; historical rental screenshot evidence | PARTIALLY_IMPLEMENTED; LIVE_ACCEPTANCE_REQUIRED | No complete current multi-module mobile evidence; dense numeric/template/platform forms need runtime assessment and fixes | A6/D3; do not invent proven overflow bugs |
| P10-06 | Accessible keyboard/screen-reader flows | U labels/status/focus; workspace tests | PARTIALLY_IMPLEMENTED; LIVE_ACCEPTANCE_REQUIRED | Whole-app keyboard/focus/contrast/error and PDF-preview fallback acceptance missing | A6/D3 |
| P10-07 | Loading/empty/success/error states | U module useStatus/useFeedback; workspace tests | PARTIALLY_IMPLEMENTED | Template-choice load rejection swallowed; separate association step needs clear guidance; bounded lists/errors need clear recovery | A2/A6 |
| P10-08 | No dead-end controls across complete journeys | R/D/S/E/G/B route composition; module tests, not browser E2E | PARTIALLY_IMPLEMENTED; LIVE_ACCEPTANCE_REQUIRED | Missing flows above, template post-create handoff, configured-provider controls and archive retrieval | A1–A6 then D3/D4 |

### P11 — QA and security

| ID | Expected user-visible outcome | Source / tests | Status | Missing functionality or evidence | Dependencies / next action |
| --- | --- | --- | --- | --- | --- |
| P11-01 | Automated regression protection | Root verify scripts; F–B suites | IMPLEMENTED_LOCALLY; PARTIALLY_IMPLEMENTED | New feature tests needed with implementation; full current browser E2E not established. No repository CI workflow found, but CI expansion is not an additional mandatory MVP feature | A1–A6; D3 journey acceptance |
| P11-02 | Demonstrated tenant isolation | F–B guards/RLS/composite FKs; DB/handler suites | IMPLEMENTED_LOCALLY; LIVE_ACCEPTANCE_REQUIRED | Current native managed-role/JWT multi-module evidence | D2 |
| P11-03 | PDF/signature integrity | D/S hashes/immutable versions/events; D/S/DB tests | IMPLEMENTED_LOCALLY; PARTIALLY_IMPLEMENTED; LIVE_ACCEPTANCE_REQUIRED | External provider validation missing; canonical semantic digest decision remains independent | A3/B2/D2 |
| P11-04 | Secure private storage | D/S scoped checksum keys/private POST download; D/S/DB tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Managed bucket/object/JWT metadata semantics and generated-object recovery | C2/A5/D2 |
| P11-05 | Recoverable backups | A5 executable DB/object/encrypted-key capture, manifests, isolated restore/quarantine; offline fixture tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Managed-service configuration/metadata restoration and actual encrypted restore consistency remain unaccepted; not a dump-only recovery claim | B7/C4/D5; A5 report |
| P11-06 | Operational monitoring | A5 liveness/readiness/status, heartbeat, queue/lease/uncertainty/rotation/backup/incident metrics and MFA panel; runtime/SQL tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Collector/threshold ownership and real alert/stale-worker acceptance remain open | C4/D5; A5 report |
| P11-07 | Operational recovery | A5 historical keys/CAS, pinned generation/simple finalization, inventory/fenced cleanup and restore holds; composed SQL and runner tests | IMPLEMENTED_LOCALLY; PARTIALLY_IMPLEMENTED; LIVE_ACCEPTANCE_REQUIRED | Historical logos/unknown orphans retained for manual review; concrete signature/payment provider recovery still unfinished A3/A4; native recovery drills deferred | A3/A4/B7/C4/D5 |
| P11-08 | Security acceptance | Existing threat models/ACL harnesses; F–O tests | LIVE_ACCEPTANCE_REQUIRED; LEGAL_VALIDATION_REQUIRED | No single full MVP acceptance; retain native authority/default ACL, digest, privacy/legal and dependency diagnostics | D1–D5; B2/B6/B7 |

### P12 — Production readiness (deferred integration queue)

| ID | Expected user-visible outcome | Source / tests | Status | Missing functionality or evidence | Dependencies / next action |
| --- | --- | --- | --- | --- | --- |
| P12-01 | Supabase development integration | F–B request-JWT adapters and historical foundation evidence | PARTIALLY_IMPLEMENTED; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Later gated modules not accepted with real Auth/Storage; flags alone insufficient | C/D2 |
| P12-02 | Ordered migrations deployed safely | O runner/candidates/drafts; runner/manifest tests | PARTIALLY_IMPLEMENTED; DEPLOYMENT_REQUIRED | Exact deployed inventory, reviewed 0013–0020 packaging/authority/history/rollback; keep protected drafts unchanged | D1 after code batches |
| P12-03 | PostgreSQL portability | Existing Supabase request-JWT/Auth/Storage adapters reused; A5 managed-backend choice and executable recovery boundary | PARTIALLY_IMPLEMENTED; CONFIGURATION_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | App data is portable PostgreSQL; equivalent Auth/JWT/Storage services and isolated managed-schema/blob recovery must be accepted separately | C4/D5; A5 report/runbooks |
| P12-04 | Independent production VPS | A5 non-root app/worker containers, standalone build, resource/secret/private-TLS artifacts; static tests | IMPLEMENTED_LOCALLY for artifacts; NOT_IMPLEMENTED for provisioning; CONFIGURATION_REQUIRED; DEPLOYMENT_REQUIRED | Select/provision a separate target, private proxy/TLS, digests, secrets, font/converter and backup destinations; existing production VPS excluded | C4/D5 |
| P12-05 | Hosted delivery/Sheets workers | Existing workers plus A5 bounded runner, durable schedules, heartbeat and restart fencing; Node/runtime/SQL tests | IMPLEMENTED_LOCALLY; CONFIGURATION_REQUIRED; DEPLOYMENT_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | No live worker/scheduler started; schedules disabled pending reviewed intervals and real unattended acceptance | C2/D4/D5 |
| P12-06 | Pilot launch with evidence | No accepted complete pilot; historical docs only | NOT_IMPLEMENTED; LIVE_ACCEPTANCE_REQUIRED; DEPLOYMENT_REQUIRED | Complete FR/AR pilot on approved independent environment with recovery acceptance | A/B/C then D6 |
| P12-07 | Production launch | Final checklist remains NO-GO | NOT_IMPLEMENTED; DEPLOYMENT_REQUIRED; LIVE_ACCEPTANCE_REQUIRED | Explicit later launch approval, validated security/legal/operations and pilot | D6; no readiness claim |

## Known-gap reconciliation and additional findings

All requested known gaps are accounted for: preview P5-07; locations P5-04;
rental payment P5-05; identity P3-02; profile/signers P2-01/04; clauses P4-03;
custom fields/mapping P4-04/05; PDF/DOCX P4-01 and P5-08; Arabic P10-04;
higher assurance/provider verification/completion P6-04/05/08/09; reminders P7-05;
unknown IDs P7-08/P8-06/P9-08; generated/signing orphans P11-04/07;
key provisioning/rotation P11-07; workers P12-05; Sheets limitations P8-03/06;
billing adapter/catalog/platform P9-01/08/09; mobile/localization P10;
backups/monitoring/recovery P11-05/06/07.

The initial review found missing team lifecycle and agency-wide branding despite
existing schemas/quotas/per-template logos; these are now locally implemented by A1.
Remaining findings include no searchable contract archive and a client-only dashboard;
separate template association after draft creation; swallowed template-choice load
errors; raw mapping keys; capped billing/Sheets administration lists; billing webhook
deliberately wired to null; bootstrap architecture/agency reports are historical;
VPS portability requires more than generic PostgreSQL syntax.

Do not turn optional extensions into MVP blockers: Drive Picker/account avatars,
drag-and-drop template editor, OCR, arbitrary encrypted PDFs, automatic SMS,
drawn signatures, extra currencies, a separate driver database and unbounded-scale
optimization were not demanded. Validate supported formats, expected pilot volume
and identity requirements explicitly. Tax invoices and unattended recurring charges
depend on fiscal/commercial decisions; interfaces alone do not implement them.

## Preserved blocker register

No previous blocker is closed by this review. The entire existing
[final checklist](rental-contracts-production-readiness.md) and detailed module
reports remain applicable, including native authority/SET/ADMIN/owner/default-ACL
and history serialization, collision checks, runtime JWT/tenant/storage/concurrency,
canonical digest decisions, legal assurance/consent, provider verification,
SMTP/domain verification, worker hosting, reminder/unknown-ID gaps, font/converter
fidelity, key provisioning/rotation, orphan retention/accounting and privacy/logging.
Retain dependency-triage’s historical seven moderate development findings and
`npm ls esbuild --all` diagnostic until separately revalidated; no new registry
audit was performed here. Earlier recorded evidence remains scoped to its original
artifact/date, including any subsequent catalog reconciliation; this review neither
reopens proven historical facts nor treats them as acceptance of later modules.

A1 and A2 have local implementation reports, with native/live acceptance still
deferred. [A2 evidence and limits](a2-templates-clauses-previews.md) supplement the
[completion plan](mvp-completion-plan.md). A3 now has a provider-neutral local
follow-up; full A3 remains incomplete pending B3 and its dependent code. Stop here;
A4 is not started.
No production metadata preflight or deployment is implied.

## A5 local follow-up (2026-11-26)

A4 provider-independent work and the A5 operational implementation now have local
reports. The earlier stop-at-A3 text records its historical checkpoint, not current
authorization. [A5 evidence, guarantees and limits](a5-operational-readiness.md)
cover durable scheduling, existing workers, key overlap/CAS rotation, conservative
private-object reconciliation, backup/restore tools, monitoring and future hosting
artifacts. Drafts through 0025 remain guarded and unapplied. All schedules and
destructive cleanup default disabled. No A6 work is started.

Full A3/A4 remain incomplete because concrete signature/trust/hosted-signing/raw
evidence and payment/merchant/checkout/refund/cancellation/recurrence code remain
unfinished. Commercial, legal, domain/OAuth, font/DOCX, native PostgreSQL,
Auth/Storage, migration, cross-tenant and browser acceptance blockers are preserved.
Scripts and local tests do not establish production operational readiness.

Final A5 local verification: TypeScript/lint, 1,913 web tests, 737 database tests,
8 operational-tool tests, standalone production build and whitespace checks PASS.
The documented provider-independent local exit criteria are satisfied; operational
acceptance and unfinished concrete A3/A4 provider integrations remain open.
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
