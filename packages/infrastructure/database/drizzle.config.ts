import { defineConfig } from "drizzle-kit";

// Offline generation configuration only. Deliberately no URL or dbCredentials.
// Generated output is NOT a deployable migration: reviewed drafts also supply FORCE RLS,
// roles, functions, policies and grants. The guarded operational runner never uses
// this config; there is no Drizzle push/migrate/studio integration.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./.generated",
  strict: true,
  verbose: true,
});
