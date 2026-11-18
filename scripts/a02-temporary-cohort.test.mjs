import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import { renderCohortArtifact,renderCleanup,validateCohort } from './a02-cohort-artifacts.mjs';
import { bootstrapA02Sessions,createA02HttpsTransport,createFixtureProvisioner } from './a02-session-transport.mjs';
import { createCategoryAObserver } from './canonical-category-a-observer.mjs';
import { collectCase,loadPlan } from './canonical-security-acceptance.mjs';

const require=createRequire(new URL('../packages/infrastructure/database/package.json',import.meta.url));
const {parse}=require('pgsql-parser'); // local parser only, never a PostgreSQL connection
const now=1900000000000;
const A='10000000-0000-4000-8000-000000000001',B='10000000-0000-4000-8000-000000000002',U='10000000-0000-4000-8000-000000000003';
const CA='20000000-0000-4000-8000-000000000001',CB='20000000-0000-4000-8000-000000000002';
const cohort={A,B,U,projectRef:'gllsiklbvqpxzucvkehw',expiresAt:new Date(now+600000).toISOString()};
const origin='https://gllsiklbvqpxzucvkehw.supabase.co',publicKey='sb_publishable_synthetic';
const signal=()=>new AbortController().signal;
const token=(sub,changes={})=>`header.${Buffer.from(JSON.stringify({sub,iss:`${origin}/auth/v1`,aud:'authenticated',role:'authenticated',is_anonymous:false,exp:now/1000+120,...changes})).toString('base64url')}.unsigned`;
const session=(label,changes={})=>({subject:cohort[label],accessToken:token(cohort[label]),verifiedAt:now,expiresAt:now+120000,...changes});
function response(url,body,status=200,headers={}) {
  const result=new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json',...headers}});
  Object.defineProperty(result,'url',{value:url});return result;
}
const mapping=label=>({subject:cohort[label],canonicalUserId:label==='A'?CA:CB,state:'active',membershipPresent:false});

test('renderer pins exact Development, three distinct UUIDs and at most 15 minutes',async()=>{
  assert.equal(validateCohort(cohort,now).A,A);
  for(const invalid of [{...cohort,A:U},{...cohort,projectRef:'other'},{...cohort,A:"'; DROP ROLE authenticated;--"},
    {...cohort,expiresAt:new Date(now).toISOString()},{...cohort,expiresAt:new Date(now+900001).toISOString()},{...cohort,extra:true}]) {
    await assert.rejects(renderCohortArtifact('install',invalid,{now}),/A02_ARTIFACT_BLOCKED/);
  }
});
test('install/removal/partial-cleanup render and parse offline; not native pending migrations',async()=>{
  for(const kind of ['install','remove']) {
    const sql=await renderCohortArtifact(kind,cohort,{now});assert.doesNotMatch(sql,/\{\{/);await parse(sql);
  }
  for(const canonical of [{A:CA,B:CB},{A:CA,B:null},{A:null,B:null}]) {
    const sql=await renderCleanup({cohort,canonical,authPresent:{A:true,B:canonical.B!==null,U:true},privilegedBypassApproved:true});
    await parse(sql);assert.doesNotMatch(sql,/\{\{/);
  }
  const install=await renderCohortArtifact('install',cohort,{now});
  assert.doesNotMatch(install,/^BEGIN\s*(?:;|ISOLATION)|^COMMIT|ALTER POLICY|DISABLE ROW LEVEL|BYPASSRLS;/m);
  assert.doesNotMatch(JSON.stringify(await parse(install)),/"TransactionStmt"/);
});
test('wrapper validates real bridge BEFORE exact A/B allowlist and calls original once',async()=>{
  const sql=await renderCohortArtifact('install',cohort,{now});
  assert.ok(sql.indexOf('subject := app_private.provisioning_subject()')<sql.indexOf(`subject NOT IN ('${A}'::uuid,'${B}'::uuid)`));
  assert.equal(sql.match(/result := public\.contratpro_provision_identity\(\)/g).length,1);
  assert.match(sql,/canonical IN \('[^']+'::uuid,'[^']+'::uuid,'[^']+'::uuid\)/);
  assert.match(sql,/clock_timestamp\(\) >= '[^']+'::timestamptz/g);
  assert.match(sql,/EXCEPTION WHEN OTHERS THEN/);
  assert.doesNotMatch(sql,/CREATE OR REPLACE|set_config|request\.jwt|user_metadata|INSERT INTO identity|GRANT.*ON.*identity\./);
});
test('owner EXECUTE is checked explicitly and recorded in reviewed postflight',async()=>{
  const sql=await renderCohortArtifact('install',cohort,{now});
  assert.match(sql,/NOT has_function_privilege\('contratpro_identity_writer',core,'EXECUTE'\)/);
  assert.match(sql,/SET LOCAL ROLE contratpro_identity_writer;[\s\S]*CREATE FUNCTION public.contratpro_a02_fixture_provision\(\)/);
  const postflight=await readFile(new URL('../docs/deployment-0007/postflight-output.txt',import.meta.url),'utf8');
  assert.match(postflight,/public\.contratpro_provision_identity\(\)\s*\|\s*contratpro_identity_writer\s*\|\s*contratpro_identity_writer\s*\|\s*EXECUTE/);
});
test('PUBLIC revoke precedes wrapper grant; original RPC is NEVER granted to authenticated',async()=>{
  const sql=await renderCohortArtifact('install',cohort,{now});
  assert.ok(sql.indexOf('REVOKE ALL ON FUNCTION public.contratpro_a02_fixture_provision()')<sql.indexOf('GRANT EXECUTE ON FUNCTION public.contratpro_a02_fixture_provision() TO authenticated'));
  assert.doesNotMatch(sql,/GRANT EXECUTE ON FUNCTION public\.contratpro_provision_identity/);
  assert.match(sql,/REVOKE CREATE ON SCHEMA public FROM contratpro_identity_writer/);
  assert.match(sql,/REVOKE contratpro_identity_writer FROM postgres GRANTED BY postgres/);
});
test('removal drops only wrapper RESTRICT; expiry cannot prevent removal; post-removal checks independent',async()=>{
  const sql=await renderCohortArtifact('remove',cohort,{now:now+1000000,allowExpiredRemoval:true});
  assert.match(sql,/DROP FUNCTION public.contratpro_a02_fixture_provision\(\) RESTRICT/);
  assert.doesNotMatch(sql,/DROP.*contratpro_provision_identity\(|CASCADE/);
  const checks=await readFile(new URL('../docs/canonical-acceptance/a02-temporary/post-removal.sql',import.meta.url),'utf8');
  assert.match(checks,/BEGIN READ ONLY/);assert.match(checks,/to_regprocedure\('public.contratpro_a02_fixture_provision\(\)'\) IS NULL/);
  assert.match(checks,/NOT has_function_privilege\('authenticated','public.contratpro_provision_identity\(\)','EXECUTE'\)/);
});
test('cleanup requires explicit bypass approval, exact manifest and bounded canonical deletes',async()=>{
  const input={cohort,canonical:{A:CA,B:CB},authPresent:{A:true,B:true,U:true},privilegedBypassApproved:true};
  await assert.rejects(renderCleanup({...input,privilegedBypassApproved:false}),/A02_ARTIFACT_BLOCKED/);
  await assert.rejects(renderCleanup({...input,canonical:{A:A,B:CB}}),/A02_ARTIFACT_BLOCKED/);
  const sql=await renderCleanup(input);
  assert.match(sql,/PRIVILEGED ADMINISTRATIVE RLS BYPASS/);assert.match(sql,/BEGIN ISOLATION LEVEL SERIALIZABLE/);
  assert.match(sql,/pg_constraint/);assert.match(sql,/pg_trigger/);assert.match(sql,/pg_rewrite/);
  assert.equal(sql.match(/GET DIAGNOSTICS affected=ROW_COUNT/g).length,2);
  assert.ok(sql.indexOf('DELETE FROM identity.supabase_users')<sql.indexOf('DELETE FROM identity.users'));
  assert.doesNotMatch(sql,/DELETE FROM auth|DELETE FROM tenancy|ON CONFLICT|SET.*row_security.*off/i);
});
test('cleanup snapshots the reviewed manifest before asynchronous file reads',async()=>{
  const input={cohort,canonical:{A:CA,B:CB},authPresent:{A:true,B:true,U:true},privilegedBypassApproved:true};
  const pending=renderCleanup(input);input.canonical.A="'; DELETE FROM auth.users;--";
  const sql=await pending;assert.ok(sql.includes(CA));assert.doesNotMatch(sql,/DELETE FROM auth\.users/);
});
test('unchanged bridge rejects non-gateway session, anonymous roles and wrong issuer',async()=>{
  const core=await readFile(new URL('../supabase/migrations/20261116000700_canonical_provisioning.sql',import.meta.url),'utf8');
  assert.match(core,/session_user<>'authenticator'/);
  assert.match(core,/current_setting\('role',true\) IS DISTINCT FROM 'authenticated'/);
  assert.match(core,/claims->>'iss'\) IS DISTINCT FROM 'https:\/\/gllsiklbvqpxzucvkehw.supabase.co\/auth\/v1'/);
  assert.match(core,/claims->>'is_anonymous'\) IS DISTINCT FROM 'false'/);
  assert.match(core,/EXCEPTION WHEN unique_violation THEN/);
});
for(const label of ['A','B']) test(`verified synthetic ${label} permitted with independent confirmation`,async()=>{
  let calls=0;
  const provision=createFixtureProvisioner(cohort,{now:()=>now,send:async url=>{calls++;return response(url,'created');},confirmMapping:async()=>mapping(label)});
  assert.deepEqual(await provision(label,session(label),{publicKey,signal:signal()}),{state:'confirmed',outcome:'created'});
  assert.equal(calls,1);
});
for(const label of ['U','other']) test(`${label} cannot attempt fixture provisioning`,async()=>{
  let calls=0;const provision=createFixtureProvisioner(cohort,{now:()=>now,send:async()=>{calls++;},confirmMapping:async()=>{}});
  assert.equal((await provision(label,session('U'),{publicKey,signal:signal()})).state,'blocked');assert.equal(calls,0);
});
for(const changes of [{role:'anon'},{iss:'https://other.example/auth/v1'},{is_anonymous:true},{sub:U}]) test(`invalid credential ${Object.keys(changes)[0]} denied before attempt`,async()=>{
  let calls=0;const provision=createFixtureProvisioner(cohort,{now:()=>now,send:async()=>{calls++;},confirmMapping:async()=>{}});
  assert.equal((await provision('A',session('A',{accessToken:token(A,changes)}),{publicKey,signal:signal()})).state,'blocked');assert.equal(calls,0);
});
test('gateway rejection is sanitized and never automatically retried',async()=>{
  let calls=0;const provision=createFixtureProvisioner(cohort,{now:()=>now,send:async url=>{calls++;return response(url,{message:'secret-marker'},403);},confirmMapping:async()=>mapping('A')});
  assert.deepEqual(await provision('A',session('A'),{publicKey,signal:signal()}),{state:'uncertain'});
  assert.equal((await provision('A',session('A'),{publicKey,signal:signal()})).state,'blocked');assert.equal(calls,1);
});
test('removed wrapper cannot be presented as confirmed provisioning',async()=>{
  let calls=0;const provision=createFixtureProvisioner(cohort,{now:()=>now,
    send:async url=>{calls++;return response(url,{code:'not-found'},404);},confirmMapping:async()=>mapping('A')});
  assert.equal((await provision('A',session('A'),{publicKey,signal:signal()})).state,'uncertain');
  assert.equal((await provision('A',session('A'),{publicKey,signal:signal()})).state,'blocked');assert.equal(calls,1);
});
test('expired wrapper prevents attempts; post-write expiry and lost response remain uncertain',async()=>{
  let clock=now;let calls=0;
  const provision=createFixtureProvisioner(cohort,{now:()=>clock,send:async url=>{calls++;clock=now+120000;return response(url,'created');},confirmMapping:async()=>mapping('A')});
  assert.equal((await provision('A',session('A'),{publicKey,signal:signal()})).state,'uncertain');assert.equal(calls,1);
  clock=now+600001;
  assert.equal((await provision('B',session('B'),{publicKey,signal:signal()})).state,'blocked');
  const lost=createFixtureProvisioner(cohort,{now:()=>now,send:async()=>{throw Error('private connection error');},confirmMapping:async()=>mapping('A')});
  assert.deepEqual(await lost('A',session('A'),{publicKey,signal:signal()}),{state:'uncertain'});
});
test('parallel duplicate actor attempts are bounded; A/B use independent existing contracts',async()=>{
  let calls=0;const provision=createFixtureProvisioner(cohort,{now:()=>now,send:async url=>{calls++;await Promise.resolve();return response(url,'existing');},confirmMapping:async({label})=>mapping(label)});
  const results=await Promise.all(['A','A','B'].map(label=>provision(label,session(label),{publicKey,signal:signal()})));
  assert.deepEqual(results.map(result=>result.state),['confirmed','blocked','confirmed']);assert.equal(calls,2);
});
test('malformed or mismatched mapping never confirms a write',async()=>{
  for(const invalid of [{...mapping('A'),subject:B},{...mapping('A'),canonicalUserId:A},{...mapping('A'),membershipPresent:true},null]){
    const provision=createFixtureProvisioner(cohort,{now:()=>now,send:async url=>response(url,'created'),confirmMapping:async()=>invalid});
    assert.equal((await provision('A',session('A'),{publicKey,signal:signal()})).state,'uncertain');
  }
});

function bootstrapFixture(changes={}) {
  const calls=[];let current;
  const send=async(url,init)=>{
    calls.push({url,method:init.method});
    if(init.method==='POST'){
      current=JSON.parse(init.body).email[0];
      return response(url,{access_token:token(cohort[current]),refresh_token:'DO_NOT_RETURN'});
    }
    return response(url,{id:cohort[current],role:'authenticated',aud:'authenticated',is_anonymous:false,...changes});
  };
  const input={projectRef:cohort.projectRef,subjects:{A,B,U},canonical:{A:CA,B:CB,U:null},publicKey,
    credentialProvider:label=>({email:`${label}@synthetic.invalid`,password:'synthetic-password-only'})};
  return {calls,send,input};
}
test('memory-only bootstrap uses six Auth calls, returns no refresh token, and feeds existing A02 observer',async()=>{
  const f=bootstrapFixture();
  const sessions=await bootstrapA02Sessions(f.input,{send:f.send,now:()=>now,signal:signal()});
  assert.equal(f.calls.length,6);assert.ok(!JSON.stringify(sessions).includes('DO_NOT_RETURN'));
  assert.equal(sessions.U.canonicalUserId,null);
  let reads=0;
  const observer=createCategoryAObserver({projectRef:cohort.projectRef,projectUrl:origin,appOrigin:'http://localhost:3000',environment:'development',
    provisioningEnabled:false,authenticatedExecuteDenied:true,operatorTargetConfirmed:true,artifactContractVerified:true,publicKey,sessions},
  {now:()=>now,request:async(url,init)=>{
    reads++;assert.equal(init.method,'GET');assert.equal(url,`${origin}/rest/v1/rpc/contratpro_auth_access`);
    const sub=JSON.parse(Buffer.from(init.headers.Authorization.split('.')[1],'base64url')).sub;
    return response(url,sub===U?[]:[{supabase_user_id:sub,user_id:sub===A?CA:CB,user_state:'active',membership_id:null,agency_id:null,agency_name:null,membership_state:null,agency_state:null}]);
  },confirmEvidence:async()=>({noDataChanges:true})});
  const observation=await collectCase(await loadPlan(),'A02',observer,{authorization:{projectRef:cohort.projectRef,environment:'development',category:'A'},timeoutMs:10000});
  assert.equal(observation.facts.unmappedRemainsUnmapped,true);assert.equal(reads,3);
});
test('fixture-setup bootstrap does not invent canonical mappings',async()=>{
  const f=bootstrapFixture();f.input.phase='fixture-setup';f.input.canonical={A:null,B:null,U:null};
  const sessions=await bootstrapA02Sessions(f.input,{send:f.send,now:()=>now,signal:signal()});
  assert.equal(sessions.A.canonicalUserId,null);assert.equal(sessions.B.canonicalUserId,null);
});
test('wrong server-verified subject or anonymous user blocks bootstrap with no fallback',async()=>{
  for(const changes of [{id:U},{is_anonymous:true}]){
    const f=bootstrapFixture(changes);await assert.rejects(bootstrapA02Sessions(f.input,{send:f.send,now:()=>now,signal:signal()}),/^Error: A02_BLOCKED$/);
    assert.equal(f.calls.length,2);
  }
});
test('bootstrap rejects redirects and cookie-bearing responses without retries or credential errors',async()=>{
  for(const kind of ['redirect','cookie']){
    const f=bootstrapFixture();let calls=0;
    await assert.rejects(bootstrapA02Sessions(f.input,{now:()=>now,signal:signal(),send:async url=>{
      calls++;return response(kind==='redirect'?'https://other.example':url,{access_token:token(A)},200,
        kind==='cookie'?{'set-cookie':'private-secret-marker'}:{});
    }}),/^Error: A02_BLOCKED$/);assert.equal(calls,1);
  }
});
test('bootstrap timeout aborts noncooperative transport without retry',async()=>{
  const f=bootstrapFixture();const controller=new AbortController();let calls=0;
  await assert.rejects(bootstrapA02Sessions(f.input,{now:()=>now,signal:controller.signal,send:async()=>{calls++;controller.abort();return new Promise(()=>{});}}),/A02_BLOCKED/);
  assert.equal(calls,1);
});
test('pinned HTTPS transport has no arbitrary target, refresh, admin or original RPC routes',async()=>{
  let calls=0;const send=createA02HttpsTransport({requestImpl:()=>{calls++;throw Error('must not dispatch');}});
  for(const url of ['https://other.example/auth/v1/user',`${origin}/auth/v1/token?grant_type=refresh_token`,`${origin}/auth/v1/admin/users`,`${origin}/rest/v1/rpc/contratpro_provision_identity`]){
    await assert.rejects(send(url,{method:'GET',headers:{Accept:'application/json',apikey:publicKey,Authorization:`Bearer ${token(A)}`},redirect:'error',credentials:'omit',signal:signal()}),/A02_BLOCKED/);
  }assert.equal(calls,0);
});
test('native transport TLS and response metadata tested using injected events only',async()=>{
  let options;
  const send=createA02HttpsTransport({requestImpl:(url,init,callback)=>{
    options=init;const req=new EventEmitter();req.setTimeout=()=>{};req.destroy=()=>{};
    req.end=()=>queueMicrotask(()=>{const res=new EventEmitter();res.statusCode=200;res.rawHeaders=['Content-Type','application/json'];callback(res);res.emit('data',Buffer.from('[]'));res.emit('end');});return req;
  }});
  const url=`${origin}/rest/v1/rpc/contratpro_auth_access`;
  const result=await send(url,{method:'GET',headers:{Accept:'application/json',apikey:publicKey,Authorization:`Bearer ${token(A)}`},redirect:'error',credentials:'omit',signal:signal()});
  assert.equal(options.rejectUnauthorized,true);assert.equal(options.servername,'gllsiklbvqpxzucvkehw.supabase.co');assert.equal(options.agent,false);
  assert.equal(result.url,url);assert.deepEqual(await result.json(),[]);
});
