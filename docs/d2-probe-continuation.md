# D2 0013 probe failure and checkpoint continuation — 2026-11-27

## Exact native failure

The accepted private recovery receipt records `FAILED_STOP_NO_RETRY`, phase `0013-native-compile-rollback-probe`, SQLSTATE **42601**, routine **scanner_yyerror**, position **48120**, diagnostic `syntax error at or near "$"`. The corresponding private PostgreSQL log corroborates this syntax error and clean shutdown. No password/key or raw query log is reproduced here.

**Harness defect:** `first.sql.replace(/COMMIT;\s*$/, "DO $$BEGIN ... END$$; COMMIT;")` interprets `$$` as a literal single dollar in JavaScript replacement-string syntax. The sent tail becomes `DO $BEGIN ... END$; COMMIT;`, not a valid dollar-quoted DO body. Offline reproduction gives the same syntax category. It is neither the deliberate rollback result nor the previously documented r.starts_at native type diagnostic. It supplies no evidence that native 0013 compiled successfully.

The whole candidate was submitted as one unparameterized query string. PostgreSQL rejected the malformed batch during SQL parsing, before executing that candidate's statements. In addition, the driver unconditionally issued ROLLBACK in finally. No candidate history/object commit was reached. The later native continuation must independently check absence of suffix history/objects; no catalogue SQL was executed during this diagnosis, so no live SQL absence is falsely claimed.

## Committed checkpoint and shutdown

Two prior receipt events establish a committed independent synthetic baseline and successful three-independent-session lock contention test. Before the failed probe, bootstrap committed the disposable postgres/authenticator/provider/runtime roles and grants, created contratpro_d2_native, installed synthetic provider/extension contracts, local 0000–0008 source contracts, independent receipt model and model 0009–0012 markers, and seeded two fictional Auth identities/canonical users/agencies/owners. Extension probing completed. These are not actual managed 0009 deployment or source-provenance claims.

No migration candidate 0013–0028 completed; no business scenario began. No probe-success event exists. The actual failure occurred before the intended P0001 injection could execute. Temporary candidate authority and history were not committed. Logs show clean shutdown; session-recovery.json records STOPPED/PID0, postmaster.pid is absent, and fresh read-only process/listener checks report zero owned processes and zero 54329 listeners. All earlier receipts/logs/package manifests, data, synthetic certificates/key remain retained. No restart, SQL, reset or deletion occurred in this batch.

## Minimal offline correction

New derivative package: [scripts/d2-native-probe-recovery/package-manifest.json](../scripts/d2-native-probe-recovery/package-manifest.json), SHA-256 **`9b22cf20dfbb723214c0d9e52c02cf6f3f1afd5f01cc1f4eb2c54c5c264e2a0d`**.

`rollbackProbe()` uses a **replacement callback**, returning the literal named `$d2_fault$` delimiter. This avoids replacement-string expansion and does not change any migration candidate. `expectedProbeError()` accepts only SQLSTATE P0001 plus the exact `D2 controlled rollback injection` message. Syntax, permission, native type/compilation, security assertions and other P0001 errors remain unexpected failures and stop acceptance. The candidate is still required to compile in a real catalogue and reach that deliberate injection; rollback then must leave unchanged history and no new rental role/tables before normal candidate application. The original unmodified candidate is still applied only afterward.

The remaining orchestration/baseline/scenario sources were inspected for this demonstrated replacement pattern; no other unsafe dollar-delimiter replacement string is present. No unrelated scenario or candidate correction was introduced. Original native and first recovery packages, original manifests, all receipts and all sixteen candidates remain byte-identical. Candidate manifest remains `c5f3bcaa94e92843e26a55b9069542cc9274800d003155e4aee4e4b7bfb2cdc8`.

## Strict continuation, no bootstrap replay

Fresh cluster initialization is **unnecessary**. The new package is bound to the existing stopped synthetic cluster and exact preceding package `a431ef060a9636c4165d09dae785dfc487ddaec226c42031bb6568f61dabd88a`. Its immutable snapshot contains **1,378** files covering stopped data, old session/binding records, receipts, certificates and logs (private key content is neither inspected nor copied). Before Bind/Start it verifies all snapshot hashes, no postmaster.pid/prior continuation receipt, exact stopped profile/port/path and specific 42601 failure with exactly the two completed events. It revalidates both old packages/resources, private ACL/config/HBA/auto-config, RAM/disk/free port and strict lifecycle PID identity. Any drift refuses recovery, rather than adopting/resetting state.

The future native stage connects with the existing synthetic bootstrap password and strict corrected identity/TLS guard. Before any new mutation it checks in READ ONLY transactions: expected test-login flags; dedicated database owner/existence; exact 13-marker history; absence of all suffix writer roles and rental tables; one baseline app_private ordinary table; two Auth identities/mappings/agencies; zero buckets/objects; independent synthetic claim-helper marker. Original bootstrap password remains operator-owned. This runtime validation is required even though the frozen files and control-flow evidence identify the checkpoint.

The original test-role passwords were random process-memory values and are no longer available. The planned continuation therefore **explicitly rotates only the disposable postgres/authenticator login passwords**, after checkpoint validation, with fresh memory-only synthetic credentials. It changes no role flag, grant or owner; it does not touch existing installations or managed credentials. This step needs the next owner execution authorization. No CREATE ROLE, CREATE DATABASE, installBaseline call or baseline data replay remains in the continuation driver. The already passed concurrency check is not replayed; later documented scenario concurrency remains part of acceptance.

Bind exclusively creates probe-recovery-binding.json and session-probe-recovery.json. Accept exclusively creates acceptance-receipt-probe-recovery.json; Start uses startup-probe-recovery.log. Every old receipt/state/log remains unchanged and checked. No Initialize/Cleanup action exists. Failure retains all checkpoint/evidence and refuses automatic retry. A lost credential-refresh/COMMIT outcome or checkpoint mismatch requires review, never replay/repair. A successful continuation is only synthetic-model acceptance, not faithful target upgrade or managed authorization.

## Exact proposed owner procedure — separate authorization required

The current authorization covers offline preparation only. **Do not execute the mutation actions until this new hash and synthetic-only password refresh are explicitly approved.** Use the private owner-operated PowerShell 7 terminal subject to existing policy. Stop at any failure; no global policy/allowlist changes or alternate launcher workaround.

```powershell
Set-Location -LiteralPath 'C:\Users\lenovo\contratpro'
$D2ProbeSha = '9b22cf20dfbb723214c0d9e52c02cf6f3f1afd5f01cc1f4eb2c54c5c264e2a0d'

& '.\scripts\d2-native-probe-recovery\session.ps1' -Action Bind -PackageSha256 $D2ProbeSha
& '.\scripts\d2-native-probe-recovery\session.ps1' -Action Start -PackageSha256 $D2ProbeSha
& '.\scripts\d2-native-probe-recovery\session.ps1' -Action Status -PackageSha256 $D2ProbeSha
& '.\scripts\d2-native-probe-recovery\session.ps1' -Action Accept -PackageSha256 $D2ProbeSha

# If an owned server needs stopping independently:
& '.\scripts\d2-native-probe-recovery\session.ps1' -Action Stop -PackageSha256 $D2ProbeSha
```

Tokens: **D2-PROBE-RECOVERY-BIND**, **D2-PROBE-RECOVERY-START**, **D2-NATIVE-PROBE-RECOVERY**, **D2-PROBE-RECOVERY-STOP**. Enter the original synthetic bootstrap password only in the masked prompt. Accept retains verified stop in finally; no cleanup is included or authorized. No reinitialization or historical 0009 variant selection is needed.

## Offline verification and changed files

Six focused Node tests pass: exact malformed syntax reproduction/corrected SQL parsing, strict expected-vs-unexpected error classification, read-only checkpoint mismatch rollback/close with no mutation, stopped snapshot/package verification, bootstrap-replay prevention/distinct outputs/baseline-scenario identity, and no repeated unsafe delimiter-replacement pattern. PowerShell syntax and unchanged verified-stop implementation are checked separately. All sixteen original candidate hashes verify; baseline/provider/scenarios remain byte-identical. Native normalization/0013 compilation is still unexecuted and r.starts_at remains a future native acceptance obligation.

New files are the separate native-probe-recovery driver, probe helper, binding/lifecycle/manifest, byte-identical baseline/resource/scenario copies and focused tests; offline generation sources are scripts/d2-probe-recovery-build.mjs, scripts/d2-probe-probe.mjs and scripts/d2-probe-binding.mjs. Documentation changes are this report, D2 acceptance report and MVP tracker. No earlier pinned source/package/candidate/private evidence was changed. Whitespace/package checks pass. No SQL/start/retry/deletion or existing-database access occurred.

**Verdict:** ready for review of one separately authorized checkpoint continuation; native acceptance remains incomplete. Remaining blockers are execution authorization, fresh state/resource gates and actual native probe/scenario outcomes. Historical 0008/0009 provenance and managed Supabase prohibitions remain unchanged.
