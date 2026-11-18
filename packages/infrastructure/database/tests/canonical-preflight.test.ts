import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "pgsql-parser";
import { nodes, record, strings } from "./sql-helpers";

const source = readFileSync(new URL("../../../../scripts/preflight-canonical-0007.sql", import.meta.url), "utf8");
const guards = ["identity_ok", "dependencies_ok", "role_baseline_ok", "history_ok", "collisions_ok", "tables_ok",
  "constraints_ok", "policies_ok", "existing_acl_ok", "authority_ok", "defaults_ok", "final_ok"];
const branches = [...source.matchAll(/^\\if :([a-z_]+)\r?\n([\s\S]*?)^\\else\r?\n([\s\S]*?)^\\endif/gm)];
// Remove only known psql syntax for static parsing. No SQL or psql process is run.
const sql = source.split(/\r?\n/).map(line => /^\\gset\s*$/.test(line) ? ";" : line.startsWith("\\") ? "" : line)
  .join("\n").replace(/:initial_backend\b/g, "123");

describe("canonical preflight: offline psql-17 failure contract, not measured process exit proof", () => {
  it("keeps ON_ERROR_STOP enabled before all SQL and removes unsupported quit statuses", () => {
    expect(source.match(/^\\set ON_ERROR_STOP on$/gm)).toHaveLength(1);
    expect(source.indexOf("\\set ON_ERROR_STOP on")).toBeLessThan(source.indexOf("BEGIN ISOLATION LEVEL"));
    expect(source).not.toMatch(/^\\(?:q|quit)\b/m);
    expect(branches.map(branch => branch[1])).toEqual(guards);
  });
  it.each(guards)("%s terminates through an unconditional division-by-zero SELECT under ON_ERROR_STOP", async guard => {
    const branch = branches.find(value => value[1] === guard)!;
    const failure = branch[3]!;
    expect(failure).toMatch(/^\\echo BLOCKED:/);
    expect(failure).toMatch(/SELECT 1 \/ 0 AS preflight_blocked;\s*$/);
    expect(failure.match(/SELECT 1 \/ 0 AS preflight_blocked;/g)).toHaveLength(1);
    if (guard === "final_ok") expect(source).toContain("ROLLBACK;\n\\if :final_ok");
    else expect(failure).toContain("ROLLBACK;\nSELECT 1 / 0 AS preflight_blocked;");
    expect(nodes(await parse("SELECT 1 / 0 AS preflight_blocked;"), "SelectStmt")).toHaveLength(1);
    expect(branch[2]).not.toContain("preflight_blocked");
  });
  it("never emits a full preflight PASS on the successful automated path", () => {
    const success = branches.find(branch => branch[1] === "final_ok")![2]!;
    expect(success).toContain("\\echo AUTOMATED_CHECKS_PASSED_MANUAL_REVIEW_REQUIRED");
    expect(success).toContain("full preflight PASS and deployment are NOT established");
    expect(success).not.toMatch(/SELECT|\\quit/);
    expect(source).not.toMatch(/^\\echo PASS\b/m);
  });
  it("retains bounded output of all five named predicates for separate manual comparison", () => {
    for (const name of ["users_self_read", "supabase_canonical_self_read", "writer_user", "supabase_mapping_self_read", "writer_mapping"]) expect(source).toContain(`'${name}'`);
    expect(source).toContain("-- MANUAL gate: compare all five complete predicates against 0003, 0004 and 0005.");
    expect(source).toContain("pg_get_expr(p.polqual,p.polrelid) AS predicate");
    expect(source).toContain("ORDER BY n.nspname,c.relname,p.polname LIMIT 6;");
  });
  it("contains only SELECT and read-only transaction configuration, with no mutation or RPC invocation", async () => {
    const ast = record(await parse(sql));
    expect(Array.isArray(ast.stmts)).toBe(true);
    for (const statement of ast.stmts as unknown[]) {
      for (const kind of Object.keys(record(record(statement).stmt))) expect(["SelectStmt", "TransactionStmt", "VariableSetStmt"]).toContain(kind);
    }
    for (const select of nodes(ast, "SelectStmt")) {
      expect(select.intoClause).toBeUndefined(); expect(select.lockingClause).toBeUndefined();
    }
    for (const setting of nodes(ast, "VariableSetStmt")) expect(setting.is_local).toBe(true);
    const allowedFunctions = ["current_database", "current_setting", "pg_is_in_recovery", "pg_backend_pid", "to_regclass", "count", "array_agg",
      "format_type", "pg_get_expr", "pg_get_constraintdef", "to_regrole", "length", "aclexplode", "acldefault", "has_column_privilege",
      "has_table_privilege", "has_schema_privilege", "has_language_privilege", "to_regprocedure", "has_function_privilege", "pg_has_role", "pg_get_userbyid", "cardinality"];
    for (const call of nodes(ast, "FuncCall")) expect(allowedFunctions).toContain(strings(call.funcname).join("."));
    expect(source).toContain("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;");
    for (const limit of ["statement_timeout = '5000ms'", "lock_timeout = '2000ms'", "idle_in_transaction_session_timeout = '10000ms'"]) expect(source).toContain(`SET LOCAL ${limit};`);
    expect(source).not.toMatch(/^COMMIT\b|READ WRITE|^DO\b|^EXECUTE\b/m);
  });
  it("permits no hidden psql execution, includes, output redirects or arbitrary interpolation", () => {
    for (const line of source.split(/\r?\n/).filter(value => value.startsWith("\\"))) {
      expect(line).toMatch(/^\\(?:set (?:ON_ERROR_STOP on|VERBOSITY terse)$|pset pager off$|gset$|if :[a-z_]+$|else$|endif$|echo )/);
    }
    expect(source.match(/:initial_backend\b/g)).toHaveLength(1);
    expect(source).toContain("SELECT pg_backend_pid() AS initial_backend\n\\gset");
  });
  it("requires PUBLIC EXECUTE on every managed helper instead of executor delegation authority", () => {
    const authority = source.split("SELECT (SELECT rolcreaterole")[1]!.split("\\gset")[0]!;
    for (const signature of ["auth.uid()", "auth.role()", "auth.jwt()"]) expect(authority).toContain(`to_regprocedure('${signature}')`);
    expect(authority).toContain("p.prokind='f' AND p.pronargs=0");
    expect(authority).toContain("WHEN 'uid' THEN 'uuid'::regtype WHEN 'role' THEN 'text'::regtype ELSE 'jsonb'::regtype END");
    expect(authority).toContain("helper_acl.grantee=0 AND helper_acl.privilege_type='EXECUTE'");
    expect(authority).toContain("acldefault('f',p.proowner)");
    expect(authority).toContain("=3 AS authority_ok");
    expect(authority).not.toContain("EXECUTE WITH GRANT OPTION");
    for (const privilege of ["USAGE WITH GRANT OPTION", "CREATE WITH GRANT OPTION", "SELECT WITH GRANT OPTION", "INSERT WITH GRANT OPTION"]) expect(authority).toContain(privilege);
  });
  it("keeps identity directly postgres-owned and limits the public alternative to the current database owner", async () => {
    const authority = source.split("SELECT (SELECT rolcreaterole")[1]!.split("\\gset")[0]!;
    expect(authority).toContain("n.nspname='identity' AND n.nspowner<>'postgres'::regrole");
    expect(authority).toContain("AND EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname='public'");
    expect(authority).toContain("AND (n.nspowner='postgres'::regrole OR (\n      n.nspowner='pg_database_owner'::regrole");
    expect(authority).toContain("AND EXISTS(SELECT 1 FROM pg_database d WHERE d.datname=current_database() AND d.datdba='postgres'::regrole)");
    expect(authority).toContain("AND pg_has_role('postgres','pg_database_owner','USAGE')");
    expect(authority).toContain("AND pg_has_role('postgres','pg_database_owner','MEMBER'))))");
    // Privilege delegation remains required for BOTH public ownership branches.
    expect(authority).toMatch(/AND NOT EXISTS\(SELECT 1 FROM pg_namespace n WHERE n\.nspname IN \('identity','app_private','public'\)\s+AND NOT has_schema_privilege\('postgres',n\.oid,'USAGE WITH GRANT OPTION'\)\)/);
    expect(authority).toContain("AND has_schema_privilege('postgres','public','CREATE WITH GRANT OPTION')");
    expect(await parse(sql)).toBeDefined();
  });
  it("uses ordinary postgres auth access and local-schema delegation, with all bridge overloads collision-checked", () => {
    const authority = source.split("SELECT (SELECT rolcreaterole")[1]!.split("\\gset")[0]!;
    expect(authority).toContain("has_schema_privilege('postgres','auth','USAGE')");
    expect(authority).toContain("has_schema_privilege('postgres','app_private','CREATE')");
    expect(authority).toContain("n.nspname='app_private' AND n.nspowner<>'postgres'::regrole");
    expect(authority).toContain("has_function_privilege('postgres',p.oid,'EXECUTE')");
    expect(authority).not.toMatch(/has_schema_privilege\('postgres','auth','[^']*WITH GRANT OPTION/);
    expect(source).toContain("n.nspname='app_private' AND p.proname='provisioning_subject'");
    expect(source).toContain("nspname IN ('public','app_private')");
    expect(source).toContain("pg_has_role('authenticator','authenticated','SET')");
  });
  it("reports existing bridge metadata without invoking it or treating absence as runtime verification", () => {
    expect(source).toContain("'ABSENT_EXPECTED_PREDEPLOYMENT'");
    expect(source).toContain("'EXISTING_OBJECT_REQUIRES_REVIEW'");
    expect(source).toContain("to_regprocedure(expected.signature)");
    expect(source).toContain("p.proowner='postgres'::regrole END AS owner_ok");
    expect(source).toContain("AS settings_ok"); expect(source).toContain("AS acl_boundary_ok");
    expect(source).toContain("AS capability_execute"); expect(source).toContain("AS ordinary_callers_denied");
    expect(source).not.toMatch(/SELECT\s+app_private\.provisioning_subject\(/);
  });
});
