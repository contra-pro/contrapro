# D2 native environment and acceptance package — offline preparation

2026-11-27 UTC. **Prepared, not executed. No cluster initialization, server start, SQL execution, provisioning, installation, deletion or remote connection occurred.** Only resource metadata/hash discovery, parser checks, mocked-driver tests and the Plan action ran. D1 remains closed; the completed historical search and candidate generation were not repeated.

## 1. Resource availability

Permitted bounded inspection found a complete resource tree at **C:/Program Files/PostgreSQL/17-EtsyHunter-Test**. It is an existing installation location, not the test data directory. Its existing data, database configuration and databases were not inspected or reused. New execution uses its programs/share/lib read-only and creates a separate private cluster.

| Resource | Result |
| --- | --- |
| bin/postgres.exe | Reports 17.11; SHA-256 `f5dbfd059f8088b9511a02fc014e659369996fc7d3e88e47658b1cfa2fbb02d2` |
| bin/initdb.exe | `d385519a50d2cd5e143e86c2c10acfe0d44d3039d714c8211b804011bca2409f` |
| bin/pg_ctl.exe | `9885ac53af9d67c76c1ddde87c19e6b15539d7c482bca70cd5ead5dad0b7ce3c` |
| bin/psql.exe | `c290c7f0a3335f290f8c18011a1e5afa03ee3cdd628697a5f3e767e5f1d3d10d` |
| Matching lib | plpgsql.dll, pgcrypto.dll and uuid-ossp.dll match the known 17 installation byte-for-byte |
| Matching share | postgres.bki header is PostgreSQL 17; system_functions.sql, system_views.sql, information_schema.sql, sql_features.txt and configuration samples present |
| Extension resources | plpgsql 1.0, pgcrypto 1.3 and uuid-ossp 1.1 controls/installation SQL present; corresponding libraries present |

All four executable hashes match the 17.11 programs in C:/Program Files/PostgreSQL/17. That original directory still lacks share; it is not the startup resource root. PostgreSQL 18 resources are not mixed into this package. The complete share tree and required binaries/libraries are pinned in [resource-manifest.json](../scripts/d2-native/resource-manifest.json): **1,535 files**. This establishes consistent local resource availability, not publisher attestation or successful native loading; initdb/extension loading are acceptance steps. No installer is needed based on the resources now found. A relevant existing installer filename was observed by metadata only; it was neither run nor extracted.

`pg_config.exe` was not invoked, rerouted or permitted through a changed policy. Discovery was limited to known PostgreSQL roots, selected share/lib paths and relevant direct download filenames. Existing data directories, unrelated personal directories, current database sessions and the production VPS were excluded.

## 2. Package identity and execution boundary

The new [native package manifest](../scripts/d2-native/package-manifest.json) is SHA-256:

`d703f3c2e7a3cbaa2f3694eef85a49dad75172e568fe0dd10dcbc647b40d869d`

It binds twenty runtime/source files, including the lifecycle/controller, resource inventory, native driver, independent fixtures and the nine local source contracts used by the model baseline. It is **not an authorization record**. The previously prepared sixteen candidates remain byte-for-byte unchanged with manifest SHA-256 `c5f3bcaa94e92843e26a55b9069542cc9274800d003155e4aee4e4b7bfb2cdc8`. The runner verifies these artifacts rather than regenerating candidates. No application migration runner, old four-file foundation runner or managed connection route is invoked.

All mutation-capable actions need a reviewed package hash and an explicit operator token. Plan is inert. There is no default SQL execution on import, a generic host/database argument, arbitrary SQL file option, installation path fallback, policy bypass, Start-Process or pg_config workaround.

## 3. Disposable cluster configuration

| Setting | Fixed plan |
| --- | --- |
| Session root | C:\Users\lenovo\AppData\Local\ContratPro-D2-native\pg17-54329 |
| Data | Exactly the new session-root/data directory; refuse an existing session root, linked root/parent or adoption |
| Server | Read-only binaries/resources from the bound complete PG17.11 installation |
| Network | IPv4 127.0.0.1 only; port 54329; fresh no-listener check before initialization/start |
| Database | New contratpro_d2_native; the newly initialized cluster's default postgres database is used only for bootstrap, never an existing service database |
| OS operator | Ordinary private owner process; current-owner/SYSTEM protected ACL on all new session files; no existing service/elevation/registry policy changes |
| Roles | Private initdb d2_bootstrap, then non-superuser administrative postgres matching candidate requirements; restricted runtime/writer/provider model roles and authenticator test login |
| TLS/auth | Fresh local CA/leaf with localhost and 127.0.0.1 SAN, no global trust-store installation; TLS 1.2 minimum; SCRAM; explicit CA and fixed-IP identity verification |
| Locale | UTF8/C synthetic locale; this is not a faithful copy of the target's en_US.UTF-8 collation |
| Sessions | Seven planned connections at peak: bootstrap, three administrative/observer sessions, three separate authenticator sessions; at least three distinct backend PIDs asserted |
| Memory settings | shared_buffers 128 MiB, work_mem 4 MiB, maintenance_work_mem 64 MiB, max_connections 12, max worker/parallel workers 2 |
| Estimated use | Approximately 0.5–1 GiB for this small native fixture, to be measured; not an OS-enforced memory quota or a performance guarantee |
| Resource gate | At least 2 GiB free RAM and 10 GiB free disk before initialization/start; observed free RAM was about 1.5–1.8 GiB during discovery, so the gate must be rechecked and satisfied |
| Disk bounds | WAL 128 MiB target, 32 MiB minimum; temp-file cap 64 MiB per process; 1 MiB log rotation; 2 GiB session directory check before/after migration phases (not an OS quota) |
| Time/output bounds | Connection 5s; statement 30s; lock 2s; idle transaction 10s; client query 35s; 4 MiB result cap; total native run deadline 20 minutes |

The port was free at the read-only check and disk free approximately 29.96 GiB; these are observations, not reservations. Nothing automatically stops existing applications/services to make memory available. No Docker or image pull is required for this native stage. Resource capacity, TLS generation, Windows process handling and actual server startup are still runtime acceptance obligations.

### Credential and policy exclusions

Use an owner-approved private PowerShell 7 process without recording/transcription/debugging. Do not paste credentials in chat, argv, files or source. Initialization prompts for a **new synthetic-only** bootstrap password. Accept prompts for it masked; the test-role passwords and gateway keys are generated in memory for this cluster. No production credentials are requested. Psql/libpq default credential and client-certificate paths are excluded for pg_ctl's private readiness handling; any pre-existing PG/environment/debug/preload control is refused, not cleared. Framework .env files, Supabase configuration and provider SDKs are never loaded.

Only newly created, owned credential environment variables are removed in finally blocks. No pre-existing NODE_OPTIONS/enforced control is removed or overridden. Managed/environment memory is not claimed to be guaranteed zeroed; the PowerShell unmanaged buffer is cleared and its SecureString disposed. SQL/parameter logging is disabled in the new cluster; private failure receipts redact transient passwords and synthetic long-hex keys. No real data or credentials are copied into the fixture.

## 4. Predecessor model and historical reconciliation

The [baseline source bindings](../scripts/d2-native/baseline-sources.json) reuse accepted local 0000–0007 source contracts and the known local 0008 file solely to build a **synthetic model**, not authenticate deployment bytes. There is **no historical 0009 variant selection, extraction or execution**. [receipt-model.sql](../scripts/d2-native/receipt-model.sql) independently defines the minimum predecessor protocol used by the suffix; its table/claim-helper model is deliberately not an exact 0009 reproduction. Simulated 0009–0012 history markers are clearly named as synthetic, not source/application proof. No existing target history is touched or repaired.

The model seeds two fictional Auth subjects, separate canonical users and two agencies/owners. They are not the two actual target Auth users. The provider model has simplified Auth/Storage tables, claim helpers and explicitly scoped fixture policy-owner authority. It does not implement JWT signature verification, PostgREST, managed role inheritance, Vault, actual Storage objects/API, email, Google or external signing. Testing against it cannot prove those managed services or the exact target's predecessor semantics.

See the separate [baseline reconciliation strategy](d2-historical-baseline-strategy.md). Three approvals remain distinct:

1. Synthetic native acceptance: may establish PG17.11 suffix behavior under this explicitly approved model.
2. Faithful existing-target upgrade acceptance: requires authenticated source lineage or an explicitly reviewed current-state baseline, complete relevant definitions/permissions/data compatibility and native reproduction. Unknown original bytes remain unknown.
3. Managed Supabase mutation authorization: a later, separate change/recovery decision; never implied by either native result.

## 5. Executable acceptance coverage

| Area | Prepared native behavior and pass/fail evidence |
| --- | --- |
| Baseline | Fresh-target identity/version/TLS/private-data-directory verification, zero role/database collision, independent model install, synthetic markers and two identities; no selected 0009 variant |
| Extensions | Create pgcrypto/uuid-ossp only in the disposable model; run bounded random-byte/UUID probes; no Vault/key access |
| Sessions/concurrency | Three distinct backend PIDs; one advisory lock holder, another refused contender and an independent observer; later duplicate rental creation uses two independent actor connections |
| 0013 parser diagnostic | Execute an isolated full candidate with deliberate failure before COMMIT; distinguish actual native r.starts_at compilation failure from the offline parser limitation. Success requires native compilation, controlled rollback, unchanged history, no new rental role/tables, then original candidate application and lifecycle calls |
| Order/transactions | Exactly 0013–0028 in pinned order; each candidate owns DDL/history transaction; no retry on failure; duplicate replay rejected before DDL |
| Ownership/authority | Candidate restoration assertions plus independent before/after existing membership-edge comparison; new role INHERIT/SET elevation must not remain; object ownership, declared RLS and definer PUBLIC EXECUTE checks |
| Preservation | Per-candidate private snapshots retain old Auth/Storage/identity/tenancy/receipt/platform row values; after acceptance the two model Auth users remain; actual target data is never accessed |
| Tenant/RLS | Separate owner subjects/agencies; cross-tenant rental/document/billing denial, direct-private-table denial and SET ROLE postgres escape denial through authenticator |
| Contract lifecycle | Create client/vehicle/rental, confirm/number/start/complete with relative native test dates and real SQL transitions; no disabled production time guard |
| PDF metadata/Storage | Private bucket limits/MIME postcheck; reserve/save/select original PDF metadata, issue with synthetic renderer MAC, reject foreign access; no actual PDF rendering/upload/API claim |
| Agency-first signature | Invitation rejected before agency signature, stage/sign agency, invite client; after 0028 verify/sign client, idempotent replay, finalize/complete, assert agency evidence fingerprint unchanged across later migrations |
| Delivery | Synthetic encrypted-envelope-shaped payload, queue/claim lease, invalid lease denial and no duplicate claim; no email/SMS transport |
| Sheets | Native created-event/outbox uniqueness under concurrent idempotent creation; unavailable connection refusal; synthetic OAuth state consume/replay denial; no Google token or API |
| Billing | Synthetic-only plan/subscription and dashboard/tenant boundaries; no commercial plan approval, payment processing or feature activation |
| Account/registration boundary | Profile save/get isolation and direct private-profile denial; this does not claim full managed email confirmation/provisioning/onboarding end-to-end acceptance |
| B1 representation | Valid/invalid consent capture, client signature/finalization under the composed wrapper, historical agency evidence retained |

Every business scenario is currently **unexecuted natively**. Offline mocks verify orchestration, not business SQL success. If a scenario or model precondition fails, the run records its exact phase and bounded redacted diagnostic and stops. A failed model run is not automatically classified as a product defect or repaired by relaxing grants/guards. Initial fixture semantics and Windows lifecycle behavior must be characterized during the first authorized run. Full managed Auth/Storage parity and broader negative/concurrency matrices remain separate acceptance work.

## 6. Exact proposed operator commands — NOT AUTHORIZED OR EXECUTED

Review the package and use only an approved private operator terminal subject to existing policy. Native actions remain prohibited in this batch. A long acceptance command should be owner-operated rather than placed under an unsupported 120-second wrapper; no new persistent shell permission or global lean-ctx modification is requested. If a command is blocked, stop and report the exact rejection; do not use another launcher or permanently allow it.

```powershell
Set-Location -LiteralPath 'C:\Users\lenovo\contratpro'
$D2PackageSha = 'd703f3c2e7a3cbaa2f3694eef85a49dad75172e568fe0dd10dcbc647b40d869d'

# Read-only plan; safe to review now.
& '.\scripts\d2-native\session.ps1' -Action Plan

# Separately authorized next batch only. Do not chain past a failed action.
& '.\scripts\d2-native\session.ps1' -Action Initialize -PackageSha256 $D2PackageSha
& '.\scripts\d2-native\session.ps1' -Action Start -PackageSha256 $D2PackageSha
& '.\scripts\d2-native\session.ps1' -Action Status -PackageSha256 $D2PackageSha
& '.\scripts\d2-native\session.ps1' -Action Accept -PackageSha256 $D2PackageSha

# Accept attempts a verified fast stop in finally on success or failure.
# Explicit stop if the server was started without Accept or needs stopping:
& '.\scripts\d2-native\session.ps1' -Action Stop -PackageSha256 $D2PackageSha

# Optional explicit cleanup AFTER confirmed stop and evidence review:
& '.\scripts\d2-native\session.ps1' -Action Cleanup -PackageSha256 $D2PackageSha
```

Tokens are respectively **D2-NATIVE-INITIALIZE**, **D2-NATIVE-START**, **D2-NATIVE-SYNTHETIC-ONLY**, **D2-NATIVE-STOP**, **D2-NATIVE-CLEANUP-DATA**. Status has no mutation token. Initialize's initdb prompt and Accept's masked prompt use the same new synthetic bootstrap password; it is never a command parameter.

Initialize refuses an existing session directory. Start verifies private ACL/config/HBA/auto-config hashes, installed resources, free port/headroom and new cluster binding. Shutdown verifies exact executable, data-directory argument, port, PID and postmaster creation time before pg_ctl fast stop; it never signals an arbitrary process or existing service. Cleanup only removes the precisely checked new data directory and its synthetic server key, refuses linked paths or uncertain process exit, and retains package/session/acceptance/log evidence. There is no automatic cleanup/reset/retry. Partial initialization without a complete session record is preserved for separately reviewed recovery, not adopted or deleted by these commands.

No client/cluster commands above were run except Plan. A future stop that cannot confirm process termination is an explicit blocker, not a no-orphans claim.

## 7. Validation and one consolidated authorization request

Passed offline: **10 focused Node tests**, new provider/receipt SQL and PL/pgSQL parsing, 85 embedded SQL statement/template parses (including two syntax-only dynamic templates), lifecycle PowerShell AST parsing, read-only Plan execution, twenty-file package hash validation and the 1,535-file installed-resource check. Candidate package is read/verified, not regenerated. The new native session directory is confirmed absent. No PGlite/native SQL suite, initdb, TLS generation, pg_ctl action, role/database creation or scenario SQL ran. Whitespace checks pass across 21 new/updated package/document files, including untracked files; scoped Git diff whitespace checks also pass.

**Owner request for the next batch:** authorize only this pinned package for one disposable **synthetic-only** run at the fixed directory/database/127.0.0.1:54329, including private ACL/TLS/initdb setup, transient server start/PID tracking, model role/database/fixture SQL, the sixteen candidates, bounded rollback/concurrency/business scenarios, verified shutdown and optional separately confirmed own-data cleanup. The action must wait for the 2-GiB/10-GiB/free-port gates. This excludes existing clusters/data, Supabase connections, real credentials, a historical 0009 selection, faithful-upgrade acceptance, managed migrations, provider activation, installation, global policy changes, commit/push/deployment. No further historical search or D1 replay is requested.
