import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "../src/schema";

// Next's server-only poison module is intentionally mocked only in these Node tests.
vi.mock("server-only", () => ({}));
import { withTenantTransaction } from "../src/tenant-transaction";

const context = {
  userId: "10000000-0000-4000-8000-000000000001",
  agencyId: "20000000-0000-4000-8000-000000000002",
};

function databaseDouble(result: { allowed: unknown } = { allowed: true }) {
  const queries: SQL[] = [];
  const execute = vi.fn(async (query: SQL) => {
    queries.push(query);
    return { rows: queries.length === 1 ? [] : [result] };
  });
  const transaction = vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work({ execute }));
  return { db: { transaction } as unknown as NodePgDatabase<typeof schema>, queries, transaction };
}

describe("tenant transaction boundary — offline doubles, not PostgreSQL proof", () => {
  it("does not authenticate otherwise valid IDs; server authentication must precede this helper", async () => {
    const { db, queries } = databaseDouble();
    const supplied = { ...context, userId: "30000000-0000-4000-8000-000000000003" };
    await expect(withTenantTransaction(db, supplied, async () => "trusted caller's work")).resolves.toBe("trusted caller's work");
    expect(new PgDialect().sqlToQuery(queries[0]!).params[0]).toBe(supplied.userId);
    // A true access result from a double is not session validation or a SQL-impersonation defense.
  });
  it("rejects malformed identifiers before opening a transaction", async () => {
    const { db, transaction } = databaseDouble();
    for (const agencyId of ["", "not-a-uuid", "x'; set role postgres; --"]) {
      await expect(withTenantTransaction(db, { ...context, agencyId }, async () => "bad"))
        .rejects.toThrow("Invalid tenant context");
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it("binds context as parameters with transaction-local lifetime before work", async () => {
    const { db, queries } = databaseDouble();
    const result = await withTenantTransaction(db, context, async () => {
      expect(queries).toHaveLength(2);
      return "completed";
    });
    expect(result).toBe("completed");
    const query = new PgDialect().sqlToQuery(queries[0]!);
    expect(query.params).toEqual([context.userId, context.agencyId]);
    expect(query.sql).not.toContain(context.userId);
    expect(query.sql).toMatch(/set_config\('contratpro\.user_id', \$1, true\)/);
    expect(query.sql).toMatch(/set_config\('contratpro\.agency_id', \$2, true\)/);
    expect(new PgDialect().sqlToQuery(queries[1]!).sql).toContain("app_private.tenant_is_active()");
  });

  it.each([false, null, undefined, "true", 1])("never invokes work when access result is %s", async (allowed) => {
    const { db } = databaseDouble({ allowed });
    const work = vi.fn(async () => "must not run");
    await expect(withTenantTransaction(db, context, work)).rejects.toThrow("Tenant context rejected");
    expect(work).not.toHaveBeenCalled();
  });

  it("propagates failures to Drizzle instead of swallowing them or reporting success", async () => {
    const { db } = databaseDouble();
    const failure = new Error("work failed");
    await expect(withTenantTransaction(db, context, async () => { throw failure; })).rejects.toBe(failure);
  });
});
