$ErrorActionPreference='Stop'
$tokens=$null
$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'session.ps1'),[ref]$tokens,[ref]$errors)
if ($errors.Count) { $errors | ForEach-Object { Write-Output $_.Message }; throw 'Lifecycle syntax errors; no lifecycle action executed.' }
Write-Output 'PASS: lifecycle PowerShell parsed only; initialization/startup/SQL/cleanup not invoked.'
