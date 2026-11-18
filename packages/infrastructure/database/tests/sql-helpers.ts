import { readFileSync } from "node:fs";
import { parse } from "pgsql-parser";

export const draftNames = ["0000_roles.sql", "0001_schema.sql", "0002_context.sql", "0003_rls_grants.sql"] as const;

export function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected AST object");
  return value as Record<string, unknown>;
}

export function nodes(value: unknown, name: string): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap((item) => nodes(item, name));
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => key === name ? [record(child)] : nodes(child, name));
}

export const strings = (value: unknown) => [
  ...nodes(value, "String").map((node) => String(node.sval)),
  ...nodes(value, "A_Const").filter((node) => node.sval !== undefined)
    .map((node) => String(record(node.sval).sval)),
];
export const relationName = (value: unknown) => {
  const relation = record(value);
  return `${String(relation.schemaname)}.${String(relation.relname)}`;
};

export async function loadDrafts() {
  const drafts = [];
  for (const name of draftNames) {
    const source = readFileSync(new URL(`../migrations/drafts/${name}`, import.meta.url), "utf8");
    drafts.push({ name, source, ast: await parse(source) });
  }
  return drafts;
}
