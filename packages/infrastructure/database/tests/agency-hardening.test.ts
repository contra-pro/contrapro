import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "pgsql-parser";
import { parsePlPgSQL } from "libpg-query";
import { nodes } from "./sql-helpers";

const sql = readFileSync(new URL("../../../../supabase/migration-drafts/contratpro_0012_production_candidate.sql", import.meta.url), "utf8");
const embedded = [...sql.matchAll(/EXECUTE '([^']+)'/g)].map(match => match[1]!);

describe("0012 agency hardening candidate — parsing and scope checks only, no database execution", () => {
  it("parses the standalone transaction, procedural body and every dynamic statement", async () => {
    const ast = await parse(sql);
    expect(await parsePlPgSQL(sql)).toBeDefined();
    for (const command of embedded) expect(await parse(command)).toBeDefined();
    expect(nodes(ast, "TransactionStmt").map(statement => statement.kind)).toEqual(["TRANS_STMT_BEGIN", "TRANS_STMT_COMMIT"]);
    expect(nodes(ast, "InsertStmt")).toHaveLength(1);
    expect(sql).toContain("INSERT INTO supabase_migrations.schema_migrations(version)\nVALUES ('20261119001200');");
    expect(sql.indexOf("INSERT INTO supabase_migrations")).toBeGreaterThan(sql.indexOf("$migration_0012$;"));
  });
  it("allows only the three affected RPC setting changes and the scoped temporary authority path", () => {
    expect(embedded).toEqual([
      "GRANT contratpro_agency_writer TO postgres WITH ADMIN FALSE, INHERIT FALSE, SET TRUE GRANTED BY postgres",
      "SET LOCAL ROLE contratpro_agency_writer",
      "ALTER FUNCTION public.contratpro_create_agency(jsonb,text,uuid) SET search_path=pg_catalog,pg_temp",
      "ALTER FUNCTION public.contratpro_update_agency(uuid,jsonb,uuid) SET search_path=pg_catalog,pg_temp",
      "ALTER FUNCTION public.contratpro_update_agency_settings(uuid,jsonb,uuid) SET search_path=pg_catalog,pg_temp",
      "SET LOCAL ROLE postgres",
      "REVOKE contratpro_agency_writer FROM postgres GRANTED BY postgres RESTRICT",
    ]);
    const executable = sql.replace(/--[^\n]*/g, "");
    expect(executable).not.toMatch(/CREATE\s+(?:OR REPLACE\s+)?FUNCTION|GRANT\s+EXECUTE|ALTER\s+(?:TABLE|POLICY|ROLE)|OWNER\s+TO|CREATE\s+POLICY|DISABLE\s+ROW\s+LEVEL/i);
  });
  it("checks original security state, exact restoration and hardened settings before committing", () => {
    expect(sql).toContain("pg_catalog.pg_has_role(session_user,writer,'SET')");
    expect(sql).toContain("pg_catalog.pg_has_role(current_user,writer,'MEMBER WITH ADMIN OPTION')");
    for (const baseline of ["memberships_before", "roles_before", "functions_before", "tables_before", "columns_before", "policies_before"]) {
      expect(sql).toContain(`IS DISTINCT FROM ${baseline}`);
    }
    expect(sql).toContain("pg_catalog.to_jsonb(p)-'proconfig'");
    expect(sql).toContain("ARRAY['search_path=pg_catalog, pg_temp','row_security=on']");
    expect(sql.indexOf("REVOKE contratpro_agency_writer")).toBeLessThan(sql.indexOf("IS DISTINCT FROM memberships_before"));
  });
});
