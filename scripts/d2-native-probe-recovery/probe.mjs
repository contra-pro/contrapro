import assert from 'node:assert/strict';
export const failureMessage='D2 controlled rollback injection';
export function rollbackProbe(sql){if(!/COMMIT;\s*$/.test(sql))throw Error('No final commit to replace');return sql.replace(/COMMIT;\s*$/,()=>"DO $d2_fault$BEGIN RAISE EXCEPTION 'D2 controlled rollback injection';END $d2_fault$; COMMIT;");}
export function expectedProbeError(e){return e.code==='P0001'&&e.message===failureMessage;}
export async function verifyCheckpoint(boot,expectedHistory){
 // All reads run in one explicit read-only transaction; this precedes password rotation.
 await boot.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');try{
  const roles=(await boot.query("SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolreplication,rolinherit FROM pg_roles WHERE rolname IN('postgres','authenticator') ORDER BY rolname")).rows;assert.equal(roles.length,2);const p=roles.find(x=>x.rolname==='postgres'),a=roles.find(x=>x.rolname==='authenticator');assert(p.rolcanlogin&&!p.rolsuper&&p.rolbypassrls&&p.rolcreaterole&&p.rolcreatedb&&p.rolreplication&&p.rolinherit);assert(a.rolcanlogin&&!a.rolsuper&&!a.rolbypassrls&&!a.rolcreaterole&&!a.rolcreatedb&&!a.rolreplication&&!a.rolinherit);
  assert.equal((await boot.query("SELECT count(*)::int n FROM pg_database WHERE datname='contratpro_d2_native' AND datdba='postgres'::regrole")).rows[0].n,1);
  await boot.query('COMMIT');
 }catch(e){await boot.query('ROLLBACK');throw e;}
 // The bootstrap connection initially uses database postgres. Read the completed
 // fixture through a separate TLS bootstrap connection to its dedicated database.
 const config=boot.__d2CheckpointConnect;if(!config)throw Error('Explicit checkpoint client factory missing');
 const db=await config();try{await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  assert.deepEqual((await db.query('SELECT version FROM supabase_migrations.schema_migrations ORDER BY version')).rows.map(x=>x.version),expectedHistory);
  assert.equal((await db.query("SELECT count(*)::int n FROM pg_roles WHERE rolname IN('contratpro_rental_writer','contratpro_delivery_worker','contratpro_sheets_worker','contratpro_billing_writer','contratpro_a1_writer','contratpro_maintenance')")).rows[0].n,0);
  assert.equal((await db.query("SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app_private' AND c.relkind='r'")).rows[0].n,1);
  assert.equal((await db.query("SELECT to_regclass('tenancy.rental_contracts') IS NULL absent")).rows[0].absent,true);
  assert.equal((await db.query('SELECT count(*)::int n FROM auth.users')).rows[0].n,2);assert.equal((await db.query('SELECT count(*)::int n FROM identity.supabase_users')).rows[0].n,2);assert.equal((await db.query('SELECT count(*)::int n FROM tenancy.agencies')).rows[0].n,2);
  assert.equal((await db.query('SELECT count(*)::int n FROM storage.buckets')).rows[0].n,0);assert.equal((await db.query('SELECT count(*)::int n FROM storage.objects')).rows[0].n,0);
  const body=(await db.query("SELECT prosrc FROM pg_proc WHERE oid='app_private.receipt_auth_uid()'::regprocedure")).rows[0].prosrc;assert(body.includes('Synthetic gateway boundary'));
  await db.query('COMMIT');
 }catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}
}
