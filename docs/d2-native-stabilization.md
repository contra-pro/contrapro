# D2 native acceptance stabilization — 2026-11-27

**Outcome:** third failure diagnosed; complete remaining driver/candidate/scenario path reviewed offline; confirmed defects corrected in separate artifacts. Existing stopped synthetic baseline remains the proposed checkpoint. No SQL/startup/retry/reset/deletion occurred. A consolidated next attempt is **conditionally GO for explicit owner authorization**, not a native acceptance pass or managed-release approval.

## 1. Exact third failure and native boundary

The private acceptance-receipt-probe-recovery.json records:

- Phase `0013-native-compile-rollback-probe`, SQLSTATE **0LP01**, routine **AddRoleMems**, no position reported.
- Sanitized diagnostic: **ADMIN option cannot be granted back to your own grantor**.
- Two completed events: checkpoint read-only validation PASS_NO_BOOTSTRAP_REPLAY, then SYNTHETIC_CREDENTIALS_ONLY credential refresh.

The corresponding private server log corroborates the error and completed shutdown. This is **not** the prior 42601/dollar-quoting error. SQL parsing succeeded and native execution reached `SELECT pg_temp.d2_authorize('contratpro_rental_writer'::name)` after the source CREATE ROLE. Its generated helper attempts:

```sql
GRANT contratpro_rental_writer TO postgres
WITH ADMIN TRUE, INHERIT TRUE, SET TRUE GRANTED BY postgres;
```

PostgreSQL 17 automatically gives a non-superuser role creator an administrative grant, recorded with the bootstrap superuser as grantor. Granting ADMIN back through the creator produces a grantor cycle; the engine correctly refuses it. The native evidence matches this exact generated wrapper path, not a historical application SQL defect. The source file's business statements/functions were not reached beyond role creation. The deliberate P0001 injection was **not reached**; r.starts_at native compilation was **not reproduced or cleared**. The corrected probe's parse succeeded, but successful compilation of all 0013 functions is still unproven.

Primary source: [PostgreSQL 17 role creation and AddRoleMems implementation](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/commands/user.c) describes both the automatic creator grant and the ADMIN grantor-cycle rejection. No Supabase connection occurred during this review.

## 2. Committed state, rollback and stopped cluster

The baseline from the earlier successful bootstrap remains committed: disposable roles/database, independent provider/receipt model and model history through 0012, two fictional Auth/canonical identities/agencies. The previous attempt's checkpoint checks passed before the two synthetic login passwords were refreshed. **Those password changes committed**; no role attribute/grant/owner or original data bootstrap was replayed in the third attempt.

0013 began its transaction, acquired locks and created only transaction-local candidate infrastructure/role state before its helper failed. The driver awaited `ROLLBACK` in finally; the transaction never reached a candidate history INSERT/COMMIT. No suffix candidate or scenario completed. This is source/receipt/log control-flow evidence, not a newly executed catalogue query. The future continuation retains mandatory READ ONLY native checkpoint checks before any further mutation; a contradictory role/table/history observation refuses recovery rather than assumes absence.

Read-only checks: session-probe-recovery.json STOPPED/PID0, no postmaster.pid, zero 54329 listeners, zero visible postgres processes whose command lines reference the dedicated data directory. Logs show shutdown completion. No orphan-owned process was observed. All earlier stopped data, logs, receipts and synthetic keys remain; no key contents were read, no deletion/cleanup occurred.

## 3. All confirmed corrections

### A. Candidate-generation authority defect — separately versioned native candidates

New directory: [d2-native-synthetic-v2](../supabase/migration-candidates/d2-native-synthetic-v2/manifest.json), manifest SHA-256 **`70dbdc7fa11a506fd336465255971c82a7ecb5b6c24a3704b022b262f4b8d537`**. All sixteen source wrappers contain the same helper, so the same narrowly scoped correction is applied consistently to sixteen new files. Original v1 manifest `c5f3bcaa94e92843e26a55b9069542cc9274800d003155e4aee4e4b7bfb2cdc8`, original candidates and historical guarded sources are unchanged. The new manifest records every prior candidate SHA-256 and new SHA-256, along with the original source lineage.

Exact SQL diff in the generated authority wrapper (only these two clauses change):

```diff
- GRANT %I TO postgres WITH ADMIN TRUE, INHERIT TRUE, SET TRUE GRANTED BY postgres
+ GRANT %I TO postgres WITH INHERIT TRUE, SET TRUE GRANTED BY postgres
- GRANT %I TO postgres WITH ADMIN %s, INHERIT %s, SET %s GRANTED BY postgres
-   arguments: role_name, original_admin, original_inherit, original_set
+ GRANT %I TO postgres WITH INHERIT %s, SET %s GRANTED BY postgres
+   arguments: role_name, original_inherit, original_set
```

The helper still **requires existing ADMIN authority**, snapshots the exact executor-grantor edge and schema rights, grants only needed temporary INHERIT/SET and missing CREATE rights, then restores the original edge/rights. ADMIN is never altered or increased. A newly introduced self-grant remains ADMIN false and is revoked with RESTRICT. Existing full-edge JSON equality and native driver membership-restoration assertions remain; permanent ADMIN/INHERIT/SET widening is not permitted. No SUPERUSER, BYPASSRLS, permanent writer CREATE or relaxed ownership check is introduced. This corrects a native-test wrapper defect, not historical SQL or product business logic.

Acceptance contract update for **every 0013–0028 native-test candidate**: require valid existing ADMIN provenance, temporary self-membership with ADMIN unchanged, exact restoration or removal of only that self-edge, source object/security/data/history postconditions unchanged. The 0013 rollback probe must now reach the intentional P0001, fully roll back new role/tables/history, then the unmodified v2 candidate can be applied. Other versions must pass the same restoration invariants. Actual PG17 grant semantics remain to be natively verified; the offline tests do not fabricate them.

### B. Delivery negative fixture defect

The old negative test supplied `lease:'not-the-lease'` while accepting only 40001/42501/22023. Actual delivery SQL casts lease to uuid; that malformed input yields **22P02** before the intended lease conflict. New fixture uses the valid, nonmatching `id(999999)` UUID. Expected SQLSTATEs are unchanged; invalid lease does not become a simulated success and 22P02 is not broadly suppressed.

### C. Sheets worker fixture tenant defect

The generic gateway previously set agencyId=null for all public/worker calls. `sheets_command` inserts/looks up an agency-scoped connection before those worker actions, requiring an explicit agency. Existing product tests likewise pass agency for Sheets workers. The fixture now passes the explicit synthetic agency to Sheets worker calls; signing-public and global delivery-worker behavior remains unchanged. No product SQL/authorization is relaxed. Scripted trace asserts this agency contract.

### D. Rollback failure evidence masking

The prior finally block could replace an unexpected native compilation/permission error with a secondary ROLLBACK error. New `runRollbackProbe()` always attempts rollback, preserves the primary unexpected error, attaches a secondary rollback code when present, rejects rollback failure even after the expected injection, and rejects a probe that returns without its deliberate exception. This protects diagnosis and transaction semantics; it does not accept an unexpected SQLSTATE. Future connection loss/uncertain rollback remains stop-and-review, never auto retry.

No other speculative runtime or business-rule changes were made. Guarded source transformations, consent strings, isolation, role flags, ACL/RLS/object/data preservation and transaction/history ordering are retained.

## 4. Complete targeted review ledger

| Path reviewed | Finding / retained control |
| --- | --- |
| SQL generation/string operations | All 16 exact v2 SQL strings and their actual rollback-probe derivatives parse, 32/32. Callback/named dollar delimiter retained; no remaining unsafe replacement-string pattern in driver/baseline/scenarios |
| Dynamic SQL | Role names remain fixed manifest-allowlisted and %I-quoted, relation names regclass-bound, synthetic passwords random-hex/quoted in the private bootstrap channel. Restoration argument count/order checked after removing ADMIN |
| Native driver representations | inet normalized through host(); strict addresses/database/role/PG17.11/port/TLS checks retained. SQL counts explicitly cast int; bigint number_serial used as a presence check, not unsafe JS numeric conversion. JSONB/UUID values remain driver-returned structured/string values |
| Transactions | Candidate owns one BEGIN/COMMIT/history write; fault injected before final COMMIT; explicit rollback attempted for every probe outcome; primary error preserved. No nested baseline replay or dependent query after failed candidate |
| Error classification | Expected probe only exact P0001/message; syntax/0LP01/permission/type failures rejected. Negative lease now exercises valid UUID conflict, not malformed input |
| Roles/ownership/SET ROLE | ADMIN self-cycle removed consistently; existing ADMIN still required; complete membership-edge/CREATE restoration and source writer security checks retained. Authenticator cannot SET ROLE postgres; provider policy-owner fixture remains explicit, not managed privilege proof |
| Baseline and dependency order | Existing READ ONLY checkpoint validates history/roles/table/count/protocol before password refresh; no variant selected and no bootstrap/database/fixture replay. v2 preserves all source statement order and predecessor hashes; rename chain and earlier name/column closure remain unchanged |
| Fixture ordering | Rental lifecycle before document/signature setup; document issue before agency signature; invitation then delivery; Sheets created-event concurrency after Sheets install; billing before later composed wrappers; client completion after B1. Two fixture corrections above; no failing scenario skipped |
| Concurrency/session lifecycle | Original distinct-session lock test remains accepted and is not rerun; scenario duplicate creation still uses two independent authenticator clients. Transaction-local claims and roles restored by COMMIT/ROLLBACK; all clients closed in finally; total-run watchdog retained |
| Evidence | New package/state/receipt/startup-log names, exclusive creation and frozen stopped-tree binding. Every old manifest/capture/log remains intact; candidate commit event still precedes scenario execution so partial progress is recorded |
| Resources/shutdown | Existing verified resource list and 2-GiB RAM/10-GiB disk/free-port gates retained; statement/lock/idle/client/output/disk/overall bounds unchanged. Exact PID/executable/data/creation-time stop function byte-identical; no force-kill or cleanup fallback |

## 5. Verification results and honest limits

- **8 new tests pass**: exact candidate/probe SQL and source diff; ADMIN invariants; primary/rollback error matrix; all sixteen phase order and no retry; UUID/Sheets fixture corrections; all old/current package and stopped snapshot integrity; unchanged lifecycle/security; full staged scripted trace.
- The trace runs all sixteen stages with deliberately scripted responses, parsing **254 exact generated SQL invocations** and checking parameter arity and actor sessions. It is a driver-contract test, **not PostgreSQL or business acceptance**.
- **14 relevant existing tests pass** (native harness offline/mocked suite and original offline candidate suite). No PGlite/database-executing suite ran under the no-SQL restriction.
- Full v2 SQL/probe parsing: **32/32**. Standalone PL/pgSQL: **15/16**, with identical source catalogue-dependent `r.starts_at` diagnostic in 0013. It cannot be resolved by repeating a catalogue-free parser or replacing %ROWTYPE merely to claim success.
- PowerShell lifecycle AST parsing passes. Existing mocked verified-stop/exit-failure/PID-mismatch tests pass; the new stop function is byte-identical. Resource discovery/provenance/D1 preparation were not repeated.
- New package/original packages/resources/candidate bindings and whitespace checks pass. No SQL, bind-state mutation, native retry, initialization, startup, deletion, installation or policy change occurred.

Native execution is still needed to test actual PostgreSQL grant restoration, compile catalogue-bound functions, exercise real row locks/RLS/ownership, validate fixture/product semantics and observe Windows runtime/shutdown. Mocking those outcomes cannot resolve them. The review reduces demonstrated driver/fixture risks; it does not promise a full successful run or silently accept another failure.

## 6. Consolidated continuation package and checkpoint

New pinned package: [scripts/d2-native-stable/package-manifest.json](../scripts/d2-native-stable/package-manifest.json), SHA-256 **`c66be7522cfb4e26a839210adade09150be3eae1a484855aa45a6e27d61623e0`**. All earlier package hashes remain unchanged. The new manifest binds exact v2 candidate-manifest identity; driver verifies every candidate byte before connecting. It freezes **1,384** stopped-session/data/evidence files and requires the exact latest 0LP01/AddRoleMems failure and two completed events.

**Existing cluster suitable, subject to gates; no fresh cluster/reset needed.** Before Bind/Start: original package/source/resource hashes, private ACL/path/config/HBA/auto-config, frozen tree and zero owned PID/listener. After separately authorized Start: corrected TLS/identity guard and existing READ ONLY baseline checks require no suffix history, new writer roles or rental table. Only then refresh the same two lost transient synthetic login passwords and run the corrected probe/v2 suffix and scenarios. No bootstrap replay; no real target access. Failure to establish the checkpoint refuses continuation, without repair/adoption/reset.

Exclusive files: stable-binding.json, session-stable.json, acceptance-receipt-stable.json, startup-stable.log. Prior receipts/sessions/startup and server logs remain frozen/preserved. Same verified stop in Accept finally. No Initialize/Cleanup actions. New errors/uncertain commit require review, not an automatic continuation or history repair.

### Exact proposed commands — one new owner authorization required

Use the approved private owner-operated PowerShell 7 terminal under existing policy. Do not execute until the owner approves this exact package, v2 authority correction and scoped synthetic login refresh. Run one action at a time; stop on failure.

```powershell
Set-Location -LiteralPath 'C:\Users\lenovo\contratpro'
$D2StableSha = 'c66be7522cfb4e26a839210adade09150be3eae1a484855aa45a6e27d61623e0'

& '.\scripts\d2-native-stable\session.ps1' -Action Bind -PackageSha256 $D2StableSha
& '.\scripts\d2-native-stable\session.ps1' -Action Start -PackageSha256 $D2StableSha
& '.\scripts\d2-native-stable\session.ps1' -Action Status -PackageSha256 $D2StableSha
& '.\scripts\d2-native-stable\session.ps1' -Action Accept -PackageSha256 $D2StableSha

# Explicit verified stop if needed independently:
& '.\scripts\d2-native-stable\session.ps1' -Action Stop -PackageSha256 $D2StableSha
```

Tokens: **D2-STABLE-BIND**, **D2-STABLE-START**, **D2-NATIVE-STABLE**, **D2-STABLE-STOP**. Supply only the existing synthetic bootstrap password at the masked prompt. No reinitialization/deletion/managed migration authority is included. Policy rejection must be reported exactly, never bypassed.

## 7. Changed artifacts and recommendation

New scripts/d2-native-stable runtime/fixture/resource copies, binding, probe helper, lifecycle, manifest, stable.test.mjs and scenario-trace.test.mjs; separately versioned sixteen v2 native candidates/manifest; offline builder/binding sources; this report and D2 acceptance/tracker updates. v1 candidates, historical migrations and every old package remain unchanged. Runtime business scenarios differ only in the two proven fixture corrections. No actual application-function SQL was changed.

**Recommendation: conditional GO for one separately authorized synthetic native run of this consolidated package after all gates pass.** NO-GO for declaring synthetic acceptance passed, faithful existing-target upgrade acceptance or managed Supabase migrations. Historical 0008 bytes/0009 lineage remain unresolved. If the next run exposes a native catalogue/business defect, preserve its exact committed checkpoint rather than broadening grants, suppressing errors or replaying bootstrap.
