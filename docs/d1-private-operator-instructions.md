# D1 private operator sequence — final binding confirmation

**All D1 collection stages are complete. Do not run any historical command in this document.** Follow [the final evidence review and D2 next action](d1-final-evidence-review.md). Private evidence is retained unchanged; there is no retry/resume to execute now.

Prepared 2026-11-27 UTC. **No remote session executed.** The existing 16-query inventory/SQL parsing was not repeated. The new supervisor was checked locally in `--prepare` mode and with four injected-process tests; neither starts psql. PowerShell script execution, native cancellation and the actual handshake remain untested. This packet is for owner review before any remote execution.

## Confirmed route category and remaining runtime observations

Owner-current route: project `gllsiklbvqpxzucvkehw`, host `aws-0-eu-west-1.pooler.supabase.com`, port `5432`, database `postgres`, routing username `postgres.gllsiklbvqpxzucvkehw`. This matches Supabase's documented **shared session pooler** pattern; transaction pooling uses port 6543. The host was supplied by the owner, not guessed from region. This establishes the proposed routing category, not an observed live connection. [Official connection documentation](https://supabase.com/docs/guides/database/connecting-to-postgres).

`postgres` is **not established as least privilege**. No new role or grants will be created. The first reads capture actual session/effective role, server version, read-only/isolation state and role privilege/membership flags. Later Q6/Q7b metadata covers relevant ACLs/default ACLs and version-appropriate SET/ADMIN/INHERIT options before interpreting effective access. Read-only transaction settings constrain this collection; they do not turn an administrative login into a least-privilege role.

Current SSL requirement is explicit `verify-full` with the project CA, checking both certificate trust and hostname. The local public CA file already matches its reviewed SHA-256 `700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7` and is valid until 2031-04-26. The remaining owner action is to confirm it matches the current project's **Database Settings → SSL Configuration** download. If that public certificate differs, stop for a new CA binding; do not replace the pinned file or weaken TLS. No global trust store is modified. Through the pooler, `pg_stat_ssl` describes the backend leg, not the client-to-pooler certificate verification. [Official SSL guidance](https://supabase.com/docs/guides/platform/ssl-enforcement), [pooler SSL observation](https://supabase.com/kb/troubleshooting/pg_stat_ssl-shows-ssl-false-when-connecting-via-the-connection-pooler-59edc3).

## Existing packet and proposed initial subset

- Existing manifest: `C:\Users\lenovo\contratpro\.verification\d1\readonly-packet\manifest.json`.
- Manifest SHA-256: `d941d752f6a42d628f251262cec8a83d52dad9f5f920b14bbc77e8e00129ef8c` — unchanged, all 16 files retained.
- Initial Q0 SHA-256: `f38edefbaf133486e4a7970ef27233b051e12ef977bafa474074b5397126119f`.
- Initial Q7 SHA-256: `0e5e9512fe300a581bfec333bb157bba67819f23f5943b57ee6afa558a75f76f`.
- Current supervisor `scripts/d1-readonly-session.mjs` SHA-256: `85b92e4a85ae17fa1350d61ad03438dcd951f0b2f23fe674289de753f30c6e28`, pinned after the final conditional stage was added. Prior recovery helper: `7ba43e2fb6e53bda207b5cc334a70fcfa73e7ab456b548fd224774b93e2c0ef5`; metadata helper: `866b4f7b37a15ffcf2011aa1ca951048b2c6104e862cb5c6beacbdac5fb219dd`; initial helper: `24380e4b4cea433cbe6afe88dc4258532277d8f897c631d6295696e42e09e93b`.
- Node and psql paths/hashes reuse the Step 228 approved bytes. No obsolete P3 runner is used or modified. The supervisor exposes no arbitrary SQL path, target or shell option.

Each client has a 30-second deadline including connection/query and a combined stdout/stderr cap of 4 MiB. Startup default READ ONLY plus repeatable-read READ ONLY/ROLLBACK, 5-second statement timeout, 2-second lock timeout and 10-second idle transaction timeout remain. There is no retry or continuation after errors. Local failure receipts record the exact native PID and whether exit was observed; uncertain termination is a stop, never proof of server cancellation.

The fixed initial command runs Q0 then Q7 only. If Q0 is not exactly one expected database/session-role/read-only row, it stops before Q7. It does not assume the role is nonprivileged, treat an empty public editor as a clean target, execute full definitions/history SQL, or start the other 14 queries. Those retain their existing shape/version/visibility prerequisites and can be sequenced after review of the initial results, within the already authorized read-only scope.

## One operator sequence

**Recovery is now complete.** All initial/metadata/recovery commands below are historical. Use only [the final conditional continuation](d1-consolidated-catalogue-review.md); do not replay successful queries.

**Initial execution is complete and reviewed. Do not repeat the preparation or initial-read commands below.** They are retained as historical instructions. Follow [the remaining-query procedure](d1-remaining-readonly-operator.md), which reuses the existing private capture and requires a separate explicit metadata-stage confirmation.

**Metadata subsequently stopped at Q6. Do not rerun the eight-query stage.** Use only the [three-query recovery procedure](d1-metadata-recovery.md), preserving successful Q1–Q5 and failed Q6 evidence.

The operator terminal diagnostic established a present but whitespace-only `NODE_OPTIONS`, distinct from the persistent User-scope DNS option. Both runtime gates now accept absent/empty/whitespace-only `NODE_OPTIONS` without changing the variable. Every non-empty value, including DNS options, remains rejected; the other environment and execArgv guards are unchanged. Its creating process is not established. Local regression verification passed five Node tests (mocked children only) and twelve native PowerShell predicate cases; the PowerShell test extracts only the pure predicate and does not execute the operator. No remote connection or SQL ran. Reuse the already prepared private capture after the earlier pre-authorization refusal; do not repeat preparation or replace its directory.

Use a private PowerShell session without profile/transcription/debugging or third-party recording. Do not paste a password in chat, code, arguments, a URI, `.env`, a password file or a persistent environment setting. Do not change PowerShell execution policy or global lean-ctx policy. These commands are **presented, not executed by the agent**.

First, confirm the current Dashboard CA download matches the existing public certificate. Then run the local-only preparation:

```powershell
Set-Location -LiteralPath 'C:\Users\lenovo\contratpro'
& '.\scripts\d1-readonly-operator.ps1' -PrepareOnly
```

This validates the fixed local bindings and creates a fresh private folder under:

`C:\Users\lenovo\AppData\Local\ContratPro-D1-evidence\d1-initial-<UTC>-<GUID>`

The script disables inherited access on that folder, grants only the current operator SID and SYSTEM, and verifies owner/rules before any credential is read or output captured. It prints the exact folder and manifest. No connection or password prompt occurs in preparation. Do not point it at an existing capture or a linked directory.

**Only after final confirmation of the CA, manifest/subset and private capture**, reuse the exact printed directory:

```powershell
& '.\scripts\d1-readonly-operator.ps1' `
  -ExecuteInitialReads `
  -CaptureDirectory 'C:\Users\lenovo\AppData\Local\ContratPro-D1-evidence\<exact-folder-from-PrepareOnly>' `
  -ConfirmCurrentProjectCA `
  -AcknowledgePostgresLogin
```

The operator must type `D1-READONLY-INITIAL`, then enter the database password in the **masked** prompt. The script creates a fresh ten-minute session window (each psql still capped at 30 seconds). The password exists transiently in operator/child process memory/environment, never in arguments, receipts or files. The parent process variable is removed in `finally`; the temporary unmanaged buffer is zeroed and SecureString disposed. Managed/environment memory is not claimed to be inaccessible to local administrators or guaranteed erased byte-for-byte; use the private process as required. No user/machine environment setting or credential file is written.

The supervisor receives a minimal child environment with fixed route/TLS/options and explicit nonexistent capture-local password/service/client-key paths to prevent default credential-file discovery. It rejects debug/preload/TLS override controls rather than clearing an enforced policy. No service-role key is requested. Standard output displays only capture status/path, not CSV contents or raw diagnostics.

If the script is blocked by execution policy or lean-ctx, stop and report this **exact invocation** and its rejection. Do not use `-ExecutionPolicy Bypass`, another shell, encoded commands, unrestricted Start-Process or a different launcher to evade it. The agent has not tested or asserted authorization through that security layer. The Node supervisor is a one-purpose implementation for this new D1 packet, not a fallback around a rejected command.

## After the initial session

Keep `Q0-fingerprint.csv`, `Q7-roles.csv`, bounded private diagnostics, original query copies, `authorization.json` and `receipt.json` private. Review sanitized session identity and role flags; an empty role list or zero count is never inferred from a failed/denied query. Do not post raw CSV/error files or passwords. Review remaining packet order/permissions, then collect authorized metadata/history-version/aggregate evidence without full function bodies or migration statement contents.

The target remains classification D until actual observations exist. Current next owner actions are only: confirm current CA, review the unchanged manifest plus the initial supervisor, and confirm/use the private operator capture/window. The current connection fields and Development-only usage need not be resubmitted. There is still no migration, reset, cleanup, role creation, history repair, activation, deployment or clean-foundation decision.
