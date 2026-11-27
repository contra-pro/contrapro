# D2 migration 0022 diagnosis and accepted-0021 checkpoint continuation

2026-11-27 UTC. **Nine of sixteen suffix migrations committed and completed their recorded acceptance phase: 0013–0021.** 0022 failed inside its transaction; 0023–0028 were not attempted. This report preserves the difference between recorded native success, a phase with no dedicated business test, synthetic-model acceptance and faithful/managed upgrade acceptance. All work in this batch was local read-only evidence review or offline preparation; no SQL/server start/retry occurred.

## 1. Exact failure and transaction boundary

The private acceptance-receipt-stable.json has FAILED_STOP_NO_RETRY, phase migration-0022, SQLSTATE **42501**, routine **aclcheck_error**, no position supplied, diagnostic **permission denied for function app_private.billing_feature_write**. The private PostgreSQL log corroborates the error at 11:44:24.501 GMT and clean shutdown. The same log's earlier controlled rollback/security-denial entries are expected test observations, not additional unexplained failures.

The specific failing source statement is:

```sql
CREATE TRIGGER a2_preview_admission BEFORE INSERT
ON app_private.contract_previews FOR EACH ROW
EXECUTE FUNCTION app_private.billing_feature_write('documents');
```

0020 assigned billing helpers to contratpro_billing_writer and revoked broad execution. PostgreSQL checks EXECUTE on the trigger function when creating a trigger. The generated 0022 wrapper temporarily inherited only contratpro_rental_writer; the administrative postgres fixture is not a superuser and did not inherit billing-writer EXECUTE. This is a **generated native-test authority dependency defect**, not a reason to relax the application's trigger/function ACLs or replace the billing function. It happened before 0022 history INSERT, postcondition block and COMMIT, not after commit or in its business scenario.

The batch transaction was aborted on 42501; closing its native connection and successful fast shutdown roll back that uncommitted transaction. No migration-0022 commit event exists. The exact error occurs before the source's later wrapper renames/policy replacements, so they were not committed either. This conclusion uses specific error/source/driver ordering plus shutdown evidence, not the phase label alone. No fresh SQL catalogue check was run in this diagnosis; the future continuation must independently require exact history through 0021 and absent 0022 tables/renames before mutation.

## 2. Actual native results preserved

Each applied event's SHA-256 matches the pinned V2 candidate. The driver emits that event only after the candidate SQL call, including COMMIT, resolves. The following acceptance phase was also reached and completed for all nine; membership restoration assertions run before those phase events, including events with scenarioExecuted=false.

| Migration | Native transaction / postconditions | Recorded business scenario |
| --- | --- | --- |
| 0013 | COMMITTED, candidate security/object/preservation/history checks and driver authority restoration completed | Client/vehicle/rental creation; cross-tenant/direct-private access and SET ROLE denial; confirmation/number/start/complete |
| 0014 | COMMITTED; same structural/security/authority checks | No dedicated business scenario in the prepared harness (false) |
| 0015 | COMMITTED; same checks | No dedicated business scenario (false) |
| 0016 | COMMITTED; private bucket contract/postconditions completed | PDF template/document metadata reserve/save/select/issue, synthetic renderer MAC, Storage RLS and foreign artifact rejection |
| 0017 | COMMITTED; same checks | Invite-before-agency denial; agency stage/sign; client invitation prepared; agency evidence fingerprint retained in the process |
| 0018 | COMMITTED; same checks | Delivery queue/claim, invalid lease rejection, no duplicate claim |
| 0019 | COMMITTED; same checks | Two independent actor sessions concurrently create same rental idempotently; one created outbox event; connection-unavailable worker refusal and OAuth state replay denial |
| 0020 | COMMITTED; same checks | Synthetic plan/subscription dashboard and tenant rejection; no payment/provider activation |
| 0021 | COMMITTED; same checks | No dedicated business scenario (false) |
| 0022 | FAILED 42501 before COMMIT; no accepted candidate event | Not reached |
| 0023–0028 | NOT ATTEMPTED | Not reached |

The **0013 native compile/rollback probe PASSED** before application: receipt catalogueDependent0013Compiled=true; log contains the deliberate exception; driver verified unchanged history, absent new rental role and absent declared rental tables after rollback. The earlier standalone r.starts_at parser limitation therefore did **not** reproduce as a native compilation failure in this fixture. That result is specific to this native baseline/candidate, not a universal source compatibility claim.

Earlier three-independent-session plan-lock contention remains accepted from its original receipt. It was not replayed in the stable run. The 0019 duplicate-creation test supplies additional native two-session business concurrency evidence. Positive signature client-sign/finalization under B1 remains outstanding; prior agency signing/invitation results are preserved rather than repeated. No result is inferred for missing dedicated 0014/0015/0021 business tests.

Candidate preservation assertions validated old fixture row values across each successful migration, and authority restoration compared original role-grantor edges. This does not assert full provider parity or real managed data acceptance. Actual target Auth users/application data were never accessed.

## 3. Shutdown and committed checkpoint

The latest session-stable.json records STOPPED/PID0. postmaster.pid is absent; logs record complete shutdown. Fresh read-only metadata checks report no 54329 listener and no visible owned postgres process referencing the dedicated data directory. No process was signalled during review.

The checkpoint is the already-created synthetic database with history **0000–0021** (22 records, of which 13 are the earlier model prefix and nine are natively accepted suffix commits). The exact SQL history count is required again during future READ ONLY validation; it was not newly queried here. Synthetic role-password refresh committed earlier; renderer/signing/delivery/Sheets keys and test data from successful scenarios remain in that isolated database. No bootstrap/fixture/data replay is appropriate. A fresh cluster/reset is not necessary, subject to validating this exact checkpoint.

## 4. Versioned correction and remaining same-pattern review

Original V1/V2 sources and every previously pinned package remain unchanged. New [seven-file suffix manifest](../supabase/migration-candidates/d2-0022-suffix-v3/manifest.json) SHA-256:

`f0bc98f82e42c92bc6ecc05c35ded06471c2ff92996b772a9816a356c9698575`

Only 0022 is corrected, in **20261125002200_contract_previews_clauses_v3.sql**, SHA-256:

`79e76a53dc94f52ae2ab324af366c461a37b916702316610e312c88df795093f`

Exact changes to the V2-generated wrapper:

```diff
- ARRAY['contratpro_rental_writer']::text[]
+ ARRAY['contratpro_rental_writer','contratpro_billing_writer']::text[]
  -- both the authorize allowlist and final restricted-role attribute check
  SELECT pg_temp.d2_authorize('contratpro_rental_writer'::name);
+ SELECT pg_temp.d2_authorize('contratpro_billing_writer'::name);
```

No application statement/trigger/function body is changed. The existing mechanism still requires ADMIN provenance, changes only temporary INHERIT/SET (not ADMIN), grants only missing temporary schema CREATE, and restores the original grantor edge/schema rights before COMMIT with equality assertions. It introduces no permanent EXECUTE grant, broad role membership, superuser behavior, RLS bypass or skipped trigger. Candidate history/order/data-preservation assertions remain intact.

0022 acceptance contract now explicitly requires existing billing_feature_write() with billing-writer owner/EXECUTE, temporary billing-writer migration authority and exact restoration alongside rental-writer authority. Successful 0022 must atomically install the new preview/clause structures and trigger, preserve existing documents, and complete the original RLS/Storage policy/object/history postconditions.

The same demonstrated trigger dependency pattern was reviewed in 0023–0028: 0023/0024 immutable triggers use the rental helper and already include rental authority; 0025's immutable and maintenance trigger helpers are covered by rental/maintenance/billing roles already listed; 0026–0028 add no CREATE TRIGGER statements. **All six 0023–0028 SQL files are byte-for-byte V2 copies.** Their actual native semantics remain acceptance obligations; no speculative grant expansion is added.

## 5. Checkpoint validation, preservation and scenario context

New [0022 continuation package](../scripts/d2-native-0022/package-manifest.json) SHA-256:

**`2915ced778459c381a0e6e7143dfc06c5f295daa58e0ef7ed71356a641a2d607`**

The package binds 1,646 stopped data/evidence files, exact latest failure, all nine committed candidate events/hashes, all nine recorded acceptance phase events and the prior successful rollback probe. All four old package manifests and bound sources remain checked; original receipts/logs/state are never overwritten. Prior native results remain authoritative under their original package lineage, not rewritten to claim v3 ran earlier.

Before Bind/Start: frozen tree, private ACL/path, original config/HBA/auto-config/resource hashes, zero owned process/listener and fresh RAM/disk/port gates. The future READ ONLY checkpoint validation then requires:

- Exact recorded history through 0021, never a blind 0022 reapply. Any 0022 row or unexpected suffix stops recovery.
- Every accepted new table exists with postgres ownership and declared RLS flags; known function families exist under accepted owners; billing helper specifically retains billing-writer ownership/EXECUTE.
- All 0022-created tables and before_a2 wrapper renames absent, proving the expected rollback state before applying its correction.
- Existing application-role memberships to postgres have no leftover INHERIT/SET, and restricted roles have no login/superuser/bypass/role/database/replication/inherit widening.
- Two synthetic Auth identities/canonical mappings/agencies remain, expected private contract-documents bucket limits remain, and one agency-signed/client-pending session exists.

If any condition differs, stop without adoption/history repair/reset or permission relaxation. Physical snapshot and receipt control-flow validation happen offline; catalogue conditions above are intentionally unexecuted until a separately authorized local start.

After validation, refresh only the disposable postgres/authenticator passwords because prior random values existed only in process memory. Rehydrate only the outstanding scenario context: existing signing session/checksum, agency evidence hash, active invitation and **existing synthetic signing gateway key into memory only**. No key is printed, exported, regenerated or copied into a receipt. Require the exact synthetic token/code fixture and at least twenty minutes remaining validity; expired/changed data stops instead of silently renewing/replaying successful work. A new noncolliding synthetic request-ID counter avoids reuse of prior scenario keys.

The continuation skips bootstrap, baseline, 0013 rollback probe, committed 0013–0021 and their business tests. It runs corrected 0022 then original 0023–0028, preserving the original outstanding scenario behavior (dedicated profile test at 0027 and B1/client signature/finalization at 0028; structural/authority checks for all seven). It retains the final duplicate-replay refusal using the now-first 0022 candidate and final 29-record history check. Previous missing dedicated tests are not relabelled passed.

New exclusive files: 0022-binding.json, session-0022.json, acceptance-receipt-0022.json, startup-0022.log. Original logs are checked, new collector logs may be created, old evidence stays preserved. The verified Stop-Own function is byte-identical; Accept always attempts it in finally. No Initialize/Cleanup action or automatic retry exists. No deletion is included.

## 6. Verification

Seven new tests pass: exact 0022-only SQL wrapper diff, all seven SQL/PLpgSQL parses, remaining trigger-owner dependencies, prior commit/hash/event binding, rejection of conflicting history before mutation, read-only scenario rehydration/expiry refusal, no old bootstrap/probe/scenario replay/distinct receipts, and seven-stage commit-before-scenario ordering. Scripted/mocked checks are not native SQL execution.

Additional verification passed: PowerShell AST, unchanged stop logic, package/source/candidate hashes, 80 embedded SQL parser checks, Git diff whitespace and whitespace of 25 new/modified files. The existing offline harness/candidate suites also passed all 14 tests (21 passing tests including the seven new tests). Their standalone catalogue-dependent 0013 parser diagnostic remains explicitly reported; its prior native compilation result is separately evidenced above. Database-executing suites were not run under this no-SQL authorization. No native compilation/application/retry is newly claimed in this batch.

## 7. Exact proposed operator procedure and verdict

**Conditional GO for one separately authorized synthetic continuation** of this exact package at the existing stopped 0021 checkpoint. This request includes only scoped synthetic password refresh and in-memory reuse of the existing synthetic signing gateway key. Do not execute the following mutation actions under the present offline-only authorization. No new cluster, bootstrap replay, Supabase access or cleanup is needed or permitted.

```powershell
Set-Location -LiteralPath 'C:\Users\lenovo\contratpro'
$D2SuffixSha = '2915ced778459c381a0e6e7143dfc06c5f295daa58e0ef7ed71356a641a2d607'

& '.\scripts\d2-native-0022\session.ps1' -Action Bind -PackageSha256 $D2SuffixSha
& '.\scripts\d2-native-0022\session.ps1' -Action Start -PackageSha256 $D2SuffixSha
& '.\scripts\d2-native-0022\session.ps1' -Action Status -PackageSha256 $D2SuffixSha
& '.\scripts\d2-native-0022\session.ps1' -Action Accept -PackageSha256 $D2SuffixSha

# Independent verified stop if needed:
& '.\scripts\d2-native-0022\session.ps1' -Action Stop -PackageSha256 $D2SuffixSha
```

Tokens: **D2-0022-BIND**, **D2-0022-START**, **D2-NATIVE-0022**, **D2-0022-STOP**. Use the existing synthetic bootstrap password only at the masked prompt. Run one command at a time and stop on any failure. Existing execution policies remain; report exact rejection rather than changing launcher/policy. A later partial commit/new error needs its actual checkpoint reviewed, never automatic retry.

Remaining blockers: owner authorization, fresh state/resource/fixture-validity gates and actual remaining native results. Current total is **9/16 committed**, not complete acceptance. A successful synthetic suffix still does not resolve 0008/0009 provenance, reproduce managed Auth/Storage services or authorize managed migrations.

Changed artifacts: separate scripts/d2-native-0022 driver/checkpoint/binding/lifecycle/manifest and byte-identical resource/baseline/scenario copies; separately versioned 0022 candidate and six unchanged suffix copies; focused continuation tests and offline builder sources; this document, acceptance report and tracker. No previous pinned source/candidate/package/private evidence was modified.
