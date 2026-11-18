import { describe, expect, it } from "vitest";
import { getTableConfig, PgDialect, type PgTable } from "drizzle-orm/pg-core";
import { parse } from "pgsql-parser";
import * as schema from "../src/schema";
import { loadDrafts, nodes, record, relationName, strings } from "./sql-helpers";

const tables: PgTable[] = [schema.users, schema.agencies, schema.memberships, schema.roles,
  schema.permissions, schema.rolePermissions, schema.membershipRoles, schema.membershipInvitations,
  schema.agencySettings, schema.auditEvents, schema.platformAdminIdentities];
const configs = tables.map(getTableConfig);

// Qualification and parser source positions do not affect CHECK expression meaning.
function normalizeExpression(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeExpression);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !["location", "rexpr_list_start", "rexpr_list_end"].includes(key))
    .map(([key, child]) => {
      if (key === "ColumnRef") {
        const column = record(child);
        return [key, { fields: Array.isArray(column.fields) ? column.fields.slice(-1) : column.fields }];
      }
      return [key, normalizeExpression(child)];
    }));
}

describe("Drizzle and SQL draft schema contract — no database execution", () => {
  it("matches table inventory, columns, nullability, primary keys, unique keys, checks and foreign keys", async () => {
    const drafts = await loadDrafts();
    const definitions = nodes(drafts.find((draft) => draft.name === "0001_schema.sql")!.ast, "CreateStmt");
    expect(definitions.map((node) => relationName(node.relation)).sort())
      .toEqual(configs.map((config) => `${config.schema}.${config.name}`).sort());

    for (const config of configs) {
      const definition = definitions.find((node) => relationName(node.relation) === `${config.schema}.${config.name}`)!;
      const columns = nodes(definition.tableElts, "ColumnDef");
      const constraints = nodes(definition.tableElts, "Constraint");
      const primary = constraints.filter((c) => c.contype === "CONSTR_PRIMARY");
      const sqlPrimary = primary.flatMap((c) => strings(c.keys));
      for (const col of columns) {
        if (nodes(col.constraints, "Constraint").some((c) => c.contype === "CONSTR_PRIMARY")) sqlPrimary.push(String(col.colname));
      }
      const drizzlePrimary = [...config.columns.filter((col) => col.primary).map((col) => col.name),
        ...config.primaryKeys.flatMap((key) => key.columns.map((col) => col.name))];
      expect(sqlPrimary.sort(), config.name).toEqual(drizzlePrimary.sort());
      expect(columns.map((col) => col.colname).sort()).toEqual(config.columns.map((col) => col.name).sort());
      for (const column of config.columns) {
        const sqlColumn = columns.find((col) => col.colname === column.name)!;
        const nonNull = sqlPrimary.includes(column.name) || nodes(sqlColumn.constraints, "Constraint").some((c) => c.contype === "CONSTR_NOTNULL");
        expect(nonNull, `${config.name}.${column.name}`).toBe(column.notNull);
        const typeNames = strings(record(sqlColumn.typeName).names);
        const sqlType = typeNames.at(-1);
        const drizzleType = column.getSQLType() === "timestamp with time zone" ? "timestamptz" : column.getSQLType();
        expect(sqlType, `${config.name}.${column.name} type`).toBe(drizzleType);
        const hasDefault = nodes(sqlColumn.constraints, "Constraint").some((c) => c.contype === "CONSTR_DEFAULT");
        expect(hasDefault, `${config.name}.${column.name} default`).toBe(column.hasDefault);
      }
      expect(constraints.filter((c) => c.contype === "CONSTR_CHECK").map((c) => c.conname).sort())
        .toEqual(config.checks.map((check) => check.name).sort());
      for (const check of config.checks) {
        const expression = new PgDialect().sqlToQuery(check.value);
        expect(expression.params).toHaveLength(0);
        const expected = nodes(await parse(`SELECT ${expression.sql}`), "ResTarget")[0]!.val;
        const actual = constraints.find((constraint) => constraint.conname === check.name)!.raw_expr;
        expect(normalizeExpression(actual), check.name).toEqual(normalizeExpression(expected));
      }
      expect(constraints.filter((c) => c.contype === "CONSTR_UNIQUE").map((c) => strings(c.keys).join(",")).sort())
        .toEqual(config.uniqueConstraints.map((key) => key.columns.map((col) => col.name).join(",")).sort());

      const sqlForeignKeys = constraints.filter((c) => c.contype === "CONSTR_FOREIGN").map((key) => {
        const inlineColumn = columns.find((col) => nodes(col.constraints, "Constraint").includes(key));
        const local = inlineColumn ? [String(inlineColumn.colname)] : strings(key.fk_attrs);
        expect(key.fk_del_action).toBe("r"); // RESTRICT: no accidental cascade deletion.
        return `${local.join(",")}=>${relationName(key.pktable)}(${strings(key.pk_attrs).join(",")})`;
      });
      const drizzleForeignKeys = config.foreignKeys.map((key) => {
        const ref = key.reference();
        const target = getTableConfig(ref.foreignTable);
        expect(key.onDelete).toBe("restrict");
        return `${ref.columns.map((col) => col.name).join(",")}=>${target.schema}.${target.name}(${ref.foreignColumns.map((col) => col.name).join(",")})`;
      });
      expect(sqlForeignKeys.sort(), config.name).toEqual(drizzleForeignKeys.sort());
      const indexes = nodes(drafts[1]!.ast, "IndexStmt").filter((stmt) => relationName(stmt.relation) === `${config.schema}.${config.name}`);
      expect(indexes.map((stmt) => `${stmt.idxname}:${nodes(stmt.indexParams, "IndexElem").map((col) => col.name).join(",")}`).sort())
        .toEqual(config.indexes.map((idx) => `${idx.config.name}:${idx.config.columns.map((col) => "name" in col ? col.name : "expression").join(",")}`).sort());
    }
  });

  it("includes agency_id on every foreign key to a tenant child", () => {
    for (const config of configs) {
      for (const key of config.foreignKeys) {
        const ref = key.reference();
        const target = getTableConfig(ref.foreignTable);
        if (target.schema === "tenancy" && target.name !== "agencies" && target.name !== "permissions") {
          expect(ref.columns[0]?.name).toBe("agency_id");
          expect(ref.foreignColumns[0]?.name).toBe("agency_id");
        }
      }
    }
  });

  it("keeps platform identity independent and enables RLS for every private table", () => {
    const platformIdentity = getTableConfig(schema.platformAdminIdentities);
    expect(platformIdentity.schema).toBe("platform");
    expect(platformIdentity.foreignKeys).toHaveLength(0);
    for (const config of configs.filter((c) => c.name !== "permissions")) expect(config.enableRLS).toBe(true);
    expect(record(schema.platformAdminIdentities.state).default).toBe("disabled");
  });
});
