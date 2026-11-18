import { describe, expect, it, vi } from "vitest";
import { parse } from "libpg-query";
import { isIP } from "node:net";
import { loadMigrations } from "../src/migrations/manifest";
import { entrypoint, run, type Dependencies } from "../scripts/verify-bootstrap";
import { parseApplyConfig } from "../src/migrations/config";
import type { ApplyConfig } from "../src/migrations/config";
import { journalColumns, queries } from "../src/migrations/sql";
import { classifyError, emptyResult, membershipEvidence, reasons, stages, roleNames, selects, target, validateTarget, verifyBootstrap, type ReadonlyClient, type Stage, type Reason } from "../src/verification/bootstrap";

const config: ApplyConfig = {
  stage: "bootstrap", targetId: target.id, database: target.database, databaseOid: target.oid,
  login: "postgres", journalOwner: "postgres", serverAddress: target.address, serverPort: target.port,
  planHash: target.plan, caFile: "injected-only.pem", url: "not-used-by-injected-client",
};
const begin = "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY";
const locals = ["SET LOCAL statement_timeout = '5000ms'", "SET LOCAL lock_timeout = '2000ms'",
  "SET LOCAL idle_in_transaction_session_timeout = '10000ms'", "SET LOCAL search_path = pg_catalog"];
const membership = (role: string) => ({ role, member: "postgres", grantor: "supabase_admin",
  admin_option: true, inherit_option: false, set_option: false, total_matching_count: "3",
  grantor_oid: "10", grantor_matches_snapshot_oid: true, grantor_matches_current_admin: true,
  grantor_superuser: true, grantor_createrole: true, grantor_direct_admin_count: "0",
  grantor_direct_admin_inherit: false, grantor_direct_admin_set: false });
function fixtures(): Record<string, Record<string, unknown>[]> {
  return {
    [selects.identity]: [{ database: "postgres", database_oid: "5", login: "postgres", role: "postgres",
      server_address: target.address, server_port: 5432, recovery: false, version: 170011, backend_pid: 123 }],
    [selects.safeguards]: [{ readonly: "on", statement: "5s", lock: "2000ms", idle: "10s" }],
    [selects.existence]: [{ schema_exists: true, journal_exists: true, foundation_absent: true }],
    [selects.shape]: [{ schema_owner: "postgres", table_owner: "postgres", shape_safe: true,
      primary_safe: true, ordinal_safe: true, marker: "contratpro migration journal v1", columns: journalColumns }],
    [selects.details]: [{ checks: ["((ordinal >= 0) AND (ordinal <= 3))", "(checksum ~ '^[0-9a-f]{64}$'::text)",
      "((length(target_id) >= 8) AND (length(target_id) <= 64))", "(runner_version = 1)"],
      defaults: ["applied_at:clock_timestamp()", "applied_by:SESSION_USER"],
      constraint_count: 6, constraints_valid: true, no_rules: true, no_extra_relations: true }],
    [selects.history]: [{ id: "0000_roles.sql", ordinal: 0, checksum: target.bootstrap, target_id: target.id,
      runner_version: 1, applied_by: "postgres", timestamp_valid: true }],
    [selects.roles]: roleNames.map(rolname => ({ rolname, rolcanlogin: false, rolsuper: false, rolcreatedb: false,
      rolcreaterole: false, rolinherit: false, rolreplication: false, rolbypassrls: false,
      rolconnlimit: -1, no_expiry: true, no_config: true })),
    [selects.memberships]: roleNames.map(membership),
    [selects.acl]: [{ schema_acl: true, table_acl: true, column_acl: true, global_defaults_unchanged: true,
      effective_boundary: true, no_owned_objects: true, no_direct_grants: true }],
  };
}
function fake(options: { data?: ReturnType<typeof fixtures>; fail?: string; connectFail?: boolean; rollbackFail?: boolean;
  endFail?: boolean; tls?: boolean; tlsThrow?: boolean; error?: unknown; finalPid?: number; asyncError?: boolean;
  finalSafeguardFail?: boolean } = {}) {
  const data = options.data ?? fixtures();
  const log: string[] = [];
  let handler = () => {};
  let identities = 0;
  let safeguardReads = 0;
  const error = () => options.error ?? new Error("postgresql://user:secret@host/private/path raw driver detail");
  const connect = vi.fn(async () => { if (options.connectFail) throw error(); });
  const end = vi.fn(async () => { if (options.endFail) throw new Error("secret URL"); });
  const client: ReadonlyClient = {
    connect, end, tlsVerified: () => { if (options.tlsThrow) throw error(); return options.tls ?? true; }, onError: fn => { handler = fn; },
    async query(sql) {
      log.push(sql);
      expect([begin, ...locals, "ROLLBACK", ...Object.values(selects)]).toContain(sql);
      if (sql === options.fail) throw error();
      if (sql === selects.safeguards && ++safeguardReads === 2 && options.finalSafeguardFail) {
        return { rows: [{ ...data[sql]![0], readonly: "off" }] };
      }
      if (sql === "ROLLBACK") {
        if (options.rollbackFail) throw new Error("secret rollback detail");
        return { rows: [], command: "ROLLBACK" };
      }
      if (sql === selects.identity && ++identities === 2 && options.finalPid) {
        return { rows: [{ ...data[sql]![0], backend_pid: options.finalPid }] };
      }
      if (sql === selects.roles && options.asyncError) handler();
      return { rows: data[sql] ?? [], command: sql === begin ? "BEGIN" : "SET" };
    },
  };
  return { client, log, connect, end };
}
describe("offline read-only bootstrap verifier", () => {
  it("parses only fixed catalog/journal SELECTs and transaction controls without executing SQL", async () => {
    for (const sql of Object.values(selects)) {
      expect(sql).toMatch(/^SELECT\s/);
      const ast = await parse(sql);
      expect(ast.stmts).toHaveLength(1);
      expect(ast.stmts![0]!.stmt).toHaveProperty("SelectStmt");
    }
    for (const sql of [begin, ...locals, "ROLLBACK"]) await expect(parse(sql)).resolves.toBeDefined();
  });
  it("passes synthetic committed bootstrap, one connection, exact ordering and no COMMIT", async () => {
    const f = fake();
    const result = await verifyBootstrap(f.client, config);
    expect(result.FINAL_VERDICT).toBe("PASS");
    expect(f.connect).toHaveBeenCalledTimes(1);
    expect(f.end).toHaveBeenCalledTimes(1);
    expect(f.log.slice(0, 7)).toEqual([begin, ...locals, selects.safeguards, selects.identity]);
    expect(f.log.at(-1)).toBe("ROLLBACK");
    expect(f.log).not.toContain("COMMIT");
    expect(f.log.filter(sql => sql === selects.identity)).toHaveLength(2);
  });
  it.each([
    ["database", "other"], ["database_oid", "6"], ["login", "other"], ["role", "other"],
    ["server_address", "2a05:d018:184f:1e01:cea0:7ef7:7fd2:c39f"],
    ["server_address", "2a05:d018:184f:1e01:cea0:7ef7:7fd2"], ["server_port", 6543],
    ["version", 160000], ["recovery", true], ["backend_pid", null],
  ])("fails mismatched identity %s before bootstrap state reads", async (key, value) => {
    const data = fixtures(); data[selects.identity]![0]![key] = value;
    const f = fake({ data });
    expect((await verifyBootstrap(f.client, config)).TARGET_IDENTITY).toBe("FAIL");
    expect(f.log).not.toContain(selects.existence);
    expect(f.log.at(-1)).toBe("ROLLBACK");
  });
  it.each([
    [selects.existence, "journal_exists", false], [selects.shape, "table_owner", "other"],
    [selects.history, "checksum", "0".repeat(64)], [selects.history, "applied_by", "other"],
    [selects.roles, "rolbypassrls", true], [selects.roles, "rolcanlogin", true],
    [selects.memberships, "set_option", true], [selects.memberships, "member", "unexpected"],
    [selects.acl, "schema_acl", false], [selects.acl, "table_acl", false], [selects.acl, "column_acl", false],
    [selects.acl, "effective_boundary", false], [selects.acl, "no_direct_grants", false],
    [selects.acl, "no_owned_objects", false],
  ])("fails unsafe state without leaking values", async (sql, key, value) => {
    const data = fixtures(); data[sql as string]![0]![key as string] = value;
    const f = fake({ data });
    const result = await verifyBootstrap(f.client, config);
    expect(result.FINAL_VERDICT).toBe("FAIL");
    expect(JSON.stringify(result)).not.toMatch(/secret|unexpected|raw SQL/);
    expect(f.log.at(-1)).toBe("ROLLBACK");
    expect(f.end).toHaveBeenCalledOnce();
  });
  it("rejects extra/missing roles, memberships overflow and foundation history", async () => {
    for (const sql of [selects.roles, selects.memberships, selects.history]) {
      const data = fixtures();
      if (sql === selects.roles) data[sql]!.pop();
      else if (sql === selects.memberships) data[sql] = Array.from({ length: 17 }, () => membership(roleNames[0]));
      else data[sql]!.push({ ...data[sql]![0], id: "0001_schema.sql", ordinal: 1 });
      const f = fake({ data });
      expect((await verifyBootstrap(f.client, config)).FINAL_VERDICT).toBe("FAIL");
    }
  });
  it.each([begin, ...locals, ...Object.values(selects)])("stops after query failure, attempts rollback and closes: %s", async fail => {
    const f = fake({ fail });
    const result = await verifyBootstrap(f.client, config);
    expect(result.FINAL_VERDICT).not.toBe("PASS");
    expect(f.log.at(-1)).toBe("ROLLBACK");
    expect(f.log.filter(sql => sql === fail)).toHaveLength(1);
    expect(f.end).toHaveBeenCalledOnce();
  });
  it.each(["readonly", "statement", "lock", "idle"])("blocks state discovery on safeguard mismatch %s", async key => {
    const data = fixtures(); data[selects.safeguards]![0]![key] = "off";
    const f = fake({ data });
    expect((await verifyBootstrap(f.client, config)).FINAL_VERDICT).not.toBe("PASS");
    expect(f.log).not.toContain(selects.existence);
  });
  it("handles connection and TLS failure without state queries or reconnection", async () => {
    for (const options of [{ connectFail: true }, { tls: false }]) {
      const f = fake(options);
      expect((await verifyBootstrap(f.client, config)).FINAL_VERDICT).not.toBe("PASS");
      expect(f.connect).toHaveBeenCalledOnce();
      expect(f.end).toHaveBeenCalledOnce();
      expect(f.log).toEqual([]);
    }
  });
  it("makes rollback/cleanup failure and asynchronous errors indeterminate", async () => {
    for (const options of [{ rollbackFail: true }, { endFail: true }, { asyncError: true }]) {
      const f = fake(options);
      expect((await verifyBootstrap(f.client, config)).FINAL_VERDICT).toBe("INDETERMINATE");
      expect(f.log.at(-1)).toBe("ROLLBACK");
      expect(f.end).toHaveBeenCalledOnce();
    }
  });
  it("rejects final backend changes and changed defaults", async () => {
    const f = fake({ finalPid: 456 });
    expect((await verifyBootstrap(f.client, config)).FINAL_VERDICT).toBe("FAIL");
    const data = fixtures(); data[selects.acl]![0]!.global_defaults_unchanged = false;
    expect((await verifyBootstrap(fake({ data }).client, config)).FINAL_VERDICT).toBe("INDETERMINATE");
  });
  it("pins configuration and rejects foundation without connection", async () => {
    for (const override of [{ stage: "foundation" as const }, { serverAddress: "127.0.0.1" },
      { targetId: "other-target" }, { planHash: "0".repeat(64) }]) {
      expect(() => validateTarget({ ...config, ...override })).toThrow();
      const f = fake();
      expect((await verifyBootstrap(f.client, { ...config, ...override })).FINAL_VERDICT).not.toBe("PASS");
      expect(f.connect).not.toHaveBeenCalled();
    }
    expect(Object.keys(emptyResult())).toHaveLength(9);
  });
  it("accepts the evidence-backed IPv6 fingerprint and rejects incomplete or different addresses", () => {
    const incomplete = "2a05:d018:184f:1e01:cea0:7ef7:7fd2";
    const different = "2a05:d018:184f:1e01:cea0:7ef7:7fd2:c39f";
    expect(target.address).toBe("2a05:d018:184f:1e01:cea0:7ef7:7fd2:c39e");
    expect(isIP(target.address)).toBe(6);
    expect(isIP(incomplete)).toBe(0);
    expect(isIP(different)).toBe(6);
    const args = ["--apply", "--stage", "bootstrap", "--confirm-target", target.id];
    const env = {
      CONTRATPRO_MIGRATION_ENVIRONMENT: "development", CONTRATPRO_MIGRATION_CONNECTION_MODE: "session",
      CONTRATPRO_MIGRATION_TARGET_ID: target.id, CONTRATPRO_MIGRATION_DATABASE: "postgres",
      CONTRATPRO_MIGRATION_DATABASE_OID: "5", CONTRATPRO_MIGRATION_LOGIN: "postgres",
      CONTRATPRO_MIGRATION_JOURNAL_OWNER: "postgres", CONTRATPRO_MIGRATION_SERVER_ADDRESS: target.address,
      CONTRATPRO_MIGRATION_SERVER_PORT: "5432", CONTRATPRO_MIGRATION_PLAN_SHA256: target.plan,
      CONTRATPRO_MIGRATION_CA_FILE: "never-read.pem",
      CONTRATPRO_MIGRATION_URL: "postgresql://postgres.gllsiklbvqpxzucvkehw:synthetic-only@aws-0-eu-west-1.pooler.supabase.com:5432/postgres",
    };
    const parsed = parseApplyConfig(args, env);
    expect(parsed.serverAddress).toBe(target.address);
    expect(() => validateTarget(parsed)).not.toThrow();
    expect(() => parseApplyConfig(args, { ...env, CONTRATPRO_MIGRATION_SERVER_ADDRESS: incomplete })).toThrow("Invalid server identity");
    expect(() => validateTarget(parseApplyConfig(args, { ...env, CONTRATPRO_MIGRATION_SERVER_ADDRESS: different }))).toThrow("Configuration rejected");
  });
  it("imports CLI inertly and rejects wrong invocation before configuration/driver loading", async () => {
    const { main } = await import("../scripts/verify-bootstrap");
    expect((await main(["--apply", "--stage", "foundation"], {})).DIAGNOSTIC).toMatchObject({ failedStage: "CLI_ARGUMENTS", reason: "INVALID_ARGUMENTS" });
    expect((await main(["--verify-bootstrap", target.id], {})).DIAGNOSTIC).toMatchObject({ failedStage: "CONFIGURATION", reason: "CONFIGURATION_REJECTED" });
  });
});

const args = ["--verify-bootstrap", target.id];
const envFixture = {
  CONTRATPRO_MIGRATION_ENVIRONMENT: "development", CONTRATPRO_MIGRATION_CONNECTION_MODE: "session",
  CONTRATPRO_MIGRATION_TARGET_ID: target.id, CONTRATPRO_MIGRATION_DATABASE: "postgres",
  CONTRATPRO_MIGRATION_DATABASE_OID: "5", CONTRATPRO_MIGRATION_LOGIN: "postgres",
  CONTRATPRO_MIGRATION_JOURNAL_OWNER: "postgres", CONTRATPRO_MIGRATION_SERVER_ADDRESS: target.address,
  CONTRATPRO_MIGRATION_SERVER_PORT: "5432", CONTRATPRO_MIGRATION_PLAN_SHA256: target.plan,
  CONTRATPRO_MIGRATION_CA_FILE: "synthetic-path.pem",
  CONTRATPRO_MIGRATION_URL: "postgresql://postgres.gllsiklbvqpxzucvkehw:synthetic-password@aws-0-eu-west-1.pooler.supabase.com:5432/postgres",
};
const privateError = () => Object.assign(new Error("postgresql://user:secret@host/private/path driver SQL detail"), {
  stack: "private stack", detail: "private SQL result", path: "private certificate path",
});
const injectedDependencies = (f: ReturnType<typeof fake>): Dependencies => ({
  loadPlan: loadMigrations, buildOptions: async () => ({ sslnegotiation: "postgres" }),
  createClient: async () => f.client,
});
describe("fixed verifier diagnostics", () => {
  const cases: { label: string; options: Parameters<typeof fake>[0]; stage: Stage; reason: Reason; last: Stage;
    tls: "PASS" | "FAIL" | "INDETERMINATE"; verdict: "FAIL" | "INDETERMINATE";
    transaction: "STARTED" | "NOT_STARTED" | "UNKNOWN" }[] = [
    { label: "connection", options: { connectFail: true }, stage: "CONNECTION", reason: "CONNECTION_FAILED", last: "CONFIGURATION",
      tls: "INDETERMINATE", verdict: "INDETERMINATE", transaction: "NOT_STARTED" },
    { label: "TLS exception", options: { tlsThrow: true }, stage: "TLS_INSPECTION", reason: "TLS_CHECK_FAILED", last: "CONNECTION",
      tls: "INDETERMINATE", verdict: "INDETERMINATE", transaction: "NOT_STARTED" },
    { label: "TLS negative", options: { tls: false }, stage: "TLS_INSPECTION", reason: "TLS_CHECK_FAILED", last: "CONNECTION",
      tls: "FAIL", verdict: "FAIL", transaction: "NOT_STARTED" },
    { label: "BEGIN", options: { fail: begin }, stage: "TRANSACTION_BEGIN", reason: "TRANSACTION_BEGIN_FAILED", last: "TLS_INSPECTION",
      tls: "PASS", verdict: "INDETERMINATE", transaction: "UNKNOWN" },
    { label: "SET LOCAL", options: { fail: locals[0]! }, stage: "TRANSACTION_SAFEGUARDS", reason: "SAFEGUARD_FAILED", last: "TRANSACTION_BEGIN",
      tls: "PASS", verdict: "INDETERMINATE", transaction: "STARTED" },
    { label: "initial safeguard", options: { fail: selects.safeguards }, stage: "TRANSACTION_SAFEGUARDS", reason: "SAFEGUARD_FAILED", last: "TRANSACTION_BEGIN",
      tls: "PASS", verdict: "INDETERMINATE", transaction: "STARTED" },
    { label: "initial identity query", options: { fail: selects.identity }, stage: "TARGET_IDENTITY", reason: "QUERY_FAILED", last: "TRANSACTION_SAFEGUARDS",
      tls: "PASS", verdict: "INDETERMINATE", transaction: "STARTED" },
    { label: "rollback", options: { rollbackFail: true }, stage: "ROLLBACK", reason: "ROLLBACK_FAILED", last: "TLS_INSPECTION",
      tls: "PASS", verdict: "INDETERMINATE", transaction: "STARTED" },
    { label: "cleanup", options: { endFail: true }, stage: "CLIENT_CLEANUP", reason: "CLEANUP_FAILED", last: "ROLLBACK",
      tls: "PASS", verdict: "INDETERMINATE", transaction: "STARTED" },
    { label: "final safeguard", options: { finalSafeguardFail: true }, stage: "TRANSACTION_SAFEGUARDS", reason: "SAFEGUARD_FAILED", last: "OWNERSHIP_AND_ACL",
      tls: "PASS", verdict: "INDETERMINATE", transaction: "STARTED" },
  ];
  it.each(cases)("reports exact diagnostic and retains facts: $label", async c => {
    const f = fake({ ...c.options, error: privateError() });
    const result = await verifyBootstrap(f.client, config);
    expect(result.DIAGNOSTIC).toEqual({
      failedStage: c.stage, reason: c.reason, lastCompletedStage: c.last,
      databaseContact: c.stage === "CONNECTION" ? "UNKNOWN" : "ESTABLISHED",
      readOnlyTransaction: c.transaction,
      rollback: c.stage === "ROLLBACK" ? "FAILED" : c.transaction === "NOT_STARTED" ? "NOT_ATTEMPTED" : "SUCCEEDED",
      clientCleanup: c.stage === "CLIENT_CLEANUP" ? "FAILED" : "SUCCEEDED", secondaryFailures: [],
    });
    expect(result.TLS_VERIFICATION).toBe(c.tls);
    expect(result.FINAL_VERDICT).toBe(c.verdict);
    if (["ROLLBACK", "CLIENT_CLEANUP", "TRANSACTION_SAFEGUARDS"].includes(c.stage) && c.label !== "SET LOCAL" && c.label !== "initial safeguard") {
      expect(result.JOURNAL_STATE).toBe("PASS");
    }
    expect(JSON.stringify(result)).not.toMatch(/secret|postgresql:|private|driver SQL/);
  });
  it.each([
    [selects.history, "checksum", "invalid", "JOURNAL", "TARGET_IDENTITY", "JOURNAL_STATE"],
    [selects.roles, "rolbypassrls", true, "ROLE_ATTRIBUTES", "JOURNAL", "ROLE_ATTRIBUTES"],
    [selects.memberships, "set_option", true, "MEMBERSHIPS", "ROLE_ATTRIBUTES", "MEMBERSHIPS"],
    [selects.acl, "effective_boundary", false, "OWNERSHIP_AND_ACL", "MEMBERSHIPS", "OWNERSHIP_AND_ACL"],
  ])("reports exact validation mismatch without resetting TLS", async (sql, key, value, stage, last, field) => {
    const data = fixtures(); data[sql as string]![0]![key as string] = value;
    const result = await verifyBootstrap(fake({ data }).client, config);
    expect(result.DIAGNOSTIC).toEqual({ failedStage: stage, reason: "VALIDATION_MISMATCH", lastCompletedStage: last,
      databaseContact: "ESTABLISHED", readOnlyTransaction: "STARTED", rollback: "SUCCEEDED", clientCleanup: "SUCCEEDED", secondaryFailures: [] });
    expect(result[field as "JOURNAL_STATE"]).toBe("FAIL");
    expect(result.TLS_VERIFICATION).toBe("PASS");
    expect(result.FINAL_VERDICT).toBe("FAIL");
  });
  it("keeps the primary failure and records bounded cleanup failures", async () => {
    const result = await verifyBootstrap(fake({ fail: begin, rollbackFail: true, endFail: true }).client, config);
    expect(result.DIAGNOSTIC).toEqual({ failedStage: "TRANSACTION_BEGIN", reason: "TRANSACTION_BEGIN_FAILED",
      lastCompletedStage: "TLS_INSPECTION", databaseContact: "ESTABLISHED", readOnlyTransaction: "UNKNOWN",
      rollback: "FAILED", clientCleanup: "FAILED", secondaryFailures: [
        { stage: "ROLLBACK", reason: "ROLLBACK_FAILED" }, { stage: "CLIENT_CLEANUP", reason: "CLEANUP_FAILED" },
      ] });
    expect(result.TLS_VERIFICATION).toBe("PASS");
    expect(result.FINAL_VERDICT).toBe("INDETERMINATE");
  });
  it.each([
    ["ENOTFOUND", "DNS_FAILURE"], ["ECONNRESET", "NETWORK_FAILURE"], ["ETIMEDOUT", "TIMEOUT"],
    ["SELF_SIGNED_CERT_IN_CHAIN", "TLS_CERTIFICATE_FAILURE"], ["ERR_TLS_CERT_ALTNAME_INVALID", "TLS_HOSTNAME_FAILURE"],
    ["28P01", "AUTHENTICATION_FAILURE"], ["22023", "STARTUP_REJECTED"], ["53300", "CAPACITY_UNAVAILABLE"],
    ["42501", "PERMISSION_DENIED"], ["57014", "QUERY_CANCELLED"],
  ])("classifies exact allowlisted code %s", async (code, reason) => {
    const result = await verifyBootstrap(fake({ connectFail: true, error: Object.assign(privateError(), { code }) }).client, config);
    expect(result.DIAGNOSTIC.failedStage).toBe("CONNECTION");
    expect(result.DIAGNOSTIC.reason).toBe(reason);
    expect(result.DIAGNOSTIC.databaseContact).toBe("UNKNOWN");
    expect(result.FINAL_VERDICT).toBe("INDETERMINATE");
  });
  it("rejects unknown/malformed codes and never classifies message-only timeouts", () => {
    for (const error of [null, undefined, "ETIMEDOUT", new Error("timeout"), { code: "ETIMEDOUT secret" },
      { code: 57014 }, { code: "__proto__" }, { get code() { throw privateError(); } }]) {
      expect(classifyError(error, "UNKNOWN")).toBe("UNKNOWN");
    }
  });
});
describe("complete offline CLI diagnostics and output", () => {
  const cases: { label: string; stage: Stage; reason: Reason; last: Stage | null; args?: string[];
    env?: NodeJS.ProcessEnv; dependencies?: Partial<Dependencies> }[] = [
    { label: "arguments", args: [], stage: "CLI_ARGUMENTS", reason: "INVALID_ARGUMENTS", last: null },
    { label: "configuration", env: {}, stage: "CONFIGURATION", reason: "CONFIGURATION_REJECTED", last: "CLI_ARGUMENTS" },
    { label: "manifest loading", dependencies: { loadPlan: async () => { throw privateError(); } },
      stage: "MANIFEST", reason: "MANIFEST_REJECTED", last: "CONFIGURATION" },
    { label: "manifest checksum", dependencies: { loadPlan: async () => [] },
      stage: "MANIFEST", reason: "MANIFEST_REJECTED", last: "CONFIGURATION" },
    { label: "CA", dependencies: { buildOptions: async () => { throw privateError(); } },
      stage: "CA_VALIDATION", reason: "CA_REJECTED", last: "MANIFEST" },
    { label: "driver initialization", dependencies: { createClient: async () => { throw privateError(); } },
      stage: "DRIVER_INITIALIZATION", reason: "DRIVER_INITIALIZATION_FAILED", last: "CA_VALIDATION" },
  ];
  it.each(cases)("prints only fixed diagnostics for $label failure", async c => {
    const f = fake();
    const stdout = vi.spyOn(console, "log").mockImplementation(() => {});
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const code = await run(c.args ?? args, c.env ?? envFixture, { ...injectedDependencies(f), ...c.dependencies });
      expect(code).toBe(1);
      expect(stdout).toHaveBeenCalledTimes(1);
      expect(stderr).not.toHaveBeenCalled();
      const result = JSON.parse(stdout.mock.calls[0]![0] as string);
      expect(result.DIAGNOSTIC).toEqual({ failedStage: c.stage, reason: c.reason, lastCompletedStage: c.last,
        databaseContact: "NOT_ESTABLISHED", readOnlyTransaction: "NOT_STARTED",
        rollback: "NOT_ATTEMPTED", clientCleanup: "NOT_ATTEMPTED", secondaryFailures: [] });
      expect(result.TLS_VERIFICATION).toBe("INDETERMINATE");
      expect(result.FINAL_VERDICT).toBe("INDETERMINATE");
      expect(JSON.stringify(stdout.mock.calls)).not.toMatch(/secret|postgresql:|private|synthetic|\.pem|2a05|supabase/);
      expect(f.connect).not.toHaveBeenCalled();
    } finally { stdout.mockRestore(); stderr.mockRestore(); }
  });
  it("runs the complete CLI through an injected client without network and prints success", async () => {
    const f = fake();
    const stdout = vi.spyOn(console, "log").mockImplementation(() => {});
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await run(args, envFixture, injectedDependencies(f))).toBe(0);
      const result = JSON.parse(stdout.mock.calls[0]![0] as string);
      expect(result.DIAGNOSTIC).toEqual({ failedStage: null, reason: "NONE", lastCompletedStage: "CLIENT_CLEANUP",
        databaseContact: "ESTABLISHED", readOnlyTransaction: "STARTED", rollback: "SUCCEEDED",
        clientCleanup: "SUCCEEDED", secondaryFailures: [] });
      expect(result.FINAL_VERDICT).toBe("PASS");
      expect(f.connect).toHaveBeenCalledTimes(1);
      expect(f.end).toHaveBeenCalledTimes(1);
      expect(stderr).not.toHaveBeenCalled();
    } finally { stdout.mockRestore(); stderr.mockRestore(); }
  });
  it("serializes raw connection errors only as fixed codes on stdout", async () => {
    const f = fake({ connectFail: true, error: Object.assign(privateError(), { code: "28P01" }) });
    const stdout = vi.spyOn(console, "log").mockImplementation(() => {});
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await run(args, envFixture, injectedDependencies(f))).toBe(1);
      const result = JSON.parse(stdout.mock.calls[0]![0] as string);
      expect(result.DIAGNOSTIC).toEqual({ failedStage: "CONNECTION", reason: "AUTHENTICATION_FAILURE",
        lastCompletedStage: "DRIVER_INITIALIZATION", databaseContact: "UNKNOWN",
        readOnlyTransaction: "NOT_STARTED", rollback: "NOT_ATTEMPTED", clientCleanup: "SUCCEEDED", secondaryFailures: [] });
      expect(JSON.stringify(stdout.mock.calls)).not.toMatch(/secret|postgresql:|private|host|driver SQL/);
      expect(stderr).not.toHaveBeenCalled();
      expect(f.connect).toHaveBeenCalledTimes(1);
    } finally { stdout.mockRestore(); stderr.mockRestore(); }
  });
  it("declares only fixed stage and reason values", () => {
    expect(stages).toHaveLength(18);
    expect(reasons).toContain("UNKNOWN");
  });
});

describe("contract-aligned bootstrap membership policy", () => {
  const malicious: [string, unknown, string][] = [
    ["grantor", "postgres", "GRANTOR_NOT_APPROVED_ADMIN"],
    ["grantor", "OTHER_ROLE", "GRANTOR_NOT_APPROVED_ADMIN"],
    ["grantor", "private-administrator", "GRANTOR_NOT_APPROVED_ADMIN"],
    ["grantor", "supabase_admin.other", "GRANTOR_NOT_APPROVED_ADMIN"],
    ["grantor_oid", "11", "GRANTOR_SNAPSHOT_MISMATCH"],
    ["grantor_matches_snapshot_oid", false, "GRANTOR_SNAPSHOT_MISMATCH"],
    ["grantor_matches_current_admin", false, "GRANTOR_IDENTITY_MISMATCH"],
    ["grantor_matches_current_admin", null, "GRANTOR_IDENTITY_MISMATCH"],
    ["grantor_superuser", false, "GRANTOR_CAPABILITIES_INSUFFICIENT"],
    ["grantor_createrole", false, "GRANTOR_CAPABILITIES_INSUFFICIENT"],
    ["grantor_oid", "10 secret", "GRANTOR_EVIDENCE_INVALID"],
    ["grantor_direct_admin_count", "1", "UNEXPECTED_GRANTOR_ADMIN_MEMBERSHIP"],
    ["grantor_direct_admin_inherit", true, "UNEXPECTED_GRANTOR_ADMIN_MEMBERSHIP"],
    ["grantor_direct_admin_set", true, "UNEXPECTED_GRANTOR_ADMIN_MEMBERSHIP"],
    ["member", "private-runtime", "MEMBER_NOT_POSTGRES"],
    ["member", roleNames[1], "MEMBER_NOT_POSTGRES"],
    ["role", "unapproved_target", "ROLE_NOT_CONTRATPRO"],
    ["admin_option", false, "ADMIN_NOT_TRUE"],
    ["inherit_option", true, "INHERIT_NOT_FALSE"],
    ["set_option", true, "SET_NOT_FALSE"],
    ["admin_option", "true", "ADMIN_NOT_TRUE"],
  ];
  it.each(malicious)("rejects one malicious %s without hiding prior facts", async (field, value, violation) => {
    const data = fixtures(); data[selects.memberships]![0]![field] = value;
    const f = fake({ data });
    const result = await verifyBootstrap(f.client, config);
    expect(result.MEMBERSHIPS).toBe("FAIL");
    expect(result.FINAL_VERDICT).toBe("FAIL");
    expect(result.MEMBERSHIP_DIAGNOSTICS?.globalViolations).not.toContain("EXPECTED_MEMBERSHIP_COUNT_MISMATCH");
    expect(result.MEMBERSHIP_DIAGNOSTICS?.rows[0]?.violations).toContain(violation);
    expect(result.TARGET_IDENTITY).toBe("PASS");
    expect(result.TLS_VERIFICATION).toBe("PASS");
    expect(result.JOURNAL_STATE).toBe("PASS");
    expect(result.ROLE_ATTRIBUTES).toBe("PASS");
    expect(result.DIAGNOSTIC).toMatchObject({
      failedStage: "MEMBERSHIPS", reason: "VALIDATION_MISMATCH", rollback: "SUCCEEDED", clientCleanup: "SUCCEEDED",
    });
    expect(f.log).not.toContain(selects.acl);
    expect(f.connect).toHaveBeenCalledTimes(1);
    expect(f.end).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toMatch(/private-runtime|private-administrator|10 secret/);
  });
  it.each(["grantor_oid", "grantor_matches_snapshot_oid", "grantor_matches_current_admin", "grantor_superuser",
    "grantor_createrole", "grantor_direct_admin_count", "grantor_direct_admin_inherit", "grantor_direct_admin_set"])(
    "rejects missing grantor evidence %s even when the name and other flags match", async field => {
      const data = fixtures(); delete data[selects.memberships]![0]![field];
      const result = await verifyBootstrap(fake({ data }).client, config);
      expect(result.MEMBERSHIPS).toBe("FAIL");
      expect(result.MEMBERSHIP_DIAGNOSTICS?.rows[0]?.violations).toContain("GRANTOR_EVIDENCE_INVALID");
      expect(result.FINAL_VERDICT).toBe("FAIL");
    });
  it.each(["empty", "missing", "extra", "overflow", "duplicate", "missing_count", "inconsistent_count"])(
    "rejects unexpected membership set %s", async variant => {
      const data = fixtures();
      const rows = data[selects.memberships]!;
      if (variant === "empty") data[selects.memberships] = [];
      if (variant === "missing") data[selects.memberships] = rows.slice(0, 2).map(row => ({ ...row, total_matching_count: "2" }));
      if (variant === "extra") data[selects.memberships] = [...rows, { ...rows[0] }].map(row => ({ ...row, total_matching_count: "4" }));
      if (variant === "overflow") data[selects.memberships] = Array.from({ length: 17 }, () => ({ ...rows[0], total_matching_count: "100" }));
      if (variant === "duplicate") rows[1]!.role = roleNames[0];
      if (variant === "missing_count") delete rows[0]!.total_matching_count;
      if (variant === "inconsistent_count") rows[0]!.total_matching_count = "2";
      const result = await verifyBootstrap(fake({ data }).client, config);
      expect(result.MEMBERSHIPS).toBe("FAIL");
      expect(result.FINAL_VERDICT).toBe("FAIL");
      expect(result.MEMBERSHIP_DIAGNOSTICS?.globalViolations.length).toBeGreaterThan(0);
      if (variant === "duplicate") expect(result.MEMBERSHIP_DIAGNOSTICS?.globalViolations).toContain("DUPLICATE_ROLE_TARGET");
      if (variant === "overflow") expect(result.MEMBERSHIP_DIAGNOSTICS?.overflow).toBe(true);
    });
  it("rejects outgoing privileges even if the grantor is the confirmed provider administrator", async () => {
    const data = fixtures();
    data[selects.memberships]![0] = { ...membership("private-privileged-parent"), member: roleNames[0] };
    const result = await verifyBootstrap(fake({ data }).client, config);
    expect(result.MEMBERSHIPS).toBe("FAIL");
    expect(result.MEMBERSHIP_DIAGNOSTICS?.rows[0]?.direction).toBe("OUTGOING");
    expect(result.MEMBERSHIP_DIAGNOSTICS?.rows[0]?.violations).toContain("ROLE_NOT_CONTRATPRO");
    expect(result.FINAL_VERDICT).toBe("FAIL");
    expect(JSON.stringify(result)).not.toContain("private-privileged-parent");
  });
  it("continues to enforce ACL and foundation boundaries after accepting memberships", async () => {
    const unsafeAcl = fixtures(); unsafeAcl[selects.acl]![0]!.effective_boundary = false;
    const first = await verifyBootstrap(fake({ data: unsafeAcl }).client, config);
    expect(first.MEMBERSHIPS).toBe("PASS");
    expect(first.OWNERSHIP_AND_ACL).toBe("FAIL");
    expect(first.FINAL_VERDICT).toBe("FAIL");
    const foundation = fixtures(); foundation[selects.existence]![0]!.foundation_absent = false;
    const f = fake({ data: foundation });
    expect((await verifyBootstrap(f.client, config)).FOUNDATION_MIGRATIONS_ABSENT).toBe("FAIL");
    expect(f.log).not.toContain(selects.memberships);
  });
});


describe("grantor diagnostics and contract-aligned acceptance", () => {
  const row = (changes: Record<string, unknown> = {}) => ({
    ...membership(roleNames[0]), grantor: "supabase_admin", total_matching_count: "1",
    grantor_oid: "10", grantor_matches_snapshot_oid: true, grantor_matches_current_admin: true,
    grantor_superuser: true, grantor_createrole: true, ...changes,
  });
  const expected = {
    oid: 10, matchesSnapshotOid10: true, matchesCurrentNamedAdmin: true, superuser: true, createRole: true,
    directAdminOnGrantedRole: { count: "0", inheritPresent: false, setPresent: false },
    malformedFields: [], consistencyIssues: [],
  };
  it("accepts the confirmed administrative grantor only with the complete three-role evidence", async () => {
    const data = fixtures();
    data[selects.memberships] = roleNames.map(role => row({ role, total_matching_count: "3" }));
    const f = fake({ data });
    const result = await verifyBootstrap(f.client, config);
    expect(membershipEvidence(data[selects.memberships]!).rows[0]?.grantorEvidence).toEqual(expected);
    expect(result).not.toHaveProperty("MEMBERSHIP_DIAGNOSTICS");
    expect(result.MEMBERSHIPS).toBe("PASS");
    expect(result.FINAL_VERDICT).toBe("PASS");
    expect(result.DIAGNOSTIC).toMatchObject({ failedStage: null, rollback: "SUCCEEDED", clientCleanup: "SUCCEEDED" });
    expect(result.TLS_VERIFICATION).toBe("PASS");
    expect(f.connect).toHaveBeenCalledTimes(1);
    expect(f.log.filter(sql => sql === selects.memberships)).toHaveLength(1);
    expect(f.end).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain("supabase_admin");
  });
  it("keeps snapshot OID and current identity comparisons independent", () => {
    expect(membershipEvidence([row({ grantor_matches_current_admin: false })]).rows[0]?.grantorEvidence).toEqual({
      ...expected, matchesCurrentNamedAdmin: false,
    });
    expect(membershipEvidence([row({ grantor_oid: "42", grantor_matches_snapshot_oid: false })]).rows[0]?.grantorEvidence).toEqual({
      ...expected, oid: 42, matchesSnapshotOid10: false,
    });
    expect(membershipEvidence([row({ grantor_matches_current_admin: null })]).rows[0]?.grantorEvidence).toEqual({
      ...expected, matchesCurrentNamedAdmin: null,
    });
  });
  it("retains distinct per-row grantors rather than merging OTHER_ROLE identities", async () => {
    const data = fixtures();
    data[selects.memberships] = roleNames.map((role, index) => row({
      role, total_matching_count: "3", grantor: "private-grantor-" + index, grantor_oid: String(10 + index),
      grantor_matches_snapshot_oid: index === 0, grantor_matches_current_admin: index === 0,
    }));
    const result = await verifyBootstrap(fake({ data }).client, config);
    expect(result.MEMBERSHIP_DIAGNOSTICS?.rows.map(value => value.grantorEvidence.oid)).toEqual([10, 11, 12]);
    expect(result.MEMBERSHIP_DIAGNOSTICS?.rows.map(value => value.role)).toEqual([...roleNames]);
    expect(result.MEMBERSHIP_DIAGNOSTICS?.rows.every(value => value.direction === "INCOMING" && value.grantor === "OTHER_ROLE")).toBe(true);
    expect(JSON.stringify(result)).not.toContain("private-grantor");
    expect(result.FINAL_VERDICT).toBe("FAIL");
  });
  it("reports missing grantor evidence as unknown and never fabricates authority", () => {
    const evidence = membershipEvidence([{}]).rows[0]!;
    expect(evidence.grantor).toBe("MISSING_IDENTIFIER");
    expect(evidence.grantorEvidence).toEqual({
      oid: null, matchesSnapshotOid10: null, matchesCurrentNamedAdmin: null, superuser: null, createRole: null,
      directAdminOnGrantedRole: { count: null, inheritPresent: null, setPresent: null },
      malformedFields: ["grantor_oid", "grantor_matches_snapshot_oid", "grantor_matches_current_admin",
        "grantor_superuser", "grantor_createrole", "grantor_direct_admin_count",
        "grantor_direct_admin_inherit", "grantor_direct_admin_set"],
      consistencyIssues: [],
    });
  });
  it.each(["0", "2"])("reports absent capabilities and direct ADMIN count %s without approval", async count => {
    const data = fixtures();
    data[selects.memberships] = [row({
      grantor_superuser: false, grantor_createrole: false, grantor_direct_admin_count: count,
      grantor_direct_admin_inherit: count === "2", grantor_direct_admin_set: count === "2",
    })];
    const result = await verifyBootstrap(fake({ data }).client, config);
    expect(result.MEMBERSHIP_DIAGNOSTICS?.rows[0]?.grantorEvidence).toEqual({
      ...expected, superuser: false, createRole: false,
      directAdminOnGrantedRole: { count, inheritPresent: count === "2", setPresent: count === "2" },
    });
    expect(result.MEMBERSHIPS).toBe("FAIL");
    expect(result.MEMBERSHIP_DIAGNOSTICS?.rows[0]?.violations).toContain("GRANTOR_CAPABILITIES_INSUFFICIENT");
    expect(result.DIAGNOSTIC.rollback).toBe("SUCCEEDED");
    expect(result.DIAGNOSTIC.clientCleanup).toBe("SUCCEEDED");
  });
  it("marks inconsistent evidence without silently repairing it", () => {
    expect(membershipEvidence([row({
      grantor_oid: "42", grantor_matches_snapshot_oid: true, grantor_direct_admin_set: true,
    })]).rows[0]?.grantorEvidence.consistencyIssues).toEqual([
      "SNAPSHOT_OID_COMPARISON_MISMATCH", "DIRECT_ADMIN_FLAGS_WITH_ZERO_COUNT",
    ]);
  });
  it.each([null, undefined, "", "0", "-1", "1.5", "01", "4294967296", "secret", 10, {}, Infinity])(
    "redacts malformed grantor OIDs", oid => {
      const value = membershipEvidence([row({ grantor_oid: oid })]).rows[0]!.grantorEvidence;
      expect(value.oid).toBeNull();
      expect(value.malformedFields).toContain("grantor_oid");
      expect(JSON.stringify(value)).not.toContain("secret");
    });
  it.each(["grantor_matches_snapshot_oid", "grantor_matches_current_admin", "grantor_superuser", "grantor_createrole",
    "grantor_direct_admin_inherit", "grantor_direct_admin_set"])("does not coerce malformed flag %s", field => {
    const value = membershipEvidence([row({ [field]: "postgresql://secret@host/private/path" })]).rows[0]!.grantorEvidence;
    expect(value.malformedFields).toContain(field);
    expect(JSON.stringify(value)).not.toMatch(/secret|postgresql:|private|host/);
  });
  it.each(["secret", "01", "-1", "1.0", "9223372036854775808", 0, null])(
    "redacts malformed direct ADMIN counts", count => {
      const value = membershipEvidence([row({ grantor_direct_admin_count: count })]).rows[0]!.grantorEvidence;
      expect(value.directAdminOnGrantedRole.count).toBeNull();
      expect(value.malformedFields).toContain("grantor_direct_admin_count");
      expect(JSON.stringify(value)).not.toContain("secret");
    });
  it("bounds all grantor output and adds no query round trip", () => {
    const report = membershipEvidence(Array.from({ length: 100 }, () => row({
      grantor: "private-role".repeat(1000), total_matching_count: "100",
    })));
    expect(report.rows).toHaveLength(17);
    expect(JSON.stringify(report).length).toBeLessThan(20000);
    expect(JSON.stringify(report)).not.toContain("private-role");
    expect(Object.keys(selects)).toHaveLength(9);
    expect(selects.memberships).toContain("grantor.oid::bigint AS grantor_oid");
    expect(selects.memberships).toContain("grantor.oid=10");
    expect(selects.memberships).toContain("WHERE r.rolname='supabase_admin'");
    expect(selects.memberships).toContain("a.roleid=m.roleid AND a.member=m.grantor AND a.admin_option");
    expect(selects.memberships).toMatch(/LIMIT 17$/);
  });
});


describe("bounded membership evidence", () => {
  const single = (changes: Record<string, unknown> = {}) => ({
    ...membership(roleNames[0]), total_matching_count: "1", ...changes,
  });
  it("handles the approved set and represents empty evidence without approving an empty set", async () => {
    for (const rows of [roleNames.map(membership)]) {
      const data = fixtures(); data[selects.memberships] = rows;
      const f = fake({ data });
      const result = await verifyBootstrap(f.client, config);
      expect(result.MEMBERSHIPS).toBe("PASS");
      expect(result.FINAL_VERDICT).toBe("PASS");
      expect(result).not.toHaveProperty("MEMBERSHIP_DIAGNOSTICS");
      expect(f.connect).toHaveBeenCalledTimes(1);
      expect(f.log.filter(sql => sql === selects.memberships)).toHaveLength(1);
      expect(f.log.at(-1)).toBe("ROLLBACK");
    }
    expect(membershipEvidence([])).toEqual({
      totalMatchingCount: "0", countStatus: "VALID", overflow: false, inspectedRowCount: 0,
      globalViolations: [], rows: [],
    });
    expect(membershipEvidence([single()]).rows[0]).toMatchObject({
      role: roleNames[0], member: "postgres", grantor: "OTHER_ROLE", direction: "INCOMING",
      admin_option: true, inherit_option: false, set_option: false, malformedFields: [], violations: [],
    });
  });
  it.each([
    ["grantor", "unobserved_grantor", "GRANTOR_NOT_APPROVED_ADMIN"],
    ["member", "unobserved_administrator", "MEMBER_NOT_POSTGRES"],
    ["admin_option", false, "ADMIN_NOT_TRUE"],
    ["inherit_option", true, "INHERIT_NOT_FALSE"],
    ["set_option", true, "SET_NOT_FALSE"],
  ])("reports the exact rejected predicate %s without approving unknown identities", async (field, value, violation) => {
    const data = fixtures(); data[selects.memberships] = [single({ [field as string]: value })];
    const f = fake({ data });
    const result = await verifyBootstrap(f.client, config);
    expect(result.MEMBERSHIPS).toBe("FAIL");
    expect(result.FINAL_VERDICT).toBe("FAIL");
    expect(result.MEMBERSHIP_DIAGNOSTICS).toMatchObject({
      totalMatchingCount: "1", countStatus: "VALID", overflow: false, inspectedRowCount: 1,
      globalViolations: ["EXPECTED_MEMBERSHIP_COUNT_MISMATCH"],
      rows: [{
        role: roleNames[0], member: field === "member" ? "OTHER_ROLE" : "postgres",
        grantor: "OTHER_ROLE", direction: "INCOMING",
        admin_option: field === "admin_option" ? false : true,
        inherit_option: field === "inherit_option", set_option: field === "set_option",
        malformedFields: [], violations: [violation],
      }],
    });
    expect(result.DIAGNOSTIC).toEqual({
      failedStage: "MEMBERSHIPS", reason: "VALIDATION_MISMATCH", lastCompletedStage: "ROLE_ATTRIBUTES",
      databaseContact: "ESTABLISHED", readOnlyTransaction: "STARTED", rollback: "SUCCEEDED",
      clientCleanup: "SUCCEEDED", secondaryFailures: [],
    });
    expect(result.TLS_VERIFICATION).toBe("PASS");
    expect(result.JOURNAL_STATE).toBe("PASS");
    expect(f.log).not.toContain(selects.acl);
    if (typeof value === "string") expect(JSON.stringify(result)).not.toContain(value);
  });
  it("preserves outgoing and between-role directions and all violated conditions", async () => {
    const rows = [
      single({ role: "unapproved_parent", member: roleNames[1], grantor: "unapproved_grantor",
        admin_option: false, inherit_option: true, set_option: true, total_matching_count: "2" }),
      single({ role: roleNames[0], member: roleNames[2], total_matching_count: "2" }),
    ];
    const data = fixtures(); data[selects.memberships] = rows;
    const result = await verifyBootstrap(fake({ data }).client, config);
    expect(result.MEMBERSHIP_DIAGNOSTICS?.rows[0]).toMatchObject({
      role: "OTHER_ROLE", member: roleNames[1], grantor: "OTHER_ROLE", direction: "OUTGOING",
      admin_option: false, inherit_option: true, set_option: true, malformedFields: [],
      violations: ["ROLE_NOT_CONTRATPRO", "MEMBER_NOT_POSTGRES", "GRANTOR_NOT_APPROVED_ADMIN",
        "ADMIN_NOT_TRUE", "INHERIT_NOT_FALSE", "SET_NOT_FALSE"],
    });
    expect(result.MEMBERSHIP_DIAGNOSTICS?.rows[1]?.direction).toBe("BOTH");
    expect(result.MEMBERSHIP_DIAGNOSTICS?.rows[1]?.violations).toEqual(["MEMBER_NOT_POSTGRES"]);
    expect(result.MEMBERSHIPS).toBe("FAIL");
  });
  it("reports total before LIMIT, overflow and only 17 inspected rows", async () => {
    const data = fixtures();
    data[selects.memberships] = Array.from({ length: 17 }, () => single({ total_matching_count: "100" }));
    const f = fake({ data });
    const result = await verifyBootstrap(f.client, config);
    expect(result.MEMBERSHIP_DIAGNOSTICS).toMatchObject({
      totalMatchingCount: "100", countStatus: "VALID", overflow: true, inspectedRowCount: 17,
      globalViolations: ["ROW_LIMIT_EXCEEDED", "EXPECTED_MEMBERSHIP_COUNT_MISMATCH", "DUPLICATE_ROLE_TARGET"],
    });
    expect(result.MEMBERSHIP_DIAGNOSTICS?.rows).toHaveLength(17);
    expect(result.MEMBERSHIP_DIAGNOSTICS?.rows.every(row => row.violations.length === 0)).toBe(true);
    expect(result.MEMBERSHIPS).toBe("FAIL");
    expect(result.FINAL_VERDICT).toBe("FAIL");
    expect(f.log.filter(sql => sql === selects.memberships)).toHaveLength(1);
    const huge = membershipEvidence(Array.from({ length: 100 }, () => single({ total_matching_count: "100" })));
    expect(huge.rows).toHaveLength(17);
    expect(JSON.stringify(huge).length).toBeLessThan(20000);
  });
  it("classifies missing/malformed fields without copying arbitrary values", async () => {
    const data = fixtures();
    data[selects.memberships] = [{
      role: null, member: { secret: "private credential" }, grantor: "postgresql://secret@host/private/path",
      admin_option: "true", inherit_option: 0, total_matching_count: "1",
    }];
    const result = await verifyBootstrap(fake({ data }).client, config);
    expect(result.MEMBERSHIP_DIAGNOSTICS?.rows[0]).toMatchObject({
      role: "MALFORMED_IDENTIFIER", member: "MALFORMED_IDENTIFIER", grantor: "OTHER_ROLE", direction: "UNDETERMINED",
      admin_option: null, inherit_option: null, set_option: null,
      malformedFields: ["role", "member", "admin_option", "inherit_option", "set_option"],
      violations: ["ROLE_NOT_CONTRATPRO", "MEMBER_NOT_POSTGRES", "GRANTOR_NOT_APPROVED_ADMIN",
        "GRANTOR_EVIDENCE_INVALID", "GRANTOR_IDENTITY_MISMATCH", "GRANTOR_SNAPSHOT_MISMATCH",
        "GRANTOR_CAPABILITIES_INSUFFICIENT", "UNEXPECTED_GRANTOR_ADMIN_MEMBERSHIP",
        "ADMIN_NOT_TRUE", "INHERIT_NOT_FALSE", "SET_NOT_FALSE"],
    });
    expect(result.MEMBERSHIPS).toBe("FAIL");
    expect(JSON.stringify(result)).not.toMatch(/private|credential|postgresql:|secret@|host/);
    const malformed = membershipEvidence([null, { get grantor() { throw privateError(); } }]);
    expect(malformed.rows[0]?.role).toBe("MISSING_IDENTIFIER");
    expect(malformed.rows[1]?.grantor).toBe("MISSING_IDENTIFIER");
    expect(() => JSON.stringify(malformed)).not.toThrow();
  });
  it.each([undefined, null, "", "01", "-1", "1.0", "NaN", "Infinity", "9223372036854775808", "secret", 1])(
    "does not emit malformed total counts", count => {
      const report = membershipEvidence([single({ total_matching_count: count })]);
      expect(report).toMatchObject({ totalMatchingCount: null, countStatus: "MISSING_OR_MALFORMED", overflow: null });
    });
  it("marks inconsistent counts unknown and keeps overflow explicit", () => {
    expect(membershipEvidence([single({ total_matching_count: "2" })])).toMatchObject({
      totalMatchingCount: null, countStatus: "INCONSISTENT", overflow: null,
    });
    expect(membershipEvidence([single({ total_matching_count: "2" }), single({ total_matching_count: "3" })])).toMatchObject({
      totalMatchingCount: null, countStatus: "MISSING_OR_MALFORMED", overflow: null,
    });
    expect(membershipEvidence(Array.from({ length: 17 }, () => single({ total_matching_count: undefined })))).toMatchObject({
      totalMatchingCount: null, overflow: true,
    });
  });
  it("retains sanitized membership evidence through serialization failure", async () => {
    const data = fixtures();
    data[selects.memberships] = [single({ grantor: "postgresql://private:secret@host/private/path" })];
    const f = fake({ data });
    const stdout = vi.spyOn(console, "log").mockImplementation(() => {});
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
    const stringify = JSON.stringify.bind(JSON);
    let failed = false;
    const serializer = vi.spyOn(JSON, "stringify").mockImplementation(value => {
      if (!failed && value && typeof value === "object" && "MEMBERSHIP_DIAGNOSTICS" in value) {
        failed = true; throw privateError();
      }
      return stringify(value);
    });
    try {
      expect(await entrypoint(args, envFixture, injectedDependencies(f))).toBe(1);
      const result = JSON.parse(stderr.mock.calls[0]![0] as string);
      expect(result.MEMBERSHIP_DIAGNOSTICS.rows[0].grantor).toBe("OTHER_ROLE");
      expect(result.MEMBERSHIP_DIAGNOSTICS.rows[0].violations).toEqual(["GRANTOR_NOT_APPROVED_ADMIN"]);
      expect(result.DIAGNOSTIC).toMatchObject({
        failedStage: "MEMBERSHIPS", reason: "VALIDATION_MISMATCH", rollback: "SUCCEEDED", clientCleanup: "SUCCEEDED",
        secondaryFailures: [{ stage: "OUTPUT", reason: "OUTPUT_FAILED" }],
      });
      expect(result.FINAL_VERDICT).toBe("FAIL");
      expect(result.TLS_VERIFICATION).toBe("PASS");
      expect(stringify(stderr.mock.calls)).not.toMatch(/private|secret|postgresql:|host|path/);
      expect(f.connect).toHaveBeenCalledTimes(1);
      expect(f.end).toHaveBeenCalledTimes(1);
      expect(stdout).not.toHaveBeenCalled();
    } finally { serializer.mockRestore(); stdout.mockRestore(); stderr.mockRestore(); }
  });
  it("extends the existing SELECT without changing its scope or adding queries", () => {
    expect(Object.keys(selects)).toHaveLength(9);
    expect(selects.memberships).toContain("count(*) OVER ()::text AS total_matching_count");
    expect(selects.memberships).toContain("WHERE granted.rolname IN");
    expect(selects.memberships).toContain("OR member.rolname IN");
    expect(selects.memberships).toMatch(/LIMIT 17$/);
  });
});


describe("approved journal DDL regressions", () => {
  it("matches the approved no-default runner_version declaration and explicit insertion", async () => {
    expect(queries.createJournal).toContain("runner_version integer NOT NULL CHECK (runner_version = 1)");
    expect(queries.record).toContain("runner_version) VALUES ($1, $2, $3, $4, 1)");
    const data = fixtures();
    expect(data[selects.details]![0]!.defaults).toEqual(["applied_at:clock_timestamp()", "applied_by:SESSION_USER"]);
    const result = await verifyBootstrap(fake({ data }).client, config);
    expect(result.JOURNAL_STATE).toBe("PASS");
    expect(result.FINAL_VERDICT).toBe("PASS");
  });
  it.each(["unexpected default", "missing CHECK", "incorrect CHECK", "wrong journal value", "wrong type", "nullable column"])(
    "rejects %s without relaxing journal checks", async variant => {
      const data = fixtures();
      const details = data[selects.details]![0]!;
      if (variant === "unexpected default") (details.defaults as string[]).push("runner_version:1");
      if (variant === "missing CHECK") {
        details.checks = (details.checks as string[]).filter(check => !check.includes("runner_version"));
        details.constraint_count = 5;
      }
      if (variant === "incorrect CHECK") {
        details.checks = (details.checks as string[]).map(check => check.replace("runner_version = 1", "runner_version = 2"));
      }
      if (variant === "wrong journal value") data[selects.history]![0]!.runner_version = 2;
      if (variant === "wrong type" || variant === "nullable column") {
        data[selects.shape]![0]!.columns = journalColumns.map(column => column.startsWith("runner_version:")
          ? variant === "wrong type" ? "runner_version:text:true" : "runner_version:integer:false" : column);
      }
      const f = fake({ data });
      const result = await verifyBootstrap(f.client, config);
      expect(result.JOURNAL_STATE).toBe("FAIL");
      expect(result.TLS_VERIFICATION).toBe("PASS");
      expect(result.DIAGNOSTIC).toEqual({
        failedStage: "JOURNAL", reason: "VALIDATION_MISMATCH", lastCompletedStage: "TARGET_IDENTITY",
        databaseContact: "ESTABLISHED", readOnlyTransaction: "STARTED", rollback: "SUCCEEDED",
        clientCleanup: "SUCCEEDED", secondaryFailures: [],
      });
      expect(result.FINAL_VERDICT).toBe("FAIL");
      expect(f.log).not.toContain(selects.roles);
    });
});
describe("outermost CLI boundary regressions", () => {
  it("retains known pre-execution rejection as no established contact", async () => {
    const stdout = vi.spyOn(console, "log").mockImplementation(() => {});
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
    const f = fake();
    try {
      expect(await entrypoint([], {}, injectedDependencies(f))).toBe(1);
      const result = JSON.parse(stdout.mock.calls[0]![0] as string);
      expect(result.DIAGNOSTIC).toEqual({
        failedStage: "CLI_ARGUMENTS", reason: "INVALID_ARGUMENTS", lastCompletedStage: null,
        databaseContact: "NOT_ESTABLISHED", readOnlyTransaction: "NOT_STARTED",
        rollback: "NOT_ATTEMPTED", clientCleanup: "NOT_ATTEMPTED", secondaryFailures: [],
      });
      expect(result.FINAL_VERDICT).toBe("INDETERMINATE");
      expect(stderr).not.toHaveBeenCalled();
      expect(f.connect).not.toHaveBeenCalled();
    } finally { stdout.mockRestore(); stderr.mockRestore(); }
  });
  it("uses UNKNOWN when a rejected run provides no recoverable execution facts", async () => {
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
    const rejectedRun = vi.fn(async () => { throw privateError(); });
    try {
      expect(await entrypoint(args, envFixture, {}, rejectedRun)).toBe(1);
      expect(rejectedRun).toHaveBeenCalledTimes(1);
      const result = JSON.parse(stderr.mock.calls[0]![0] as string);
      expect(result.DIAGNOSTIC).toEqual({
        failedStage: "CLI_RUNTIME", reason: "UNEXPECTED_EXECUTION_FAILURE", lastCompletedStage: null,
        databaseContact: "UNKNOWN", readOnlyTransaction: "UNKNOWN",
        rollback: "UNKNOWN", clientCleanup: "UNKNOWN", secondaryFailures: [],
      });
      expect(result.TLS_VERIFICATION).toBe("INDETERMINATE");
      expect(result.FINAL_VERDICT).toBe("INDETERMINATE");
      expect(JSON.stringify(stderr.mock.calls)).not.toMatch(/secret|postgresql:|private|driver SQL/);
    } finally { stderr.mockRestore(); }
  });
  it("preserves partial verification facts when run rejects", async () => {
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
    const rejectedRun: typeof run = async (_args, _env, _injected, progress = {}) => {
      const result = emptyResult();
      result.TARGET_IDENTITY = "PASS";
      result.TLS_VERIFICATION = "PASS";
      result.DIAGNOSTIC.databaseContact = "ESTABLISHED";
      result.DIAGNOSTIC.readOnlyTransaction = "STARTED";
      result.DIAGNOSTIC.lastCompletedStage = "TARGET_IDENTITY";
      result.DIAGNOSTIC.rollback = "UNKNOWN";
      result.DIAGNOSTIC.clientCleanup = "UNKNOWN";
      progress.result = result;
      progress.phase = "EXECUTION";
      throw privateError();
    };
    try {
      expect(await entrypoint(args, envFixture, {}, rejectedRun)).toBe(1);
      const result = JSON.parse(stderr.mock.calls[0]![0] as string);
      expect(result.DIAGNOSTIC).toEqual({
        failedStage: "CLI_RUNTIME", reason: "UNEXPECTED_EXECUTION_FAILURE", lastCompletedStage: "TARGET_IDENTITY",
        databaseContact: "ESTABLISHED", readOnlyTransaction: "STARTED",
        rollback: "UNKNOWN", clientCleanup: "UNKNOWN", secondaryFailures: [],
      });
      expect(result.TARGET_IDENTITY).toBe("PASS");
      expect(result.TLS_VERIFICATION).toBe("PASS");
      expect(result.JOURNAL_STATE).toBe("INDETERMINATE");
      expect(result.FINAL_VERDICT).toBe("INDETERMINATE");
    } finally { stderr.mockRestore(); }
  });
  it.each(["stdout", "serialization"])("preserves completed facts after %s failure", async failure => {
    const f = fake();
    const stdout = vi.spyOn(console, "log").mockImplementation(() => {
      if (failure === "stdout") throw privateError();
    });
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
    const originalStringify = JSON.stringify.bind(JSON);
    const serializer = vi.spyOn(JSON, "stringify").mockImplementation(value => {
      if (failure === "serialization" && value && typeof value === "object"
        && "FINAL_VERDICT" in value && value.FINAL_VERDICT === "PASS") throw privateError();
      return originalStringify(value);
    });
    try {
      expect(await entrypoint(args, envFixture, injectedDependencies(f))).toBe(1);
      const result = JSON.parse(stderr.mock.calls[0]![0] as string);
      expect(result.DIAGNOSTIC).toEqual({
        failedStage: "OUTPUT", reason: "OUTPUT_FAILED", lastCompletedStage: "CLIENT_CLEANUP",
        databaseContact: "ESTABLISHED", readOnlyTransaction: "STARTED",
        rollback: "SUCCEEDED", clientCleanup: "SUCCEEDED", secondaryFailures: [],
      });
      for (const [key, value] of Object.entries(result)) {
        if (key !== "DIAGNOSTIC" && key !== "FINAL_VERDICT") expect(value).toBe("PASS");
      }
      expect(result.FINAL_VERDICT).toBe("INDETERMINATE");
      expect(originalStringify(stderr.mock.calls)).not.toMatch(/secret|postgresql:|private|driver SQL/);
      expect(f.connect).toHaveBeenCalledTimes(1);
      expect(f.end).toHaveBeenCalledTimes(1);
    } finally { serializer.mockRestore(); stdout.mockRestore(); stderr.mockRestore(); }
  });
  it("does not overwrite a primary verification failure with output failure", async () => {
    const data = fixtures(); data[selects.history]![0]!.runner_version = 2;
    const f = fake({ data });
    const stdout = vi.spyOn(console, "log").mockImplementation(() => { throw privateError(); });
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await entrypoint(args, envFixture, injectedDependencies(f))).toBe(1);
      const result = JSON.parse(stderr.mock.calls[0]![0] as string);
      expect(result.DIAGNOSTIC).toEqual({
        failedStage: "JOURNAL", reason: "VALIDATION_MISMATCH", lastCompletedStage: "TARGET_IDENTITY",
        databaseContact: "ESTABLISHED", readOnlyTransaction: "STARTED",
        rollback: "SUCCEEDED", clientCleanup: "SUCCEEDED",
        secondaryFailures: [{ stage: "OUTPUT", reason: "OUTPUT_FAILED" }],
      });
      expect(result.JOURNAL_STATE).toBe("FAIL");
      expect(result.TLS_VERIFICATION).toBe("PASS");
      expect(result.FINAL_VERDICT).toBe("FAIL");
    } finally { stdout.mockRestore(); stderr.mockRestore(); }
  });
  it("exits nonzero without leaking raw errors if both output streams fail", async () => {
    const f = fake();
    const stdout = vi.spyOn(console, "log").mockImplementation(() => { throw privateError(); });
    const stderr = vi.spyOn(console, "error").mockImplementation(() => { throw privateError(); });
    try {
      await expect(entrypoint(args, envFixture, injectedDependencies(f))).resolves.toBe(1);
      expect(f.connect).toHaveBeenCalledTimes(1);
      expect(f.end).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(stderr.mock.calls)).not.toMatch(/secret|postgresql:|private|driver SQL/);
    } finally { stdout.mockRestore(); stderr.mockRestore(); }
  });
});


