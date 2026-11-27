$ErrorActionPreference='Stop'
$tokens=$null;$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'session.ps1'),[ref]$tokens,[ref]$errors)
if ($errors.Count) { throw 'Recovery lifecycle parse failed.' }
$fn=$ast.Find({param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Stop-Own'},$true)
. ([scriptblock]::Create($fn.Extent.Text))
# All dependencies replaced by test doubles. No lifecycle/native process is invoked.
$data='synthetic-test-path';$script:nativeExit=0;$script:saved=$false;$script:invoked=$false;$script:stillRunning=$false;$script:ownPid=123
function Read-State { return [pscustomobject]@{pid=123;startedUnix='456';status='RUNNING'} }
function Own-Server { return $script:ownPid }
function Get-Content { return @('123','synthetic-test-path','456') }
function Join-Path { return 'synthetic-test-path/postmaster.pid' }
function Invoke-PgCtl { param($Arguments) if (($Arguments -join ' ') -ne 'stop -D synthetic-test-path -m fast -w -t 30') { throw 'Unexpected native args' };$script:invoked=$true }
function Get-Process { param($Id,$ErrorAction) if($script:stillRunning) { return @{Id=$Id} } }
function Save-State { param($Value) if($Value.pid -ne 0 -or $Value.status -ne 'STOPPED') {throw 'Bad stop state'};$script:saved=$true }
Stop-Own
if(-not $script:invoked -or -not $script:saved){throw 'Verified shutdown path not exercised'}
$script:saved=$false;$script:stillRunning=$true
try { Stop-Own;throw 'Expected exit refusal missing' } catch { if($_.Exception.Message -notmatch 'Server exit unconfirmed'){throw} }
if($script:saved){throw 'Unconfirmed shutdown marked stopped'}
$script:stillRunning=$false;$script:ownPid=999;$script:invoked=$false
try { Stop-Own;throw 'Expected PID refusal missing' } catch { if($_.Exception.Message -notmatch 'Recorded PID mismatch'){throw} }
if($script:invoked){throw 'Signalled mismatched PID'}
Write-Output 'PASS: recovery PowerShell syntax; mocked confirmed shutdown, exit failure and PID mismatch. No processes/SQL/state writes.'
