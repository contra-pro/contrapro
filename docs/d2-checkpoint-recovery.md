# D2 stopped-0021 checkpoint validation correction

2026-11-27 UTC. Offline investigation and package preparation only; no PostgreSQL startup, SQL, role/fixture/password change or migration execution in this batch.

## Exact finding

The owner ran package `2915ced778459c381a0e6e7143dfc06c5f295daa58e0ef7ed71356a641a2d607`. Its private acceptance-receipt-0022.json records FAILED_STOP_NO_RETRY, phase checkpoint-readonly-validation, code ERR_ASSERTION, no SQLSTATE/position/routine, and zero events. The diagnostic is a strict deep-equality failure in the Storage bucket MIME assertion:

| Field | Old checkpoint expected | Observed |
| --- | --- | --- |
| allowed_mime_types | application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document | Both, followed by image/png |
| Bucket public | false | Passed before failed MIME assertion |
| File size limit | 10,485,760 bytes | Passed before failed MIME assertion |

Migration 0016 establishes PDF/DOCX. The accepted V2 **0017–0021 sequence includes 0021's explicit `UPDATE storage.buckets SET allowed_mime_types=array_append(allowed_mime_types,'image/png') WHERE id='contract-documents'`**, for agency logos. See [unchanged accepted 0021 candidate](../supabase/migration-candidates/d2-native-synthetic-v2/20261125002100_agency_rental_workflows.sql). The harness used an obsolete predecessor expectation. The observation is consistent with the intended 0021 state, not evidence of corruption or unintended MIME widening.

This is a checkpoint harness defect, not application SQL, role ownership, time conversion or fixture expiration. The failure occurs after exact history, accepted-object ownership/RLS/function checks, absence of 0022 tables/renames, restricted-role/membership checks, billing-helper permission checks, two synthetic identities/mappings/agencies and bucket privacy/size checks. Those preceding assertions returned successfully in this run. It occurs **before** the pending-signature count, scenario hydration/expiration checks, password refresh, permission refresh or candidate execution. The driver rolled back the read-only transaction and closed clients. No credential refresh or other application mutation was reached. Native startup/shutdown still changes physical WAL/checkpoint/log files; their prior snapshots are preserved, not incorrectly expected to match after another normal shutdown.

## Preserved native state and shutdown

The original stable receipt still records **nine committed migrations, 0013–0021, out of sixteen**. Their exact candidate/acceptance events and successful 0013 compile/deliberate-rollback probe are retained under the original stable package. The new failed read-only receipt has no applied events; its history assertion through 0021 passed before the MIME failure. 0022 remains unapplied, 0023–0028 unattempted. No business/security/concurrency result is relabelled or replayed; see [per-migration native results](d2-0022-continuation.md).

session-0022.json records STOPPED/PID0. Private log data/log/d2-20261127115648.log, SHA-256 `8ad21d78fd4c7d57d18eaf7df3245839b8720d1731110f06cd2f6d07f48bdef8`, records readiness at 11:56:48.925 GMT, fast shutdown at 11:57:35.347 and complete shutdown at 11:57:35.928. No SQL ERROR/FATAL appeared in that run's filtered diagnostic. Fresh read-only metadata checks found no port-54329 listener, no postmaster.pid and no process at recorded server PID 8768. No visible process command line references the owned data directory. Seventeen other postgres processes have inaccessible/null command lines in this context: they were not inspected further or signalled, and are not claimed to belong to this disposable cluster. Shutdown is corroborated for the identified owned server; a blanket assertion about all other processes is not possible.

## Minimal correction and complete preflight

New package [scripts/d2-native-checkpoint](../scripts/d2-native-checkpoint/package-manifest.json) derives from the pinned 0022 package. The bucket assertion still uses exact ordered equality, now PDF/DOCX/PNG as required after 0021. Private status and exact 10 MiB limit remain required. No allow-all/contains-only check, grant or application change is introduced.

All remaining scenario prerequisites are now collected **inside the same REPEATABLE READ READ ONLY checkpoint transaction**, before returning to any password change. Existing synthetic signing material remains in memory only; no key, token, personal record or raw private result is exported. Validation requires:

- Exactly one pending agency-A signing session: version 3, simple assurance, no provider, agency signature present/client absent, checksum bound to the synthetic original and a valid agency evidence fingerprint.
- Exactly one current invitation for that agency/session: unconsumed, zero failures, no previous challenge/verification deadline, exact existing synthetic token/code bindings.
- Both session and invitation validity exceed the database clock by **30 minutes**, providing headroom for the existing 20-minute hard execution deadline. PostgreSQL computes boolean predicates; there is no timestamp string/JavaScript Date conversion or system-clock adjustment.
- Exactly one existing synthetic signing gateway key with the required format; memory-only reuse, no key rotation or logging.
- The original history, ownership, RLS, role restoration, preservation/identity/bucket invariants and absence of failed-0022 effects remain enforced.

The original hydration occurred after disposable password refresh. Moving it before that first mutation closes that ordering gap; any failed prerequisite now refuses migration/credential execution. The subsequent scenario-context phase only adopts the already-validated memory state. No bootstrap, baseline, 0013 probe or previous migration/scenario is replayed.

## Time-sensitive fixture review through 0028

Expiration was **not measured** in the failed run: it stopped before these reads. Do not report the fixtures as expired or currently valid based solely on file times. The source default windows and outstanding dependencies are:

| Fixture/deadline | Source window | Continuation relevance |
| --- | --- | --- |
| Existing signing session | Creation +7 days (0017) | Must remain agency-signed/client-pending with >30 minutes at preflight; used by 0028 verify/sign/finalize |
| Existing signing invitation | Earlier of issuance +24 hours and session deadline | Must have >30 minutes; unconsumed/unrevoked/zero failures; exact token/code |
| Client verification challenge | Created by normal verify action; max 10 minutes, capped by invitation | Not reused; preflight requires no existing challenge. Unchanged 0028 performs verify then client-sign immediately in the same bounded scenario |
| Request JWT exp | Generated per synthetic request, +1 hour | Fresh in unchanged request helper; no stored expired JWT reused or external JWT service |
| Delivery job/event and lease from 0018 | Invitation-bound job deadline, events +7 days; transient worker lease | Prior acceptance evidence retained; not reclaimed or used by remaining scenarios. No renewal required |
| Sheets OAuth state/outbox lease | Short-lived state already consumed; worker leases | Not reused; OAuth replay refusal remains previous evidence, no provider contacted |
| Billing subscription period | Creation +1 month | Prior dashboard/tenant test complete; remaining dedicated profile/signature scenarios do not require an active billing admission or renewed period |
| Preview/generation/reminder/maintenance leases | Created only by later actions, usually seconds/minutes; preview +24 hours | New structures introduced by pending migrations; no previous preview/reminder/maintenance fixture is resumed |
| Agency membership invitations (0021/0027) | +7 days when created | Prior native harness did not create one; remaining 0027 scenario saves/gets personal profile, not an invitation acceptance |

No fixture expiration caused the demonstrated failure; **no fixture renewal is implemented or authorized**. If the future read-only preflight establishes expiration, stop before mutations. For invitation-only expiration while the session is still valid, a separately reviewed normal agency `renew` transition with a new unique token/code/request ID can revoke the old invitation, append evidence and increment the session version; the existing 0028 scenario's fixed token/version inputs would need an explicitly versioned adaptation. Do not directly UPDATE expires_at or reuse its token primary key. If the session has expired, normal expiry/new-session/agency-sign transitions would create new evidence and repeat previously accepted business work; that exceeds this continuation's scope. Neither case is silently adopted by this package. No exact row-changing renewal command is offered without an observed expired fixture and explicit authorization.

## Binding and package

New package SHA-256:

`3fc505018ec531a0b3446f4247e53cc39bc7d7d391475de71fb170a1cf857d12`

It preserves and verifies five prior package manifests/bound sources and the original nine native commit/scenario events. It additionally binds the exact failed checkpoint receipt and **1,653 stopped private data/evidence files**. Original immutable evidence/log hashes are checked; changed physical data pages receive a new, separately recorded stopped snapshot. server.key remains private and is not read into a manifest. Private paths, configuration/HBA/auto-config, resources, loopback TLS/SCRAM, 2 GiB RAM/10 GiB disk startup gates, output/time limits and verified PID shutdown remain unchanged.

Exclusive new artifacts: checkpoint-binding.json, session-checkpoint.json, acceptance-receipt-checkpoint.json and startup-checkpoint.log. Bind refuses existing artifacts; acceptance receipt creation is exclusive. Before Start the entire new frozen snapshot is verified; while running, prior non-data evidence/logs remain immutable. No previous receipt, state, log, package or candidate is overwritten. All seven corrected-suffix candidates and its manifest remain unchanged; the 0022 v3 correction remains pending actual native application. The original V1/V2 candidates and historical drafts remain unchanged.

## Verification

Nine focused offline tests pass: reproduction of original mismatch; strict corrected MIME/privacy/size contract; complete fixture/time/key preflight and refusal cases; preserved history/ownership/membership/rollback checks; frozen prior results/receipt binding; unchanged seven candidates with SQL/PLpgSQL parsing; complete preflight before mutation and unchanged Stop-Own/finally; suffix stop-on-failure; all strict identity assertions. Tests use scripted clients, never PostgreSQL.

The existing offline harness/candidate suites also pass all 14 tests. One unchanged scripted scenario trace passes, parsing 254 generated SQL invocations and checking parameter arity/session isolation. Total: **24 passing offline tests**. Additional checks pass: 80 embedded SQL parser checks, all seven suffix SQL/PLpgSQL parses, PowerShell AST, package/source/old-package/candidate hashes and whitespace. The original catalogue-dependent 0013 standalone parser limitation is still explicitly reported by the offline source suite; its previously completed native compilation is separately retained, not replayed. No native result for 0022–0028 is claimed.

## Exact next operator action (separate authorization required)

Conditional GO for **one bounded synthetic continuation of this exact package on the existing stopped cluster**, subject to fresh resource/state and complete preflight gates. This includes only previously described disposable postgres/authenticator password refresh and in-memory reuse of the existing synthetic signing key. It includes no fixture mutation, renewal or new baseline. Current authorization is offline-only, so none of the following actions was invoked here.

```powershell
Set-Location -LiteralPath 'C:\Users\lenovo\contratpro'
$D2CheckpointSha = '3fc505018ec531a0b3446f4247e53cc39bc7d7d391475de71fb170a1cf857d12'

& '.\scripts\d2-native-checkpoint\session.ps1' -Action Bind -PackageSha256 $D2CheckpointSha
& '.\scripts\d2-native-checkpoint\session.ps1' -Action Start -PackageSha256 $D2CheckpointSha
& '.\scripts\d2-native-checkpoint\session.ps1' -Action Status -PackageSha256 $D2CheckpointSha
& '.\scripts\d2-native-checkpoint\session.ps1' -Action Accept -PackageSha256 $D2CheckpointSha

# Independent verified shutdown, if needed:
& '.\scripts\d2-native-checkpoint\session.ps1' -Action Stop -PackageSha256 $D2CheckpointSha
```

Tokens, in order: D2-CHECKPOINT-BIND, D2-CHECKPOINT-START, D2-NATIVE-CHECKPOINT; Stop uses D2-CHECKPOINT-STOP. Supply the existing synthetic bootstrap password only at the masked prompt. Run commands individually and stop on failure; no automatic retry or policy override. Accept retains verified Stop-Own in finally. The previous startup/acceptance tokens and pinned package must not be reused for this attempt.

NO-GO for a native retry under the present offline authorization, expired/drifted checkpoint adoption, faithful-target acceptance or managed migrations. Synthetic success does not resolve historical 0008/0009 provenance or reproduce managed Auth/Storage services.

Changed files: new package runtime/binding/checkpoint/lifecycle/manifest and focused tests; offline builder/state/binding sources; this report, D2 acceptance report and MVP tracker. The baseline/resources/scenarios are unchanged copies; no application UI/business logic or migration candidate was edited.
