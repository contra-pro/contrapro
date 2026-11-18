import { isIP } from "node:net";
import { X509Certificate } from "node:crypto";
import { readFile } from "node:fs/promises";
import { checkServerIdentity } from "node:tls";
import type { ClientConfig } from "pg";
import { MigrationError } from "./manifest.ts";

export const approvedTarget = Object.freeze({
  host: "aws-0-eu-west-1.pooler.supabase.com", port: 5432, database: "postgres",
  user: "postgres.gllsiklbvqpxzucvkehw",
});
export const migrationOptions = "-c search_path=pg_catalog -c statement_timeout=60000 -c lock_timeout=5000 -c idle_in_transaction_session_timeout=60000";

export type ApplyConfig = Readonly<{
  stage: "bootstrap" | "foundation";
  url: string;
  targetId: string;
  database: string;
  databaseOid: number;
  login: string;
  journalOwner: string;
  serverAddress: string;
  serverPort: number;
  planHash: string;
  caFile: string;
}>;

export function parseApplyConfig(args: readonly string[], env: NodeJS.ProcessEnv): ApplyConfig {
  const [action, stageFlag, stage, confirmFlag, confirmation] = args;
  if (args.length !== 5 || action !== "--apply" || stageFlag !== "--stage"
    || !["bootstrap", "foundation"].includes(stage ?? "") || confirmFlag !== "--confirm-target") {
    throw new MigrationError("Require --apply --stage bootstrap|foundation --confirm-target TARGET_ID");
  }
  const get = (key: string): string => {
    const value = env[`CONTRATPRO_MIGRATION_${key}`];
    if (!value || value !== value.trim()) throw new MigrationError(`Missing or invalid migration setting: ${key}`);
    return value;
  };
  if (get("ENVIRONMENT") !== "development") throw new MigrationError("Only explicitly approved development targets are supported");
  if (get("CONNECTION_MODE") !== "session") throw new MigrationError("The approved session pooler is required");
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === "0") throw new MigrationError("Insecure global TLS configuration is forbidden");
  const targetId = get("TARGET_ID");
  if (!/^[a-z0-9][a-z0-9_-]{7,63}$/.test(targetId) || confirmation !== targetId) throw new MigrationError("Target confirmation mismatch");
  const database = get("DATABASE");
  if (database !== approvedTarget.database) throw new MigrationError("Approved database mismatch");
  const login = get("LOGIN");
  const journalOwner = get("JOURNAL_OWNER");
  if ([database, login, journalOwner].some((name) => !/^[a-zA-Z_][a-zA-Z0-9_-]{0,62}$/.test(name))
    || ["contratpro_runtime", "contratpro_platform_runtime", "contratpro_migration_owner"].includes(login)) {
    throw new MigrationError("A separate administrative/migration login is required");
  }
  if (stage === "bootstrap" && journalOwner !== login) throw new MigrationError("Bootstrap login must own its new control journal");
  const positive = (key: string, maximum: number) => {
    const value = get(key);
    if (!/^[1-9][0-9]*$/.test(value) || Number(value) > maximum) throw new MigrationError(`Invalid numeric migration setting: ${key}`);
    return Number(value);
  };
  const databaseOid = positive("DATABASE_OID", 4294967295);
  const serverPort = positive("SERVER_PORT", 65535);
  const serverAddress = get("SERVER_ADDRESS");
  const planHash = get("PLAN_SHA256");
  if (!isIP(serverAddress) || !/^[0-9a-f]{64}$/.test(planHash)) throw new MigrationError("Invalid server identity or approved plan checksum");
  const url = get("URL");
  validateTargetUrl(url);
  const caFile = get("CA_FILE");
  if (/[\r\n\0]/u.test(caFile)) throw new MigrationError("Invalid migration CA file setting");
  return Object.freeze({ stage: stage as ApplyConfig["stage"], url, targetId, database, databaseOid, login, journalOwner, serverAddress, serverPort, planHash, caFile });
}

function validateTargetUrl(url: string): URL {
  try {
    const parsed = new URL(url);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol) || parsed.hostname !== approvedTarget.host
      || parsed.port !== String(approvedTarget.port) || decodeURIComponent(parsed.username) !== approvedTarget.user
      || parsed.pathname !== `/${approvedTarget.database}` || !parsed.password
      || parsed.search || parsed.hash || url.includes("?") || url.includes("#")
      || /[\r\n\0]/u.test(url) || /[\r\n\0]/u.test(decodeURIComponent(parsed.password))) throw new Error();
    return parsed;
  } catch { throw new MigrationError("Invalid migration URL; explicit database, credentials and no URL options are required"); }
}

/** No driver loading/client construction here. Injected file reader supports offline tests only. */
export async function buildMigrationClientConfig(
  config: ApplyConfig,
  readCertificate: (path: string, encoding: "utf8") => Promise<string> = readFile,
): Promise<ClientConfig & { sslnegotiation: "postgres" }> {
  const parsed = validateTargetUrl(config.url);
  if (config.database !== approvedTarget.database || !config.caFile) throw new MigrationError("Approved target and CA file are required");
  let ca: string;
  try {
    ca = await readCertificate(config.caFile, "utf8");
    if (Buffer.byteLength(ca, "utf8") > 262144) throw new Error();
    const certificates = ca.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/gu);
    if (!certificates?.length || certificates.length > 16 || ca.replace(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/gu, "").trim() !== "") throw new Error();
    const now = Date.now();
    for (const pem of certificates) {
      const certificate = new X509Certificate(pem);
      const from = Date.parse(certificate.validFrom);
      const until = Date.parse(certificate.validTo);
      if (!certificate.ca || !Number.isFinite(from) || !Number.isFinite(until) || now < from || now > until) throw new Error();
    }
  } catch { throw new MigrationError("Migration CA file is unreadable, invalid, outside validity dates or not CA-capable"); }
  return {
    // Explicit fields avoid connection-string option merging in the driver.
    ...approvedTarget, password: decodeURIComponent(parsed.password),
    sslnegotiation: "postgres",
    ssl: {
      ca, rejectUnauthorized: true, minVersion: "TLSv1.2", servername: approvedTarget.host,
      checkServerIdentity(hostname, certificate) {
        if (hostname !== approvedTarget.host) return new Error("Migration TLS hostname mismatch");
        return checkServerIdentity(approvedTarget.host, certificate);
      },
    },
    // Nonempty explicit value defeats pg's falsy-value PGOPTIONS fallback.
    options: migrationOptions,
    application_name: "contratpro-migration-review-v1",
    connectionTimeoutMillis: 5000,
    query_timeout: 70000,
  };
}
