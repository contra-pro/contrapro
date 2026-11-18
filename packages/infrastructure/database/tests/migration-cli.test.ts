import { expect, it, vi } from "vitest";
import { loadMigrations, planChecksum } from "../src/migrations/manifest";

const driverLoaded = vi.hoisted(() => vi.fn());
vi.mock("pg", () => { driverLoaded(); throw new Error("Database driver must not load on import"); });
vi.mock("node:fs/promises", () => ({ readFile: vi.fn(async () => { throw new Error("synthetic private file detail"); }) }));

it("imports the migration CLI without loading the PostgreSQL driver or applying anything", async () => {
  const cli = await import("../scripts/migrate");
  expect(typeof cli.main).toBe("function");
  expect(driverLoaded).not.toHaveBeenCalled();
});

it("rejects unavailable CA before loading any driver or constructing a client", async () => {
  const cli = await import("../scripts/migrate");
  const plan = await loadMigrations(); // Offline SQL parsing only, no database execution.
  await expect(cli.main(["--apply", "--stage", "bootstrap", "--confirm-target", "offline-test-target"], {
    CONTRATPRO_MIGRATION_ENVIRONMENT: "development", CONTRATPRO_MIGRATION_CONNECTION_MODE: "session",
    CONTRATPRO_MIGRATION_TARGET_ID: "offline-test-target", CONTRATPRO_MIGRATION_DATABASE: "postgres",
    CONTRATPRO_MIGRATION_DATABASE_OID: "5", CONTRATPRO_MIGRATION_LOGIN: "postgres",
    CONTRATPRO_MIGRATION_JOURNAL_OWNER: "postgres", CONTRATPRO_MIGRATION_SERVER_ADDRESS: "127.0.0.1",
    CONTRATPRO_MIGRATION_SERVER_PORT: "5432", CONTRATPRO_MIGRATION_PLAN_SHA256: planChecksum(plan),
    CONTRATPRO_MIGRATION_CA_FILE: "synthetic-unavailable-ca.pem",
    CONTRATPRO_MIGRATION_URL: "postgresql://postgres.gllsiklbvqpxzucvkehw:synthetic-only@aws-0-eu-west-1.pooler.supabase.com:5432/postgres",
  })).rejects.toThrow("Migration CA file is unreadable, invalid, outside validity dates or not CA-capable");
  expect(driverLoaded).not.toHaveBeenCalled();
});
