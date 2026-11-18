import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "pgsql-parser";
import { parsePlPgSQL } from "libpg-query";
import { nodes } from "./sql-helpers";
const sql = readFileSync(new URL("../../../../supabase/migrations/20261115000600_clients.sql", import.meta.url), "utf8");
describe("client SQL draft — static only, not live tenant-isolation proof", () => {
  it("parses SQL and PL/pgSQL without execution", async () => {
    expect(await parse(sql)).toBeDefined(); expect(await parsePlPgSQL(sql)).toBeDefined();
  });
  it("adds one client table, tenant composite key, forced RLS and scoped policies", async () => {
    const ast = await parse(sql);
    expect(nodes(ast, "CreateStmt")).toHaveLength(1);
    expect(nodes(ast, "CreatePolicyStmt")).toHaveLength(3);
    expect(sql).toContain("UNIQUE(agency_id,id)"); expect(sql).toContain("FORCE ROW LEVEL SECURITY");
    expect(sql).toContain("USING(state='active' AND app_private.client_allowed(agency_id,'clients.read'))");
    expect(sql).not.toMatch(/CREATE\s+ROLE|SECURITY\s+DEFINER|ALTER\s+POLICY|ALTER\s+DEFAULT\s+PRIVILEGES/i);
  });
  it("keeps all six public RPCs invoker-only and denies runtime/platform/anonymous access", () => {
    expect(sql.match(/CREATE FUNCTION public\./g)).toHaveLength(6);
    expect(sql).toContain("FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime");
    expect(sql).toContain("TO authenticated"); expect(sql).not.toMatch(/GRANT[^;]+TO\s+(?:anon|service_role|contratpro_runtime|contratpro_platform_runtime)/i);
  });
  it("protects direct archive/update writes with a permission-checking trigger", () => {
    expect(sql).toContain("CREATE TRIGGER clients_guard BEFORE INSERT OR UPDATE");
    expect(sql).toContain("NEW.state=OLD.state OR app_private.client_payload(NEW) IS DISTINCT FROM app_private.client_payload(OLD)");
    expect(sql).toContain("NOT app_private.client_allowed(OLD.agency_id,'clients.update')");
    expect(sql).toContain("NEW.state<>'archived' OR NOT app_private.client_allowed(OLD.agency_id,'clients.archive')");
    expect(sql).toContain("OLD.state<>'active'"); expect(sql).not.toMatch(/GRANT\s+DELETE/i);
    expect(sql).toContain("WHERE agency_id=p_agency_id AND id=p_id AND state='active' AND version=p_version");
  });
  it("returns no document/licence/notes fields from list/search and uses literal search", () => {
    const list = sql.split("CREATE FUNCTION public.contratpro_clients_list")[1]!.split("CREATE FUNCTION public.contratpro_client_detail")[0]!;
    expect(list).not.toMatch(/identity_number|licence_number|licence_issue_date|licence_expiry_date|notes/);
    expect(list).toContain("strpos(lower("); expect(list).not.toMatch(/\bILIKE\b/);
    expect(list).toContain("ORDER BY last_name,first_name,id"); expect(list).toContain("p_size NOT IN (10,20,50)");
    expect(list).toContain("c.agency_id=p_agency_id AND c.state='active'");
  });
  it("creates only server-owned metadata and supports idempotency and optimistic concurrency", () => {
    expect(sql).toContain("DEFAULT app_private.canonical_auth_user()");
    expect(sql).toContain("ON CONFLICT(agency_id,creation_key) DO NOTHING");
    expect(sql).toContain("NEW.version:=OLD.version+1");
    expect(sql).toContain("USING ERRCODE='40001'");
    expect(sql).not.toMatch(/RAISE[^;]+(?:identity_number|licence_number|p_details|notes)/i);
  });
});
