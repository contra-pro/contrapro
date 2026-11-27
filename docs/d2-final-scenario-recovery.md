# D2 committed-0028 scenario-only recovery

2026-11-27 UTC. Offline preparation only; no SQL, PostgreSQL startup, retry, fixture/password change, migration replay, deletion or remote access occurred.

## Actual evidence and diagnosis

Private acceptance-receipt-0023.json belongs to package `364846e3baefa950d7f212ba875125bb78f3fa05594b0a189f3638c94451918d`. It records six APPLIED_TO_SYNTHETIC_ONLY events, 0023–0028, whose hashes match the pinned six-candidate manifest. The driver records these only after each SQL call including COMMIT returns. Together with the preceding ten accepted events, **all 16 migrations 0013–0028 committed**. No candidate is changed or replayed in this recovery.

| Migration | Native result | Recorded business phase |
| --- | --- | --- |
| 0023 | COMMITTED, declared object/RLS/preservation/history and authority checks completed | No dedicated scenario (false) |
| 0024 | COMMITTED, same checks | No dedicated scenario (false) |
| 0025 | COMMITTED, same checks including new-role restoration | No dedicated scenario (false) |
| 0026 | COMMITTED, same checks | No dedicated scenario (false) |
| 0027 | COMMITTED, same checks | PASS: profile save/get, subject separation, direct-private denial |
| 0028 | COMMITTED, same checks; driver authority comparison/permission refresh returned before scenarios-0028 | Business sequence stopped; not passed |

Failure: scenarios-0028, **22023 / exec_stmt_raise / Invalid**, no position supplied. Private log data/log/d2-20261127130750.log records Invalid at 13:08:47.766 GMT. The earlier personal_profiles permission denial is the expected 0027 negative test, not this failure. Log configuration supplies no statement/context; the precise operation is localized by source/control flow rather than a logged statement pointer.

The old harness creates client firstName D2 / lastName Synthetic, whose document/signing name is **D2 Synthetic**, then submits **D2 Native Client** in client-sign. The immutable 0017 signing handler requires `lower(btrim(cap->>'typedName')) = lower(btrim(s.client_name))` and raises 22023 Invalid otherwise. The B1 wrapper's structural capture validator accepts both names; it does not replace the stored-client identity requirement. This is a **synthetic scenario input defect**, not drawn-signature validation, authorization failure or a reason to weaken the database. The same original/intermediate checksum is used; neither expiration nor finalization was the demonstrated cause. No corrective migration or 0029 is proposed.

The source sequence before that first impossible client-sign input returned successfully: valid typed capture accepted, consent=false rejected, Auth count two, bucket count one, normal verification returned a challenge. Each public request has its own explicit BEGIN/COMMIT/ROLLBACK. Consequently verification commits its challenge/event/rate/receipt; failed client-sign rolls back its own changes. No successful client signature, finalization or final signing evidence is inferred. These conclusions are source/fixture/control-flow supported; the new read-only checkpoint must confirm the exact partial state rather than silently adopt unknown drift.

## Exact scenario-only checkpoint

Require 29 exact history versions through 0028 and all declared accepted tables/functions/RLS under permitted owners; no stale absence assertions for committed 0022/0023 objects. Preserve strict restored membership/restricted-role checks, billing helper ownership/EXECUTE, two synthetic identities/mappings/agencies and exact private PDF/DOCX/PNG bucket/10 MiB contract.

Signing checkpoint additionally requires exactly one agency-A simple/provider-null awaiting_client session, version 3, agency signature present/client absent, client name D2 Synthetic, original/intermediate checksum equal to the synthetic fixture, and >30-minute session validity. Require one current unconsumed/unrevoked invitation with zero failures, expected synthetic token/code and >30-minute validity. Require the previously committed challenge to match the stored verification receipt for request 2000002, and no client-sign receipt at failed request 2000003. Unexpected partial effects stop before any password or scenario mutation. Existing synthetic signing key is reused in memory only; no secret is printed or written to receipts.

Previous normal verify challenge may expire after ten minutes. After full checkpoint validation the unfinished path performs one **fresh normal verify** with a new request ID, preserving old receipts/events; this dependency is necessary to complete client signing after a pause. It is not invitation/session renewal. Session source lifetime is seven days, invitation min(24 hours, session deadline), freshly generated request JWT one hour. Fresh >30-minute validity is required for the bounded 20-minute run. No exact current expiry can be established offline. Expiry/refused checkpoint requires separately reviewed renewal scope; no direct expires_at update, system-clock change or renewal is included.

## Remaining obligations and limitations

The package executes only:

1. Native drawn-v1 validator positive payload and negative consent, notice and no-movement cases. This is payload validation, not a drawn-signature rendering/end-to-end acceptance claim.
2. Fresh public verification challenge; typed-name client signing using stored name and original reviewed checksum; same-request idempotency.
3. Finalize-prepare, stage-final and complete through versions 4/5, then exact agency-evidence fingerprint preservation and SHA-256 of stored client capture text.
4. Unchanged role membership snapshot, two Auth identities and final 29-row history.
5. Original candidate predecessor-history DO guard only, in a read-only transaction ending ROLLBACK, to verify replay refusal without executing any committed migration body.
6. Consolidated receipt with all 16 accepted commit events, prior scenario events and new results; verified shutdown in unchanged lifecycle finally.

Prior agency-first signing, tenant/private denial, immutable history, contract/document/delivery/Sheets/billing and independent concurrency evidence remains under original receipts; those scenarios are not rerun or reclassified. Consent/typed structural helper checks before the old failure already completed; positive client signing/finalization did not. Broader drawn rendering, managed Auth/Storage parity and modules lacking dedicated native business scenarios remain limitations even if this prepared package passes. All unfinished checks above are **pending native execution**, not passed by offline mocks.

## Integrity, shutdown and verification

New package: scripts/d2-native-final/package-manifest.json, SHA-256:

`15b2aeaac5fc12a87360091c3eb4ea8fb5d3d2a992155938419ea63052612aa3`

It binds seven prior packages/bound sources, all sixteen accepted candidate events and 1,777 stopped private files; historical logs/receipts/candidates remain untouched. New files only: final-binding.json, session-final.json, acceptance-receipt-final.json, startup-final.log. Exclusive receipt/binding creation prevents overwrite. No bootstrap, migration execution loop or prior business scenario is invoked. Only lost memory-only postgres/authenticator passwords are refreshed, after complete read-only checkpoint validation. Existing resources, private ACLs, TLS/SCRAM/loopback, PID/config hashes, RAM/disk/port gates, time/output limits and Stop-Own finally remain.

Original log records complete shutdown at 13:08:48.902 GMT of PID 13476. Fresh read-only OS checks find zero listeners, absent PID 13476/pidfile and no visible owned process. Seventeen other postgres command lines are inaccessible and remain unattributed/untouched. No database was started to inspect state. Five focused tests pass: exact client-name mismatch, partial verification/expiry refusal, remaining SQL/parameter/evidence trace, no migration invocation/history-only guard extraction, seven prior-package bindings/16 commits/receipt isolation/unchanged Stop-Own. Additional checks pass: 79 embedded SQL parses, package/source integrity, PowerShell AST and Git diff/new-package whitespace. Scripted tests are not native acceptance.

## Separately authorized next action

Conditional GO for one scenario-only synthetic run, subject to strict preflight, including disposable login-password refresh, memory-only synthetic key reuse and one fresh normal verification challenge. No fixture renewal or committed migration replay is authorized by this preparation.

```powershell
Set-Location -LiteralPath 'C:\Users\lenovo\contratpro'
$D2FinalSha = '15b2aeaac5fc12a87360091c3eb4ea8fb5d3d2a992155938419ea63052612aa3'
& '.\scripts\d2-native-final\session.ps1' -Action Bind -PackageSha256 $D2FinalSha
& '.\scripts\d2-native-final\session.ps1' -Action Start -PackageSha256 $D2FinalSha
& '.\scripts\d2-native-final\session.ps1' -Action Status -PackageSha256 $D2FinalSha
& '.\scripts\d2-native-final\session.ps1' -Action Accept -PackageSha256 $D2FinalSha
# Independent verified stop if required:
& '.\scripts\d2-native-final\session.ps1' -Action Stop -PackageSha256 $D2FinalSha
```

Tokens: D2-FINAL-BIND, D2-FINAL-START, D2-NATIVE-FINAL; Stop: D2-FINAL-STOP. Supply only the existing synthetic bootstrap password at the masked prompt. Run separately; stop on failure; no automatic retry/policy bypass. This package must not be run under the present offline-only authorization.

Changed files: separate final package checkpoint/remaining-scenario/driver/binding/lifecycle/manifest/tests plus unchanged fixture/resource copies; offline final builder/state/scenario source templates; this report, native acceptance report and MVP tracker. Original application/database SQL is unchanged. Sixteen commits do not mean synthetic acceptance is complete; faithful-target 0008/0009 reconciliation and managed migration authorization remain separate.
