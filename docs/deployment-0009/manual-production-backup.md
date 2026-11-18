# Manual Production backup and SQL Editor application

Prepared only: no backup, restore or migration was executed. The sole project
`gllsiklbvqpxzucvkehw` is Production. Earlier Development labels do not apply.
No paid plan is required for this manual logical backup.

## Owner backup command (PowerShell, outside Git)

Run from a private interactive terminal without transcription, screen recording,
debugging or command/body logging. `pg_dump --password` prompts without echoing;
never put the password into the command, a URI, a repository file or chat.
The following block is for operator execution, not evidence that a backup exists.

```powershell
$ErrorActionPreference = 'Stop'
$dumpTool = 'C:\Program Files\PostgreSQL\17\bin\pg_dump.exe'
$restoreTool = 'C:\Program Files\PostgreSQL\17\bin\pg_restore.exe'
$caFile = 'C:\Users\lenovo\Downloads\prod-ca-2021.crt'
if ((Get-FileHash -LiteralPath $caFile -Algorithm SHA256).Hash -ne
    '700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7') {
  throw 'CA pin mismatch'
}
foreach ($tool in @($dumpTool, $restoreTool)) {
  if (-not (Test-Path -LiteralPath $tool -PathType Leaf)) { throw 'Missing PostgreSQL tool' }
}
# Remove ambient connection overrides in this operator process only.
foreach ($key in @('PGPASSWORD','PGPASSFILE','PGSERVICE','PGSERVICEFILE','PGOPTIONS',
                  'PGREQUIRESSL','PGSSLNEGOTIATION','PGSSLKEY','PGSSLCERT','PGSSLKEYLOGFILE')) {
  [Environment]::SetEnvironmentVariable($key, $null, 'Process')
}
$backupDir = Join-Path $env:LOCALAPPDATA ('Contratpro-Backups\' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $backupDir | Out-Null
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = Get-Acl -LiteralPath $backupDir
$acl.SetAccessRuleProtection($true, $false)
foreach ($rule in @($acl.Access)) { [void]$acl.RemoveAccessRuleSpecific($rule) }
$acl.SetOwner($sid)
$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new(
  $sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
Set-Acl -LiteralPath $backupDir -AclObject $acl
$verifiedAcl = Get-Acl -LiteralPath $backupDir
if (-not $verifiedAcl.AreAccessRulesProtected -or
    $verifiedAcl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value -or
    @($verifiedAcl.Access).Count -ne 1 -or
    $verifiedAcl.Access[0].IdentityReference.Translate(
      [Security.Principal.SecurityIdentifier]).Value -ne $sid.Value -or
    $verifiedAcl.Access[0].AccessControlType -ne 'Allow' -or
    $verifiedAcl.Access[0].FileSystemRights -ne 'FullControl') {
  throw 'Backup directory privacy not established; no database access permitted'
}
$archive = Join-Path $backupDir 'production-before-0009.dump'
$connection = "host=aws-0-eu-west-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.gllsiklbvqpxzucvkehw sslmode=verify-full sslrootcert='$caFile' connect_timeout=10"
# Whole database, one consistent snapshot; schema, data, ACLs and ownership retained.
# Do not use --enable-row-security: a permission/RLS failure must fail the backup.
& $dumpTool --dbname=$connection --password --format=custom --lock-wait-timeout=10s --file=$archive
if ($LASTEXITCODE -ne 0) { throw 'BACKUP FAILED; retain partial archive as unverified; do not migrate' }
if ((Get-Item -LiteralPath $archive).Length -eq 0) { throw 'Empty backup' }
& $restoreTool --list $archive > (Join-Path $backupDir 'archive-toc.txt')
if ($LASTEXITCODE -ne 0) { throw 'Archive listing failed' }
# Read/decompress the archive into the Windows null device; NO database target.
& $restoreTool --file=NUL $archive
if ($LASTEXITCODE -ne 0) { throw 'Archive decoding failed' }
$hash = Get-FileHash -LiteralPath $archive -Algorithm SHA256
$hash.Hash | Set-Content -LiteralPath (Join-Path $backupDir 'archive.sha256')
Get-Item -LiteralPath $archive | Select-Object FullName, Length
$hash | Select-Object Algorithm, Hash
```

Before accepting the backup, inspect `archive-toc.txt` locally: require schema and
TABLE DATA entries for `identity`, `tenancy`, and migration history, plus
`app_private` functions and applicable policies/triggers/ACLs. Include Auth data
and any Storage metadata that exist. Do not publish the dump or its table of
contents. Copy the protected archive and hash to an encrypted independent location.
If managed-schema permissions prevent a full dump, STOP and retain the failure;
do not silently exclude schemas and call the result a full recovery backup.

Archive decoding and hashing detect some corruption; they do not prove restore
success or coverage. A successful independent test restore is stronger evidence.
The archive contains private customer/Auth data and potentially stored secrets.

## Recovery (never run against Production as a test)

Use a new, isolated PostgreSQL 17/Supabase-compatible recovery target. Preserve
the original archive unchanged, verify its SHA-256, and provision the required
extensions, platform roles and ContratPro roles from reviewed definitions before
restoring. `pg_dump` does not back up cluster roles or their passwords. Historical
0000 is only a placeholder, not a complete role/bootstrap recovery script.

For a compatible empty recovery database, the restore shape is:

```powershell
# $recoveryConnection must explicitly identify the ISOLATED target and require
# verify-full with its trusted CA; it must contain no password.
& 'C:\Program Files\PostgreSQL\17\bin\pg_restore.exe' --dbname=$recoveryConnection --password --exit-on-error --single-transaction $archive
if ($LASTEXITCODE -ne 0) { throw 'Restore failed; do not treat recovery as validated' }
```

Do not use --clean, --create, --no-acl or --no-owner casually. A new hosted
Supabase project already has managed objects: review the archive TOC and use a
reviewed selection list to avoid recreating provider-owned infrastructure. Restore
application schema/data and supported Auth data in dependency order. Confirm row
counts, RLS/ACLs, ownership, mappings, authentication and application behavior.
Storage object files, project API keys/configuration and external services are not
contained in a database dump. Follow Supabase's supported recovery guidance:
https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

## Migration 0009: later owner-authorized SQL Editor application

Do not apply yet. Pause client creation and use the exact Production project's
SQL Editor as postgres. Existing reviewed source:
`supabase/migration-drafts/20261118000900_client_creation_idempotency.sql`.
SHA-256: `4080c240ae99bb24f4e798d4cf6fd095ca78108a4c1a7d3b0abe65a7cfe05da3`.
The source is forward-only and not rerunnable. It does not rewrite/backfill clients.
It adds receipts/trigger/policies, changes client validation and RPC behavior, and
temporarily grants deployment capabilities that its final assertions revoke/check.

The manual alternative to native CLI deployment is ONE complete SQL Editor batch:

```sql
BEGIN;
-- Paste the ENTIRE byte-reviewed 0009 source here, without partial selection.
INSERT INTO supabase_migrations.schema_migrations(version)
VALUES ('20261118000900');
COMMIT;
```

The INSERT follows all migration assertions and commits atomically with them.
It records the version only, not CLI statement metadata. Never run it separately,
use ON CONFLICT to suppress mismatch, or mark an unapplied file as applied. Check
that 0009 and partial 0009 objects are absent before applying. After an ambiguous
result, inspect history/catalog state before any retry. After commit, retain
receipts and history; prefer a reviewed corrective migration over destructive undo.
Verify owners, ACLs, FORCE RLS and contract marker 2/schema-cache visibility before
resuming creation. Live replay/isolation/concurrency acceptance remains unproven.

## Current local blockers

At preparation time PGPASSWORD is absent, so no database connection/backup ran.
The supplied workspace is not a Git working tree (`git status` reports no .git),
so its branch, upstream, changes and commit base cannot be established. No git init,
commit or push is attempted. Restore the original .git metadata or provide the
actual clone before staging only P3 changes. Never stage archives or credentials.
