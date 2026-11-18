# Vehicle migration — Development promotion only

Prepared offline for **gllsiklbvqpxzucvkehw only**. No deployment, connection,
permission change or activation has occurred. The application gate
`CONTRATPRO_VEHICLES_VERIFIED` stays disabled; canonical provisioning stays OFF.

The SQL is `supabase/migration-drafts/20261118000800_vehicles.sql`. It stays outside
both frozen migration inventories. `manifest.json` pins its raw bytes, the existing
eight native migrations and the unchanged CLI configuration. The historical 0007
manifest is used only as a source of those eight hashes, not its obsolete pending
plan. Here the required remote baseline is **0000–0007**, with only **0008** pending.
An actual local-only bundle is recorded in `manifest.json.preparedWorkdir`; its
nine SQL files and unchanged config were byte-verified through filesystem copies.
No CLI was invoked. Recheck all hashes before using that bundle, or reproduce it
with the local procedure below. The recorded stage is not a live target proof.

## Dependency and security review

- The only new table is `tenancy.vehicles`, referencing canonical
  `tenancy.agencies` and `identity.users`; there is no second tenant model.
- Migration 0004 supplies authenticated self-read identity/membership/agency
  policies. Migration 0005 supplies `canonical_auth_user`, `agency_owner`, and
  scoped role/permission metadata visibility. The existing active agency, active
  membership and canonical subject predicates govern every new capability.
- All nine new functions are SECURITY INVOKER with `search_path=pg_catalog`.
  SELECT needs `vehicles.read`; INSERT needs read+create; UPDATE needs read+update
  in both USING and WITH CHECK. RLS is enabled and forced.
- RPC agency parameters select a candidate tenant; they never establish authority.
  Application handlers reject browser ownership fields and derive the selected
  agency from verified context. Direct RPC calls still need the caller's database
  permissions and RLS predicates for the supplied agency.
- INSERT grants exclude IDs, creator, version and timestamps. UPDATE grants exclude
  all ownership/creation fields. The invoker trigger revalidates fields, checks
  permissions and immutable ownership, and advances the version. No DELETE grant.
- Registration uniqueness is per-agency and case-insensitive after trimming at
  insertion; internal spacing/punctuation are significant. Creation keys serialize
  within one agency/key; edits use version compare-and-swap. No automatic retry.
- The migration grants authenticated EXECUTE and column writes **subject to RLS**.
  The app flag is not a database kill switch. Authorization to deploy must include
  this new database capability; keeping the app flag OFF does not revoke it.
- The new creator FK changes identity dependency catalogs. Prior exact-dependency
  cleanup/A02 receipts must not be reused as current clearance. A02 files and gates
  are untouched; their conservative dependency checks must continue to fail closed.

## Offline promotion staging (proposed operator procedure)

Use PowerShell 7 on Windows. Do not run the connection commands below without separate authorization. First
review this manifest and SQL. Use an operator-controlled, fresh absolute staging
path outside the repository, under a trusted local parent. The following local-only
copy procedure creates no credentials, links, environment files or deployment runner.
It does not modify either repository migration inventory. Do not reuse an old stage.

```powershell
$ErrorActionPreference = 'Stop'
$vehicleRoot = 'C:\Users\lenovo\contratpro'
$vehicleStageInput = Read-Host 'Fresh absolute staging directory outside the repository'
if (-not [IO.Path]::IsPathFullyQualified($vehicleStageInput)) { throw 'BLOCKED: absolute stage required' }
$vehicleStage = [IO.Path]::GetFullPath($vehicleStageInput)
if (
    $vehicleStage.TrimEnd('\').Equals($vehicleRoot, [StringComparison]::OrdinalIgnoreCase) -or
    $vehicleStage.StartsWith($vehicleRoot + '\', [StringComparison]::OrdinalIgnoreCase) -or
    (Test-Path -LiteralPath $vehicleStage)) { throw 'BLOCKED: invalid or existing stage' }
$vehicleManifest = Get-Content -Raw -LiteralPath "$vehicleRoot\docs\deployment-0008\manifest.json" | ConvertFrom-Json
if ($vehicleManifest.projectRef -cne 'gllsiklbvqpxzucvkehw' -or
    ($vehicleManifest.requiredPending -join ',') -cne '20261118000800') { throw 'BLOCKED: manifest target/plan' }
$vehicleArtifacts = @($vehicleManifest.baseline) + @($vehicleManifest.draft) + @($vehicleManifest.configuration)
foreach ($artifact in $vehicleArtifacts) {
  if ((Get-FileHash -LiteralPath (Join-Path $vehicleRoot $artifact.file) -Algorithm SHA256).Hash.ToLowerInvariant() -cne $artifact.sha256) {
    throw 'BLOCKED: source hash mismatch'
  }
}
New-Item -ItemType Directory -Path $vehicleStage | Out-Null
New-Item -ItemType Directory -Path "$vehicleStage\supabase" | Out-Null
New-Item -ItemType Directory -Path "$vehicleStage\supabase\migrations" | Out-Null
foreach ($artifact in $vehicleManifest.baseline) {
  Copy-Item -LiteralPath (Join-Path $vehicleRoot $artifact.file) -Destination "$vehicleStage\supabase\migrations" -ErrorAction Stop
}
Copy-Item -LiteralPath (Join-Path $vehicleRoot $vehicleManifest.draft.file) -Destination "$vehicleStage\supabase\migrations\20261118000800_vehicles.sql" -ErrorAction Stop
Copy-Item -LiteralPath "$vehicleRoot\supabase\config.toml" -Destination "$vehicleStage\supabase\config.toml" -ErrorAction Stop
$stagedNames = @(Get-ChildItem -LiteralPath "$vehicleStage\supabase\migrations" -File | Select-Object -ExpandProperty Name | Sort-Object)
$expectedNames = @($vehicleManifest.baseline | ForEach-Object { Split-Path -Leaf $_.file }) + @('20261118000800_vehicles.sql')
if (($stagedNames -join ',') -cne (($expectedNames | Sort-Object) -join ',')) { throw 'BLOCKED: staged inventory mismatch' }
foreach ($artifact in @($vehicleManifest.baseline) + @($vehicleManifest.draft)) {
  $stagedFile = Join-Path "$vehicleStage\supabase\migrations" (Split-Path -Leaf $artifact.file)
  if ((Get-FileHash -LiteralPath $stagedFile -Algorithm SHA256).Hash.ToLowerInvariant() -cne $artifact.sha256) { throw 'BLOCKED: staged SQL hash mismatch' }
}
if ((Get-FileHash -LiteralPath "$vehicleStage\supabase\config.toml" -Algorithm SHA256).Hash.ToLowerInvariant() -cne $vehicleManifest.configuration.sha256) { throw 'BLOCKED: staged config mismatch' }
```

Do not repair a partial staging directory automatically. Choose a fresh directory
after resolving the failure; no database operation has been authorized by staging.
The staging commands are source-reviewed, not execution-tested. Supplemental
PowerShell parser invocation was blocked by the local lean-ctx allowlist; no
allowlist was changed or bypassed. Review and run only this local staging step
before requesting any live preflight/dry-run authority.

## Separately authorized Development deployment

Command/flag and atomic native-batch source basis is the existing
[`0007 runbook`](../deployment-0007/README.md#repository-and-source-basis), pinned
CLI **3.1.0**. Do not substitute the frozen custom migration runner. The vehicle
file has no transaction=false directive, explicit transaction boundaries, concurrent
indexes or other nontransactional top-level operations. Its runtime advisory lock
is inside an RPC definition, not executed during deployment. Native SQL and the
history INSERT must be applied as one batch; no manual journal/history repair.

Required operator bindings: previously verified absolute CLI executable and hash;
trusted CA path and hash; current Dashboard confirmation of this Development
session-pooler route/project; secure process-only PGPASSWORD; the reviewed stage;
exclusive schema/history maintenance window. These are prerequisites, not newly
observed evidence. Inspect competing CLI/environment, proxy/debug/preload and TLS
overrides using the existing runbook; never print secrets or use `--yes`.

Through the existing PostgreSQL 17 verify-full read-only procedure, separately
confirm current target/session identity, active prerequisites, exact native history
0000–0007, expected dependency definitions/grants/RLS, and absence of vehicles table,
three permission entries and all nine vehicle functions. Unknown or partial prior
installation is BLOCKED, not permission to drop, repair or rerun.

With `$vehicleCli`, `$vehicleCa` and `$vehicleStage` bound to reviewed absolute paths:

```powershell
if ([string]::IsNullOrEmpty($env:PGPASSWORD)) { throw 'BLOCKED: use credential-bearing operator process' }
if ((& $vehicleCli --version).Trim() -cne '3.1.0') { throw 'BLOCKED: CLI version' }
$env:PGSSLMODE = 'verify-full'
$env:PGSSLROOTCERT = $vehicleCa
$vehicleTarget = 'postgresql://postgres.gllsiklbvqpxzucvkehw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=verify-full'
& $vehicleCli db push "--remote=$vehicleTarget" --workdir $vehicleStage --profile supabase --dns-resolver native --skip-vault --include-seed=false --include-roles=false --dry-run
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: dry-run failed' }
```

The dry-run is live read-only access and needs separate authorization. Require
**only `20261118000800_vehicles.sql` pending**, no earlier migration or other file.
Recheck staged hashes after the plan. Stop on any discrepancy. Only after separate
approval of that exact plan and new authenticated capability:

```powershell
& $vehicleCli db push "--remote=$vehicleTarget" --workdir $vehicleStage --profile supabase --dns-resolver native --skip-vault --include-seed=false --include-roles=false
if ($LASTEXITCODE -ne 0) { throw 'STOP: reconcile outcome before any further operation' }
```

No commands above were executed for this package. No `--include-all`, roles/seed,
schema sync, link, reset, history repair or insecure SSL fallback is permitted.
Retain and hash the exact deployed bytes and native-history receipt independently.

## Postflight, runtime validation and recovery

Keep both app gates unchanged. On a new independently verified read-only connection,
require exact nine-version history, one vehicle table with owner postgres and FORCE
RLS, three reviewed policies, trigger, nine invoker definitions/search paths, exact
table/column/function ACLs, uniqueness/indexes and creator/agency FKs. Confirm original
canonical provisioning execution remains denied and no prior object/permission
contract changed. Check provider schema-cache visibility without enabling the app.

Separate authorization is required for controlled test writes and authenticated HTTP
integration. Test owner and individually permissioned members; anonymous, expired,
unmapped, revoked and cross-agency callers; direct ownership changes; duplicate plates
within an agency versus the same plate in another; idempotent/reused creation keys;
concurrent version conflicts; Arabic round-trip/locale-dependent SQL character classes;
write/read-back failure and lost response. Offline parsing and mocks do not prove any
of these live behaviors. Enable the vehicle app flag only after accepted evidence and
separate approval; never activate canonical provisioning as part of this procedure.

Rollback before commit is the native transaction's responsibility. After commit,
prefer keeping the app flag OFF and preserving rows/history. No destructive down
migration or cascading cleanup is supplied. A database-level emergency stop needs
separate reviewed revocation of both RPC EXECUTE and direct table/column writes;
the app flag alone does not revoke database access.

On lost deployment response: no retry. Independently reconcile native history plus
complete object/definition/ACL state. Matching history and all objects is committed
evidence; absent history/objects is only a rollback candidate until the original
session is independently known finished. Mixed, partial or unavailable evidence stays
BLOCKED. Do not drop objects, edit history or infer rollback from an error message.
