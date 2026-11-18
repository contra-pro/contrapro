import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../packages/infrastructure/database/package.json',import.meta.url));
const {parse}=require('pgsql-parser');
const sql=await readFile(new URL('../docs/canonical-acceptance/a02-temporary/authority-supplement.sql',import.meta.url),'utf8');
const code=sql.replace(/^--.*$/gm,'');
test('supplement parses offline with psql control commands removed; never executes SQL',async()=>{
  const plain=code.replace(/^\\gset\s*$/gm,';').replace(/^\\.*$/gm,'');
  await parse(plain);
});
test('read-only, bounded and fail closed on wrong connection; ends in rollback',()=>{
  assert.match(code,/BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY/);
  for(const setting of ["statement_timeout='5000ms'","lock_timeout='2000ms'","idle_in_transaction_session_timeout='10000ms'",'ON_ERROR_STOP on'])assert.ok(code.includes(setting));
  assert.match(code,/\\if :supplement_guard_ok[\s\S]*ROLLBACK;\s*SELECT 1\/0 AS supplement_blocked/);
  assert.match(code,/ROLLBACK;\s*\\echo SUPPLEMENT_CAPTURED/);
  assert.doesNotMatch(code.replace(/'(?:[^']|'')*'/g,"''"),/\b(INSERT|DELETE|UPDATE|GRANT|REVOKE|CREATE|ALTER|DROP|CALL|DO|TRUNCATE|COMMIT)\b/i);
});
test('no repeat of established history, SELECT/DELETE grants, memberships or Auth trigger counts',()=>{
  assert.doesNotMatch(code,/schema_migrations|pg_auth_members|administrative_delete|observer_select|administrative_cleanup_bypasses_rls|hook_inventory_within_bound/);
  assert.match(code,/has_language_privilege\('contratpro_identity_writer','plpgsql','USAGE'\)/);
  assert.match(code,/has_any_column_privilege\(current_user,'identity.users','UPDATE'\)/);
});
test('cleanup structural predicates match the actual cleanup guard, not a separate approximation',async()=>{
  const cleanup=await readFile(new URL('../docs/canonical-acceptance/a02-temporary/cleanup.sql.in',import.meta.url),'utf8');
  const predicate=cleanup.slice(cleanup.indexOf(" IF (SELECT count(*) FROM pg_constraint")+4,cleanup.indexOf(" THEN RAISE EXCEPTION 'A02 unexpected dependency'"));
  const start=code.indexOf('SELECT NOT (')+'SELECT NOT ('.length;
  const end=code.indexOf(') AS cleanup_catalog_contract_ok');
  const normalize=text=>text.replace(/\s+/g,'').trim();
  assert.equal(normalize(code.slice(start,end)),normalize(predicate));
});
test('only six exact recovered event references are requested, no handler invocation or source disclosure',async()=>{
  const expected=[['issue_graphql_placeholder','sql_drop','set_graphql_placeholder'],['issue_pg_cron_access','ddl_command_end','grant_pg_cron_access'],
    ['issue_pg_graphql_access','ddl_command_end','grant_pg_graphql_access'],['issue_pg_net_access','ddl_command_end','grant_pg_net_access'],
    ['pgrst_ddl_watch','ddl_command_end','pgrst_ddl_watch'],['pgrst_drop_watch','sql_drop','pgrst_drop_watch']];
  for(const [trigger,event,handler] of expected)assert.ok(code.includes(`('${trigger}','${event}','extensions.${handler}()')`));
  assert.match(code,/LIMIT 6/);assert.match(code,/cardinality\(e.evttags\)<=32/);
  assert.doesNotMatch(code,/FROM auth\.|FROM identity\.|FROM tenancy\.|\bprosrc\b|SELECT\s+\*/i);
  const masked=code.replace(/'(?:[^']|'')*'/g,"''");assert.doesNotMatch(masked,/extensions\.\w+\(/);
  assert.match(code,/md5\(pg_get_functiondef\(p.oid\)\)/);
  const plain=code.replace(/^\\gset\s*$/gm,';').replace(/^\\.*$/gm,'');
  const targets=[];
  function visit(value){
    if(Array.isArray(value)){value.forEach(visit);return;}
    if(!value||typeof value!=='object')return;
    for(const [key,child] of Object.entries(value)){if(key==='ResTarget')targets.push(child);visit(child);}
  }
  visit(await parse(plain));
  assert.ok(targets.length>0);
  for(const target of targets){
    assert.notEqual(JSON.stringify(target.val?.ColumnRef?.fields),JSON.stringify([{String:{sval:'p'}},{String:{sval:'proconfig'}}]));
    assert.ok(!JSON.stringify(target.val?.FuncCall?.funcname??[]).includes('pg_get_functiondef'));
  }
});
