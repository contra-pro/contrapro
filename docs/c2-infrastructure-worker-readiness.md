# C2 infrastructure and worker readiness

Local technical preparation, 2026-11-27. C1 is locally complete. B2 hybrid payments, B3 plans/pricing, B4 final legal validation and manual acceptance of the complete rental workflow remain deferred and retained in MVP scope. B1 internal simple signing is locally implemented; external signing providers are optional deferred extensions. A6 is not accepted and the full MVP is not production-ready.

## Existing infrastructure reused

A5 already supplies independent Next/HTTP-worker artifacts, PostgreSQL maintenance schedules, authenticated administrative routes, durable jobs, lease/retry/receipt protections, key-reference inventory/rotation, private storage maintenance, sanitized health/status, encrypted backup manifests and isolated restore holds. C1 supplies email/Sheets configuration contracts, fixed external transports and test-only legal fixtures. C2 does not rebuild those modules.

## Missing functionality completed

- Application image now includes the public assets omitted by its old standalone packaging. Existing static assets/standalone trace copies remain.
- Added a deployment-only application entry and shared environment-stage validation. Production startup requires explicit staging/production stage and refuses test/review markers. The existing isolated manual launcher is unchanged.
- Added a separate dependency-free worker Dockerfile while preserving the original worker build target. Both copy the worker's health/environment dependencies and run without root or a Docker socket.
- Worker HTTP 200 is no longer automatically a successful tick: failed, missing/invalid `ok` and unknown outcomes enter capped backoff. No task payload is replayed by this loop; it only asks the existing lease-protected dispatcher for work.
- Added atomic sanitized worker heartbeat with PID/time/phase, separate local liveness/readiness checks, bounded freshness and safe failure. Health write failure stops all lanes and drains outstanding requests rather than leaving polling running after failure.
- Completed private/egress network separation, app liveness dependency and inert environment templates in deployment artifacts. Actual proxy/TLS routing and container behavior remain acceptance work.
- Added six operational regressions and extended artifact checks. Peer lanes also stop after a logging failure. No application UI, business flow, schema, feature gate or real environment changed. No new migration draft.

## Applicable job coverage

| Job family | Existing authoritative path |
|---|---|
| Email/signature/team invitation and signed delivery | `executeTask('delivery')`: encrypted materialization/outbox, then bounded Resend delivery; authenticated observations and uncertain-send recovery preserved |
| Signature reminders | A3-gated `reminderOnce` before materialization; current invitation, policy, expiry and duplicate fences unchanged |
| Contract PDF generation | `generation` schedule, pinned input/renderer/font and existing generation claims; optional DOCX execution has the explicit deployment blocker below |
| Final signed PDF | `finalization` schedule, existing simple-signature recovery gateway, immutable source/intermediate/final checksums and versioned renderer |
| Google Sheets and token refresh | `sheets` schedule via existing per-agency encrypted OAuth credentials, refresh fencing and same-row projection |
| Delivery/Sheets reconciliation | `reconcile` schedule; no blind resend, refresh replay or append when outcome is ambiguous |
| Existing billing maintenance | `lifecycle` via existing database maintenance routines; no new payment/plan/provider implementation or activation |
| Key/storage/operational jobs | Existing inventory, rotation CAS, health, authorized cleanup and policies; restore holds and protected histories retained |

The HTTP worker carries only the maintenance access bearer. Provider, database gateway, storage and encryption keys remain server-side in the application/orchestration service. Database scheduling uses its existing bounded leases and `FOR UPDATE SKIP LOCKED`; native concurrent-worker proof still requires D1/live acceptance. Restart is not permission to replay an armed external operation.

## Deployment and recovery preparation

See [deployment configuration](c2-deployment-configuration.md) for entries, environment enforcement, health commands, network/TLS requirements and graceful shutdown. See [infrastructure estimates](c2-infrastructure-requirements.md) for CPU/RAM/disk/database/object storage/monitoring assumptions. No resources were provisioned or measured in a container.

Existing A5 backup tooling already requires explicit authorization/write freeze/private staging, validates integrity manifests, includes historical objects/evidence/journals and uses external age-encrypted recovery material plus encrypted repository storage. Restore remains isolated and places schedules, external email/Sheets/provider outcomes, refreshes, rotation and deletion under holds. C2 runs only synthetic integrity/refusal tests, not a real backup or restore. D5 actual restoration acceptance remains deferred.

## Remaining blockers and D1

The hardened app has no Docker CLI/socket. The current optional DOCX host-container launcher cannot run there unchanged; keep its setting unset until a separately approved isolated conversion arrangement and font/Arabic acceptance exist. Native PDF work is separate. Base/release image digests, actual standalone image packaging, Coolify/private proxy DNS/TLS, container RSS/limits/shutdown, managed backend/Storage, provider configuration, backup/restore and end-to-end task acceptance are unverified.

[D1 prerequisites](d1-migration-compatibility-prerequisites.md) give the exact next sequence: approve an isolated target and read-only evidence collection; reconcile target identity/schema/history/checksums and candidate lineage; prepare an ordered native clone plan with least privilege and backups/holds; obtain native concurrency/rollback evidence; request separate execution approval. Do not infer migration compatibility or apply remote SQL from C2 test results.

## Modified files and evidence

Final local verification passed:

| Check | Actual result |
|---|---|
| Full web suite, run alone | 2,024 tests / 120 files, 70.94 seconds |
| Full database suite | 741 tests / 30 files, 63.25 seconds |
| Operational suite | 14 tests: 8 baseline plus 6 new C2 regressions |
| TypeScript | Both workspaces pass |
| ESLint | Both workspaces pass with zero warnings |
| Production build | Isolated private-output build passes; no Docker image built |
| Deployment entry syntax | `node --check scripts/application-start.mjs` passes without executing the server |
| Whitespace | `git diff --check` passes |

Artifact/compose checks are static assertions, not Dockerfile builds, compose runtime validation or real container/proxy acceptance. Health, drain/backoff and failure tests use injected transports and synthetic temp files. The last worker-only adjustment was covered by the final operational rerun. Existing rendering-fixture React title warnings do not constitute browser-console acceptance. Owner build hashes are compared against the pre-verification snapshot; no owner review artifact was intentionally rebuilt.

- `scripts/maintenance-worker.mjs`; new `worker-health.mjs`, `deployment-environment.mjs`, `application-start.mjs`.
- `deploy/Dockerfile`, `compose.yaml`; new `worker.Dockerfile`, `application.env.template`, `worker.env.template`; `.dockerignore`.
- `scripts/operations/artifacts.test.mjs`; new `worker-readiness.test.mjs`.
- `scripts/v41-integration/c2-verify.mjs`; four C2/D1 documents and four MVP/scope/completion/readiness trackers.

Logs are in `.verification/c2/`. The runner preserves network/credential exclusion and private build output. No Docker command, image build/container creation, installation, real Supabase/email/WhatsApp/Google request, backup/restore, migration, provisioning, production VPS operation, feature activation, payment implementation, legal approval, commit, push or deployment occurred. No temporary server or persistent worker was started. Prior worktree changes are not all C2 modifications.
