# D2 bootstrap recovery package — offline prepared, not authorized for execution

2026-11-27. The original native package remains byte-for-byte intact, SHA-256 `d703f3c2e7a3cbaa2f3694eef85a49dad75172e568fe0dd10dcbc647b40d869d`. The separate recovery [package manifest](../scripts/d2-native-recovery/package-manifest.json) is SHA-256 **`a431ef060a9636c4165d09dae785dfc487ddaec226c42031bb6568f61dabd88a`**. It binds 19 runtime/source files and the stopped cluster's 980-file public-evidence/data snapshot. Tests are separate offline artifacts. This document requests no automatic execution; a new explicit native continuation authorization is required.

## Exact correction and unchanged coverage

The derivative driver selects **`pg_catalog.host(inet_server_addr()) AS address`**, preserving the exact accepted addresses `127.0.0.1` and `::1`. User/session role, database, PG17.11 version, 54329 port and TLS checks remain unchanged. No CIDR prefix, mapped IPv6 or additional address is accepted. The offline tests verify the projection and strict gate; native host(inet) behavior is not claimed executed in this batch.

The original baseline, fixtures, scenarios, resources and all sixteen candidates remain unchanged. Candidate manifest remains `c5f3bcaa94e92843e26a55b9069542cc9274800d003155e4aee4e4b7bfb2cdc8`. The corrected driver still performs its real zero-role/database collision checks before any bootstrap mutation; any collision stops the run. It selects no historical 0009 variant and grants no faithful-upgrade or managed Supabase authority.

## Binding and preservation contract

Recovery files are under scripts/d2-native-recovery, never substituted into scripts/d2-native. The original manifest and every original bound runtime/source hash are checked before recovery. The original stopped session record and exact ERR_ASSERTION/bootstrap/empty-events/address-assertion receipt are required. A different failure phase, any completed event, package drift, nonzero PID or wrong data/database/port/profile refuses recovery.

Before Bind and Start, all 980 frozen files must still match size/SHA-256; no postmaster.pid or recovery acceptance receipt may exist. This catches offline/manual changes or an intervening server run. The launcher also verifies private ACL, unlinked root/parent, resource hashes, original configuration/HBA/auto-config hashes, absence of an owned process/listener, and fresh 2-GiB RAM/10-GiB disk/free-port gates before Start. Bind's stopped check precedes the state transition. No original state is edited.

**Absence of bootstrap mutations:** the precise original guard failure and unchanged original source prove CREATE ROLE/CREATE DATABASE were unreachable in that attempt. The frozen data snapshot establishes no subsequent drift before startup; it is not a SQL catalogue inspection. After the separately authorized start, the corrected identity guard and original zero-collision queries must independently confirm safety before mutation. If any layer fails, recovery is rejected without reset, repair or assumption of absence. This is stronger than merely relabelling the old session hash, while honestly distinguishing control-flow proof from a native catalogue check.

Bind exclusively creates **recovery-binding.json** and **session-recovery.json**, recording original→recovery package identities. It does not overwrite session.json, acceptance-receipt.json or logs. Accept exclusively creates **acceptance-receipt-recovery.json**; existing recovery output refuses retry. Start uses **startup-recovery.log**. Original startup/receipt/session/certificate and old server-log hashes remain checked while the server is running; new server log files may be created by the unchanged collector configuration. Normal cluster data changes during the authorized run are expected; full stopped-tree comparison is not repeated after mutations.

The launcher retains exact PID/executable/data argument/creation-time shutdown verification and invokes Stop in Accept's finally path. It has **no Initialize or Cleanup action**. If shutdown cannot confirm exit, it fails rather than claims stopped or deletes data. No policy/environment guard is cleared. Partial bind/failure is retained and refused on retry. Current private data, key and old failure evidence were not modified by package preparation.

## Exact proposed owner-operated procedure

**Do not run until the owner separately authorizes this exact recovery hash.** Use the approved private PowerShell 7 terminal with existing policy and no transcript/debug recording. No new password is created: Accept uses the existing synthetic-only bootstrap password at its masked prompt, never in chat/argv/files. No reinitialization or deletion is involved.

```powershell
Set-Location -LiteralPath 'C:\Users\lenovo\contratpro'
$D2RecoverySha = 'a431ef060a9636c4165d09dae785dfc487ddaec226c42031bb6568f61dabd88a'

# Offline plan, no cluster state change:
& '.\scripts\d2-native-recovery\session.ps1' -Action Plan

# Next separately authorized batch; run one action at a time, stop on failure:
& '.\scripts\d2-native-recovery\session.ps1' -Action Bind -PackageSha256 $D2RecoverySha
& '.\scripts\d2-native-recovery\session.ps1' -Action Start -PackageSha256 $D2RecoverySha
& '.\scripts\d2-native-recovery\session.ps1' -Action Status -PackageSha256 $D2RecoverySha
& '.\scripts\d2-native-recovery\session.ps1' -Action Accept -PackageSha256 $D2RecoverySha

# Only if an owned server still needs stopping or Start was not followed by Accept:
& '.\scripts\d2-native-recovery\session.ps1' -Action Stop -PackageSha256 $D2RecoverySha
```

Tokens: **D2-RECOVERY-BIND**, **D2-RECOVERY-START**, **D2-NATIVE-RECOVERY-ONLY**, **D2-RECOVERY-STOP**. Status has no confirmation token. Accept retains verified shutdown in finally. No unattended retry or policy workaround is supported. If a command is rejected, report that exact rejection rather than switching launchers. Cleanup still requires separate owner permission and is absent from this package.

## Verification and exact changed files

Added recovery runtime files: session.ps1, orchestrate.mjs, binding.mjs, package-manifest.json; byte-identical derivative copies of resources.mjs/resource-manifest.json, baseline.mjs/baseline-sources.json, provider-fixture.sql, receipt-model.sql and scenarios.mjs; focused recovery.test.mjs and stop.test.ps1. Offline build/binding templates are scripts/d2-recovery-build.mjs and scripts/d2-recovery-binding-template.mjs; the emitted pinned runtime manifest, not an unchecked regeneration, is the execution artifact. Documentation: this procedure, D2 acceptance report and MVP tracker. No original package/candidate/database installation file changed.

Eight Node tests pass: IPv4/IPv6 host projection and strict addresses, every other identity assertion, no mutation after guard failure, exact pre-mutation failure eligibility, original/recovery/resource/candidate integrity, distinct exclusive receipts/no initialize/delete action, explicit authorization refusal and byte-identical baseline/scenario preservation. Native SQL normalization is represented by the explicit host() projection and SQL AST, not by a fabricated native test. PowerShell AST and mocked stop tests pass for confirmed exit, failure-to-exit and mismatched PID. Package validation checks frozen data/evidence and all resources read-only. No Bind, Start, Accept, SQL, initdb, cleanup, private-key read or environment-policy change occurred. Original and recovery cluster evidence stays private.

**Remaining blockers:** one separately authorized recovery execution using this pinned hash; resource gates must pass again; no native outcome is yet known. A failure or intervening state change requires evidence review, never an automatic rerun. Historical 0008/0009 provenance remains unresolved and managed migrations prohibited.
