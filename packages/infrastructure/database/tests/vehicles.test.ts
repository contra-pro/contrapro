import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parse } from "pgsql-parser";
import { parsePlPgSQL } from "libpg-query";
import { nodes } from "./sql-helpers";
const sql = readFileSync(new URL("../../../../supabase/migration-drafts/20261118000800_vehicles.sql", import.meta.url), "utf8");
describe("vehicle migration draft — offline parsing/contracts, not live RLS enforcement", () => {
  it("parses SQL and PL/pgSQL without executing statements", async () => {
    expect(await parse(sql)).toBeDefined(); expect(await parsePlPgSQL(sql)).toBeDefined();
  });
  it("adds one canonical agency table with FORCE RLS and exactly read/create/update policies", async () => {
    const ast = await parse(sql); expect(nodes(ast, "CreateStmt")).toHaveLength(1); expect(nodes(ast, "CreatePolicyStmt")).toHaveLength(3);
    expect(sql).toContain("REFERENCES tenancy.agencies(id) ON DELETE RESTRICT"); expect(sql).toContain("FORCE ROW LEVEL SECURITY");
    expect(sql).toContain("UNIQUE(agency_id,id)"); expect(sql).toContain("UNIQUE(agency_id,registration_key)");
    expect(sql).not.toMatch(/SECURITY\s+DEFINER|CREATE\s+ROLE|ALTER\s+POLICY|GRANT\s+DELETE/i);
  });
  it("uses existing canonical identity, active membership and agency-scoped role permissions", () => {
    expect(sql).toContain("m.user_id=app_private.canonical_auth_user()"); expect(sql).toContain("m.state='active'");
    expect(sql).toContain("mr.agency_id=m.agency_id"); expect(sql).toContain("rp.agency_id=mr.agency_id");
    expect(sql).toContain("app_private.agency_owner(target)"); expect(sql).toContain("a.state='active'");
    expect(sql.match(/CREATE FUNCTION public\./g)).toHaveLength(5);
    expect(sql).toContain("FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime");
    expect(sql).not.toMatch(/GRANT[^;]+TO\s+(?:anon|service_role|contratpro_runtime|contratpro_platform_runtime)/i);
  });
  it("validates direct table writes and prevents ownership/metadata reassignment", () => {
    expect(sql).toContain("CREATE TRIGGER vehicles_guard BEFORE INSERT OR UPDATE");
    expect(sql).toContain("NOT app_private.valid_vehicle(app_private.vehicle_payload(NEW))");
    expect(sql).toContain("ROW(NEW.id,NEW.agency_id,NEW.creation_key,NEW.created_by_user_id,NEW.created_at)");
    const updateGrant = sql.match(/GRANT UPDATE\([^;]+;/)?.[0]; expect(updateGrant).toBeDefined();
    expect(updateGrant).not.toMatch(/agency_id|version|created_by|creation_key/);
    expect(sql).toContain("DEFAULT app_private.canonical_auth_user()");
    expect(sql).toContain("pg_catalog.aclexplode(col.attacl)");
    expect(sql).toContain("NOT a.is_grantable");
  });
  it("uses scoped idempotency and version compare-and-swap without automatic retries", () => {
    expect(sql).toContain("UNIQUE(agency_id,creation_key)"); expect(sql).toContain("pg_advisory_xact_lock(hashtextextended(p_agency_id::text||':'||p_key::text,0))");
    expect(sql).toContain("app_private.vehicle_payload(existing) IS DISTINCT FROM p_details");
    expect(sql).toContain("WHERE agency_id=p_agency_id AND id=p_id AND version=p_version"); expect(sql).toContain("NEW.version:=OLD.version+1");
    expect(sql).toContain("USING ERRCODE='40001'"); expect(sql).not.toMatch(/RAISE[^;]+p_details/i);
  });
  it("pins promotion bytes and exact baseline outside frozen discovery without authorizing execution", () => {
    const manifest = JSON.parse(readFileSync(new URL("../../../../docs/deployment-0008/manifest.json", import.meta.url), "utf8"));
    expect(manifest.projectRef).toBe("gllsiklbvqpxzucvkehw"); expect(manifest.liveExecutionAuthorized).toBe(false);
    expect(manifest.runtimeGate.enabled).toBe(false); expect(manifest.requiredPending).toEqual(["20261118000800"]);
    expect(manifest.baseline).toHaveLength(8); expect(manifest.requiredRemoteBefore).toHaveLength(8);
    expect(manifest.requiredRemoteBefore.at(-1)).toBe("20261116000700");
    const native = new URL("../../../../supabase/migrations/", import.meta.url);
    expect(readdirSync(native).sort()).toEqual(manifest.baseline.map((artifact: { file: string }) => artifact.file.split("/").at(-1)).sort());
    for (const artifact of [...manifest.baseline, manifest.draft, manifest.configuration] as { file: string; sha256: string }[]) {
      const bytes = readFileSync(new URL(`../../../../${artifact.file}`, import.meta.url));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(artifact.sha256);
    }
  });
  it("keeps the proposed file compatible with one native transactional batch", async () => {
    const ast = await parse(sql);
    expect(nodes(ast, "TransactionStmt")).toHaveLength(0);
    expect(sql).not.toMatch(/transaction\s*=\s*false|CREATE\s+INDEX\s+CONCURRENTLY|\bVACUUM\b|CREATE\s+DATABASE|ALTER\s+SYSTEM/i);
    const procedure = readFileSync(new URL("../../../../docs/deployment-0008/README.md", import.meta.url), "utf8");
    expect(procedure).toContain("--remote=$vehicleTarget"); expect(procedure).toContain("sslmode=verify-full");
    expect(procedure).toContain("--dry-run"); expect(procedure).toContain("--include-seed=false --include-roles=false");
    expect(procedure).toContain("On lost deployment response: no retry");
  });
});
