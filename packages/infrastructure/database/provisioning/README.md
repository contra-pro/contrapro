# P1.6A foundation authority review package

Status: OFFLINE DRAFT, NOT AUTHORIZED FOR EXECUTION. No executor is added.
Do not pass foundation-authority.sql to the migration runner or submit it wholesale.
It is outside the frozen manifest. A future separately reviewed executor/operator
must interleave the checks below and withhold COMMIT unless every postcondition passes.

## Identities and minimum change

Use the already approved Session Pooler routing username
postgres.gllsiklbvqpxzucvkehw, with SQL session_user = current_user = postgres.
The schema/table/function owner remains contratpro_migration_owner (NOLOGIN).
No new login, password, ownership transfer or journal grant is needed: postgres
already owns migration_control and its journal and records migrations after
SET LOCAL ROLE NONE. Do not substitute a new executor without another design review.

Two privileges only:
1. CREATE on database postgres to contratpro_migration_owner, without grant option.
2. Membership in that owner role to postgres, ADMIN FALSE, INHERIT FALSE, SET TRUE,
   explicitly GRANTED BY postgres. This is a separate grantor row, preserving the
   existing supabase_admin -> postgres ADMIN TRUE / INHERIT FALSE / SET FALSE row.
   PostgreSQL 17 can record memberships from multiple grantors. Effective ADMIN
   remains true from the pre-existing provider grant; this draft adds no ADMIN.

The executor can explicitly become the owner inside foundation transactions.
It does not inherit owner privileges automatically. Owner CREATE permits creating
schemas throughout this database; PostgreSQL cannot restrict this database privilege
to four future schema names. This is administrative migration authority, never
ordinary application authority. Review its later revocation separately.

Neither runtime role is a recipient. No role attributes, outgoing ContratPro
memberships, schema/table/function ACLs, journal ACLs, PUBLIC or managed grants
are changed. No SET ROLE to supabase_admin is proposed.

## Preconditions and future operational sequence

All checks require new explicit authorization and one dedicated verified-TLS Session
Pooler connection, never transaction pooling. Reuse the migration CA validation and
exact endpoint binding without invoking apply. Do not inspect or log credentials.
Pin database OID 5, SQL identities postgres, project routing, PostgreSQL 17,
non-recovery state and the accepted backend address/port:
2a05:d018:184f:1e01:cea0:7ef7:7fd2:c39e / 5432. Keep backend PID stable within
this session only; neither PID nor shared pooler hostname proves project isolation.

Before BEGIN, confirm the frozen manifest checksum
981c55ac79a3a8bb975c50b726cd06e950af640dec156c5e2ccf7abbe8ddea01,
the nine approved hashes, exactly bootstrap history and no foundation schemas.
Use the fixed journal/shape/ownership checks from the existing verifier; do not
run the migration apply runner. Preserve the accepted bootstrap baseline.
BEGIN must occur only after target checks; execute the four fixed SET LOCAL
commands in the draft, recheck identity and establish bounded baselines inside
that transaction before issuing either GRANT.

Require the three restricted roles' approved attributes, no outgoing memberships,
and exactly the three known incoming provider rows: target roles each once,
member postgres, grantor current supabase_admin/OID 10 with SUPERUSER/CREATEROLE,
ADMIN true, INHERIT false, SET false. No other matching row is permitted.
Require postgres's direct ADMIN authority on the owner, and database CREATE WITH
GRANT OPTION (or equivalent ownership as reported by the privilege check).
CREATEROLE or ordinary database CREATE alone is not proof of delegation authority.
Require owner CREATE=false and owner SET=false initially; if already provisioned
or ambiguous, stop for review rather than replaying. Require no foundation objects.

Take bounded exact pre/post snapshots of database ACLs and existing journal/schema
ACLs. Reject overflow and any unexpected change. The only database ACL delta is
non-grantable CREATE for the owner; inspect its grantor and require an explained
authorized delegation path. The only membership delta is the explicit postgres
grantor row specified above. Preserve all original rows and grants byte-for-byte
at the catalog-field level. No ACL absence is interpreted as denial: use acldefault.

## Fixed read-only verification queries

These are catalog/approved journal queries, not application reads. Results are for
restricted review, not arbitrary public diagnostic output. LIMIT uses a sentinel:
reject roles >3, memberships >4, database ACL >64; retain the pre/post baseline.
Catalog booleans below are checks, not permission-changing statements.

```sql
SELECT current_database() AS database, session_user::text AS login,
 current_user::text AS role, d.oid::bigint AS database_oid,
 host(inet_server_addr()) AS server_address, inet_server_port() AS server_port,
 current_setting('server_version_num')::integer AS version,
 pg_is_in_recovery() AS recovery, pg_backend_pid() AS backend_pid
FROM pg_catalog.pg_database d WHERE d.datname=current_database();

SELECT rolname, oid::bigint AS oid, rolcanlogin, rolsuper, rolcreatedb,
 rolcreaterole, rolinherit, rolreplication, rolbypassrls, rolconnlimit,
 rolconfig, rolvaliduntil
FROM pg_catalog.pg_roles WHERE rolname IN
 ('contratpro_migration_owner','contratpro_runtime','contratpro_platform_runtime')
ORDER BY rolname LIMIT 4;

SELECT r.rolname AS role, u.rolname AS member, g.oid::bigint AS grantor_oid,
 g.rolname AS grantor, g.rolsuper, g.rolcreaterole,
 g.oid=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='supabase_admin') AS current_admin,
 m.admin_option, m.inherit_option, m.set_option
FROM pg_catalog.pg_auth_members m
JOIN pg_catalog.pg_roles r ON r.oid=m.roleid
JOIN pg_catalog.pg_roles u ON u.oid=m.member
JOIN pg_catalog.pg_roles g ON g.oid=m.grantor
WHERE r.rolname IN ('contratpro_migration_owner','contratpro_runtime','contratpro_platform_runtime')
 OR u.rolname IN ('contratpro_migration_owner','contratpro_runtime','contratpro_platform_runtime')
ORDER BY r.rolname,u.rolname,g.oid LIMIT 17;

SELECT r.rolname,
 has_database_privilege(r.oid,current_database(),'CREATE') AS database_create,
 pg_has_role('postgres',r.oid,'SET') AS executor_set,
 has_schema_privilege(r.oid,'migration_control','USAGE,CREATE') AS journal_schema,
 has_table_privilege(r.oid,'migration_control.journal',
 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS journal_table
FROM pg_catalog.pg_roles r WHERE r.rolname IN
 ('contratpro_migration_owner','contratpro_runtime','contratpro_platform_runtime')
ORDER BY r.rolname LIMIT 4;

SELECT has_database_privilege(current_user,current_database(),'CREATE WITH GRANT OPTION')
 AS can_delegate_database_create;

SELECT a.grantor::bigint, a.grantee::bigint, a.privilege_type, a.is_grantable
FROM pg_catalog.pg_database d,
 LATERAL aclexplode(COALESCE(d.datacl,acldefault('d',d.datdba))) a
WHERE d.datname=current_database()
ORDER BY a.grantor,a.grantee,a.privilege_type LIMIT 65;

SELECT n.nspowner::bigint, n.nspacl, c.relowner::bigint, c.relacl,
 ARRAY(SELECT a.attname::text || ':' || COALESCE(a.attacl::text,'')
 FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.oid
 AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum) AS column_acls
FROM pg_catalog.pg_namespace n JOIN pg_catalog.pg_class c ON c.relnamespace=n.oid
WHERE n.nspname='migration_control' AND c.relname='journal';

SELECT id,ordinal,checksum,target_id,runner_version,applied_by
FROM migration_control.journal ORDER BY ordinal LIMIT 5;

SELECT nspname FROM pg_catalog.pg_namespace
WHERE nspname IN ('identity','tenancy','platform','app_private')
ORDER BY nspname LIMIT 5;
```

Also reuse the existing fixed verifier safeguards SELECT: exact 5000/2000/10000ms
and, for a separately authorized read-only confirmation, transaction_read_only=on.
The provisioning transaction itself is read-write; do not falsely call its GRANTs
read-only. No role impersonation test is part of these catalog queries.

## Postconditions before COMMIT

Identity, PID, role attributes, bootstrap journal and absence of foundation remain
unchanged. Owner database_create=true and executor_set=true. Both runtime roles'
database_create=false; executor_set to either runtime remains false. All three
roles' journal_schema/journal_table remain false. Runtime elevated flags remain
false and no outgoing membership appears. Exactly four membership rows: the
three preserved provider rows plus owner -> postgres, grantor postgres,
ADMIN false, INHERIT false, SET true. Reject missing/extra rows or changed options.
CREATE grant is non-grantable and the only database ACL change.
Journal ownership, ACLs and all bootstrap record fields remain unchanged.

Recheck the runner's existing foundationAuthority and roleBoundary SELECTs.
Both must pass independently; do not weaken these gates.
The bootstrap-only verifier intentionally rejects this new state (four rows and
owner database CREATE). Do not change its bootstrap acceptance policy or present
its expected rejection as corruption. A foundation-aware verifier is a later step.

## Transactions, failure and authorization boundaries

Execute both grants and verify postconditions in ONE transaction, with no migration
DDL or journal write. Any rejection before COMMIT: ROLLBACK, require acknowledgement,
close the connection, stop. No automatic retry, no automatic REVOKE or destructive
cleanup. If BEGIN acknowledgement is lost, attempt rollback and close.
Set COMMIT-attempted before sending COMMIT. Lost acknowledgement, connection loss,
or unconfirmed rollback means uncertain state: stop and preserve sanitized evidence.
A new separately authorized read-only connection must establish the exact catalog
delta before deciding anything else. Confirmed COMMIT is not an authorization to
run foundation migrations. A later read-only confirmation is separately scoped.

## Supabase and event-trigger limitations

Existing ADMIN membership supports the proposed postgres-grantor edge, but only
live permission checks/execution can prove Supabase permits this self-membership
grant and database delegation. Do not repair rejection with a managed-role
impersonation, SUPERUSER, BYPASSRLS, CREATEROLE or wider grants.
If the provider does not permit this exact grantor model, stop for a new review.
No owner/schema transfer and no extension operations are proposed.
GRANT role and database privileges concern shared objects; the six reviewed
schema/extension/PostgREST event hooks are not expected to fire for this command
set. The prior trigger snapshot remains historical evidence, not proof of unchanged
live hooks or provider internals. No trigger is disabled or modified.

This package grants no authority by itself and adds no executable provisioning
entrypoint. Review first; any later connection, provisioning transaction,
post-COMMIT confirmation and foundation execution need explicit bounded approval.
