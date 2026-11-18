import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { classifyConnectionError, connectionDiagnostic, validateIdentityReply, runReadOnlyDiscovery,
  evaluatePreflight, QUERIES, validateEventTriggerInventory, validateEventTriggerEvidence } from "./supabase-readonly-discovery.mjs";

const groups = {
  DNS: ["ENOTFOUND", "EAI_AGAIN"],
  NETWORK: ["ECONNREFUSED", "ENETUNREACH", "ECONNRESET"],
  TIMEOUT: ["ETIMEDOUT"],
  TLS_CERTIFICATE: ["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "SELF_SIGNED_CERT_IN_CHAIN", "CERT_HAS_EXPIRED"],
  TLS_HOSTNAME: ["ERR_TLS_CERT_ALTNAME_INVALID"],
  AUTHENTICATION: ["28P01", "28000"],
  STARTUP_CONFIGURATION: ["22023", "0A000"],
  CAPACITY: ["53300", "57P03"],
  INSUFFICIENT_PRIVILEGE: ["42501"],
  QUERY_CANCELED: ["57014"],
};
for (const [category, codes] of Object.entries(groups)) {
  for (const code of codes) test(`exact code ${code} maps to ${category}`, () => {
    assert.deepEqual(classifyConnectionError(Object.assign(new Error("secret"), { code })), { category, code });
  });
}

function validIdentityReply() {
  return { command: "SELECT", rows: [{ database: "postgres", session_user: "postgres", current_user: "postgres",
    database_oid: "5", backend_address: "10.0.0.2", backend_port: 5432, backend_pid: 100,
    transaction_read_only: "on", default_transaction_read_only: "on", statement_timeout: "5s",
    lock_timeout: "2s", idle_transaction_timeout: "10s", recovery: false, server_version_num: 170000 }] };
}

function assertIdentityFailure(reply, code) {
  assert.throws(() => validateIdentityReply(reply), (error) => {
    assert.deepEqual(connectionDiagnostic("identity", error), { stage: "identity", category: "IDENTITY_VALIDATION", code });
    assert.equal(error.message, "Identity validation failed");
    assert.equal(JSON.stringify(connectionDiagnostic("identity", error)).includes("secret-result"), false);
    return true;
  });
}

test("valid identity and reviewed version boundaries pass offline", () => {
  for (const version of [160000, 170000, 189999]) {
    const reply = validIdentityReply();
    reply.rows[0].server_version_num = version;
    assert.equal(validateIdentityReply(reply), undefined);
  }
});

test("unexpected identity results have a fixed identifier", () => {
  for (const reply of [null, undefined, {}, { command: "UPDATE", rows: [] },
    { command: "SELECT", rows: [] }, { command: "SELECT", rows: [null] },
    { command: "SELECT", rows: [[], []] }, { command: "SELECT", rows: "secret-result" }]) {
    assertIdentityFailure(reply, "UNEXPECTED_SELECT_RESULT");
  }
});

for (const current of ["on", "off"]) {
  for (const defaultValue of ["on", "off"]) {
    test(`current read-only ${current}, session default ${defaultValue}`, () => {
      const reply = validIdentityReply();
      reply.rows[0].transaction_read_only = current;
      reply.rows[0].default_transaction_read_only = defaultValue;
      if (current === "on") assert.equal(validateIdentityReply(reply), undefined);
      else assertIdentityFailure(reply, "READ_ONLY_SAFEGUARD_MISMATCH");
    });
  }
}

for (const [field, code, values] of [
  ["database", "DATABASE_IDENTITY_MISMATCH", ["secret-result", undefined]],
  ["session_user", "SQL_IDENTITY_MISMATCH", ["secret-result", undefined]],
  ["current_user", "SQL_IDENTITY_MISMATCH", ["secret-result", undefined]],
  ["transaction_read_only", "READ_ONLY_SAFEGUARD_MISMATCH", ["off", undefined]],
  ["statement_timeout", "TIMEOUT_SAFEGUARD_MISMATCH", ["0", "5001ms", undefined]],
  ["lock_timeout", "TIMEOUT_SAFEGUARD_MISMATCH", ["0", undefined]],
  ["idle_transaction_timeout", "TIMEOUT_SAFEGUARD_MISMATCH", ["0", undefined]],
  ["recovery", "RECOVERY_STATE_MISMATCH", [true, "false", undefined]],
  ["server_version_num", "UNSUPPORTED_POSTGRESQL_VERSION", [159999, 190000, undefined, NaN]],
]) {
  test(`identity validation preserves ${field} requirement without exposing values`, () => {
    for (const value of values) {
      const reply = validIdentityReply();
      reply.rows[0][field] = value;
      assertIdentityFailure(reply, code);
    }
  });
}

test("identity diagnostics report the first failed requirement", () => {
  const reply = validIdentityReply();
  reply.rows[0].database = "secret-result";
  reply.rows[0].recovery = true;
  assertIdentityFailure(reply, "DATABASE_IDENTITY_MISMATCH");
});

for (const [field, milliseconds, seconds] of [
  ["statement_timeout", 5000, 5],
  ["lock_timeout", 2000, 2],
  ["idle_transaction_timeout", 10000, 10],
]) {
  test(`${field} accepts equivalent whole millisecond and second representations`, () => {
    for (const value of [`${milliseconds}ms`, `${seconds}s`]) {
      const reply = validIdentityReply();
      reply.rows[0][field] = value;
      assert.equal(validateIdentityReply(reply), undefined);
    }
  });
  test(`${field} rejects disabled, malformed, unsupported, fractional and unequal durations`, () => {
    for (const value of [undefined, null, false, milliseconds, NaN, Infinity, -Infinity,
      "", "0", "0ms", "0s", "-1ms", "+5s", "1.5s", "5000.0ms", "5e3ms",
      "Infinityms", "NaNs", "5", "5S", "5sec", "1min", "5000000us", "00ms", "05s",
      " 5s", "5s ", "5 s", "5s\n", "5s\r\n", "5000ms\0", "5000msjunk", "５s",
      "9007199254740991ms", "9007199254740992ms", "9007199254741s", "9".repeat(400) + "ms",
      `${milliseconds - 1}ms`, `${milliseconds + 1}ms`, `${seconds - 1}s`, `${seconds + 1}s`,
      { toString() { throw new Error("must not coerce"); } }]) {
      const reply = validIdentityReply();
      reply.rows[0][field] = value;
      assertIdentityFailure(reply, "TIMEOUT_SAFEGUARD_MISMATCH");
    }
  });
}

test("all three millisecond representations pass together", () => {
  const reply = validIdentityReply();
  Object.assign(reply.rows[0], { statement_timeout: "5000ms", lock_timeout: "2000ms", idle_transaction_timeout: "10000ms" });
  assert.equal(validateIdentityReply(reply), undefined);
});

test("unknown/malformed codes never infer categories from messages or coerce values", () => {
  for (const error of [null, undefined, true, 42, "ETIMEDOUT", [], {},
    { message: "timeout expired password secret", code: "UNKNOWN_SECRET" },
    { code: "etimedout" }, { code: "ETIMEDOUT " }, { code: 28000 },
    { code: { toString() { throw new Error("must not coerce"); } } },
    Object.create({ code: "28P01" }), { cause: { code: "28P01" } }]) {
    assert.deepEqual(classifyConnectionError(error), { category: "UNKNOWN" });
  }
});

test("getters and revoked proxies cannot expose values or crash classification", () => {
  const getter = { get code() { throw new Error("secret getter"); } };
  const { proxy, revoke } = Proxy.revocable({}, {});
  revoke();
  assert.deepEqual(classifyConnectionError(getter), { category: "UNKNOWN" });
  assert.deepEqual(classifyConnectionError(proxy), { category: "UNKNOWN" });
});

test("diagnostic serializes only allowlisted stage/category/code, never arbitrary properties", () => {
  const error = { code: "28P01", message: "password-secret", stack: "stack-secret",
    certificate: "certificate-secret", sql: "sql-secret", sasl: "sasl-secret",
    toJSON() { throw new Error("must not serialize source error"); } };
  assert.equal(JSON.stringify(connectionDiagnostic("TLS/authentication", error)),
    '{"stage":"TLS/authentication","category":"AUTHENTICATION","code":"28P01"}');
  assert.deepEqual(connectionDiagnostic("secret-stage", { code: "secret-code" }),
    { stage: "UNKNOWN", category: "UNKNOWN" });
  assert.ok(Object.isFrozen(classifyConnectionError(error)));
});

test("timeout language and forged deadline markers remain UNKNOWN", () => {
  for (const error of [new Error("timeout expired"), { timeout: true }, Symbol("script-owned session deadline")]) {
    assert.deepEqual(classifyConnectionError(error), { category: "UNKNOWN" });
  }
});

const beginSql = "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY";
const localTimeouts = ["SET LOCAL statement_timeout = '5000ms';", "SET LOCAL lock_timeout = '2000ms';",
  "SET LOCAL idle_in_transaction_session_timeout = '10000ms';"];

// Injected client double only: these strings never reach a PostgreSQL driver/server.
function discoveryDouble(options = {}) {
  const calls = [];
  const diagnostics = [];
  let identityCount = 0;
  let triggerDefinitionCount = 0;
  let stage;
  const failure = Object.assign(new Error("secret driver details"), { code: "42501" });
  const client = {
    async query(text) {
      calls.push(text);
      if (text === options.failCommand) throw failure;
      if (text === beginSql) return { command: "BEGIN", rows: [] };
      if (localTimeouts.includes(text)) return { command: text === options.badSet ? "SELECT" : "SET", rows: [] };
      if (text === "ROLLBACK") {
        if (options.rollbackFails) throw new Error("secret rollback detail");
        return { command: "ROLLBACK", rows: [] };
      }
      if (text.includes("current_database() AS database")) {
        identityCount++;
        const reply = validIdentityReply();
        Object.assign(reply.rows[0], identityCount === 1 ? options.initial : options.final);
        return reply;
      }
      const query = QUERIES.find((entry) => entry.text === text);
      if (!query) throw new Error("Query outside exact offline allowlist");
      if (query.name === "event_triggers") return { command: "SELECT", rows: options.triggerInventory ?? triggerFixture().inventory };
      if (query.name === "event_trigger_functions") {
        triggerDefinitionCount++;
        return { command: "SELECT", rows: (triggerDefinitionCount === 2 ? options.finalTriggerDefinitions : options.triggerDefinitions)
          ?? triggerFixture().definitions };
      }
      return { command: "SELECT", rows: query.name === options.overflow ? Array(1001).fill({}) : [] };
    },
    async end() { calls.push("END_CLIENT"); if (options.endFails) throw new Error("secret end detail"); },
  };
  const controls = {
    isExpired: () => false,
    setStage: (next) => { stage = next; },
    cleanupError: (where, error) => diagnostics.push(connectionDiagnostic(where, error)),
  };
  return { calls, diagnostics, client, controls, failure, stage: () => stage };
}

test("offline ordering: BEGIN, three sequential SET LOCAL commands, verified identity, metadata, final verification, rollback, close", async () => {
  const double = discoveryDouble();
  const results = await runReadOnlyDiscovery(double.client, double.controls);
  assert.deepEqual(double.calls.slice(0, 4), [beginSql, ...localTimeouts]);
  assert.match(double.calls[4], /current_database\(\) AS database/);
  assert.equal(double.calls[4], double.calls.at(-3));
  assert.deepEqual(double.calls.slice(-2), ["ROLLBACK", "END_CLIENT"]);
  assert.deepEqual(Object.keys(results), QUERIES.map(({ name }) => name));
  assert.deepEqual(double.diagnostics, []);
});

for (const command of localTimeouts) {
  test(`SET LOCAL rejection stops before identity/metadata and rolls back/closes: ${command}`, async () => {
    const double = discoveryDouble({ failCommand: command });
    await assert.rejects(runReadOnlyDiscovery(double.client, double.controls), (error) => error === double.failure);
    assert.deepEqual(double.calls, [beginSql, ...localTimeouts.slice(0, localTimeouts.indexOf(command) + 1), "ROLLBACK", "END_CLIENT"]);
    assert.equal(double.stage(), "transaction timeouts");
  });
  test(`unconfirmed SET command fails closed: ${command}`, async () => {
    const double = discoveryDouble({ badSet: command });
    await assert.rejects(runReadOnlyDiscovery(double.client, double.controls), { code: "TIMEOUT_SETUP_FAILED" });
    assert.equal(double.calls.some((text) => text.startsWith("SELECT")), false);
    assert.deepEqual(double.calls.slice(-2), ["ROLLBACK", "END_CLIENT"]);
  });
}

for (const [field, value, code] of [
  ["statement_timeout", "0", "TIMEOUT_SAFEGUARD_MISMATCH"],
  ["lock_timeout", "3s", "TIMEOUT_SAFEGUARD_MISMATCH"],
  ["idle_transaction_timeout", "11s", "TIMEOUT_SAFEGUARD_MISMATCH"],
  ["transaction_read_only", "off", "READ_ONLY_SAFEGUARD_MISMATCH"],
]) {
  test(`initial ${field} mismatch prevents all further discovery and closes`, async () => {
    const double = discoveryDouble({ initial: { [field]: value } });
    await assert.rejects(runReadOnlyDiscovery(double.client, double.controls), { code });
    assert.equal(double.calls.length, 7); // BEGIN + 3 SET + identity + rollback + close
    assert.deepEqual(double.calls.slice(-2), ["ROLLBACK", "END_CLIENT"]);
  });
  test(`final ${field} mismatch fails rather than reporting success`, async () => {
    const double = discoveryDouble({ final: { [field]: value } });
    await assert.rejects(runReadOnlyDiscovery(double.client, double.controls), { code });
    assert.equal(double.stage(), "backend stability");
    assert.deepEqual(double.calls.slice(-2), ["ROLLBACK", "END_CLIENT"]);
  });
}

test("rollback and close failures cannot replace the original setup failure or leak details", async () => {
  const double = discoveryDouble({ failCommand: localTimeouts[0], rollbackFails: true, endFails: true });
  await assert.rejects(runReadOnlyDiscovery(double.client, double.controls), (error) => error === double.failure);
  assert.deepEqual(double.calls.slice(-2), ["ROLLBACK", "END_CLIENT"]);
  assert.deepEqual(double.diagnostics, [{ stage: "rollback", category: "UNKNOWN" }, { stage: "cleanup", category: "UNKNOWN" }]);
});

test("BEGIN rejection closes without issuing SET or discovery", async () => {
  const double = discoveryDouble({ failCommand: beginSql });
  await assert.rejects(runReadOnlyDiscovery(double.client, double.controls), (error) => error === double.failure);
  assert.deepEqual(double.calls, [beginSql, "END_CLIENT"]);
});

function triggerFixture() {
  const entries = [
    ["issue_graphql_placeholder", "sql_drop", "16570", "set_graphql_placeholder"],
    ["issue_pg_cron_access", "ddl_command_end", "16547", "grant_pg_cron_access"],
    ["issue_pg_graphql_access", "ddl_command_end", "16568", "grant_pg_graphql_access"],
    ["issue_pg_net_access", "ddl_command_end", "16549", "grant_pg_net_access"],
    ["pgrst_ddl_watch", "ddl_command_end", "16559", "pgrst_ddl_watch"],
    ["pgrst_drop_watch", "sql_drop", "16560", "pgrst_drop_watch"],
  ];
  const inventory = entries.map(([evtname, evtevent, function_oid]) => ({ evtname, evtevent, function_oid,
    evtenabled: "O", owner: "supabase_admin", tag_filters: null }));
  // Synthetic text only, never executed or represented as observed provider definitions.
  const definitions = inventory.map((entry, index) => {
    const function_definition = `CREATE OR REPLACE FUNCTION extensions.${entries[index][3]}() RETURNS event_trigger LANGUAGE plpgsql AS 'BEGIN END;';`;
    return { ...entry, function_schema: "extensions", function_name: entries[index][3], function_owner: "supabase_admin",
      security_definer: false, function_language: "plpgsql", function_kind: "f", return_type: "event_trigger",
      search_path_configuration: ["search_path=pg_catalog, pg_temp"], function_definition,
      definition_bytes: Buffer.byteLength(function_definition, "utf8") };
  });
  return { inventory, definitions };
}

test("only exact six name/OID pairs can supply function definitions", () => {
  const query = QUERIES.find(({ name }) => name === "event_trigger_functions").text;
  for (const row of triggerFixture().inventory) {
    assert.ok(query.includes(`('${row.evtname}', ${row.function_oid}::oid)`));
  }
  assert.match(query, /ON e\.evtname = allowed\.name AND e\.evtfoid = allowed\.oid/);
  assert.match(query, /p\.oid = e\.evtfoid AND p\.prokind = 'f'/);
  assert.match(query, /pg_get_functiondef\(p\.oid\)/);
  assert.match(query, /<= 32768/);
  assert.match(query, /LIMIT 7$/);
  assert.match(query, /e\.evttags AS tag_filters/);
  assert.match(query, /p\.prosecdef AS security_definer/);
  assert.match(query, /WHERE setting LIKE 'search_path=%'/);
});

test("captured metadata is evidence, not definition approval", () => {
  const { inventory, definitions } = triggerFixture();
  const digest = validateEventTriggerEvidence(inventory, definitions);
  assert.match(digest, /^[0-9a-f]{64}$/);
  definitions[0].security_definer = true;
  assert.notEqual(validateEventTriggerEvidence(inventory, definitions), digest);
  const catalog = validCatalog();
  assert.equal(evaluatePreflight(catalog).verdict, "INDETERMINATE");
});

for (const [field, value] of [["evtname", "renamed"], ["function_oid", "99999"],
  ["evtevent", "ddl_command_start"], ["owner", "postgres"], ["evtenabled", "D"]]) {
  test(`changed observed ${field} fails before fetching any definitions`, async () => {
    const fixture = triggerFixture(); fixture.inventory[0][field] = value;
    const double = discoveryDouble({ triggerInventory: fixture.inventory });
    await assert.rejects(runReadOnlyDiscovery(double.client, double.controls), { code: "EVENT_TRIGGER_INVENTORY_CHANGED" });
    assert.equal(double.calls.includes(QUERIES.find(({ name }) => name === "event_trigger_functions").text), false);
    assert.deepEqual(double.calls.slice(-2), ["ROLLBACK", "END_CLIENT"]);
  });
}

test("missing/additional/duplicate trigger inventories and malformed tags are rejected", () => {
  for (const change of [
    (rows) => rows.pop(),
    (rows) => rows.push({ ...rows[0], evtname: "unexpected" }),
    (rows) => { rows[1] = { ...rows[0] }; },
  ]) {
    const { inventory } = triggerFixture(); change(inventory);
    assert.throws(() => validateEventTriggerInventory(inventory), { code: "EVENT_TRIGGER_INVENTORY_CHANGED" });
  }
  const { inventory } = triggerFixture(); inventory[0].tag_filters = ["x".repeat(129)];
  assert.throws(() => validateEventTriggerInventory(inventory), { code: "EVENT_TRIGGER_METADATA_INVALID" });
});

test("missing, oversized and inconsistent definition evidence rolls back and closes", async () => {
  for (const mutate of [
    (rows) => rows.pop(),
    (rows) => { rows[0].function_definition = null; },
    (rows) => { rows[0].function_definition = "x".repeat(32769); rows[0].definition_bytes = 32769; },
    (rows) => { rows[0].definition_bytes++; },
  ]) {
    const fixture = triggerFixture(); mutate(fixture.definitions);
    const double = discoveryDouble({ triggerDefinitions: fixture.definitions });
    await assert.rejects(runReadOnlyDiscovery(double.client, double.controls), { code: "EVENT_TRIGGER_DEFINITION_MISSING" });
    assert.deepEqual(double.calls.slice(-2), ["ROLLBACK", "END_CLIENT"]);
  }
});

test("unknown first-capture tags are preserved, inconsistent inventory/definition tags rejected", () => {
  const { inventory, definitions } = triggerFixture();
  inventory[0].tag_filters = ["DROP EXTENSION"];
  definitions[0].tag_filters = ["DROP EXTENSION"];
  assert.match(validateEventTriggerEvidence(inventory, definitions), /^[0-9a-f]{64}$/);
  definitions[0].tag_filters = ["DROP TABLE"];
  assert.throws(() => validateEventTriggerEvidence(inventory, definitions), { code: "EVENT_TRIGGER_EVIDENCE_CHANGED" });
});

test("definition/schema/search-path drift during capture cannot be silently accepted", async () => {
  for (const mutate of [
    (rows) => { rows[0].function_definition += " -- changed"; rows[0].definition_bytes = Buffer.byteLength(rows[0].function_definition); },
    (rows) => { rows[0].function_schema = "changed"; },
    (rows) => { rows[0].function_owner = "postgres"; },
    (rows) => { rows[0].search_path_configuration = []; },
    (rows) => { rows[0].security_definer = true; },
  ]) {
    const fixture = triggerFixture(); mutate(fixture.definitions);
    const double = discoveryDouble({ finalTriggerDefinitions: fixture.definitions });
    await assert.rejects(runReadOnlyDiscovery(double.client, double.controls), { code: "EVENT_TRIGGER_EVIDENCE_CHANGED" });
    assert.deepEqual(double.calls.slice(-2), ["ROLLBACK", "END_CLIENT"]);
  }
});

test("malformed function metadata emits only a fixed sanitized identifier", () => {
  const fixture = triggerFixture(); fixture.definitions[0].function_owner = "secret".repeat(100);
  assert.throws(() => validateEventTriggerEvidence(fixture.inventory, fixture.definitions), (error) => {
    assert.deepEqual(connectionDiagnostic("event_trigger_functions", error), {
      stage: "event_trigger_functions", category: "PREFLIGHT_EVIDENCE", code: "EVENT_TRIGGER_METADATA_INVALID" });
    return true;
  });
});

const expectedCatalogNames = ["identity", "role_capabilities", "effective_role_memberships", "membership_edges",
  "database_acl", "relevant_schema_acls_and_collisions", "object_inventory_counts", "public_function_execute_counts",
  "relevant_default_privileges", "collisions", "database_acl_entries", "privileged_access_paths", "journal_metadata", "event_triggers", "event_trigger_functions"];

test("fixed parameter-free SELECT allowlist parses offline and is immutable", async () => {
  const requireDatabase = createRequire(new URL("../packages/infrastructure/database/package.json", import.meta.url));
  const { parse } = requireDatabase("libpg-query");
  assert.deepEqual(QUERIES.map(({ name }) => name), expectedCatalogNames);
  assert.ok(Object.isFrozen(QUERIES));
  for (const query of QUERIES) {
    assert.ok(Object.isFrozen(query));
    assert.doesNotMatch(query.text, /\$[0-9]+|pg_authid|pg_shadow/);
    const ast = await parse(query.text);
    assert.equal(ast.stmts.length, 1);
    assert.ok(ast.stmts[0].stmt.SelectStmt);
  }
  const double = discoveryDouble();
  await runReadOnlyDiscovery(double.client, double.controls);
  assert.deepEqual(double.calls, [beginSql, ...localTimeouts, ...QUERIES.map(({ text }) => text),
    QUERIES.find(({ name }) => name === "event_triggers").text,
    QUERIES.find(({ name }) => name === "event_trigger_functions").text,
    QUERIES[0].text, "ROLLBACK", "END_CLIENT"]);
});

function validCatalog() {
  const catalog = Object.fromEntries(expectedCatalogNames.map((name) => [name, []]));
  catalog.identity = validIdentityReply().rows;
  Object.assign(catalog, { event_triggers: triggerFixture().inventory, event_trigger_functions: triggerFixture().definitions });
  catalog.role_capabilities = ["postgres", "supabase_admin", "anon", "authenticated", "authenticator", "service_role"].map((rolname) => ({
    rolname, rolsuper: rolname === "supabase_admin", rolinherit: true, rolcreaterole: rolname === "postgres",
    rolcreatedb: false, rolcanlogin: rolname === "postgres", rolreplication: false,
    rolbypassrls: ["postgres", "supabase_admin", "service_role"].includes(rolname),
  }));
  catalog.effective_role_memberships = [{ rolname: "postgres", member: true, inherited: true, can_set_role: true }];
  catalog.database_acl = [{ datname: "postgres", owner: "postgres", can_create_schema: true,
    inherits_database_owner: true, can_set_database_owner: true, can_delegate_create: true }];
  catalog.database_acl_entries = [{ datname: "postgres", owner: "postgres", grantor: "postgres", grantor_oid: "10",
    grantee: "postgres", grantee_oid: "10", privilege_type: "CREATE", is_grantable: false }];
  catalog.privileged_access_paths = catalog.role_capabilities.flatMap(({ rolname }) => ["postgres", "supabase_admin"]
    .filter((target) => target !== rolname).map((target_role) => ({ source_role: rolname, target_role,
      member: false, inherited: false, can_set_role: false })));
  return catalog;
}

test("complete clean catalog with captured hooks remains INDETERMINATE pending behavioral review", () => {
  const result = evaluatePreflight(validCatalog());
  assert.equal(result.verdict, "INDETERMINATE");
  assert.deepEqual(result.missingEvidence, ["ENABLED_EVENT_TRIGGER_EFFECTS_UNVERIFIED"]);
  assert.ok(result.observedCatalogFacts.includes("MIGRATION_OWNER_NOT_YET_PROVISIONED"));
  assert.ok(result.limitations.some((value) => value.includes("does not authorize")));
});

test("missing database CREATE is BLOCKED; missing privilege evidence is INDETERMINATE", () => {
  const catalog = validCatalog();
  catalog.database_acl[0].can_create_schema = false;
  assert.ok(evaluatePreflight(catalog).blockingFindings.includes("DATABASE_CREATE_DENIED"));
  delete catalog.database_acl[0].can_create_schema;
  assert.equal(evaluatePreflight(catalog).verdict, "INDETERMINATE");
});

for (const collision of [{ kind: "schema", name: "tenancy" }, { kind: "role", name: "contratpro_runtime" }]) {
  test(`confirmed ${collision.kind} collision blocks fresh bootstrap`, () => {
    const catalog = validCatalog(); catalog.collisions = [collision];
    assert.equal(evaluatePreflight(catalog).verdict, "BLOCKED");
  });
}

test("existing journal metadata blocks without reading journal rows", () => {
  const catalog = validCatalog(); catalog.journal_metadata = [{ kind: "relation", name: "journal", owner: "postgres", object_type: "r" }];
  assert.ok(evaluatePreflight(catalog).blockingFindings.includes("CONTROL_OBJECT_EXISTS"));
  const query = QUERIES.find(({ name }) => name === "journal_metadata").text;
  assert.doesNotMatch(query, /FROM\s+migration_control\./i);
  assert.match(query, /col\.attacl/);
});

test("global administrative-owner default grant blocks; public-only grant does not", () => {
  const catalog = validCatalog();
  const acl = { owner: "postgres", scope: "[global]", defaclobjtype: "r", grantor: "postgres", grantor_oid: "10",
    grantee: "anon", grantee_oid: "20", privilege_type: "SELECT", is_grantable: false };
  catalog.relevant_default_privileges = [acl];
  assert.ok(evaluatePreflight(catalog).blockingFindings.includes("JOURNAL_NONADMIN_DEFAULT_GRANT"));
  acl.scope = "public";
  assert.deepEqual(evaluatePreflight(catalog).blockingFindings, []);
  assert.deepEqual(evaluatePreflight(catalog).missingEvidence, ["ENABLED_EVENT_TRIGGER_EFFECTS_UNVERIFIED"]);
});

test("managed SET/inherited path blocks; ADMIN ambiguity requires review", () => {
  const catalog = validCatalog();
  const path = catalog.privileged_access_paths.find((entry) => entry.source_role === "anon" && entry.target_role === "postgres");
  path.can_set_role = true;
  assert.ok(evaluatePreflight(catalog).blockingFindings.includes("MANAGED_ROLE_PRIVILEGED_ACCESS"));
  path.can_set_role = false;
  catalog.membership_edges = [{ member_role: "anon", parent_role: "postgres", grantor: "supabase_admin",
    admin_option: true, inherit_option: false, set_option: false }];
  assert.equal(evaluatePreflight(catalog).verdict, "INDETERMINATE");
});

test("enabled event triggers and missing role graph never imply PASS", () => {
  const catalog = validCatalog(); catalog.event_triggers = [{ evtenabled: "O" }];
  assert.equal(evaluatePreflight(catalog).verdict, "INDETERMINATE");
  catalog.event_triggers = []; catalog.privileged_access_paths.pop();
  assert.equal(evaluatePreflight(catalog).verdict, "INDETERMINATE");
});

test("missing/inconsistent identity and incomplete catalog evidence fail closed", () => {
  for (const field of ["database_oid", "backend_address", "backend_port", "backend_pid"]) {
    const catalog = validCatalog(); delete catalog.identity[0][field];
    assert.equal(evaluatePreflight(catalog).verdict, "INDETERMINATE");
  }
  const catalog = validCatalog(); catalog.database_acl[0].datname = "unexpected";
  assert.equal(evaluatePreflight(catalog).verdict, "INDETERMINATE");
  assert.equal(evaluatePreflight({}).verdict, "INDETERMINATE");
  delete catalog.event_triggers;
  assert.equal(evaluatePreflight(catalog).verdict, "INDETERMINATE");
});

test("overflow and catalog query errors stop, roll back and close", async () => {
  const oversized = discoveryDouble({ overflow: "membership_edges" });
  await assert.rejects(runReadOnlyDiscovery(oversized.client, oversized.controls), { code: "CATALOG_RESULT_INVALID" });
  assert.deepEqual(oversized.calls.slice(-2), ["ROLLBACK", "END_CLIENT"]);
  assert.equal(oversized.calls.includes(QUERIES.find(({ name }) => name === "database_acl").text), false);
  const failing = discoveryDouble({ failCommand: QUERIES.find(({ name }) => name === "event_triggers").text });
  await assert.rejects(runReadOnlyDiscovery(failing.client, failing.controls), (error) => error === failing.failure);
  assert.deepEqual(failing.calls.slice(-2), ["ROLLBACK", "END_CLIENT"]);
});

test("final fingerprint drift rejects the result before a readiness report", async () => {
  for (const final of [{ database_oid: "6" }, { backend_pid: 101 }, { backend_address: "10.0.0.3" }, { server_version_num: 180000 }]) {
    const double = discoveryDouble({ final });
    await assert.rejects(runReadOnlyDiscovery(double.client, double.controls), { code: "BACKEND_IDENTITY_MISMATCH" });
    assert.deepEqual(double.calls.slice(-2), ["ROLLBACK", "END_CLIENT"]);
  }
});

test("failed closure after successful queries cannot produce a successful readiness report", async () => {
  const double = discoveryDouble({ endFails: true });
  await assert.rejects(runReadOnlyDiscovery(double.client, double.controls), { code: "DISCOVERY_CLEANUP_FAILED" });
  assert.deepEqual(double.calls.slice(-2), ["ROLLBACK", "END_CLIENT"]);
});

test("static operational guards retain TLS, one client, read-only SQL and no retries", async () => {
  const source = await readFile(new URL("./supabase-readonly-discovery.mjs", import.meta.url), "utf8");
  assert.match(source, /sslnegotiation: "postgres"/);
  assert.match(source, /rejectUnauthorized: true, minVersion: "TLSv1.2", servername: TARGET.host/);
  assert.match(source, /return checkServerIdentity\(TARGET.host, certificate\)/);
  assert.match(source, /BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY/);
  assert.match(source, /options: "-c default_transaction_read_only=on /);
  assert.match(source, /-c statement_timeout=5000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=10000/);
  assert.match(source, /connectionTimeoutMillis: 7000, query_timeout: 7000/);
  assert.match(source, /}, 45000\)/);
  assert.match(source, /current_setting\('default_transaction_read_only'\) AS default_transaction_read_only/);
  assert.match(source, /"backend_pid", "transaction_read_only", "server_version_num"\]/);
  assert.match(source, /\.every\(\(key\) => end\[key\] === start\[key\]\)/);
  assert.match(source, /client\.query\("ROLLBACK"\)/);
  assert.equal((source.match(/await client\.connect\(\)/g) ?? []).length, 1);
  assert.equal((source.match(/new Client\(/g) ?? []).length, 1);
  assert.match(source, /error === SESSION_TIMEOUT/);
  assert.match(source, /connectionDiagnostic\(stage, SESSION_TIMEOUT\)/);
  assert.match(source, /if \(process\.argv\[1\].*import\.meta\.url/);
});
