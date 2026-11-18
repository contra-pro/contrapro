# Restricted database identities — planned, not provisioned

No login, password, role membership or server resource was created in P1.2B-1R.
The SQL drafts still create three restricted NOLOGIN capability/owner roles only.

| Identity | Intended authority |
| --- | --- |
| Administrative bootstrap login | Separately authorized role provisioning and CREATE on the isolated database; owns the migration control journal |
| Migration login | NOSUPERUSER, NOBYPASSRLS, NOCREATEROLE, NOCREATEDB, NOREPLICATION; explicit SET authority to migration owner; no inherited owner authority |
| Agency application login | Restricted LOGIN; inherits only `contratpro_runtime` capabilities; no administrative/platform parent roles |
| Platform application login | Separate restricted LOGIN; inherits only `contratpro_platform_runtime`; currently no tenant-table privileges |

For PostgreSQL 16+, use reviewed membership options: migration login -> owner with
ADMIN FALSE, INHERIT FALSE, SET TRUE. Application login -> its capability role with
ADMIN FALSE, INHERIT TRUE, SET FALSE, and appropriate login INHERIT behavior. These
are desired outcomes, not SQL executed here. Check supported syntax/authority on
the actual provider. NOINHERIT alone does not forbid SET ROLE.

Between the runner's bootstrap and foundation stages, an authorized operator must
grant only the migration login's required SET authority, database CREATE privilege
to the owner, and journal schema USAGE plus journal SELECT/INSERT to the migration
login. The runner does not grant any of those authorities automatically.

The administrative bootstrap login owns `migration_control`; the migration owner,
agency runtime and platform runtime receive no control-schema/table privileges.
The runner returns to its original login with SET LOCAL ROLE NONE before inserting
journal records. Journal history is an administrative control, not evidence protected
against its trusted owner. Protect operational credentials separately.

## Mandatory verification before ordinary runtime use

Connect with the actual restricted login. Do not connect as `postgres`/administrator
and merely SET ROLE to simulate a restricted client: RESET ROLE could restore the
privileged session identity.

Verify and record:

1. `session_user` is the intended restricted login; initial `current_user` is that
   login, not owner/admin. RESET ROLE cannot recover a more privileged identity.
2. Login/capability roles have no superuser, BYPASSRLS, CREATEROLE, CREATEDB or
   replication flags. Runtime is not a schema/table/function owner.
3. Direct/transitive role memberships and PostgreSQL 16+ ADMIN/INHERIT/SET options.
   Agency runtime must not be a member of migration owner, migration login,
   platform owner/admin/runtime roles, or elevated predefined roles. Platform
   runtime must not inherit agency runtime. Check pg_auth_members transitively.
4. `pg_has_role(..., 'MEMBER')` and `pg_has_role(..., 'SET')` against every privileged
   role; attempt forbidden SET ROLE operations using actual runtime connections.
5. Effective schema/database/table/column/function grants including PUBLIC and
   inherited grants. Explicitly check public-schema CREATE, database CREATE/TEMP,
   journal access, function execution and exposed Data API schemas.
6. Runtime INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES privileges against the intended
   narrow contract; RLS does not protect TRUNCATE or confer missing table privileges.

Do not repair a failed check by granting runtime a managed/service role or owner.
If PUBLIC grants need changes, review their impact on the dedicated development
project first; do not silently alter provider services or shared workloads.

## Supabase Free considerations

Supabase's managed `postgres` account is administrative, not an unrestricted
superuser. Its ability to provision roles, grant SET authority and delegate schema
creation must be checked on the approved project. Do not attempt to become
`supabase_admin`, `supabase_auth_admin` or another reserved role. No extension is
required by the drafts; verify PL/pgSQL and built-in UUID support on the actual
PostgreSQL version.

The migration runner requires a dedicated direct or session-mode connection, never
transaction pooling. Provider login routing names can differ from SQL session_user;
the latter must match the separately approved expected login. TLS verification is
mandatory; URL SSL/options parameters cannot weaken it. Use an approved certificate
trust source when needed, never rejectUnauthorized=false.

Application transaction-pooler compatibility remains a separate PostgreSQL test:
whole transactions, context reset, cancellation and named prepared-query settings
must be validated for node-postgres/Drizzle. Credentials remain server-only and
separate from future Auth.js session secrets and Google OAuth secrets.
