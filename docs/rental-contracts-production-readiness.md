# Rental Contracts Phase 1A — offline Production readiness assessment

## Batch A4 follow-up — local code, full batch incomplete, 2026-11-26

[A4 implementation evidence and bounds](a4-archive-sheets-billing.md) adds guarded
0024: canonical/private archive search, non-destructive markers and receipts,
durable spreadsheet-creation recovery, safe resync, bounded scan/pagination and
payment-operation terms/correlation. No migration applied or feature activated.

- [ ] Select B5 and implement its actual payment transport, merchant/authenticated
  event verification, checkout/renew/refund/cancel flow, concrete reconciliation
  and agency route/UI integration; approve B4 unattended policy before adding it.
- [ ] Accept native composition through 0024, exact helper/RPC owner/ACL/default
  privileges/history/rollback packaging, genuine multi-session archive/creation/
  worker/payment races, cross-tenant managed Auth/Storage behavior.
- [ ] Accept Google exact-title recovery/manual abandonment, 10,000-row scan bound,
  moved/deleted/duplicate/header/formula/late-write behavior and pilot capacity;
  metadata reads/injected tests do not prove live Google semantics.
- [ ] Accept full archive/document/evidence/billing FR/AR/mobile/keyboard/browser
  journeys, scope-sensitive search log exclusion and private retrieval.

Full A4 remains incomplete pending dependent provider code. A3 provider/verifier/
hosted/raw-evidence, retained logos, preview/generated/signing cleanup, Arabic/
native DOCX, SMTP/domain, keys/worker hosting, commercial/fiscal and final migration/
concurrency/live acceptance blockers remain open. A5 was not started.
Local A4 verification passed TypeScript/lint, 1,906 web tests, 737 database tests,
production build and whitespace checks; final focused module rerun passed 67 tests.
No live/native/provider acceptance box is closed by these results.

## Batch A3 follow-up — local implementation, incomplete

See [A3 source/test evidence and remaining implementation](a3-signing-reminders-delivery-recovery.md).
Guarded 0023 adds configurable durable reminder generation, invitation revocation,
tag-correlated unknown-ID recovery, immutable manual review and external result
admission. No gate was enabled, SQL applied or real message sent.

- [x] B3 initial-MVP method decision: owner selected internal simple signing.
  External provider transport, trust profile, hosted journey and raw external
  evidence storage are optional deferred extensions. Internal legal and live
  acceptance remain separate unchecked launch requirements.
- [ ] Accept exact native ownership/ACL/history/rollback composition through 0023,
  concurrent reminder/session/policy/worker races and managed cross-tenant access.
- [ ] Accept real tagged Resend callbacks, unknown outcomes, domain/sender setup,
  worker hosting and FR/AR/RTL/mobile/accessibility recovery journeys.

Earlier A1/A2 live acceptance, retained logos, preview/generated/signing object
cleanup, Arabic/native DOCX, key rotation/provisioning, legal/commercial/fiscal,
Sheets/billing and final migration blockers remain open. A3 is not fully complete;
no A4, deployment preflight or activation is started.
Final local verification on 2026-11-26 UTC passed TypeScript/lint, 1,898 web tests,
737 database tests, production build and whitespace checks. These results do not
tick the live/native/provider acceptance boxes above.

## Batch A2 implementation follow-up — 2026-11-25

[A2 implementation and supported-format evidence](a2-templates-clauses-previews.md)
adds guarded **0022** for versioned clauses, persisted draft custom values, actual
preconfirmation previews, private expiry/freshness controls and confirmed-input
binding. Both preview and confirmed capture use the same canonical A1 projection.
No SQL was applied and no gate was enabled. This does not establish readiness.

- [ ] Review native composition through **0022**, including renamed RPC/helper
  execution restrictions, existing Storage policy OID rebinding, capture/confirmation
  trigger order, immutable inputs, isolation/row/advisory locks and rollback/history.
- [ ] Keep new `CONTRATPRO_A2_VERIFIED` closed until separately accepted; preserve
  existing documents/A1/signing/delivery gates and renderer-key requirements.
- [ ] Accept managed private preview reads/uploads, foreign/revoked-user denial,
  expiry/staleness, lost-response/lease recovery and genuine concurrent updates.
- [ ] Accept representative PDF/DOCX appendix layout, long/multiline content,
  Arabic fonts/shaping/mixed bidi and FR/AR mobile/keyboard/assistive technology.
- [ ] Complete A5 physical preview/generated/signing object orphan reconciliation
  and approved retention; preserve A1 retained/unattached-logo recovery blocker.

All earlier A1, provider/reminder/delivery, key/worker, billing and final acceptance
blockers remain open. Stop after A2; no A3 or production preflight was started.
Local A2 `npm.cmd run verify` passed TypeScript, lint, 1,889 web tests, 737 database
tests and production build; whitespace checks passed. No acceptance box above is
ticked by these automated results.

## Batch A1 implementation follow-up — 2026-11-25

See [A1 local implementation and exact policies](a1-core-agency-rental-workflows.md).
Guarded **0021** adds team/role/invitation/signatory/branding/location/rental-accounting
behavior and shared delivery/Sheets/billing integration. Earlier SQL and all detailed
acceptance blockers below remain unchanged. A1 source/tests now exist; this does
**not** tick live acceptance boxes, apply SQL or authorize feature activation.

- [ ] Review exact native composition and migration inventory through **0021**,
  including restricted owner/grantor/default-ACL authority, Auth email/MAC/canonical
  boundary, membership hierarchy/last-owner isolation, new asset policies and shared
  signing/delivery/Sheets/billing trigger/function changes.
- [ ] Independently provision the A1 gateway key and matching server secret, keep
  `CONTRATPRO_A1_VERIFIED` disabled until accepted, and preserve all other gates.
- [ ] Accept native multi-session member/role/last-owner/invitation/reactivation/
  payment/branding/worker races and deadlock recovery; PGlite stale-version tests do
  not establish native concurrency or real managed JWT/Storage behavior.
- [ ] Accept real confirmed-email/canonical invitation acceptance, fragment privacy,
  key rotation/reissue behavior, explicit team-email queueing and worker dispatch
  fencing; no real email was sent in local verification.
- [ ] Accept signer selection/actual authorization/revocation, cancellation of pending
  sessions and preservation of completed evidence during identity/member changes.
- [ ] Accept bounded PNG upload/private read/replacement/removal, immutable captured
  branding and storage quotas; review visible retained/unattached originals and A5
  reconciliation. No physical orphan reclamation is claimed.
- [ ] Accept legacy draft location completion, draft-only location edits, exact rental
  accounting/deposit separation/partial payments/reversals after return/cancellation,
  audit rollback and singular same-row Sheets updates without rewriting signed PDFs.
- [ ] Accept all new FR/AR/RTL/mobile/keyboard/error/quota/uncertainty journeys with
  actual managed services in a separately authorized environment.

**A2 now has a local implementation checkpoint**, not a production preflight. Older references
below to A1/missing locations/payment/team/branding are preserved historical blockers
whose code portions are superseded by the A1 report; their live acceptance portions
remain open. Higher-assurance providers, automatic reminder generation, unknown-ID
recovery, key-ring/backup/monitoring/orphan operations, Arabic/DOCX fidelity and all
other original blockers remain. Whole-MVP and production verdict is still **NO-GO**.

## Full MVP scope acceptance addendum — 2026-11-25

**NO-GO remains.** This is a documentation-only scope reconciliation, not a new
deployment preflight or permission to execute any procedure below. The
[source/test matrix](mvp-scope-reconciliation.md), [completion plan](mvp-completion-plan.md)
and [tracker](mvp-tracker.md) distinguish missing implementation from final
integration. No checkbox or historical blocker below was removed or closed.
Historical recommendations for production catalog collection do not supersede the
current BUILD-FIRST priority: **A1 core agency and rental workflows**.

### Implementation prerequisites (queue A; not final integration)

- [ ] A1: implement tenant-safe team lifecycle, managed signer designation/authority,
  reusable agency branding and authoritative pickup/return/rental-payment capture;
  preserve exact money, tenant boundaries, quotas, receipts and immutable histories.
- [ ] Confirm exact required identity fields against the existing CIN/passport/
  licence/nationality schema; do not classify all client identity handling as absent.
- [ ] A2: persist versioned clause customization and allow actual populated document
  preview before rental confirmation; retain supported PDF/DOCX limits and explicit
  unsupported/overflow states. “Draft” post-confirmation artifacts do not satisfy it.
- [ ] A3: implement automatic reminder admission/cancellation, safe unknown-send
  recovery and selected provider-specific signing dispatch, independent verification,
  unchanged provider-byte persistence and completion. Interfaces/fixtures alone fail.
- [ ] A4: implement contract archive search/retrieval, authoritative location/payment
  export, spreadsheet-creation recovery and bounded pacing, and actual selected
  billing-provider UI/adapter/webhook/reconciliation. Resolve required admin-list
  and unattended renewal scope; add fiscal issuance only if validated as required.
- [ ] A5: implement/review operational key provisioning/rotation/draining, generated/
  signing object reconciliation, supervised worker/scheduler artifacts, redacted
  monitoring and complete backup/restore/independent-host/portability artifacts.
- [ ] A6: complete operational dashboard/navigation, FR/AR labels and all required
  journeys/states; implement responsive/accessibility fixes. Existing markup tests
  and historical rental screenshots do not establish whole-app browser acceptance.
- [ ] Each slice has meaningful behavior/fault/tenant tests; each batch passes the
  current local verification command and updates its matrix evidence. No module/test
  count or unverified flag establishes MVP completion.

### Decisions and setup (queues B/C)

- [ ] Record minimal field/payment/team/signer/archive/format/pilot-volume policy;
  selected signing/payment provider capabilities; approved exact commercial catalog,
  recurring/manual payment policy and platform support scope.
- [ ] Obtain signature/consent/authority/privacy/digest/retention and fiscal validation;
  internal billing records must remain distinct from legally required tax invoices.
- [ ] Provision independent keys, explicit capabilities and platform AAL2 identities;
  verified SMTP/Resend, Google consent/APIs/HTTPS, licensed Arabic fonts and isolated
  digest-pinned converter. Configure actual values only through separately authorized work.
- [ ] Provision an independent environment, TLS/backend/worker scheduling, backup/key
  custody and monitoring; do not use the existing production VPS for heavy testing.

### Final integration only after implementation (queue D)

- [ ] D1: reconcile exact current migration inventory, native authority/owner/ACL/RLS/
  history/trigger composition and separately reviewed deploy/rollback artifacts; keep
  guarded 0013–0020 drafts unchanged. Prior catalog evidence remains date/scope bound.
- [ ] D2: accept real managed Auth/JWT/Storage, cross-tenant/capability/revocation,
  native concurrent lifecycle/quota/worker races and audit/partial-failure rollback.
- [ ] D3: accept actual supported templates/converter/fonts/Arabic/bidi PDFs and all
  FR/AR mobile/desktop/keyboard/accessibility journeys with meaningful recovery.
- [ ] D4: accept real selected-provider sandbox/webhook/unknown outcomes, Resend and
  separate-code/manual sharing, automatic reminders/final delivery, Google same-row
  synchronization and hosted worker behavior without duplicate effects.
- [ ] D5: rehearse independent deployment, DB/object/key restore, key overlap/draining,
  orphan safeguards, alerting and recovery without accidentally replaying external effects.
- [ ] D6: complete a bounded pilot, close findings and obtain explicit later launch
  approval. No production readiness or MVP completion is declared by this addendum.

All detailed original blockers below remain in force, including canonical digest,
native SET/ADMIN/default ACL and exact-signature requirements, provider/legal,
storage, retention, dependency diagnostics and operational recovery limitations.

## Additional final acceptance checklist — billing and platform, 2026-11-24

See [billing implementation and exact policy](billing-mvp.md) and the
[consolidated MVP tracker](mvp-tracker.md). Draft 0020 is guarded and unapplied;
0014–0019 remain unapplied and every earlier blocker below remains in force.

- [ ] Approve actual commercial catalog, trial durations, limits, currencies and
  payment provider; configure values without changing historical price versions.
- [ ] Approve next-period upgrades/downgrades, no proration, grace/refund rules,
  one-time trials and completion-related email/storage overages.
- [ ] Review native PG17/managed-role migration compatibility, deployment inventory,
  owner transfer/default ACLs, FORCE RLS, fixed RPC/helper grants and trigger ordering
  across 0013–0020. Never remove guards and apply repository drafts unchanged.
- [ ] Independently provision AAL2 platform identities and subject bindings, explicit
  agency billing capabilities and separate gateway credentials; test no owner
  elevation, agency self-confirmation, direct table access or sensitive-data exposure.
- [ ] Accept native multi-session quota/rollover/subscription/payment races, replay,
  audit-failure rollback, resource baseline, new-agency bootstrap and deadlock behavior.
- [ ] Verify real Supabase Storage metadata sizes, object insertion/update/delete
  sequencing, quota rejection and physical orphan accounting/reconciliation.
- [ ] Accept expired/suspended read/export/rental completion and in-flight signing,
  final evidence and delivery under simultaneous billing changes.
- [ ] Implement the selected provider adapter and validate merchant/account binding,
  raw webhook authentication/freshness, ordering, exact amounts, durable idempotency,
  refund/cancellation and reconciliation of unknown outcomes. No redirect activation.
- [ ] Validate independent manual payment evidence, unique reference handling,
  audited confirmations, refunds, internal downloads and historical profile/price data.
- [ ] Obtain fiscal/legal validation of any required Moroccan invoice fields,
  numbering, VAT/tax treatment and retention; internal JSON records are not tax invoices.
- [ ] Accept FR/AR RTL/mobile/keyboard/browser UX, configured-value display, quota
  messages, failure/uncertainty feedback, platform access and listing bounds.
- [ ] Approve log redaction, key rotation, audit/financial retention, backup/recovery
  and any worker hosting/scheduling. Keep billing/provider gates disabled until accepted.
- [ ] Retain higher-assurance signing/provider/legal, SMTP, worker, reminder,
  unknown-ID, preview/location/payment, Arabic/DOCX, orphan, Sheets, migration and
  cross-tenant gaps. Reconcile original product scope before declaring the MVP done.

## Additional final acceptance checklist — Google Sheets, 2026-11-24

See [Sheets implementation, actual guarantees and remaining gaps](google-sheets-mvp.md).
0019 is guarded and unapplied; all earlier blockers remain in force. Local tests
do not authorize Google consent, migration application or feature activation.

- [ ] Review native PG17 compatibility/inventory for 0013–0019, explicit capability
  grants, forced RLS, definer owners/MAC boundary, source-read grants and no domain
  writes by the worker. Validate with real managed roles and cross-tenant JWTs.
- [ ] Accept actual creation/event atomicity, initial draft enqueue, native concurrent
  source/signing/worker lock order, lease expiry and out-of-order fencing. PGlite
  covers sequential invariants, not real multi-session concurrency or deadlocks.
- [ ] Provision separate Sheets gateway, encryption and worker access secrets;
  implement/accept key-ring rotation/draining, retention and credential revocation.
- [ ] Separately configure Google OAuth consent/client/API settings and FR/AR HTTPS
  callbacks. Review `drive.file` default and explicit wider Sheets-only consent,
  encrypted offline refresh/CAS, rejected/revoked consent and reconnect behavior.
- [ ] Accept callback code/state/query/body log redaction, no browser credentials,
  privacy-minimized personal column choices, literal RAW values and exact money.
- [ ] Verify real metadata/whole-row sorting, copied/deleted rows, changed headers,
  formulas, external edit races, quotas, lost write/results and destination changes.
  Managed columns must be reserved to ContratPro; external CAS is unavailable.
- [ ] Accept exact-fingerprint reconciliation and the refusal to append after an
  unknown outcome. Explicit abandonment must preserve old uncertainty and require
  a physically different destination. Recover unknown spreadsheet creation manually
  by its request-ID title until an operational recovery implementation exists.
- [ ] Configure worker hosting/scheduling and authenticated one-tick endpoint only
  after review. Test ciphertext purge, bounded retries and rate-limit behavior.
- [ ] Accept FR/AR RTL settings, mappings, preview, pause/enable, status/history,
  filtering, per-contract panels and recovery accessibility in a real browser.
- [ ] Preserve all prior signing/legal, SMTP/delivery, reminder/provider-ID recovery,
  preview/location/payment, Arabic/DOCX, key/orphan, migration and tenant blockers.
- [ ] Keep implementation gaps distinct from configuration/deployment/acceptance;
  do not enable Sheets merely because local automated verification passes.

## Additional final acceptance checklist — delivery, 2026-11-24

See [delivery implementation and remaining gaps](delivery-orchestration-mvp.md).
0018 remains guarded and unapplied. Existing blockers below remain in force.

- [ ] Review native PG17 owner/ACL/RLS/default-policy composition, worker role and
  row-lock grants, migration inventory compatibility, concurrent claims/fences and
  source-signing revocation races. PGlite does not prove native concurrency.
- [ ] Independently accept the ADR-003 encrypted/expiring profile and channel policy;
  provision distinct keys, key ID, capability grants, retention and rotation plan.
- [ ] Resolve Resend domain/testing restrictions and Auth SMTP domain verification
  without disabling confirmation. Configure transactional sender/reply-to separately.
- [ ] Accept privacy-safe email tracking/link handling and infrastructure log
  redaction before activating sensitive signing/download messages.
- [ ] Accept authenticated webhook freshness/replay/early callback behavior, provider
  acceptance vs actual delivery, rejection/backoff and uncertain outcome reconciliation.
- [ ] Verify guest final PDF scope, expiry/revocation, private Storage mediation and
  cross-tenant denial. Evidence dossiers must not enter ordinary recipient delivery.
- [ ] Review worker hosting/scheduling and endpoint credentials, secret redaction,
  ciphertext purge operations and real managed-role/JWT/Storage behavior.
- [ ] Accept FR/AR email-client layouts, mobile/manual WhatsApp/copy/report accuracy,
  token-fragment privacy, dashboard recovery and accessibility in a real browser.
- [ ] Preserve higher-assurance/provider-specific completion and legal review,
  preconfirmation previews, location/payment capture, Arabic/DOCX acceptance,
  renderer/signing provisioning and generated-orphan reconciliation.
- [ ] Only after separate integration acceptance consider enabling delivery/Resend
  gates. No activation or live delivery is authorized by local automated tests.

## Additional final acceptance checklist — signing, 2026-11-24

Local implementation and remaining gaps: [signing engine report](signing-engine-mvp.md).
0017 is a guarded draft, not deployment authorization. All earlier blockers below
remain outstanding, including document generation, canonical digest and Sheets.

- [ ] Review 0017 compatibility/inventory, explicit capability grants (no automatic
  owner signing right), immutable bindings, RLS/GUC trust boundary, definer ownership
  and exact function/table/default/storage ACL composition under native PG17.
- [ ] Provision/rotate separate signing gateway key, server configuration and a
  reviewed guest file broker/key. Validate no key, token, code or request-body logs.
- [ ] Verify native multi-session races, replay, invitation renewal/expiry/revocation,
  assigned agency signer, cross-tenant denial, rate limits and database/storage faults.
- [ ] Accept real FR/AR typed-signature layout, font binding, long-name failures,
  mobile accessibility, fragment privacy, private preview/download and evidence export.
- [ ] Review the local method, consent/identity evidence, privacy/retention and
  Moroccan legal classification. Typed appearances and server times are not qualified
  signatures or independently certified time proofs.
- [ ] Complete provider-specific dispatch/authentication/reconciliation and independent
  signature/certificate/time/evidence verification before external completion. Preserve
  signed provider bytes without local overlays. Never downgrade requested assurance.
- [ ] Complete invitation delivery orchestration and **Resend SMTP configuration**;
  prepared manual links are not evidence of delivery.
- [ ] Preserve preconfirmation previews, location/payment capture, renderer key,
  Arabic fonts, real DOCX/layout acceptance and generated/signing-orphan reconciliation.
- [ ] Only after separate integration/acceptance consider `CONTRATPRO_SIGNING_VERIFIED`.

## Additional final acceptance checklist — documents, 2026-11-24

The [local document MVP](contract-documents-mvp.md) adds guarded draft 0016. All
earlier blockers and approvals in this assessment remain in force. No deployment
or feature activation is authorized by its local tests.

- [ ] Review 0016 PG17 ownership, table/function/default ACLs and managed Storage
  policy composition; preserve the earlier 0013 authority/manifest requirements.
- [ ] Bind and rehearse the forward migration/rollback/history process separately.
- [ ] Accept real tenant/owner/staff/revocation JWT behavior, private bucket rules,
  no overwrite/public URLs, issued immutability and authorized downloads.
- [ ] Test native concurrent defaults/version writes, stale rentals, request replay,
  database/storage partial failures and orphan cleanup claim/delete recovery.
- [ ] Supply licensed Arabic-capable fonts and a reviewed, preinstalled converter
  image; verify FR/AR PDF/RTL/layout, DOCX formatting, timeout/resource containment.
- [ ] Separately provision/rotate the server renderer key and matching private DB
  key; verify attestation rejection and no authenticated key/helper access.
- [ ] Perform browser/accessibility/mobile acceptance of upload, mapping, selection,
  preview/download, reissuance, history and meaningful errors.
- [ ] Decide remaining preconfirmation snapshot, location/payment capture and
  generated-orphan/retention scheduling requirements.
- [ ] Preserve the existing canonicalization/digest, real signing/provider/consent/
  evidence binding and Sheets outbox blockers; do not infer signing from PDF hashes.
- [ ] Only after separate acceptance consider `CONTRATPRO_DOCUMENTS_VERIFIED`.

Verdict: **NO-GO / BLOCKED**. No Production deployment is authorized. This report
is documentation, not an executable deployment candidate. All SQL below is catalog-only,
proposed for later separately authorized review, and **NOT EXECUTED**.

## Evidence and reviewed artifacts

- `docs/rental-contracts-phase1a.md`: approved rules, local design and test protocol.
- `supabase/migration-drafts/20261120001300_rental_contracts.sql`: guarded local draft.
- Native 0001-0007: foundation, context, RLS/grants, auth, agency, clients, provisioning.
- 0008 vehicles draft; 0009 v3 Production candidate/helper projection; 0010-0012
  authority/hardening/activation candidates. File location is not deployment evidence.
- `packages/infrastructure/database/integration/rentals/`: runner, safety, diagnostics,
  lifecycle, baseline adapter, scenarios and database-free tests.
- Run #7 `results.json` and prior shutdown observation in
  `C:\Users\lenovo\AppData\Local\Temp\contratpro-rental-pg17-a93e6c52-4b17-4fd8-9c60-2e5b7a814d36`.
- `scripts/verify-agency-writes-0012.sql` is a prepared query, not executed results.
  Repository search found no complete current Production catalog export for these
  rental deployment dependencies. Unrelated identity acceptance evidence was not used
  as rental privilege proof or opened for personal data.

VERIFIED local evidence: run #7 status PASS, 20/20 scenarios, no cleanup failures,
shutdown stopped; source SHA-256
`9167005379e363fbad3c83fe769db43ca3d17739574774fc8ca00d141e16efac`.
The matching original draft retains unconditional RAISE and final ROLLBACK. Its
in-memory test copy committed; the original did not deploy anywhere.
Preflight recorded 51 database-free passes; no tests or SQL were rerun for this audit.

The run exercised tenant-safe references, active role-less Staff and Owner, revoked/
disabled/suspended/anonymous denial, FORCE RLS for a non-bypass table owner, pricing,
creation/confirmation replay, stale versions, bigint numbering, actual lock contention,
overlap rejection, extensions, explicit return, overdue handover blocking, immutability,
audit failure rollback and competing reservation release. It did not test every possible
interleaving or establish Production compatibility.

## Production privilege/operation matrix

Expected executor is the verified Supabase migration session `postgres`, with original
role restored before commit. This is a proposed executor identity, NOT proof of authority.

| Operation in draft/future release | Required authority | Evidence and missing check | Failure consequence |
|---|---|---|---|
| CREATE SCHEMA | database CREATE | Not in draft: identity/tenancy/app_private/public already exist; do not recreate | stop if dependencies absent |
| CREATE ROLE rental_writer | CREATEROLE or superuser; no privileged attributes requested | LOCALLY TESTED ONLY under superuser; Production flag/self-grant behavior unknown | role creation/ownership path fails |
| CREATE TABLE/index | CREATE in target schema; REFERENCES on FK target columns; table owner for indexes | composite keys accepted; schema/REFERENCES authority NOT VERIFIED | atomic DDL error |
| CREATE FUNCTION | schema CREATE, type/language USAGE | local SQL/plpgsql succeed; Production grants/type access unknown | DDL error |
| CREATE TRIGGER | table ownership or TRIGGER privilege plus function EXECUTE | new tables expected postgres-owned; local only | immutable/guard installation fails |
| ALTER TABLE ENABLE/FORCE RLS | table ownership | new objects locally postgres-owned; Production executor/schema ownership unverified | stop; never omit FORCE |
| CREATE POLICY on dependencies | table owner (or superuser) | existing Production FORCE RLS accepted; owner/owner SET path still needs evidence | stop; grants alone do not confer policy authority |
| GRANT/REVOKE schema/table/column/function | owner or grant option | current helper/dependency owners and ACLs NOT VERIFIED for this release | error or insufficient effective capability |
| Temporary schema CREATE to writer | owner/grant option | proposed only for ownership transfer; inherited/PUBLIC CREATE must be considered | transfer fails or CREATE survives unexpectedly |
| ALTER FUNCTION OWNER | function owner; SET capability to new owner; new owner CREATE in schema | **BLOCKED**: draft grants schema CREATE but supplies no verified SET membership path | non-superuser transfer fails |
| GRANT EXECUTE after transfer | function owner/grant option or authorized owner role switch | **BLOCKED**: broad local superuser loop masks post-transfer authority requirement | grant/revoke can fail or be ineffective; warnings must not count as success |
| Temporary role membership | ADMIN authority on target and permitted grantor; explicit SET/INHERIT/ADMIN options | 0010-0012 illustrate verified paths for OTHER writers, not this new role | privilege escalation or failure unless exact restoration proved |
| SECURITY DEFINER invocation | authenticated EXECUTE; restricted owner has necessary schema/column/helper privileges and matching RLS | runtime behavior LOCALLY TESTED ONLY; no login/BYPASSRLS/inheritance for owner | 42501 or capability disclosure if ACLs drift |
| Function settings | function ownership to create/change pinned search_path and row_security | local functions pin pg_catalog,pg_temp and on; exact final definitions/ACLs must be asserted | stop; do not widen search path |
| Audit append | five-column INSERT plus applicable INSERT policy; active membership composite FK | new writer-specific policy is in draft, not an existing audit RPC call | whole mutation must roll back on audit error |
| ALTER DEFAULT PRIVILEGES | default-privilege owner's authority or membership | **not present and not proposed**; inspect defaults instead of changing unrelated global defaults | inherited unexpected grants can remain |
| Migration history INSERT + lock | history schema USAGE, table INSERT and lock privilege (SHARE ROW EXCLUSIVE requires suitable write privilege); validated history | **absent from draft**, NOT VERIFIED | no authorized atomic deployment record |

PG17 requirements: function ownership transfer requires SET to the new owner and its
schema CREATE privilege. ADMIN, SET and INHERIT are distinct. A non-superuser role
creator must not assume role creation supplies the required SET path. Provider-issued
grants must not be overwritten or revoked indiscriminately. See official references below.

## Schema dependency matrix

| Dependency | Classification | Scope of evidence / remaining work |
|---|---|---|
| clients/vehicles/memberships/roles UNIQUE(agency_id,id) | VERIFIED FROM EVIDENCE | supplied Production validated nondeferrable keys; revalidate freshness in release gate |
| active/revoked memberships, active canonical identity/agency | VERIFIED FROM EVIDENCE | supplied state/helper semantics; current exact definitions/ACLs still NOT VERIFIED |
| identity.supabase_users one-to-one mapping | VERIFIED FROM EVIDENCE | supplied mapping semantics; fixture JWT adapter is not Production gateway |
| audit columns and composite membership FK | VERIFIED FROM EVIDENCE | supplied catalog evidence; current owner/trigger/policy changes require reconciliation |
| dependency FORCE RLS | VERIFIED FROM EVIDENCE | supplied evidence; final policies and effective grants need release snapshot |
| new contract tables, checks, triggers and RPCs | LOCALLY TESTED ONLY | run #7, 20 synthetic scenarios; not deployed |
| canonical_auth_user + receipt_auth_uid owner/grants | NOT VERIFIED | dependency definitions/ACL freshness required for new writer grants |
| legacy active_membership_id/tenant_is_active | VERIFIED FROM LOCAL SOURCE | GUC-based trusted SQL executor helpers; rental authorization does NOT depend on them |
| active Staff/Owner rental authority | LOCALLY TESTED ONLY | direct active membership, no mandatory Staff role or client/vehicle privilege changes |
| new role/schema/policy/function/index name absence | NOT VERIFIED | prior inventory lacked rentals; future current collision check still required |
| objects outside inspected application schemas | NOT VERIFIED | independent business workflow disclosure needed; different schemas cannot collide with qualified names but can duplicate business ownership |
| schema/column grants, default ACLs and PUBLIC privileges | NOT VERIFIED | critical to helper privacy, direct writes, CREATE and grant options |
| new writer creation/ownership/grantor path | BLOCKED | superuser run cannot prove Supabase postgres authority |
| dependency order 0001-0012 history | VERIFIED FROM EVIDENCE | supplied 13 versions; version numbers do not prove exact deployed SQL |
| SQL/plpgsql and uuid generation | LOCALLY TESTED ONLY | PG17.11 success; verify managed languages/type access |
| btree_gist | VERIFIED FROM EVIDENCE: available, not installed | NOT REQUIRED; advisory locks/partial unique index used; install nothing |

## Transaction and security risks — concrete blockers

1. The current file always aborts and ends ROLLBACK. Keep it unchanged. A separately
   reviewed future release artifact needs one explicit atomic transaction and history
   insert after all final assertions. No executable release script is created here.
2. No migration-history serialization, dependency/history guard, object preconditions,
   lock_timeout or statement_timeout exists in the draft. A release must serialize
   cooperating migration executors (history lock and/or documented advisory lock),
   reject unexpected history/collisions and define bounded lock acquisition. Advisory
   locks alone cannot constrain non-cooperating DDL executors.
3. Prefix-based owner loop matches every rental_* helper and contratpro_rental_* public
   function, not an exact signature list. It can modify a pre-existing matching object.
   Future candidate must use exact reviewed signatures, absence/baseline checks and
   explicit final ACL/owner assertions. The nine public RPCs must remain the only
   authenticated entrypoints, including complete's explicit boolean argument.
4. REVOKE lists PUBLIC/anon/authenticated/service_role, but custom default ACL grantees
   are not enumerated/checked. Thus no proof of closed final ACLs exists for Production.
   Snapshot defaults and assert all actual grants, including grant options, columns and
   effective PUBLIC/inherited CREATE. Do not indiscriminately change global defaults.
5. New dependency policies/grants are genuine new capabilities for the isolated rental
   owner; they do not replace existing module policies. Require owner authority and
   exact before/after preservation of unrelated ACLs/policies/role memberships.
6. Membership/agency checks use transactional observed state. Concurrent revocation or
   suspension does not promise forced cancellation of an already running transaction.
   This linearization policy and source-client archiving race need explicit acceptance
   or further local tests/locking design before claiming stronger guarantees.
7. Post-commit uncertain response: creation/confirmation have receipts; other operations
   require detail/version reconciliation. Do not blindly replay mutation operations.
8. Migration execution is intentionally not rerunnable: CREATE ROLE/TABLE/FUNCTION and
   policy names collide on a second run. Do not add blanket IF NOT EXISTS to hide drift.
   A future history gate must identify already-applied success versus partial/manual
   state. All DDL/role/grant/history work must roll back on failure; no client-side
   continuation after SQL error or ignored grant warning is acceptable.
9. Technical assumptions still need acceptance: immutable draft references, handover
   timing bounds, explicit return acknowledgement (not independent return evidence),
   duration/money limits and handling already-confirmed overdue operational conflicts.
   Five approved business decisions remain unchanged; no new business defaults added.

## Harness limitations

Bootstrap postgres is SUPERUSER. Tests then SET LOCAL ROLE authenticated, with a
non-bypass definer owner. This exercises actual PostgreSQL permissions/RLS but does
not rehearse non-superuser DDL, owner transfer or grantor authority. Synthetic auth.uid
reads a harness GUC; no JWT signature, PostgREST role switch, real browser request,
auth refresh, network security or gateway claim provenance is validated.
The authenticator adapter is NOLOGIN/no-memberships and service_role is non-bypass,
intentionally unlike full Supabase roles. Only 0001-0006, 0008 and a 0009 helper
projection are applied; full 0007 and 0009-0012 security/ACL combinations are not run.
FORCE RLS owner experiment is rolled back. Failure injection uses trusted fixture admin.
Concurrency cases use real lock barriers but are a finite set, not exhaustive proof.
The runner checks version/address/port/data directory/database/session plus filesystem
ownership, but not cluster system identifier. This is a harness identity limitation,
not evidence of wrong Production target. A real deployment needs independent target
binding and an approved backup/rollback/recovery procedure.

## Proposed read-only catalog queries — NOT EXECUTED

Use only after separate read-only Production authorization and independent project
binding. These read metadata, not business records. Any permission error, missing row
or unexplained difference is NOT PASS. If a query errors, explicitly ROLLBACK.

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL statement_timeout='10s';

-- Executor identity/capability; no passwords or role-secret catalogs.
SELECT session_user,current_user,current_setting('server_version_num') AS version,
       current_setting('createrole_self_grant',true) AS self_grant_behavior,
       rolsuper,rolcreaterole,rolinherit,rolbypassrls
FROM pg_roles WHERE rolname=current_user;
SELECT lanname,has_language_privilege(current_user,oid,'USAGE') AS executor_usage
FROM pg_language WHERE lanname IN('sql','plpgsql');
SELECT nspname,pg_get_userbyid(nspowner) AS owner,nspacl::text,
       pg_has_role(current_user,nspowner,'SET') AS can_set_schema_owner,
       has_schema_privilege(current_user,oid,'USAGE') AS executor_usage,
       has_schema_privilege(current_user,oid,'CREATE') AS executor_create
FROM pg_namespace WHERE nspname IN('identity','tenancy','app_private','public','supabase_migrations');

-- Existing dependency ownership, ACL and FK authority, including columns.
SELECT c.oid::regclass::text AS object_name,pg_get_userbyid(c.relowner) AS owner,
       pg_has_role(current_user,c.relowner,'SET') AS can_set_table_owner,
       c.relrowsecurity,c.relforcerowsecurity,c.relacl::text,
       a.attname,a.attacl::text,
       has_column_privilege(current_user,c.oid,a.attnum,'REFERENCES') AS can_reference
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
WHERE (n.nspname='identity' AND c.relname IN('users','supabase_users'))
   OR (n.nspname='tenancy' AND c.relname IN('agencies','memberships','roles',
     'membership_roles','role_permissions','clients','vehicles','audit_events'))
ORDER BY object_name,a.attnum;
SELECT conrelid::regclass::text AS object_name,conname,convalidated,condeferrable,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid IN(
 'tenancy.clients'::regclass,'tenancy.vehicles'::regclass,
 'tenancy.memberships'::regclass,'tenancy.roles'::regclass,'tenancy.audit_events'::regclass)
ORDER BY object_name,conname;

-- Critical helper bodies/owners/ACLs. to_regprocedure exposes absence safely.
WITH required(signature) AS (VALUES
 ('app_private.canonical_auth_user()'),('app_private.receipt_auth_uid()'))
SELECT r.signature,p.oid IS NOT NULL AS present,pg_get_userbyid(p.proowner) AS owner,
       p.prosecdef,p.proconfig,p.proacl::text,pg_get_functiondef(p.oid) AS definition
FROM required r LEFT JOIN pg_proc p ON p.oid=to_regprocedure(r.signature);

-- Effective default-grant risk: review global AND per-schema defaults and grantors.
SELECT pg_get_userbyid(d.defaclrole) AS creator,
       CASE WHEN d.defaclnamespace=0 THEN '<global>' ELSE n.nspname END AS scope,
       d.defaclobjtype,d.defaclacl::text
FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
ORDER BY creator,scope,d.defaclobjtype;

-- Roles and all membership options/grantors for the proposed execution boundary.
SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,rolinherit,rolcreaterole
FROM pg_roles WHERE rolname IN('postgres','anon','authenticated','authenticator',
 'service_role','contratpro_runtime','contratpro_platform_runtime','contratpro_rental_writer');
SELECT pg_get_userbyid(m.roleid) AS granted_role,pg_get_userbyid(m.member) AS member,
       pg_get_userbyid(m.grantor) AS grantor,m.admin_option,m.inherit_option,m.set_option
FROM pg_auth_members m WHERE m.member IN(SELECT oid FROM pg_roles WHERE rolname IN(
 'postgres','anon','authenticated','authenticator','service_role','contratpro_runtime',
 'contratpro_platform_runtime','contratpro_rental_writer'))
 OR m.roleid=to_regrole('contratpro_rental_writer')
ORDER BY granted_role,member,grantor;

-- Snapshot dependency policies and triggers, including audit restrictions.
SELECT p.polrelid::regclass::text AS object_name,p.polname,p.polcmd,p.polpermissive,
       ARRAY(SELECT CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r)::text END
             FROM unnest(p.polroles) r) AS roles,
       pg_get_expr(p.polqual,p.polrelid) AS using_expression,
       pg_get_expr(p.polwithcheck,p.polrelid) AS check_expression
FROM pg_policy p WHERE p.polrelid IN(SELECT c.oid FROM pg_class c JOIN pg_namespace n
 ON n.oid=c.relnamespace WHERE n.nspname IN('identity','tenancy'))
ORDER BY object_name,p.polname;
SELECT tgrelid::regclass::text AS object_name,tgname,tgenabled,pg_get_triggerdef(oid)
FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN(
 'tenancy.audit_events'::regclass,'tenancy.clients'::regclass,'tenancy.vehicles'::regclass);

-- Collision discovery: any result needs exact reconciliation, not automatic reuse.
SELECT n.nspname,c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN('tenancy','app_private','public') AND c.relname LIKE 'rental%';
SELECT p.oid::regprocedure::text AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE (n.nspname='app_private' AND p.proname LIKE 'rental%')
   OR (n.nspname='public' AND p.proname LIKE 'contratpro_rental%');

-- History and authority, not a migration replay. Proposed 0013 is not reserved here.
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
SELECT has_table_privilege(current_user,'supabase_migrations.schema_migrations','INSERT') AS history_insert,
       has_table_privilege(current_user,'supabase_migrations.schema_migrations','UPDATE,DELETE,TRUNCATE') AS history_lock_write_capability;
ROLLBACK;
```

These queries cannot prove a hypothetical new role's future owner-transfer authority
without a reviewed creation/membership plan. They also cannot cryptographically bind
the target project or prove runtime JWT/RLS behavior. No SQL writes are authorized.

## Required approvals and go/no-go

NO-GO until all are satisfied:
1. Separately authorize metadata collection; review actual executor/schema/table/helper
   ownership, effective grants/defaults, collision absence and exact dependency history.
2. Approve explicit target binding, recovery/backup, release window and bounded locking.
3. Prepare/review a separate NON-SUPERUSER execution-authority rehearsal and exact
   temporary role-membership restoration, including grantor/options and post-transfer
   grants/revokes. This audit does not authorize that execution or generate its script.
4. Prepare a separately reviewed release candidate with exact signature/ACL assertions,
   one transaction/history insert, concurrency guard and all pre/postconditions. Keep
   the original local draft protected. No blanket security revokes on unrelated roles.
5. Post-deployment catalog verification must check exact owner/settings/body/signature
   and EXECUTE allowlist for all nine public RPCs and private helpers; FORCE RLS and
   tenant FKs; counter/receipt/immutability triggers; no direct authenticated writes;
   no retained temporary role/schema CREATE authority; exact preservation of unrelated
   memberships/grants/policies; one history record. Catalogs alone do not prove runtime.
6. Obtain explicit deployment approval. Separately authorize bounded restricted-user
   runtime verification and application integration/activation; those are not this audit.

Recommended next safe step: review this report and separately authorize only the
targeted read-only metadata collection. Local 20/20 PASS is strong behavioral evidence,
not permission or proof to deploy. No Production or local PostgreSQL was accessed.

## Official PostgreSQL 17 references

- https://www.postgresql.org/docs/17/sql-alterfunction.html — ownership/SET/schema authority.
- https://www.postgresql.org/docs/17/sql-createrole.html — CREATEROLE and role attributes.
- https://www.postgresql.org/docs/17/role-membership.html — SET/INHERIT/ADMIN options.
- https://www.postgresql.org/docs/17/sql-createpolicy.html — policy and table-owner boundary.

## A5 local operational follow-up — 2026-11-26

See [A5 report](a5-operational-readiness.md) for the requirement/source/test matrix
and [operational runbooks](operations/backup-restore.md). Added executable bounded
worker orchestration, database-owned schedules, historical key compatibility and
CAS rotation, conservative inventory/quarantine cleanup, backup/isolated restore
tools, restricted monitoring/admin and future independent-host artifacts. Guarded
0025 is unapplied; no live infrastructure, providers, objects or configuration
were activated. No commit/push/deploy or A6 work occurred.

Production readiness remains unaccepted. Native role/RLS/lock/migration and
managed Auth/Storage validation, real encrypted restore, container/private-TLS
hosting, resource/restart exercises, live provider reconciliation, Arabic font and
document fidelity, native DOCX conversion, FR/AR browser/cross-tenant acceptance
and measured recovery objectives remain open. Signature/fiscal legal review,
commercial catalog decisions, Resend domain verification and Google OAuth setup
remain open. A3 concrete signature transport/identity/trust/certificate/hosted/raw
evidence and A4 concrete payment/merchant/checkout/refund/cancellation/recurrence
integration remain unfinished implementation, not configuration-only blockers.

Final A5 local verification PASS: TypeScript/lint, 1,913 web tests, 737 database
tests, 8 operational-tool tests, standalone production build and whitespace. These
satisfy the documented provider-independent local implementation checkpoint only.
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
Verification: 1,987 web tests, 739 database tests and 8 operational tests pass; TypeScript, zero-warning ESLint and isolated production build pass. Sixteen public FR/AR HTTP checks return 200. Review artifacts unchanged; temporary server stopped. Browser acceptance remains pending.
## B1 owner scope decision — 2026-11-27 (current authority)

The initial MVP uses ContratPro's internal **simple electronic signature**. External higher-assurance integrations, including SAFY and DamaneSign, are **optional and deferred**, not an initial-MVP implementation or provider-selection blocker. Earlier B3/A3 statements requiring a selected signature provider are historical and superseded for this scope. Payment-provider, email configuration and other independent requirements are unaffected. A contract requiring higher assurance is still refused rather than downgraded.

B1 adds a bounded optional drawing to the typed-name capture and authoritative hash-bound event, plus an appended final-PDF execution record with UTC signing dates and unique references. Existing sequential authorization, invitation/code verification, immutable evidence, durable finalization, delivery/recovery/archive and same-row Sheets behavior are reused. Local draft **0028** is guarded and unapplied. See [B1 report](b1-internal-signature-completion.md) and [manual acceptance](internal-signature-manual-acceptance.md).

Legal qualification, approved consent/privacy/retention, native/managed backend and actual delivery acceptance remain launch requirements. No legal approval, qualified/certified signature, automatic handwritten equivalence or complete MVP readiness is claimed. No feature activation, live connection, remote migration, installation, commit, push or deployment.
Local verification results and their limits are recorded in the B1 report.
## C1 owner decision and technical integration — 2026-11-27

Current decision labels: **B2 payments/provider**, **B3 commercial plans/pricing/limits** and **B4 final legal documents/validation** are deferred, remain in MVP scope and must be revisited before commercial launch. Existing billing and legal safeguards are retained. B1 internal simple signature is locally implemented; external signature providers are optional deferred extensions. Earlier queue labels are historical where they differ.

C1 reuses the actual A1/A3/A4/A5 email, Google Sheets and worker architecture. It adds early OAuth/key-ring configuration validation, refusal of credential-bearing redirects, bilingual technical Auth templates, isolated test-only legal fixture support and targeted configuration/orchestration regression coverage. Production signup still fails closed without approved real legal documents; no runtime route accepts synthetic identity or legal fallback. No new database draft was necessary after 0028.

See [C1 implementation report](c1-technical-integration-completion.md), [configuration matrix](c1-environment-configuration-matrix.md) and [C2/live acceptance sequence](c1-live-integration-acceptance.md). Native/managed backend, actual SMTP/Resend/Google delivery, infrastructure/worker and owner visual acceptance remain separate. The known unchanged Unicode scalar test can time out under concurrent build/SQL load; retain that observation and run the full web suite separately.

A6 remains OPEN; the full MVP is not production-ready. No real environment read/change, live provider access, production Hostinger/Coolify testing, migration application, purchase, gate activation, dependency installation, payment implementation, final legal drafting, commit, push or deployment occurred in C1.
## C2 infrastructure/worker checkpoint — 2026-11-27

C2 prepares independent production app/HTTP-worker entries, explicit deployment stages, static/public asset packaging, worker health snapshots and safe failure/backoff, private networking and deployment templates. Existing A5 durable schedules, least-privilege gateway, retry/lease/uncertainty protections, key rotation and backup/restore holds are reused. No schema/history/guarded draft through 0028 was changed; no new migration was needed.

See [C2 readiness](c2-infrastructure-worker-readiness.md), [deployment configuration](c2-deployment-configuration.md), [resource estimates](c2-infrastructure-requirements.md) and [D1 prerequisites](d1-migration-compatibility-prerequisites.md). Container/image/proxy/TLS behavior and native migration compatibility remain unverified. The optional DOCX host-container launcher needs separately approved isolated execution before use in the hardened app; no Docker socket is supplied.

B2 payments, B3 plans/pricing, B4 final legal validation, complete rental-workflow manual acceptance and D5 actual backup/restore acceptance remain deferred and retained. A6 remains OPEN. No Docker creation/build, dependency install, service activation, real secrets/services, infrastructure provisioning, existing production Hostinger/Coolify VPS use, backup/restore, remote SQL, commit, push or deployment. The Unicode parallel-load observation is retained; web regression is run separately from heavy build/SQL checks.
