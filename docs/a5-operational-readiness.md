# A5 operational implementation — local checkpoint

2026-11-26. Baseline `ae41f6c`; earlier uncommitted A1–A4 work preserved.
Draft 0025 is guarded, rolls back and remains **unapplied**. No production or
operational acceptance is asserted. A6 has not started.

## Requirement evidence

| Requirement | Actual implementation and source | Local evidence | Limits / remaining work |
| --- | --- | --- | --- |
| Executable workers | `scripts/maintenance-worker.mjs`, `src/maintenance/runtime.ts`, internal maintenance run route | Node runner tests; runtime gate tests | No live process started. One scheduler claim per task; configurable 1–8 HTTP lanes. Domain queue claims remain authoritative. |
| Durable scheduling | 0025 `maintenance_schedules`, claim/finish RPC, 180-second lease, 8-attempt ceiling, exponential backoff, incident creation | Composed PGlite test covers disabled schedules, duplicate claim, stale lease and recovery | All schedules disabled initially. 300 seconds is an inert placeholder; an operator must approve each interval. Native multi-session lock/timeout acceptance remains. |
| Delivery / invitations / reminders | Reuses delivery outboxes, `DeliveryWorker`, A3 reminder slots, dispatch arm and provider idempotency | Existing delivery/reminder tests plus missing-key regression | Resend, domain and A3 gates unchanged. Unknown acknowledgements without positive provider IDs remain manual. No resend of uncertain operations. |
| Delivery / Sheets reconciliation | Fair durable observation timestamps select known provider IDs / existing uncertain Sheets rows; existing read-only reconciliation methods | SQL selector composition; existing provider tests | Observation never appends a missing Sheets row. Unmatched results require domain-owner review. Separate concrete signature/payment recovery adapters remain unfinished. |
| Document recovery | Lease metadata on existing immutable generation requests; pinned input / snapshot / captured clauses; renderer proof, exact output key, physical object check, immutable artifact | SQL stale-lease, cross-agency path, missing bytes and idempotent completion assertions; existing renderer tests | Five attempts; 90-second lease. Automatic issuance requires the pinned current rental version and no existing issued artifact. Reissuance/superseded/cancelled requests require manual recovery. DOCX uses the existing isolated converter only when configured. |
| Simple finalization recovery | Existing `SigningEngine.finalize`, private storage and public signing gateway; only already committed typed agency/client signatures | Existing finalization tests; SQL finalization selector and runtime gate tests | Only simple, unexpired, unrevoked consumed invitations. Five attempts; no actor impersonation or new signature capture. Font/hash mismatch, expired invitations and higher assurance need manual/provider recovery. Native recovery interruption acceptance remains. |
| Expiration / subscriptions | Bounded lifecycle maintenance reuses billing refresh and signing transition/evidence functions; expired previews become inaccessible under A2 authority | Composed SQL lifecycle and prior expiration tests | Does not fabricate a payment, renewal or commercial policy. Existing billing lock/entitlement rules apply. |
| AEAD keys | `maintenance/keys.ts`, delivery and Google OAuth consumers, active key ID, up to eight historical keys, original AES-256-GCM scope/expiry | Key-ring, wrong-scope, expiration, missing-key tests; delivery and OAuth regressions | Historical OAuth flow material expires/purges rather than receiving extended retention. No key generation/activation. |
| Rotation | 0025 bounded one-record CAS rotation, immutable expiry, counters and append-only audit; readiness checks all retained key-ID references | Interrupted/stale CAS, replay and reference-readiness tests | Delivery and live Sheets credentials re-encrypt. OAuth state uses overlap then expiry. Expired records must be purged or their historical key kept. Backup key dependencies must also be retained. |
| Stable cryptographic identities | Required independent `CONTRATPRO_DELIVERY_DERIVATION_KEY`; delivery runtime rejects reuse of any active/historical AEAD, gateway or signing key | Delivery idempotency tests | Provision the independent identity key before first activation of the unapplied drafts, then retain it unchanged across AEAD rotations. Invitation/verification HMAC, gateway MAC, webhook and provider credential rotation use a drain/cutover procedure, not AEAD rewriting. |
| Inventory | Agency-scoped union of private object catalog and document/logo/signing registries, 50 keys per pass, durable cursor and fair agency rotation | Composed inventory assertions | Categories: retained, pending, expired-preview, manual-review, missing. No reference means manual review, never permission to delete. Separate evidence objects unsupported by existing modules remain provider work. |
| Historical protection | All logos including detached historical/reserved logos; all template-version and artifact references; issued namespace and signing objects retained | Logo preservation, pending lease and issued/recovered artifact assertions | Conservative retention intentionally leaves historical logos and unknown temporary outputs for review. This closes unsafe deletion, not automated reclamation of every orphan. |
| Cleanup | Exact expired unconfirmed preview candidates only; policy retention/quarantine; durable claims and tombstones; reference revalidation under document lock; upload/reference/confirmation fences; physical deletion before completion | Quarantine age, live lease, cross-agency completion denial, no-resurrection and physical-absence tests | Destructive gate and per-agency authorization both default off. Five attempts; interrupted deletion remains fenced. No approved legal retention period. No bucket-wide deletion or automatic logo/issued/signed cleanup. |
| Backup | `scripts/operations/backup.mjs`, `references.sql`: full custom pg_dump, private Storage bytes, migration/version metadata, external age-encrypted key recovery file, SHA-256 manifest, encrypted restic destination | Offline fixture manifest, tampering, missing-object and execution-denial tests | All writes including managed Auth must be frozen externally. Private staging ACL approval required. No real backup produced. Supabase configuration, JWT signing keys, SMTP/OAuth consoles and compatible managed services require independent recovery. |
| Restore / DR | Explicit restic extraction, bundle validation, isolated pg_restore, no-overwrite object restoration, `post-restore-quarantine.sql` | Offline fixtures and actual quarantine SQL in PGlite | Managed Storage metadata/blob restoration ordering is service-specific and can require provider intervention. No native restore rehearsed; neither RPO nor RTO established. |
| Post-restore external consistency | Disable all schedules/cleanup/rotation/reminders; hold restored sends, Sheets writes and provider operations for independent reconciliation | Composed quarantine assertions | Workers staying disabled is mandatory until provider state newer than the backup is reconciled. Already materialized/completed evidence remains immutable. No automatic release of holds. |
| Monitoring | Separate public liveness / restricted readiness; restricted aggregate status; oldest delivery due, queue/error/uncertainty counts, expired leases, generation backlog, inventory classes, key references/progress, backup attestations, incidents | Endpoint redaction/authorization tests, SQL overview | Backup status is a privileged operator attestation, not proof of recoverability. Alert thresholds and external collection remain operator configuration. No vendor selected or notifications sent. |
| Administration | Existing independent platform subject + AAL2, restricted RPC, FR/AR schedule/metrics/rotation/incident panel, allowlisted actions, scoped candidate/recovery pages and audited expired-lease retries | Ordinary owner denied, AAL1 denied, private-table denied, live/cross-agency recovery denial and secret-field rejection SQL tests | Candidate/policy/rotation/backup configuration and bounded recovery retries also have fixed RPC interfaces. No arbitrary SQL/jobs or customer documents; domain authority is rechecked after a retry reset. |
| Hosting | `deploy/Dockerfile`, `deploy/compose.yaml`, placeholder `.env.example`, standalone Next output, secret exclusions, non-root containers, resource/shutdown limits | Static artifact tests and standalone production build | No image build/start or deploy preflight. Separate future VPS; private TLS proxy, digest selection, secret store, monitor and licensed font mount deferred. No Docker socket is mounted. DOCX isolation requires a separately reviewed conversion host design. |
| Feature gates | A5/access/MAC checks plus existing domain gates; disabled integrations return disabled; cleanup has an additional gate; missing historical keys block maintenance readiness | Runtime disabled/startup tests | Existing unverified flags unchanged. Concrete higher-assurance signing and payment transports remain unavailable. |

## Configuration and cryptographic cutover

All examples are placeholders. The worker container receives only its A5 gate,
private HTTPS origin, access secret and polling limits. The app receives the
maintenance MAC key and only the enabled domain capabilities. The access and MAC
keys must differ. The database MAC key is separately provisioned after reviewed
migration activation, never in a source migration or browser bundle.

Before first activation of these unapplied drafts, provision an independent
stable derivation key that differs from every active/historical AEAD key, gateway
and signing key. Keep it unchanged across encryption rotations so deterministic
job, intent and grant IDs remain stable. Earlier local fixtures used the AEAD key
for derivation; that fallback has been removed. A separately activated legacy
installation would require its own reviewed identity migration/drain before this
configuration change; this batch does not claim that migration was executed.

The readiness path reads database key-reference counts and refuses to start
maintenance work when a referenced ID is unavailable. Re-encryption keeps tenant,
record, expiry and AAD binding; CAS failures never overwrite a concurrent OAuth
refresh or rotation result. Successful writes increment durable counters once.
Never remove keys solely because the current database count is zero: retained
backups may still require them. See [key runbook](operations/key-rotation.md).

## Exit status and remaining implementation

The provider-independent A5 implementation is present and locally tested; full
operational readiness is **not accepted**. There is no claim of native PostgreSQL
concurrency, managed Auth/Storage behavior, container startup, encrypted repository
restore, provider-side reconciliation or recovery objectives from local mocks or
PGlite. Cleanup of historical logos/unknown artifacts remains intentionally manual.

Concrete signature-provider transport, hosted signing, independent trust/identity/
certificate verification and raw provider evidence handling remain unfinished
code from A3. Concrete payment transport, merchant verification, checkout, refunds,
cancellation and recurring payments remain unfinished code from A4. These are not
configuration-only items. Commercial catalog decisions, signature/fiscal legal
validation, Resend domain verification, Google OAuth configuration, Arabic font /
document fidelity, native DOCX conversion, migration compatibility, native races,
managed Auth/Storage, cross-tenant and FR/AR browser acceptance remain blockers.

Scripts and runbooks alone do not establish operational readiness. No production secrets,
flags, SQL, providers, messages, payments, objects, infrastructure or git history
were changed by activation. No commit, push, deployment or A6 work is authorized.

## Final local verification

`npm.cmd run verify` passed with the final implementation:

- TypeScript and lint passed across both workspaces.
- **1,913 web tests / 103 files** passed.
- **737 database tests / 28 files** passed, including actual A1–A5 SQL composition
  through 0025 in disposable PGlite. These are not native multi-session results.
- **8 Node operational tests** passed: worker startup/bounds/backoff/concurrency/
  drain/redaction, backup execution denial/integrity/missing references and hosting
  artifact safeguards. Root `verify` now includes these tests.
- Standalone production build passed. Its generated app server and node_modules
  paths match the prepared Docker COPY/CMD paths; no container was built or run.
- Focused delivery, OAuth, maintenance and SQL recovery reruns passed after fixes.
  `git diff --check`, targeted new-file whitespace scans and Node syntax checks
  passed. No live browser, database, Storage or provider acceptance was performed.

**Documented A5 local implementation exit criteria: satisfied for the stated
provider-independent scope.** Runnable code/artifacts and injected-fault checks
are present. This does not close unfinished A3/A4 concrete provider code or the
B7/C/D configuration, legal/commercial, hosting, native and live acceptance gates.
