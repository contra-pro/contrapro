# Offline local preparation ONLY. Never reads credentials or invokes a network tool.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$EvidencePath,
  [switch]$VerifyOnly
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
function Assert-EvidencePath([string]$Candidate) {
  if ($Candidate -notmatch '^[A-Za-z]:\\' -or $Candidate -match '[\x00-\x1f]' -or $Candidate.Contains('..')) { throw 'A02_PRIVATE_EVIDENCE_BLOCKED' }
  $resolved = [IO.Path]::GetFullPath($Candidate).TrimEnd('\')
  $workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
  if ($resolved -eq $workspace -or $resolved.StartsWith($workspace+'\',[StringComparison]::OrdinalIgnoreCase) -or
      $workspace.StartsWith($resolved+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'A02_PRIVATE_EVIDENCE_BLOCKED' }
  $drive = New-Object IO.DriveInfo ([IO.Path]::GetPathRoot($resolved))
  if ($drive.DriveType -ne 'Fixed' -or $drive.DriveFormat -ne 'NTFS') { throw 'A02_PRIVATE_EVIDENCE_BLOCKED' }
  $cursor = $resolved
  while ($cursor) {
    if (Test-Path -LiteralPath $cursor) {
      $item = Get-Item -LiteralPath $cursor -Force
      if (-not $item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -or
          (Test-Path -LiteralPath (Join-Path $cursor '.git'))) { throw 'A02_PRIVATE_EVIDENCE_BLOCKED' }
    }
    $parent = [IO.Directory]::GetParent($cursor)
    if ($null -eq $parent) { break }; $cursor = $parent.FullName
  }
  return $resolved
}
function Assert-PrivateAcl([string]$Path,[Security.Principal.SecurityIdentifier]$Sid) {
  $item = Get-Item -LiteralPath $Path -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'A02_PRIVATE_EVIDENCE_BLOCKED' }
  $acl = Get-Acl -LiteralPath $Path
  if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $Sid.Value) { throw 'A02_PRIVATE_EVIDENCE_BLOCKED' }
  $rules = @($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
  if ($rules.Count -ne 1 -or $rules[0].IdentityReference.Value -ne $Sid.Value -or
      $rules[0].AccessControlType -ne 'Allow' -or $rules[0].FileSystemRights -ne 'FullControl') { throw 'A02_PRIVATE_EVIDENCE_BLOCKED' }
  if ($item.PSIsContainer -and (-not $acl.AreAccessRulesProtected -or $rules[0].IsInherited -or
      $rules[0].InheritanceFlags -ne 'ContainerInherit, ObjectInherit' -or $rules[0].PropagationFlags -ne 'None')) { throw 'A02_PRIVATE_EVIDENCE_BLOCKED' }
}
try {
  $root = Assert-EvidencePath $EvidencePath
  $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $names = @('ownership-reference.json','credential-channel-reference.json','destination-reference.json','execution-manifest.json','observation-manifest.json')
  if (-not $VerifyOnly) {
    if (Test-Path -LiteralPath $root) { throw 'A02_PRIVATE_EVIDENCE_BLOCKED' }
    $parent = Split-Path -Parent $root
    if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw 'A02_PRIVATE_EVIDENCE_BLOCKED' }
    $security = New-Object Security.AccessControl.DirectorySecurity
    $security.SetOwner($sid)
    $security.SetAccessRuleProtection($true,$false)
    $rule = New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
    $security.AddAccessRule($rule)
    # Windows PowerShell/.NET Framework creates the directory with its restrictive ACL.
    $directory = New-Object IO.DirectoryInfo($root)
    $directory.Create($security)
    Assert-PrivateAcl $root $sid
    $common = [ordered]@{schemaVersion=1;projectRef='gllsiklbvqpxzucvkehw';status='TEMPLATE_ONLY_NOT_EVIDENCE';operator='project owner';runReference='UNBOUND';liveExecutionAuthorized=$false;reviewReceipt='UNBOUND'}
    foreach ($name in $names) {
      $record = [ordered]@{}; foreach ($key in $common.Keys) { $record[$key]=$common[$key] }
      switch ($name) {
        'ownership-reference.json' { $record.kind='ownership';$record.operatorStatement='Three operator-controlled inboxes available';$record.labels=@('A','B','U');$record.ownershipVerificationReceipt='UNBOUND';$record.approvedDomain='UNBOUND' }
        'credential-channel-reference.json' { $record.kind='credential-channel';$record.method='existing hidden interactive A/B/U input; memory-only providers';$record.adminHeaderChannelReference='UNBOUND';$record.credentialsPersisted=$false }
        'destination-reference.json' { $record.kind='evidence-destination';$record.absoluteDirectory=$root;$record.permissionModel='NTFS current Windows user only; protected directory DACL';$record.independentCaptureReview='UNBOUND' }
        'execution-manifest.json' { $record.kind='execution';$record.startedAtUtc='UNBOUND';$record.endedAtUtc='UNBOUND';$record.operations=@();$record.captureStatus='NOT_STARTED' }
        'observation-manifest.json' { $record.kind='independent-observation';$record.startedAtUtc='UNBOUND';$record.endedAtUtc='UNBOUND';$record.captures=@();$record.captureStatus='NOT_STARTED';$record.independence='Separate capture from mutation process; same human operator' }
      }
      $file = Join-Path $root $name
      $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($record | ConvertTo-Json -Depth 5))
      $stream = [IO.File]::Open($file,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
      try { $stream.Write($bytes,0,$bytes.Length) } finally { $stream.Dispose() }
      Assert-PrivateAcl $file $sid
    }
  }
  Assert-PrivateAcl $root $sid
  if (@(Get-ChildItem -LiteralPath $root -Force).Count -ne $names.Count) { throw 'A02_PRIVATE_EVIDENCE_BLOCKED' }
  $hashes = [ordered]@{}
  foreach ($name in $names) {
    $file = Join-Path $root $name
    Assert-PrivateAcl $file $sid
    $hashes[$name] = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
  }
  [ordered]@{status='PASS';absoluteDirectory=$root;permissionVerification='OWNER_ONLY_NTFS_DACL_PASS';files=$hashes;liveExecutionAuthorized=$false} | ConvertTo-Json -Depth 5
} catch {
  # Do not echo paths, exceptions or file contents on failure. No automatic deletion.
  Write-Output 'A02_PRIVATE_EVIDENCE_BLOCKED'
  exit 1
}
