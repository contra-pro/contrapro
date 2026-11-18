import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildMigrationClientConfig, parseApplyConfig } from "../src/migrations/config.ts";
import { loadMigrations, MigrationError, planChecksum } from "../src/migrations/manifest.ts";
import { runMigrations } from "../src/migrations/runner.ts";

export async function main(args: readonly string[], env: NodeJS.ProcessEnv): Promise<void> {
  const config = parseApplyConfig(args, env);
  const plan = await loadMigrations();
  if (planChecksum(plan) !== config.planHash) throw new MigrationError("Approved plan checksum mismatch");
  const clientConfig = await buildMigrationClientConfig(config);
  // Driver loading and client creation happen only after deliberate action/config/plan checks.
  const { Client } = await import("pg");
  const client = new Client(clientConfig);
  try {
    await client.connect();
    const applied = await runMigrations({
      async query(text, values) {
        const reply = await client.query(text, values ? [...values] : undefined);
        const last = Array.isArray(reply) ? reply.at(-1) : reply;
        return { rows: last?.rows ?? [], command: last?.command ?? "" };
      },
    }, config, plan);
    console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Approved migration history already complete for this stage");
  } finally { await client.end(); }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2), process.env).catch((error: unknown) => {
    // PostgreSQL/driver errors may include sensitive details. Never print raw errors or URLs.
    console.error(error instanceof MigrationError ? error.message : "Migration failed; investigate restricted logs and journal before retrying");
    process.exitCode = 1;
  });
}
