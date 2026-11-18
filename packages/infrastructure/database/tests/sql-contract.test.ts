import { describe, expect, it } from "vitest";
import { parse } from "pgsql-parser";
import { parsePlPgSQL } from "libpg-query";
import { loadDrafts, nodes, record, relationName, strings } from "./sql-helpers";

describe("parsed PostgreSQL security contracts — not RLS execution", () => {
  it("revokes PUBLIC function defaults owner-wide, not just per schema", async () => {
    const schema = (await loadDrafts())[1]!.ast;
    const defaults = nodes(schema, "AlterDefaultPrivilegesStmt");
    const ownerWide = defaults.find((statement) => {
      const options = nodes(statement.options, "DefElem");
      const action = record(statement.action);
      return !options.some((option) => option.defname === "schemas")
        && options.some((option) => option.defname === "roles" && nodes(option.arg, "RoleSpec").some((role) => role.rolename === "contratpro_migration_owner"))
        && action.objtype === "OBJECT_FUNCTION" && action.is_grant !== true;
    });
    expect(ownerWide, JSON.stringify(defaults)).toBeDefined();
    const action = record(ownerWide!.action);
    expect(nodes(action.grantees, "RoleSpec").some((role) => role.roletype === "ROLESPEC_PUBLIC")).toBe(true);
    expect(nodes(action.privileges, "AccessPriv").map((privilege) => privilege.priv_name)).toContain("execute");
    for (const statement of defaults) {
      const operation = record(statement.action);
      if (operation.objtype === "OBJECT_FUNCTION" && operation.is_grant === true) {
        expect(nodes(operation.grantees, "RoleSpec").some((role) => role.roletype === "ROLESPEC_PUBLIC")).toBe(false);
      }
    }
  });

  it("parses every ordered draft and keeps each inside an explicit transaction", async () => {
    for (const draft of await loadDrafts()) {
      const transactions = nodes(draft.ast, "TransactionStmt");
      expect(transactions.map((stmt) => stmt.kind)).toEqual(["TRANS_STMT_BEGIN", "TRANS_STMT_COMMIT"]);
      expect(draft.source).not.toMatch(/CREATE\s+EXTENSION|CREATE\s+DATABASE|PASSWORD\s+'|postgres(?:ql)?:\/\//i);
    }
  });

  it("creates only non-login, non-bypass roles and no role memberships", async () => {
    const drafts = await loadDrafts();
    const roles = nodes(drafts[0]!.ast, "CreateRoleStmt");
    expect(roles.map((role) => role.role).sort()).toEqual([
      "contratpro_migration_owner", "contratpro_platform_runtime", "contratpro_runtime",
    ]);
    for (const role of roles) {
      const options = nodes(role.options, "DefElem");
      for (const name of ["superuser", "createdb", "createrole", "inherit", "canlogin", "isreplication", "bypassrls"]) {
        const option = options.find((value) => value.defname === name);
        expect(option, `${role.role}: ${name}`).toBeDefined();
        expect(nodes(option!.arg, "Boolean")).toHaveLength(1);
        expect(nodes(option!.arg, "Boolean")[0]?.boolval ?? false).toBe(false);
      }
    }
    expect(nodes(drafts, "GrantRoleStmt")).toHaveLength(0);
  });

  it("enables AND forces RLS on all private tables before runtime grants", async () => {
    const drafts = await loadDrafts();
    const schema = drafts[1]!.ast;
    const tables = nodes(schema, "CreateStmt").map((stmt) => relationName(stmt.relation))
      .filter((name) => name !== "tenancy.permissions");
    const alterations = nodes(schema, "AlterTableStmt");
    for (const table of tables) {
      const commands = alterations.filter((stmt) => relationName(stmt.relation) === table)
        .flatMap((stmt) => nodes(stmt.cmds, "AlterTableCmd").map((cmd) => cmd.subtype));
      expect(commands, table).toContain("AT_EnableRowSecurity");
      expect(commands, table).toContain("AT_ForceRowSecurity");
    }
    expect(nodes(schema, "GrantStmt").filter((stmt) => stmt.is_grant === true)).toHaveLength(0);
  });

  it("keeps policies runtime-only, tenant-bound, command-specific and platform-denied", async () => {
    const drafts = await loadDrafts();
    const policies = nodes(drafts, "CreatePolicyStmt");
    expect(policies).toHaveLength(10);
    for (const policy of policies) {
      expect(nodes(policy.roles, "RoleSpec").map((role) => role.rolename)).toEqual(["contratpro_runtime"]);
      expect(relationName(policy.table)).not.toMatch(/^platform\./);
      expect(["select", "insert"]).toContain(policy.cmd_name);
      if (relationName(policy.table).startsWith("tenancy.")) {
        expect(strings(policy.qual ?? policy.with_check)).toContain("contratpro.agency_id");
        expect(nodes(policy.qual ?? policy.with_check, "BoolExpr").some((expr) => expr.boolop === "OR_EXPR")).toBe(false);
      }
    }
    const inserts = policies.filter((policy) => policy.cmd_name === "insert");
    expect(inserts.map((policy) => relationName(policy.table))).toEqual(["tenancy.audit_events"]);
    expect(inserts[0]?.with_check).toBeDefined();
  });

  it("grants no platform/public access, mutation capabilities or invitation secrets", async () => {
    const grants = nodes(await loadDrafts(), "GrantStmt").filter((stmt) => stmt.is_grant === true);
    for (const grant of grants) {
      expect(nodes(grant.grantees, "RoleSpec").map((role) => role.rolename)).toEqual(["contratpro_runtime"]);
      const privileges = nodes(grant.privileges, "AccessPriv");
      expect(privileges.length).toBeGreaterThan(0);
      for (const privilege of privileges) {
        expect(["update", "delete", "truncate", "references", "trigger", "all"])
          .not.toContain(String(privilege.priv_name).toLowerCase());
      }
      expect(nodes(grant, "RangeVar").map(relationName).some((name) => name.startsWith("platform."))).toBe(false);
      for (const privilege of privileges) {
        if (privilege.priv_name === "insert") {
          expect(nodes(grant, "RangeVar").map(relationName)).toEqual(["tenancy.audit_events"]);
          expect(strings(privilege.cols)).not.toContain("created_at");
          expect(strings(privilege.cols)).not.toContain("id");
        }
      }
      if (nodes(grant, "RangeVar").some((table) => relationName(table) === "tenancy.membership_invitations")) {
        const columns = privileges.flatMap((privilege) => strings(privilege.cols));
        expect(columns.length).toBeGreaterThan(0);
        expect(columns).not.toContain("recipient_email");
        expect(columns).not.toContain("token_digest");
      }
    }
  });

  it("uses invoker helpers with fixed search paths and explicit PUBLIC revocation", async () => {
    const drafts = await loadDrafts();
    const functions = nodes(drafts[2]!.ast, "CreateFunctionStmt");
    expect(functions).toHaveLength(4);
    for (const fn of functions) {
      const options = nodes(fn.options, "DefElem");
      const security = options.find((option) => option.defname === "security");
      expect(security).toBeDefined();
      expect(nodes(security!.arg, "Boolean")).toHaveLength(1);
      expect(nodes(security!.arg, "Boolean")[0]?.boolval ?? false).toBe(false);
      const settings = options.filter((option) => option.defname === "set").flatMap((option) => nodes(option.arg, "VariableSetStmt"));
      expect(settings.map((setting) => setting.name)).toContain("search_path");
      expect(strings(settings)).toContain("pg_catalog");
    }
    const revocations = nodes(drafts[2]!.ast, "GrantStmt").filter((stmt) => !stmt.is_grant);
    expect(revocations.some((stmt) => nodes(stmt.grantees, "RoleSpec").some((role) => role.roletype === "ROLESPEC_PUBLIC"))).toBe(true);
    expect(record(functions[0]).funcname).toBeDefined();
  });

  it("parses the PL/pgSQL context function body without starting PostgreSQL", async () => {
    const drafts = await loadDrafts();
    await expect(parsePlPgSQL(drafts[2]!.source)).resolves.toBeDefined();
  });

  it("runs schema/function/policy drafts only under the migration owner", async () => {
    for (const draft of (await loadDrafts()).slice(1)) {
      const role = nodes(draft.ast, "VariableSetStmt").find((setting) => setting.name === "role");
      expect(role?.is_local).toBe(true);
      expect(strings(role?.args)).toEqual(["contratpro_migration_owner"]);
    }
  });

  it("parses SQL helper bodies and rejects cycles in the policy/function lookup graph", async () => {
    const drafts = await loadDrafts();
    const functions = nodes(drafts[2]!.ast, "CreateFunctionStmt");
    const graph = new Map<string, Set<string>>();
    const dependencies = (tree: unknown) => [
      ...nodes(tree, "RangeVar").map((table) => `table:${relationName(table)}`),
      ...nodes(tree, "FuncCall").map((call) => strings(call.funcname).join("."))
        .filter((name) => name.startsWith("app_private.")).map((name) => `function:${name}`),
    ];
    for (const fn of functions) {
      const options = nodes(fn.options, "DefElem");
      const language = strings(options.find((option) => option.defname === "language")?.arg)[0];
      const body = strings(options.find((option) => option.defname === "as")?.arg)[0]!;
      const name = `function:${strings(fn.funcname).join(".")}`;
      if (language === "sql") graph.set(name, new Set(dependencies(await parse(body))));
      else {
        expect(language).toBe("plpgsql");
        expect(body).toContain("current_setting(setting_name, true)");
        expect(body).toContain("EXCEPTION WHEN invalid_text_representation");
        expect(body).toContain("RETURN NULL");
        graph.set(name, new Set());
      }
    }
    for (const policy of nodes(drafts, "CreatePolicyStmt")) {
      const table = `table:${relationName(policy.table)}`;
      const edges = graph.get(table) ?? new Set<string>();
      for (const edge of dependencies([policy.qual, policy.with_check])) edges.add(edge);
      graph.set(table, edges);
    }
    const visit = (node: string, stack: Set<string>) => {
      expect(stack.has(node), `recursive RLS path: ${[...stack, node].join(" -> ")}`).toBe(false);
      const next = new Set(stack).add(node);
      for (const edge of graph.get(node) ?? []) visit(edge, next);
    };
    for (const node of graph.keys()) visit(node, new Set());
  });
});
