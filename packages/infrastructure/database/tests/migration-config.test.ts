import { afterEach, describe, expect, it, vi } from "vitest";
import { X509Certificate } from "node:crypto";
import { rootCertificates, type ConnectionOptions, type PeerCertificate } from "node:tls";
import { Client } from "pg";
import { loadMigrations, planChecksum } from "../src/migrations/manifest";
import { approvedTarget, buildMigrationClientConfig, migrationOptions, parseApplyConfig } from "../src/migrations/config";

export const testEnvironment: NodeJS.ProcessEnv = {
  CONTRATPRO_MIGRATION_ENVIRONMENT: "development",
  CONTRATPRO_MIGRATION_CONNECTION_MODE: "session",
  CONTRATPRO_MIGRATION_TARGET_ID: "synthetic-test-target",
  CONTRATPRO_MIGRATION_DATABASE: "postgres",
  CONTRATPRO_MIGRATION_DATABASE_OID: "12345",
  CONTRATPRO_MIGRATION_LOGIN: "postgres",
  CONTRATPRO_MIGRATION_JOURNAL_OWNER: "postgres",
  CONTRATPRO_MIGRATION_SERVER_ADDRESS: "127.0.0.1",
  CONTRATPRO_MIGRATION_SERVER_PORT: "5432",
  CONTRATPRO_MIGRATION_PLAN_SHA256: "a".repeat(64),
  // Synthetic string for parsing only. It is never passed to a PostgreSQL client.
  CONTRATPRO_MIGRATION_URL: "postgresql://postgres.gllsiklbvqpxzucvkehw:synthetic-password@aws-0-eu-west-1.pooler.supabase.com:5432/postgres",
  CONTRATPRO_MIGRATION_CA_FILE: "offline-test-ca.pem",
};
export const testArguments = ["--apply", "--stage", "bootstrap", "--confirm-target", "synthetic-test-target"];

// Existing Node trust material, not a credential or project certificate; no fixture files are written.
const testCa = rootCertificates.find((pem) => {
  const certificate = new X509Certificate(pem);
  return certificate.ca && Date.parse(certificate.validFrom) <= Date.now() && Date.parse(certificate.validTo) >= Date.now();
})!;
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("fail-closed migration invocation", () => {
  it("validates the complete approved development contract using only synthetic credentials and injected CA", async () => {
    const target = "gllsiklbvqpxzucvkehw";
    const checksum = "981c55ac79a3a8bb975c50b726cd06e950af640dec156c5e2ccf7abbe8ddea01";
    expect(planChecksum(await loadMigrations())).toBe(checksum);
    const config = parseApplyConfig(["--apply", "--stage", "bootstrap", "--confirm-target", target], {
      ...testEnvironment,
      CONTRATPRO_MIGRATION_TARGET_ID: target,
      CONTRATPRO_MIGRATION_DATABASE_OID: "5",
      CONTRATPRO_MIGRATION_SERVER_ADDRESS: "2a05:d018:184f:1e01:cea0:7ef7:7fd2:c39e",
      CONTRATPRO_MIGRATION_PLAN_SHA256: checksum,
    });
    expect(config).toMatchObject({ stage: "bootstrap", login: "postgres", journalOwner: "postgres", targetId: target, planHash: checksum });
    const options = await buildMigrationClientConfig(config, async () => testCa);
    expect(options).toMatchObject({ ...approvedTarget, password: "synthetic-password", sslnegotiation: "postgres" });
    expect(options.ssl).toMatchObject({ rejectUnauthorized: true, minVersion: "TLSv1.2" });
  });
  it.each([
    ["CONNECTION_MODE", "session-pooler", "approved session pooler"],
    ["LOGIN", "postgres.gllsiklbvqpxzucvkehw", "separate administrative/migration login"],
    ["JOURNAL_OWNER", "different_owner", "Bootstrap login must own"],
    ["TARGET_ID", "other-target", "Target confirmation mismatch"],
  ])("rejects the explicit configuration regression %s", (key, value, message) => {
    expect(() => parseApplyConfig(testArguments, { ...testEnvironment, [`CONTRATPRO_MIGRATION_${key}`]: value })).toThrow(message);
  });
  it("accepts only an explicit development apply action and target confirmation", () => {
    const config = parseApplyConfig(testArguments, testEnvironment);
    expect(config.stage).toBe("bootstrap");
    expect(config.databaseOid).toBe(12345);
    expect(Object.isFrozen(config)).toBe(true);
  });
  it.each([[], ["--apply"], [...testArguments, "--force"], ["--apply", "--stage", "foundation", "--confirm-target", "other"]].map((args) => ({ args })))("rejects incomplete or ambiguous actions: $args", ({ args }) => {
    expect(() => parseApplyConfig(args, testEnvironment)).toThrow();
  });
  it("requires every setting and never falls back to DATABASE_URL/PGUSER", () => {
    for (const key of Object.keys(testEnvironment)) {
      const env = { ...testEnvironment };
      delete env[key];
      expect(() => parseApplyConfig(testArguments, env), key).toThrow();
    }
    expect(() => parseApplyConfig(testArguments, { DATABASE_URL: testEnvironment.CONTRATPRO_MIGRATION_URL })).toThrow();
  });
  it.each([
    ["ENVIRONMENT", "production"], ["CONNECTION_MODE", "transaction"], ["LOGIN", "contratpro_runtime"],
    ["LOGIN", "contratpro_migration_owner"], ["LOGIN", "contratpro_platform_runtime"], ["DATABASE_OID", "0"],
    ["SERVER_PORT", "65536"], ["SERVER_ADDRESS", "hostname.invalid"], ["PLAN_SHA256", "invalid"],
    ["URL", "postgresql://u:p@example.invalid/synthetic?sslmode=disable"],
    ["URL", "postgresql://u:p@example.invalid/wrong"], ["URL", "postgresql://example.invalid/synthetic"],
    ["URL", "postgresql://u:p@example.invalid/synthetic"],
  ])("rejects unsafe %s", (key, value) => {
    expect(() => parseApplyConfig(testArguments, { ...testEnvironment, [`CONTRATPRO_MIGRATION_${key}`]: value })).toThrow();
  });
  it("does not include secret URL contents in validation errors", () => {
    expect.assertions(1);
    try { parseApplyConfig(testArguments, { ...testEnvironment, CONTRATPRO_MIGRATION_URL: "secret-do-not-print" }); }
    catch (error) { expect(String(error)).not.toContain("secret-do-not-print"); }
  });

  it.each([
    ["HOST", "other.invalid"], ["HOST", "db.gllsiklbvqpxzucvkehw.supabase.co"],
    ["PORT", "6543"], ["PORT", ""], ["DATABASE", "other"], ["USER", "postgres"],
    ["USER", "postgres.otherproject"], ["QUERY", "?sslmode=no-verify"], ["QUERY", "?sslrootcert=secret"],
    ["QUERY", "?options=-c%20role%3Dsupabase_admin"], ["QUERY", "?"], ["QUERY", "#"],
  ])("rejects alternate endpoint component %s: %s", (component, value) => {
    const url = new URL(testEnvironment.CONTRATPRO_MIGRATION_URL!);
    if (component === "HOST") url.hostname = value;
    if (component === "PORT") url.port = value;
    if (component === "DATABASE") url.pathname = `/${value}`;
    if (component === "USER") url.username = value;
    const candidate = url.toString() + (component === "QUERY" ? value : "");
    expect(() => parseApplyConfig(testArguments, { ...testEnvironment, CONTRATPRO_MIGRATION_URL: candidate })).toThrow();
  });

  it("rejects direct mode, missing CA, and globally disabled TLS", () => {
    expect(() => parseApplyConfig(testArguments, { ...testEnvironment, CONTRATPRO_MIGRATION_CONNECTION_MODE: "direct" })).toThrow();
    expect(() => parseApplyConfig(testArguments, { ...testEnvironment, CONTRATPRO_MIGRATION_CA_FILE: "" })).toThrow();
    expect(() => parseApplyConfig(testArguments, { ...testEnvironment, NODE_TLS_REJECT_UNAUTHORIZED: "0" })).toThrow();
  });

  it("builds verified exact-endpoint TLS configuration with bounded options before driver construction", async () => {
    const readCertificate = vi.fn(async () => testCa);
    const config = parseApplyConfig(testArguments, testEnvironment);
    const client = await buildMigrationClientConfig(config, readCertificate);
    expect(readCertificate).toHaveBeenCalledExactlyOnceWith("offline-test-ca.pem", "utf8");
    expect(client).toMatchObject({ ...approvedTarget, sslnegotiation: "postgres", options: migrationOptions,
      connectionTimeoutMillis: 5000, query_timeout: 70000 });
    expect(client).not.toHaveProperty("connectionString");
    expect(client.ssl).toMatchObject({ ca: testCa, rejectUnauthorized: true, minVersion: "TLSv1.2", servername: approvedTarget.host });
    const tls = client.ssl as ConnectionOptions;
    const certificate = { ...new X509Certificate(testCa).toLegacyObject(), subjectaltname: `DNS:${approvedTarget.host}` } as PeerCertificate;
    expect(tls.checkServerIdentity!(approvedTarget.host, certificate)).toBeUndefined();
    expect(tls.checkServerIdentity!("other.invalid", certificate)).toBeInstanceOf(Error);
    expect(tls.checkServerIdentity!(approvedTarget.host, { ...certificate, subjectaltname: "DNS:other.invalid" })).toBeInstanceOf(Error);
  });

  it.each(["", "not PEM", "-----BEGIN CERTIFICATE-----\ninvalid\n-----END CERTIFICATE-----", `${testCa}\nPRIVATE KEY`,
    `${testCa}\n-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----`, "x".repeat(262145)])(
    "rejects malformed CA input without leaking its contents", async (pem) => {
      const config = parseApplyConfig(testArguments, testEnvironment);
      await expect(buildMigrationClientConfig(config, async () => pem)).rejects.toThrow(
        "Migration CA file is unreadable, invalid, outside validity dates or not CA-capable");
    });

  it("rejects unreadable/missing CA and manually supplied wrong targets before client creation", async () => {
    const config = parseApplyConfig(testArguments, testEnvironment);
    for (const code of ["ENOENT", "EACCES"]) {
      const error = Object.assign(new Error("secret path and password"), { code });
      await expect(buildMigrationClientConfig(config, async () => { throw error; })).rejects.toThrow(
        "Migration CA file is unreadable, invalid, outside validity dates or not CA-capable");
    }
    await expect(buildMigrationClientConfig({ ...config, caFile: "" }, async () => testCa)).rejects.toThrow();
    const readCertificate = vi.fn(async () => testCa);
    await expect(buildMigrationClientConfig({ ...config, url: "postgresql://u:secret@other.invalid:5432/postgres" }, readCertificate)).rejects.toThrow();
    expect(readCertificate).not.toHaveBeenCalled();
  });

  it("rejects certificates outside their validity interval", async () => {
    const config = parseApplyConfig(testArguments, testEnvironment);
    const ca = new X509Certificate(testCa);
    vi.useFakeTimers();
    for (const time of [Date.parse(ca.validFrom) - 1000, Date.parse(ca.validTo) + 1000]) {
      vi.setSystemTime(time);
      await expect(buildMigrationClientConfig(config, async () => testCa)).rejects.toThrow("Migration CA file");
    }
  });

  it("installed pg ignores ambient PGOPTIONS, PGSSLMODE and PGSSLNEGOTIATION when explicitly configured", async () => {
    vi.stubEnv("PGOPTIONS", "-c role=supabase_admin -c search_path=public -c statement_timeout=0");
    vi.stubEnv("PGSSLMODE", "no-verify");
    vi.stubEnv("PGSSLNEGOTIATION", "direct");
    vi.stubEnv("PGHOST", "other.invalid");
    vi.stubEnv("PGPORT", "6543");
    vi.stubEnv("PGUSER", "wrong-user");
    vi.stubEnv("PGDATABASE", "wrong-database");
    const options = await buildMigrationClientConfig(parseApplyConfig(testArguments, testEnvironment), async () => testCa);
    const connect = vi.spyOn(Client.prototype, "connect");
    // Construct only: no connect(), queries or authentication. Inspect actual pg resolution.
    const client = new Client(options);
    const actual = client as unknown as { connectionParameters: { options: string; ssl: ConnectionOptions; sslnegotiation: string } };
    expect(actual.connectionParameters.options).toBe(migrationOptions);
    expect(actual.connectionParameters.options).not.toContain("role=");
    expect(actual.connectionParameters.sslnegotiation).toBe("postgres");
    expect(actual.connectionParameters.ssl.rejectUnauthorized).toBe(true);
    expect(actual.connectionParameters.ssl.ca).toBe(testCa);
    expect(client.host).toBe(approvedTarget.host);
    expect(client.port).toBe(approvedTarget.port);
    expect(client.user).toBe(approvedTarget.user);
    expect(client.database).toBe(approvedTarget.database);
    expect(connect).not.toHaveBeenCalled();
    await client.end();
  });
});
