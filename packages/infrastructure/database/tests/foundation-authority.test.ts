import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "libpg-query";
import { loadMigrations, planChecksum } from "../src/migrations/manifest";

const draft = readFileSync(new URL("../provisioning/foundation-authority.sql", import.meta.url), "utf8");
const document = readFileSync(new URL("../provisioning/README.md", import.meta.url), "utf8");

describe("offline foundation authority draft, never execution", () => {
  it("parses the PostgreSQL membership options and contains only the two reviewed grants", async () => {
    const tree = await parse(draft);
    const statements = tree.stmts ?? [];
    expect(statements).toHaveLength(8);
    expect(statements.map(s => Object.keys(s.stmt ?? {})[0])).toEqual([
      "TransactionStmt", "VariableSetStmt", "VariableSetStmt", "VariableSetStmt", "VariableSetStmt",
      "GrantStmt", "GrantRoleStmt", "TransactionStmt",
    ]);
    const commands = draft.replace(/--[^\n]*/g, "").split(";").map(s => s.trim()).filter(Boolean);
    expect(commands).toEqual([
      "BEGIN",
      "SET LOCAL statement_timeout = '5000ms'",
      "SET LOCAL lock_timeout = '2000ms'",
      "SET LOCAL idle_in_transaction_session_timeout = '10000ms'",
      "SET LOCAL search_path = pg_catalog",
      "GRANT CREATE ON DATABASE postgres TO contratpro_migration_owner",
      "GRANT contratpro_migration_owner TO postgres\n  WITH ADMIN FALSE, INHERIT FALSE, SET TRUE GRANTED BY postgres",
      "COMMIT",
    ]);
  });

  it("keeps provisioning outside the frozen migration inventory and checksum", async () => {
    const plan = await loadMigrations();
    expect(plan.map(m => m.id)).toEqual(["0000_roles.sql", "0001_schema.sql", "0002_context.sql", "0003_rls_grants.sql"]);
    expect(planChecksum(plan)).toBe("981c55ac79a3a8bb975c50b726cd06e950af640dec156c5e2ccf7abbe8ddea01");
  });

  it("parses every documented verification statement as SELECT only", async () => {
    const block = document.match(/```sql\n([\s\S]*?)```/);
    expect(block).not.toBeNull();
    const tree = await parse(block![1]!);
    expect(tree.stmts).toHaveLength(9);
    for (const statement of tree.stmts ?? []) expect(Object.keys(statement.stmt ?? {})).toEqual(["SelectStmt"]);
  });

  it("documents withheld commit, exact deltas, provider limitations and no retries", () => {
    expect(document).toContain("withhold COMMIT");
    expect(document).toContain("Exactly four membership rows");
    expect(document).toContain("ADMIN false, INHERIT false, SET true");
    expect(document).toContain("No automatic retry");
    expect(document).toContain("bootstrap-only verifier intentionally rejects");
    expect(document).toContain("not an authorization to");
    expect(document).toContain("only\nlive permission checks/execution");
    expect(draft).not.toMatch(/WITH GRANT OPTION|ALTER ROLE|CREATE ROLE|REVOKE|INSERT INTO|SET ROLE/i);
  });
});
