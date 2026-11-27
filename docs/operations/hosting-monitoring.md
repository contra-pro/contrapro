# Independent hosting and operational monitoring

Artifacts are prepared for a future separate ContratPro host. Do not use the
existing Hostinger/Coolify production VPS, provision infrastructure or run deploy
preflights under this batch. Initial development/integration remains on the
existing Supabase Free project, with no service upgrade implied.

`deploy/Dockerfile` has app and worker targets. The app's standalone Next build
owns rendering, gateway access and bounded domain execution. The lightweight
worker holds only a private HTTPS origin and its access secret; it polls the
maintenance endpoint with bounded concurrency/backoff. PostgreSQL owns durable
schedule due times, intervals and task leases. There is no in-memory business
event queue or competing cron reminder generator.

Future deployment must choose reviewed base/app/worker image digests, build with
public Supabase values only, inject runtime secrets privately, and configure TLS
and a private reverse proxy. Compose binds the app only to loopback. Deny public
access to internal worker/status/readiness routes at the proxy in addition to
their bearer checks. The worker must resolve the private HTTPS origin through
that proxy. No reverse proxy or certificate is provisioned by these artifacts.

Non-root users, read-only filesystems, temporary filesystem quotas, process/CPU/
memory limits and 150-second stop grace are provided. The worker drains at most
its 120-second request before exit. A licensed Arabic font is a read-only mount.
No customer documents persist on app disks; PostgreSQL/managed Storage remain the
data authority. Private encrypted backup staging is separate from these services.
No Docker socket is mounted. Existing DOCX conversion needs a separately reviewed
isolated conversion host arrangement; it is not enabled in the base app image.

Moving PostgreSQL alone does not replace Supabase Auth, JWT identity mappings,
Storage authorization/blob services, project signing keys or provider consoles.
Portability requires a tested compatible implementation of those boundaries.

Monitoring surfaces:

- `/api/health/live`: process liveness only; no dependency/configuration data.
- `/api/health/ready`: restricted database/gateway and retained-key readiness;
  disabled A5 or missing key references returns 503 without details.
- `/api/internal/maintenance/status`: bearer-protected aggregate operational JSON.
  No decrypted credentials, recipients, contracts, evidence or provider payloads.
- FR/AR platform panel: existing independent admin identity and AAL2; no agency
  owner elevation. Schedule changes are audited; storage policy/rotation/backup/
  candidate/incident operations are fixed RPC actions, not arbitrary SQL.

`recovery-page` exposes only kind, request/session ID, attempt count and lease/due
times for an explicit agency. `recovery-retry` may reset an expired generation or
finalization lease's attempt budget; it cannot create a request or alter signatures.
`cleanup-retry` uses an explicit agency and hashed candidate key, requires an expired
deletion lease and fresh eligible-preview classification, and preserves the
tombstone. All mutations require the existing independent admin/AAL2 authority and
append an audit record. Active leases and mismatched agencies are denied.

Connect a separately chosen collector to the restricted status endpoint. Configure
approved queue depth/oldest age, expired lease, failed/uncertain operation, worker
last-finish age, exhausted attempts, storage missing/manual-review, rotation lag
and backup age thresholds. Disabled schedules must be distinguished from absent
workers. An open incident is acknowledged through the MFA RPC, not by resetting
domain state. Acknowledgement does not repair the fault. Backup timestamps are
operator attestations until a restore rehearsal proves recoverability.

Structured runner logs contain only fixed event names, booleans and allowlisted
outcomes. Never attach raw exception/provider objects. No alert vendor, billing
service or external messaging integration is selected or activated. Native lock,
restart, resource-pressure, container, private TLS and restore exercises remain
final acceptance work.
