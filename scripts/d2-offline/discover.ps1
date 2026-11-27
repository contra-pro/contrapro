[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
# Local metadata only. No daemon/service start, SQL, installation or credential reads.
$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_ComputerSystem
$drive = Get-PSDrive -Name C
$services = @(Get-Service -Name '*postgres*','*docker*' -ErrorAction SilentlyContinue | ForEach-Object { @{ name=$_.Name; status=$_.Status.ToString() } })
$ports = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in @(5432,5433,54322,54323,54329,2375,2376,3330) } | ForEach-Object { @{ port=$_.LocalPort; loopback=($_.LocalAddress -in @('127.0.0.1','::1')); pid=$_.OwningProcess } })
$installations = @()
$nativeTools = @()
foreach ($tool in @('initdb.exe','pg_ctl.exe','psql.exe')) {
  $binary = Join-Path 'C:/Program Files/PostgreSQL/17/bin' $tool
  $present = Test-Path -LiteralPath $binary
  $nativeTools += @{ name=$tool; present=$present; sha256=$(if ($present) { (Get-FileHash -LiteralPath $binary -Algorithm SHA256).Hash.ToLowerInvariant() } else { $null }) }
}
foreach ($version in @('17','18')) {
  $binary = Join-Path 'C:/Program Files/PostgreSQL' "$version/bin/postgres.exe"
  if (Test-Path -LiteralPath $binary) {
    $versionText = (& $binary --version 2>$null | Out-String).Trim()
    $installations += @{ directory=$version; version=$versionText; sha256=(Get-FileHash -LiteralPath $binary -Algorithm SHA256).Hash.ToLowerInvariant() }
  }
}
$docker = Get-Command docker -ErrorAction SilentlyContinue
$dockerResult = @{ installed=($null -ne $docker); daemonQueried=$false; status='not-installed' }
if ($docker) {
  $dockerResult.status = 'not-queried'
  if ($env:DOCKER_HOST -and $env:DOCKER_HOST -notmatch '^npipe:') {
    $dockerResult.status = 'non-named-pipe-override-not-contacted'
  } else {
    $contextHost = if ($env:DOCKER_HOST) { $env:DOCKER_HOST } else { ((& $docker.Source context inspect --format '{{.Endpoints.docker.Host}}' 2>$null) | Out-String).Trim() }
    if ($contextHost.Replace('\','/') -match '^npipe:/+\./pipe/') {
      $dockerResult.daemonQueried = $true
      $serverVersion = ((& $docker.Source version --format '{{.Server.Version}}' 2>$null) | Out-String).Trim()
      if ($LASTEXITCODE -eq 0) {
        $dockerResult.status = 'local-daemon-available'
        $dockerResult.serverVersion = $serverVersion
        $dockerResult.postgresImages = @(& $docker.Source image ls --filter 'reference=postgres:*' --filter 'reference=supabase/postgres:*' --format '{{.Repository}}:{{.Tag}} {{.ID}}' 2>$null)
        $containers = @(& $docker.Source ps -a --format '{{.Image}} {{.Ports}}' 2>$null)
        $dockerResult.postgresContainerCount = @($containers | Where-Object { $_ -match 'postgres|supabase' }).Count
      } else { $dockerResult.status = 'local-daemon-unavailable' }
    } else { $dockerResult.status = 'context-not-proven-local-named-pipe-not-contacted' }
  }
}
[ordered]@{ ramGiB=[Math]::Round($os.TotalVisibleMemorySize/1MB,2); freeRamGiB=[Math]::Round($os.FreePhysicalMemory/1MB,2); logicalCpu=$cpu.NumberOfLogicalProcessors; freeDiskGiB=[Math]::Round($drive.Free/1GB,2); services=$services; listeningPorts=$ports; installations=$installations; nativeTools=$nativeTools; docker=$dockerResult; sqlExecuted=$false; servicesStarted=$false } | ConvertTo-Json -Depth 6
