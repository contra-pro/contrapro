/** Operational metadata discovery only. Creating/importing this file does not connect. */
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { checkServerIdentity } from "node:tls";
import { isIP } from "node:net";
import { createHash } from "node:crypto";

const TARGET = Object.freeze({
  host: "aws-0-eu-west-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: "postgres.gllsiklbvqpxzucvkehw",
});
const CONFIRMATION = "--discover-gllsiklbvqpxzucvkehw-read-only";
const EXPECTED_SQL_USER = "postgres";
const requireDatabase = createRequire(new URL("../packages/infrastructure/database/package.json", import.meta.url));
const EXPECTED_TRIGGERS = Object.freeze([
  ["issue_graphql_placeholder", "sql_drop", "16570"],
  ["issue_pg_cron_access", "ddl_command_end", "16547"],
  ["issue_pg_graphql_access", "ddl_command_end", "16568"],
  ["issue_pg_net_access", "ddl_command_end", "16549"],
  ["pgrst_ddl_watch", "ddl_command_end", "16559"],
  ["pgrst_drop_watch", "sql_drop", "16560"],
].map((entry) => Object.freeze(entry)));

// Fixed allowlist. Export is read-only for offline contract tests; accepts no supplied SQL.
// Only pg_catalog relations and built-in metadata functions are read; never application rows.
export const QUERIES = Object.freeze([
  Object.freeze({ name: "identity", text: `SELECT current_database() AS database,
    (SELECT oid::text FROM pg_catalog.pg_database WHERE datname = current_database()) AS database_oid,
    current_setting('server_version') AS server_version,
    current_setting('server_version_num')::integer AS server_version_num,
    session_user::text AS session_user, current_user::text AS current_user,
    host(inet_server_addr()) AS backend_address, inet_server_port() AS backend_port,
    pg_backend_pid() AS backend_pid, pg_is_in_recovery() AS recovery,
    current_setting('transaction_read_only') AS transaction_read_only,
    current_setting('default_transaction_read_only') AS default_transaction_read_only,
    current_setting('statement_timeout') AS statement_timeout,
    current_setting('lock_timeout') AS lock_timeout,
    current_setting('idle_in_transaction_session_timeout') AS idle_transaction_timeout` }),
  Object.freeze({ name: "role_capabilities", text: `SELECT rolname, rolsuper, rolinherit,
    rolcreaterole, rolcreatedb, rolcanlogin, rolreplication, rolbypassrls
    FROM pg_catalog.pg_roles ORDER BY rolname LIMIT 1001` }),
  Object.freeze({ name: "effective_role_memberships", text: `SELECT rolname,
    pg_has_role(session_user, oid, 'MEMBER') AS member,
    pg_has_role(session_user, oid, 'USAGE') AS inherited,
    pg_has_role(session_user, oid, 'SET') AS can_set_role
    FROM pg_catalog.pg_roles WHERE pg_has_role(session_user, oid, 'MEMBER')
    ORDER BY rolname LIMIT 1001` }),
  Object.freeze({ name: "membership_edges", text: `SELECT parent.rolname AS parent_role,
    child.rolname AS member_role, grantor.rolname AS grantor,
    m.admin_option, m.inherit_option, m.set_option
    FROM pg_catalog.pg_auth_members m
    JOIN pg_catalog.pg_roles parent ON parent.oid = m.roleid
    JOIN pg_catalog.pg_roles child ON child.oid = m.member
    JOIN pg_catalog.pg_roles grantor ON grantor.oid = m.grantor
    ORDER BY parent.rolname, child.rolname LIMIT 1001` }),
  Object.freeze({ name: "database_acl", text: `SELECT d.datname,
    pg_get_userbyid(d.datdba) AS owner, d.datacl::text AS explicit_acl,
    has_database_privilege(session_user, d.oid, 'CONNECT') AS can_connect,
    has_database_privilege(session_user, d.oid, 'CREATE') AS can_create_schema,
    pg_has_role(session_user, d.datdba, 'USAGE') AS inherits_database_owner,
    pg_has_role(session_user, d.datdba, 'SET') AS can_set_database_owner,
    has_database_privilege(session_user, d.oid, 'CREATE WITH GRANT OPTION') AS can_delegate_create,
    has_database_privilege(session_user, d.oid, 'TEMP') AS can_create_temporary,
    ARRAY(SELECT a.privilege_type FROM pg_catalog.aclexplode(
      COALESCE(d.datacl, pg_catalog.acldefault('d', d.datdba))) a
      WHERE a.grantee = 0 ORDER BY a.privilege_type) AS public_privileges
    FROM pg_catalog.pg_database d WHERE d.datname = current_database()` }),
  Object.freeze({ name: "relevant_schema_acls_and_collisions", text: `SELECT n.nspname,
    pg_get_userbyid(n.nspowner) AS owner, n.nspacl::text AS explicit_acl,
    has_schema_privilege(session_user, n.oid, 'USAGE') AS can_use,
    has_schema_privilege(session_user, n.oid, 'CREATE') AS can_create,
    ARRAY(SELECT a.privilege_type FROM pg_catalog.aclexplode(
      COALESCE(n.nspacl, pg_catalog.acldefault('n', n.nspowner))) a
      WHERE a.grantee = 0 ORDER BY a.privilege_type) AS public_privileges
    FROM pg_catalog.pg_namespace n
    WHERE n.nspname IN ('public', 'identity', 'tenancy', 'platform', 'app_private', 'migration_control')
    ORDER BY n.nspname` }),
  Object.freeze({ name: "object_inventory_counts", text: `SELECT
    CASE WHEN n.nspname IN ('public', 'identity', 'tenancy', 'platform', 'app_private', 'migration_control')
      THEN n.nspname ELSE '[other non-system schemas combined]' END AS scope,
    count(DISTINCT n.oid)::integer AS schemas,
    count(*) FILTER (WHERE c.relkind IN ('r', 'p'))::integer AS tables,
    count(*) FILTER (WHERE c.relkind IN ('v', 'm'))::integer AS views,
    count(*) FILTER (WHERE c.relkind = 'S')::integer AS sequences,
    count(*) FILTER (WHERE c.relrowsecurity)::integer AS rls_relations,
    count(*) FILTER (WHERE c.relforcerowsecurity)::integer AS forced_rls_relations
    FROM pg_catalog.pg_namespace n LEFT JOIN pg_catalog.pg_class c ON c.relnamespace = n.oid
    WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
    GROUP BY 1 ORDER BY 1` }),
  Object.freeze({ name: "public_function_execute_counts", text: `SELECT n.nspname,
    count(*)::integer AS routines,
    count(*) FILTER (WHERE EXISTS (SELECT 1 FROM pg_catalog.aclexplode(
      COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
      WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'))::integer AS public_executable,
    count(*) FILTER (WHERE p.prosecdef)::integer AS security_definer
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'identity', 'tenancy', 'platform', 'app_private', 'migration_control')
    GROUP BY n.nspname ORDER BY n.nspname` }),
  Object.freeze({ name: "relevant_default_privileges", text: `SELECT
    pg_get_userbyid(d.defaclrole) AS owner,
    CASE WHEN d.defaclnamespace = 0 THEN '[global]' ELSE n.nspname END AS scope,
    d.defaclobjtype AS defaclobjtype,
    a.grantor::text AS grantor_oid, pg_get_userbyid(a.grantor) AS grantor,
    a.grantee::text AS grantee_oid,
    CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
    a.privilege_type, a.is_grantable
    FROM pg_catalog.pg_default_acl d
    LEFT JOIN pg_catalog.pg_namespace n ON n.oid = d.defaclnamespace
    LEFT JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) a ON true
    WHERE (d.defaclnamespace = 0 AND (d.defaclrole = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = session_user)
      OR pg_get_userbyid(d.defaclrole) = 'contratpro_migration_owner'))
      OR n.nspname IN ('public', 'identity', 'tenancy', 'platform', 'app_private', 'migration_control')
    ORDER BY owner, scope, defaclobjtype, grantee_oid, privilege_type LIMIT 1001` }),
  Object.freeze({ name: "collisions", text: `SELECT 'schema' AS kind, nspname AS name
    FROM pg_catalog.pg_namespace WHERE nspname IN
      ('identity', 'tenancy', 'platform', 'app_private', 'migration_control')
    UNION ALL SELECT 'role', rolname FROM pg_catalog.pg_roles WHERE rolname IN
      ('contratpro_migration_owner', 'contratpro_runtime', 'contratpro_platform_runtime')
    ORDER BY kind, name LIMIT 1001` }),
  Object.freeze({ name: "database_acl_entries", text: `SELECT d.datname,
    pg_get_userbyid(d.datdba) AS owner,
    a.grantor::text AS grantor_oid, pg_get_userbyid(a.grantor) AS grantor,
    a.grantee::text AS grantee_oid,
    CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
    a.privilege_type, a.is_grantable
    FROM pg_catalog.pg_database d CROSS JOIN LATERAL pg_catalog.aclexplode(
      COALESCE(d.datacl, pg_catalog.acldefault('d', d.datdba))) a
    WHERE d.datname = current_database()
    ORDER BY grantee_oid, privilege_type LIMIT 1001` }),
  Object.freeze({ name: "privileged_access_paths", text: `SELECT s.rolname AS source_role,
    t.rolname AS target_role, pg_has_role(s.oid, t.oid, 'MEMBER') AS member,
    pg_has_role(s.oid, t.oid, 'USAGE') AS inherited,
    pg_has_role(s.oid, t.oid, 'SET') AS can_set_role
    FROM pg_catalog.pg_roles s CROSS JOIN pg_catalog.pg_roles t
    WHERE t.rolname IN ('postgres', 'supabase_admin', 'contratpro_migration_owner')
    AND s.oid <> t.oid
    ORDER BY source_role, target_role LIMIT 1001` }),
  Object.freeze({ name: "journal_metadata", text: `SELECT 'schema' AS kind, n.nspname AS name,
    pg_get_userbyid(n.nspowner) AS owner, 'n' AS object_type,
    NULL::text AS column_name, a.grantor::text AS grantor_oid,
    pg_get_userbyid(a.grantor) AS grantor, a.grantee::text AS grantee_oid,
    CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
    a.privilege_type, a.is_grantable
    FROM pg_catalog.pg_namespace n LEFT JOIN LATERAL pg_catalog.aclexplode(
      COALESCE(n.nspacl, pg_catalog.acldefault('n', n.nspowner))) a ON true
    WHERE n.nspname = 'migration_control'
    UNION ALL SELECT 'relation', c.relname, pg_get_userbyid(c.relowner), c.relkind::text,
    NULL::text, a.grantor::text, pg_get_userbyid(a.grantor), a.grantee::text,
    CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
    a.privilege_type, a.is_grantable
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,
      pg_catalog.acldefault(CASE WHEN c.relkind = 'S' THEN 'S'::"char" ELSE 'r'::"char" END, c.relowner))) a ON true
    WHERE n.nspname = 'migration_control' AND c.relname = 'journal'
    UNION ALL SELECT 'column', c.relname, pg_get_userbyid(c.relowner), c.relkind::text,
    col.attname, a.grantor::text, pg_get_userbyid(a.grantor), a.grantee::text,
    CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
    a.privilege_type, a.is_grantable
    FROM pg_catalog.pg_attribute col JOIN pg_catalog.pg_class c ON c.oid = col.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN LATERAL pg_catalog.aclexplode(col.attacl) a ON true
    WHERE n.nspname = 'migration_control' AND c.relname = 'journal'
      AND col.attnum > 0 AND NOT col.attisdropped
    ORDER BY kind, name, column_name, grantee_oid, privilege_type LIMIT 1001` }),
  Object.freeze({ name: "event_triggers", text: `SELECT evtname, evtevent, evtenabled,
    pg_get_userbyid(evtowner) AS owner, evtfoid::text AS function_oid, evttags AS tag_filters
    FROM pg_catalog.pg_event_trigger ORDER BY evtname LIMIT 7` }),
  Object.freeze({ name: "event_trigger_functions", text: `SELECT e.evtname, e.evtevent, e.evtenabled,
    pg_get_userbyid(e.evtowner) AS owner, e.evttags AS tag_filters,
    e.evtfoid::text AS function_oid, n.nspname AS function_schema, p.proname AS function_name,
    pg_get_userbyid(p.proowner) AS function_owner, p.prosecdef AS security_definer,
    l.lanname AS function_language, p.prokind::text AS function_kind,
    pg_catalog.format_type(p.prorettype, NULL) AS return_type,
    ARRAY(SELECT setting FROM unnest(p.proconfig) AS setting
      WHERE setting LIKE 'search_path=%' ORDER BY setting) AS search_path_configuration,
    octet_length(pg_catalog.pg_get_functiondef(p.oid)) AS definition_bytes,
    CASE WHEN octet_length(pg_catalog.pg_get_functiondef(p.oid)) <= 32768
      THEN pg_catalog.pg_get_functiondef(p.oid) ELSE NULL END AS function_definition
    FROM pg_catalog.pg_event_trigger e
    JOIN (VALUES ('issue_graphql_placeholder', 16570::oid), ('issue_pg_cron_access', 16547::oid),
      ('issue_pg_graphql_access', 16568::oid), ('issue_pg_net_access', 16549::oid),
      ('pgrst_ddl_watch', 16559::oid), ('pgrst_drop_watch', 16560::oid)) AS allowed(name, oid)
      ON e.evtname = allowed.name AND e.evtfoid = allowed.oid
    JOIN pg_catalog.pg_proc p ON p.oid = e.evtfoid AND p.prokind = 'f'
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_catalog.pg_language l ON l.oid = p.prolang
    ORDER BY e.evtname LIMIT 7` }),
]);

class SafeError extends Error {}
function requireSafe(condition, message) { if (!condition) throw new SafeError(message); }

const ERROR_CODES = new Map([
  ["ENOTFOUND", "DNS"], ["EAI_AGAIN", "DNS"],
  ["ECONNREFUSED", "NETWORK"], ["ENETUNREACH", "NETWORK"], ["ECONNRESET", "NETWORK"],
  ["ETIMEDOUT", "TIMEOUT"],
  ["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "TLS_CERTIFICATE"],
  ["SELF_SIGNED_CERT_IN_CHAIN", "TLS_CERTIFICATE"], ["CERT_HAS_EXPIRED", "TLS_CERTIFICATE"],
  ["ERR_TLS_CERT_ALTNAME_INVALID", "TLS_HOSTNAME"],
  ["28P01", "AUTHENTICATION"], ["28000", "AUTHENTICATION"],
  ["22023", "STARTUP_CONFIGURATION"], ["0A000", "STARTUP_CONFIGURATION"],
  ["53300", "CAPACITY"], ["57P03", "CAPACITY"],
  ["42501", "INSUFFICIENT_PRIVILEGE"], ["57014", "QUERY_CANCELED"],
  ["UNEXPECTED_SELECT_RESULT", "IDENTITY_VALIDATION"],
  ["DATABASE_IDENTITY_MISMATCH", "IDENTITY_VALIDATION"],
  ["SQL_IDENTITY_MISMATCH", "IDENTITY_VALIDATION"],
  ["READ_ONLY_SAFEGUARD_MISMATCH", "IDENTITY_VALIDATION"],
  ["TIMEOUT_SAFEGUARD_MISMATCH", "IDENTITY_VALIDATION"],
  ["RECOVERY_STATE_MISMATCH", "IDENTITY_VALIDATION"],
  ["UNSUPPORTED_POSTGRESQL_VERSION", "IDENTITY_VALIDATION"],
  ["TIMEOUT_SETUP_FAILED", "TIMEOUT_CONFIGURATION"],
  ["CATALOG_RESULT_INVALID", "PREFLIGHT_EVIDENCE"],
  ["BACKEND_IDENTITY_MISMATCH", "IDENTITY_VALIDATION"],
  ["DISCOVERY_CLEANUP_FAILED", "PREFLIGHT_EVIDENCE"],
  ["EVENT_TRIGGER_INVENTORY_CHANGED", "PREFLIGHT_EVIDENCE"],
  ["EVENT_TRIGGER_DEFINITION_MISSING", "PREFLIGHT_EVIDENCE"],
  ["EVENT_TRIGGER_METADATA_INVALID", "PREFLIGHT_EVIDENCE"],
  ["EVENT_TRIGGER_EVIDENCE_CHANGED", "PREFLIGHT_EVIDENCE"],
]);
const SESSION_TIMEOUT = Symbol("script-owned session deadline");
const STAGES = new Set(["configuration", "TLS/authentication", "read-only transaction", "transaction timeouts",
  ...QUERIES.map(({ name }) => name), "backend stability", "rollback", "cleanup"]);

/** Pure offline classifier: no message parsing, coercion, getter access or error serialization. */
export function classifyConnectionError(error) {
  if (error === SESSION_TIMEOUT) return Object.freeze({ category: "TIMEOUT" });
  let code;
  try {
    if (error !== null && typeof error === "object") {
      code = Object.getOwnPropertyDescriptor(error, "code")?.value;
    }
  } catch { /* Malformed/revoked proxies remain UNKNOWN. */ }
  return Object.freeze(typeof code === "string" && ERROR_CODES.has(code)
    ? { category: ERROR_CODES.get(code), code } : { category: "UNKNOWN" });
}

export function connectionDiagnostic(stage, error) {
  return Object.freeze({ stage: typeof stage === "string" && STAGES.has(stage) ? stage : "UNKNOWN",
    ...classifyConnectionError(error) });
}

function emitDiagnostic(stage, error) {
  console.error(JSON.stringify(connectionDiagnostic(stage, error)));
}

// Accept only positive integer milliseconds/seconds; never coerce non-string inputs.
function timeoutMilliseconds(value) {
  if (typeof value !== "string") return null;
  const match = /^([1-9][0-9]*)(ms|s)$/u.exec(value);
  // JavaScript $ can match before a final newline; require the entire input explicitly.
  if (!match || match[0] !== value) return null;
  const amount = Number(match[1]);
  const milliseconds = amount * (match[2] === "s" ? 1000 : 1);
  return Number.isSafeInteger(amount) && Number.isSafeInteger(milliseconds)
    && milliseconds > 0 ? milliseconds : null;
}

/** Pure identity validation. Errors contain fixed identifiers, never result values. */
export function validateIdentityReply(reply) {
  const check = (condition, code) => {
    if (!condition) {
      const error = new SafeError("Identity validation failed");
      error.code = code;
      throw error;
    }
  };
  check(reply !== null && typeof reply === "object" && reply.command === "SELECT"
    && Array.isArray(reply.rows) && reply.rows.length === 1
    && reply.rows[0] !== null && typeof reply.rows[0] === "object"
    && !Array.isArray(reply.rows[0]), "UNEXPECTED_SELECT_RESULT");
  const row = reply.rows[0];
  check(row.database === TARGET.database, "DATABASE_IDENTITY_MISMATCH");
  check(row.session_user === EXPECTED_SQL_USER && row.current_user === EXPECTED_SQL_USER,
    "SQL_IDENTITY_MISMATCH");
  // The session default is informational; this explicitly read-only transaction must be protected.
  check(row.transaction_read_only === "on", "READ_ONLY_SAFEGUARD_MISMATCH");
  check(timeoutMilliseconds(row.statement_timeout) === 5000
    && timeoutMilliseconds(row.lock_timeout) === 2000
    && timeoutMilliseconds(row.idle_transaction_timeout) === 10000, "TIMEOUT_SAFEGUARD_MISMATCH");
  check(row.recovery === false, "RECOVERY_STATE_MISMATCH");
  check(row.server_version_num >= 160000 && row.server_version_num < 190000,
    "UNSUPPORTED_POSTGRESQL_VERSION");
}

function triggerCheck(condition, code) {
  if (!condition) {
    const error = new SafeError("Event trigger evidence rejected");
    error.code = code;
    throw error;
  }
}

/** Checks observed names/events/OIDs/owner; does not approve hook behavior. */
export function validateEventTriggerInventory(rows) {
  triggerCheck(Array.isArray(rows) && rows.length === 6, "EVENT_TRIGGER_INVENTORY_CHANGED");
  const seen = new Set();
  for (const row of rows) {
    const expected = EXPECTED_TRIGGERS.find(([name]) => name === row?.evtname);
    triggerCheck(expected && !seen.has(row.evtname) && row.evtevent === expected[1]
      && row.function_oid === expected[2] && row.owner === "supabase_admin"
      && ["O", "A", "R"].includes(row.evtenabled), "EVENT_TRIGGER_INVENTORY_CHANGED");
    seen.add(row.evtname);
    triggerCheck(row.tag_filters === null || (Array.isArray(row.tag_filters) && row.tag_filters.length <= 128
      && row.tag_filters.every((tag) => typeof tag === "string" && tag.length > 0 && tag.length <= 128)),
    "EVENT_TRIGGER_METADATA_INVALID");
  }
}

function triggerHeader(row) {
  return [row.evtname, row.evtevent, row.evtenabled, row.owner, row.function_oid,
    row.tag_filters === null ? null : [...row.tag_filters].sort()];
}

export function validateEventTriggerEvidence(inventory, definitions) {
  validateEventTriggerInventory(inventory);
  triggerCheck(Array.isArray(definitions) && definitions.length === 6, "EVENT_TRIGGER_DEFINITION_MISSING");
  validateEventTriggerInventory(definitions);
  const evidence = [];
  for (const row of definitions) {
    const original = inventory.find((entry) => entry.evtname === row.evtname);
    triggerCheck(JSON.stringify(triggerHeader(row)) === JSON.stringify(triggerHeader(original)), "EVENT_TRIGGER_EVIDENCE_CHANGED");
    triggerCheck([row.function_schema, row.function_name, row.function_owner, row.function_language]
      .every((value) => typeof value === "string" && value.length > 0 && value.length <= 63)
      && typeof row.security_definer === "boolean" && row.function_kind === "f" && row.return_type === "event_trigger"
      && Array.isArray(row.search_path_configuration) && row.search_path_configuration.length <= 1
      && row.search_path_configuration.every((setting) => typeof setting === "string"
        && setting.startsWith("search_path=") && setting.length <= 4096), "EVENT_TRIGGER_METADATA_INVALID");
    triggerCheck(typeof row.function_definition === "string" && row.function_definition.trim().length > 0
      && Number.isSafeInteger(row.definition_bytes) && row.definition_bytes > 0 && row.definition_bytes <= 32768
      && Buffer.byteLength(row.function_definition, "utf8") === row.definition_bytes, "EVENT_TRIGGER_DEFINITION_MISSING");
    evidence.push([...triggerHeader(row), row.function_schema, row.function_name, row.function_owner,
      row.security_definer, row.function_language, row.function_kind, row.return_type, row.search_path_configuration,
      createHash("sha256").update(row.function_definition).digest("hex")]);
  }
  // Fingerprint detects evidence drift within this run; it is not an approved definition baseline.
  return createHash("sha256").update(JSON.stringify(evidence.sort((a, b) => a[0].localeCompare(b[0])))).digest("hex");
}

/** Catalog-only readiness, not permission to migrate or proof of future DDL success. */
export function evaluatePreflight(results) {
  const blocked = new Set();
  const unknown = new Set();
  const observations = [];
  const inference = [];
  const required = QUERIES.map(({ name }) => name);
  for (const name of required) {
    if (!Array.isArray(results?.[name]) || results[name].length > 1000) unknown.add("CATALOG_EVIDENCE_INCOMPLETE");
  }
  const rows = (name) => Array.isArray(results?.[name]) ? results[name] : [];
  const identity = rows("identity")[0];
  try { validateIdentityReply({ command: "SELECT", rows: rows("identity") }); }
  catch { unknown.add("IDENTITY_EVIDENCE_INVALID"); }
  if (!identity || typeof identity.database_oid !== "string"
    || String(Number(identity.database_oid)) !== identity.database_oid
    || !Number.isSafeInteger(Number(identity.database_oid)) || Number(identity.database_oid) < 1
    || Number(identity.database_oid) > 4294967295
    || typeof identity.backend_address !== "string" || !isIP(identity.backend_address) || !Number.isSafeInteger(identity.backend_port)
    || identity.backend_port < 1 || identity.backend_port > 65535
    || !Number.isSafeInteger(identity.backend_pid) || identity.backend_pid < 1) unknown.add("TARGET_FINGERPRINT_INCOMPLETE");
  const database = rows("database_acl");
  if (database.length !== 1 || database[0]?.datname !== TARGET.database
    || typeof database[0]?.owner !== "string") unknown.add("DATABASE_EVIDENCE_INVALID");
  else {
    if (database[0].can_create_schema === false) blocked.add("DATABASE_CREATE_DENIED");
    else if (database[0].can_create_schema !== true) unknown.add("DATABASE_CREATE_UNVERIFIED");
    else observations.push("DATABASE_CREATE_OBSERVED");
    if (database[0].owner === EXPECTED_SQL_USER || database[0].inherits_database_owner === true
      || database[0].can_set_database_owner === true || database[0].can_delegate_create === true) {
      inference.push("DATABASE_CREATE_DELEGATION_PATH_IDENTIFIED");
    } else unknown.add("DATABASE_CREATE_DELEGATION_UNVERIFIED");
  }
  const roles = rows("role_capabilities");
  const names = new Set(roles.map((role) => role?.rolname));
  if (names.size !== roles.length || roles.some((role) => typeof role?.rolname !== "string"
    || [role.rolsuper, role.rolinherit, role.rolcreaterole, role.rolcreatedb, role.rolcanlogin,
      role.rolreplication, role.rolbypassrls].some((flag) => typeof flag !== "boolean"))) unknown.add("ROLE_INVENTORY_INVALID");
  const operator = roles.filter((role) => role?.rolname === EXPECTED_SQL_USER);
  if (operator.length !== 1 || typeof operator[0].rolcreaterole !== "boolean") unknown.add("PROVISIONING_IDENTITY_UNVERIFIED");
  else if (!operator[0].rolcreaterole && operator[0].rolsuper !== true) blocked.add("ROLE_PROVISIONING_DENIED");
  else observations.push("ROLE_PROVISIONING_ATTRIBUTE_OBSERVED");
  const plannedRoles = new Set(["contratpro_migration_owner", "contratpro_runtime", "contratpro_platform_runtime"]);
  const plannedSchemas = new Set(["identity", "tenancy", "platform", "app_private", "migration_control"]);
  if (rows("collisions").length) blocked.add("PLANNED_NAME_COLLISION");
  if (roles.some((role) => plannedRoles.has(role?.rolname))) blocked.add("PLANNED_ROLE_EXISTS");
  if (rows("relevant_schema_acls_and_collisions").some((schema) => plannedSchemas.has(schema?.nspname))) blocked.add("PLANNED_SCHEMA_EXISTS");
  if (rows("journal_metadata").length) blocked.add("CONTROL_OBJECT_EXISTS");
  // Absent owner is expected for fresh bootstrap, never a missing privilege failure.
  if (!names.has("contratpro_migration_owner")) observations.push("MIGRATION_OWNER_NOT_YET_PROVISIONED");
  if (!rows("database_acl_entries").length) unknown.add("DATABASE_ACL_EVIDENCE_MISSING");
  for (const acl of rows("database_acl_entries")) {
    if (acl?.datname !== TARGET.database || acl.owner !== database[0]?.owner
      || typeof acl.grantor !== "string" || typeof acl.grantee !== "string"
      || typeof acl.grantor_oid !== "string" || typeof acl.grantee_oid !== "string"
      || typeof acl.privilege_type !== "string" || typeof acl.is_grantable !== "boolean") unknown.add("DATABASE_ACL_EVIDENCE_INVALID");
  }
  const administrative = new Set(["postgres", "supabase_admin"]);
  const ordinaryManaged = new Set(["anon", "authenticated", "authenticator", "service_role",
    "contratpro_runtime", "contratpro_platform_runtime"]);
  for (const name of ["postgres", "supabase_admin", "anon", "authenticated", "authenticator", "service_role"]) {
    if (!names.has(name)) unknown.add("ROLE_INVENTORY_INCOMPLETE");
  }
  const paths = rows("privileged_access_paths");
  if (!rows("effective_role_memberships").some((role) => role?.rolname === EXPECTED_SQL_USER
    && role.member === true && role.inherited === true && role.can_set_role === true)) unknown.add("SESSION_MEMBERSHIP_EVIDENCE_INCOMPLETE");
  const targets = [...administrative, "contratpro_migration_owner"].filter((name) => names.has(name));
  const expectedPaths = roles.length * targets.length - targets.length;
  const pathKeys = new Set();
  for (const path of paths) {
    const key = JSON.stringify([path?.source_role, path?.target_role]);
    if (!names.has(path?.source_role) || !targets.includes(path?.target_role)
      || path.source_role === path.target_role || pathKeys.has(key)
      || [path.member, path.inherited, path.can_set_role].some((flag) => typeof flag !== "boolean")) {
      unknown.add("PRIVILEGE_PATH_EVIDENCE_INVALID");
      continue;
    }
    pathKeys.add(key);
    if (!administrative.has(path.source_role) && (path.inherited || path.can_set_role)) {
      if (ordinaryManaged.has(path.source_role)) blocked.add("MANAGED_ROLE_PRIVILEGED_ACCESS");
      else unknown.add("UNEXPLAINED_PRIVILEGED_ACCESS_PATH");
    } else if (!administrative.has(path.source_role) && path.member) unknown.add("PRIVILEGED_MEMBERSHIP_REQUIRES_REVIEW");
  }
  if (pathKeys.size !== expectedPaths) unknown.add("PRIVILEGE_PATH_EVIDENCE_INCOMPLETE");
  for (const edge of rows("membership_edges")) {
    if (!names.has(edge?.parent_role) || !names.has(edge?.member_role)
      || typeof edge.grantor !== "string"
      || [edge.admin_option, edge.inherit_option, edge.set_option].some((flag) => typeof flag !== "boolean")) {
      unknown.add("MEMBERSHIP_EVIDENCE_INVALID");
    } else if (edge.admin_option && !administrative.has(edge.member_role)) {
      // ADMIN can allow new grants even where today's SET/INHERIT path is false.
      unknown.add("NONADMIN_GRANT_AUTHORITY_REQUIRES_REVIEW");
    }
  }
  for (const acl of rows("relevant_default_privileges")) {
    if (typeof acl?.owner !== "string" || typeof acl.scope !== "string" || typeof acl.defaclobjtype !== "string") {
      unknown.add("DEFAULT_ACL_EVIDENCE_INVALID"); continue;
    }
    // Defaults scoped only to public cannot affect the private journal schema.
    if (acl.scope === "public") continue;
    if (acl.grantee_oid === null && acl.privilege_type === null) continue; // explicit empty default ACL
    if (typeof acl.grantor !== "string" || typeof acl.grantee !== "string"
      || typeof acl.grantor_oid !== "string" || typeof acl.grantee_oid !== "string"
      || typeof acl.privilege_type !== "string" || typeof acl.is_grantable !== "boolean") {
      unknown.add("DEFAULT_ACL_EVIDENCE_INVALID"); continue;
    }
    const affectsJournal = acl.owner === EXPECTED_SQL_USER && acl.scope === "[global]"
      && ["r", "n"].includes(acl.defaclobjtype);
    if (affectsJournal && !administrative.has(acl.grantee) && acl.grantee !== "PUBLIC") {
      // Existing runner revokes PUBLIC, but leaves these non-owner default grants.
      blocked.add("JOURNAL_NONADMIN_DEFAULT_GRANT");
    }
  }
  if (!rows("relevant_default_privileges").length) inference.push("NO_EXPLICIT_RELEVANT_DEFAULT_ACLS_OBSERVED");
  inference.push("POSTGRESQL_IMPLICIT_DEFAULTS_AND_RUNNER_PUBLIC_REVOCATIONS_REQUIRE_REVIEW");
  try {
    validateEventTriggerEvidence(rows("event_triggers"), rows("event_trigger_functions"));
    observations.push("SIX_EXPECTED_TRIGGER_DEFINITIONS_CAPTURED");
  } catch { unknown.add("EVENT_TRIGGER_EVIDENCE_INVALID"); }
  // Retrieval is evidence preparation, never behavioral approval or a PASS override.
  unknown.add("ENABLED_EVENT_TRIGGER_EFFECTS_UNVERIFIED");
  return Object.freeze({ verdict: blocked.size ? "BLOCKED" : unknown.size ? "INDETERMINATE" : "PASS",
    blockingFindings: [...blocked].sort(), missingEvidence: [...unknown].sort(),
    observedCatalogFacts: observations, inferredAuthorizationPaths: inference,
    limitations: ["Catalog preflight only; PASS does not authorize bootstrap.",
      "Future CREATE ROLE, owner delegation, object ownership and journal ACLs require separately authorized provisioning tests.",
      "Shared pooler endpoint and SQL identity do not definitively establish project isolation.",
      "Backend PID is session-local, not a permanent target fingerprint.",
      "Absent explicit default ACL rows do not imply denial; public-only defaults are not global."] });
}

/** Uses an already connected client; never creates or authenticates a connection.
 * Owns transaction rollback and client closure, including failure paths.
 */
export async function runReadOnlyDiscovery(client, controls) {
  let transaction = false;
  let primaryFailure = false;
  const bounded = () => requireSafe(!controls.isExpired(), "Bounded discovery session expired.");
  try {
    bounded();
    controls.setStage("read-only transaction");
    const begun = await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    transaction = true;
    requireSafe(begun.command === "BEGIN", "Read-only transaction start was not confirmed.");
    controls.setStage("transaction timeouts");
    for (const command of [
      "SET LOCAL statement_timeout = '5000ms';",
      "SET LOCAL lock_timeout = '2000ms';",
      "SET LOCAL idle_in_transaction_session_timeout = '10000ms';",
    ]) {
      bounded();
      const configured = await client.query(command);
      if (configured.command !== "SET") {
        const error = new SafeError("Transaction timeout setup failed");
        error.code = "TIMEOUT_SETUP_FAILED";
        throw error;
      }
    }
    // Identity is the first fixed query: no other catalog discovery before it passes.
    const results = {};
    for (const query of QUERIES) {
      bounded();
      controls.setStage(query.name);
      const reply = await client.query(query.text);
      if (query.name === "identity") validateIdentityReply(reply);
      else if (reply.command !== "SELECT" || !Array.isArray(reply.rows) || reply.rows.length > 1000) {
        const error = new SafeError("Invalid bounded catalog result");
        error.code = "CATALOG_RESULT_INVALID";
        throw error;
      }
      if (query.name === "event_triggers") validateEventTriggerInventory(reply.rows);
      if (query.name === "event_trigger_functions") validateEventTriggerEvidence(results.event_triggers, reply.rows);
      results[query.name] = reply.rows;
    }
    bounded();
    controls.setStage("event_triggers");
    const triggerInventory = await client.query(QUERIES.find(({ name }) => name === "event_triggers").text);
    triggerCheck(triggerInventory.command === "SELECT", "EVENT_TRIGGER_METADATA_INVALID");
    validateEventTriggerInventory(triggerInventory.rows);
    bounded();
    controls.setStage("event_trigger_functions");
    const triggerDefinitions = await client.query(QUERIES.find(({ name }) => name === "event_trigger_functions").text);
    triggerCheck(triggerDefinitions.command === "SELECT", "EVENT_TRIGGER_METADATA_INVALID");
    const initialTriggerDigest = validateEventTriggerEvidence(results.event_triggers, results.event_trigger_functions);
    triggerCheck(validateEventTriggerEvidence(triggerInventory.rows, triggerDefinitions.rows) === initialTriggerDigest,
      "EVENT_TRIGGER_EVIDENCE_CHANGED");
    bounded();
    controls.setStage("backend stability");
    const ending = await client.query(QUERIES[0].text);
    validateIdentityReply(ending); // Recheck all effective safeguards, including exact timeouts.
    const start = results.identity[0];
    const end = ending.rows[0];
    if (!["database", "database_oid", "session_user", "current_user", "backend_address", "backend_port", "backend_pid", "transaction_read_only", "server_version_num"]
      .every((key) => end[key] === start[key])) {
      const error = new SafeError("Backend/session identity changed");
      error.code = "BACKEND_IDENTITY_MISMATCH";
      throw error;
    }
    bounded();
    controls.setStage("rollback");
    const rolledBack = await client.query("ROLLBACK");
    requireSafe(rolledBack.command === "ROLLBACK", "Read-only transaction end was not confirmed.");
    transaction = false;
    return results;
  } catch (error) {
    primaryFailure = true;
    throw error;
  } finally {
    let cleanupFailed = false;
    if (transaction && !controls.isExpired()) {
      try {
        const rolledBack = await client.query("ROLLBACK");
        requireSafe(rolledBack.command === "ROLLBACK", "Rollback not confirmed.");
      } catch (error) { cleanupFailed = true; controls.cleanupError("rollback", error); }
    }
    try { await client.end(); }
    catch (error) { cleanupFailed = true; controls.cleanupError("cleanup", error); }
    if (cleanupFailed && !primaryFailure) {
      const error = new SafeError("Discovery cleanup failed");
      error.code = "DISCOVERY_CLEANUP_FAILED";
      throw error;
    }
  }
}

async function discover(args, env) {
  let client;
  let handedOff = false;
  let deadline;
  let expired = false;
  let asynchronousError;
  let stage = "configuration";
  try {
    requireSafe(args.length === 1 && args[0] === CONFIRMATION, "Explicit project-specific read-only confirmation is required.");
    requireSafe(env.NODE_TLS_REJECT_UNAUTHORIZED !== "0", "Insecure global TLS configuration is forbidden.");
    // Optional target assertions are never overrides. All network settings remain fixed above.
    for (const [key, expected] of Object.entries(TARGET)) {
      const supplied = env[`CONTRATPRO_DISCOVERY_${key.toUpperCase()}`];
      requireSafe(supplied === undefined || supplied === String(expected), "Unexpected target assertion; discovery refused.");
    }
    const password = env.CONTRATPRO_DISCOVERY_PASSWORD;
    requireSafe(typeof password === "string" && password.length > 0 && !/[\r\n\0]/u.test(password),
      "Set CONTRATPRO_DISCOVERY_PASSWORD through an approved secure local process environment; never via chat or command arguments.");
    let ca;
    if (env.CONTRATPRO_DISCOVERY_CA_FILE) {
      ca = await readFile(env.CONTRATPRO_DISCOVERY_CA_FILE, "utf8");
      requireSafe(ca.includes("-----BEGIN CERTIFICATE-----") && !ca.includes("PRIVATE KEY"), "A trusted CA certificate file is required.");
    }
    const { Client } = requireDatabase("pg");
    client = new Client({
      ...TARGET, password,
      sslnegotiation: "postgres",
      ssl: {
        rejectUnauthorized: true, minVersion: "TLSv1.2", servername: TARGET.host,
        ...(ca ? { ca } : {}),
        checkServerIdentity(hostname, certificate) {
          if (hostname !== TARGET.host) return new Error("Unexpected TLS hostname");
          return checkServerIdentity(TARGET.host, certificate);
        },
      },
      // Explicit options replace PGOPTIONS; no URL or PG* target fallback is used.
      options: "-c default_transaction_read_only=on -c statement_timeout=5000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=10000 -c search_path=pg_catalog",
      application_name: "contratpro-readonly-discovery-v1",
      connectionTimeoutMillis: 7000, query_timeout: 7000,
      keepAlive: true,
    });
    // Suppress raw asynchronous driver errors, which may contain sensitive server details.
    client.on("error", (error) => {
      expired = true;
      asynchronousError ??= connectionDiagnostic(stage, error);
      console.error(JSON.stringify(connectionDiagnostic(stage, error)));
      process.exitCode = 1;
    });
    deadline = setTimeout(() => {
      expired = true;
      asynchronousError = connectionDiagnostic(stage, SESSION_TIMEOUT);
      console.error(JSON.stringify(asynchronousError));
      process.exitCode = 1;
      void client.end().catch((error) => emitDiagnostic("cleanup", error));
    }, 45000);
    stage = "TLS/authentication";
    await client.connect();
    const stream = client.connection?.stream;
    requireSafe(stream?.encrypted === true && stream.authorized === true,
      "Verified TLS state could not be established; discovery refused.");
    requireSafe(!checkServerIdentity(TARGET.host, stream.getPeerCertificate()), "TLS hostname validation failed.");
    handedOff = true;
    const results = await runReadOnlyDiscovery(client, {
      isExpired: () => expired,
      setStage: (next) => { stage = next; },
      cleanupError: (cleanupStage, error) => { emitDiagnostic(cleanupStage, error); process.exitCode = 1; },
    });
    requireSafe(!expired, "Bounded discovery session expired.");
    // Only fixed target fields and catalog result columns are emitted, never client/error objects.
    console.log(JSON.stringify({ target: TARGET, tls: "verified chain and hostname",
      transaction: "read-only; rolled back", results, preflight: evaluatePreflight(results),
      limitations: ["Routing username and verified endpoint are not definitive proof of project isolation.",
        "One transaction's stable backend does not prove session pooling across transactions.",
        "Catalog counts do not establish absence of application data; no application rows were read.",
        "Absent default ACL rows imply PostgreSQL defaults, not automatic denial."] }, null, 2));
  } catch (error) {
    // Never emit raw pg/TLS/fs messages, stack traces, URLs, environment or credentials.
    // SafeError messages are also suppressed: diagnostics have exactly the fixed fields.
    console.error(JSON.stringify(asynchronousError ?? connectionDiagnostic(stage, error)));
    console.error(JSON.stringify({ preflight: { verdict: "INDETERMINATE", missingEvidence: ["DISCOVERY_INCOMPLETE"] } }));
    process.exitCode = 1;
  } finally {
    if (deadline) clearTimeout(deadline);
    if (client && !handedOff) {
      try { await client.end(); }
      catch (error) { emitDiagnostic("cleanup", error); process.exitCode = 1; }
    }
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await discover(process.argv.slice(2), process.env);
}
