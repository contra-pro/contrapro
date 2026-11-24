import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../../../../../', import.meta.url);
export const requiredAdapterRoles=['anon','authenticated','authenticator','service_role','contratpro_runtime','contratpro_platform_runtime'];
export function verifyAdapterRoles(rows,memberships) {
  if(!Array.isArray(rows)||rows.length!==requiredAdapterRoles.length||!Array.isArray(memberships)||memberships.length!==0
    || requiredAdapterRoles.some(name=>{
      const matches=rows.filter(r=>r.rolname===name);
      if(matches.length!==1) return true;
      const r=matches[0];
      if(['rolsuper','rolbypassrls','rolcanlogin','rolcreatedb','rolcreaterole','rolreplication'].some(k=>r[k]!==false)) return true;
      return ['authenticator','contratpro_runtime','contratpro_platform_runtime'].includes(name)&&r.rolinherit!==false;
    })) throw Object.assign(new Error('Local adapter role requirements not satisfied'),{code:'BASELINE_ROLE_MISMATCH'});
}
// NOLOGIN authenticator is intentional: this harness never models gateway login.
// No runtime role needs memberships; bootstrap postgres is a LOCAL superuser.
export const bootstrapSQL=`
    CREATE ROLE anon NOLOGIN NOSUPERUSER NOBYPASSRLS;
    CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOBYPASSRLS;
    CREATE ROLE authenticator NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEROLE NOCREATEDB NOREPLICATION;
    CREATE ROLE service_role NOLOGIN NOSUPERUSER NOBYPASSRLS;
    CREATE ROLE contratpro_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
    CREATE ROLE contratpro_platform_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
      SET search_path=pg_catalog,pg_temp AS $$
      SELECT nullif(current_setting('rental_harness.subject',true),'')::uuid $$;
    REVOKE ALL ON FUNCTION auth.uid() FROM PUBLIC;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
  `;
export async function baseline(admin) {
  // Explicit LOCAL adapter, not a reconstruction of Supabase managed role authority.
  await admin.query(bootstrapSQL);
  const roleState=await admin.query(`SELECT rolname,rolsuper,rolbypassrls,rolcanlogin,rolcreatedb,rolcreaterole,rolreplication,rolinherit
    FROM pg_catalog.pg_roles WHERE rolname=ANY($1::text[])`,[requiredAdapterRoles]);
  const memberships=await admin.query(`SELECT m.roleid,m.member,m.admin_option,m.inherit_option,m.set_option
    FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles r ON r.oid=m.member
    WHERE r.rolname=ANY($1::text[])`,[requiredAdapterRoles]);
  verifyAdapterRoles(roleState.rows,memberships.rows);
  const files = [
    'supabase/migrations/20261115000100_foundation_schema.sql',
    'supabase/migrations/20261115000200_foundation_context.sql',
    'supabase/migrations/20261115000300_foundation_rls_grants.sql',
    'supabase/migrations/20261115000400_supabase_auth.sql',
    'supabase/migrations/20261115000500_agency_management.sql',
    'supabase/migrations/20261115000600_clients.sql',
    'supabase/migration-drafts/20261118000800_vehicles.sql',
  ];
  const manifest = [];
  for (const file of files) {
    const sql = await readFile(new URL(file, root), 'utf8');
    manifest.push({ file, sha256: createHash('sha256').update(sql).digest('hex') });
    await admin.query(`BEGIN;\n${sql}\nCOMMIT;`);
  }
  // Exact dependency projection, not application of all migration 0009.
  // No client receipt tests are repeated; 0007 and 0010-0012 are not dependencies
  // of these rental RPCs and their Production authority is NOT reconstructed.
  const file = 'supabase/migration-drafts/contratpro_0009_production_candidate_v3.sql';
  const sql = await readFile(new URL(file, root), 'utf8');
  const begin = 'CREATE FUNCTION app_private.receipt_auth_uid()';
  const end = '-- Dedicated least-privilege owner:';
  if (sql.split(begin).length !== 2 || sql.split(end).length !== 2) throw new Error('BASELINE_PROJECTION_CHANGED');
  const projection = sql.slice(sql.indexOf(begin), sql.indexOf(end));
  await admin.query(`BEGIN;\n${projection}\nCOMMIT;`);
  manifest.push({ file, projection: 'receipt bridge, canonical helper and existing hardening', sha256: createHash('sha256').update(projection).digest('hex') });
  return manifest;
}
