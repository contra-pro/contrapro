[CmdletBinding()]
param(
  [switch]$PrepareOnly,
  [switch]$ExecuteInitialReads,
  [switch]$ExecuteMetadataReads,
  [switch]$ExecuteMetadataRecovery,
  [switch]$ExecuteConditionalReads,
  [string]$CaptureDirectory,
  [switch]$ConfirmCurrentProjectCA,
  [switch]$AcknowledgePostgresLogin,
  [switch]$ConfirmNoTargetChangesSinceMetadata
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function Test-D1NodeOptionsConflict {
  param([bool]$Present, [AllowNull()][AllowEmptyString()][string]$Value)
  return $Present -and -not [string]::IsNullOrWhiteSpace($Value)
}
$node = 'C:\Program Files\nodejs\node.exe'
$helper = Join-Path $PSScriptRoot 'd1-readonly-session.mjs'
$manifest = 'd941d752f6a42d628f251262cec8a83d52dad9f5f920b14bbc77e8e00129ef8c'
if (@(@($PrepareOnly,$ExecuteInitialReads,$ExecuteMetadataReads,$ExecuteMetadataRecovery,$ExecuteConditionalReads) | Where-Object { $_.IsPresent }).Count -gt 1) { throw 'Choose one stage only.' }
$execute = $ExecuteInitialReads -or $ExecuteMetadataReads -or $ExecuteMetadataRecovery -or $ExecuteConditionalReads
if ((Get-FileHash -LiteralPath $node -Algorithm SHA256).Hash.ToLowerInvariant() -cne '3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5') { throw 'Node binding changed.' }
if ((Get-FileHash -LiteralPath $helper -Algorithm SHA256).Hash.ToLowerInvariant() -cne '85b92e4a85ae17fa1350d61ad03438dcd951f0b2f23fe674289de753f30c6e28') { throw 'D1 supervisor binding changed.' }
& $node $helper --prepare
if ($LASTEXITCODE -ne 0) { throw 'Local bindings failed; no connection attempted.' }
$base = 'C:\Users\lenovo\AppData\Local\ContratPro-D1-evidence'
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$systemSid = [Security.Principal.SecurityIdentifier]::new('S-1-5-18')
if (-not $execute) {
  if ($CaptureDirectory) { throw 'Prepare creates a new private directory; do not supply an existing path.' }
  $CaptureDirectory = Join-Path $base ('d1-initial-' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + [Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $CaptureDirectory | Out-Null
  $acl = [Security.AccessControl.DirectorySecurity]::new()
  $acl.SetAccessRuleProtection($true, $false)
  $acl.SetOwner($sid)
  foreach ($identity in @($sid, $systemSid)) {
    $rule = [Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    $acl.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $CaptureDirectory -AclObject $acl
}
if (-not $CaptureDirectory) { throw 'Supply the private directory returned by PrepareOnly.' }
$full = [IO.Path]::GetFullPath($CaptureDirectory)
if ([IO.Path]::GetDirectoryName($full).TrimEnd('\') -cne $base -or [IO.Path]::GetFileName($full) -notmatch '^d1-initial-[A-Za-z0-9-]+$') { throw 'Capture path outside fixed private root.' }
if (((Get-Item -LiteralPath $full).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Linked capture directory refused.' }
$observed = Get-Acl -LiteralPath $full
$rules = @($observed.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
if (-not $observed.AreAccessRulesProtected -or $observed.GetOwner([Security.Principal.SecurityIdentifier]).Value -cne $sid.Value -or $rules.Count -ne 2) { throw 'Private capture ACL not established.' }
foreach ($rule in $rules) {
  if ($rule.IsInherited -or $rule.AccessControlType -ne 'Allow' -or $rule.IdentityReference.Value -notin @($sid.Value, $systemSid.Value)) { throw 'Unexpected capture access.' }
}
Write-Host "Private capture: $full"
Write-Host "Manifest: $manifest"
if (-not $execute) { Write-Host 'PREPARED ONLY: no password read, no SQL process, no connection.'; return }
if (-not $ConfirmCurrentProjectCA -or -not $AcknowledgePostgresLogin) { throw 'Confirm current project CA and acknowledge this is not a least-privilege login.' }
if (($ExecuteMetadataRecovery -or $ExecuteConditionalReads) -and -not $ConfirmNoTargetChangesSinceMetadata) { throw 'Continuation requires confirmation of no target/schema/role changes since metadata collection; otherwise stop for evidence-consistency review.' }
if (Test-D1NodeOptionsConflict -Present (Test-Path -LiteralPath Env:NODE_OPTIONS) -Value $env:NODE_OPTIONS) { throw 'Use a clean private process; conflicting variable NODE_OPTIONS exists. Do not bypass enforced policy.' }
foreach ($key in @('PGPASSWORD','NODE_DEBUG','NODE_TLS_REJECT_UNAUTHORIZED','SSLKEYLOGFILE')) {
  if (Test-Path -LiteralPath "Env:$key") { throw "Use a clean private process; conflicting variable $key exists. Do not bypass enforced policy." }
}
$confirmation = 'D1-READONLY-INITIAL'
$authorizationName = 'authorization.json'
$helperMode = '--execute-initial'
if ($ExecuteMetadataReads) {
  $confirmation = 'D1-READONLY-METADATA'
  $authorizationName = 'authorization-metadata.json'
  $helperMode = '--execute-metadata'
  Write-Host 'Eight catalogue queries only: Q1/Q2/Q3/Q4/Q5/Q6/Q7b/Q11. No Q0/Q7 replay. Six shape-dependent queries remain blocked. Administrative postgres login acknowledged.'
} elseif ($ExecuteMetadataRecovery) {
  $confirmation = 'D1-READONLY-RECOVERY'
  $authorizationName = 'authorization-recovery.json'
  $helperMode = '--execute-recovery'
  Write-Host 'Three queries only: amended Q6 explicit text cast, then original Q7b/Q11. Q0/Q7 and successful Q1-Q5 are not replayed. Six shape-dependent queries remain blocked.'
  Write-Host 'Q6 replacement SHA256: 3125f33bfd961c38597a2ac8a156eac3dd397f9e368e7db07bd6e8ebc9df15d6'
} elseif ($ExecuteConditionalReads) {
  $confirmation = 'D1-READONLY-CONDITIONAL'
  $authorizationName = 'authorization-final.json'
  $helperMode = '--execute-final'
  Write-Host 'Fixed Q13 permission/catalogue probe, then eligible Q8b/Q9/Q10/Q12a/Q12b/Q12c only. Missing SELECT or full visibility is recorded as skipped, never zero. No successful query replay.'
  Write-Host 'Q13 SHA256: 5ea6e4f753a4b8693079a2bc0c3f260786ca4873562d528a34abecb3bfbabdcc'
} else {
  Write-Host 'Initial reads only: Q0 identity/read-only session, then Q7 role flags/memberships. Remaining 14 queries will NOT run.'
}
if ((Read-Host "Type $confirmation to confirm this bounded session") -cne $confirmation) { throw 'No execution confirmation.' }
$now = [DateTime]::UtcNow
$authorization = [ordered]@{ projectRef='gllsiklbvqpxzucvkehw'; manifestHash=$manifest; currentProjectCaConfirmed=$true; postgresReadOnlyAcknowledged=$true; windowStart=$now.ToString('o'); windowEnd=$now.AddMinutes(10).ToString('o') }
if ($ExecuteMetadataReads) { $authorization.stage = 'metadata' }
if ($ExecuteMetadataRecovery) { $authorization['stage'] = 'recovery'; $authorization['replacementSha256'] = '3125f33bfd961c38597a2ac8a156eac3dd397f9e368e7db07bd6e8ebc9df15d6'; $authorization['noTargetChangesSinceMetadataConfirmed'] = $true }
if ($ExecuteConditionalReads) { $authorization['stage'] = 'final'; $authorization['permissionQuerySha256'] = '5ea6e4f753a4b8693079a2bc0c3f260786ca4873562d528a34abecb3bfbabdcc'; $authorization['noTargetChangesSinceMetadataConfirmed'] = $true }
$authorizationPath = Join-Path $full $authorizationName
if (Test-Path -LiteralPath $authorizationPath) { throw 'This capture has already been used; review it. No automatic retry.' }
[IO.File]::WriteAllText($authorizationPath, ($authorization | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
$secure = Read-Host 'Database password (hidden; never paste it into chat)' -AsSecureString
$pointer = [IntPtr]::Zero
try {
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  & $node $helper $helperMode $full
  if ($LASTEXITCODE -ne 0) { throw 'D1 stopped. Inspect private receipt; do not automatically rerun.' }
} finally {
  Remove-Item -LiteralPath Env:PGPASSWORD -ErrorAction SilentlyContinue
  if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
  $secure.Dispose()
}
