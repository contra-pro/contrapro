import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const script=await readFile(new URL('./a02-private-evidence.ps1',import.meta.url),'utf8');
test('initializer requires an absolute local path, outside repository/Git and without reparse points',()=>{
  for(const marker of ['Assert-EvidencePath','GetFullPath','ReparsePoint',"'.git'","DriveFormat -ne 'NTFS'","DriveType -ne 'Fixed'"])
    assert.ok(script.includes(marker));
  assert.match(script,/Parameter\(Mandatory=\$true\).*\$EvidencePath/);
  assert.match(script,/if \(Test-Path -LiteralPath \$root\) \{ throw/);
});
test('restrictive DACL precedes file writes and is verified for directory and files',()=>{
  assert.ok(script.indexOf('$directory.Create($security)')<script.indexOf('[IO.File]::Open'));
  for(const marker of ['SetAccessRuleProtection($true,$false)','GetCurrent().User','GetOwner(',"$rules.Count -ne 1",'Assert-PrivateAcl $root $sid','Assert-PrivateAcl $file $sid','FileMode]::CreateNew'])assert.ok(script.includes(marker));
  assert.match(script,/catch \{[\s\S]*Write-Output 'A02_PRIVATE_EVIDENCE_BLOCKED'[\s\S]*exit 1/);
});
test('fixed distinct templates never collect credentials, sessions or arbitrary diagnostic payloads',()=>{
  for(const marker of ['execution-manifest.json','observation-manifest.json','ownership-reference.json','credential-channel-reference.json','destination-reference.json',"$record.operations=@()","$record.captures=@()","$record.captureStatus='NOT_STARTED'","reviewReceipt='UNBOUND'",'liveExecutionAuthorized=$false'])assert.ok(script.includes(marker));
  assert.doesNotMatch(script,/\b(Read-Host|Get-Credential|Invoke-WebRequest|Invoke-RestMethod|psql|supabase\.exe|Remove-Item)\b/i);
  assert.doesNotMatch(script,/\$env:|access_token\s*=|refresh_token\s*=|password\s*=/i);
});
test('verification mode does not enter creation branch; no privacy result is presumed',()=>{
  assert.match(script,/if \(-not \$VerifyOnly\)/);assert.match(script,/Assert-PrivateAcl \$root \$sid/);
  assert.ok(script.indexOf("status='PASS'")>script.lastIndexOf('Assert-PrivateAcl $file $sid'));
});
