/** Offline pure preparation/observation tests. executeClientAcceptance is NEVER invoked. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {acceptanceSqlSha256,prepareClientAcceptance,validateClientAcceptance,validateClientObservation} from './client-idempotency-acceptance.mjs';
const t=1795000000000;
function fixture(){return {projectRef:'gllsiklbvqpxzucvkehw',sqlSha256:acceptanceSqlSha256,
  approval:{projectRef:'gllsiklbvqpxzucvkehw',scope:'P3_CLIENT_IDEMPOTENCY_ROLLBACK_ACCEPTANCE',reference:'synthetic-NOT-LIVE-approval',start:t-1,end:t+60000},
  evidence:{projectRef:'gllsiklbvqpxzucvkehw',environment:'development',host:'aws-0-eu-west-1.pooler.supabase.com',port:5432,user:'postgres.gllsiklbvqpxzucvkehw',database:'postgres',postgresMajor:17,
    databaseOid:'12345',serverAddress:'192.0.2.1',serverPort:5432,observedAt:t,controlPlaneReference:'synthetic-control-plane',databaseReference:'synthetic-read-only-capture'},
  subjects:{subjectA:'10000000-0000-4000-8000-000000000001',subjectB:'10000000-0000-4000-8000-000000000002',agencyA:'20000000-0000-4000-8000-000000000001',agencyB:'20000000-0000-4000-8000-000000000002',ownershipReference:'synthetic-ownership'}};}
test('pins reviewed SQL and prepares no connection, credentials, login or execution',async()=>{
  const f=fixture();const p=await prepareClientAcceptance(f,{now:()=>t});assert.equal(p.projectRef,f.projectRef);assert.equal(p.status,'PREPARED_ONLY');assert.equal(p.liveAcceptanceComplete,false);
  const bytes=await readFile(new URL('./test-client-idempotency-postgres.sql',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),acceptanceSqlSha256);
});

test('exact native driver pin matches installed, declared and locked version without constructing a client',async()=>{
  const require=createRequire(new URL('../packages/infrastructure/database/package.json',import.meta.url));
  const source=await readFile(new URL('./client-idempotency-acceptance.mjs',import.meta.url),'utf8');
  const declared=JSON.parse(await readFile(new URL('../packages/infrastructure/database/package.json',import.meta.url),'utf8'));
  const locked=JSON.parse(await readFile(new URL('../package-lock.json',import.meta.url),'utf8'));
  const pin=/require\('pg\/package.json'\)\.version!=='([^']+)'/.exec(source)?.[1];
  assert.equal(pin,'8.23.1');assert.equal(require('pg/package.json').version,pin);
  assert.equal(declared.dependencies.pg,pin);assert.equal(locked.packages['node_modules/pg'].version,pin);
});
test('rejects non-Development route, user, port, database or project before any read',async()=>{
  for(const edit of [f=>f.projectRef='other',f=>f.evidence.projectRef='other',f=>f.evidence.environment='production',f=>f.evidence.host='other.example',f=>f.evidence.user='postgres.other',f=>f.evidence.port=6543,f=>f.evidence.database='other']){
    const f=fixture();edit(f);let reads=0;await assert.rejects(prepareClientAcceptance(f,{now:()=>t,read:()=>{reads++;throw Error('not reached');}}),/CLIENT_ACCEPTANCE_BLOCKED/);assert.equal(reads,0);
  }
});
test('requires fresh independently referenced fingerprint, exact scope and bounded current approval',()=>{
  for(const edit of [f=>f.evidence.observedAt=t-900001,f=>f.evidence.observedAt=t+1,f=>f.evidence.databaseReference='UNBOUND',f=>f.evidence.controlPlaneReference='UNBOUND',f=>f.evidence.databaseOid='UNBOUND',f=>f.evidence.serverAddress='not-ip',f=>f.approval.end=t,f=>f.approval.start=t+1,f=>f.approval.scope='DEPLOY_MIGRATION',f=>f.approval.reference='UNBOUND']){
    const f=fixture();edit(f);assert.throws(()=>validateClientAcceptance(f,t),/CLIENT_ACCEPTANCE_BLOCKED/);
  }
});
test('requires distinct UUIDs and ownership reference, rejects secret-shaped extra inputs',()=>{
  for(const edit of [f=>f.subjects.subjectA=f.subjects.subjectB,f=>f.subjects.agencyA='*',f=>f.subjects.ownershipReference='UNBOUND',f=>f.password='SYNTHETIC-NEVER-REAL',f=>f.connectionString='SYNTHETIC-NEVER-REAL']){
    const f=fixture();edit(f);assert.throws(()=>validateClientAcceptance(f,t),/CLIENT_ACCEPTANCE_BLOCKED/);
  }
});
test('tampered SQL cannot become an executable prepared plan',async()=>{
  await assert.rejects(prepareClientAcceptance(fixture(),{now:()=>t,read:async()=> 'COMMIT;'}),/CLIENT_ACCEPTANCE_BLOCKED/);
});
test('TLS chain and hostname flags plus exact observed session fingerprint are all mandatory',()=>{
  const f=fixture(),tls={encrypted:true,authorized:true,hostnameVerified:true};
  const row={database:'postgres',session_user:'postgres',current_user:'postgres',version_num:'170005',database_oid:f.evidence.databaseOid,server_address:f.evidence.serverAddress,server_port:5432};
  assert.equal(validateClientObservation(row,f.evidence,tls),true);
  for(const k of Object.keys(tls))assert.equal(validateClientObservation(row,f.evidence,{...tls,[k]:false}),false);
  for(const change of [{database_oid:'99999'},{server_address:'192.0.2.2'},{session_user:'other'},{version_num:'160000'}])assert.equal(validateClientObservation({...row,...change},f.evidence,tls),false);
});
test('native execution source has pinned TLS, no ambient discovery, one-shot and bounded cleanup, without invoking it',async()=>{
  const source=await readFile(new URL('./client-idempotency-acceptance.mjs',import.meta.url),'utf8');
  assert.match(source,/rejectUnauthorized:true,servername:host,checkServerIdentity/);assert.match(source,/connectionTimeoutMillis:5000/);
  assert.match(source,/plans.delete\(plan\)/);assert.match(source,/Math.min\(20000/);assert.match(source,/credentials\.provide\(\)/);
  assert.doesNotMatch(source,/process\.env\.(?:PGPASSWORD|PGHOST|PGUSER)|console\.|writeFile|execSync|spawn\(/);
  assert.match(source,/client\.query\("BEGIN READ ONLY/);assert.match(source,/gatewayJwtVerified:false,multiSessionConcurrencyVerified:false/);
});
