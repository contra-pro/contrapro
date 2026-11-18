import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("applies the complete receipt migration despite inherited default ACLs, preserving its strict capability assertions", async () => {
  // In-memory PostgreSQL only: no network, credentials or Supabase connection.
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE authenticator;
      CREATE ROLE unexpected_default_grantee;
      CREATE ROLE contratpro_migration_owner NOINHERIT;
      CREATE ROLE contratpro_runtime NOINHERIT; CREATE ROLE contratpro_platform_runtime NOINHERIT;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT null::uuid $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'authenticated'::text $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
      GRANT USAGE ON SCHEMA auth TO PUBLIC;`);
    const migrations = new URL("../../../../supabase/migrations/", import.meta.url);
    for (const file of readdirSync(migrations).sort()) {
      await db.exec(`BEGIN; ${readFileSync(new URL(file, migrations), "utf8")} COMMIT;`);
    }
    await db.exec(`ALTER DEFAULT PRIVILEGES IN SCHEMA app_private GRANT ALL ON TABLES TO authenticator,unexpected_default_grantee WITH GRANT OPTION;
      ALTER DEFAULT PRIVILEGES IN SCHEMA app_private GRANT EXECUTE ON FUNCTIONS TO authenticator,unexpected_default_grantee WITH GRANT OPTION;`);
    const sql = readFileSync(new URL("../../../../supabase/migration-drafts/20261118000900_client_creation_idempotency.sql", import.meta.url), "utf8");
    await db.exec(`BEGIN; ${sql} COMMIT;`);
    const acl = await db.query<{ name: string; grantee: string; privilege_type: string; is_grantable: boolean }>(`
      SELECT p.proname AS name,pg_get_userbyid(a.grantee) AS grantee,a.privilege_type,a.is_grantable
      FROM pg_proc p,LATERAL aclexplode(p.proacl) a
      WHERE p.oid IN ('app_private.capture_client_creation()'::regprocedure,'app_private.match_client_creation(uuid,uuid,jsonb)'::regprocedure)
      AND a.grantee<>p.proowner`);
    expect(acl.rows).toEqual([{ name: "match_client_creation", grantee: "authenticated", privilege_type: "EXECUTE", is_grantable: false }]);
    // The original fail-closed verifier must still detect later ACL drift.
    const verifier = sql.slice(sql.indexOf("DO $verify$"));
    await db.exec("GRANT EXECUTE ON FUNCTION app_private.capture_client_creation() TO authenticator");
    await expect(db.exec(verifier)).rejects.toThrow("Client receipt capability boundary mismatch");
  } finally {
    await db.close();
  }
}, 120_000);
