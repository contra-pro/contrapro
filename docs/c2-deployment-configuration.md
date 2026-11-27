# C2 deployment configuration

Prepared locally; no image/container, deployment or infrastructure was created. Reuse the [C1 configuration matrix](c1-environment-configuration-matrix.md) and existing A5 operator tools. All feature gates remain closed. No real environment file or credential was read or changed.

## Independently deployable processes

Application artifact: `deploy/Dockerfile`, target `app`. It builds the existing standalone Next application, copies standalone output, static assets **and public assets**, then runs `node scripts/application-start.mjs` as `node`. The wrapper validates production stage before importing Next's generated server in the same process; it does not spawn a detached child. Framework SIGTERM handling and container init own application shutdown. Neither the image build nor that standalone startup was exercised in C2; the isolated production build is separate evidence.

Worker artifact: `deploy/worker.Dockerfile`, or existing `worker` target of `deploy/Dockerfile`. It contains only Node and the HTTP orchestrator/health/environment scripts, with no package install or provider credential. Entry: `node scripts/maintenance-worker.mjs`. SIGTERM/SIGINT stop new pulls and polling; bounded in-flight HTTP requests drain. Docker init reaps children; `stop_grace_period: 150s` exceeds the existing 120-second HTTP bound. Forced termination still requires lease/uncertainty recovery; it is not cancellation of an external side effect.

`deploy/compose.yaml` specifies non-root images, read-only roots, capped tmpfs/PIDs/CPU/RAM, no extra capabilities, no privilege escalation, no Docker socket, loopback-only app host port, no worker port, restart policy and app liveness dependency. Digest-pinned app/worker images and separate private operator-owned environment files are mandatory operator inputs. Base image tags must be resolved/reviewed and pinned by the future release process; C2 did not query a registry or verify image provenance.

## Environment contract

New deployment entry requirement: `CONTRATPRO_DEPLOYMENT_STAGE` must be exactly `staging` or `production` when `NODE_ENV=production`. Missing/development stage, Vitest markers and isolated-review markers are refused. Staging/production require production mode. `isolated-acceptance` is allowed only in test mode with the existing isolation-preload marker. Development defaults remain separate. These checks do not prove that two remote database targets are distinct; D1 must establish that from authorized target evidence.

Local manual review retains its existing isolated launcher; it does not use the deployment wrapper. C1 synthetic legal support remains test-only and is never installed as a route, mock production identity or registration fallback. Final real legal documents are still absent, so production signup remains unavailable.

Safe nonfunctional templates: `deploy/application.env.template` and `deploy/worker.env.template`. They contain invalid placeholders and disabled gates, not credentials. Do not pass these directly to a running deployment. The app receives only necessary server feature secrets from the C1 matrix. The independent worker receives only stage, HTTPS origin, A5 gate, maintenance HTTP bearer, lane count and poll interval; no Resend, Google, encryption, database or Storage service key is needed in that process.

## Private network and proxy

The compose `private` network is internal. App and worker share it; only the app joins the `egress` bridge for separately authorized Supabase/Resend/Google operations. The worker must reach an approved **HTTPS** internal reverse-proxy origin on the private network. The future Coolify proxy must join this project-private network, resolve the approved origin there and present a valid certificate trusted by Node. Do not change the worker to plain HTTP or disable TLS verification to make routing work. The proxy itself is an operator prerequisite, not a provisioned C2 service.

Public TLS terminates at that future proxy. Restrict `/api/internal/*`, `/api/health/ready` and maintenance status to worker/monitor paths and require the existing bearer; network placement never replaces application authorization. Public app binding is `127.0.0.1:3000` on the host. Do not publish a database, worker or raw management port. Egress policy should permit only the approved feature endpoints once activation is authorized; C2 makes no live calls.

## Health, readiness and shutdown

- App liveness: `/api/health/live`, no secrets or backend details. Docker's app health check uses it. This does not prove database/provider readiness.
- App readiness: authenticated `/api/health/ready`, existing key-reference and maintenance checks. Status remains sanitized and administratively restricted.
- Worker local heartbeat: atomic mode-0600 JSON in the OS temp directory, fixed name `contratpro-worker-health.json`. It contains only version, PID, observation time, phase and a Boolean. Unique exclusive temporary writes prevent following an existing temporary-file symlink. No URL, bearer, tenant, recipient, token or job payload is recorded.
- `node scripts/worker-health.mjs /tmp/contratpro-worker-health.json --live` checks a running PID, phase and freshness. Docker uses this local check; it needs no HTTP listener or bearer.
- The same command without `--live` additionally requires the last observation to be successful and not globally disabled. It is worker transport readiness, not proof that every optional provider is enabled. A snapshot older than 240 seconds, future time, dead PID or stopped phase fails. The bound covers a 120-second request plus a 60-second capped wait and margin.
- A heartbeat write failure halts all polling lanes, drains in-flight requests and fails the worker. HTTP 200 with `ok:false`, failed/unknown outcome or malformed JSON backs off rather than becoming a successful heartbeat. Poll backoff starts at twice the configured interval and caps at 60 seconds; durable per-task retry/lease controls remain authoritative.

Health checks do not authorize mutation and are not an absolute process identity proof. Do not use a status file to bypass backend authorization or lease checks.

## Storage and execution limits

Queue, receipt, audit and scheduling state lives in PostgreSQL, not local files. Private contract/source/intermediate/final document, signature and branding bytes remain in private object storage. Fonts are an approved licensed read-only mount with consistent hashes. Temp conversion/cache files and health snapshots are ephemeral and excluded from backups. Logs go to stdout/stderr with operator-side bounded retention.

Native PDF generation/finalization reuses the existing renderer. The optional DOCX converter currently launches a preinstalled digest-pinned Docker image from an authorized host. **That launcher is not available inside the hardened app image**: no Docker CLI/socket is supplied. Leave `CONTRATPRO_DOCX_IMAGE` unset there. A separately approved isolated conversion execution arrangement and actual Arabic/font/container acceptance remain blockers before enabling DOCX; do not solve this by mounting the host Docker socket.
