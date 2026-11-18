import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspect} from 'node:util';
import {createA02AuthDeleter} from './a02-auth-delete.mjs';
import {createInMemoryAdminHeaderProvider} from './a02-private-input.mjs';
import {a02Subjects} from './a02-independent-observer.mjs';
import {createA02Acceptance} from './a02-state-acceptance.mjs';
import {cleaned,removed,projectRef,digest,ca,cb} from './a02-state-fixtures.mjs';
const fakeApi='offline-secret-api-fixture-only',fakeBearer='offline-secret-bearer-fixture-only';
function clock(f){
  let n=0,next=0;const timers=new Map();
  return {now:()=>n,schedule:(fn,ms)=>{const id=++next;timers.set(id,{fn,at:n+ms});return id;},cancel:id=>timers.delete(id),
    advance:ms=>{const target=n+ms;for(;;){const due=[...timers.entries()].filter(([,v])=>v.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!due)break;f.clock+=due[1].at-n;n=due[1].at;timers.delete(due[0]);due[1].fn();}f.clock+=target-n;n=target;},
    pending:()=>timers.size};
}
async function until(check){for(let i=0;i<1000;i++){if(check())return;await Promise.resolve();}assert.fail('SYNTHETIC condition not reached');}
function acknowledgement(url,status=200){const response=new Response(status===204?null:'{}',{status,headers:status===200?{'content-type':'application/json'}:{}});
  Object.defineProperty(response,'url',{value:url});return response;}
async function setup({beforeCleanup=false,requestHook,queryHook,keepPresent=false}={}){
  const f=await (beforeCleanup?removed:cleaned)({queryHook:async(sql,state)=>queryHook?.(sql,state)});
  f.time=clock(f);f.sent=[];f.reads=0;f.disposals=0;f.signal=new AbortController().signal;
  const memory=createInMemoryAdminHeaderProvider({projectRef,apikey:fakeApi,bearerToken:fakeBearer});
  f.credentials={provider:()=>{f.reads++;return memory.provider();},dispose:()=>{f.disposals++;memory.dispose();}};f.memory=memory;
  f.authorization={mode:'offline-synthetic-only',gate:'4',operation:'auth-delete',projectRef,runReference:f.p.runReference,reference:f.p.gate4Approval,
    start:f.clock,end:Math.min(f.p.end,f.clock+60000),subjects:{...a02Subjects},
    operations:['A','B','U'].map((label,i)=>({label,subject:a02Subjects[label],attemptId:`9999999${i}-1111-4111-8111-111111111111`})),
    overallDeadlineMs:30000,requestDeadlineMs:7000,observationDeadlineMs:20000,ownershipReference:f.p.controls.ownership.reference,
    cleanupReference:f.observer.receiptFor('cleanup-after')?.receiptReference??'offline-no-cleanup',sourceArtifactSha256:digest('offline-delete-artifact'),liveExecutionAuthorized:false};
  f.request=async(url,init)=>{
    f.sent.push({url,init});const label=['A','B','U'][f.sent.length-1];f.armDeletion=true;
    if(!keepPresent)f.rows.find(r=>r.label===label).auth_exists=false;
    const override=await requestHook?.({url,init,label,f});return override??acknowledgement(url);
  };
  f.options={executionMode:'offline-synthetic-only',request:f.request,adminCredentials:f.credentials,acceptance:f.engine,wallNow:()=>f.clock,clock:f.time};
  f.deleter=createA02AuthDeleter(f.options);f.run=()=>f.deleter({authorization:f.authorization,signal:f.signal});return f;
}

test('synthetic-only deletion has no default/native transport',async()=>{
  const f=await cleaned();
  assert.throws(()=>createA02AuthDeleter({acceptance:f.engine}),/A02_AUTH_DELETE_BLOCKED/);
  assert.equal(projectRef,'gllsiklbvqpxzucvkehw');
});

test('exact A/B/U DELETEs require Gate4 authorization and independent committed-state reads',async()=>{
  const f=await setup();const before=f.clients;const r=await f.run();
  assert.equal(r.status,'PASS');assert.equal(r.cleanupComplete,true);assert.equal(r.requestFinality,'UNPROVEN');
  assert.equal(r.liveExecutionAuthorized,false);assert.equal(f.sent.length,3);assert.equal(f.clients-before,3);
  for(const [i,{url,init}] of f.sent.entries()){
    assert.equal(url,`https://${projectRef}.supabase.co/auth/v1/admin/users/${a02Subjects[['A','B','U'][i]]}`);
    assert.equal(init.method,'DELETE');assert.equal(init.body,undefined);assert.equal(init.redirect,'error');
    assert.equal(init.credentials,'omit');assert.equal(init.headers.apikey,fakeApi);assert.equal(init.signal.aborted,true);
  }
  assert.equal(f.disposals,1);assert.equal(f.time.pending(),0);assert.throws(()=>f.memory.provider(),/A02_CREDENTIAL_INPUT_BLOCKED/);
});

test('missing, Gate2/Gate3, mismatched or live authorization stops before headers or requests',async()=>{
  for(const mutate of [f=>f.authorization=undefined,f=>f.authorization.gate='2',f=>f.authorization.gate='3',
    f=>f.authorization.reference='other',f=>f.authorization.runReference='other',f=>f.authorization.projectRef='other',
    f=>f.authorization.liveExecutionAuthorized=true,f=>f.authorization.mode='live',f=>f.authorization.ownershipReference='other',
    f=>f.authorization.cleanupReference='other',f=>f.authorization.start=f.p.start-1,f=>f.authorization.end=f.p.end+1]){
    const f=await setup();mutate(f);const r=await f.run();assert.equal(r.status,'BLOCKED');assert.equal(r.cleanupComplete,false);
    assert.equal(f.sent.length,0);assert.equal(f.reads,0);assert.equal(f.disposals,1);
  }
});

test('unknown, missing, duplicate, wildcard, email, bulk and mismatched exact IDs are rejected',async()=>{
  for(const mutate of [a=>a.operations.pop(),a=>a.operations.push(a.operations[0]),a=>a.operations[1].attemptId=a.operations[0].attemptId,
    a=>a.operations[1].subject=a.operations[0].subject,a=>delete a.operations[0].subject,a=>a.operations[0].subject='*',
    a=>a.operations[0].subject='operator@offline.invalid',a=>a.operations[0].subject='10000000-0000-4000-8000-000000000000',
    a=>a.operations[0].label='other',a=>a.operations[0].users=['A','B'],a=>a.email='private@offline.invalid',a=>a.subjects.U=a.subjects.A]){
    const f=await setup();mutate(f.authorization);assert.equal((await f.run()).status,'BLOCKED');assert.equal(f.sent.length,0);assert.equal(f.reads,0);
  }
});

test('one-shot instance and bound evaluator cannot be reused by a second deleter',async()=>{
  const f=await setup();assert.equal((await f.run()).status,'PASS');assert.equal((await f.run()).status,'BLOCKED');
  assert.equal(f.sent.length,3);assert.equal(f.disposals,1);
  const next=createA02AuthDeleter(f.options);assert.equal((await next({authorization:f.authorization,signal:f.signal})).status,'BLOCKED');assert.equal(f.sent.length,3);
});

test('2xx alone or cached/self-asserted success cannot confirm deletion',async()=>{
  const f=await setup({keepPresent:true});const r=await f.run();assert.equal(r.status,'FAIL');assert.equal(r.cleanupComplete,false);assert.equal(f.sent.length,1);
  const g=await setup({queryHook:(sql,state)=>{if(state.armDeletion&&sql.startsWith('WITH nominated'))throw Error('offline-secret-query');}});
  const s=await g.run();assert.equal(s.status,'UNKNOWN');assert.equal(s.cleanupComplete,false);assert.equal(g.sent.length,1);
  assert.equal(g.engine.status().frozen,true);assert.doesNotMatch(JSON.stringify(s),/offline-secret/);
});

test('independent failed ROLLBACK or lingering canonical/reverse rows never accepts cleanup',async()=>{
  for(const reason of ['rollback','canonical','reverse']){
    const f=await setup({requestHook:({f})=>{if(reason==='rollback')f.rollbackFailure=true;else if(reason==='canonical')f.cleanupRows=1;else f.reverseMappings=1;}});
    const r=await f.run();assert.notEqual(r.status,'PASS');assert.equal(r.cleanupComplete,false);assert.equal(f.sent.length,1);
  }
});

test('connection loss after a synthetic effect remains UNKNOWN and freezes all further mutation',async()=>{
  const f=await setup({requestHook:()=>{throw Error('offline-secret-connection-loss');}});const before=f.clients;
  const r=await f.run();assert.equal(r.status,'UNKNOWN');assert.equal(r.transport,'CONNECTION_LOST');assert.equal(r.cleanupComplete,false);
  assert.equal(f.sent.length,1);assert.equal(f.clients,before);assert.equal(f.engine.status().unresolved,true);
  assert.equal((await f.run()).status,'BLOCKED');assert.equal(f.sent.length,1);
  assert.equal(f.engine.beginDelete({label:'B',gate:'4',attemptId:f.authorization.operations[1].attemptId,signal:f.signal}).status,'BLOCKED');
  // Even a later independently observed absence supplies no request-finality or retry authority.
  const later=await f.observer.observeCohort('delete-A',{signal:f.signal,canonical:[ca,cb]});
  assert.equal(f.engine.acceptDelete({label:'A',transport:'ACKNOWLEDGED',capture:later}).status,'BLOCKED');
  assert.equal(f.engine.status().unresolved,true);
});

test('deadline cancels a stalled response reader and leaves no cleanup success',async()=>{
  let cancellations=0;
  const f=await setup({requestHook:({url})=>{
    const body=new ReadableStream({pull:()=>new Promise(()=>{}),cancel:()=>{cancellations++;}});
    const r=new Response(body,{headers:{'content-type':'application/json'}});Object.defineProperty(r,'url',{value:url});return r;
  }});
  f.authorization.requestDeadlineMs=5;const pending=f.run();await until(()=>f.sent.length===1);
  for(let i=0;i<30;i++)await Promise.resolve();f.time.advance(5);const r=await pending;
  assert.equal(r.status,'UNKNOWN');assert.equal(r.cleanupComplete,false);assert.equal(cancellations,1);
});

test('per-request timeout cancels the synthetic port, returns UNKNOWN and never retries',async()=>{
  const f=await setup({requestHook:()=>new Promise(()=>{})});f.authorization.requestDeadlineMs=5;
  const pending=f.run();await until(()=>f.sent.length===1);f.time.advance(5);const r=await pending;
  assert.equal(r.status,'UNKNOWN');assert.equal(r.transport,'TIMEOUT');assert.equal(f.sent[0].init.signal.aborted,true);
  assert.equal(f.sent[0].init.signal.reason,'TIMEOUT');
  assert.equal(f.sent.length,1);assert.equal(f.disposals,1);assert.equal(f.time.pending(),0);assert.equal(f.engine.status().frozen,true);
});

test('overall deadline spans accepted A and pending B, independently of request timeout',async()=>{
  const f=await setup({requestHook:({label})=>label==='B'?new Promise(()=>{}):undefined});
  f.authorization.overallDeadlineMs=10;f.authorization.requestDeadlineMs=100;const pending=f.run();await until(()=>f.sent.length===2);
  f.time.advance(10);const r=await pending;assert.equal(r.status,'UNKNOWN');assert.equal(r.transport,'TIMEOUT');
  assert.equal(r.receipts.length,1);assert.equal(r.receipts[0].label,'A');assert.equal(r.cleanupComplete,false);
  assert.equal(f.sent.length,2);assert.equal(f.sent[1].init.signal.aborted,true);assert.equal(f.engine.status().frozen,true);
});

test('overall deadline propagates through a stalled independent observation; late evidence cannot complete cleanup',async()=>{
  let release;const f=await setup({queryHook:(sql,state)=>state.armDeletion&&sql.startsWith('WITH nominated')?new Promise(resolve=>{release=()=>resolve({rows:structuredClone(state.rows)});}):undefined});
  f.authorization.overallDeadlineMs=5;f.authorization.requestDeadlineMs=100;f.authorization.observationDeadlineMs=100;
  const pending=f.run();await until(()=>release!==undefined);f.time.advance(5);const r=await pending;
  assert.equal(r.status,'UNKNOWN');assert.equal(r.transport,'TIMEOUT');assert.equal(r.cleanupComplete,false);assert.equal(f.sent.length,1);
  release();for(let i=0;i<40;i++)await Promise.resolve();assert.equal(f.engine.status().unresolved,true);
  assert.equal(f.observer.receiptFor('delete-A'),undefined);assert.equal(f.sent.length,1);
  assert.equal(f.engine.transportLedger().find(x=>x.attemptId===f.authorization.operations[0].attemptId).observation,'TIMEOUT');
});

test('overall deadline is clamped to the authorized window',async()=>{
  const f=await setup({requestHook:()=>new Promise(()=>{})});f.authorization.end=f.clock+3;
  const pending=f.run();await until(()=>f.sent.length===1);f.time.advance(3);
  const r=await pending;assert.equal(r.status,'UNKNOWN');assert.equal(r.transport,'TIMEOUT');assert.equal(f.sent.length,1);
});

test('cancellation before attempt blocks; cancellation during request is UNKNOWN without retry',async()=>{
  for(const before of [true,false]){
    const f=await setup({requestHook:()=>new Promise(()=>{})}),abort=new AbortController();f.signal=abort.signal;
    if(before)abort.abort();const pending=f.run();if(!before){await until(()=>f.sent.length===1);abort.abort();}
    const r=await pending;assert.equal(r.status,before?'BLOCKED':'UNKNOWN');if(!before)assert.equal(r.transport,'CANCELED');
    assert.equal(f.sent.length,before?0:1);assert.equal(f.disposals,1);assert.equal(r.cleanupComplete,false);
  }
});

test('missing or unusable deadline enforcement fails closed before any credentials or write intent',async()=>{
  for(const broken of [()=>{throw Error('offline-secret-timer');},()=>undefined]){
    const f=await setup();f.options.clock={...f.time,schedule:broken};f.deleter=createA02AuthDeleter(f.options);
    const r=await f.run();assert.equal(r.status,'BLOCKED');assert.equal(f.reads,0);assert.equal(f.sent.length,0);assert.equal(f.disposals,1);
  }
  const f=await setup();f.options.clock={...f.time,now:()=>NaN};f.deleter=createA02AuthDeleter(f.options);
  assert.equal((await f.run()).status,'BLOCKED');assert.equal(f.sent.length,0);
});

test('missing enforced step timer or backwards monotonic clock cannot advance mutation',async()=>{
  const f=await setup();let timers=0;f.options.clock={...f.time,schedule:(...args)=>{if(++timers===2)throw Error('offline-secret');return f.time.schedule(...args);}};
  f.deleter=createA02AuthDeleter(f.options);assert.equal((await f.run()).status,'BLOCKED');assert.equal(f.sent.length,0);
  const g=await setup();let reads=0;g.options.clock={...g.time,now:()=>++reads===1?1:0};g.deleter=createA02AuthDeleter(g.options);
  assert.equal((await g.run()).status,'BLOCKED');assert.equal(g.sent.length,0);
});

test('unexpected status, redirect, cookie, wrong URL, malformed/oversized body are ambiguous, never confirmation',async()=>{
  for(const response of [url=>acknowledgement(url,202),url=>{const r=acknowledgement(url);r.headers.set('location','https://other.invalid');return r;},
    url=>{const r=acknowledgement(url);r.headers.set('set-cookie','fixture');return r;},()=>acknowledgement('https://other.invalid'),
    url=>{const r=new Response(JSON.stringify({id:'untrusted'}),{headers:{'content-type':'application/json'}});Object.defineProperty(r,'url',{value:url});return r;},
    url=>{const r=new Response('x'.repeat(1025),{headers:{'content-type':'application/json'}});Object.defineProperty(r,'url',{value:url});return r;}]){
    const f=await setup({requestHook:({url})=>response(url)});const r=await f.run();assert.equal(r.status,'UNKNOWN');assert.equal(r.cleanupComplete,false);assert.equal(f.sent.length,1);
  }
});

test('204 acknowledges only when followed by real independent synthetic absence evidence',async()=>{
  const f=await setup({requestHook:({url})=>acknowledgement(url,204)});assert.equal((await f.run()).status,'PASS');assert.equal(f.sent.length,3);
});

test('credentials disposed after success, preflight failure and UNKNOWN; disposal failure cannot claim complete cleanup',async()=>{
  const f=await setup();f.credentials.dispose=()=>{f.disposals++;f.memory.dispose();throw Error(fakeBearer);};
  const r=await f.run();assert.equal(r.status,'UNKNOWN');assert.equal(r.credentialDisposal,'FAILED');assert.equal(r.cleanupComplete,false);
  assert.equal(f.engine.status().frozen,true);assert.doesNotMatch(JSON.stringify(r),/offline-secret/);
  const g=await setup();g.credentials.provider=()=>({apikey:fakeApi,Authorization:'invalid'});
  assert.equal((await g.run()).status,'BLOCKED');assert.equal(g.sent.length,0);assert.equal(g.disposals,1);
  const h=await setup();h.credentials.provider=()=>({apikey:fakeApi,Authorization:`Bearer ${fakeBearer}\0`});
  assert.equal((await h.run()).status,'BLOCKED');assert.equal(h.sent.length,0);assert.equal(h.disposals,1);
});

test('receipts/diagnostics contain no credentials or raw exceptions, and finality remains UNPROVEN',async()=>{
  const f=await setup({requestHook:()=>{throw Error(fakeApi+' '+fakeBearer);}});const r=await f.run();
  for(const text of [JSON.stringify(r),inspect(r),JSON.stringify(f.engine.ledger()),JSON.stringify(f.engine.transportLedger())]){
    assert.ok(!text.includes(fakeApi));assert.ok(!text.includes(fakeBearer));assert.doesNotMatch(text,/refresh_token|password|Authorization/);
  }
  assert.equal(r.requestFinality,'UNPROVEN');assert.equal(r.retryAllowed,false);assert.equal(r.cleanupComplete,false);
});

test('cleanup/ownership/UNKNOWN barriers and forged acceptance objects stop before transport',async()=>{
  const f=await setup({beforeCleanup:true});assert.equal((await f.run()).status,'BLOCKED');assert.equal(f.sent.length,0);
  const g=await setup();g.options.acceptance={bindAuthDeletion:()=>({begin:()=>({status:'PASS'}),confirm:()=>({status:'PASS'}),complete:()=>({status:'PASS',cleanupComplete:true})})};
  g.deleter=createA02AuthDeleter(g.options);assert.equal((await g.run()).status,'BLOCKED');assert.equal(g.sent.length,0);assert.equal(g.reads,0);
});

test('strict mode and current Gate2 readiness cannot become deletion authority',async()=>{
  const f=await setup();const strict=createA02Acceptance({strict:{observer:f.observer,readTerminal:async()=>{},runReference:'offline-strict'}});
  assert.equal(typeof strict,'function');assert.throws(()=>createA02AuthDeleter({...f.options,acceptance:strict}),/A02_AUTH_DELETE_BLOCKED/);
  const packet=JSON.parse(await readFile(new URL('../docs/canonical-acceptance/a02-temporary/gate2-execution-packet.json',import.meta.url),'utf8'));
  assert.equal(packet.liveExecutionAuthorized,false);assert.equal(packet.acceptancePolicy.mode,'strict');assert.equal(packet.invariants.applicationProvisioningFlag,'OFF');
});

test('module has no native/live HTTP, credential discovery, persistence or execution entrypoint',async()=>{
  const source=await readFile(new URL('./a02-auth-delete.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/from ['"]node:https|fetch\(|httpsRequest|process\.env|process\.argv|writeFile|console\.|child_process/);
  const f=await setup();assert.throws(()=>createA02AuthDeleter({...f.options,executionMode:'live'}),/A02_AUTH_DELETE_BLOCKED/);
  assert.throws(()=>createA02AuthDeleter({...f.options,request:undefined}),/A02_AUTH_DELETE_BLOCKED/);assert.equal(f.sent.length,0);
});
