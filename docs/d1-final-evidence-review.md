# D1 final evidence review — 2026-11-27

**Final target classification: B — existing ContratPro schema requiring migration reconciliation. D1 authorized read-only evidence collection and review are complete. This does not declare migration execution readiness.** No further remote evidence collection is presently needed to close D1.

## Final integrity and visibility verdict

All seven final receipt entries match their expected order: separately pinned Q13, then Q8b/Q9/Q10/Q12a/Q12b/Q12c. Captured SQL hashes match the original manifest or the Q13 additive fingerprint; stdout hashes and byte counts match; all stderr files are empty; each native process has a valid PID, exit code 0, null signal and confirmed termination. All receipt timestamps fall in the new bounded authorization window. Version/journal outputs have complete row-count envelopes and remain below caps; header-only bucket configuration output is valid. Final authorization binds the manifest, Q13 hash, approved project, current-CA confirmation, acknowledged administrative login and no-target-change declaration.

Q13 reports matching session/effective identity, schema USAGE, SELECT and full RLS visibility for every conditional dataset. Nothing was skipped. All three aggregate captures independently report full_visibility_established=true. Platform exists and its relation list contains admin_identities; this closes existence/name coverage only, not complete platform security/definition verification.

The consolidated package has **16 successful logical query slots plus Q13** (17 successful captures), with corrected Q6 filling the original Q6 slot. The failed original Q6 remains a separate historical attempt. Initial two, metadata six, recovery three and final seven total 18 native attempts across the operator's sessions. Original Q6 and all existing receipts/authorizations/query copies remain untouched. Older receipts do not record numeric exit codes; successful status/confirmed exit is not retroactively converted into numeric proof. These records are hash-checked local evidence, not signed execution attestation.

Original manifest SHA-256 remains `d941d752f6a42d628f251262cec8a83d52dad9f5f920b14bbc77e8e00129ef8c`. Corrected Q6 remains `3125f33bfd961c38597a2ac8a156eac3dd397f9e368e7db07bd6e8ebc9df15d6`, linked to original Q6 `70a83c6979a16c62c3cba6d60e0f9a149bad54ca7a9076fdfa8469fb07c2af94`. Q13 remains `5ea6e4f753a4b8693079a2bc0c3f260786ca4873562d528a34abecb3bfbabdcc`. Immutable manifest preparation-state labels are superseded by actual receipts, not edited.

Private evidence location: `C:\Users\lenovo\AppData\Local\ContratPro-D1-evidence\d1-initial-20261127T084944Z-427397da94bd4e239d26d116778a2a2a`. No raw CSV, function bodies, history statements, personal records, credentials or tokens are copied into documentation. The reviewer made no network connection or SQL execution.

## Observed migration state and data presence

| Evidence | Verified observation | Consequence |
| --- | --- | --- |
| Native migration versions | Exactly 13 version rows: logical 0000–0012, matching the timestamp identifiers in the reconciliation matrix | Recorded installed prefix; no later or unexpected native version observed |
| Separate foundation journal | Only 0000_roles.sql, ordinal 0, runner 1; checksum matches local `21151a1df3618242132084c03f86916280e6c1503e3303b60c87a411beb098b7` | Verified journal checksum identity for role bootstrap, not authorization to resume its 0001–0003 into existing schemas |
| Auth users | Aggregate count 2, complete visibility | Target is not data-empty; no identities read or classified as real/synthetic |
| Storage buckets / objects | Aggregate counts 0 / 0, complete visibility | No observed Storage content; does not imply managed Storage infrastructure has been activated or tested |
| contract-documents bucket | No matching configuration row | Required bucket absent; future setup is separately authorized and version/provider-contract dependent |
| Application catalogue | Existing identity/tenancy/app_private tables, public RPCs and platform.admin_identities | Rules out clean installation on this target |

The detailed [catalogue review](d1-consolidated-catalogue-review.md) remains valid: 14 application tables in its three covered schemas, plus platform.admin_identities now known by name; 39 application function rows plus three auth helpers; 95 constraints, 89 triggers, 34 indexes and 54 policies within the defined scope. Public has no relation despite RPCs. This is not an exhaustive catalogue of every provider schema/object. Extension metadata includes pg_stat_statements 1.11, pgcrypto 1.3, plpgsql 1.0, supabase_vault 0.3.2 and uuid-ossp 1.1. PostgreSQL is 17.11. No Vault contents were read.

Target binding combines the owner-confirmed development-only project/route, qualified session-pooler login, certificate confirmation and successful verify-full operator configuration. Generic SQL database identity alone does not cryptographically identify the Supabase project reference. Pooler backend TLS=false is distinct from client-to-pooler verification. No TLS relaxation occurred. Postgres remains administrative, not least privilege; Q13 SELECT checks now resolve the conditional collection permission uncertainty, not the login's inherent breadth.

## Reconciliation and final classification

**B** is supported by existing application objects and a contiguous recorded native prefix through 0012. **A** is contradicted by schemas, history and Auth presence. **D** no longer applies to basic target classification because adequate scoped evidence exists. **C** is not asserted: the shorter separate role-bootstrap journal has a different purpose and is not, by itself, an inconsistency. No duplicate/unexpected native version or contradictory checked catalogue state was observed. Byte provenance and deep semantic compatibility remain unresolved; classification B is not proof that every recorded migration body matches local candidates.

The complete [0000–0028 reconciliation matrix](d1-migration-reconciliation-worksheet.md) separates applied-recorded, verified metadata/checksum, pending, mutually exclusive, local divergence and unresolved states across all 37 artifacts. No target source is deemed divergent solely because local alternatives differ. Obsolete collection commands and old pending deployment plans are superseded as current instructions; no deployed 0009 variant is invented.

0008: native version and vehicle objects are verified; original applied bytes remain unproven. 0009: native version and receipt-writer family are verified; exact forward variant remains unproven. Version-only history has no source checksum, and selected function hashes do not recover the original deployment SQL. No full-history source collection was authorized or performed. Local manifests are local artifact proof, not target-byte provenance. The matching separate 0000 bootstrap checksum is the only captured target source checksum and must not be generalized to the native sequence.

## Canonical completion route and remaining evidence

Use an **existing-target reconciliation and upgrade**, never a clean foundation replay/reset. Retain native recorded 0000–0012; reconcile exact predecessor artifacts and security/data invariants; then package and accept **0013 → 0014 → 0015 → 0016 → 0017 → 0018 → 0019 → 0020 → 0021 → 0022 → 0023 → 0024 → 0025 → 0026 → 0027 → 0028** in that dependency order. The matrix links exact local source files and SHA-256s. This is a proposed logical path; no release manifest is approved. Guarded/ROLLBACK drafts must become separately reviewed candidates without altering historical files. Do not delete guards or run all 37 artifacts. Provision required Storage configuration only under a later approved contract.

One consolidated provenance request remains for faithful D2 upgrade reproduction: supply a local path to original deployed SQL/commit receipts or an existing private deployment export for the recorded prefix, especially 0008 and the selected 0009 variant, including manual amendments. If unavailable, state that; no secret or remote credentials are needed. D2 may test candidate synthetic baselines with explicit uncertainty, but faithful target-upgrade acceptance stays blocked. Any later indispensable full-history/function-body export needs its own explicit bounded authorization and must be consolidated after reviewing local artifacts first; it is not an automatic D1 retry.

## D2 readiness

**GO for D2 offline candidate preparation and native test planning; NO-GO for native execution at present and NO-GO for managed migration application.** See [D2 plan](d2-native-postgresql-acceptance-plan.md). Native execution needs explicit isolated target/provisioning/mutation/recovery authorization, a reviewed executable candidate manifest with transaction ownership and a defensible baseline. No container/database/role was created and no full application audit was restarted. Payment/pricing/final legal approval, A6/manual acceptance, provider activation and production readiness remain deferred.
