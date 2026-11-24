# ContratPro MVP tracker

Updated 2026-11-24. **The complete MVP is not finished or accepted.** This tracker
consolidates the existing module reports; earlier evidence and blockers are retained
in those reports and the [final acceptance checklist](rental-contracts-production-readiness.md).
Local implementation is distinct from configuration, commercial approval, deployment
and live acceptance. Existing `.env.local` values were not changed by billing work.

| Module | Local implementation evidence | Integration/acceptance status |
| --- | --- | --- |
| Authentication and agency authorization | Existing canonical mapping, verified Auth identity, role/capability boundaries, agency workflows | Existing recorded evidence applies only to its original scope; billing/platform acceptance is separate |
| Clients, drivers and vehicles | Existing client and vehicle modules; active resource/lifecycle rules | Preserve previous cross-tenant and vehicle acceptance requirements |
| Rentals | [Rental MVP](rental-contracts-mvp.md), immutable versions, lifecycle and receipts | 0013–0015 drafts and current deployment inventory require reconciliation |
| Templates and generated documents | [Document MVP](contract-documents-mvp.md), private storage and versions | 0016 unapplied; fonts, conversion, layout, storage and orphan acceptance open |
| Signatures and evidence | [Signing MVP](signing-engine-mvp.md), local signing and evidence | 0017 unapplied; higher assurance/provider/legal acceptance open |
| Email and manual WhatsApp | [Delivery MVP](delivery-orchestration-mvp.md), durable jobs and delivery states | 0018 unapplied; SMTP, worker, reminder and unknown-ID gaps retained |
| Google Sheets | [Sheets MVP](google-sheets-mvp.md), OAuth/worker/export/reconciliation | 0019 unapplied; Google configuration, worker hosting and acceptance open |
| Subscriptions, billing and platform | [Billing MVP](billing-mvp.md), versioned catalog, lifecycle, usage, manual review, provider boundary and FR/AR dashboards | 0020 guarded/unapplied; gate unset, no commercial catalog/provider configured, no live acceptance |

## Billing verification

Local commands use the installed Node/npm toolchain via lean-ctx. No live browser,
remote SQL, Supabase acceptance, deployment preflight or payment processing was run.

- `npm run verify`: passed workspace TypeScript, zero-warning lint, **1,860 web
  tests in 88 files**, **736 database tests in 27 files**, and production build.
- After the final malformed-request test, the dedicated billing suite passed
  **28 tests in five files** (one additional test beyond that full-suite run).
- The final embedded billing and document/signing/delivery/Sheets composition
  scenarios passed again after scope, renewal-activation and timezone-bucket checks.
  They exercise actual SQL in disposable PGlite, not a remote database.
- Final workspace lint rerun passed with zero warnings. The production build also
  type-checked the final request-handler code.
- `git diff --check` passed; explicit checks of all 24 new/expanded billing source,
  route, test, SQL and report files found no whitespace errors or merge markers.

## Remaining implementation gaps

These are implementation work, not reasons to claim configuration or acceptance
has completed:

- Higher-assurance signature provider integration; provider-specific verification
  and completion; unknown-provider-ID recovery.
- Automatic reminder generation; operational key rotation/draining and provisioning
  tooling.
- Preconfirmation document previews; authoritative location and rental payment
  capture (distinct from SaaS subscription billing).
- Generated-document/signing-object orphan reconciliation.
- Remaining Sheets gaps: unknown spreadsheet-creation recovery, account-profile
  display/Drive Picker where desired, high-volume scan/pacing optimization, and
  location/payment export after authoritative domain capture.
- Billing provider-specific adapter/recovery after selection; background billing
  scheduling if required; platform pagination beyond bounded MVP lists; tax-invoice
  generation only after validated fiscal requirements; retention/rotation automation.
- Reconcile the original product scope against all local modules and close every
  required implementation gap before declaring the overall MVP complete.

## Commercial and legal decisions

- Final commercial pricing, plan descriptions, currencies, trial durations,
  entitlements, package limits and commercial payment provider selection.
- Actual Morocco/MAD payment capabilities, grace/refund policy, next-period change
  policy, no-proration treatment and completion-related quota overages.
- Legal validation of electronic signatures and their assurance level.
- Fiscal validation: invoice issuer/numbering/mandatory fields, Moroccan tax rates
  and VAT treatment if applicable, invoicing/retention requirements and legal review.
  Current downloadable billing records are internal documents only.

## Configuration, deployment and acceptance blockers

- Resend SMTP domain verification; delivery and Sheets worker hosting/scheduling.
- Secure independent key provisioning and rotation; separately provisioned platform
  administrator identities/MFA and explicit billing capabilities. No implicit owner
  elevation and no unverified feature activation.
- Migration compatibility, native ownership/ACL/RLS rehearsal and actual deployment
  inventory for all prior migrations/candidates and guarded 0013–0020 drafts.
- Cross-tenant acceptance, genuine concurrent PostgreSQL races and managed Auth/JWT,
  storage size/finalization, role and schema-cache acceptance.
- Google OAuth consent/API setup, HTTPS callbacks and real export/reconciliation
  acceptance, with previous Sheets limitations preserved.
- Licensed Arabic fonts, isolated DOCX conversion and FR/AR PDF/browser/RTL/mobile/
  keyboard/accessibility acceptance.
- Provider sandbox/webhook/merchant and unknown-outcome acceptance after explicit
  provider selection. No real payments, bank access or paid services authorized.
- Reviewed privacy, audit retention, log redaction, backups and operational recovery.

Historical module reports remain the source for their detailed limitations. This
tracker adds billing evidence without treating earlier deferred work as resolved.
