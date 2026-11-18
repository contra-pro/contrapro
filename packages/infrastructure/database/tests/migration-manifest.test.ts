import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { loadMigrations, migrationIds, planChecksum, prepareMigration } from "../src/migrations/manifest";

describe("offline migration manifest", () => {
  it("loads exactly the reviewed order and removes only parsed outer transactions", async () => {
    const plan = await loadMigrations();
    expect(plan.map((migration) => migration.id)).toEqual([...migrationIds]);
    expect(plan.map((migration) => migration.ordinal)).toEqual([0, 1, 2, 3]);
    expect(plan[2]!.body).toContain("BEGIN\n"); // PL/pgSQL body survives.
    expect(plan[1]!.body).toContain("SET LOCAL ROLE contratpro_migration_owner");
  });

  it("hashes raw canonical bytes and preserves Unicode and quoted semicolons", async () => {
    const source = "-- العربية\nBEGIN; SELECT 'a;b'; COMMIT;\n";
    const migration = await prepareMigration(migrationIds[0], source);
    expect(migration.body).toBe("SELECT 'a;b';");
    expect(migration.checksum).toBe(createHash("sha256").update(source).digest("hex"));
    expect((await prepareMigration(migrationIds[0], source + "\n")).checksum).not.toBe(migration.checksum);
    expect(planChecksum([migration])).toBe(planChecksum([migration]));
    expect(planChecksum([migration])).not.toBe(planChecksum([{ ...migration, checksum: "0".repeat(64) }]));
  });

  it.each([
    "SELECT 1;", "BEGIN; COMMIT;", "BEGIN; SELECT 1; ROLLBACK;",
    "BEGIN; SELECT 1; COMMIT; SELECT 2;", "BEGIN; COMMIT; BEGIN; SELECT 1; COMMIT;",
    "BEGIN; SET ROLE postgres; COMMIT;", "BEGIN; SELECT 1; COMMIT;\r\n",
    "BEGIN; SAVEPOINT x; SELECT 1; COMMIT;", "BEGIN; SELECT 1; COMMIT AND CHAIN;",
  ])("rejects unsafe transaction ownership: %s", async (source) => {
    await expect(prepareMigration(migrationIds[0], source)).rejects.toThrow();
  });
});
