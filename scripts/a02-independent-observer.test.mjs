import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createA02IndependentObserver,createA02ObserverClientFactory,a02Subjects} from './a02-independent-observer.mjs';
import {createA02Reconciler,createA02TerminalReceiptReader} from './a02-reconciliation.mjs';
import {createInMemoryCredentialProvider} from './a02-private-input.mjs';
import {createA02AuthCreator} from './a02-auth-create.mjs';
import {createFixtureProvisioner} from './a02-session-transport.mjs';
import {createA02AuthoritativeCompletionAdapter} from './a02-authoritative-completion.mjs';
import {syntheticA02Completion} from './a02-completion-fixtures.mjs';
const t=1794916800000,projectRef='gllsiklbvqpxzucvkehw',attemptId='11111111-1111-4111-8111-111111111111';
const ca='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',cb='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const approval={projectRef,runReference:'offline-run',reference:'offline-only-approval',start:t-1000,end:t-1000+7200000,parameterLoggingCleared:true,parameterLoggingReview:'offline-log-review',recoveryAllowed:true,
  loggingEvidence:{projectRef,provenance:{kind:'reviewed-read-only-capture',reference:'offline-log-fixture'},
    settings:{log_parameter_max_length:'0',log_parameter_max_length_on_error:'0','pgaudit.log_parameter':'off'},
    inspection:{targetVerified:true,tlsVerifyFullVerified:true,credentialTransportVerified:true,readOnly:true,rolledBack:true,deadlineVerified:true,overallDeadlineMs:20000},
    review:{verdict:'PASS',reference:'offline-review',providerLoggingCleared:true,clientRuntimeLoggingCleared:true,auditCoverageCleared:true}}};
const row=(label,canonical=null)=>({label,auth_exists:true,canonical_user_id:canonical,canonical_active:canonical!==null?true:null,
  memberships:'0',agencies:'0',clients:'0',invitations_by_cohort:'0',audit_by_cohort:'0'});
async function fixture({queryOverride,rows,absent,clock}={}){
  const clients=[];const memory=createInMemoryCredentialProvider(Object.fromEntries(['A','B','U'].map(x=>[x,{email:`${x}@offline.invalid`,password:`offline-private-${x}-only`}])));
  const state={rows:rows??[row('A',ca),row('B',cb),row('U')],clock:t};
  const observer=await createA02IndependentObserver({approval,credentialProvider:memory.provider,now:clock??(()=>state.clock),clientFactory:({checkpoint})=>{
    const client={queries:[],ended:0,connect:async()=>{},end:async()=>{client.ended++;},query:async(sql,values)=>{
      client.queries.push({sql,values});if(queryOverride){const r=await queryOverride(sql,client);if(r!==undefined)return r;}
      if(sql.includes(' AS ok'))return {rows:[{ok:true}]};
      const wrapperPresent=!['baseline','post-removal'].includes(checkpoint);
      if(sql.startsWith('SELECT transaction_timestamp()'))return {rows:[{original_denied:true,temporary_set_absent:true,temporary_create_absent:true,temporary_self_grant_absent:true}]};
      if(sql.startsWith('SELECT p.oid::regprocedure'))return {rows:wrapperPresent?[{signature:'public.contratpro_a02_fixture_provision()',owner:'contratpro_identity_writer',prosecdef:true,proconfig:['search_path=pg_catalog','row_security=on'],proacl:'offline-acl',definition:'offline reviewed wrapper fixture'}]:[]};
      if(sql.startsWith('SELECT count(*) AS wrapper_overloads'))return {rows:[{wrapper_overloads:wrapperPresent?1:0}]};
      const versions=['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700',...(wrapperPresent?['20261117000100']:checkpoint==='post-removal'?['20261117000100','20261117000300']:[])];
      if(sql.startsWith('SELECT count(*) AS history_count'))return {rows:[{history_count:versions.length}]};
      if(sql.startsWith('SELECT version FROM'))return {rows:versions.map(version=>({version}))};
      if(sql.startsWith('WITH nominated(label,subject,email)'))return {rows:absent??['A','B','U'].map(label=>({label,id_exists:false,email_exists:false}))};
      if(sql.startsWith('WITH nominated(label,subject)'))return {rows:structuredClone(state.rows)};
      return {rows:[]};
    }};clients.push(client);return client;
  }});
  return {observer,clients,memory,state,signal:new AbortController().signal};
}
test('independent parameterized absence capture feeds existing Auth executor without logging private input',async()=>{
  const f=await fixture();const receipt=await f.observer.observeAbsence(f);
  assert.equal(receipt.rollback,'SUCCEEDED');assert.ok(!JSON.stringify(receipt).includes('@'));
  assert.ok(f.clients[0].queries.find(q=>q.sql.includes('$6::text')).values.includes('A@offline.invalid'));
  let sends=0;
  const create=createA02AuthCreator({credentialProvider:f.memory.provider,absenceCheck:f.observer.absenceCheck,now:()=>t,
    adminHeaderProvider:()=>({apikey:'offline-header-value-only',Authorization:'Bearer offline-header-value-only'}),
    send:async(url,init)=>{sends++;const b=JSON.parse(init.body);const r=new Response(JSON.stringify({id:b.id,email:b.email}),{headers:{'content-type':'application/json'}});Object.defineProperty(r,'url',{value:url});return r;}});
  const result=await create({approval:{...approval,maximumCreates:3,wrapperExpiry:t+899000},signal:f.signal});
  assert.equal(result.state,'acknowledged_requires_independent_readback');assert.equal(sends,3);
  assert.equal(f.clients.length,1);assert.equal(f.clients[0].queries.at(-1).sql,'ROLLBACK');
});
test('independent mapping capture feeds confirmMapping, preserves distinct canonical IDs and immutable evidence',async()=>{
  const f=await fixture({rows:[row('A',ca),row('B'),row('U')]});const a=await f.observer.confirmMapping({label:'A',subject:a02Subjects.A,signal:f.signal});
  f.state.rows=[row('A',ca),row('B',cb),row('U')];
  const b=await f.observer.confirmMapping({label:'B',subject:a02Subjects.B,signal:f.signal});
  assert.equal(a.canonicalUserId,ca);assert.equal(b.canonicalUserId,cb);assert.equal(a.membershipPresent,false);
  assert.equal(f.clients.length,2);assert.ok(f.clients.every(c=>c.ended===1));
  assert.equal(f.observer.evidence().length,2);
});
test('existing provisioner confirms only from observer DB state, never the mocked RPC acknowledgement alone',async()=>{
  for(const mapped of [true,false]){
    const f=await fixture({rows:[row('A',mapped?ca:null),row('B'),row('U')]});
    const expiresAt=t+600000;const claims={sub:a02Subjects.A,role:'authenticated',aud:'authenticated',is_anonymous:false,
      iss:`https://${projectRef}.supabase.co/auth/v1`,exp:expiresAt/1000};
    const token=`${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.offline`;
    const provision=createFixtureProvisioner({...a02Subjects,projectRef,expiresAt:new Date(expiresAt).toISOString()},
      {now:()=>t,confirmMapping:f.observer.confirmMapping,send:async url=>{
        const r=new Response(JSON.stringify('created'),{headers:{'content-type':'application/json'}});Object.defineProperty(r,'url',{value:url});return r;
      }});
    const result=await provision('A',{subject:a02Subjects.A,accessToken:token,verifiedAt:t,expiresAt},
      {signal:f.signal,publicKey:'sb_publishable_offline_fixture'});
    assert.equal(result.state,mapped?'confirmed':'uncertain');assert.equal(f.clients.length,1);
  }
});
test('absence collision, stale/wrong inputs and duplicate capture fail without automatic retry',async()=>{
  const f=await fixture({absent:['A','B','U'].map(label=>({label,id_exists:label==='A',email_exists:false}))});
  await f.observer.observeAbsence(f);
  assert.throws(()=>f.observer.absenceCheck({label:'A',subject:a02Subjects.A,email:'A@offline.invalid',runReference:'offline-run',signal:f.signal}),/A02_OBSERVER_BLOCKED/);
  await assert.rejects(f.observer.observeAbsence(f),/A02_OBSERVER_BLOCKED/);assert.equal(f.clients.length,1);
  const g=await fixture();await g.observer.observeAbsence(g);g.state.clock=t+30001;
  assert.throws(()=>g.observer.absenceCheck({label:'B',subject:a02Subjects.B,email:'B@offline.invalid',runReference:'offline-run'}),/A02_OBSERVER_BLOCKED/);
});
test('mapping missing, duplicate, revoked state or business references cannot confirm',async()=>{
  for(const rows of [[row('A'),row('B'),row('U')],[row('A',ca),row('B',ca),row('U')],
    [{...row('A',ca),canonical_active:false},row('B'),row('U')],
    [{...row('A',ca),memberships:'1'},row('B'),row('U')]]){
    const f=await fixture({rows});await assert.rejects(f.observer.confirmMapping({label:'A',subject:a02Subjects.A,signal:f.signal}),/A02_OBSERVER_BLOCKED/);
  }
});
test('canceled/noncooperative query closes observer and produces no successful capture',async()=>{
  const cancel=new AbortController();
  const f=await fixture({queryOverride:sql=>{if(sql.startsWith('WITH nominated')){queueMicrotask(()=>cancel.abort());return new Promise(()=>{});}}});
  await assert.rejects(f.observer.observeCohort('baseline',{signal:cancel.signal}),/A02_OBSERVER_BLOCKED/);
  await Promise.resolve();assert.equal(f.observer.evidence().length,0);assert.ok(f.clients[0].ended>0);
});
test('advancing-clock mapping timeout fails closed without a capture or query retry',async()=>{
  let clock=t;
  const f=await fixture({clock:()=>clock,queryOverride:sql=>{if(sql.startsWith('WITH nominated'))clock=t+2001;}});
  await assert.rejects(f.observer.confirmMapping({label:'A',subject:a02Subjects.A,signal:f.signal}),/A02_OBSERVER_BLOCKED/);
  assert.equal(f.observer.evidence().length,0);assert.equal(f.clients.length,1);
});
test('query errors, missing rows and rollback failure cannot become successful evidence',async()=>{
  for(const override of [sql=>{if(sql==='ROLLBACK')throw Error('private-raw-error');},
    sql=>sql.startsWith('WITH nominated')?{rows:[]}:undefined,
    sql=>{if(sql.includes(' AS ok'))return {rows:[{ok:false}]};}]){
    const f=await fixture({queryOverride:override});await assert.rejects(f.observer.observeCohort('baseline',f),/^Error: A02_OBSERVER_BLOCKED$/);
    assert.equal(f.observer.evidence().length,0);
  }
});
test('budget rejects unsupported checkpoints and repeated recovery captures',async()=>{
  const f=await fixture();await assert.rejects(f.observer.observeCohort('arbitrary',f),/A02_OBSERVER_BLOCKED/);
  await f.observer.observeCohort('reconcile-A',f);await assert.rejects(f.observer.observeCohort('reconcile-A',f),/A02_OBSERVER_BLOCKED/);
  assert.equal(f.clients.length,1);
});
test('cohort capture retains six SELECTs per checkpoint, blocks ACL/history drift and disposal',async()=>{
  const f=await fixture();await f.observer.observeCohort('baseline',f);
  const q=f.clients[0].queries;assert.equal(q.filter(x=>x.sql.startsWith('SELECT ')||x.sql.startsWith('WITH ')).length,7); // guard plus six results
  f.observer.dispose();await assert.rejects(f.observer.observeCohort('post-install',f),/A02_OBSERVER_BLOCKED/);
  for(const override of [sql=>sql.startsWith('SELECT transaction_timestamp()')?{rows:[{original_denied:false}]}:undefined,
    sql=>sql.startsWith('SELECT version FROM')?{rows:Array.from({length:8},()=>({version:'20261115000000'}))}:undefined]){
    const g=await fixture({queryOverride:override});await assert.rejects(g.observer.observeCohort('baseline',g),/A02_OBSERVER_BLOCKED/);
  }
});
async function terminalFile(extra={}){
  const directory=await mkdtemp(join(tmpdir(),'a02-terminal-offline-'));
  const fixture=syntheticA02Completion(extra),record=fixture.normalized;
  await writeFile(join(directory,record.attemptId+'.json'),fixture.normalizedBytes,{flag:'wx'});
  await writeFile(join(directory,record.attemptId+'.transaction.json'),fixture.sourceBytes,{flag:'wx'});
  return {readTerminal:createA02TerminalReceiptReader({directory,approvedSource:record.source,sourceReviewReference:'offline-source-review',
    authorityAdapter:createA02AuthoritativeCompletionAdapter({policy:fixture.policy,now:()=>t})}),
    terminalSha256:fixture.normalizedSha256,record};
}
test('exact-ID committed lost response reconciles using separate terminal file plus fresh DB observation, never retries',async()=>{
  const f=await fixture(),term=await terminalFile();
  const reconcile=createA02Reconciler({observer:f.observer,readTerminal:term.readTerminal,runReference:'offline-run',now:()=>t});
  const input={...term,attemptId,kind:'provision',label:'A',attemptedAt:t-10,signal:f.signal};
  assert.equal((await reconcile(input)).state,'confirmed-committed');assert.equal(f.clients.length,1);
  assert.equal((await reconcile(input)).state,'blocked');assert.equal(f.clients.length,1);
});
test('in-flight or unknown requests remain blocked even if a DB snapshot could show absent rows',async()=>{
  for(const state of ['IN_FLIGHT','UNKNOWN']){
    const f=await fixture(),term=await terminalFile({state,commit:'UNKNOWN',completedAt:null});
    const reconcile=createA02Reconciler({observer:f.observer,readTerminal:term.readTerminal,runReference:'offline-run',now:()=>t});
    const result=await reconcile({...term,attemptId,kind:'provision',label:'A',attemptedAt:t-10,signal:f.signal});
    assert.equal(result.state,'blocked');assert.equal(result.retryAllowed,false);assert.equal(f.clients.length,0);
  }
});
test('proven rollback with no mapping reconciles; unknown commit, partial or inconsistent state blocks',async()=>{
  const cases=[{commit:'ROLLED_BACK',rows:[row('A'),row('B'),row('U')],expected:'confirmed-no-write'},
    {commit:'UNKNOWN',rows:[row('A'),row('B'),row('U')],expected:'blocked'},
    {commit:'COMMITTED',rows:[row('A'),row('B'),row('U')],expected:'blocked'},
    {commit:'COMMITTED',rows:[{...row('A',ca),clients:'1'},row('B'),row('U')],expected:'blocked'}];
  for(const c of cases){const f=await fixture({rows:c.rows}),term=await terminalFile({commit:c.commit});
    const reconcile=createA02Reconciler({observer:f.observer,readTerminal:term.readTerminal,runReference:'offline-run',now:()=>t});
    assert.equal((await reconcile({...term,attemptId,kind:'provision',label:'A',attemptedAt:t-10,signal:f.signal})).state,c.expected);
  }
});
test('mismatched terminal subject/run/hash/source, missing source and cancellation never infer rollback',async()=>{
  const f=await fixture(),term=await terminalFile({runReference:'other'});
  const reconcile=createA02Reconciler({observer:f.observer,readTerminal:term.readTerminal,runReference:'offline-run',now:()=>t});
  assert.equal((await reconcile({...term,attemptId,kind:'provision',label:'A',attemptedAt:t-10,signal:f.signal})).state,'blocked');
  assert.equal(f.clients.length,0);
  await assert.rejects(term.readTerminal({attemptId,expectedSha256:'0'.repeat(64)}),/A02_RECONCILIATION_BLOCKED/);
  assert.throws(()=>createA02TerminalReceiptReader({directory:'x',approvedSource:'UNBOUND',sourceReviewReference:'UNBOUND'}),/A02_RECONCILIATION_BLOCKED/);
});
test('partial Auth phase reconciles finished exact-ID attempts from one independent snapshot',async()=>{
  const f=await fixture({rows:[row('A'),{...row('B'),auth_exists:false},{...row('U'),auth_exists:false}]});
  const a=await terminalFile({kind:'auth'}),bid='22222222-2222-4222-8222-222222222222';
  const b=await terminalFile({attemptId:bid,kind:'auth',label:'B',subject:a02Subjects.B,commit:'ROLLED_BACK'});
  const readTerminal=x=>(x.attemptId===attemptId?a:b).readTerminal(x);
  const reconcile=createA02Reconciler({observer:f.observer,readTerminal,runReference:'offline-run',now:()=>t});
  assert.equal((await reconcile({attemptId,kind:'auth',label:'A',attemptedAt:t-10,terminalSha256:a.terminalSha256,signal:f.signal})).state,'confirmed-committed');
  assert.equal((await reconcile({attemptId:bid,kind:'auth',label:'B',attemptedAt:t-10,terminalSha256:b.terminalSha256,signal:f.signal})).state,'confirmed-no-write');
  assert.equal(f.clients.length,1);
});
test('unavailable or canceled independent terminal source cannot trigger any DB inference',async()=>{
  const f=await fixture();const c=new AbortController();
  const reconcile=createA02Reconciler({observer:f.observer,readTerminal:()=>{queueMicrotask(()=>c.abort());return new Promise(()=>{});},runReference:'offline-run',now:()=>t});
  const result=await reconcile({attemptId,kind:'provision',label:'A',attemptedAt:t-10,signal:c.signal});
  assert.equal(result.state,'blocked');assert.equal(f.clients.length,0);
});
test('read-only factory pins Development route and CA before loading any driver credentials',()=>{
  assert.throws(()=>createA02ObserverClientFactory({connectionProvider:()=>({}),caSha256:'bad'}),/A02_OBSERVER_BLOCKED/);
  const factory=createA02ObserverClientFactory({connectionProvider:()=>({password:'offline-only',ca:Buffer.from('not-a-CA')}),caSha256:'700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7'});
  assert.throws(factory,/A02_OBSERVER_BLOCKED/);
});
test('reconciliation and observer have no SQL write, provisioning, login or HTTP capability',async()=>{
  const source=await readFile(new URL('./a02-reconciliation.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/from ['"]node:https|\.query\(|\.writeFile\(|console\./);
});
test('observer rejects a bare logging assertion or observed -1 configuration before client creation',async()=>{
  for(const e of [undefined,{settings:{log_parameter_max_length:'-1',log_parameter_max_length_on_error:'0','pgaudit.log_parameter':'off'}}]){
    let opened=false;
    await assert.rejects(createA02IndependentObserver({approval:{...approval,loggingEvidence:e},credentialProvider:()=>({}),clientFactory:()=>{opened=true;},now:()=>t}),/A02_OBSERVER_BLOCKED/);
    assert.equal(opened,false);
  }
});
test('reconciler rejects wrong terminal attempt/hash, failed rollback, tampered or duplicate-label captures',async()=>{
  const base=await fixture();const good=await base.observer.observeCohort('reconcile-A',base);
  for(const mutate of [c=>c.rollback='FAILED',c=>c.rows[0].auth_exists='true',c=>c.rows[1].label='A',c=>c.endedAt=t+1]){
    const capture=structuredClone(good);mutate(capture);
    const {sha256:_sha,receiptReference:_ref,...payload}=capture;void _sha;void _ref;
    capture.sha256=createHash('sha256').update(JSON.stringify(payload)).digest('hex');capture.receiptReference=`a02-observer-sha256:${capture.sha256}`;
    const term=await terminalFile();const reconcile=createA02Reconciler({observer:{observeCohort:async()=>capture},readTerminal:term.readTerminal,runReference:'offline-run',now:()=>t});
    assert.equal((await reconcile({...term,attemptId,kind:'provision',label:'A',attemptedAt:t-10,signal:base.signal})).state,'blocked');
  }
  const term=await terminalFile();
  for(const mutate of [r=>r.attemptId='22222222-2222-4222-8222-222222222222',r=>r.sha256='0'.repeat(64)]){
    const readTerminal=async x=>{const r={...await term.readTerminal(x)};mutate(r);return r;};let observed=false;
    const reconcile=createA02Reconciler({observer:{observeCohort:async()=>{observed=true;}},readTerminal,runReference:'offline-run',now:()=>t});
    assert.equal((await reconcile({...term,attemptId,kind:'provision',label:'A',attemptedAt:t-10,signal:base.signal})).state,'blocked');assert.equal(observed,false);
  }
  const tampered=structuredClone(good);tampered.rows[0].canonical_user_id=cb;
  const reconcile=createA02Reconciler({observer:{observeCohort:async()=>tampered},readTerminal:term.readTerminal,runReference:'offline-run',now:()=>t});
  assert.equal((await reconcile({...term,attemptId,kind:'provision',label:'A',attemptedAt:t-10,signal:base.signal})).state,'blocked');
  const cancel=new AbortController();
  const canceled=createA02Reconciler({observer:{observeCohort:async()=>{cancel.abort();return good;}},readTerminal:term.readTerminal,runReference:'offline-run',now:()=>t});
  assert.equal((await canceled({...term,attemptId,kind:'provision',label:'A',attemptedAt:t-10,signal:cancel.signal})).state,'blocked');
});
