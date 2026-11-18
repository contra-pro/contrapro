import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parse } from "pgsql-parser";
import { parsePlPgSQL } from "libpg-query";
import { nodes } from "./sql-helpers";
import { validateClient, emptyClient, type ClientInput } from "../../../application/src/clients";
const sql = readFileSync(new URL("../../../../supabase/migration-drafts/20261118000900_client_creation_idempotency.sql", import.meta.url), "utf8");
const base = { ...emptyClient, firstName: "Amina", lastName: "Atlas", phone: "+212612345678" };
describe("client original-creation SQL — static validation, never database execution", () => {
  it("parses all SQL and procedural bodies and preserves the deployed 0006 hash", async () => {
    expect(await parse(sql)).toBeDefined(); expect(await parsePlPgSQL(sql)).toBeDefined();
    const original = readFileSync(new URL("../../../../supabase/migrations/20261115000600_clients.sql", import.meta.url));
    expect(createHash("sha256").update(original).digest("hex")).toBe("4713123741c3b606f5bd8f50c8948004469f5df18ee1da116f2a183a797f5a53");
  });
  it("stores only a protected immutable digest, not a client-column hash or PII duplicate", async () => {
    expect(nodes(await parse(sql), "CreateStmt")).toHaveLength(1);
    expect(sql).toContain("CREATE TABLE app_private.client_creation_receipts"); expect(sql).toContain("FORCE ROW LEVEL SECURITY");
    expect(sql).toContain("original_digest bytea"); expect(sql).toContain("octet_length(original_digest)=32");
    expect(sql).toContain("GRANT SELECT,INSERT ON app_private.client_creation_receipts TO contratpro_client_receipt_writer");
    expect(sql).not.toMatch(/GRANT (?:SELECT|INSERT|UPDATE)[^;]*ON tenancy\.clients/i);
    expect(sql).not.toMatch(/UPDATE app_private\.client_creation_receipts|DELETE FROM app_private\.client_creation_receipts|ADD COLUMN|hmac\(/i);
  });
  it("uses a dedicated NOBYPASSRLS non-owner for only two fixed definer capabilities", () => {
    expect(sql.match(/SECURITY DEFINER/g)).toHaveLength(2); expect(sql).toContain("NOINHERIT NOREPLICATION NOBYPASSRLS");
    for (const name of ["capture_client_creation()", "match_client_creation(uuid,uuid,jsonb)"]) expect(sql).toContain(`ALTER FUNCTION app_private.${name} OWNER TO contratpro_client_receipt_writer`);
    expect(sql).toContain("SET row_security=on"); expect(sql).not.toMatch(/SECURITY DEFINER[\s\S]*EXECUTE\s+(?:format\(|')/i);
    expect(sql).toContain("REVOKE CREATE ON SCHEMA app_private FROM contratpro_client_receipt_writer");
    expect(sql).toContain("REVOKE contratpro_client_receipt_writer FROM postgres GRANTED BY postgres");
    expect(sql).toContain("pg_catalog.has_column_privilege");
    expect(sql.indexOf("CREATE TRIGGER clients_capture_creation")).toBeLessThan(sql.indexOf("ALTER FUNCTION app_private.capture_client_creation() OWNER"));
  });
  it("binds receipt policy to canonical creator and read/create permissions; no grants to ordinary readers", () => {
    expect(sql).toContain("creator_user_id=app_private.canonical_auth_user() AND app_private.client_allowed(agency_id,'clients.read') AND app_private.client_allowed(agency_id,'clients.create')");
    expect(sql).not.toMatch(/GRANT[^;]+ON app_private\.client_creation_receipts TO authenticated/i);
    expect(sql).toContain("receipt_permission_read"); expect(sql).toContain("mr.agency_id=tenancy.role_permissions.agency_id");
  });
  it("grants matcher access before ownership transfer and requires the effective grant after revocation", () => {
    const grant = "GRANT EXECUTE ON FUNCTION app_private.match_client_creation(uuid,uuid,jsonb) TO authenticated;";
    const transfer = "ALTER FUNCTION app_private.match_client_creation(uuid,uuid,jsonb) OWNER TO contratpro_client_receipt_writer;";
    const required = "pg_catalog.has_function_privilege('authenticated','app_private.match_client_creation(uuid,uuid,jsonb)','EXECUTE') IS DISTINCT FROM true";
    expect(sql.split(grant)).toHaveLength(2); expect(sql.split(transfer)).toHaveLength(2);
    expect(sql.indexOf(grant)).toBeLessThan(sql.indexOf(transfer));
    expect(sql).toContain(required);
    expect(sql.indexOf(required)).toBeGreaterThan(sql.indexOf("REVOKE contratpro_client_receipt_writer FROM postgres GRANTED BY postgres"));
    expect(sql).not.toMatch(/GRANT[^;]*(?:capture_client_creation|client_creation_receipts)[^;]*TO authenticated/i);
    expect(sql).not.toMatch(/GRANT[^;]*match_client_creation[^;]*TO (?:PUBLIC|anon|service_role)|WITH GRANT OPTION/i);
  });
  it("hardens every privileged helper path, fails closed on settings and prepares hostile temporary domains", () => {
    expect(sql.match(/SET search_path\s*=\s*pg_catalog(?!\s*,\s*pg_temp)/g)).toBeNull();
    for (const signature of ["canonical_auth_user()", "agency_owner(uuid)", "client_allowed(uuid,text)", "client_payload(tenancy.clients)", "client_guard()"])
      expect(sql).toContain(`ALTER FUNCTION app_private.${signature} SET search_path=pg_catalog,pg_temp`);
    expect(sql).toContain("'auth.uid()'::pg_catalog.regprocedure");
    expect(sql).toContain("IS DISTINCT FROM true");
    expect(sql).toContain("DECLARE cid pg_catalog.uuid");
    expect(sql).toContain("DECLARE result pg_catalog.jsonb");
    expect(sql).not.toContain("pg_catalog.boolean");
  });
  it("bounds raw processing before character scans and pins one Unicode profile", () => {
    const normalizer = sql.split("CREATE FUNCTION app_private.normalize_client_creation")[1]!.split("REVOKE ALL ON FUNCTION app_private.normalize_client_creation")[0]!;
    expect(normalizer.indexOf("pg_catalog.pg_column_size(p)>32768")).toBeLessThan(normalizer.indexOf("pg_catalog.jsonb_each(p)"));
    expect(normalizer.indexOf("pg_catalog.octet_length(v)>8192")).toBeLessThan(normalizer.indexOf("pg_catalog.btrim(v,trim_chars)"));
    expect(normalizer.indexOf("pg_catalog.length(v)>limits[i]")).toBeLessThan(normalizer.indexOf("pg_catalog.generate_series"));
    expect(normalizer).not.toMatch(/\b(?:lower|upper)\(/);
    expect(normalizer).toContain('COLLATE pg_catalog."C"');
    expect(sql).toContain("THEN RAISE EXCEPTION 'Receipt metadata RLS boundary mismatch'");
    const profile = readFileSync(new URL("../../../application/src/client-unicode-data.ts", import.meta.url), "utf8");
    const hash = /clientUnicodeProfileSha256 = "([a-f0-9]{64})"/.exec(profile)![1]!;
    expect(sql).toContain(`profile SHA256 ${hash}`);
    expect(sql).toContain("'details',app_private.normalize_client_creation(p_normalized)");
  });
  it("uses a Clients-specific advisory namespace without changing Vehicles", () => {
    expect(sql).toContain("hashtextextended('contratpro.client-create.v1:'||p_agency_id::pg_catalog.text||':'||p_key::pg_catalog.text,0)");
    expect(sql).not.toMatch(/ALTER FUNCTION[^;]*vehicle|CREATE OR REPLACE FUNCTION[^;]*vehicle/i);
  });
  it("captures all inserts atomically, never backfills from mutable legacy rows", () => {
    expect(sql).toContain("t.tgname='clients_guard' AND t.tgtype=23 AND t.tgenabled='O'");
    expect(sql).toContain("AFTER INSERT ON tenancy.clients"); expect(sql).toContain("TG_WHEN<>'AFTER'");
    expect(sql).toContain("app_private.normalize_client_creation(app_private.client_payload(NEW))");
    expect(sql).not.toMatch(/INSERT INTO app_private\.client_creation_receipts[^;]*SELECT|UPDATE tenancy\.clients/i);
    expect(sql).toContain("matched IS DISTINCT FROM true"); expect(sql).not.toContain("client_payload(existing)");
  });
  it("serializes agency/key before comparison with a fresh volatile snapshot, and never returns archived/foreign creator IDs", () => {
    const rpc = sql.split("CREATE OR REPLACE FUNCTION public.contratpro_client_create")[1]!.split("REVOKE ALL ON FUNCTION public.contratpro_client_create")[0]!;
    expect(rpc.indexOf("pg_advisory_xact_lock")).toBeLessThan(rpc.indexOf("matched:=app_private.match_client_creation"));
    expect(sql).toContain("LANGUAGE sql VOLATILE SECURITY DEFINER"); expect(rpc).toContain("state='active'");
    expect(rpc).toContain("row_creator IS DISTINCT FROM creator"); expect(rpc).toContain("USING ERRCODE='40001'"); expect(rpc).toContain("USING ERRCODE='P0002'");
    expect(rpc.replace(/--[^\n]*/g, "")).not.toContain("FOR UPDATE");
  });
  it("has no explicit transaction splits or nontransactional migration statements", async () => {
    expect(nodes(await parse(sql), "TransactionStmt")).toHaveLength(0);
    expect(sql).not.toMatch(/transaction\s*=\s*false|CREATE INDEX CONCURRENTLY|\bVACUUM\b|ALTER SYSTEM/i);
    expect(sql).toContain("public.contratpro_client_creation_contract()"); expect(sql).toContain("SELECT 2 $f$");
  });
  it("prepares a bounded rollback-only single-session acceptance script without executing it", async () => {
    const source = readFileSync(new URL("../../../../scripts/test-client-idempotency-postgres.sql", import.meta.url), "utf8");
    expect(source).toContain("\\set ON_ERROR_STOP on"); expect(source).toContain("ROLLBACK;"); expect(source).not.toMatch(/\bCOMMIT\b|CREATE ROLE|DELETE FROM/i);
    expect(source).toContain("CREATE DOMAIN pg_temp.uuid");
    expect(source).toContain("CREATE DOMAIN pg_temp.date");
    const prepared = source.replace(/^\\.*$/gm, "").replace(/:'(?:subject_a|subject_b|agency_a|agency_b)'/g, "'10000000-0000-4000-8000-000000000001'")
      .replace(/:'database_oid'/g, "'5'").replace(/:'server_address'/g, "'127.0.0.1'").replace(/:'server_port'/g, "'5432'");
    expect(await parse(prepared)).toBeDefined(); expect(await parsePlPgSQL(prepared)).toBeDefined();
  });
  it("explicitly selects and independently asserts READ COMMITTED before acceptance mutations", async () => {
    const source = readFileSync(new URL("../../../../scripts/test-client-idempotency-postgres.sql", import.meta.url), "utf8");
    const begin = /^BEGIN ISOLATION LEVEL READ COMMITTED;$/m.exec(source);
    expect(begin).not.toBeNull();
    const transaction = nodes(await parse(begin![0]), "TransactionStmt")[0]!;
    expect(transaction.kind).toBe("TRANS_STMT_BEGIN");
    expect(nodes(transaction, "DefElem")).toContainEqual(expect.objectContaining({
      defname: "transaction_isolation", arg: expect.objectContaining({ A_Const: expect.objectContaining({ sval: { sval: "read committed" } }) }),
    }));
    const assertion = "pg_catalog.current_setting('transaction_isolation') IS DISTINCT FROM 'read committed'";
    expect(source).toContain(assertion);
    expect(source.indexOf(assertion)).toBeLessThan(source.indexOf("CREATE DOMAIN pg_temp.uuid"));
    expect(source.indexOf(assertion)).toBeLessThan(source.indexOf("SET LOCAL ROLE authenticated"));
    expect(source).toContain("THEN RAISE EXCEPTION 'Acceptance prerequisites unavailable'");
  });
});

describe("0009 deployment preparation — local catalog-script and artifact checks only", () => {
  const inventory = readFileSync(new URL("../../../../scripts/preflight-client-idempotency-0009.sql", import.meta.url), "utf8");
  it("parses the inventory and permits only read-only transactions, settings and catalog SELECTs", async () => {
    // psql gset terminates its preceding query; conditional failure branches are
    // parsed here, never executed. Synthetic substitutions are parser input only.
    const prepared = inventory.replace(/^\\gset\s*$/gm, ";").replace(/^\\.*$/gm, "")
      .replace(/:'project_ref'/g, "'gllsiklbvqpxzucvkehw'").replace(/:'database_oid'/g, "'5'")
      .replace(/:'server_address'/g, "'192.0.2.1'").replace(/:'server_port'/g, "'5432'")
      .replace(/:'(?:target_evidence_ref|tls_evidence_ref)'/g, "'synthetic-reference'");
    const ast = await parse(prepared);
    if (!ast.stmts?.length) throw new Error("Expected inventory statements");
    for (const statement of ast.stmts) expect(["TransactionStmt", "VariableSetStmt", "SelectStmt"]).toContain(Object.keys(statement.stmt!)[0]);
    const readers = new Set(["aclexplode", "acldefault", "array_agg", "bool_and", "bool_or", "count", "current_database", "current_setting",
      "has_column_privilege", "has_function_privilege", "has_language_privilege", "has_schema_privilege", "has_table_privilege",
      "inet_server_addr", "inet_server_port", "octet_length", "pg_get_constraintdef", "pg_get_functiondef", "pg_get_triggerdef",
      "pg_get_userbyid", "pg_is_in_recovery", "to_regclass", "to_regprocedure", "pg_get_expr", "cardinality", "unnest", "array_position", "array_ndims", "split_part"]);
    for (const call of nodes(ast, "FuncCall")) {
      const names = nodes(call.funcname, "String").map(x => String(x.sval));
      expect(names).toHaveLength(1); expect(readers.has(names[0]!)).toBe(true);
    }
    expect(inventory).toContain("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;");
    expect(inventory).not.toMatch(/SET(?: LOCAL)? ROLE|\\(?:!|copy|i)\b|FROM auth\.users|FROM tenancy\.clients/i);
    expect(inventory.trim().endsWith("CATALOG_CAPTURED_MANUAL_TARGET_AUTHORITY_PRIVILEGE_AND_CACHE_REVIEW_REQUIRED")).toBe(true);
  });
  it("binds independent target evidence, full history, limits, collision and evidence-completeness guards", () => {
    for (const required of ["'gllsiklbvqpxzucvkehw'", "target_evidence_ref", "tls_evidence_ref", "inet_server_addr()", "database_oid",
      "count(*)=9 AND count(v)=9", "'20261118000800'", "blocked_partial_installation_or_trigger", "blocked_metadata_bounds",
      "blocked_helper_evidence", "statement_timeout='5s'", "lock_timeout='2s'", "idle_in_transaction_session_timeout='10s'", "ROLLBACK;"])
      expect(inventory).toContain(required);
    expect(inventory).toContain("has_column_privilege"); expect(inventory).toContain("createrole_self_grant");
    expect(inventory).toContain("c.relforcerowsecurity"); expect(inventory).toContain("pg_get_functiondef");
  });
  it("pins exactly ten ordered migration sources and verifies baseline, Vehicles, corrected draft and inventory bytes", () => {
    const manifest = JSON.parse(readFileSync(new URL("../../../../docs/deployment-0009/manifest.json", import.meta.url), "utf8")) as {
      migrations: { version: string; source: string; stagedFile: string; sha256: string }[];
      ancillaryArtifacts: { source: string; sha256: string }[]; expectedMigrationOrdering: string[];
      requiredRemoteBefore: string[]; requiredPending: string[]; projectRef: string; liveExecutionAuthorized: boolean;
    };
    expect(manifest.projectRef).toBe("gllsiklbvqpxzucvkehw"); expect(manifest.liveExecutionAuthorized).toBe(false);
    expect(manifest.migrations).toHaveLength(10);
    expect(manifest.migrations.map(x => x.version)).toEqual(manifest.expectedMigrationOrdering);
    expect(manifest.requiredRemoteBefore).toEqual(manifest.expectedMigrationOrdering.slice(0, 9));
    expect(manifest.requiredPending).toEqual(["20261118000900"]);
    expect(manifest.migrations[8]!.source).toBe("supabase/migration-drafts/20261118000800_vehicles.sql");
    expect(manifest.migrations[9]!.sha256).toBe(createHash("sha256").update(sql).digest("hex"));
    for (const artifact of [...manifest.migrations, ...manifest.ancillaryArtifacts]) {
      expect(artifact.source).not.toMatch(/\.\.|^[A-Za-z]:|^[/\\]/);
      const bytes = readFileSync(new URL(`../../../../${artifact.source}`, import.meta.url));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(artifact.sha256);
    }
  });
});

describe("TypeScript canonical envelope vectors — SQL runtime parity remains a live test", () => {
  it.each([
    [{ firstName: " Amina ", lastName: "Atlas", phone: "+212612345678" }, base],
    [{ ...base, email: " USER@EXAMPLE.COM " }, { ...base, email: "user@example.com" }],
    [{ ...base, identityType: "cin", identityNumber: " ab1234 " }, { ...base, identityType: "cin", identityNumber: "AB1234" }],
    [{ ...base, firstName: "\u00a0Amina\ufeff", notes: "\nline1\nline2\t" }, { ...base, notes: "line1\nline2" }],
    [{ ...base, email: "İ@EXAMPLE.COM" }, { ...base, email: "i\u0307@example.com" }],
  ])("pins canonical whitespace/default/case behavior %#", (input, expected) => {
    expect(validateClient(input, "2026-11-18")).toEqual({ ok: true, value: expected });
    expect(sql).toContain("app_private.client_unicode_case"); expect(sql).toContain("pg_catalog.ascii(pg_catalog.substr(v,n,1))>65535");
  });
  it.each([{ ...base, identityType: "" }, { ...base, email: null }, { ...base, licenceExpiryDate: "2028-01-01" },
    { ...base, notes: "bad\u0001" }, { ...base, firstName: "😀".repeat(51) },
    { ...base, licenceNumber: "abc", licenceIssueDate: "2026-02-30", licenceExpiryDate: "2028-01-01" },
    { ...base, licenceNumber: "abc", licenceIssueDate: "2026-11-19", licenceExpiryDate: "2028-01-01" }])("rejects invalid defaults/types/dates/UTF16 bounds %#", input => {
    expect(validateClient(input, "2026-11-18").ok).toBe(false);
  });
});

// Executable specification only: this model is NOT the SQL engine or RLS proof.
// HTTP regression tests separately exercise the real production handler.
class ReceiptSpecification {
  private rows = new Map<string, { creator: string; original: string | null; current: ClientInput; archived: boolean; id: number }>();
  private locks = new Map<string, Promise<unknown>>();
  async create(agency: string, creator: string, key: string, data: unknown, allowed = true): Promise<number> {
    if (!allowed) throw Error("42501"); const parsed = validateClient(data, "2026-11-18"); if (!parsed.ok) throw Error("22023");
    const slot = `${agency}:${key}`; const previous = this.locks.get(slot) ?? Promise.resolve();
    const work = previous.catch(() => {}).then(() => {
      const normalized = JSON.stringify(parsed.value); const row = this.rows.get(slot);
      if (row) {
        if (row.creator !== creator || row.original !== normalized) throw Error("40001");
        if (row.archived) throw Error("P0002"); return row.id;
      }
      const id = this.rows.size + 1; this.rows.set(slot, { creator, original: normalized, current: parsed.value, archived: false, id }); return id;
    }); this.locks.set(slot, work); return work;
  }
  edit(agency: string, key: string) { this.rows.get(`${agency}:${key}`)!.current.firstName = "Edited"; }
  archive(agency: string, key: string) { this.rows.get(`${agency}:${key}`)!.archived = true; }
  legacy(agency: string, key: string) { this.rows.set(`${agency}:${key}`, { creator: "u", original: null, current: { ...base }, archived: false, id: 1 }); }
  count() { return this.rows.size; }
}
describe("serialized replay specification — synthetic in-memory only", () => {
  it("same original returns same ID after edits; changed payload conflicts", async () => {
    const f = new ReceiptSpecification(); const id = await f.create("a", "u", "k", base); f.edit("a", "k");
    expect(await f.create("a", "u", "k", base)).toBe(id); await expect(f.create("a", "u", "k", { ...base, firstName: "Other" })).rejects.toThrow("40001");
  });
  it("isolates creator, tenant, archived and legacy keys", async () => {
    const f = new ReceiptSpecification(); await f.create("a", "u", "k", base);
    await expect(f.create("a", "v", "k", base)).rejects.toThrow("40001");
    expect(await f.create("b", "u", "k", base)).toBe(2); f.archive("a", "k"); await expect(f.create("a", "u", "k", base)).rejects.toThrow("P0002");
    f.legacy("c", "k"); await expect(f.create("c", "u", "k", base)).rejects.toThrow("40001");
  });
  it("concurrent identical requests share one ID; conflicting requests yield one conflict", async () => {
    const f = new ReceiptSpecification(); expect(new Set(await Promise.all(Array.from({ length: 20 }, () => f.create("a", "u", "k", base)))).size).toBe(1); expect(f.count()).toBe(1);
    const g = new ReceiptSpecification(); const results = await Promise.allSettled([g.create("a", "u", "k", base), g.create("a", "u", "k", { ...base, notes: "different" })]);
    expect(results.map(r => r.status)).toEqual(["fulfilled", "rejected"]); expect(g.count()).toBe(1);
  });
  it("invalid and unpermissioned requests do not create receipts", async () => {
    const f = new ReceiptSpecification(); await expect(f.create("a", "u", "k", {}, true)).rejects.toThrow("22023");
    await expect(f.create("a", "u", "k", base, false)).rejects.toThrow("42501"); expect(f.count()).toBe(0);
  });
});
