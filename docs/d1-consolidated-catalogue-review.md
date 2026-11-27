# D1 consolidated catalogue evidence — 2026-11-27

**Final collection has completed.** Do not execute the conditional command below again. See [final D1 verdict](d1-final-evidence-review.md), [reconciled matrix](d1-migration-reconciliation-worksheet.md) and [D2 acceptance plan](d2-native-postgresql-acceptance-plan.md). Preliminary/pending states below are retained as historical catalogue-stage findings.

## Verdict and evidence integrity

**Preliminary classification B: existing ContratPro schema requiring migration reconciliation. Final classification pending version/journal and aggregate presence collection.** A clean foundation installation over this target is not supported by the evidence. No migration is execution-ready.

Ten successful logical query slots are retained: Q0/Q7, Q1–Q5, corrected Q6/Q7b/Q11. The original failed Q6 remains separately preserved. All three recovery query/source/output hashes, byte counts, empty stderr, zero exit codes, null signals, valid PIDs, confirmed exits and authorization-window timestamps pass local verification. Captures are below row/output limits, including a valid header-only Q11. The recovery authorization binds the corrected Q6 hash and no-change confirmation. Existing Q0/Q7 acceptance was reused, not rerun remotely. The accepted Q1–Q5 prefix and failed Q6 have not been overwritten. No raw results are reproduced here.

Original manifest remains `d941d752f6a42d628f251262cec8a83d52dad9f5f920b14bbc77e8e00129ef8c`; corrected Q6 remains `3125f33bfd961c38597a2ac8a156eac3dd397f9e368e7db07bd6e8ebc9df15d6`. Evidence stays in the existing protected `d1-initial-20261127T084944Z-427397da94bd4e239d26d116778a2a2a` private directory. This is local hash/receipt verification, not signed execution attestation or a global database snapshot.

## Observed catalogue and migration comparison

The covered application schemas are identity, tenancy and app_private, owned by postgres. Provider schemas auth/storage, both migration schemas and public also exist. Discovery was explicitly scoped; it was not an exhaustive all-schema inventory. In particular, the original packet omitted platform, even though local 0001 declares it. The final probe includes platform existence/relation-name metadata to close that narrow gap; platform definitions, policies and function bodies are not presumed verified.

| Observed objects | Local inventory correspondence | Limits |
| --- | --- | --- |
| identity.users; tenancy.agencies, memberships, roles, permissions, role_permissions, membership_roles, membership_invitations, agency_settings, audit_events | 0001 foundation structures | Presence does not establish exact source bytes or application history |
| identity.supabase_users | 0004 identity bridge | Mapping/table present; no identity records read |
| Agency provisioning/profile RPCs and constrained writer ownership | 0005/0007 object families | Function identity/security metadata and hashes collected, not full definitions |
| tenancy.clients; client CRUD/list/permissions RPCs | 0006 client family | Exact schema/body reconciliation remains dependent on history/provenance |
| tenancy.vehicles; vehicle CRUD/list/permissions helpers | 0008 vehicle family | **Deployed 0008 exact-source provenance blocker remains** |
| app_private.client_creation_receipts; receipt helpers and client-creation-contract RPC | 0009 candidate family | Multiple mutually exclusive local candidates share these objects; no candidate selected solely from names |
| migration_control.journal and supabase_migrations.schema_migrations | Separate foundation/native histories | Both are ordinary tables; contents not yet collected |
| No rental/contracts/document/signing/delivery/Sheets/billing/onboarding draft tables in covered schemas | Major 0013–0028 table families absent | Not proof every later migration is unapplied; 0010–0012 can alter existing objects and history has not been read |

There are 14 application ordinary tables in these covered schemas: identity has two, tenancy eleven, app_private one. Thirteen have enabled and forced RLS; tenancy.permissions has neither (a reference-permission table, not proof of a defect). Public contains no table/view/materialized/foreign/partitioned relation matching Q11's complete filter, but does contain 18 ContratPro RPC functions. Empty public Table Editor therefore did not imply an empty application database.

Q4 contains 42 function metadata rows: 21 app_private helpers, 18 public ContratPro functions and three auth helpers. Eight are SECURITY DEFINER. Their observed metadata specifies a pg_catalog/pg_temp search path; seven also explicitly set row_security=on. Recorded explicit ACLs show no PUBLIC EXECUTE for these eight. This is metadata evidence, not native functional/security acceptance or verification of complete bodies.

Q3 contains 95 constraints, 34 indexes and 89 triggers in the covered application schemas (including internal constraint triggers), plus six database event triggers. No captured constraint is unvalidated, no index is invalid, and no trigger is disabled. Definitions are hashed and structural metadata is retained privately; their semantics have not been proven against local sources. Event-trigger function hashes are not a new authorization to retrieve their full definitions.

Q5 contains 54 policies: identity 11, tenancy 41, app_private two. Commands comprise 37 SELECT, 13 INSERT and four UPDATE policies. Policy names/roles/permissiveness and predicate hashes are retained privately; existence does not prove tenant isolation or runtime authorization.

Q6 contains 163 ACL metadata rows: eight schemas, 52 relations (including indexes), 69 column ACLs, 28 types and six default ACLs. The six default entries concern postgres-owned public/storage tables, sequences and functions; no matching PUBLIC or ContratPro runtime grant appears in those six explicit records. This does not imply all effective built-in defaults or null ACLs are revoked. Provider defaults are not changed. Postgres owns the application/history tables and has direct storage SELECT plus schema USAGE. Q6's relation filter omitted auth.users, so its SELECT privilege is not inferred from BYPASSRLS.

Q7b confirms six ContratPro-role grants to postgres: agency_writer, client_receipt_writer, identity_writer, migration_owner, platform_runtime and runtime. Each has ADMIN true, INHERIT false and SET false. These do not establish all postgres memberships. Prior postgres flags remain administrative (BYPASSRLS/CREATEROLE/CREATEDB/REPLICATION, not SUPERUSER). No SET ROLE, role creation or permission change is proposed.

## Conditional query eligibility

All five referenced relations are ordinary PostgreSQL tables, not views/foreign relations. Required shapes were checked in Q2:

| Query | Required shape/evidence | Eligibility |
| --- | --- | --- |
| Q8b | storage.buckets id/name text, public boolean, file_size_limit bigint, allowed_mime_types text[] | Eligible; direct postgres SELECT/USAGE observed; final probe reconfirms visibility |
| Q9 | supabase_migrations.schema_migrations.version text | Eligible; postgres ownership/default owner access; only version selected, never statements |
| Q10 | migration_control.journal id/checksum text, ordinal/runner_version integer | Eligible; postgres ownership and explicit ACL; only the already approved journal metadata fields |
| Q12a | auth.users ordinary table; count only | SELECT privilege unresolved in original captures; fixed probe gates it without fetching records |
| Q12b/Q12c | storage.buckets/storage.objects ordinary tables; count only | Eligible; direct SELECT/USAGE and administrative RLS visibility observed; probe reconfirms |

No remaining query requires a new role, grant, service-role key or full function/history body. Auth SELECT is the only specifically uncovered permission prerequisite. A small separately pinned Q13 catalogue query checks current role identity, schema USAGE, table SELECT and complete RLS visibility for all six; it also reports platform existence/relation names. All six original SQL files remain byte-for-byte unchanged. The operator continuation automatically executes only queries whose checks are true. Denied/incomplete visibility becomes a named SKIPPED receipt, never zero; unexpected/missing probe rows stop the run before conditional queries. Genuine denial remains a blocker for the affected observation, not a reason to increase permissions.

## Exact next operator command

Run only if the target/schema/roles remain unchanged since metadata collection. The existing CA confirmation is reused, not repeated. The same administrative login remains explicitly acknowledged. This command is prepared, **not executed by the agent**.

```powershell
Set-Location -LiteralPath 'C:\Users\lenovo\contratpro'
& '.\scripts\d1-readonly-operator.ps1' `
  -ExecuteConditionalReads `
  -CaptureDirectory 'C:\Users\lenovo\AppData\Local\ContratPro-D1-evidence\d1-initial-20261127T084944Z-427397da94bd4e239d26d116778a2a2a' `
  -ConfirmCurrentProjectCA `
  -AcknowledgePostgresLogin `
  -ConfirmNoTargetChangesSinceMetadata
```

Token: **D1-READONLY-CONDITIONAL**. Enter the password only at the masked prompt. This explicitly authorizes Q13 followed by eligible Q8b/Q9/Q10/Q12a/Q12b/Q12c, in that order. At most seven new native clients; no successful-query replay. All eligible originals are collected in the one bounded continuation, without another intermediate review.

Q13 SHA-256: `5ea6e4f753a4b8693079a2bc0c3f260786ca4873562d528a34abecb3bfbabdcc`. Current supervisor SHA-256: `85b92e4a85ae17fa1350d61ad03438dcd951f0b2f23fe674289de753f30c6e28`, pinned in PowerShell. The fresh authorization additionally binds the probe hash and no-change statement. Recovery and metadata integrity are checked before launch. Original manifest preparation-state labels remain immutable; actual state comes from receipts/status documents.

New files are authorization-final.json, receipt-final.json, Q13 files and the six originals' disjoint query/capture names. Prior receipts/captures remain untouched; existing final output names or authorization refuse replay. The same private ACL, minimal credential environment, fixed session pooler, verify-full, READ ONLY/repeatable-read/ROLLBACK, 30-second client, 4-MiB combined output, statement 5s/lock 2s/idle transaction 10s and fresh ten-minute window remain. Policy rejection is a stop, never a reason to change execution policy or bypass lean-ctx.

Expected completion is CONDITIONAL_READS_CAPTURED_REVIEW_REQUIRED. Its captured count includes Q13; any denied original is listed as skipped. Keep all raw captures private and request final local reconciliation. Permission failures remain unknown, not absent. No native PostgreSQL acceptance or global snapshot is claimed. If concurrent target changes are possible, stop for consistency review instead of asserting the no-change flag.

## D2 implication and remaining limits

Plan an existing-target reconciliation, not a clean replay/reset: use actual version/journal evidence to establish installed lineage, retain the deployed-0008 provenance blocker, resolve the mutually exclusive 0009 variants, assess 0010–0012 history/transaction contracts, then order compatible 0013–0028 changes. Names alone mark no migration as applied. If histories disagree with the catalogue, final classification can become C. Final history/aggregate results, exact-source reconciliation and isolated native PostgreSQL acceptance remain required before migration execution readiness. No production action or feature activation follows from D1 collection.

Local verification: thirteen Node tests and twelve native PowerShell predicate cases passed. They cover recovery integrity, zero-row catalogue evidence, the final fixed subset, probe hash, original query hashes, denial/visibility gating and malformed evidence. No remote SQL or actual final native client was executed by the agent.
