import { beforeAll, describe, expect, it } from "vitest";
import { parse } from "libpg-query";
import type { ApplyConfig } from "../src/migrations/config";
import { loadMigrations, planChecksum, type Migration } from "../src/migrations/manifest";
import { runMigrations, validateHistory, type MigrationConnection } from "../src/migrations/runner";
import { journalColumns, queries } from "../src/migrations/sql";

let plan: readonly Migration[];
let config: ApplyConfig;
beforeAll(async () => {
  plan = await loadMigrations();
  config = { stage: "bootstrap", url: "never-used-by-the-engine", targetId: "synthetic-target",
    database: "synthetic", databaseOid: 12345, login: "migration_test_login", journalOwner: "migration_test_login",
    serverAddress: "127.0.0.1", serverPort: 5432, planHash: planChecksum(plan), caFile: "unused-by-injected-engine" };
});

type State = { journal: boolean; rows: Record<string, unknown>[]; lockOwner: number | null };
const entry = (migration: Migration) => ({ id: migration.id, ordinal: migration.ordinal, checksum: migration.checksum, target_id: config.targetId, runner_version: 1 });

// An orchestration double, not PostgreSQL, SQL execution, durability or RLS proof.
function fakeConnection(options: {
  state?: State; backend?: number; identity?: Record<string, unknown>; roleSafe?: boolean;
  shape?: Record<string, unknown>; fresh?: boolean; failBody?: number; uncertainCommit?: boolean;
  waitBody?: () => Promise<void>; held?: boolean;
  authority?: Record<string, unknown>;
} = {}) {
  const state = options.state ?? { journal: false, rows: [], lockOwner: null };
  const backend = options.backend ?? 100;
  const log: string[] = [];
  let pending: Record<string, unknown>[] = [];
  let oldJournal = state.journal;
  const connection: MigrationConnection = {
    async query(text, values) {
      log.push(text);
      const row = (value: Record<string, unknown>) => ({ rows: [value] });
      if (text === queries.identity) return row({ database: config.database, database_oid: String(config.databaseOid),
        login: config.login, role: config.login, server_address: config.serverAddress, server_port: config.serverPort,
        recovery: false, version: 170000, backend_pid: backend, ...options.identity });
      if (text === queries.lock) {
        const locked = state.lockOwner === null;
        if (locked) state.lockOwner = backend;
        return row({ locked, backend_pid: backend });
      }
      if (text === queries.unlock) {
        const unlocked = state.lockOwner === backend;
        if (unlocked) state.lockOwner = null;
        return row({ unlocked });
      }
      if (text === queries.heldLock) return row({ locked: options.held ?? state.lockOwner === backend, backend_pid: backend });
      if (text === queries.status) return row({ journal: state.journal ? "migration_control.journal" : null, namespace_exists: state.journal });
      if (text === queries.fresh) return row({ fresh: options.fresh ?? true, can_provision: true, can_create_journal: true });
      if (text === queries.foundationAuthority) return row({ owner_create: true, owner_set: true, ...options.authority });
      if (text === queries.journalShape) return row({ schema_owner: config.journalOwner, table_owner: config.journalOwner,
        shape_safe: true, primary_safe: true, ordinal_safe: true, marker: "contratpro migration journal v1", columns: journalColumns, ...options.shape });
      if (text === queries.roleBoundary) return row({ safe: options.roleSafe ?? true });
      if (text === queries.history) return { rows: state.rows };
      if (text === "BEGIN") { pending = []; oldJournal = state.journal; }
      if (text === queries.createJournal) state.journal = true;
      if (text === queries.record) pending.push({ id: values![0], ordinal: values![1], checksum: values![2], target_id: values![3], runner_version: 1 });
      const migration = plan.find((item) => item.body === text);
      if (migration) {
        if (options.waitBody) await options.waitBody();
        if (migration.ordinal === options.failBody) throw new Error("Synthetic statement failure");
      }
      if (text === "ROLLBACK") { pending = []; state.journal = oldJournal; }
      if (text === "COMMIT") {
        state.rows.push(...pending); pending = [];
        if (options.uncertainCommit) throw new Error("Synthetic lost COMMIT acknowledgement");
      }
      return { rows: [], command: text === "COMMIT" ? "COMMIT" : text === "ROLLBACK" ? "ROLLBACK" : "" };
    },
  };
  return { connection, state, log };
}

describe("migration runner offline orchestration contracts", () => {
  it("parses all control SQL offline, including placeholders and journal DDL", async () => {
    for (const sql of Object.values(queries)) await expect(parse(sql)).resolves.toBeDefined();
    expect(queries.createJournal).toContain("ordinal integer NOT NULL UNIQUE");
    expect(queries.createJournal).toContain("id text PRIMARY KEY");
    expect(queries.createJournal).toContain("checksum ~ '^[0-9a-f]{64}$'");
  });

  it("commits bootstrap DDL and its journal row together, without nesting draft transactions", async () => {
    const { connection, log, state } = fakeConnection();
    await expect(runMigrations(connection, config, plan)).resolves.toEqual([plan[0]!.id]);
    expect(state.rows).toEqual([entry(plan[0]!)]);
    for (const foundation of plan.slice(1)) expect(log).not.toContain(foundation.body);
    expect(log).not.toContain(queries.foundationAuthority);
    expect(log.filter((sql) => sql === "BEGIN")).toHaveLength(1);
    expect(log.indexOf("BEGIN")).toBeLessThan(log.indexOf(queries.createJournal));
    expect(log.indexOf(plan[0]!.body)).toBeLessThan(log.indexOf(queries.record));
    expect(log.indexOf(queries.record)).toBeLessThan(log.indexOf("COMMIT"));
    expect(log.indexOf("SET LOCAL ROLE NONE")).toBeLessThan(log.indexOf(queries.record));
    expect(state.lockOwner).toBeNull();
  });

  it("requires separate bootstrap approval and refuses collisions/unapproved plans before DDL", async () => {
    const missing = fakeConnection();
    await expect(runMigrations(missing.connection, { ...config, stage: "foundation" }, plan)).rejects.toThrow("Bootstrap");
    expect(missing.log).not.toContain("BEGIN");
    const collision = fakeConnection({ fresh: false });
    await expect(runMigrations(collision.connection, config, plan)).rejects.toThrow("collision");
    const wrongPlan = fakeConnection();
    await expect(runMigrations(wrongPlan.connection, { ...config, planHash: "0".repeat(64) }, plan)).rejects.toThrow("Unapproved");
    expect(wrongPlan.log).toHaveLength(0);
  });

  it.each([
    { database: "other" }, { database_oid: "99" }, { login: "other" }, { role: "contratpro_runtime" },
    { server_address: "192.0.2.1" }, { server_port: 123 }, { recovery: true }, { version: undefined }, { version: 150000 },
  ])("rejects wrong target/session metadata before any DDL: %j", async (identity) => {
    const { connection, log } = fakeConnection({ identity });
    await expect(runMigrations(connection, config, plan)).rejects.toThrow("identity");
    expect(log).not.toContain("BEGIN");
  });

  it("resumes only the unapplied suffix and safely replays a complete journal", async () => {
    const state: State = { journal: true, rows: [entry(plan[0]!)], lockOwner: null };
    const first = fakeConnection({ state });
    await expect(runMigrations(first.connection, { ...config, stage: "foundation" }, plan)).resolves.toEqual(plan.slice(1).map((item) => item.id));
    expect(first.log).not.toContain(plan[0]!.body);
    const replay = fakeConnection({ state });
    await expect(runMigrations(replay.connection, { ...config, stage: "foundation" }, plan)).resolves.toEqual([]);
    expect(replay.log).not.toContain("BEGIN");
  });

  it("rejects checksum mismatch, unknown/gapped history, target and journal-version mismatch", () => {
    const first = entry(plan[0]!);
    for (const rows of [
      [{ ...first, checksum: "0".repeat(64) }], [{ ...first, id: "unknown.sql" }], [entry(plan[1]!)],
      [{ ...first, target_id: "other-target" }], [{ ...first, runner_version: 2 }], [first, entry(plan[2]!)],
    ]) expect(() => validateHistory(rows, plan, config.targetId)).toThrow();
  });

  it("does not execute migration bodies with mismatched journal history, ownership or role boundary", async () => {
    for (const fake of [
      fakeConnection({ state: { journal: true, rows: [{ ...entry(plan[0]!), checksum: "0".repeat(64) }], lockOwner: null } }),
      fakeConnection({ state: { journal: true, rows: [entry(plan[0]!)], lockOwner: null }, shape: { table_owner: "other" } }),
      fakeConnection({ state: { journal: true, rows: [entry(plan[0]!)], lockOwner: null }, roleSafe: false }),
    ]) {
      await expect(runMigrations(fake.connection, { ...config, stage: "foundation" }, plan)).rejects.toThrow();
      expect(fake.log).not.toContain("BEGIN");
    }
  });

  it("refuses empty existing journals and missing separately granted owner authority", async () => {
    const empty = fakeConnection({ state: { journal: true, rows: [], lockOwner: null } });
    await expect(runMigrations(empty.connection, config, plan)).rejects.toThrow("Empty existing journal");
    for (const authority of [{ owner_set: false }, { owner_create: false }]) {
      const fake = fakeConnection({ state: { journal: true, rows: [entry(plan[0]!)], lockOwner: null }, authority });
      await expect(runMigrations(fake.connection, { ...config, stage: "foundation" }, plan)).rejects.toThrow("approved separately");
      expect(fake.log).not.toContain("BEGIN");
    }
  });

  it("rolls back a failed file, stops, and preserves only previously committed history in the double", async () => {
    const fake = fakeConnection({ state: { journal: true, rows: [entry(plan[0]!)], lockOwner: null }, failBody: 2 });
    await expect(runMigrations(fake.connection, { ...config, stage: "foundation" }, plan)).rejects.toThrow("Synthetic");
    expect(fake.state.rows.map((row) => row.id)).toEqual(plan.slice(0, 2).map((item) => item.id));
    expect(fake.log).toContain("ROLLBACK");
    expect(fake.log).not.toContain(plan[3]!.body);
  });

  it("stops on uncertain commit without blind replay or claiming rollback", async () => {
    const fake = fakeConnection({ uncertainCommit: true });
    await expect(runMigrations(fake.connection, config, plan)).rejects.toThrow("Commit outcome uncertain");
    expect(fake.log).not.toContain("ROLLBACK");
    expect(fake.log.filter((sql) => sql === plan[0]!.body)).toHaveLength(1);
  });

  it("serializes concurrent runners before DDL using the shared-session-lock double", async () => {
    let release!: () => void;
    let entered!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    const enteredBody = new Promise<void>((resolve) => { entered = resolve; });
    const state: State = { journal: false, rows: [], lockOwner: null };
    const first = fakeConnection({ state, backend: 100, waitBody: async () => { entered(); await blocked; } });
    const running = runMigrations(first.connection, config, plan);
    await enteredBody;
    const second = fakeConnection({ state, backend: 200 });
    await expect(runMigrations(second.connection, config, plan)).rejects.toThrow("holds the lock");
    expect(second.log).not.toContain("BEGIN");
    release();
    await running;
    expect(state.lockOwner).toBeNull();
  });

  it("rejects lost session locks inside BEGIN before migration DDL", async () => {
    const fake = fakeConnection({ held: false });
    await expect(runMigrations(fake.connection, config, plan)).rejects.toThrow("lock lost");
    expect(fake.log).toContain("ROLLBACK");
    expect(fake.log).not.toContain(queries.createJournal);
    expect(fake.log).not.toContain(plan[0]!.body);
  });
});
