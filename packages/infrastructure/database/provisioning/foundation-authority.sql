-- P1.6A REVIEW DRAFT ONLY. NOT AUTHORIZED FOR EXECUTION.
-- Outside migrations/drafts: not loaded by the migration manifest or apply runner.
-- Exact target: gllsiklbvqpxzucvkehw / development / postgres / Session Pooler 5432.
-- SQL session_user = current_user = postgres; verified CA/hostname TLS required.
-- All preconditions and an exact bounded catalog baseline in the companion document
-- must pass on the same dedicated connection before BEGIN. Stop on any discrepancy.
-- No retries. A future executor must own this transaction; do not nest transactions.
BEGIN;
SET LOCAL statement_timeout = '5000ms';
SET LOCAL lock_timeout = '2000ms';
SET LOCAL idle_in_transaction_session_timeout = '10000ms';
SET LOCAL search_path = pg_catalog;

GRANT CREATE ON DATABASE postgres TO contratpro_migration_owner;
-- Explicit grantor avoids adopting or changing the provider-owned ADMIN grant.
-- Requires postgres's existing ADMIN authority; no impersonation of supabase_admin.
GRANT contratpro_migration_owner TO postgres
  WITH ADMIN FALSE, INHERIT FALSE, SET TRUE GRANTED BY postgres;

-- Future execution MUST run all documented postcondition SELECTs and abort unless
-- they pass inside this transaction BEFORE COMMIT. This draft is not a standalone
-- fail-closed executor: submitting the entire file without those gates is forbidden.
COMMIT;
