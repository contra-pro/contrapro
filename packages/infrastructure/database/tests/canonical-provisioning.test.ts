import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "pgsql-parser";
import { parsePlPgSQL } from "libpg-query";
import { nodes } from "./sql-helpers";

const sql = readFileSync(new URL("../../../../supabase/migrations/20261116000700_canonical_provisioning.sql", import.meta.url), "utf8");
const body = sql.split("CREATE FUNCTION public.contratpro_provision_identity()")[1]!.split("$f$;")[0]!;
const bridge = sql.split("CREATE FUNCTION app_private.provisioning_subject()")[1]!.split("$bridge$;")[0]!;
const bridgeBody = bridge.split("AS $bridge$")[1]!.replace(/--[^\n]*/g, "");
describe("canonical provisioning: offline SQL contract, not live enforcement proof", () => {
  it("parses SQL and PL/pgSQL without executing them", async () => {
    const ast = await parse(sql); expect(await parsePlPgSQL(sql)).toBeDefined();
    expect(nodes(ast, "CreateFunctionStmt")).toHaveLength(2);
    expect(nodes(ast, "CreatePolicyStmt")).toHaveLength(4);
    expect(nodes(ast, "CreateStmt")).toHaveLength(0);
    expect(nodes(ast, "TransactionStmt")).toHaveLength(0);
  });
  it("has no identity arguments and derives only the current authenticated subject", () => {
    expect(sql).toContain("contratpro_provision_identity() RETURNS text");
    expect(body).toContain("subject uuid:=app_private.provisioning_subject()");
    expect(body).toContain("IF subject IS NULL THEN RAISE EXCEPTION 'Denied'");
    expect(body).not.toMatch(/auth\.|request\.jwt|current_setting/);
    expect(body).not.toMatch(/\bemail\b|p_user|p_subject|p_email/i);
  });
  it("inserts a distinct active user and mapping only, with no RETURNING exposure", () => {
    expect(body).toContain("canonical:=gen_random_uuid()"); expect(body).toContain("IF canonical=subject THEN RAISE EXCEPTION");
    expect(body).toContain("INSERT INTO identity.users(id,state) VALUES(canonical,'active')");
    expect(body).toContain("INSERT INTO identity.supabase_users(supabase_user_id,user_id) VALUES(subject,canonical)");
    expect(body.match(/INSERT INTO/g)).toHaveLength(2);
    expect(body).not.toMatch(/\b(?:UPDATE|DELETE|COMMIT|ROLLBACK)\b|INSERT[^;]+RETURNING/i);
    expect(body).not.toMatch(/tenancy\.|platform\.|auth\.users/);
  });
  it("checks existing state and never reactivates or repairs an existing link", () => {
    expect(body.match(/canonical_state IS DISTINCT FROM 'active'/g)).toHaveLength(2);
    expect(body.match(/RETURN 'existing'/g)).toHaveLength(2);
    expect(body.indexOf("RETURN 'existing'")).toBeLessThan(body.indexOf("INSERT INTO identity.users"));
    expect(body).toContain("IF NOT FOUND THEN RAISE EXCEPTION 'Canonical identity conflict'");
    expect(body).not.toMatch(/ON CONFLICT.*UPDATE|SET state|SET user_id|LOOP/i);
  });
  it("isolates both candidate inserts inside the unique-conflict subtransaction", () => {
    expect(body).toContain("BEGIN\n   -- No RETURNING");
    expect(body.indexOf("INSERT INTO identity.users")).toBeLessThan(body.indexOf("INSERT INTO identity.supabase_users"));
    expect(body.indexOf("INSERT INTO identity.supabase_users")).toBeLessThan(body.indexOf("EXCEPTION WHEN unique_violation"));
    const conflict = body.split("EXCEPTION WHEN unique_violation")[1]!;
    expect(conflict).toContain("WHERE link.supabase_user_id=subject");
    expect(conflict).toContain("canonical_state IS DISTINCT FROM 'active'");
    expect(conflict).not.toContain("INSERT INTO"); expect(body).toContain("VOLATILE SECURITY DEFINER");
  });
  it("keeps the capability subject to FORCE RLS and grants only narrow identity columns", () => {
    expect(sql).toContain("NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS");
    expect(sql).toContain("SECURITY DEFINER SET search_path=pg_catalog SET row_security=on");
    expect(sql).toContain("NOT relrowsecurity OR NOT relforcerowsecurity");
    expect(sql).toContain("WITH CHECK(supabase_user_id=(SELECT app_private.provisioning_subject()) AND user_id<>supabase_user_id");
    expect(sql).not.toMatch(/GRANT\s+(?:UPDATE|DELETE|ALL)|ALTER\s+TABLE|ALTER\s+POLICY|ALTER\s+DEFAULT\s+PRIVILEGES/i);
    expect(sql).not.toMatch(/GRANT[^;]+ON tenancy\.|GRANT[^;]+TO authenticated/i);
  });
  it("is disabled in the database and hardens PUBLIC before transferring ownership", () => {
    const revoke = sql.indexOf("REVOKE ALL ON FUNCTION public.contratpro_provision_identity()");
    const owner = sql.indexOf("ALTER FUNCTION public.contratpro_provision_identity() OWNER TO contratpro_identity_writer");
    expect(revoke).toBeGreaterThan(-1); expect(owner).toBeGreaterThan(revoke);
    expect(sql.slice(revoke, owner)).toContain("FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime,contratpro_agency_writer");
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.contratpro_provision_identity/);
    expect(sql).toContain("OR acl.grantee<>p.proowner");
    expect(sql).toContain("REVOKE CREATE ON SCHEMA public FROM contratpro_identity_writer");
    expect(sql).toContain("REVOKE contratpro_identity_writer FROM postgres GRANTED BY postgres");
    expect(sql).toContain("member<>'postgres'::regrole OR NOT admin_option OR inherit_option OR set_option");
  });
  it("requires all three exact managed helpers and PUBLIC EXECUTE without delegating privileges", () => {
    const guard = sql.split("DO $guard$")[1]!.split("$guard$;")[0]!;
    const assertion = sql.split("DO $assert$")[1]!;
    for (const section of [guard, assertion]) {
      for (const signature of ["auth.uid()", "auth.role()", "auth.jwt()"]) expect(section).toContain(`to_regprocedure('${signature}')`);
      expect(section).toContain("p.prokind='f' AND p.pronargs=0");
      expect(section).toContain("WHEN 'uid' THEN 'uuid'::regtype WHEN 'role' THEN 'text'::regtype ELSE 'jsonb'::regtype END");
      expect(section).toContain("helper_acl.grantee=0 AND helper_acl.privilege_type='EXECUTE'");
      expect(section).toContain("pg_catalog.acldefault('f',p.proowner)");
      expect(section).toContain("<>3");
    }
    expect(assertion).toContain("pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE')");
    expect(sql).not.toMatch(/(?:GRANT|REVOKE)[^;]*ON FUNCTION auth\./i);
    expect(sql).not.toContain("EXECUTE WITH GRANT OPTION");
  });
  it("isolates managed auth-schema access to the data-free postgres bridge", () => {
    expect(sql).toContain("GRANT USAGE ON SCHEMA identity,app_private,public TO contratpro_identity_writer;");
    expect(sql).not.toMatch(/GRANT[^;]*ON SCHEMA[^;]*\bauth\b/i);
    expect(bridge).toContain("RETURNS uuid\nLANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog SET row_security=on");
    expect(sql).not.toMatch(/ALTER FUNCTION app_private\.provisioning_subject/);
    const dataFree = bridgeBody.replace(/EXTRACT\(EPOCH FROM pg_catalog\.clock_timestamp\(\)\)/g, "0").replace(/IS DISTINCT FROM/g, "<>");
    expect(dataFree).not.toMatch(/\b(?:FROM|JOIN|INSERT|UPDATE|DELETE|EXECUTE|PERFORM|CALL)\b/i);
    expect(dataFree).not.toMatch(/\b(?:identity|tenancy|platform|migration_control)\./i);
    const permitted = ["pg_catalog.current_setting", "auth.uid", "auth.role", "auth.jwt", "pg_catalog.jsonb_typeof", "pg_catalog.trunc", "EXTRACT", "pg_catalog.clock_timestamp", "OR"];
    for (const match of bridgeBody.matchAll(/\b([a-z_][a-z_0-9.]*)\s*\(/gi)) expect(permitted).toContain(match[1]);
    const policies = sql.split("CREATE POLICY identity_writer_mapping_read")[1]!.split("CREATE FUNCTION public.contratpro_provision_identity")[0]!;
    expect(policies).not.toMatch(/\bauth\.|current_setting/);
    expect(policies.match(/app_private\.provisioning_subject\(\)/g)).toHaveLength(4);
  });
  it.each([
    ["non-gateway session", "session_user<>'authenticator'"],
    ["wrong effective request role", "pg_catalog.current_setting('role',true) IS DISTINCT FROM 'authenticated'"],
    ["missing subject", "subject IS NULL"],
    ["absent or malformed claims", "pg_catalog.jsonb_typeof(claims) IS DISTINCT FROM 'object'"],
    ["malformed subject", "pg_catalog.jsonb_typeof(claims->'sub') IS DISTINCT FROM 'string'"],
    ["malformed role", "pg_catalog.jsonb_typeof(claims->'role') IS DISTINCT FROM 'string'"],
    ["inconsistent subject", "(claims->>'sub')::uuid IS DISTINCT FROM subject"],
    ["inconsistent role", "(claims->>'role') IS DISTINCT FROM claim_role"],
    ["non-authenticated role", "claim_role IS DISTINCT FROM 'authenticated'"],
    ["wrong issuer", "(claims->>'iss') IS DISTINCT FROM 'https://gllsiklbvqpxzucvkehw.supabase.co/auth/v1'"],
    ["wrong audience", "(claims->>'aud') IS DISTINCT FROM 'authenticated'"],
    ["missing/malformed anonymous flag", "pg_catalog.jsonb_typeof(claims->'is_anonymous') IS DISTINCT FROM 'boolean'"],
    ["anonymous context", "(claims->>'is_anonymous') IS DISTINCT FROM 'false'"],
    ["missing/malformed expiry", "pg_catalog.jsonb_typeof(claims->'exp') IS DISTINCT FROM 'number'"],
    ["fractional expiry", "expires<>pg_catalog.trunc(expires)"],
    ["invalid expiry bounds", "expires<=0 OR expires>9007199254740"],
    ["expired context", "expires<=EXTRACT(EPOCH FROM pg_catalog.clock_timestamp())"],
  ])("has an explicit fail-closed %s rejection contract (static, not runtime execution)", (_case, condition) => {
    expect(bridgeBody).toContain(condition);
    expect(bridgeBody).toContain("EXCEPTION WHEN OTHERS THEN");
    expect(bridgeBody).toContain("RAISE EXCEPTION 'Denied' USING ERRCODE='42501'");
    expect(bridgeBody.match(/RETURN subject;/g)).toHaveLength(1);
    expect(bridgeBody.indexOf(condition)).toBeLessThan(bridgeBody.indexOf("RETURN subject;"));
  });
  it("denies ordinary callers bridge EXECUTE and asserts its exact owner, settings and ACL", () => {
    expect(sql).toContain("REVOKE ALL ON FUNCTION app_private.provisioning_subject() FROM PUBLIC,anon,authenticated,authenticator,service_role,contratpro_runtime,contratpro_platform_runtime,contratpro_agency_writer,contratpro_identity_writer;");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION app_private.provisioning_subject() TO contratpro_identity_writer;");
    const assertion = sql.split("DO $assert$")[1]!;
    expect(assertion).toContain("p.proowner='postgres'::regrole AND p.prokind='f' AND p.pronargs=0 AND p.prorettype='uuid'::regtype");
    expect(assertion).toContain("p.prosecdef AND p.provolatile='v'");
    expect(assertion).toContain("pg_catalog.cardinality(COALESCE(p.proconfig,'{}'::text[]))=2");
    expect(assertion).toContain("acl.grantee='contratpro_identity_writer'::regrole AND acl.privilege_type='EXECUTE' AND NOT acl.is_grantable");
    expect(assertion).toContain("pg_catalog.has_function_privilege(r.oid,'app_private.provisioning_subject()','EXECUTE')");
    expect(sql).not.toMatch(/GRANT[^;]+WITH GRANT OPTION/);
  });
});
