# Recovered Gate 2 evidence and minimal supplement

**NOT READY FOR GATE 2 EXECUTION APPROVAL. Supplemental SQL is prepared, NOT run.**

## Established — do not query again

The operator recovered the successful Development authority execution: exit 0,
ROLLBACK, and all six scoped tables have observer_select=true and
administrative_delete=true. Those tables are identity.users,
identity.supabase_users, tenancy.memberships, tenancy.agencies, tenancy.clients,
auth.users. These are catalog-confirmed grants, not a validated deletion procedure.
Previously reported history/role/ACL/RLS facts remain accepted, including original
provisioning denial. Auth-table noninternal triggers and rules are zero at that
snapshot; they are not requested again. No actual cohort has been created.

The six recovered event-trigger references are:

| Trigger | Event | Handler |
| --- | --- | --- |
| issue_graphql_placeholder | sql_drop | extensions.set_graphql_placeholder() |
| issue_pg_cron_access | ddl_command_end | extensions.grant_pg_cron_access() |
| issue_pg_graphql_access | ddl_command_end | extensions.grant_pg_graphql_access() |
| issue_pg_net_access | ddl_command_end | extensions.grant_pg_net_access() |
| pgrst_ddl_watch | ddl_command_end | extensions.pgrst_ddl_watch() |
| pgrst_drop_watch | sql_drop | extensions.pgrst_drop_watch() |

Names do not establish safe behavior. No live handler definition or transitive
callee source was supplied or found in the inspected repository. Do not assume
that a handler named grant_* or *_watch cannot affect privileges or other tables.

## Exact supplemental file

`docs/canonical-acceptance/a02-temporary/authority-supplement.sql`

| Output | Missing fact addressed |
| --- | --- |
| One row: writer_can_create_plpgsql | Writer USAGE on plpgsql, needed because installation SETs the writer before CREATE FUNCTION |
| Same row: cleanup_for_update_allowed | UPDATE privilege for at least one identity.users column, including table-level grants, required by cleanup's FOR UPDATE |
| One row: cleanup_catalog_contract_ok | Exact same four-FK/RESTRICT/validation/nondeferral/column-shape and no-custom-identity-trigger/rule predicates as cleanup.sql.in |
| Six fixed event-reference rows | Event tag filters, enabled mode, trigger/handler owners, handler security mode/language, bounded settings metadata and definition fingerprint |

The event join is limited to the recovered six references, not a new discovery
scan. A changed/missing reference blocks assumptions. At most 32 command tags per
row are printed; if tag_count exceeds 32, the list is withheld and completeness
requires separate private review. NULL tags with all_command_tags=true mean all
applicable command tags; they do not mean disabled. Enabled modes and filters must
be interpreted against the proposed CREATE/DROP/schema-privilege operations.

No raw handler bodies, settings values, Auth/account rows, credentials or personal
fields are printed. Fingerprints are change indicators only, not security signatures
or code review. No handler, provisioning RPC or business function is invoked.
Only PostgreSQL catalog/privilege/formatting helpers execute.

The file uses REPEATABLE READ READ ONLY, pg_catalog search path, statement <=5s,
lock <=2s, idle transaction <=10s, ON_ERROR_STOP and final ROLLBACK. Its connection
guard is a per-execution safety prerequisite, not a new authority audit. Shared
output is at most eight data rows plus the fixed marker. Exit 0 captures evidence;
it does not turn false/NULL results or unreviewed handlers into PASS.

## Remaining PostgreSQL review

All two privilege flags and the structural contract flag must be true. The six
references must match and have complete, understood metadata. Then privately
inspect exactly these handler definitions and the relevant transitive calls,
including dynamic SQL and object/tag filtering. Needed source includes:

- set_graphql_placeholder() and pgrst_drop_watch() for removal/sql_drop behavior;
- grant_pg_cron_access(), grant_pg_graphql_access(), grant_pg_net_access() and
  pgrst_ddl_watch() for installation/privilege-change/ddl_command_end behavior.

Transitive function names cannot be inferred honestly from handler names or hashes.
Determine them from the actual private source; do not replace this with an assumed
complete pg_depend call graph. Any new source read must be scoped and authorized;
return only sanitized conclusions, fingerprints and relevant non-secret excerpts.
If a definition contains secrets, do not copy it to chat/shared logs/repository.

This supplement does not execute cleanup, lock cohort rows or validate transaction
runtime behavior. Cohort business-use checks are impossible before nomination/
creation and must be repeated at actual Gate 4 cleanup. The current privilege and
dependency evidence does not authorize that operation.

## Separate external Supabase Auth evidence

PostgreSQL triggers/rules/event triggers are NOT the effective Supabase Auth-hook
configuration. Supabase Development Auth settings must separately establish enabled
hooks and their applicability to Admin user creation and password sign-in, notably
before-user-created and custom-access-token hooks and any configured password/MFA/
email integrations affecting that flow. Capture enabled status, applicable flow,
target function/service reference and reviewed side-effect conclusion. Do not
capture hook secrets, bearer keys or credential-bearing endpoint parameters.
The repository config has no effective hosted Auth-hook configuration to review.
An existing trusted export may be reviewed offline; otherwise read-only Control
Plane/source inspection needs separate authorization. None is performed here.

## Next action / authorization

1. Review this exact supplemental file locally; do not rerun authority-evidence.sql.
2. Obtain new explicit authorization for ONE execution of this supplement on the
   existing verified Development PostgreSQL 17/session-pooler/verify-full connection.
   After all mandatory connection/SQL prechecks pass, the proposed operator command is:

```powershell
& $psql17 -X -w -v ON_ERROR_STOP=1 -f docs/canonical-acceptance/a02-temporary/authority-supplement.sql
```

The command is NOT executed now. $psql17 and the credential-bearing connection
must be the already verified operator setup. No password in argv/output/files.
This authorization would not cover extra function-source SQL or external HTTP.
3. Separately authorize or supply already-captured private handler/source and
   external Auth-hook evidence. Review the combined evidence once.
4. Only then assess readiness for separate Gate 2 write approval. Gates 3/4 remain
   distinct. No grants, deployment, users or activation are authorized by preparation.

## Offline verification

```powershell
node --test scripts/a02-authority-supplement.test.mjs
npm exec -- eslint --config apps/web/eslint.config.mjs --rule "@next/next/no-html-link-for-pages:off" scripts/a02-authority-supplement.test.mjs --max-warnings=0
```

Tests parse statements locally, verify read-only/bounds/no repetition, compare the
cleanup predicate with its actual template and check the exact six references/
sanitized projections. They do not connect to PostgreSQL, execute SQL, compile live
handler bodies, prove privileges or clear external Auth hooks.

Preparation result: 5 targeted tests passed, zero final failures; targeted ESLint
passed. One initial projection-regex test also matched a nested fingerprint input;
it was replaced with a parsed SELECT-target check. SQL was never executed. No
application code, original authority query, migration discovery or credentials changed.
