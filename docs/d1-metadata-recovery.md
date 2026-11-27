# D1 Q6 metadata recovery — 2026-11-27

**Recovery completed and reviewed successfully. Do not rerun this command.** The helper hash below is the historical recovery version. Follow [the consolidated review and final conditional command](d1-consolidated-catalogue-review.md).

Local-only investigation of the existing private evidence established:

| Query | Actual state |
| --- | --- |
| Q1/Q2/Q3/Q4/Q5 | Attempted, completed and captured; query/output hashes, empty stderr, complete row-count envelopes and successful receipt exits verified |
| Q6 | Attempted, PROCESS_FAILED, confirmed process exit (PID 9940), zero-byte stdout, 420-byte private stderr; numeric exit code unavailable in the old receipt |
| Q7b/Q11 | Never reached; no query/output files |

The exact PostgreSQL error is `operator is not unique: text || "char"`, in Q6's default ACL label `COALESCE(n.nspname,'<global>')||':'||d.defaclobjtype`. The local SQL defect is fixed by casting the last operand to text. This is not a permission, credential, TLS or timeout fix.

The immutable original manifest remains SHA-256 `d941d752f6a42d628f251262cec8a83d52dad9f5f920b14bbc77e8e00129ef8c`. Original Q6 SHA-256 remains `70a83c6979a16c62c3cba6d60e0f9a149bad54ca7a9076fdfa8469fb07c2af94`. No historical query or private capture was changed.

The separate amendment `scripts/d1-readonly-recovery/Q6-acls-text-cast.sql` is SHA-256 `3125f33bfd961c38597a2ac8a156eac3dd397f9e368e7db07bd6e8ebc9df15d6`. Regression comparison confirms the only semantic change is `d.defaclobjtype::text`. The new supervisor SHA-256 `7ba43e2fb6e53bda207b5cc334a70fcfa73e7ab456b548fd224774b93e2c0ef5` is pinned in PowerShell. The recovery authorization separately binds the replacement hash; the receipt links its `replaces` field to Q6. This additive amendment is not falsely claimed to have the original Q6 hash.

## Exact next operator action

Only use this command if the target, application schema and roles have not changed since the metadata attempt. If that cannot be confirmed, stop for evidence-consistency review; do not assert the flag. The CA flag reaffirms the owner's completed current-certificate comparison when unchanged. No repeat preparation, initial evidence execution, CA comparison or environment diagnostic is needed.

```powershell
Set-Location -LiteralPath 'C:\Users\lenovo\contratpro'
& '.\scripts\d1-readonly-operator.ps1' `
  -ExecuteMetadataRecovery `
  -CaptureDirectory 'C:\Users\lenovo\AppData\Local\ContratPro-D1-evidence\d1-initial-20261127T084944Z-427397da94bd4e239d26d116778a2a2a' `
  -ConfirmCurrentProjectCA `
  -AcknowledgePostgresLogin `
  -ConfirmNoTargetChangesSinceMetadata
```

Confirmation token: **D1-READONLY-RECOVERY**. Enter the database password only in the masked prompt. This is a new explicit operator authorization window, not an automatic retry. It runs **Q6-acls-text-cast, Q7b-pg16-memberships, Q11-public-relations**, in that order, and stops on any error. No Q0/Q7 or successful Q1–Q5 replay occurs. The original failed metadata authorization is preserved, not renewed or overwritten.

The same ACL-protected directory gains only `authorization-recovery.json`, `receipt-recovery.json`, amended-Q6 `.sql/.csv/.stderr`, and original Q7b/Q11 `.sql/.csv/.stderr`. Initial and metadata receipts/captures remain untouched. Exclusive creation and preflight reject prior recovery files; no automatic retry is supported. Runtime rechecks local hashes, known failed-Q6 diagnostics and accepted Q1–Q5 integrity before any process launch. Credentials are never written to these files. Future receipts now include numeric native exit code and signal; historical codes are not invented.

All bounds remain: current session pooler, minimal environment, verify-full pinned CA, READ ONLY/repeatable-read/ROLLBACK, 30-second native client, 4-MiB combined output, statement 5s/lock 2s/idle transaction 10s, fresh ten-minute window, existing runtime guards. Administrative postgres is still not least privilege; no role/grant change is authorized. If lean-ctx or execution policy rejects this exact command, stop and report it; no bypass.

Evidence is collected in separate per-query transactions across separate sessions; it is not a global snapshot. The no-change confirmation preserves a bounded basis for combining the captures but cannot prove absence of concurrent changes. If later results contradict the retained prefix, stop for consistency review instead of guessing or replaying everything.

After `RECOVERY_READS_CAPTURED_REVIEW_REQUIRED` (three queries), request local review of the same directory without pasting raw results. The six relation/permission-dependent queries remain blocked. Tests passed locally (ten Node tests, twelve PowerShell predicate cases); corrected SQL/native recovery have not been executed by the agent. No additional connection, SQL execution, migration or database change occurred during this investigation.
