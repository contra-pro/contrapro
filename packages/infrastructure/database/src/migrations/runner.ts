import type { ApplyConfig } from "./config.ts";
import { MigrationError, migrationIds, planChecksum, type Migration } from "./manifest.ts";
import { journalColumns, queries } from "./sql.ts";

export type QueryReply = { rows: Record<string, unknown>[]; command?: string };
export interface MigrationConnection {
  query(text: string, values?: readonly unknown[]): Promise<QueryReply>;
}

async function one(connection: MigrationConnection, query: string) {
  const result = await connection.query(query);
  if (result.rows.length !== 1) throw new MigrationError("Expected one preflight result");
  return result.rows[0]!;
}

async function assertIdentity(connection: MigrationConnection, config: ApplyConfig, backend?: number) {
  const row = await one(connection, queries.identity);
  const version = Number(row.version);
  if (row.database !== config.database || Number(row.database_oid) !== config.databaseOid
    || row.login !== config.login || row.role !== config.login || row.server_address !== config.serverAddress
    || Number(row.server_port) !== config.serverPort || row.recovery !== false
    || !Number.isSafeInteger(version) || version < 160000 || version >= 190000
    || !Number.isSafeInteger(row.backend_pid) || (backend !== undefined && row.backend_pid !== backend)) {
    throw new MigrationError("Database/session identity or reviewed PostgreSQL version mismatch");
  }
  return Number(row.backend_pid);
}

async function assertHeldLock(connection: MigrationConnection, backend: number) {
  const row = await one(connection, queries.heldLock);
  if (row.locked !== true || row.backend_pid !== backend) throw new MigrationError("Dedicated migration session/lock lost");
}

async function assertJournal(connection: MigrationConnection, config: ApplyConfig) {
  const row = await one(connection, queries.journalShape);
  if (row.schema_owner !== config.journalOwner || row.table_owner !== config.journalOwner
    || row.shape_safe !== true || row.primary_safe !== true || row.ordinal_safe !== true
    || row.marker !== "contratpro migration journal v1" || JSON.stringify(row.columns) !== JSON.stringify(journalColumns)) {
    throw new MigrationError("Unexpected journal ownership or structure; automatic adoption is forbidden");
  }
}

async function assertRoleBoundary(connection: MigrationConnection) {
  if ((await one(connection, queries.roleBoundary)).safe !== true) throw new MigrationError("Migration/runtime role boundary failed");
}

export function validateHistory(rows: readonly Record<string, unknown>[], plan: readonly Migration[], targetId: string): number {
  if (rows.length > plan.length) throw new MigrationError("Unknown migration history");
  for (const [index, row] of rows.entries()) {
    const migration = plan[index]!;
    if (row.id !== migration.id || row.ordinal !== index || row.checksum !== migration.checksum
      || row.target_id !== targetId || row.runner_version !== 1) {
      throw new MigrationError("Migration history gap, target/version mismatch or checksum mismatch");
    }
  }
  return rows.length;
}

/** Operational tool only. Accepts an already dedicated connection; constructs none. */
export async function runMigrations(connection: MigrationConnection, config: ApplyConfig, plan: readonly Migration[]): Promise<readonly string[]> {
  if (plan.length !== migrationIds.length || plan.some((migration, index) => migration.id !== migrationIds[index] || migration.ordinal !== index)
    || planChecksum(plan) !== config.planHash || !["bootstrap", "foundation"].includes(config.stage)) {
    throw new MigrationError("Unapproved migration plan or stage");
  }
  const backend = await assertIdentity(connection, config);
  await connection.query(queries.configure);
  let locked = false;
  let transaction = false;
  let committing = false;
  let failed = false;
  const applied: string[] = [];
  try {
    const lock = await one(connection, queries.lock);
    locked = lock.locked === true;
    if (!locked) throw new MigrationError("Another migration runner holds the lock");
    if (lock.backend_pid !== backend) throw new MigrationError("Migration backend changed");
    const status = await one(connection, queries.status);
    let completed = 0;
    const fresh = status.journal === null && status.namespace_exists === false;
    if (!fresh) {
      if (status.journal !== "migration_control.journal") throw new MigrationError("Control namespace collision");
      await assertJournal(connection, config);
      completed = validateHistory((await connection.query(queries.history)).rows, plan, config.targetId);
      if (completed === 0) throw new MigrationError("Empty existing journal cannot be adopted");
      await assertRoleBoundary(connection);
    } else {
      if (config.stage !== "bootstrap") throw new MigrationError("Bootstrap must be approved and applied separately first");
      const check = await one(connection, queries.fresh);
      if (check.fresh !== true || check.can_provision !== true || check.can_create_journal !== true) throw new MigrationError("Nonempty target, role collision or missing provisioning/journal authority");
    }
    const limit = config.stage === "bootstrap" ? 1 : plan.length;
    if (config.stage === "foundation" && completed < limit) {
      const authority = await one(connection, queries.foundationAuthority);
      if (authority.owner_create !== true || authority.owner_set !== true) throw new MigrationError("Owner CREATE/SET authority must be approved separately");
    }
    for (const migration of plan.slice(completed, limit)) {
      await connection.query("BEGIN");
      transaction = true;
      await assertHeldLock(connection, backend);
      await assertIdentity(connection, config, backend);
      if (fresh && migration.ordinal === 0) await connection.query(queries.createJournal);
      await connection.query(migration.body);
      // Draft SET LOCAL ROLE must not transfer ownership of the control journal.
      await connection.query("SET LOCAL ROLE NONE");
      await assertIdentity(connection, config, backend);
      if (migration.ordinal === 0) await connection.query(queries.restrictJournal);
      await assertJournal(connection, config);
      await assertRoleBoundary(connection);
      await connection.query(queries.record, [migration.id, migration.ordinal, migration.checksum, config.targetId]);
      committing = true;
      const result = await connection.query("COMMIT");
      committing = false;
      transaction = false;
      if (result.command !== "COMMIT") throw new MigrationError("Migration did not commit; inspect the journal before retrying");
      applied.push(migration.id);
    }
    return applied;
  } catch (error) {
    failed = true;
    if (committing) throw new MigrationError("Commit outcome uncertain; close session and verify journal on a new approved connection");
    if (transaction) {
      try {
        const result = await connection.query("ROLLBACK");
        if (result.command !== "ROLLBACK") throw new Error();
      } catch { throw new MigrationError("Rollback not confirmed; close session and investigate target state"); }
    }
    throw error;
  } finally {
    if (locked) {
      try {
        const result = await connection.query(queries.unlock, [backend]);
        if (result.rows[0]?.unlocked !== true) throw new Error();
      } catch {
        if (!failed) throw new MigrationError("Lock release not confirmed; close dedicated session before another apply");
      }
    }
  }
}
