BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='2s';
SET LOCAL idle_in_transaction_session_timeout='10s';
SELECT v.query_id,
 current_user='postgres' AND session_user='postgres' AS identity_matches,
 c.relkind='r' AND pg_catalog.has_schema_privilege(n.oid,'USAGE')
 AND pg_catalog.has_table_privilege(c.oid,'SELECT') AS can_read,
 NOT c.relrowsecurity OR r.rolsuper OR r.rolbypassrls OR
 (c.relowner=r.oid AND NOT c.relforcerowsecurity) AS full_visibility,
 EXISTS(SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname='platform') AS platform_exists,
 ARRAY(SELECT pc.relname::text FROM pg_catalog.pg_class pc JOIN pg_catalog.pg_namespace pn ON pn.oid=pc.relnamespace
 WHERE pn.nspname='platform' AND pc.relkind IN ('r','p','v','m','f') ORDER BY pc.relname) AS platform_relations
FROM (VALUES
 ('Q8b-bucket-config','storage.buckets'),
 ('Q9-history-versions','supabase_migrations.schema_migrations'),
 ('Q10-foundation-journal','migration_control.journal'),
 ('Q12a-auth-count','auth.users'),
 ('Q12b-bucket-count','storage.buckets'),
 ('Q12c-object-count','storage.objects')
) v(query_id,relation_name)
JOIN pg_catalog.pg_class c ON c.oid=pg_catalog.to_regclass(v.relation_name)
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
JOIN pg_catalog.pg_roles r ON r.rolname=current_user
ORDER BY v.query_id;
ROLLBACK;
