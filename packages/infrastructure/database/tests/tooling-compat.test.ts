import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const corePath = require.resolve("@esbuild-kit/core-utils");
const coreRequire = createRequire(corePath);
const compiler = coreRequire("esbuild") as { version: string; stop?: () => void };
const core = require(corePath) as {
  transformSync(source: string, file: string, options?: { format: string }): { code: string };
  transform(source: string, file: string, options?: { format: string }): Promise<{ code: string }>;
};
afterAll(() => compiler.stop?.()); // Only the compiler service started in this test worker.

it("uses the narrowly pinned patched esbuild in the legacy tooling chain", () => {
  expect(compiler.version).toBe("0.25.12");
});

it("preserves synchronous TypeScript transformation through actual core-utils", () => {
  const result = core.transformSync("export const marker: number = 42;", "synthetic-fixture.ts", { format: "cjs" });
  expect(result.code).toContain("42");
  expect(result.code).not.toContain("marker: number");
});

it("transforms the actual Drizzle configuration without executing or connecting it", async () => {
  const file = fileURLToPath(new URL("../drizzle.config.ts", import.meta.url));
  const result = await core.transform(readFileSync(file, "utf8"), file, { format: "esm" });
  expect(result.code).toContain("defineConfig");
  expect(result.code).toContain("postgresql");
});
