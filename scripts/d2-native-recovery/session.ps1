[CmdletBinding()]
param(
  [ValidateSet('Plan','Bind','Start','Accept','Status','Stop')][string]$Action='Plan',
  [string]$PackageSha256
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$nativeRoot='C:\Program Files\PostgreSQL\17-EtsyHunter-Test'
$sessionRoot='C:\Users\lenovo\AppData\Local\ContratPro-D2-native\pg17-54329'
$data=Join-Path $sessionRoot 'data'
$node='C:\Program Files\nodejs\node.exe'
$package=Join-Path $PSScriptRoot 'package-manifest.json'
$statePath=Join-Path $sessionRoot 'session-recovery.json'
$owner=[Security.Principal.WindowsIdentity]::GetCurrent().User
$system=[Security.Principal.SecurityIdentifier]::new('S-1-5-18')
function Hash([string]$Path) { (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
function Confirm([string]$Token) { if ((Read-Host "Type $Token for this disposable synthetic target only") -cne $Token) { throw 'No operator confirmation.' } }
function Invoke-PgCtl([string[]]$Arguments) {
  if (@(Get-ChildItem Env: | Where-Object { $_.Name -match '^PG' }).Count) { throw 'Existing PostgreSQL environment controls; do not override them.' }
  $controls=@{PGHOST='127.0.0.1';PGPORT='54329';PGDATABASE='postgres';PGUSER='d2_bootstrap';PGSSLMODE='verify-full';PGSSLROOTCERT=(Join-Path $sessionRoot 'root-ca.crt');PGPASSFILE=(Join-Path $sessionRoot 'unused-password-file');PGSERVICEFILE=(Join-Path $sessionRoot 'unused-service-file');PGSSLCERT=(Join-Path $sessionRoot 'unused-client-cert');PGSSLKEY=(Join-Path $sessionRoot 'unused-client-key')}
  foreach($key in $controls.Keys) { if (Test-Path -LiteralPath "Env:$key") { throw 'Existing PostgreSQL environment control; use approved clean private process without clearing policy.' } }
  try {
    foreach($key in $controls.Keys) { [Environment]::SetEnvironmentVariable($key,$controls[$key],'Process') }
    & (Join-Path $nativeRoot 'bin\pg_ctl.exe') @Arguments
    $script:nativeExit=$LASTEXITCODE
  } finally { foreach($key in $controls.Keys) { Remove-Item -LiteralPath "Env:$key" -ErrorAction SilentlyContinue } }
}
function Check-Private {
  $absolute=[IO.Path]::GetFullPath($sessionRoot)
  if ($absolute -cne $sessionRoot -or (Get-Item -LiteralPath $sessionRoot).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Linked/unexpected session root.' }
  if ((Get-Item -LiteralPath (Split-Path -Parent $sessionRoot)).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Linked session parent refused.' }
  $acl=Get-Acl -LiteralPath $sessionRoot
  $rules=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
  if (-not $acl.AreAccessRulesProtected -or $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -cne $owner.Value -or $rules.Count -ne 2) { throw 'Private ACL mismatch.' }
  foreach($rule in $rules) { if ($rule.IsInherited -or $rule.AccessControlType -ne 'Allow' -or $rule.IdentityReference.Value -notin @($owner.Value,$system.Value) -or $rule.FileSystemRights -ne 'FullControl') { throw 'Unexpected private ACL.' } }
}
function Read-State { Check-Private; $s=Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json; if ($s.profile -cne 'synthetic-only' -or $s.port -ne 54329 -or $s.dataDirectory -cne $data -or $s.packageHash -cne $PackageSha256) { throw 'Session binding changed.' }; return $s }
function Save-State($Value) { [IO.File]::WriteAllText($statePath,($Value|ConvertTo-Json -Depth 5),[Text.UTF8Encoding]::new($false)) }
function Own-Server {
  if (-not (Test-Path -LiteralPath (Join-Path $data 'postmaster.pid'))) { return $null }
  $lines=@(Get-Content -LiteralPath (Join-Path $data 'postmaster.pid'))
  if ($lines.Count -lt 4 -or [IO.Path]::GetFullPath($lines[1]) -ine $data -or [int]$lines[3] -ne 54329) { throw 'Postmaster binding mismatch; do not signal any process.' }
  $serverPid=[int]$lines[0]
  $process=Get-CimInstance Win32_Process -Filter "ProcessId = $serverPid"
  if (-not $process) { throw 'Stale PID needs review; no automatic adoption/retry.' }
  $command=$process.CommandLine.Replace('\','/')
  $dataArgument='(?:^|\s)-D\s+"?'+[regex]::Escape($data.Replace('\','/'))+'"?(?:\s|$)'
  if ([IO.Path]::GetFullPath($process.ExecutablePath) -ine (Join-Path $nativeRoot 'bin\postgres.exe') -or -not [regex]::IsMatch($command,$dataArgument,[Text.RegularExpressions.RegexOptions]::IgnoreCase)) { throw 'PID ownership mismatch; do not signal it.' }
  return $serverPid
}
function Stop-Own {
  $s=Read-State
  $serverPid=Own-Server
  if ($null -eq $serverPid) { Write-Host 'Disposable server already stopped.'; return }
  if ($s.pid -ne $serverPid) { throw 'Recorded PID mismatch; no stop.' }
  if (@(Get-Content -LiteralPath (Join-Path $data 'postmaster.pid'))[2] -cne [string]$s.startedUnix) { throw 'Postmaster creation time changed; no stop.' }
  Invoke-PgCtl -Arguments @('stop','-D',$data,'-m','fast','-w','-t','30')
  if ($script:nativeExit -ne 0 -or (Get-Process -Id $serverPid -ErrorAction SilentlyContinue)) { throw 'Server exit unconfirmed. Preserve evidence; no cleanup or kill fallback.' }
  $s.pid=0; $s.status='STOPPED'; Save-State $s
}
if ((Hash $node) -cne '3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5') { throw 'Node binding changed.' }
$observedPackage=Hash $package
if ($Action -eq 'Plan') {
  & $node (Join-Path $PSScriptRoot 'orchestrate.mjs') plan
  if ($LASTEXITCODE -ne 0) { throw 'Offline plan validation failed.' }
  Write-Host "Package SHA256: $observedPackage"
  Write-Host 'PLAN ONLY. No initialization, server start, SQL or deletion.'
  return
}
if ($PackageSha256 -cne $observedPackage) { throw 'Supply the exact reviewed package SHA256.' }
$manifest=Get-Content -LiteralPath $package -Raw | ConvertFrom-Json
$repository=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
foreach($file in $manifest.files) {
  $path=[IO.Path]::GetFullPath((Join-Path $repository $file.path))
  if (-not $path.StartsWith($repository+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or (Hash $path) -cne $file.sha256) { throw 'Package file binding changed.' }
}
$resources=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'resource-manifest.json') -Raw | ConvertFrom-Json
foreach($file in $resources.files) { if ((Hash (Join-Path $nativeRoot $file.file)) -cne $file.sha256) { throw 'Installed resource binding changed.' } }

if ($Action -eq 'Bind') {
  Confirm 'D2-RECOVERY-BIND'
  Check-Private
  if (@(Get-NetTCPConnection -LocalPort 54329 -State Listen -ErrorAction SilentlyContinue).Count -or $null -ne (Own-Server)) { throw 'Cluster must be stopped for binding.' }
  & $node (Join-Path $PSScriptRoot 'binding.mjs') --bind $PackageSha256
  if ($LASTEXITCODE -ne 0) { throw 'Recovery binding refused; no restart.' }
  return
}

if ($Action -eq 'Status') {
  $s=Read-State; $serverPid=Own-Server
  [pscustomobject]@{profile=$s.profile;status=$s.status;recordedPid=$s.pid;observedPid=$serverPid;port=54329;dataDirectory=$data}
  return
}
if ($Action -eq 'Stop') { Confirm 'D2-RECOVERY-STOP'; Stop-Own; return }
foreach($variable in (Get-ChildItem Env:)) {
  if ($variable.Name -match '^PG|^SUPABASE_|^NEXT_PUBLIC_SUPABASE_|^DATABASE_URL$|^NODE_DEBUG$|^NODE_TLS_REJECT_UNAUTHORIZED$|^SSLKEYLOGFILE$|^D2_BOOTSTRAP_PASSWORD$|^D2_NATIVE_AUTHORIZATION$' -or ($variable.Name -eq 'NODE_OPTIONS' -and -not [string]::IsNullOrWhiteSpace($variable.Value))) { throw 'Private process has a conflicting environment control. Do not remove enforced policy.' }
}
if ($Action -eq 'Start') {
  if (@(Get-NetTCPConnection -LocalPort 54329 -State Listen -ErrorAction SilentlyContinue).Count) { throw 'Port 54329 occupied; no adoption or alternate port.' }
  $os=Get-CimInstance Win32_OperatingSystem
  if ($os.FreePhysicalMemory/1MB -lt 2 -or (Get-PSDrive -Name C).Free/1GB -lt 10) { throw 'Require 2 GiB free RAM and 10 GiB free disk before native initialization/start.' }
}
if ($Action -eq 'Start') {
  Confirm 'D2-RECOVERY-START';$s=Read-State
  & $node (Join-Path $PSScriptRoot 'binding.mjs') --check-stopped $PackageSha256
  if ($LASTEXITCODE -ne 0) { throw 'Frozen pre-mutation cluster drift; no start.' }
  if ($s.pid -ne 0 -or $null -ne (Own-Server) -or (Hash (Join-Path $data 'postgresql.conf')) -cne $s.configHash -or (Hash (Join-Path $data 'pg_hba.conf')) -cne $s.hbaHash -or (Hash (Join-Path $data 'postgresql.auto.conf')) -cne $s.autoConfigHash) { throw 'Session busy/configuration drift. No start.' }
  Invoke-PgCtl -Arguments @('start','-D',$data,'-l',(Join-Path $sessionRoot 'startup-recovery.log'),'-w','-t','30')
  $startExit=$script:nativeExit
  $s.pid=Own-Server
  if ($s.pid) { $s.startedUnix=[string](@(Get-Content -LiteralPath (Join-Path $data 'postmaster.pid'))[2]);$s.status='RUNNING';Save-State $s }
  if ($startExit -ne 0) { if ($s.pid) { Stop-Own };throw 'Startup failed. Preserve private PID/log evidence; no automatic retry.' }
  $listeners=@(Get-NetTCPConnection -LocalPort 54329 -State Listen -ErrorAction SilentlyContinue)
  if (-not $s.pid -or $listeners.Count -ne 1 -or @($listeners | Where-Object { $_.LocalAddress -ne '127.0.0.1' -or $_.OwningProcess -ne $s.pid }).Count) { if ($s.pid) { Stop-Own };throw 'Listener identity mismatch; owned server stopped when identifiable.' }
  Write-Host "Disposable native PID: $($s.pid)"; return
}
if ($Action -eq 'Accept') {
  Confirm 'D2-NATIVE-RECOVERY-ONLY';$s=Read-State
  if ($s.pid -le 0 -or (Own-Server) -ne $s.pid) { throw 'No matching owned server.' }
  $secure=Read-Host 'NEW synthetic bootstrap password (masked)' -AsSecureString
  $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $env:D2_BOOTSTRAP_PASSWORD=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    $env:D2_NATIVE_AUTHORIZATION='D2-NATIVE-RECOVERY-ONLY'
    & $node (Join-Path $PSScriptRoot 'orchestrate.mjs') --execute $PackageSha256
    if ($LASTEXITCODE -ne 0) { throw 'Native acceptance failed; inspect private receipt. No automatic retry.' }
  } finally {
    Remove-Item Env:D2_BOOTSTRAP_PASSWORD,Env:D2_NATIVE_AUTHORIZATION -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr);$secure.Dispose()
    Stop-Own
  }
}
