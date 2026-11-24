import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { baseline,bootstrapSQL,requiredAdapterRoles,verifyAdapterRoles } from './baseline.mjs';

const roles=()=>requiredAdapterRoles.map(rolname=>({rolname,rolsuper:false,rolbypassrls:false,rolcanlogin:false,
  rolcreatedb:false,rolcreaterole:false,rolreplication:false,rolinherit:!['authenticator','contratpro_runtime','contratpro_platform_runtime'].includes(rolname)}));
const agencyURL=new URL('../../../../../supabase/migrations/20261115000500_agency_management.sql',import.meta.url);
test('minimum authenticator declaration has no login, inheritance or elevated capabilities',()=>{
  assert.match(bootstrapSQL,/CREATE ROLE authenticator NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEROLE NOCREATEDB NOREPLICATION;/);
  assert.doesNotMatch(bootstrapSQL,/GRANT[^;]*TO authenticator/);
  for(const name of requiredAdapterRoles) assert.match(bootstrapSQL,new RegExp(`CREATE ROLE ${name} NOLOGIN NOSUPERUSER NOBYPASSRLS`));
  verifyAdapterRoles(roles(),[]);
});
test('missing/duplicate roles, privilege escalation and runtime memberships fail closed',()=>{
  assert.throws(()=>verifyAdapterRoles(roles().filter(r=>r.rolname!=='authenticator'),[]),e=>e.code==='BASELINE_ROLE_MISMATCH');
  for(const attr of ['rolsuper','rolbypassrls','rolcanlogin','rolcreatedb','rolcreaterole','rolreplication','rolinherit']) {
    const rows=roles();rows.find(r=>r.rolname==='authenticator')[attr]=true;
    assert.throws(()=>verifyAdapterRoles(rows,[]));
  }
  for(const options of [{admin_option:true},{set_option:true},{inherit_option:true}]) assert.throws(()=>verifyAdapterRoles(roles(),[options]));
  assert.throws(()=>verifyAdapterRoles([...roles(),roles()[0]],[]));
  assert.throws(()=>verifyAdapterRoles(undefined,[]));
});
test('original writer assertions and temporary PG17 owner authority remain exact',()=>{
  const sql=readFileSync(agencyURL,'utf8');
  assert.ok(sql.includes("pg_has_role('authenticator','contratpro_agency_writer','SET')"));
  assert.ok(sql.includes('GRANT contratpro_agency_writer TO postgres WITH ADMIN FALSE, INHERIT FALSE, SET TRUE GRANTED BY postgres'));
  assert.match(sql,/REVOKE contratpro_agency_writer FROM postgres/);
  assert.doesNotMatch(bootstrapSQL,/GRANT\s+(?:authenticated|anon|service_role|contratpro_\w+)\s+TO\s+authenticator/i);
});
test('mock baseline validates role requirements before applying any migration and never rewrites sources',async()=>{
  const original=readFileSync(agencyURL);const hash=createHash('sha256').update(original).digest('hex');
  const calls=[];
  await baseline({query:async(sql)=>{
    calls.push(sql);
    if(sql.includes('SELECT rolname')) return {rows:roles()};
    if(sql.includes('SELECT m.roleid')) return {rows:[]};
    return {rows:[]};
  }});
  assert.equal(calls[0],bootstrapSQL);
  assert.ok(calls[1].includes('SELECT rolname'));assert.ok(calls[2].includes('SELECT m.roleid'));
  const agency=calls.findIndex(sql=>sql.includes("pg_has_role('authenticator','contratpro_agency_writer','SET')"));
  assert.ok(agency>2);assert.ok(calls[agency].includes(original.toString()));
  assert.equal(createHash('sha256').update(readFileSync(agencyURL)).digest('hex'),hash);
});
test('missing role blocks migration application in mock baseline',async()=>{
  let calls=0;
  await assert.rejects(()=>baseline({query:async(sql)=>{
    calls++;
    if(sql.includes('SELECT rolname')) return {rows:roles().slice(1)};
    return {rows:[]};
  }}),e=>e.code==='BASELINE_ROLE_MISMATCH');
  assert.equal(calls,3);
});
test('adapter cannot construct a database client or accept a Production URL',()=>{
  const source=readFileSync(new URL('./baseline.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/process\.env|new Client|\.connect\(|connectionString|postgres(?:ql)?:\/\//);
});
