import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "pgsql-parser";
import { parsePlPgSQL } from "libpg-query";
import { nodes } from "./sql-helpers";

const source = readFileSync(new URL("../../../../supabase/migrations/20261115000500_agency_management.sql", import.meta.url), "utf8");
describe("agency management SQL draft — static only, no PostgreSQL enforcement proof", () => {
  it("parses all SQL and PL/pgSQL without execution", async () => {
    expect(await parse(source)).toBeDefined();
    expect(await parsePlPgSQL(source)).toBeDefined();
  });
  it("extends existing agencies and uses existing memberships, roles and settings", async () => {
    const ast = await parse(source);
    expect(nodes(ast, "CreateStmt")).toHaveLength(0);
    expect(source).toContain("ALTER TABLE tenancy.agencies");
    expect(source).toContain("UNIQUE (created_by_user_id, creation_key)");
  });
  it("creates the agency, owner assignment, permission, settings and audit in one RPC without commit controls", async () => {
    const ast = await parse(source);
    expect(nodes(ast, "TransactionStmt")).toHaveLength(0);
    const create = source.split("CREATE FUNCTION public.contratpro_create_agency")[1]!.split("CREATE FUNCTION public.contratpro_update_agency")[0]!;
    for (const table of ["agencies", "memberships", "roles", "membership_roles", "role_permissions", "agency_settings", "audit_events"]) expect(create).toContain(`INSERT INTO tenancy.${table}`);
    expect(create).toContain("app_private.canonical_auth_user()");
    expect(create).toContain("ON CONFLICT (created_by_user_id,creation_key) DO NOTHING");
    expect(create).toContain("mid:=gen_random_uuid(); rid:=gen_random_uuid()");
    expect(create).not.toContain("p_agency_id");
  });
  it("does not use postgres as capability owner or grant writes to authenticated/runtime roles", () => {
    expect(source).toContain("NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS");
    expect(source.match(/OWNER TO contratpro_agency_writer/g)).toHaveLength(3);
    expect(source.match(/SECURITY DEFINER SET search_path=pg_catalog SET row_security=on/g)).toHaveLength(3);
    expect(source).not.toMatch(/GRANT\s+(?:INSERT|UPDATE|DELETE)[^;]+TO\s+(?:authenticated|contratpro_runtime)/i);
    expect(source).toContain("REVOKE CREATE ON SCHEMA public FROM contratpro_agency_writer");
    expect(source).toContain("REVOKE contratpro_agency_writer FROM postgres GRANTED BY postgres");
  });
  it("hardens all three mutation ACLs as postgres before transferring ownership", () => {
    const revoke = source.indexOf("REVOKE ALL ON FUNCTION public.contratpro_create_agency(jsonb,text,uuid)");
    const grant = source.indexOf("GRANT EXECUTE ON FUNCTION public.contratpro_create_agency(jsonb,text,uuid)");
    const revokeEnd = source.indexOf(";", revoke);
    const grantEnd = source.indexOf(";", grant);
    expect(revoke).toBeGreaterThan(-1);
    expect(grant).toBeGreaterThan(revokeEnd);
    expect(source.slice(revoke, revokeEnd)).toContain("FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime");
    expect(source.slice(grant, grantEnd)).toMatch(/TO authenticated$/);
    for (const signature of ["contratpro_create_agency(jsonb,text,uuid)", "contratpro_update_agency(uuid,jsonb,uuid)", "contratpro_update_agency_settings(uuid,jsonb,uuid)"]) {
      expect(source.slice(revoke, revokeEnd)).toContain(signature);
      expect(source.slice(grant, grantEnd)).toContain(signature);
      const transfer = source.indexOf(`ALTER FUNCTION public.${signature} OWNER TO contratpro_agency_writer;`);
      expect(transfer).toBeGreaterThan(grantEnd);
      expect(transfer).toBeLessThan(source.indexOf("REVOKE contratpro_agency_writer FROM postgres GRANTED BY postgres"));
    }
    expect(source).toContain("THEN 'PUBLIC_FUNCTION_ACL' END");
    expect(source).toContain("'grantable',entry.is_grantable");
  });
  it("uses current canonical identity, tenant-scoped role joins and owner permission checks", () => {
    expect(source).toContain("link.supabase_user_id=(SELECT auth.uid()) AND u.state='active'");
    expect(source).toContain("mr.agency_id=m.agency_id AND mr.membership_id=m.id");
    expect(source).toContain("r.key='owner' AND rp.permission_key='agency.manage'");
    expect(source).toContain("IF NOT app_private.agency_owner(p_agency_id)");
    expect(source).not.toMatch(/ALTER\s+POLICY|DISABLE\s+ROW\s+LEVEL|ALTER\s+DEFAULT\s+PRIVILEGES|DROP\s+POLICY/i);
  });
  it("avoids a direct agency SELECT to membership SELECT expansion cycle during membership INSERT", () => {
    const policy = source.split("CREATE POLICY writer_agency_read")[1]!.split("CREATE POLICY writer_agency_insert")[0]!;
    expect(policy).toContain("app_private.agency_owner(id)");
    expect(policy).not.toContain("SELECT agency_id FROM tenancy.memberships");
    const helper = source.split("CREATE FUNCTION app_private.agency_owner")[1]!.split("CREATE POLICY writer_membership_read")[0]!;
    expect(helper).toContain("STABLE SECURITY INVOKER SET search_path=pg_catalog");
    // Static dependency contract only. PostgreSQL execution remains required.
  });
});
