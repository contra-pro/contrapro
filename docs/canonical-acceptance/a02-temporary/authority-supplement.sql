-- PREPARATION ONLY: new authorization required; do NOT rerun authority-evidence.sql.
-- Fixed Development connection required. Catalog reads only; handlers are NOT called.
-- Shared output excludes bodies/settings values, Auth rows, credentials and personal data.
\set ON_ERROR_STOP on
\set VERBOSITY terse
\pset pager off
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path=pg_catalog;
SET LOCAL statement_timeout='5000ms';
SET LOCAL lock_timeout='2000ms';
SET LOCAL idle_in_transaction_session_timeout='10000ms';
-- Per-connection safeguard, not a repeat of role/history/ACL evidence.
SELECT current_database()='postgres' AND session_user='postgres' AND current_user='postgres'
 AND current_setting('server_version_num')::integer BETWEEN 170000 AND 179999
 AND current_setting('transaction_read_only')='on' AND NOT pg_is_in_recovery() AS supplement_guard_ok
\gset
\if :supplement_guard_ok
\else
ROLLBACK;
SELECT 1/0 AS supplement_blocked;
\endif

-- One row: only the two genuinely missing privilege checks.
SELECT transaction_timestamp() AT TIME ZONE 'UTC' AS evidence_at_utc,
 has_language_privilege('contratpro_identity_writer','plpgsql','USAGE') AS writer_can_create_plpgsql,
 has_any_column_privilege(current_user,'identity.users','UPDATE') AS cleanup_for_update_allowed;

-- One row: EXACT structural dependency predicate used by cleanup.sql.in.
-- Excludes future cohort-row/business-use predicates: no cohort exists yet.
SELECT NOT (
 (SELECT count(*) FROM pg_constraint WHERE contype='f' AND confrelid='identity.users'::regclass)<>4
 OR (SELECT count(DISTINCT conrelid) FROM pg_constraint WHERE contype='f' AND confrelid='identity.users'::regclass)<>4
 OR EXISTS(SELECT 1 FROM pg_constraint c WHERE c.contype='f' AND c.confrelid='identity.users'::regclass
   AND (c.confdeltype<>'r' OR c.condeferrable OR NOT c.convalidated OR cardinality(c.conkey)<>1 OR cardinality(c.confkey)<>1
     OR NOT EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.confrelid AND a.attnum=c.confkey[1] AND a.attname='id')
     OR NOT EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
       AND ((c.conrelid='identity.supabase_users'::regclass AND a.attname='user_id')
         OR (c.conrelid='tenancy.memberships'::regclass AND a.attname='user_id')
         OR (c.conrelid='tenancy.agencies'::regclass AND a.attname='created_by_user_id')
         OR (c.conrelid='tenancy.clients'::regclass AND a.attname='created_by_user_id')))))
 OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid IN ('identity.users'::regclass,'identity.supabase_users'::regclass) AND NOT tgisinternal)
 OR EXISTS(SELECT 1 FROM pg_rewrite WHERE ev_class IN ('identity.users'::regclass,'identity.supabase_users'::regclass))
) AS cleanup_catalog_contract_ok;

-- Six rows maximum, ONLY the recovered references; no new trigger discovery scan.
-- Fingerprints are change indicators, not source review/security attestations.
WITH expected(trigger_name,event_name,handler_signature) AS (
 VALUES
 ('issue_graphql_placeholder','sql_drop','extensions.set_graphql_placeholder()'),
 ('issue_pg_cron_access','ddl_command_end','extensions.grant_pg_cron_access()'),
 ('issue_pg_graphql_access','ddl_command_end','extensions.grant_pg_graphql_access()'),
 ('issue_pg_net_access','ddl_command_end','extensions.grant_pg_net_access()'),
 ('pgrst_ddl_watch','ddl_command_end','extensions.pgrst_ddl_watch()'),
 ('pgrst_drop_watch','sql_drop','extensions.pgrst_drop_watch()')
)
SELECT x.trigger_name,e.oid IS NOT NULL AS trigger_present,
 e.evtevent=x.event_name AND e.evtfoid=to_regprocedure(x.handler_signature) AS recovered_reference_matches,
 e.evtenabled AS enabled_mode,pg_get_userbyid(e.evtowner) AS trigger_owner,
 e.evttags IS NULL AS all_command_tags,COALESCE(cardinality(e.evttags),0) AS tag_count,
 CASE WHEN cardinality(e.evttags)<=32 THEN e.evttags ELSE NULL END AS bounded_tags,
 x.handler_signature,p.oid IS NOT NULL AS handler_present,pg_get_userbyid(p.proowner) AS handler_owner,
 p.prosecdef AS security_definer,l.lanname AS handler_language,
 cardinality(COALESCE(p.proconfig,'{}'::text[])) AS setting_count,
 COALESCE(p.proconfig @> ARRAY['search_path=pg_catalog'],false) AS catalog_only_search_path,
 md5(array_to_string(p.proconfig,E'\n')) AS settings_fingerprint,
 md5(pg_get_functiondef(p.oid)) AS definition_fingerprint
FROM expected x LEFT JOIN pg_event_trigger e ON e.evtname=x.trigger_name
LEFT JOIN pg_proc p ON p.oid=to_regprocedure(x.handler_signature)
LEFT JOIN pg_language l ON l.oid=p.prolang
ORDER BY x.trigger_name LIMIT 6;
ROLLBACK;
\echo SUPPLEMENT_CAPTURED_PRIVATE_HANDLER_AND_AUTH_HOOK_REVIEW_REQUIRED
