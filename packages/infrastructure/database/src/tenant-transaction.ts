import "server-only";
import { sql, type ExtractTablesWithRelations } from "drizzle-orm";
import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";
import type * as schema from "./schema";

export type TenantTransaction = NodePgTransaction<typeof schema, ExtractTablesWithRelations<typeof schema>>;
export type TenantContext = Readonly<{ userId: string; agencyId: string }>;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Future SERVER callers must authenticate userId and authorize agency selection first.
 * This helper does not authenticate anyone. Never construct context from browser claims.
 * Approved boundary: trusted backend SQL executors only. GUCs are not identity proofs;
 * compromised runtime credentials/arbitrary SQL can forge this context. No raw-SQL UI/API.
 * Accept an injected Drizzle database; this module creates no client or connection.
 */
export async function withTenantTransaction<T>(
  db: NodePgDatabase<typeof schema>,
  context: TenantContext,
  work: (tx: TenantTransaction) => Promise<T>,
): Promise<T> {
  if (!uuidPattern.test(context.userId) || !uuidPattern.test(context.agencyId)) {
    throw new Error("Invalid tenant context");
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('contratpro.user_id', ${context.userId}, true), set_config('contratpro.agency_id', ${context.agencyId}, true)`);
    const access = await tx.execute<{ allowed: boolean }>(sql`select app_private.tenant_is_active() as allowed`);
    if (access.rows[0]?.allowed !== true) throw new Error("Tenant context rejected");
    return work(tx);
  });
}
