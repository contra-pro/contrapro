# SQL drafts — NOT executed or approved for application

These files were authored offline. PostgreSQL parsing is not successful execution,
provider compatibility, RLS enforcement or migration certification. P1.2B must prove
those properties on an explicitly approved isolated development target.

## Order and prerequisite gates

| Order | Draft | Required authority / result |
| --- | --- | --- |
| 0000 | `drafts/0000_roles.sql` | Authorized role-provisioning operator; creates three restricted NOLOGIN roles only |
| 0001 | `drafts/0001_schema.sql` | Authorized migration login can SET ROLE to owner; owner has CREATE on approved database; private schemas/tables and forced default-deny RLS |
| 0002 | `drafts/0002_context.sql` | Same owner; invoker context/membership/permission helpers, PUBLIC execution revoked |
| 0003 | `drafts/0003_rls_grants.sql` | Same owner; specific SELECT policies/grants plus constrained audit INSERT |

All drafts retain their own BEGIN/COMMIT for review. The operational runner parses
and removes ONLY those outer wrappers, then owns the transaction containing the
draft body AND its journal insert. Never blindly nest these scripts in another
transaction or apply them manually without journal coordination.
Schema/function/policy changes use
`SET LOCAL ROLE contratpro_migration_owner`. No passwords, login provisioning,
role-membership grants, CREATE DATABASE, extensions or provider-managed schemas.
The owner role is not the runtime role and has no role-provisioning authority.

Before any future execution:

1. Verify the exact non-production target, version, isolated ownership and backup.
2. Inspect existing schemas, roles, PUBLIC grants, role memberships and default
   privileges. Existing name collisions are blockers, not permission to reuse them.
3. Authorize role provisioning and database CREATE permission for the owner. Only
   the migration login may assume owner; neither application nor platform login may.
4. Review the guarded runner/journal, approved SHA-256 plan and single-session lock.
   It is implemented but PostgreSQL execution is unverified. See
   [execution model](../../../../docs/migration-execution.md). Bootstrap and
   foundation are separate deliberate stages; owner authority is granted separately.
5. Review parsed SQL, schema parity and privileges together. Drizzle generation
   alone omits parts of this security design and must never be applied alone.
6. Apply in order, checking ownership, forced RLS and effective grants after each
   commit, before issuing any application login credentials.

An interruption before 0003 leaves runtime access denied. PRIVATE tables acquire
ENABLE and FORCE RLS within 0001's transaction, before the first runtime grant.
The global non-sensitive permission vocabulary is the only table without RLS;
runtime can SELECT it, but cannot modify it or obtain tenant access from it alone.

## Rollback and recovery

- A failed draft must roll back as a unit; no runner may ignore SQL errors.
- Record which commits succeeded and verify checksums before resuming. Do not
  blindly rerun CREATE statements: intentional name collisions fail closed.
- Before use with real data, prove database backup/restore and retain migration
  history. There are no destructive down scripts in this offline slice.
- After committed changes or accepted writes, prefer a reviewed forward correction.
  Never disable RLS or broaden grants to recover from a permissions error.
- If access must be halted, use an authorized operational procedure to stop/revoke
  application access while preserving data and evidence.
- Destructive reset is permissible only with separate explicit authorization for
  a verified disposable test target. Never use DROP CASCADE as an implicit rollback.
- A restore must validate role ownership, grants, function privileges and RLS,
  not just table counts. Role definitions are cluster-scoped and need separate care.

New tables receive no PUBLIC access under the reviewed owner defaults. Owner-wide
function defaults now revoke PUBLIC EXECUTE WITHOUT an IN SCHEMA restriction;
per-schema revocation cannot remove PostgreSQL's global default. Explicit revokes
and narrow grants remain. Later migrations must explicitly
enable/FORCE RLS and authorize only the minimum operation-specific privileges.

Later PostgreSQL ACL tests must inspect the owner's global function default ACL
(`defaclnamespace = 0`), check for conflicting per-schema PUBLIC grants, inspect all
four helper ACLs, and create an approved harmless owner-created function in
`app_private`. Runtime already has schema USAGE, so verify the new function still
cannot be executed without an explicit grant. Parsing SQL alone cannot prove this.
