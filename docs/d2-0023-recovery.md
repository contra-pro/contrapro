# D2 migration 0023 recovery and remaining suffix review

2026-11-27 UTC. Local private evidence inspection and offline preparation only. No PostgreSQL startup, SQL, native retry, credential/fixture change, reset, deletion, remote connection, installation, commit or push occurred in this batch.

## Native failure and exact committed checkpoint

Owner package `3fc505018ec531a0b3446f4247e53cc39bc7d7d391475de71fb170a1cf857d12` produced acceptance-receipt-checkpoint.json: FAILED_STOP_NO_RETRY, migration-0023, **42501 / aclcheck_error**, no position supplied, diagnostic **must be owner of function delivery_valid**. The corresponding private PostgreSQL log corroborates this error at 12:13:19.377 GMT.

First failing owner-sensitive statement:

```sql
ALTER FUNCTION app_private.delivery_valid(app_private.delivery_jobs)
RENAME TO delivery_valid_before_a3;
```

The accepted 0021 source explicitly assigns delivery_valid and delivery_command to **contratpro_delivery_worker** in its delivery ACL loop. The 0023 native wrapper authorizes only contratpro_rental_writer. EXECUTE on a function does not confer ALTER ownership authority. The missing temporary owner inheritance causes the error; there is no reason to widen application EXECUTE grants or change RLS. The same omitted owner is needed later for delivery_command rename and CREATE OR REPLACE public.contratpro_delivery_worker.

0023 reached its source table/trigger creation before the failing ALTER, but these operations were in the same transaction. The error occurred before its source postconditions, history INSERT and COMMIT. There is **no committed-0023 event**. The driver closed the failed connection; clean fast shutdown rolls back the aborted transaction. This conclusion uses actual error/source/control-flow ordering, not the phase name. No SQL was executed during this diagnosis to re-query the catalog. The continuation therefore independently requires exact history through 0022 and absent 0023 tables/renames before mutation.

### 0022 actual results

The receipt records, in order:

| Phase | Result | Evidence meaning |
| --- | --- | --- |
| checkpoint-readonly-validation | PASS_NO_BOOTSTRAP_REPLAY, 12:13:17.860Z | Exact 0021 predecessor, role/object/identity/bucket invariants and all outstanding fixture/key prerequisites passed before mutation |
| synthetic-login-credential-refresh | SYNTHETIC_CREDENTIALS_ONLY | Disposable postgres/authenticator password refresh completed; previous values were memory-only |
| restore-existing-scenario-context | EXISTING_FIXTURES_REUSED_NO_SCENARIO_REPLAY | Existing pending signing evidence/key reused in memory |
| migration-0022 | APPLIED_TO_SYNTHETIC_ONLY, 12:13:18.805Z | SQL call including COMMIT returned; SHA matches corrected candidate `79e76a53dc94f52ae2ab324af366c461a37b916702316610e312c88df795093f` |
| scenarios-0022 | EXECUTED_NO_MANAGED_ACCEPTANCE_CLAIM, scenarioExecuted=false | Driver authority-restoration checks and permission refresh returned; **no dedicated 0022 business scenario exists** |

0022's in-transaction declared object/RLS, preservation, restricted-role and history checks completed before COMMIT. Temporary rental/billing writer authority was restored and checked. This establishes structural/preservation/authority success, not a positive preview-generation business test. Prior successful contract/document/agency-signature/delivery/Sheets/billing scenarios and three-session concurrency remain preserved under their original receipts; they are not replayed or relabelled.

**Committed suffix count: 10/16, 0013–0022.** Exact synthetic history expected next: 0000–0022 (23 rows). Remaining: corrected 0023, then 0024–0028, dedicated 0027 profile and 0028 B1/client-sign/finalization scenarios, final replay-refusal/history checks. 0023–0026 have no dedicated business scenarios in this prepared harness; their structural/authority checks remain required. Full module/provider acceptance is not inferred.

## Shutdown and preserved artifacts

session-checkpoint.json records STOPPED/PID0. Private data/log/d2-20261127121229.log SHA-256 `95cde12848807c1b3540c44964b5531f42672e00610d868322bad70c9eb121a6` records readiness on 127.0.0.1:54329, fast shutdown at 12:13:19.629 and complete shutdown at 12:13:20.261 GMT. Fresh read-only OS checks found zero 54329 listeners, absent postmaster.pid, absent recorded server PID 12764 and no visible command line referencing the owned data directory. Seventeen unrelated postgres processes have inaccessible/null command lines; none were accessed as a database, attributed to this cluster or signalled. Evidence confirms shutdown of the identified server, not blanket ownership of those other processes.

The existing private directory remains `C:\Users\lenovo\AppData\Local\ContratPro-D2-native\pg17-54329`: stopped data, TLS materials, all prior package bindings/states/receipts/startup/collector logs remain. No deletion or fresh cluster is needed or proposed. New package snapshot binds 1,675 stopped private files; server.key is excluded from manifest content reading. Original immutable evidence/logs match their previous hashes; physical WAL/data changes from the accepted migration and clean shutdown receive a separate new stopped snapshot.

## Separately versioned correction

New six-file candidate set: [d2-0023-suffix-v4](../supabase/migration-candidates/d2-0023-suffix-v4/manifest.json), manifest SHA-256:

`70a0728c2edee9a6c6468ce4a4c6d8d71470ddf8f8504d108fbd614e65c3350a`

Only **20261125002300_signing_reminders_recovery_v4.sql** changes, SHA-256:

`5b2ffede568697c0466a4947606d1961aaf2acff5eeb85174872a302a8432ef9`

Exact diff against its pinned prior candidate:

```diff
- ARRAY['contratpro_rental_writer']::text[]
+ ARRAY['contratpro_rental_writer','contratpro_delivery_worker']::text[]
  -- authorize allowlist AND final restricted-role assertion
  SELECT pg_temp.d2_authorize('contratpro_rental_writer'::name);
+ SELECT pg_temp.d2_authorize('contratpro_delivery_worker'::name);
```

No source application statement, function body, policy, ACL or ownership assignment is edited. The helper retains existing ADMIN-provenance and restricted-role requirements; it temporarily changes only INHERIT/SET and missing public/app_private schema CREATE, leaves ADMIN unchanged, and restores exact original grantor-edge/schema privileges before COMMIT. No ADMIN self-grant cycle, blanket role grant, permanent permission expansion or skipped error is introduced. **0024–0028 are byte-for-byte unchanged.** Every previous pinned candidate/package and historical draft remains unchanged.

## Focused authority and dependency matrix

This is a source/lineage and offline-parser review with bounded future catalog preconditions; it does not substitute for native execution. The administrative postgres fixture owns application tables/new functions by default, inherits the separately established synthetic Storage owner, and is not a superuser. Source CREATE/ALTER/GRANT/REVOKE and dynamically constructed ACL loops were reviewed against the accepted predecessor and preceding pending changes.

| Migration | Temporary roles | Owner-sensitive / cross-module dependencies | Review and checkpoint consequence |
| --- | --- | --- | --- |
| 0023 | rental_writer + **delivery_worker added** | 0021-owned delivery_valid/delivery_command; public delivery worker replacement; rental-owned agency wrapper; postgres-owned signing_command rename; rental_receipt_immutable trigger; A1 delivery helper EXECUTE grants retained | Correct demonstrated missing owner dependency. Original invoker wrappers call preserved before_a3 functions and retain explicit EXECUTE to rental/delivery roles. New reminder tables remain postgres-owned, FORCE RLS and narrow grants unchanged. Require exact pre-0023 owner state and absent new tables/renames |
| 0024 | rental_writer, sheets_worker, billing_writer | Sheets command/agency renames; billing agency/platform/gateway renames and owner transfers; rental receipt immutable trigger | Existing roles cover Sheets/billing predecessor ownership and new archive ownership. Before-wrapper grants to the same execution owners retained; tenant membership and protected function grants unchanged. New tables postgres-owned; no blanket cross-worker inheritance added |
| 0025 | rental_writer, billing_writer, **new maintenance** | signing_supersede security/owner change; immutable trigger; maintenance trigger functions transferred before trigger creation; existing Storage owner for policies; renderer MAC EXECUTE; explicit maintenance table/column grants and RLS | Existing rental role covers trigger/helper ownership, billing role covers billing-owned functions, new maintenance role covers owner transfers/trigger EXECUTE. CREATE ROLE remains restricted. Existing d2_storage_owner inheritance comes from original synthetic bootstrap, not new escalation. Source helper grants/delegation and original maintenance authority restoration retained |
| 0026 | rental_writer | New navigation/dashboard wrappers owned by rental writer; SELECT references to rental/signing/operational tables | Ownership transfer requires included rental role/schema CREATE. No predecessor function rename or new trigger. Existing per-agency authorization remains unchanged |
| 0027 | rental_writer, agency_writer | Existing agency writer from 0005, profile/onboarding owner transfers; CREATE OR REPLACE a2_snapshot created/owned by rental writer in 0022; canonical identity and agency helpers | Both existing roles included; agency_writer is **not** a new role. No stale pre-0022 snapshot assertion. Profile save/get parameter arity, synthetic subject separation and direct-private denial retained |
| 0028 | rental_writer | Rename postgres-owned signing_command created in 0023; B1 wrapper/capture validation; invoker delegation and explicit rental-writer EXECUTE | New postgres-owned functions and included rental role cover reviewed DDL/ACL operations. Original challenge/version/token sequence remains 3→4→5→completed; typed-capture boolean/JSON inputs and request IDs unchanged; no provider activation |

Across all six: exact predecessor history, TLS/target/advisory lock, bounded lock/statement timeouts, transaction boundary, row-preservation and object/security checks remain. Grantor/schema restoration logic is byte-identical. Pending maintenance role is absent until 0025 creates it; existing owner roles require ADMIN provenance before temporary authority is used. DDL performed as table owner or existing inherited synthetic Storage owner does not require treating EXECUTE as ownership. No additional application/scenario defect was demonstrated, so none was speculatively changed.

## Latest-state checkpoint and scenario prerequisites

The new READ ONLY checkpoint expects **23 history rows through 0022**, checks accepted objects through 0022, and requires absent 0023 tables plus delivery_valid_before_a3/delivery_command_before_a3/signing_command_before_a3. It no longer requires committed 0022 objects or before_a2 wrappers to be absent. Four accepted 0022 triggers must exist, be enabled and point to the expected functions. Explicit existing function-owner checks cover delivery, Sheets, billing, signing and 0022 snapshot/document wrappers. Existing role ADMIN provenance, relevant EXECUTE grants and absent not-yet-created maintenance role are checked without granting/adopting anything. Any drift stops before credential refresh or migration SQL.

All previous history/ownership/RLS/membership/identity/preservation/privacy/size and exact PDF/DOCX/PNG checks remain. All session/invitation/key checks run in that same READ ONLY snapshot before first mutation, with >30-minute validity for the 20-minute hard run deadline. Actual acceptance at 12:13:17.860Z passed those checks; no exact expiry timestamps were exported, so future validity cannot be established from receipts alone. It is rechecked, not assumed.

Time-sensitive dependencies:

- Existing signing session: source +7 days; exact agency-only/client-pending evidence, simple assurance, version 3 and checksum must remain intact.
- Existing invitation: min(issuance +24 hours, session expiry), unconsumed/unrevoked/zero failures, no existing challenge; >30 minutes required. No expiry-caused failure is evidenced.
- New client challenge: normal 0028 verify creates it for up to 10 minutes capped by invitation; client-sign follows immediately. No old challenge is reused.
- Synthetic request JWT: regenerated per request for +1 hour. No stored JWT or real provider is used.
- Old delivery job/events/lease and consumed Sheets OAuth: prior results only, not resumed; no renewal needed for remaining scenarios. Billing period source +1 month, not a prerequisite to pending dedicated profile/signature scenarios. Pending preview/reminder/maintenance structures introduce their own windows when used; existing expired jobs are not silently revived.

No renewal is required by the available evidence and none is implemented. If preflight establishes invitation-only expiry with a still-valid session, the narrow normal transition is agency signing **renew**, with a new unique token/code/request ID; it revokes the old invitation, appends history and increments version. A separately authorized/versioned scenario adaptation would then use the returned token/version. Do not UPDATE expires_at or reuse the old token PK. Expired session renewal would require normal expiry/new-session/agency signing evidence and exceeds this continuation; stop for explicit scope. No fixture/key clock bypass or silent extension is included.

## Package, evidence and verification

New [native continuation package](../scripts/d2-native-0023/package-manifest.json), SHA-256:

**`364846e3baefa950d7f212ba875125bb78f3fa05594b0a189f3638c94451918d`**

It verifies six prior pinned packages/bound files, original nine commits/scenario phases/probe and latest accepted 0022 commit/scenario phase. Exact failed receipt hash and 1,675-file stopped snapshot bind this attempt. New exclusive files: 0023-binding.json, session-0023.json, acceptance-receipt-0023.json, startup-0023.log. No prior evidence is overwritten; no existing acceptance receipt is reused. Start checks the frozen tree, resources, private ACL/config/HBA/auto-config, fresh 2 GiB RAM/10 GiB disk and port availability. TLS/SCRAM/loopback/PID tracking/time/output limits remain. Accept always uses the original verified Stop-Own in finally, unchanged byte-for-byte.

**23 offline tests pass**: eight focused recovery tests, fourteen existing native-harness/compiler offline tests and one unchanged scripted scenario trace (254 generated SQL invocations/parameter-arity checks). All six suffix SQL/PLpgSQL files parse and match pinned hashes/order. Checkpoint tests use scripted clients, including committed-0022 acceptance, wrong history/ownership/role/trigger/dependency/expiration refusal and no preflight mutations. Original r.starts_at standalone parser limitation remains explicitly reported by the source suite; prior successful native compilation is retained, not rerun. Additional checks PASS: PowerShell AST, 85 embedded SQL parser checks, package integrity, Git diff whitespace and whitespace/final newlines of 25 new files. No remaining native success is claimed.

Changed artifacts: scripts/d2-native-0023 runtime/binding/checkpoint/dependencies/lifecycle/manifest/tests and unchanged resource/baseline/scenario copies; scripts/d2-0023-build.mjs, d2-0023-binding.mjs, d2-0023-dependencies.mjs; six-candidate v4 suffix (0023-only wrapper correction); this report, candidate contracts, acceptance report and MVP tracker. No application UI/business source or previously pinned artifact was modified.

## Exact proposed operator commands and verdict

**Conditional GO for one separately authorized synthetic continuation** on the existing stopped 0022 checkpoint, including only disposable postgres/authenticator password refresh and memory-only existing synthetic signing-key reuse. No fixture renewal is included. Current authorization is offline-only; these actions were not invoked.

```powershell
Set-Location -LiteralPath 'C:\Users\lenovo\contratpro'
$D2SuffixSha = '364846e3baefa950d7f212ba875125bb78f3fa05594b0a189f3638c94451918d'

& '.\scripts\d2-native-0023\session.ps1' -Action Bind -PackageSha256 $D2SuffixSha
& '.\scripts\d2-native-0023\session.ps1' -Action Start -PackageSha256 $D2SuffixSha
& '.\scripts\d2-native-0023\session.ps1' -Action Status -PackageSha256 $D2SuffixSha
& '.\scripts\d2-native-0023\session.ps1' -Action Accept -PackageSha256 $D2SuffixSha

# Independent verified shutdown, if needed:
& '.\scripts\d2-native-0023\session.ps1' -Action Stop -PackageSha256 $D2SuffixSha
```

Tokens: **D2-0023-BIND**, **D2-0023-START**, **D2-NATIVE-0023**; independent Stop: **D2-0023-STOP**. Supply the existing synthetic bootstrap password only at the masked prompt. Run individually and stop on failure. No automatic retry, initialization, cleanup or execution-policy override. Fresh gates/fixture validity and actual remaining native results are outstanding. Native acceptance remains incomplete (10/16); faithful-target 0008/0009 provenance and managed Supabase authorization remain separate and unresolved.
