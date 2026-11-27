# D1 migration compatibility prerequisites

Prepared from local source only. **No target schema was inspected, no Supabase/native connection was made and no compatibility is claimed.** Guarded drafts through 0028 and all migration history remain unchanged. C2 adds no migration. D1 is an evidence/compatibility phase, not automatic permission to apply SQL.

## Exact next steps

1. Obtain approval for a named isolated target and read-only schema/history evidence collection. Explicitly exclude the existing production VPS and managed production project. Record target owner, environment, host/port, database/OID, expected roles, TLS/CA and backup/rollback authority without including passwords or connection strings in reports.
2. Establish server version, extensions, database identity, primary/recovery status, encoding/collation and session-pooler behavior. Then select version-compatible catalog queries. Do not assume PostgreSQL 16+ membership `SET`/`ADMIN`/`INHERIT` options exist on every target.
3. Collect the schema-only evidence below using least-privilege read access. Redact login details and never export Auth identities, invitation/code hashes, gateway/encryption keys, OAuth credentials, legal acceptances or recipient payloads merely to inspect compatibility.
4. Reconcile the separate local migration streams and exact remote journal entries/checksums. Stop on unknown, edited, missing, duplicated, divergent or unjournaled objects. Do not rename or renumber historical artifacts, automatically adopt an existing schema, or treat a filename as proof it was applied.
5. Produce an object-by-object compatibility report and an approved ordered executable plan for a disposable native clone. Review role ownership/default ACLs, RLS, SECURITY DEFINER/search paths, managed Auth/Storage dependencies and immutable historical data. Keep guards intact in source. Test-only in-memory guard removal is not a deployment procedure.
6. Run actual multi-session native PostgreSQL concurrency/lease/idempotency, role/SET/ADMIN, expiry/replay, tenant-isolation, rollback and interruption tests on that authorized clone. Verify historical contract versions, signature captures/timestamps, evidence hash chains, final checksums, legal records and same-row Sheets projections remain unchanged or evolve only by their intended operation.
7. Before any separately authorized migration execution, establish reviewed backups/restore feasibility, write freeze, external-side-effect holds, target confirmation, pinned plan hash, strict CA/TLS, separate executor, timeouts/advisory lock and uncertain-COMMIT recovery procedure. D5 actual restore acceptance remains deferred; an unverified restore must not be represented as an available rollback guarantee.
8. Submit the exact report, plan, permissions, backup limits and native results for execution approval. Do not run a remote migration as part of D1 preparation or infer production compatibility from passing local suites.

## Required target evidence

| Evidence | Required content |
|---|---|
| Server/target | Version, database name/OID, address/port, recovery state, TLS/CA verification and exact session identity |
| Schemas/relations | Names, owners, columns/types/defaults/nullability, PK/FK/unique/check/exclusion constraints, indexes, triggers, sequences and dependencies for application schemas |
| Functions | Exact signatures, owners, language, volatility, SECURITY DEFINER, search_path/row_security settings, ACLs and definition hashes; secure review of full definitions when needed |
| Roles/memberships | LOGIN/NOLOGIN, BYPASSRLS, inheritance, membership SET/ADMIN/INHERIT options appropriate to version; no password hashes |
| Grants/RLS | Schema/table/sequence/function/default privileges; ENABLE/FORCE RLS and policy predicates/roles; unauthorized tenant and direct table access checks |
| Managed dependencies | `auth.uid()/role()/jwt()`, canonical subject mappings, storage metadata/bucket/policy contracts, required extensions and managed service versions |
| Journals | Structure/owner/marker/columns and exact reviewed checksums for existing journals; inspect Supabase history only if it exists and is approved for collection |
| Data invariants | Counts/constraints and scoped synthetic invariant checks sufficient to prove preserved references and immutable histories; avoid raw PII dumps |
| Operational state | Schedules, leases, uncertainty/restore holds and key-reference counts without key values; all dispatch disabled for clone verification |

The existing executor checks `migration_control.journal` with marker `contratpro migration journal v1`, exact owner/shape and an immutable migration plan. Its source `packages/infrastructure/database/src/migrations/manifest.ts` currently enumerates four separate foundation files `0000_roles.sql` through `0003_rls_grants.sql`. It is **not** a generic runner for every Supabase draft.

## Local streams and known compatibility blockers

- `supabase/migrations/` contains the timestamped baseline and 0001–0007 history. Those bytes must remain frozen and be matched to actual target history; C2 has no new applied-history evidence.
- `supabase/migration-drafts/` contains 0008, multiple 0009 candidates/patch/rehearsal variants, specifically named 0010/0011/0012 candidates and timestamped 0013–0028 drafts. A wildcard “apply every SQL file” is invalid. D1 must identify the approved 0009 lineage and 0010–0012 prerequisites before planning later batches.
- Existing executor target/session/CA and manifest pinning is deliberately development-only and restrictive. Do not swap in a different URL, disable TLS, broaden the manifest or weaken authority checks to reach a new target. A changed target needs a reviewed execution contract.
- PGlite projections and parser tests do not establish native role ownership/default ACLs, managed permissions, real concurrent connections, Storage behavior or executor privilege equivalence.
- Existing managed Supabase Auth/Storage dependencies require compatible services and separate managed configuration recovery. PostgreSQL portability is a preservation goal, not evidence that bare PostgreSQL can serve the complete application.
- Drafts 0027/0028 add profile/legal/onboarding and signature representation constraints; no legal documents are seeded, production registration remains gated, and legacy signature finalization must retain its recorded renderer behavior.

## Permission and backup prerequisites

Read-only evidence collection should use catalog visibility and explicitly approved schema access only. Native execution needs a separately reviewed administrative/migration principal with the exact required schema/object creation/ownership and role delegation permissions; application/worker principals must not inherit those powers. Existing least-privilege worker gateway roles remain NOLOGIN and capability scoped.

Reuse A5 `scripts/operations/backup.mjs`, integrity manifests and `post-restore-quarantine.sql`. A consistent backup includes a frozen database, private source/template/intermediate/final document and logo bytes, immutable signing evidence, journals, managed-service configuration inventory and externally age-encrypted recovery keys, then encrypted repository storage. Restore only to an explicitly approved isolated empty target; verify hashes and apply external replay holds before any traffic/worker access. No backup, restore, quarantine SQL or destructive operation was run in C2.
