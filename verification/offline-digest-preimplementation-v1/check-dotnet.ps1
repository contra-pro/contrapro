# Third primitive path only; does NOT independently assemble canonical/frame bytes.
# Windows .NET SHA256 API; no provider, network, application or database operations.
$ErrorActionPreference = 'Stop'
$referenceRoot = $PSScriptRoot
$answers = Get-Content -Raw -LiteralPath (Join-Path $referenceRoot 'known-answers.json') | ConvertFrom-Json
$inputs = Get-Content -Raw -LiteralPath (Join-Path $referenceRoot 'corpus-input.json') | ConvertFrom-Json
$disagreements = [System.Collections.Generic.List[string]]::new()
$referenceChecks = 0
function Check-Sha([string]$Label, [string]$Hex, [string]$Expected) {
    $bytes = [Convert]::FromHexString($Hex)
    $actual = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
    $script:referenceChecks++
    if ($actual -cne $Expected) { $script:disagreements.Add($Label) }
}
foreach ($kat in $answers.primitiveKnownAnswers) { Check-Sha 'primitive' $kat.inputHex $kat.expected }
foreach ($vector in $answers.vectors) {
    if ($vector.result.status -ne 'integrity-match-unverified') { continue }
    if ($null -ne $vector.framedHex) { Check-Sha $vector.id $vector.framedHex $vector.digest.value }
    if ($null -ne $vector.rawSha256) { Check-Sha $vector.id $vector.payloadHex $vector.rawSha256 }
    foreach ($record in $vector.records) {
        $hex = [Convert]::ToHexString([Text.Encoding]::UTF8.GetBytes($record.canonicalUtf8)).ToLowerInvariant()
        if ($hex -cne $record.canonicalHex) { $disagreements.Add($vector.id + ':utf8') }
        Check-Sha ($vector.id + ':' + $record.name) $record.framedHex $record.digest.value
    }
    if ($null -ne $vector.rawPdfChecksum) {
        $original = $inputs.vectors | Where-Object id -EQ $vector.id
        Check-Sha ($vector.id + ':raw') $original.pdfHex $vector.rawPdfChecksum.value
    }
}
$report = [ordered]@{
    status = 'THIRD-PRIMITIVE-CROSS-CHECK-NOT-APPROVAL'
    ownerApproved = $false
    powershell = $PSVersionTable.PSVersion.ToString()
    dotnet = [Runtime.InteropServices.RuntimeInformation]::FrameworkDescription
    os = [Runtime.InteropServices.RuntimeInformation]::OSDescription
    api = 'System.Security.Cryptography.SHA256.HashData'
    checks = $referenceChecks
    scope = 'Agreed complete byte inputs checked through a third runtime API; no independent encoder/framer claim'
    discrepancies = @($disagreements)
}
$report | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 -LiteralPath (Join-Path $referenceRoot 'dotnet-report.json')
Write-Output ('Checks: ' + $referenceChecks + '; discrepancies: ' + $disagreements.Count)
if ($disagreements.Count -ne 0) { exit 1 }
