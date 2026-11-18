import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { TLSSocket } from "node:tls";
import type { ClientConfig } from "pg";
import { buildMigrationClientConfig, parseApplyConfig } from "../src/migrations/config.ts";
import { loadMigrations, planChecksum } from "../src/migrations/manifest.ts";
import { target, validateTarget, type ReadonlyClient } from "../src/verification/bootstrap.ts";
import { discoverAuthority, emptyAuthority, failAuthority, type AuthorityResult, type AuthorityReason } from "../src/verification/authority.ts";

export interface Dependencies {
 loadPlan: typeof loadMigrations;
 buildOptions: typeof buildMigrationClientConfig;
 createClient(options: ClientConfig): Promise<ReadonlyClient>;
}
async function createClient(options: ClientConfig): Promise<ReadonlyClient> {
 const { Client } = await import("pg");
 const client = new Client({ ...options, application_name: "contratpro-authority-readonly-v1",
  options: "-c search_path=pg_catalog -c default_transaction_read_only=on -c statement_timeout=5000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=10000",
  query_timeout: 7000 });
 const socket = () => (client as unknown as { connection: { stream: TLSSocket } }).connection.stream;
 return {
  async connect() { await client.connect(); },
  async query(sql) { const r = await client.query(sql); return { rows: r.rows as Record<string,unknown>[], command: r.command }; },
  async end() {
   let timer: ReturnType<typeof setTimeout> | undefined;
   try { await Promise.race([client.end(), new Promise<never>((_,reject) => {
    timer = setTimeout(() => { try { socket().destroy(); } catch { /* Never expose raw errors. */ } reject(new Error()); },5000);
   })]); } finally { if (timer) clearTimeout(timer); }
  },
  tlsVerified: () => socket().encrypted === true && socket().authorized === true
   && ["TLSv1.2","TLSv1.3"].includes(socket().getProtocol() ?? ""),
  onError: handler => { client.on("error",handler); },
 };
}
export async function main(args: readonly string[], env: NodeJS.ProcessEnv,
 injected: Partial<Dependencies> = {}, result: AuthorityResult = emptyAuthority()): Promise<AuthorityResult> {
 let stage: "CLI_ARGUMENTS" | "CONFIGURATION" | "MANIFEST" | "CA_VALIDATION" | "DRIVER_INITIALIZATION" = "CLI_ARGUMENTS";
 let reason: AuthorityReason = "INVALID_ARGUMENTS";
 try {
  if (args.length !== 2 || args[0] !== "--discover-authority" || args[1] !== target.id) throw new Error();
  stage = "CONFIGURATION"; reason = "CONFIGURATION_REJECTED";
  const config = parseApplyConfig(["--apply","--stage","bootstrap","--confirm-target",target.id],env);
  validateTarget(config);
  stage = "MANIFEST"; reason = "MANIFEST_REJECTED";
  const plan = await (injected.loadPlan ?? loadMigrations)();
  if (planChecksum(plan) !== target.plan || plan[0]?.checksum !== target.bootstrap) throw new Error();
  stage = "CA_VALIDATION"; reason = "CA_REJECTED";
  const options = await (injected.buildOptions ?? buildMigrationClientConfig)(config);
  stage = "DRIVER_INITIALIZATION"; reason = "DRIVER_INITIALIZATION_FAILED";
  const client = await (injected.createClient ?? createClient)(options);
  return await discoverAuthority(client,config,result);
 } catch { failAuthority(result,stage,reason); return result; }
}
export async function entrypoint(args: readonly string[], env: NodeJS.ProcessEnv, injected: Partial<Dependencies> = {}): Promise<number> {
 const result = emptyAuthority();
 try {
  await main(args,env,injected,result);
  console.log(JSON.stringify(result));
  return result.FINAL_VERDICT === "PASS" ? 0 : 1;
 } catch {
  // Preserve collected facts; output errors never justify claiming no contact.
  failAuthority(result,"OUTPUT","OPERATION_FAILED");
  try { console.error(JSON.stringify(result)); } catch { /* Exit nonzero without raw exception. */ }
  return 1;
 }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
 void entrypoint(process.argv.slice(2),process.env).then(code => { process.exitCode = code; });
}
