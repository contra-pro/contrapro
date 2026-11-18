-- DRAFT ONLY. Requires a separately authorized role-provisioning operator.
-- No login identities, passwords, database grants or role memberships are created.
-- Existing role-name collisions must abort; do not silently reuse unknown roles.
BEGIN;
CREATE ROLE contratpro_migration_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
CREATE ROLE contratpro_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
CREATE ROLE contratpro_platform_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
COMMIT;
