# ContratPro Supabase-native foundation — P1.7A

P2.2A adds a fourth, **unapplied draft**:
`20261115000400_supabase_auth.sql`. It depends on the three foundation files and
adds a unique Supabase-to-canonical identity link plus self-only authenticated
RLS/SECURITY INVOKER lookup. The original three files remain unchanged. Do not
deploy the expanded pending set under any previous foundation authorization.
See [Auth setup and runtime gates](../docs/supabase-auth.md).

P2.3 additionally prepares `20261115000500_agency_management.sql`, also **unapplied**.
It extends existing agencies and introduces fixed, restricted-role-owned creation/
management capabilities. Read [agency management and activation requirements](../docs/agency-management.md).
Neither new draft is covered by an earlier foundation execution authorization.

P3.1 prepares `20261115000600_clients.sql`, also **unapplied**, after 0005.
It adds the agency client register, permission checks and invoker-only RPCs.
See [clients and activation requirements](../docs/clients.md). This draft is not
covered by any previous deployment authorization. Earlier migrations are unchanged.

OFFLINE PREPARATION ONLY. No project was linked and no migration/history operation
was performed. These files are pending counterparts, not an instruction to db push.
Target for later review: development project gllsiklbvqpxzucvkehw only.

## Pending migration order

1. 20261115000100_foundation_schema.sql — schemas, identical tables/indexes/
   constraints/composite foreign keys, ENABLE/FORCE RLS, scoped ACL reset/assertion.
2. 20261115000200_foundation_context.sql — the original four SECURITY INVOKER
   functions and fixed search paths, followed by scoped function ACL hardening.
3. 20261115000300_foundation_rls_grants.sql — identical ten policies and narrow
   runtime grants, plus final owner/grantee/privilege/grant-option ACL assertions.

The timestamps are ordering identifiers, not evidence that anything ran.
No 0000/bootstrap file is in this pending set. Every migration requires initial
SQL session_user=current_user=postgres and restricted runtime-role attributes.
It neither creates nor alters roles. Existing runtime memberships may be incoming
postgres administrative grants with ADMIN true / INHERIT false / SET false only;
outgoing runtime memberships and other incoming access paths reject execution.

## Ownership and scoped ACL contract

postgres owns all four private schemas and their new tables/indexes/functions.
There is no SET ROLE, custom-owner authorization or default-privilege dependency.
The unused bootstrap-created custom owner is preserved, not provisioned or dropped.
Application connections must never use postgres, table ownership or BYPASSRLS.

No ALTER DEFAULT PRIVILEGES statement is executed. Public-schema defaults are not
assumed to apply to private schemas. Every file closes its new-object privilege
surface before successful transaction completion:
- Schema/table revocations cover PUBLIC, anon, authenticated, service_role,
  contratpro_runtime and contratpro_platform_runtime.
- Function revocations cover the same set; only the four helpers receive runtime
  EXECUTE in the last migration.
- Only the approved agency runtime receives schema USAGE and narrow SELECT/
  column privileges. Platform runtime receives nothing.
- Effective direct ACL entries are checked with acldefault when ACL is NULL.
  Unexpected/unlisted grantees, non-postgres owners or non-owner grant options
  raise an exception rather than silently inheriting global default grants.
- Invitation recipient_email/token_digest are not selectable. Audit INSERT has
  only agency_id, actor_membership_id, action, request_id and metadata columns.
- The permissions catalogue remains intentionally global; all ten private tables
  retain ENABLE and FORCE RLS. Policies, membership validation and tenant composite
  foreign keys are unchanged. GUCs still depend on the trusted-server SQL boundary.

Known Supabase roles must exist. A missing role makes REVOKE fail; no silent skip.
The checks concern object ACLs; they do not make an administrative superuser/
BYPASSRLS role unprivileged. Actual restricted-login tests remain mandatory.
Future objects require equally explicit hardening; this does not change future
postgres defaults for unrelated Supabase objects.

## Execution and configuration gates — still unresolved

No config.toml, CLI installation, project link, deployment script or connection
credentials were added. The conventional supabase/migrations layout is prepared.
A later separately approved setup must pin/review a compatible Supabase CLI,
prepare the minimal project configuration and verify TLS/target binding.
Do not run supabase init, db push, reset, repair or SQL Editor as part of this slice.

Native files omit outer BEGIN/COMMIT because the selected native runner must own
one atomic transaction per migration, including all guards, DDL, revocations,
assertions and its history update. Verify that guarantee for the chosen CLI version
before execution; statement-by-statement autocommit is forbidden. An unexpected
default grant must cause full-file rollback, never a partially committed exposure.
Do not blindly nest transaction wrappers. Preserve serialization/no concurrent
schema changes during a future deployment; native tooling's actual lock behavior
must be reviewed rather than assumed equivalent to the custom runner.

## Bootstrap reconciliation is a separate task

Bootstrap 0000 is already applied and independently verified in the existing
custom journal. Frozen files and hashes remain the historical source of truth.
This task does not insert any Supabase history record or mark anything applied.
Before a native deployment, reconcile the verified bootstrap roles and retained
migration_control objects with actual native history under separate approval.
Never rerun 0000, add IF NOT EXISTS to hide differences, or mark these three pending
foundation files applied without execution. Do not rewrite the original journal.

The existing custom runner/provisioning scripts remain unchanged as historical
tools, but are not an alternative deployment route for these native files.
The custom owner provisioning authorization does not authorize native migrations.
Do not feed the new files to the frozen custom manifest or update its hashes.
Drizzle remains an offline schema generator, not a deployment mechanism.

## Offline verification and limits

The database workspace's supabase-native.test.ts parses SQL/PLpgSQL, compares
normalized ASTs against frozen tables/indexes/RLS/functions/policies/grants, and
checks all frozen artifact hashes and the original full-manifest checksum.
Source offsets alone are ignored. No PostgreSQL or Supabase CLI runs in tests.

Before any future deployment: independently review these counterparts, reconcile
history, verify effective managed-role ACLs and execute real PostgreSQL RLS tests
through restricted logins under separate authorization. On failure, stop; rely only
on a confirmed per-file rollback. Earlier committed files remain. Uncertain commit/
history outcomes require read-only reconciliation, never automatic retry or repair.
