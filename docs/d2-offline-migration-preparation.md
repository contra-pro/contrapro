# D2 offline migration preparation — 2026-11-27

**Subsequent environment-preparation update:** matching PG17.11 share/lib resources have now been located by permitted discovery; the blocked pg_config command was not bypassed. Native lifecycle/model/acceptance orchestration is prepared, with explicit historical-baseline boundaries. See [current environment package and exact next commands](d2-native-environment-package.md) and [separate reconciliation strategy](d2-historical-baseline-strategy.md). Earlier missing-resource/harness statements below are historical. No prior provenance search/candidate generation was repeated, and no native execution is authorized or claimed.

## Result

D2.1 bounded local provenance investigation, D2.2 offline candidate packaging and D2.3 read-only environment discovery are complete within their authorized scope. **Sixteen executable native-test candidates (0013–0028) are prepared; none is native accepted or a managed release.** Exact historical 0008/0009 deployment provenance remains unresolved. D1 remains closed with classification B. No SQL, remote connection, service/container start, provisioning, installation, feature activation, commit, push or deployment occurred.

The native-test package is [supabase/migration-candidates/d2-native-synthetic-v1/manifest.json](../supabase/migration-candidates/d2-native-synthetic-v1/manifest.json), SHA-256 **`c5f3bcaa94e92843e26a55b9069542cc9274800d003155e4aee4e4b7bfb2cdc8`**. [Per-migration contracts](d2-candidate-contracts.md) specify source/candidate hashes, dependencies/predecessor, transactions, ownership/grants/RLS, data preservation, recovery and native scenarios for every version. These are new derivatives; all historical sources and the D1 packet are unchanged.

## D2.1 — bounded provenance findings

Read-only search covered local main/origin-main refs, tags (none), four distinct reachable/reflog commits and unreachable-commit inventory (none). It did not fetch Git remotes. Unreferenced blobs without trustworthy filenames were not indiscriminately content-scanned. Relevant repository roots were docs/deployment-0008, docs/deployment-0009, docs/evidence, .verification, supabase/migration-drafts and any repository-root backup/archive/export/artifact/deployment directories. The traversal was depth/file/size bounded, excluded symlinks, node_modules, .git content traversal and .env files; no unrelated personal-directory recursion occurred.

Downloads discovery was limited to ContratPro-labelled direct filenames. Four specifically relevant 0009 SQL files were fingerprinted; unrelated personal files were not read. Two exact staging directories named by the old manifests were checked; both are absent. No relevant backup/archive or authenticated execution receipt establishing deployed 0008/0009 bytes was found in the inspected scope. No encrypted archive was decrypted or arbitrary backup restored. This is a bounded unavailability finding, not a claim that no artifact exists elsewhere.

| Artifact / lineage | Exact source identity | Deployment conclusion |
| --- | --- | --- |
| 0008 vehicles, all four inspected commits | `11e948603bdfa765d35867e2fd88d94f4cb0434e058c1766b64a42d82634c023` | Local source identity recovered; no authenticated deployed-byte binding |
| Timestamped 0009 in initial commit c31c693 | `4080c240ae99bb24f4e798d4cf6fd095ca78108a4c1a7d3b0abe65a7cfe05da3` | Additional historical Git source; not automatically the applied version |
| Timestamped 0009 after ACL normalization, including ddeada0/ae41f6c | `41ca983123f02593c8168a4e57cfaa52e85080cff90451fb7c188ed15c606f3f` | Matches current inventory; exact target origin still unresolved |
| 0009 local patch, v2 review, rollback rehearsal | Downloads copies exactly match the already inventoried repository hashes | Duplicate sources recovered, no execution provenance; rollback remains non-forward |
| Repository v3 production candidate | `8bf9a117aa01bfca25dc118dbe26fb6c05d7faf068a20a2b46db93fce3977307` | Not replaced or promoted |
| Downloads v3 production candidate | `6a2a52798dd5bfbd0a5ce36fbe118c972a69e109a6b7f8231b320d8cb050e0c6` | A distinct additional source with the same filename; not substituted into the baseline |

The two v3 files are neither byte-identical nor merely line-ending variants. They each parse to 75 top-level statements; the differing statement is a postcondition DO block with `has_function_privilege('PUBLIC',...)` versus `has_function_privilege('public',...)`. The other parsed statement structures match after location normalization. Even equivalent application DDL would not establish byte provenance; the postcondition literal itself can affect native execution and is not waived. No historical file was corrected or rerun. Any chosen synthetic 0009 baseline must independently pass native checks.

Old deployment manifests explicitly describe offline preparation, absent live authority or zero live operations. They establish local staging/source fingerprints, not successful target application. D1's version-only history confirms recorded 0008/0009, but has no raw source checksum for them; its function hashes cannot prove the original migration byte stream. The separate role-bootstrap journal checksum remains a distinct, valid observation and is not generalized to the native history.

Detailed bounded fingerprints/references are in `.verification/d2/provenance.json`. This report contains paths/hashes and selected JSON field names, not credential values or raw private database rows.

### Baseline reconciliation strategy

1. Preserve recorded target 0000–0012 and every source variant. Do not replay, adopt through IF NOT EXISTS, repair history, overwrite a candidate with a same-named Downloads file or reset the project.
2. For native candidate testing, use a separately reviewed **candidate-synthetic baseline**, explicitly labelled as such and containing only synthetic users/agencies. It may test forward SQL without proving faithful target-upgrade compatibility. No native baseline SQL is executed in this batch, and the bootstrap/provider fixture is not yet a released execution package.
3. Faithful managed upgrade acceptance still needs either retained original deployment artifacts/receipts (especially 0008/0009, including amendments) or an owner-approved current-state reconciliation route. If originals are unavailable, a later narrowly authorized schema/function-definition export for the actual predecessor can establish a current semantic starting point, not retrospectively authenticate old bytes. Review it privately, create a separately reviewed forward reconciliation contract and retain UNKNOWN historical provenance explicitly. Do not silently waive the blocker.
4. No additional remote collection is proposed now. First use the local artifacts found here and obtain an explicit baseline decision. Any indispensable later full-definition/history export requires its separate bounded authorization; no Auth/customer records, passwords or token values are needed for that source/schema review. Actual target data, including both Auth users, must remain preserved under a later managed backup/recovery and compatibility contract.

## D2.2 — canonical candidates and contracts

Exact logical order remains **0013 → 0014 → 0015 → 0016 → 0017 → 0018 → 0019 → 0020 → 0021 → 0022 → 0023 → 0024 → 0025 → 0026 → 0027 → 0028**. See the pinned manifest for exact timestamped filenames and byte hashes. No candidate was placed in supabase/migrations or wired into an application/obsolete foundation runner.

The compiler preserves all parsed source statements except the exact, parser-classified trivial unconditional design-stop and original outer BEGIN/ROLLBACK. It rejects an unexpected/nontrivial guard or transaction shape. New candidate wrappers add:

- A native-only binding to database contratpro_d2_native, PG17.11, loopback port 54329, TLS, non-superuser administrative postgres and explicit synthetic profile/plan/baseline labels. Managed postgres/5432 is refused. Labels are not source provenance or app feature activation.
- Exact expected history prefix, a nonblocking transaction advisory lock, history-table lock, bounded local timeouts and atomic DDL/postconditions/native history INSERT/COMMIT. The candidate owns the transaction/history; it is not nested in the four-file package runner.
- Scoped writer authority: verify the restricted role and existing ADMIN authority, snapshot the executor's own grantor membership edge and effective schema CREATE rights, grant temporary INHERIT/SET/ADMIN plus only missing CREATE, then restore the prior edge/rights before commit. This is administrative native-fixture preparation, not weakened permanent runtime permissions. PG17 grantor/automatic membership behavior and restoration must pass native acceptance before release. No such grant has run.
- Existing-row preservation snapshots for Auth, Storage, identity, tenancy, receipt and platform tables; old values/deletions are rejected, additive columns/rows allowed. Snapshot data stays in transaction-private temporary tables, never printed. This is an additional test invariant, not a proof of preservation on an unexecuted target.
- Declared table ownership/RLS postchecks, restricted writer flags, no new SECURITY DEFINER PUBLIC EXECUTE leak, restored temporary authority and exact final history. Source DO-loop security remains retained and requires native verification.

All sixteen name-level dependency prefixes resolve, including wrapper rename origins. Simulated top-level CREATE TABLE/ADD COLUMN checks found no collision against accepted D1 catalogue shapes and the preceding candidate sequence. This is not complete type/argument/constraint/dynamic-SQL or native compilation proof. Detailed source requirements remain linked in the inventory/contracts.

### Storage configuration

0016 retains its reviewed-source INSERT for **private contract-documents**, 10 MiB (10485760 bytes), PDF and DOCX MIME types, and tenant/path policies on storage.objects. The new candidate asserts those values. Existing unexpected bucket configuration is not silently adopted. 0022's two Storage-policy replacements remain within the same candidate transaction, so no committed policy gap is intended. Provider policy-owner authority must already exist in the authorized native fixture; explicit preconditions refuse missing authority rather than change managed ownership/grants. D1 established SELECT/visibility, not managed policy-DDL authority. This remains a managed-release prerequisite.

Synthetic native schemas can test policy logic, grants and metadata. Actual Supabase Auth JWT/API behavior, Storage API/object bytes, managed role ownership/extension packaging and bucket provisioning still need a later compatible Supabase acceptance environment. Native SQL alone cannot certify those services. No Storage object/bucket was created here.

## D2.3 — local infrastructure feasibility

Observed local metadata only; no connection to existing databases:

| Item | Observation / implication |
| --- | --- |
| PostgreSQL server program | Installed executable reports 17.11; SHA-256 `f5dbfd059f8088b9511a02fc014e659369996fc7d3e88e47658b1cfa2fbb02d2` |
| Native tools | initdb, pg_ctl and pinned psql present in the 17/bin directory |
| initdb / pg_ctl SHA-256 | `d385519a50d2cd5e143e86c2c10acfe0d44d3039d714c8211b804011bca2409f` / `9885ac53af9d67c76c1ddde87c19e6b15539d7c482bca70cd5ead5dad0b7ce3c` |
| Resource completeness | Standard 17/share directory not found; 17 contains bin/installer/lib/scripts. Bootstrap catalogue and extension-control resource locations remain unresolved. Presence of executables does **not** establish initdb readiness |
| Other services | Existing postgresql-x64-17 and postgresql-x64-18 are running; 5432 and 5433 are occupied. They were neither connected to nor modified. Application-specific installations were not reused |
| New port | No listener observed on 54329 at discovery; recheck before later authorized start |
| Docker | CLI installed; com.docker.service stopped, local named-pipe daemon unavailable. No local images/container inventory could be established; no image pull or daemon/service start |
| Capacity | 4 logical CPUs, 7.88 GiB RAM; free RAM varied approximately 1.6–2.5 GiB, disk free approximately 29.97–30 GiB during discovery. These are snapshots, not reservations |

Smallest recommendation: **one new private native PG17.11 cluster at a time**, outside existing service data, loopback 54329, 128 MiB shared_buffers, 4 MiB work_mem, 64 MiB maintenance_work_mem, max_connections 12, synthetic data only. Reserve/measure resource usage; aim for at least 2 GiB free RAM before concurrency testing and approximately 10 GiB disposable disk headroom. These are proposed test settings, not measured acceptance/performance results. A full Supabase stack is unnecessary for the first native relational/concurrency stage and is less suitable for current free RAM; a compatible provider stage remains separately required.

Do not use PostgreSQL 18 resources to fill the missing 17.11 share directory, reuse another app's running cluster, or copy/share existing data directories. First establish the approved matching 17.11 catalogue/extension resources. `pg_config.exe --sharedir` was blocked before execution; no alternative invocation was used to run it. If suitable resources are truly missing, obtain explicit approval for a matching distribution/installation instead of downloading one automatically.

### Lean-ctx restrictions observed

These exact commands were rejected; no allowlist/policy change or equivalent reroute occurred:

```powershell
& './scripts/d2-offline/discover.ps1' | Set-Content -LiteralPath '.verification/d2/infrastructure.json'
& 'C:/Program Files/PostgreSQL/17/bin/pg_config.exe' --sharedir
& 'C:/Program Files/PostgreSQL/17/bin/pg_config.exe' --pkglibdir
```

The Set-Content pipeline and the pg_config batch were rejected before their pipelines ran. Infrastructure findings above are summarized from permitted read-only discovery output and directory metadata; no raw infrastructure.json capture is claimed. Permanent `lean-ctx allow` or policy disablement is not an acceptable remedy. A supported command-scoped authorization or an owner-provided already-known resource path can resolve the pg_config binding; manual operator action remains subject to applicable policy.

## Verification, modified files and limits

- Four focused Node tests pass. SQL parser passes 16/16 candidates; standalone PL/pgSQL passes 15/16. 0013's identical original-source `r.starts_at is not a known variable` diagnostic remains explicitly native-catalogue dependent. Tests reject nontrivial guard transformations and preserve UTF8 Arabic text.
- Candidate hashes/order/reproducibility are checked offline; source SHA-256s match the D1 local inventory. All retained source-statement fingerprints remain in the manifest. No historical file was edited.
- Dependency-name/rename and top-level column/table checks pass for all sixteen; native semantic/security/data/concurrency acceptance remains unexecuted.
- No application build/full MVP audit/PGlite SQL suite was run: those are outside this batch's no-SQL restriction. No new dependency was installed. Whitespace checks cover D2 documents/scripts/candidates.
- New files: scripts/d2-offline/{candidates.mjs,candidates.test.mjs,dependencies.mjs,discover.ps1,provenance.mjs,report.mjs,verify.mjs}; sixteen native-test SQL candidates plus manifest; this report and d2-candidate-contracts.md. Updated D2 acceptance plan, D1 worksheet, completion plan and MVP tracker. Local preparation details are retained in .verification/d2/ without raw private database records.

## Exact next owner action

In one response, provide an approved matching **17.11 share/catalogue resource path** (or command-scoped approval for the blocked read-only pg_config query), and any retained original 0008/0009 deployment receipt/source path; explicitly say if originals are unavailable. No secret is needed. Do not permanently allow commands or change global policy.

Once resources are bound, the next **separately authorized** action is a new disposable native fixture at `C:\Users\lenovo\AppData\Local\ContratPro-D2-native\pg17-54329`, database contratpro_d2_native, localhost:54329, using the pinned server/tools and candidate manifest. Its bounded scope is private ACL/TLS initialization, start/PID tracking, synthetic role/provider/baseline fixtures, accepted candidate native tests, controlled rollback/restore scenarios and authenticated stop/cleanup of that new fixture only. Bootstrap/fixture execution and custody commands must be made concrete and reviewed before invocation; this batch does not claim an executable native operator harness or approved bootstrap. If artifact provenance remains unavailable, authorize **candidate-synthetic testing only**, not faithful managed-upgrade acceptance. Existing services/data and the two real target Auth users stay untouched. No managed migration/reset/role change or provider activation is authorized by this next native-test scope.
