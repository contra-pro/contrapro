import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { TLSSocket } from "node:tls";
import type { ClientConfig } from "pg";
import { buildMigrationClientConfig, parseApplyConfig } from "../src/migrations/config.ts";
import { loadMigrations, planChecksum, type Migration } from "../src/migrations/manifest.ts";
import { emptyResult, recordFailure, target, validateTarget, verifyBootstrap,
  type ReadonlyClient, type Result, type Stage, type Reason } from "../src/verification/bootstrap.ts";

// Dependency injection is an offline test seam; CLI arguments cannot select implementations.
export interface Dependencies {
  loadPlan(): Promise<readonly Migration[]>;
  buildOptions: typeof buildMigrationClientConfig;
  createClient(options: ClientConfig): Promise<ReadonlyClient>;
}
async function createClient(options: ClientConfig): Promise<ReadonlyClient> {
    const { Client } = await import("pg");
    const client = new Client({
      ...options,
      application_name: "contratpro-bootstrap-readonly-v1",
      options: "-c search_path=pg_catalog -c default_transaction_read_only=on -c statement_timeout=5000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=10000",
      query_timeout: 7000,
    });
    // pg's connection socket is inspected only for fixed TLS booleans/protocol, never logged.
    const socket = () => (client as unknown as { connection: { stream: TLSSocket } }).connection.stream;
    return {
      async connect() { await client.connect(); },
      async query(sql) {
        const reply = await client.query(sql);
        return { rows: reply.rows as Record<string, unknown>[], command: reply.command };
      },
      async end() {
        // A bounded cleanup failure must prevent PASS.
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([client.end(), new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              try { socket().destroy(); } catch { /* Cleanup is unconfirmed; never emit raw errors. */ }
              reject(new Error("Cleanup timeout"));
            }, 5000);
          })]);
        } finally { if (timer) clearTimeout(timer); }
      },
      tlsVerified: () => socket().encrypted === true && socket().authorized === true
        && ["TLSv1.2", "TLSv1.3"].includes(socket().getProtocol() ?? ""),
      onError: handler => { client.on("error", handler); },
    };

}
export type RunProgress = { result?: Result; phase?: "EXECUTION" | "OUTPUT" };
export async function main(args: readonly string[], env: NodeJS.ProcessEnv, injected: Partial<Dependencies> = {}, progress: RunProgress = {}): Promise<Result> {
  const result = emptyResult();
  progress.result = result;
  let stage: Stage = "CLI_ARGUMENTS";
  let reason: Reason = "INVALID_ARGUMENTS";
  const enter = (next: Stage, fallback: Reason) => { stage = next; reason = fallback; };
  const complete = () => { result.DIAGNOSTIC.lastCompletedStage = stage; };
  try {
    if (args.length !== 2 || args[0] !== "--verify-bootstrap" || args[1] !== target.id) throw new Error();
    complete();
    enter("CONFIGURATION", "CONFIGURATION_REJECTED");
    const config = parseApplyConfig(["--apply", "--stage", "bootstrap", "--confirm-target", target.id], env);
    validateTarget(config);
    complete();
    enter("MANIFEST", "MANIFEST_REJECTED");
    const plan = await (injected.loadPlan ?? loadMigrations)();
    if (planChecksum(plan) !== target.plan || plan[0]?.checksum !== target.bootstrap) throw new Error();
    complete();
    enter("CA_VALIDATION", "CA_REJECTED");
    const options = await (injected.buildOptions ?? buildMigrationClientConfig)(config);
    complete();
    enter("DRIVER_INITIALIZATION", "DRIVER_INITIALIZATION_FAILED");
    const client = await (injected.createClient ?? createClient)(options);
    complete();
    return await verifyBootstrap(client, config, result);
  } catch {
    recordFailure(result, stage, reason);
    return result;
  }
}
export async function run(args: readonly string[], env: NodeJS.ProcessEnv, injected: Partial<Dependencies> = {}, progress: RunProgress = {}): Promise<number> {
  progress.phase = "EXECUTION";
  const result = await main(args, env, injected, progress);
  progress.result = result;
  progress.phase = "OUTPUT";
  console.log(JSON.stringify(result));
  return result.FINAL_VERDICT === "PASS" ? 0 : 1;
}
/** Outermost boundary: retains available facts; absent progress is never evidence of no contact. */
export async function entrypoint(args: readonly string[], env: NodeJS.ProcessEnv,
  injected: Partial<Dependencies> = {}, runner: typeof run = run): Promise<number> {
  const progress: RunProgress = {};
  try { return await runner(args, env, injected, progress); }
  catch {
    const result = progress.result ?? emptyResult();
    if (!progress.result) {
      result.DIAGNOSTIC.databaseContact = "UNKNOWN";
      result.DIAGNOSTIC.readOnlyTransaction = "UNKNOWN";
      result.DIAGNOSTIC.rollback = "UNKNOWN";
      result.DIAGNOSTIC.clientCleanup = "UNKNOWN";
    }
    recordFailure(result, progress.phase === "OUTPUT" ? "OUTPUT" : "CLI_RUNTIME",
      progress.phase === "OUTPUT" ? "OUTPUT_FAILED" : "UNEXPECTED_EXECUTION_FAILURE");
    if (result.FINAL_VERDICT !== "FAIL") result.FINAL_VERDICT = "INDETERMINATE";
    // A broken serializer or output stream must not expose an exception through an unhandled rejection.
    try { console.error(JSON.stringify(result)); } catch { /* Exit nonzero when even safe reporting is unavailable. */ }
    return 1;
  }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  void entrypoint(process.argv.slice(2), process.env).then(code => { process.exitCode = code; });
}
