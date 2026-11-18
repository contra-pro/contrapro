import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "pgsql-parser";
import { parsePlPgSQL } from "libpg-query";
import { nodes } from "./sql-helpers";

const source = readFileSync(new URL("../../../../supabase/migrations/20261115000400_supabase_auth.sql", import.meta.url), "utf8");
describe("Supabase Auth mapping draft — offline parsing, not real RLS proof", () => {
  it("parses SQL and procedural assertions without executing SQL", async () => {
    expect(await parse(source)).toBeDefined();
    expect(await parsePlPgSQL(source)).toBeDefined();
  });
  it("defines an explicit unique subject-to-canonical-user mapping", () => {
    expect(source).toContain("supabase_user_id uuid PRIMARY KEY REFERENCES auth.users(id)");
    expect(source).toContain("user_id uuid NOT NULL UNIQUE REFERENCES identity.users(id)");
    expect(source).not.toMatch(/\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO|FROM|identity\.)/i);
    expect(source).not.toMatch(/\bemail\s+(?:text|=)|CREATE\s+TRIGGER|CREATE\s+ROLE|SET\s+ROLE/i);
  });
  it("uses forced RLS and four authenticated self-only read policies", async () => {
    const ast = await parse(source);
    const policies = nodes(ast, "CreatePolicyStmt");
    expect(policies).toHaveLength(4);
    expect(source).toContain("ENABLE ROW LEVEL SECURITY");
    expect(source).toContain("FORCE ROW LEVEL SECURITY");
    expect(source).toContain("supabase_user_id = (SELECT auth.uid())");
    expect(source).toContain("m.agency_id = tenancy.agencies.id AND m.state = 'active'");
  });
  it("keeps the RPC invoker-only, bounded and without arguments", () => {
    expect(source).toContain("CREATE FUNCTION public.contratpro_auth_access()");
    expect(source).toContain("STABLE SECURITY INVOKER SET search_path = pg_catalog");
    expect(source).not.toMatch(/LANGUAGE\s+sql\s+STABLE\s+SECURITY\s+DEFINER/i);
    expect(source).toContain("LIMIT 101");
    expect(source).not.toMatch(/ALTER\s+DEFAULT\s+PRIVILEGES|GRANT\s+(?:ALL|INSERT|UPDATE|DELETE)|WITH\s+GRANT\s+OPTION/i);
  });
  it("does not grant runtime role memberships or modify the original tenant policies", () => {
    expect(source).not.toMatch(/ALTER\s+POLICY|DROP\s+POLICY|GRANT\s+contratpro_|TO\s+contratpro_runtime\s*;/i);
    expect(source).toContain("REVOKE ALL ON FUNCTION public.contratpro_auth_access()");
    expect(source).toContain("GRANT EXECUTE ON FUNCTION public.contratpro_auth_access() TO authenticated");
  });
});
