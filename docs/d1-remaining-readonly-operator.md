# D1 remaining read-only evidence — bounded continuation

**Superseded execution command:** This stage was attempted: Q1–Q5 succeeded, Q6 failed on an ambiguous text/internal-char concatenation, and Q7b/Q11 were never reached. Do not rerun the eight-query command below. Follow [the exact three-query recovery](d1-metadata-recovery.md). The helper hash below records the attempted version, not the current recovery version.

The owner completed Q0/Q7 and confirmed the current project CA. The local initial review passed integrity, identity/read-only and PG17 version checks. Postgres is administrative, with BYPASSRLS/CREATEROLE/CREATEDB/REPLICATION, not least privilege. Six ContratPro roles exist; installation classification remains D pending catalogue evidence. No new remote connection was made while preparing this continuation.

## Next operator action

In the approved private operator PowerShell, under the existing execution policy, run this exact command only when authorizing the eight-query stage and acknowledging the administrative login. Do not recreate the capture, repeat the CA comparison or rerun Q0/Q7. `-ConfirmCurrentProjectCA` reaffirms the already completed comparison, provided the target and certificate have not changed.

```powershell
Set-Location -LiteralPath 'C:\Users\lenovo\contratpro'
& '.\scripts\d1-readonly-operator.ps1' `
  -ExecuteMetadataReads `
  -CaptureDirectory 'C:\Users\lenovo\AppData\Local\ContratPro-D1-evidence\d1-initial-20261127T084944Z-427397da94bd4e239d26d116778a2a2a' `
  -ConfirmCurrentProjectCA `
  -AcknowledgePostgresLogin
```

Type **D1-READONLY-METADATA** at the confirmation prompt; enter the password only at the masked prompt. No password belongs in chat, argv, files, transcripts or persistent settings. If policy blocks this invocation, stop and report the exact rejection; do not change policy, launcher or environment to bypass it.

The PowerShell entry validates private ACLs, pinned Node/supervisor, unchanged manifest and certificate. The supervisor revalidates initial receipt/query/output integrity and identity plus PG16+ before any psql launch. It accepts only eight fixed queries, in order: Q1 discovery, Q2 columns, Q3 constraint/trigger/index metadata, Q4 function metadata/hashes, Q5 policy metadata/hashes, Q6 ACLs, Q7b PG16+ ContratPro-linked membership options, Q11 public relations. No user SQL path or target option exists. Q0/Q7 are not replayed.

Same manifest SHA-256: `d941d752f6a42d628f251262cec8a83d52dad9f5f920b14bbc77e8e00129ef8c`. Supervisor SHA-256: `866b4f7b37a15ffcf2011aa1ca951048b2c6104e862cb5c6beacbdac5fb219dd`, pinned in the operator entry. The manifest's historical prepared/not-executed labels are immutable preparation metadata; stage receipts/status documentation record actual execution.

The existing capture retains `authorization.json`, `receipt.json` and all Q0/Q7 files untouched. New files are `authorization-metadata.json`, `receipt-metadata.json`, and the eight queries' distinct `.sql`/`.csv`/`.stderr` files. Exclusive creation prevents accidental replay; no automatic retry or overwrite of previous captures is supported. Any failure requires local receipt review before another instruction.

The fresh authorization lasts at most ten minutes. Each native client is capped at 30 seconds and 4 MiB combined output; errors/timeouts stop the sequence. Queries retain repeatable-read READ ONLY, ROLLBACK, statement timeout 5s, lock timeout 2s and idle-in-transaction timeout 10s. Fixed session-pooler target, verify-full with the pinned CA, minimal psql environment, disabled psql startup configuration and private output capture remain. No isolation/debug/credential safeguards are cleared. Node blank-option handling remains unchanged; every non-empty NODE_OPTIONS value is rejected.

## Six conditional queries remain blocked

Do not run Q8b bucket configuration, Q9 migration versions, Q10 foundation journal or Q12a/b/c aggregate presence before reviewing catalogue captures. They require confirmed ordinary relation existence/kind, expected columns/types, SELECT privileges and visibility interpretation. Catalogue ACL evidence does not authorize new grants or establish least privilege. Views/foreign relations or unusual functions/types require review. No full migration statements or complete function bodies are authorized.

After a successful `METADATA_READS_CAPTURED_REVIEW_REQUIRED` receipt (eight queries), request local review of the same private directory. Do not paste raw CSV/diagnostics. The final eligible subset and its exact operator command will be prepared from that evidence; no generic fourteen-query launcher is provided. A relation missing from the catalogue is evidence to classify, not a reason to run a failing SELECT or substitute a zero. The existing aggregate visibility flags must be interpreted before declaring any data set empty.

Native PostgreSQL acceptance, historical 0008 provenance where relevant, and installation-path reconciliation remain separate. No migration, role change, history repair, reset or execution-readiness claim follows from this procedure.
