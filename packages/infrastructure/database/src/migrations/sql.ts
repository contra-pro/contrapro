// Control-plane SQL only. Importing these constants never executes SQL.
export const journalColumns = ["id:text:true", "ordinal:integer:true", "checksum:text:true", "target_id:text:true",
  "runner_version:integer:true", "applied_at:timestamp with time zone:true", "applied_by:text:true"];

export const queries = {
  configure: "SET statement_timeout = '60s'; SET lock_timeout = '5s'; SET idle_in_transaction_session_timeout = '60s'; SET search_path = pg_catalog;",
  identity: `SELECT current_database() AS database, session_user::text AS login, current_user::text AS role,
    (SELECT oid::bigint FROM pg_catalog.pg_database WHERE datname = current_database()) AS database_oid,
    host(inet_server_addr()) AS server_address, inet_server_port() AS server_port,
    pg_is_in_recovery() AS recovery, current_setting('server_version_num')::integer AS version,
    pg_backend_pid() AS backend_pid`,
  lock: "SELECT pg_try_advisory_lock(1470359581, 1718059856) AS locked, pg_backend_pid() AS backend_pid",
  heldLock: `SELECT pg_backend_pid() AS backend_pid, EXISTS (SELECT 1 FROM pg_catalog.pg_locks
    WHERE locktype = 'advisory' AND pid = pg_backend_pid() AND classid = 1470359581
    AND objid = 1718059856 AND objsubid = 2 AND granted) AS locked`,
  unlock: "SELECT CASE WHEN pg_backend_pid() = $1 THEN pg_advisory_unlock(1470359581, 1718059856) ELSE false END AS unlocked",
  status: `SELECT to_regclass('migration_control.journal')::text AS journal,
    EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'migration_control') AS namespace_exists`,
  fresh: `SELECT NOT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace
      WHERE nspname IN ('identity', 'tenancy', 'platform', 'app_private', 'migration_control'))
    AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname IN
      ('contratpro_migration_owner', 'contratpro_runtime', 'contratpro_platform_runtime')) AS fresh,
    (SELECT rolcreaterole OR rolsuper FROM pg_catalog.pg_roles WHERE rolname = session_user) AS can_provision,
    has_database_privilege(session_user, current_database(), 'CREATE') AS can_create_journal`,
  createJournal: `CREATE SCHEMA migration_control AUTHORIZATION CURRENT_USER;
    REVOKE ALL ON SCHEMA migration_control FROM PUBLIC;
    CREATE TABLE migration_control.journal (
      id text PRIMARY KEY,
      ordinal integer NOT NULL UNIQUE CHECK (ordinal BETWEEN 0 AND 3),
      checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
      target_id text NOT NULL CHECK (length(target_id) BETWEEN 8 AND 64),
      runner_version integer NOT NULL CHECK (runner_version = 1),
      applied_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      applied_by text NOT NULL DEFAULT session_user
    );
    REVOKE ALL ON TABLE migration_control.journal FROM PUBLIC;
    COMMENT ON TABLE migration_control.journal IS 'contratpro migration journal v1';`,
  journalShape: `SELECT n.nspowner::regrole::text AS schema_owner, c.relowner::regrole::text AS table_owner,
    c.relkind = 'r' AND NOT c.relrowsecurity AND NOT EXISTS
      (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid = c.oid AND NOT tgisinternal) AS shape_safe,
    ARRAY(SELECT a.attname::text || ':' || format_type(a.atttypid, a.atttypmod) || ':' || a.attnotnull::text
      FROM pg_catalog.pg_attribute a WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped ORDER BY a.attnum) AS columns,
    EXISTS (SELECT 1 FROM pg_catalog.pg_constraint p WHERE p.conrelid = c.oid AND p.contype = 'p'
      AND p.conkey = ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid = c.oid AND attname = 'id')]) AS primary_safe,
    EXISTS (SELECT 1 FROM pg_catalog.pg_constraint p WHERE p.conrelid = c.oid AND p.contype = 'u'
      AND p.conkey = ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid = c.oid AND attname = 'ordinal')]) AS ordinal_safe,
    obj_description(c.oid, 'pg_class') AS marker
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.oid = 'migration_control.journal'::regclass`,
  history: "SELECT id, ordinal, checksum, target_id, runner_version FROM migration_control.journal ORDER BY ordinal",
  record: "INSERT INTO migration_control.journal (id, ordinal, checksum, target_id, runner_version) VALUES ($1, $2, $3, $4, 1)",
  restrictJournal: `REVOKE ALL ON SCHEMA migration_control FROM contratpro_migration_owner, contratpro_runtime, contratpro_platform_runtime;
    REVOKE ALL ON TABLE migration_control.journal FROM contratpro_migration_owner, contratpro_runtime, contratpro_platform_runtime;`,
  roleBoundary: `SELECT (SELECT count(*) FROM pg_catalog.pg_roles WHERE rolname IN
      ('contratpro_migration_owner', 'contratpro_runtime', 'contratpro_platform_runtime')) = 3
    AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname IN
      ('contratpro_migration_owner', 'contratpro_runtime', 'contratpro_platform_runtime')
      AND (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolcanlogin OR rolinherit))
    AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles r ON r.oid = m.member
      WHERE r.rolname IN ('contratpro_migration_owner', 'contratpro_runtime', 'contratpro_platform_runtime'))
    AND NOT has_schema_privilege('contratpro_runtime', 'migration_control', 'USAGE')
    AND NOT has_schema_privilege('contratpro_platform_runtime', 'migration_control', 'USAGE')
    AND NOT has_schema_privilege('contratpro_migration_owner', 'migration_control', 'USAGE')
    AND NOT has_database_privilege('contratpro_runtime', current_database(), 'CREATE')
    AND NOT has_database_privilege('contratpro_platform_runtime', current_database(), 'CREATE')
    AND NOT COALESCE(has_schema_privilege('contratpro_runtime', to_regnamespace('public'), 'CREATE'), false)
    AND NOT COALESCE(has_schema_privilege('contratpro_platform_runtime', to_regnamespace('public'), 'CREATE'), false)
    AND NOT has_table_privilege('contratpro_runtime', 'migration_control.journal', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    AND NOT has_table_privilege('contratpro_platform_runtime', 'migration_control.journal', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS safe`,
  foundationAuthority: `SELECT has_database_privilege('contratpro_migration_owner', current_database(), 'CREATE') AS owner_create,
    pg_has_role(session_user, 'contratpro_migration_owner', 'SET') AS owner_set`,
} as const;
