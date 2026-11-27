[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
# Explicit installation roots only. Never recurse into existing data, invoke pg_config or connect.
$roots = @('C:/Program Files/PostgreSQL/17','C:/Program Files/PostgreSQL/17-EtsyHunter-Test','C:/Program Files/PostgreSQL/18','C:/Users/lenovo/AppData/Local/Programs/PostgreSQL/17')
$results = @()
foreach ($base in $roots) {
  if (-not (Test-Path -LiteralPath $base -PathType Container)) { continue }
  $program = Join-Path $base 'bin/postgres.exe'
  $version = if (Test-Path -LiteralPath $program) { ((& $program --version 2>$null) | Out-String).Trim() } else { 'no-server-program' }
  $programs = @{}
  foreach ($tool in @('postgres.exe','initdb.exe','pg_ctl.exe','psql.exe')) {
    $toolPath = Join-Path $base ('bin/'+$tool)
    if (Test-Path -LiteralPath $toolPath) { $programs[$tool] = (Get-FileHash -LiteralPath $toolPath -Algorithm SHA256).Hash.ToLowerInvariant() }
  }
  $shares = @()
  foreach ($relative in @('share','share/postgresql','installer/server/share','installer/server/share/postgresql')) {
    $share = Join-Path $base $relative
    if (Test-Path -LiteralPath $share -PathType Container) {
      $files = @{}
      foreach ($file in @('postgres.bki','postgresql.conf.sample','pg_hba.conf.sample','system_functions.sql','system_views.sql','information_schema.sql','sql_features.txt','extension/plpgsql.control','extension/plpgsql--1.0.sql','extension/pgcrypto.control','extension/pgcrypto--1.3.sql','extension/uuid-ossp.control','extension/uuid-ossp--1.1.sql')) {
        $path = Join-Path $share $file
        $files[$file] = if (Test-Path -LiteralPath $path -PathType Leaf) { @{present=$true;sha256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()} } else { @{present=$false} }
      }
      $bki = Join-Path $share 'postgres.bki'
      $header = if (Test-Path -LiteralPath $bki) { (Get-Content -LiteralPath $bki -TotalCount 1) } else { $null }
      $shares += @{ path=$share; bkiHeader=$header; files=$files }
    }
  }
  $libraries = @{}
  foreach ($file in @('lib/plpgsql.dll','lib/pgcrypto.dll','lib/uuid-ossp.dll','lib/postgresql/plpgsql.dll','lib/postgresql/pgcrypto.dll','lib/postgresql/uuid-ossp.dll')) {
    $path = Join-Path $base $file
    $libraries[$file] = if (Test-Path -LiteralPath $path -PathType Leaf) { @{present=$true;sha256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()} } else { @{present=$false} }
  }
  $results += @{ root=$base; version=$version; programs=$programs; shares=$shares; libraries=$libraries; existingDataInspected=$false }
}
$archives = @(Get-ChildItem -LiteralPath 'C:/Users/lenovo/Downloads' -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '(?i)(?:postgres|pgsql).*17' -and $_.Extension -in @('.zip','.exe','.7z') } | ForEach-Object { @{ name=$_.Name; bytes=$_.Length; status='metadata only; not extracted or executed' } })
$os=Get-CimInstance Win32_OperatingSystem
$disk=Get-PSDrive -Name C
$port=@(Get-NetTCPConnection -LocalPort 54329 -State Listen -ErrorAction SilentlyContinue)
@{ installations=$results; archives=$archives; freeRamGiB=[Math]::Round($os.FreePhysicalMemory/1MB,2); freeDiskGiB=[Math]::Round($disk.Free/1GB,2); port54329Available=($port.Count -eq 0); sqlExecuted=$false; pgConfigInvoked=$false } | ConvertTo-Json -Depth 8
