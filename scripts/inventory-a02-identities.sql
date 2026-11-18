-- Operator preparation only: three nominated synthetic Auth UUIDs, no discovery.
-- Do not run without separate Development read-only execution authorization.
\set ON_ERROR_STOP on
\set VERBOSITY terse
\set ECHO none
\pset pager off
\if :{?candidate_a}
\else
\set candidate_a ''
\endif
\if :{?candidate_b}
\else
\set candidate_b ''
\endif
\if :{?candidate_u}
\else
\set candidate_u ''
\endif
\if :{?development_project_ref}
\else
\set development_project_ref ''
\endif

BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path = pg_catalog;
SET LOCAL TIME ZONE 'UTC';
SET LOCAL statement_timeout = '5000ms';
SET LOCAL lock_timeout = '2000ms';
SET LOCAL idle_in_transaction_session_timeout = '10000ms';

-- Project reference is operator-confirmed routing evidence, NOT server attestation.
-- Privileged visibility is required so RLS cannot masquerade as an unmapped user.
SELECT :'development_project_ref' = 'gllsiklbvqpxzucvkehw'
 AND current_database() = 'postgres' AND session_user = 'postgres' AND current_user = 'postgres'
 AND current_setting('server_version_num')::integer BETWEEN 170000 AND 179999
 AND NOT pg_is_in_recovery() AND current_setting('transaction_read_only') = 'on'
 AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND (rolsuper OR rolbypassrls))
 AND :'candidate_a' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 AND :'candidate_b' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 AND :'candidate_u' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 AND lower(:'candidate_a') <> lower(:'candidate_b')
 AND lower(:'candidate_a') <> lower(:'candidate_u')
 AND lower(:'candidate_b') <> lower(:'candidate_u') AS inventory_guard_ok
\gset
\if :inventory_guard_ok
\else
\echo BLOCKED: Development/session/visibility safeguards or nominated UUIDs invalid
ROLLBACK;
SELECT 1 / 0 AS inventory_blocked;
\endif

WITH nominated(label, subject) AS (
 VALUES ('A', :'candidate_a'::uuid), ('B', :'candidate_b'::uuid), ('U', :'candidate_u'::uuid)
), baseline AS (
 SELECT n.label, n.subject, a.id IS NOT NULL AS auth_exists,
   link.user_id AS canonical_id, u.id IS NOT NULL AS canonical_exists, u.state,
   EXISTS (SELECT 1 FROM tenancy.memberships AS m WHERE m.user_id = link.user_id) AS has_memberships
 FROM nominated AS n
 LEFT JOIN auth.users AS a ON a.id = n.subject
 LEFT JOIN identity.supabase_users AS link ON link.supabase_user_id = n.subject
 LEFT JOIN identity.users AS u ON u.id = link.user_id
), classified AS (
 SELECT b.*,
   CASE WHEN NOT auth_exists THEN 'AUTH_NOT_FOUND'
     WHEN canonical_id IS NULL THEN 'UNMAPPED'
     WHEN NOT canonical_exists OR canonical_id IN (SELECT subject FROM nominated) THEN 'MAPPING_INVALID_FOR_COHORT'
     WHEN has_memberships THEN 'MAPPED_WITH_MEMBERSHIPS'
     WHEN state = 'active' THEN 'MAPPED_ACTIVE_NO_MEMBERSHIPS'
     ELSE 'MAPPED_INACTIVE_NO_MEMBERSHIPS' END AS inventory_state
 FROM baseline AS b
), eligibility AS (
 SELECT c.*,
   CASE WHEN label IN ('A', 'B') THEN inventory_state = 'MAPPED_ACTIVE_NO_MEMBERSHIPS'
     ELSE inventory_state = 'UNMAPPED' END AS eligible_for_nominated_role
 FROM classified AS c
)
SELECT label AS candidate, auth_exists, canonical_id IS NOT NULL AS mapping_exists,
 CASE WHEN canonical_exists THEN state = 'active' ELSE NULL END AS canonical_active,
 CASE WHEN canonical_id IS NOT NULL THEN has_memberships ELSE NULL END AS membership_present,
 inventory_state, eligible_for_nominated_role,
 (SELECT bool_and(eligible_for_nominated_role) AND
   count(DISTINCT canonical_id) FILTER (WHERE label IN ('A', 'B')) = 2 FROM eligibility) AS all_three_ready,
 transaction_timestamp() AS snapshot_at_utc
FROM eligibility
ORDER BY label
LIMIT 3;

ROLLBACK;
\echo INVENTORY_COMPLETE: review three nominated candidates; no changes made
