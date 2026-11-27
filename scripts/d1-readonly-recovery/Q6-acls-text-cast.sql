BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='2s';
SET LOCAL idle_in_transaction_session_timeout='10s';
SELECT count(*) OVER() AS total_rows,kind,object_name,owner,acl FROM (
 SELECT 'schema'::text AS kind,n.nspname AS object_name,pg_catalog.pg_get_userbyid(n.nspowner) AS owner,n.nspacl::text AS acl
 FROM pg_catalog.pg_namespace n WHERE n.nspname IN ('identity','tenancy','app_private','public','auth','storage','supabase_migrations','migration_control')
 UNION ALL
 SELECT 'relation',n.nspname||'.'||c.relname,pg_catalog.pg_get_userbyid(c.relowner),c.relacl::text
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('identity','tenancy','app_private')
 OR (n.nspname='storage' AND c.relname IN ('objects','buckets'))
 OR (n.nspname='supabase_migrations' AND c.relname='schema_migrations')
 OR (n.nspname='migration_control' AND c.relname='journal')
 UNION ALL
 SELECT 'column',n.nspname||'.'||c.relname||'.'||a.attname,pg_catalog.pg_get_userbyid(c.relowner),a.attacl::text
 FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE a.attnum>0 AND NOT a.attisdropped AND a.attacl IS NOT NULL AND n.nspname IN ('identity','tenancy','app_private','supabase_migrations','migration_control')
 UNION ALL
 SELECT 'type',n.nspname||'.'||t.typname,pg_catalog.pg_get_userbyid(t.typowner),t.typacl::text
 FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
 WHERE n.nspname IN ('identity','tenancy','app_private') AND t.typisdefined
 UNION ALL
 SELECT 'default',COALESCE(n.nspname,'<global>')||':'||d.defaclobjtype::text,pg_catalog.pg_get_userbyid(d.defaclrole),d.defaclacl::text
 FROM pg_catalog.pg_default_acl d LEFT JOIN pg_catalog.pg_namespace n ON n.oid=d.defaclnamespace
 WHERE (d.defaclnamespace=0 OR n.nspname IN ('identity','tenancy','app_private','public','storage'))
 AND (pg_catalog.pg_get_userbyid(d.defaclrole)='postgres'
 OR left(pg_catalog.pg_get_userbyid(d.defaclrole),11)='contratpro_'
 OR d.defaclrole IN (SELECT c.relowner FROM pg_catalog.pg_class c
 JOIN pg_catalog.pg_namespace ns ON ns.oid=c.relnamespace
 WHERE ns.nspname IN ('identity','tenancy','app_private')))
) s ORDER BY kind,object_name,owner LIMIT 5001;
ROLLBACK;
