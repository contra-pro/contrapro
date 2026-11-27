$ErrorActionPreference = 'Stop'
# Extract only the pure predicate. Never execute the operator, read credentials or launch psql.
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'd1-readonly-operator.ps1'), [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw 'Operator parse failed.' }
$predicate = $ast.Find({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Test-D1NodeOptionsConflict' }, $true)
if (-not $predicate) { throw 'Missing runtime predicate.' }
. ([scriptblock]::Create($predicate.Extent.Text))
$cases = @(
  @{ Present=$false; Value=$null; Expected=$false },
  @{ Present=$true; Value=''; Expected=$false },
  @{ Present=$true; Value=" `t`r`n"; Expected=$false },
  @{ Present=$true; Value=([string][char]0x85 + [char]0x2003); Expected=$false }
)
foreach ($value in @('--require=./isolate.cjs','--import=./hook.mjs','--inspect','--cpu-prof',' --require=./hook.cjs  ','--dns-result-order=ipv4first','--unknown'," `t--inspect --unknown ")) {
  $cases += @{ Present=$true; Value=$value; Expected=$true }
}
foreach ($case in $cases) {
  if ((Test-D1NodeOptionsConflict -Present $case.Present -Value $case.Value) -ne $case.Expected) { throw 'Runtime gate regression.' }
}
Write-Output "PASS: $($cases.Count) PowerShell runtime cases; operator not executed; no environment changes or remote connection."
