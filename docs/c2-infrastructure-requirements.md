# C2 infrastructure requirements

All sizes here are **planning estimates**, not measured production requirements or a purchase recommendation. No VPS was purchased, provisioned, contacted or benchmarked. The existing production Hostinger/Coolify VPS must not be used for ContratPro testing.

| Component | Concrete initial planning allocation | Evidence / required acceptance |
|---|---|---|
| Separate acceptance/staging host | 4 vCPU, 8 GiB RAM, 80 GiB SSD | Estimate allowing build and OS headroom; load/OOM/disk tests pending |
| Application service | Compose currently caps 1 CPU, 1 GiB RAM, 128 PIDs; 128 MiB `/tmp` | Existing runtime build passes locally; container behavior and realistic document concurrency unmeasured |
| HTTP worker service | Compose caps 0.25 CPU, 128 MiB RAM, 32 PIDs; 16 MiB `/tmp`; initially 1 lane / 5-second polling | Mocked bounded concurrency/backoff/drain/health tests; container memory including health subprocess must be measured |
| Database | Separately approved PostgreSQL target with verified roles, extensions, Auth/Storage compatibility and durable disk | No size/capacity claim from PGlite; D1 native evidence required before selection or apply |
| Private object storage | Durable private `contract-documents` bucket, existing tenant/path policies, immutable checksums and no overwrite | Includes branding in the existing bucket; managed behavior and access acceptance pending |
| Font assets | Read-only licensed font directory mounted at `/run/fonts` | Pin exact bytes across web/generation/finalization/recovery; licensing and Arabic shaping acceptance pending |
| DOCX conversion | Separate approved isolated execution arrangement; existing converter caps 1 CPU/512 MiB per container | No converter/container created. Hardened app deliberately has no Docker socket/CLI |
| Reverse proxy | TLS, valid Node-trusted certificate, private worker routing, internal-path restrictions, bounded body/timeouts | Separate future Coolify proxy integration; no DNS/certificate/proxy provisioned |
| Backup repository | Separate encrypted restic repository, offline age-encrypted recovery-key archive and protected staging | No real backup/restore; D5 consistency/restore evidence required |
| Monitoring | Restricted readiness/status, worker heartbeat, queue age/failures/uncertainty, disk/RAM/OOM, key references, restore holds | Operator alerts and real monitoring acceptance not yet configured |

The 80 GiB host estimate can provisionally reserve 20 GiB each for OS/tooling, reviewed images/build cache, bounded scratch/logs, and free recovery headroom. Persistent database/object backups need independent capacity. Determine object capacity from actual retained versions × measured average bytes, including source, issued, agency intermediate, final PDF, historical templates, logos and evidence. Do not silently discard historical versions to fit a disk estimate. Owner-approved legal retention and RPO/RTO are still required; C2 invents neither.

App/worker are independently deployable. PostgreSQL portability means preserving schema/roles/ACLs/RLS, migration journals and immutable evidence, not assuming a managed Supabase Auth/Storage project can be replaced by an empty PostgreSQL server. Application Auth URL/issuer pinning and managed-service recovery contracts remain explicit D1/C2 follow-up requirements.

Before deployment acceptance, measure build peak RAM, steady-state RSS, PDF and Arabic rendering peaks, queue throughput/age, p95 task duration versus lease bounds, shutdown drain time, health-check overhead, disk growth and restore duration on the separate approved target. Adjust the example limits using those measurements. Do not run the complete Unicode suite concurrently with heavy build/SQL workloads to infer application capacity.

Email requires the approved sending domain, sender/reply-to, Supabase SMTP and authenticated Resend webhook configuration from C1. Google requires approved client/consent/exact FR/AR callback configuration and per-agency token consent. Neither service is activated in C2. Commercial payment/plans, final legal validation, full workflow manual acceptance, A6 visual acceptance and D5 actual restore acceptance remain deferred requirements.
