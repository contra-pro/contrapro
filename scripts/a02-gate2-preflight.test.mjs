import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {createRequire} from 'node:module';
import {join,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {prepareA02NativePackage,materializeA02NativePackage,nominateSyntheticCohort,syntheticCredentialProvider} from './a02-native-package.mjs';
import {renderCohortArtifact} from './a02-cohort-artifacts.mjs';
const require=createRequire(new URL('../packages/infrastructure/database/package.json',import.meta.url));
const {parse}=require('pgsql-parser');
const now=1900000000000;
const ids=['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003'];
const cohort={projectRef:'gllsiklbvqpxzucvkehw',A:ids[0],B:ids[1],U:ids[2],expiresAt:new Date(now+600000).toISOString()};
const sha=sql=>createHash('sha256').update(sql).digest('hex');
async function installed(){const sql=await renderCohortArtifact('install',cohort,{now});return {kind:'install',version:'20300317180000',sql,sha256:sha(sql)};}
test('nomination is three distinct random UUID proposals, never a database existence claim',()=>{
  let index=0;const nominated=nominateSyntheticCohort({now,uuid:()=>ids[index++]});
  assert.deepEqual(nominated,cohort);assert.equal(index,3);
  assert.throws(()=>nominateSyntheticCohort({now,uuid:()=>ids[0]}),/A02_ARTIFACT_BLOCKED/);
});
test('new synthetic credentials stay behind disposable synchronous memory port',()=>{
  let index=0;const secrets=syntheticCredentialProvider(cohort,{approvedDomain:'synthetic.invalid',domainOwnershipConfirmed:true,bytes:()=>Buffer.alloc(32,++index)});
  const a=secrets.provider('A'),b=secrets.provider('B');
  assert.equal(a.email,`a02-a-${ids[0]}@synthetic.invalid`);assert.notEqual(a.password,b.password);assert.ok(a.password.length>=40);
  assert.throws(()=>{a.password='changed';},TypeError);assert.equal(secrets.provider('A').password,a.password);
  assert.equal(JSON.stringify(secrets),'{}');secrets.dispose();assert.throws(()=>secrets.provider('A'),/A02_CREDENTIAL_INPUT_BLOCKED/);
});
test('unapproved domains and unknown labels fail without producing credential output',()=>{
  assert.throws(()=>syntheticCredentialProvider(cohort,{approvedDomain:'synthetic.invalid',domainOwnershipConfirmed:false}),/A02_PACKAGE_BLOCKED/);
  assert.throws(()=>syntheticCredentialProvider(cohort,{approvedDomain:'https://other.example/path',domainOwnershipConfirmed:true}),/A02_PACKAGE_BLOCKED/);
  const secrets=syntheticCredentialProvider(cohort,{approvedDomain:'synthetic.invalid',domainOwnershipConfirmed:true,bytes:()=>Buffer.alloc(32,1)});
  assert.throws(()=>secrets.provider('OTHER'),/A02_CREDENTIAL_INPUT_BLOCKED/);secrets.dispose();
});
test('isolated native package has exact eight baseline files and only ONE pending install',async()=>{
  const result=await prepareA02NativePackage({stage:'install',version:'20300317180000',cohort,appliedTemporary:[]},{now});
  assert.equal(result.manifest.requiredPending.length,1);assert.equal(result.manifest.expectedRemoteBefore.length,8);
  assert.equal(Object.keys(result.files).filter(name=>name.endsWith('.sql')).length,9);
  assert.ok(Object.keys(result.files).every(name=>/^supabase\/(config\.toml|migrations\/\d{14}_[a-z0-9_]+\.sql)$/.test(name)));
  assert.ok(!Object.keys(result.files).some(name=>name.includes('_remove.sql')||name.includes('_disable.sql')));
  assert.match(result.files['supabase/config.toml'],/project_id = "contratpro-a02-gllsiklbvqpxzucvkehw"/);
  assert.equal(result.manifest.liveExecutionAuthorized,false);
  for(const [path,content] of Object.entries(result.files))assert.equal(result.manifest.files[path],sha(content));
  assert.equal((await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(name=>name.endsWith('.sql')).length,8);
});
test('removal after expiry preserves archived install bytes and stages only removal',async()=>{
  const receipt=await installed();const result=await prepareA02NativePackage({stage:'remove',version:'20300317190000',cohort,appliedTemporary:[receipt]},{now:now+1000000});
  assert.equal(result.files[`supabase/migrations/${receipt.version}_a02_fixture_install.sql`],receipt.sql);
  assert.deepEqual(result.manifest.requiredPending,['20300317190000']);assert.equal(result.manifest.expectedRemoteBefore.length,9);
  await parse(result.files[result.manifest.pending]);
});
test('explicit materializer writes only an isolated temporary package with manifest last',async()=>{
  const result=await materializeA02NativePackage({stage:'install',version:'20300317180000',cohort,appliedTemporary:[]},{now});
  assert.match(relative(tmpdir(),result.root),/^contratpro-a02-package-/);
  const manifest=JSON.parse(await readFile(join(result.root,'a02-package-manifest.json'),'utf8'));
  assert.equal(manifest.liveExecutionAuthorized,false);
  for(const [path,expected] of Object.entries(manifest.files))assert.equal(sha(await readFile(join(result.root,path))),expected);
});
test('independent disable then removal retain both native history receipts',async()=>{
  const install=await installed();
  const disabled=await prepareA02NativePackage({stage:'disable',version:'20300317185000',cohort,appliedTemporary:[install]},{now:now+1000000});
  const sql=disabled.files[disabled.manifest.pending];await parse(sql);
  assert.match(sql,/REVOKE ALL ON FUNCTION public.contratpro_a02_fixture_provision\(\) FROM authenticated/);
  assert.doesNotMatch(sql,/DROP FUNCTION|GRANT EXECUTE/);
  const disable={kind:'disable',version:'20300317185000',sql,sha256:sha(sql)};
  const removal=await prepareA02NativePackage({stage:'remove',version:'20300317190000',cohort,appliedTemporary:[install,disable]},{now:now+1000000});
  assert.equal(removal.manifest.expectedRemoteBefore.length,10);assert.equal(removal.manifest.requiredPending.length,1);
});
test('missing, reordered, mismatched, tampered or colliding history BLOCKS packaging',async()=>{
  const receipt=await installed();
  for(const input of [
    {stage:'remove',version:'20300317190000',cohort,appliedTemporary:[]},
    {stage:'install',version:'20300317190000',cohort,appliedTemporary:[receipt]},
    {stage:'remove',version:receipt.version,cohort,appliedTemporary:[receipt]},
    {stage:'remove',version:'20300317190000',cohort,appliedTemporary:[{...receipt,sql:receipt.sql+'-- tampered'}]},
    {stage:'remove',version:'20300317190000',cohort,appliedTemporary:[{...receipt,kind:'remove'}]},
    {stage:'install',version:'20261116000700',cohort,appliedTemporary:[]},
  ])await assert.rejects(prepareA02NativePackage(input,{now}),/A02_PACKAGE_BLOCKED/);
});
test('authority/hook evidence is bounded metadata only; cannot call provisioning or reveal users',async()=>{
  const sql=await readFile(new URL('../docs/canonical-acceptance/a02-temporary/authority-evidence.sql',import.meta.url),'utf8');
  const code=sql.replace(/^--.*$/gm,'');
  assert.match(code,/BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY/);
  assert.doesNotMatch(code.replace(/'(?:[^']|'')*'/g,"''"),/\b(INSERT|UPDATE|DELETE FROM|GRANT|REVOKE|ALTER|CREATE FUNCTION|SET ROLE)\b/i);
  assert.doesNotMatch(code,/FROM auth\.users|SELECT\s+\*|password|token|recipient_email|prosrc/i);
  assert.match(code,/count\(\*\)<=16 AS hook_inventory_within_bound/);
  assert.match(code,/CREATE WITH GRANT OPTION/);
  assert.match(code,/METADATA_CAPTURED_MANUAL_AUTHORITY_AND_HOOK_REVIEW_REQUIRED/);
});
test('local migrations define only clients_guard, no Auth user business trigger',async()=>{
  const names=await readdir(new URL('../supabase/migrations/',import.meta.url));const triggers=[];
  for(const name of names.filter(name=>name.endsWith('.sql'))){
    const sql=await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8');
    triggers.push(...sql.matchAll(/CREATE TRIGGER\s+(\w+)[\s\S]*?ON\s+([\w.]+)\s+FOR EACH/gi));
  }
  assert.deepEqual(triggers.map(match=>[match[1],match[2]]),[['clients_guard','tenancy.clients']]);
});
