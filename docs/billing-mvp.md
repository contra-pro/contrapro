# Subscriptions, billing and platform administration — local MVP

Implemented locally on 2026-11-24. This report is implementation evidence, not
permission to apply SQL, activate a provider, enable a gate, or deploy.

## Existing functionality reused

The repository contained no executable subscription catalog, usage engine, payment
adapter, or billing tables. It did contain independent `platform.admin_identities`,
canonical identity mapping, active agency memberships, explicit role permissions,
fixed Supabase RPCs, forced RLS, immutable rental receipts, private document storage,
and signing/delivery/Sheets state machines. Billing extends these boundaries rather
than creating a second tenant or authentication model. Agency membership and each
business module's existing authorization remain mandatory.

## Catalog and lifecycle

`20261124002000_billing.sql` adds one durable, versioned catalog. A price version
contains an identifier, display name, FR/AR descriptions, month/year interval,
nonnegative bigint minor-unit price, three-letter currency, optional trial days,
features and limits. Missing/null limits mean unlimited; absent features mean denied.
Limits cross JSON as decimal integer strings. `trial_days = null` means ineligible.
No real offer, price, currency choice, trial duration or package limit is seeded.
All numerical catalog examples in tests are explicitly synthetic fixtures.

Versions are monotonic per plan key and immutable except their availability flag.
Archiving stops new selection and retains old subscription/payment references.
Historical prices, periods, billing profile snapshots, verification identity and
invoice references cannot be rewritten. Catalog changes require an independent
platform principal, AAL2, a request ID and a reason.

Agency subscriptions support trialing, active, pending payment, past due, grace
period, suspended, cancelled and expired states. Ordinary transitions are explicitly
enumerated in SQL and TypeScript; none can transition to active. Paid activation
comes only from a confirmed payment bound to the subscription revision and exact
catalog price. Trials can be claimed once per agency, using only a configured
trial duration. Paid-period and trial expiry are checked on the server regardless
of whether a background job has run. State refresh is lazy on billing reads and
new entitlement checks; an authorized platform refresh is also available.

Renewal and plan changes reserve the next period when a current period remains.
Both upgrades and downgrades use this policy; no proration or immediate unverified
upgrade is invented. Future confirmed payments do not truncate a paid period or
trial. Activation at the period boundary changes the period bucket once. Changes
use a subscription revision and durable request receipts; duplicate bodies return
the saved result and changed bodies with the same key conflict. Cancellation
preserves current authorized access until the recorded end and invalidates pending
activation. Suspension is also an independent reversible access hold: lifting it
does not override an expired/cancelled underlying subscription or fabricate payment.
Confirmed future renewals have a separate one-time activation state: a temporary
hold does not lose their verified evidence, and another plan request cannot silently
replace a paid scheduled renewal. Explicit cancellation or refund is required first.
All subscription snapshots and privileged changes append audit records.

## Entitlement policy and accounting

The database, not button visibility, enforces new writes. All billing tenant rows
use FORCE RLS with internal agency scopes. The NOLOGIN/NOBYPASSRLS billing owner
cannot be assumed by an application role. Private helpers are not callable by
browsers. Authenticated agency RPCs first check the canonical active membership
and explicit `billing.view` or `billing.manage`; owners receive neither implicitly.
The only pre-subscription write exception is one initial agency member, so ordinary
agency creation can precede plan selection. That member counts against later plans.

| Metric | Exact accounting event | Bucket and release policy |
| --- | --- | --- |
| Contracts | Successful authoritative contract row insert | Period; stable contract ID prevents retry/status double counting; cancellation does not refund a creation |
| Vehicles | Active vehicle insert/reactivation | Current active count; archival/removal releases; edits require feature access except lifecycle status/mileage updates |
| Team | Active membership insert/reactivation | Current active count; deactivation/removal releases; includes initial owner |
| Templates | Unarchived logical template insert/reactivation | Current count; archive releases; each new template version also requires feature access |
| Documents | Persisted generated artifact, keyed by generation request | Period; failed rendering consumes no document unit; original/generation admission checks entitlement before publication |
| Signatures | Successful signing-session admission | Period; one per session, not per party or retry; later failed/declined/expired sessions remain counted admissions |
| Email | Durable email job reservation; consume on accepted/delivered/bounced | Period of reservation; known terminal unsent failure/cancellation releases; retries reuse job ID; uncertain outcomes retain reservation |
| Storage | Actual private Storage object metadata row with verified integer `size` | Current bytes; deletion releases; existing object baseline is imported; original/upload/generated orphans remain counted while stored |
| Sheets | Connection/enable/destination write | Feature gate, no invented count quota; existing configured export/reconciliation may continue |

Subscription row locks serialize reservation, consumption, release and period
activation. Counter rows and idempotency records are in the same transaction as
domain inserts. SQL failure rolls back both. Money and counters use integers;
JSON transport preserves monetary values as strings. Period reservations remain
in their original bucket across rollover. Current resource counts never reset
on renewal, plan change or cancellation.
Period keys use UTC epoch microseconds, so a session timezone cannot reset a quota;
month/year arithmetic uses UTC calendar boundaries explicitly.

Reads, saved document downloads, customer records, rental lifecycle completion,
archival/deprovisioning and existing signing evidence remain available under the
original tenant/role rules. Expiry never deletes customer data. Document generation
is a new metered operation; existing artifacts remain downloadable.

Signing admission freezes the plan's completion allowances. Already admitted
sessions and legacy sessions can finish signatures, evidence, final storage, and
authorized completion emails after a billing change. These completion emails and
signing bytes are recorded even if they exceed a later quota. A plan that never
included email cannot gain it merely by admitting a new signing session. Legacy
admissions retain the pre-billing completion policy. This bounded contract-workflow
exception is deliberate and means hard storage/email limits are admission controls,
not a promise to prevent every completion-related overage.

Actual guarantees: these are PostgreSQL transaction/row-lock routines exercised
in PGlite, including concurrent queued requests, rollback, period rollover and
real rental/vehicle RPC replay. PGlite serializes one embedded connection. It
does not establish native multi-session lock behavior, managed Storage insertion
semantics, deadlock freedom or production RLS compatibility. Physical storage may
contain an upload whose subsequent artifact publication fails; storage bytes remain
counted and the existing generated-orphan reconciliation gap remains open.

## Payments and billing records

The provider-neutral `BillingProvider` supports checkout, renew, cancel, refund,
authenticated raw webhooks and verified reconciliation. `BillingPayments` accepts
an injected adapter and gateway. No commercial adapter is installed. The public
webhook route currently returns unavailable and does not interpret a browser return
URL as payment evidence. No real payment requests are sent by this implementation.

The SQL gateway authenticates server-generated envelopes with a separate HMAC key.
Provider events bind provider, internal payment, external payment ID, exact amount,
currency, event ID and monotonic sequence. Duplicate bytes are idempotent; changed
replays conflict. Older events are retained as stale and cannot reverse newer state.
Refunded/rejected/cancelled payments cannot be resurrected by a late paid event.
Mismatches and stale-revision confirmations are durable review outcomes, visible
to platform administrators. Raw provider credentials and card/bank access are absent.

Only the transaction that first prepares a provider operation may send it. Duplicate
preparations cannot send again. Lost responses and crashes require reconciliation,
including provider lookup by the stable operation ID if a provider supports it.
Unknown-provider-ID recovery is not claimed. Provider adapters must additionally
use durable provider idempotency and validate merchant/account binding and signature
freshness in their own authentication protocol. A provider without usable ordering
must reconcile authoritative state before emitting a sequenced normalized event.

Manual requests take their amount, currency and period from the catalog, never
from browser assertions. References are trimmed and uppercased with a durable
global uniqueness constraint. Agency members cannot confirm payments. Confirmation
requires explicit independent platform review, AAL2 and an audit reason; a reviewer
who has a membership in the target agency is denied even if separately provisioned
as a platform administrator. Confirmations distinguish manual from provider evidence.
Manual refunds record a verified external action; they do not initiate a bank transfer.
Refund records preserve current data and do not invent a refund-driven access policy;
an administrator may separately suspend access under an audited decision.

Agency billing profiles and immutable payment snapshots include name, address and
optional fiscal reference. Payment records retain subscription revision, plan,
period, exact amount/currency, payment status/reference, verification and an internal
invoice reference. Authorized agency downloads produce an internal JSON billing
record, explicitly **not a compliant tax invoice**. No Moroccan tax rate, VAT
treatment, legal numbering rule or fiscal retention guarantee is asserted.

## Interfaces and operational boundaries

FR/AR agency billing pages provide configured offers, current/next subscription,
trial/renewal dates, used/reserved/remaining allowances, requests, cancellation,
profiles, payment references, history and internal record downloads. RTL, labels,
busy/error status and exact-value display reuse the existing workspace. Existing
rental, vehicle, document, signing and Sheets workflows receive distinct quota and
restriction messages (`PBL01` / `PBL02`), without changing ordinary missing-record
or uncertainty handling.

The restricted platform workspace lists agency names/status, subscriptions, usage,
manual review, catalog versions/availability, suspension/reactivation, explicit
transitions/grace deadlines and failed/ignored provider events. It exposes no
customer contracts, identity documents, signatures, evidence, storage credentials,
raw provider payloads, billing profiles or impersonation. Admin identities bind to
explicitly provisioned auth subjects; agency roles cannot mint that authority.
Listings are currently bounded to 500 agencies/subscriptions/usage rows and 200
payments; a paginated large-installation console remains an implementation extension.

The sole UI gate is `CONTRATPRO_BILLING_VERIFIED`; it remains unset. The provider
gateway additionally needs a separately provisioned random 32-byte key and matching
private database record. Nothing is provisioned by this change. No service-role
credential is used in browser or server billing code. The SQL draft deliberately
raises before DDL and ends in rollback. Its guard is removed **only in the disposable
test database**, never in the repository draft or a remote SQL session.

Immutable pricing, payments, subscription snapshots, idempotency receipts and
audit evidence have no automatic deletion path in the MVP. A production retention,
access-log redaction, backup and legally reviewed deletion/anonymization policy must
be approved before launch. This preserves financial and customer evidence without
inventing a statutory retention period.

## Files and local verification

New application files are under `apps/web/src/billing/`: model, copy, provider,
repository, handler, webhook, agency workspace, platform workspace and tests.
New routes: localized `app/billing`, its POST action, localized platform action,
and the disabled provider webhook endpoint. Existing navigation, platform page and
business error adapters/messages receive narrow integrations. No dependency added.
Database changes are the guarded 0020 draft, a new embedded billing test, and
composition assertions added to the existing documents/signing/delivery/Sheets test.

Verification results are recorded in [MVP tracker](mvp-tracker.md). Tests cover
independent MFA platform authorization, self-review denial, explicit agency
permissions, tenant denial, immutable catalog versions, state transitions, configured
trials/expiry, renewals/changes/cancellation, exact values, manual references,
provider duplicates/order/authentication, failed accounting, queued concurrent
quota attempts, actual contract retry, rollover, retained customer rows, and real
signing completion with expired billing. FR/AR component and handler tests cover
direction, configured display, errors, request scope and rejection of false success.

## Remaining implementation, decisions and acceptance

Implementation extensions/gaps: a selected provider's actual adapter and its
merchant/order/signature/recovery protocol; automated unknown-ID recovery;
background billing reconciliation/expiry scheduling if required beyond lazy
enforcement; large-installation platform pagination; validated tax-invoice rendering
if required by the commercial/legal scope; operational secret rotation and retention
automation. No new payment provider, billing worker or external service is activated.

Commercial decisions: actual plan identifiers/copy, prices/currencies, trial days,
feature packages and quota values; payment provider selection and MAD/Morocco
capabilities; approval of next-period-only changes, no proration, completion overages,
grace/refund rules and one-time trial eligibility. These remain configurable or
explicit policy decisions, not invented market offers.

Deferred configuration/deployment/acceptance: review inventory and native PG17
compatibility for 0013–0020, managed role ownership/ACL/RLS and schema-cache behavior;
explicit agency capability/admin/MFA/key provisioning; live cross-tenant and native
concurrent tests; actual Storage metadata/size/rollback behavior; payment merchant
credentials and authenticated provider sandbox acceptance; fiscal/legal validation;
FR/AR mobile/browser/accessibility acceptance. None was run or authorized here.

All previous implementation gaps and blockers remain in the tracker and original
reports. This billing slice does not declare the whole ContratPro MVP finished.
