# Development 0007 native deployment package

Status: **BLOCKED pending operator evidence**. Preparation only; nothing here has
been deployed or activated. Approved target scope is gllsiklbvqpxzucvkehw only.
No apply script, custom migration runner, history repair, grants or activation
commands are included. The commands below are proposals for a later authorized run.

## Repository and source basis

- Existing `scripts/preflight-canonical-0007.sql` owns the read-only preflight;
  its successful exit still requires manual predicate review.
- `scripts/check-supabase-pooler-tls.ps1` is a TLS diagnostic, not a database
  target proof or substitute for the actual CLI connection's verify-full policy.
- `scripts/supabase-readonly-discovery.mjs` targets fresh bootstrap discovery;
  its collision verdict is not a 0007 deployment acceptance test. Do not run it
  as a migration runner or reinterpret expected existing schemas as failures.
- `docs/migration-execution.md` describes a historical custom runner. Do not use
  that runner, its journal or manifest for native 0007. Earlier native docs calling
  0004-0006 pending are historical; supplied current state is deployed 0000-0006,
  to be confirmed by native history rather than documentation or `.temp/cli-latest`.
- `supabase/config.toml` is deliberately small: local project label, PostgreSQL 17,
  migrations enabled, no declarative schema paths, seed disabled. The label is
  NOT a hosted project reference. No link or hosted settings push is needed for
  the explicit URL path below. v3.1.0 can load defaults without a config file;
  this file makes the intended migration/seed settings reviewable instead.

Pinned upstream sources (v3.1.0, release commit prefix d4fc0e5):

| Source | Supported conclusion |
| --- | --- |
| [Release](https://github.com/supabase/cli/releases/tag/v3.1.0) | Version identity; release notes alone are not a TLS or transaction proof. |
| [Target flags](https://github.com/supabase/cli/blob/v3.1.0/apps/cli/src/command-internal/target/target-flags.ts#L94-L173) | `--remote=<url>` explicitly selects a database; no bare remote/default/local target. |
| [Push command](https://github.com/supabase/cli/blob/v3.1.0/apps/cli/src/commands/db/push/push.command.ts#L16-L45) | dry-run, skip-vault, role/seed flags. |
| [Config loader](https://github.com/supabase/cli/blob/v3.1.0/apps/cli/src/command-internal/db-config.read.ts#L38-L101) | Missing-config defaults, migration and seed configuration. |
| [Connection parser](https://github.com/supabase/cli/blob/v3.1.0/apps/cli/src/command-internal/db-config.parse.ts#L262-L283) | An omitted URL password resolves through PGPASSWORD, then password-file fallback. No password belongs in argv. |
| [URL resolver](https://github.com/supabase/cli/blob/v3.1.0/apps/cli/src/command-internal/db-config.layer.ts#L783-L818) | Explicit URL uses layered project environment; it does not use linked-project credential minting. |
| [TLS driver](https://github.com/supabase/cli/blob/v3.1.0/apps/cli/src/command-internal/db-connection.sql-pg.layer.ts#L398-L476) | verify-full checks certificate chain and hostname and offers only TLS. Root-cert read failures abort (lines 695-721). |
| [Linked TLS defaults](https://github.com/supabase/cli/blob/v3.1.0/apps/cli/src/command-internal/supabase-tls.ts#L14-L32) | Default linked CA pinning is verify-ca, insufficient here. Never use it as fallback. |
| [Migration executor](https://github.com/supabase/cli/blob/v3.1.0/apps/cli/src/command-internal/migration-apply.ts#L339-L534) | Normal compatible statements accumulate in one batch; history INSERT is appended before execBatch. Explicit transaction control, transaction=false and incompatible statements select different paths. None are present in reviewed 0007. Do not add wrappers. |
| [Batch driver](https://github.com/supabase/cli/blob/v3.1.0/apps/cli/src/command-internal/db-connection.sql-pg.layer.ts#L238-L270) | Parse/Bind/Execute operations share one final Sync. Together with the reviewed compatible file this supports atomic SQL plus history recording. |
| [Push core](https://github.com/supabase/cli/blob/v3.1.0/apps/cli/src/command-internal/db-push-core.ts#L118-L269) | Pending history is read before the plan; apply recalculates and presents its own plan. dry-run still connects. No built-in exact-one-pending assertion is supplied here. |

This source review supersedes reliance on the older Go v2 executor for this pin.
Source evidence is not observed live rollback/durability evidence. Obtain and
verify the actual binary/package and its release checksum before any connection.

## Operator inputs and GO evidence

Record in a separate approved evidence record; do not replace nulls with guesses:

1. Absolute CLI binary path, exact output 3.1.0, official artifact checksum and
   local binary SHA-256. The `.temp/cli-latest` cache is not a version pin.
2. Control-plane confirmation that project gllsiklbvqpxzucvkehw is Development,
   plus its current session-pooler hostname/port/routing username and PostgreSQL 17.
   Confirm the manifest's fixed endpoint; if different, STOP and revise the package.
3. Trusted CA file from an approved provider source, certificate validity and its
   SHA-256. It must validate the exact pooler hostname, not just its chain.
4. Database password supplied in the operator process's PGPASSWORD only; no URL
   password, pasted token, chat secret, CLI password flag or debug log.
5. Expected database OID/backend fingerprint captured by approved read-only access;
   backend PID is session-local, not permanent project identity. Shared-host TLS and
   a routing username alone do not establish project isolation.
6. All eight local migration raw-byte hashes matching manifest.json, including
   0007 bdd01b22180cd805f2bef1f80863c22d2c5857c3cad10f97f392fa55161e53bc.
7. Exact native history 0000-0006, required object absence, all preflight checks and
   complete manual comparison of five existing policy predicates with 0003-0005.
8. Maintenance window with no other schema/history writers, unchanged migration
   directory between plan and apply, reviewed effective CLI config/environment.
   There is no assumed shared advisory lock with the historical custom runner.

Use an isolated operator process. Inspect config precedence without printing secret
values: no config.json/config.jsonc competing with TOML, remotes overrides, project
`.env*` overrides, PGSERVICE/PGSERVICEFILE, PGOPTIONS, client-cert or multi-host
overrides, SUPABASE_* configuration/yes/target overrides, NODE_OPTIONS or
NODE_TLS_REJECT_UNAUTHORIZED=0. Resolve any such inputs before GO. Keep the
provisioning flag off; do not change other application verification flags.

Offline raw-byte verification, from the workspace root (does not run Supabase):

```powershell
$manifest0007 = Get-Content -Raw docs/deployment-0007/manifest.json | ConvertFrom-Json
foreach ($artifact0007 in $manifest0007.migrations) {
  $digest0007 = (Get-FileHash -LiteralPath $artifact0007.file -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($digest0007 -cne $artifact0007.sha256) { throw "BLOCKED: migration hash mismatch" }
}
```

This checks the reviewed local bytes, not live native-history provenance or pending
state. Verify the directory contains exactly the eight manifest files as well.

## Proposed commands — NOT executed, blocked until evidence is accepted

Run from C:\Users\lenovo\contratpro. `$cli0007` is the reviewed absolute v3.1.0
binary path; `$ca0007` is the reviewed absolute trusted CA path. PGPASSWORD must
already be supplied securely. No installation or CLI invocation occurred here.

```powershell
& $cli0007 --version
$env:PGSSLMODE = 'verify-full'
$env:PGSSLROOTCERT = $ca0007
$env:PGHOST = 'aws-0-eu-west-1.pooler.supabase.com'
$env:PGPORT = '5432'
$env:PGDATABASE = 'postgres'
$env:PGUSER = 'postgres.gllsiklbvqpxzucvkehw'
$target0007 = 'postgresql://postgres.gllsiklbvqpxzucvkehw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=verify-full'
psql -X -v ON_ERROR_STOP=1 -f scripts/preflight-canonical-0007.sql
```

Stop on nonzero exit, any BLOCKED output or failed manual review. The preflight
requires existing native history; no table creation/adoption/repair is authorized.
An approved supplemental read-only identity query can capture the fingerprint:

```sql
SELECT current_database(), (SELECT oid FROM pg_catalog.pg_database
 WHERE datname=current_database()) AS database_oid,
 session_user, current_user, inet_server_addr(), inet_server_port(),
 current_setting('server_version_num'), pg_is_in_recovery();
```

Plan (connects to Development; not an offline command):

```powershell
& $cli0007 db push "--remote=$target0007" --workdir 'C:\Users\lenovo\contratpro' --profile supabase --dns-resolver native --skip-vault --include-seed=false --include-roles=false --dry-run
```

Accept ONLY 20261116000700_canonical_provisioning.sql, no roles/seed/vault changes.
No `--include-all`, `--yes`, reset, repair, bootstrap or schema-sync. Review all
output; do not run CLI-suggested repair commands. If the plan is empty or has
another migration, STOP. Capture plan and local hashes again immediately before
the mutation. Independently approve the actual mutation prompt's same one-file plan.

Proposed native deployment command, after separate authorization:

```powershell
& $cli0007 db push "--remote=$target0007" --workdir 'C:\Users\lenovo\contratpro' --profile supabase --dns-resolver native --skip-vault --include-seed=false --include-roles=false
```

The URL contains no password. The explicit sslmode overrides environment/service
defaults; the CA is supplied by PGSSLROOTCERT. Do not replace hostname with an IP,
use a tunnel, omit --remote, use cached linking, or weaken TLS to make it work.
The native executor owns SQL+history atomicity; psql is only for read-only checks.
Native history-table setup/reset operations outside the file batch are not claimed
to be atomic with 0007; preflight requires history already present.

## Post-deployment and unknown-commit reconciliation

Keep all provisioning execution denied and application provisioning disabled.
Use a NEW verify-full read-only connection to the same confirmed target:

```powershell
psql -X -v ON_ERROR_STOP=1 -f scripts/postflight-canonical-0007.sql
```

Review every catalog row and compare definitions/ACLs/policies with immutable 0007.
Exit 0 is evidence collection only, not acceptance. Require exact history 0000-0007,
two expected functions with correct owners/settings, restricted writer membership,
four expected policies, FORCE RLS, no unexpected grants or direct identity writes.
Bridge EXECUTE belongs only to its owner and writer; ordinary callers, including
authenticated, must still lack provisioning EXECUTE. Do not invoke either function.

If the deployment connection/acknowledgement is lost, do NOT rerun apply:

| New read-only evidence | Decision |
| --- | --- |
| 0007 history present and all expected catalogs/definitions match | Treat as committed after operator review; never replay. |
| 0007 absent and writer/functions/four policies all absent, prior history intact | Candidate rolled-back state; require completed-session confirmation and renewed preflight/authorization before any later attempt. |
| Mixed history/object state, query failure, wrong target, still-running deployment | BLOCKED; investigate without repair, drops, history changes or retries. |

For absent-history reconciliation, run the existing preflight after confirming the
original deployment session is finished; it checks exact absence and prior history.
For present-history reconciliation use postflight. Neither may infer the result
from an error message alone. Preserve failed attempt evidence and classify the
commit outcome explicitly. Do not use global row counts as an orphan-proof claim.

## Non-destructive disable and activation boundary

This package deploys an inert capability: no authenticated EXECUTE grant or gate
activation. On any failed postflight, keep provisioning off and stop. Do not delete
canonical users, mappings, role, functions or migration history as rollback.
If a later separately activated installation needs disabling: turn provisioning
off, separately authorize owner-capable revocation of authenticated EXECUTE on
public.contratpro_provision_identity(), then verify effective denial. No temporary
writer SET authority or executable REVOKE procedure is invented in this package.

Deployment is not runtime approval. Before activation, separately prove gateway
session/role/JWT context, anonymous/expired/cross-user denial, one mapping/user under
concurrency, injected failure without orphan records and lost-response reconciliation.
No live fault-injection or gateway-context harness is supplied; those remain blockers
for activation, along with the reviewed Provision UI caller and independent app gates.

## Verdict and next action

BLOCKED until binary/CA provenance, current target/session-pooler identity, CLI
configuration parsing and live preflight/one-file dry-run evidence are accepted.
The commands are source-supported proposals, not an authorization or observed run.

Next action: review this package and supply the approved v3.1.0 artifact checksum,
trusted CA fingerprint and Development control-plane connection identity, then
separately authorize only the bounded read-only preflight and native dry-run.
