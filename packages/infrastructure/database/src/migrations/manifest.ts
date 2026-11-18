import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { parse } from "libpg-query";

export const migrationIds = ["0000_roles.sql", "0001_schema.sql", "0002_context.sql", "0003_rls_grants.sql"] as const;
export type MigrationId = typeof migrationIds[number];
export type Migration = Readonly<{ id: MigrationId; ordinal: number; checksum: string; body: string }>;

export class MigrationError extends Error {}

export async function prepareMigration(id: MigrationId, source: string): Promise<Migration> {
  if (!migrationIds.includes(id) || source.includes("\r") || source.charCodeAt(0) === 0xfeff) {
    throw new MigrationError("Unknown migration or noncanonical SQL bytes (require UTF-8, LF, no BOM)");
  }
  const ast = await parse(source);
  const statements = ast.stmts ?? [];
  const first = statements[0];
  const last = statements.at(-1);
  const begin = first?.stmt && "TransactionStmt" in first.stmt ? first.stmt.TransactionStmt : undefined;
  const commit = last?.stmt && "TransactionStmt" in last.stmt ? last.stmt.TransactionStmt : undefined;
  if (statements.length < 3 || begin?.kind !== "TRANS_STMT_BEGIN" || commit?.kind !== "TRANS_STMT_COMMIT"
    || (begin.options?.length ?? 0) > 0 || commit.chain || !first || !last) {
    throw new MigrationError("Require plain outer BEGIN/COMMIT and a nonempty migration body");
  }
  for (const statement of statements.slice(1, -1)) {
    const node = statement.stmt;
    if (node && ("TransactionStmt" in node || ("VariableSetStmt" in node && !node.VariableSetStmt.is_local))) {
      throw new MigrationError("Nested transaction control or session-level SET is forbidden");
    }
  }
  // Parser offsets are UTF-8 byte positions; do not split on semicolons inside functions.
  const bytes = Buffer.from(source, "utf8");
  const start = (first.stmt_location ?? 0) + (first.stmt_len ?? 0);
  const end = last.stmt_location ?? 0;
  if (bytes[start] !== 59 || end <= start) throw new MigrationError("Invalid transaction boundaries");
  const body = bytes.subarray(start + 1, end).toString("utf8").trim();
  await parse(body);
  return Object.freeze({ id, ordinal: migrationIds.indexOf(id), checksum: createHash("sha256").update(bytes).digest("hex"), body });
}

export async function loadMigrations(directory = new URL("../../migrations/drafts/", import.meta.url)): Promise<readonly Migration[]> {
  const names = readdirSync(directory).sort();
  if (JSON.stringify(names) !== JSON.stringify(migrationIds)) throw new MigrationError("Migration inventory mismatch");
  const result: Migration[] = [];
  for (const id of migrationIds) result.push(await prepareMigration(id, readFileSync(new URL(id, directory), "utf8")));
  return Object.freeze(result);
}

export function planChecksum(plan: readonly Migration[]): string {
  return createHash("sha256").update(JSON.stringify(plan.map(({ id, checksum }) => [id, checksum]))).digest("hex");
}
