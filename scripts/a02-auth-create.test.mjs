import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {readFile} from 'node:fs/promises';
import {createA02AuthCreator,createA02AuthAdminTransport,a02AuthCreateUrl} from './a02-auth-create.mjs';
import {createInMemoryCredentialProvider} from './a02-private-input.mjs';
const t=1794916800000;
function setup(overrides={}){
  const calls=[];const memory=createInMemoryCredentialProvider(Object.fromEntries(['A','B','U'].map(x=>[x,{email:`${x}@fixture.invalid`,password:`offline-fixture-${x}-only`}])));
  const approval={projectRef:'gllsiklbvqpxzucvkehw',reference:'offline-approval-fixture',runReference:'offline-run',maximumCreates:3,start:t,end:t+7200000,wrapperExpiry:t+900000};
  const create=createA02AuthCreator({credentialProvider:memory.provider,now:()=>t,
    adminHeaderProvider:()=>({apikey:'offline-header-value-only',Authorization:'Bearer offline-header-value-only'}),
    absenceCheck:async x=>({...x,idExists:false,emailExists:false,receiptReference:'offline-receipt',observedAt:t}),
    send:async(url,init)=>{calls.push({url,init});const body=JSON.parse(init.body);const r=new Response(JSON.stringify({id:body.id,email:body.email}),{headers:{'content-type':'application/json'}});Object.defineProperty(r,'url',{value:url});return r;},...overrides});
  return {create,approval,calls,memory,signal:new AbortController().signal};
}
test('exact three nominated creates, no metadata/roles or success without independent readback',async()=>{
  const f=setup();const result=await f.create(f);assert.equal(result.state,'acknowledged_requires_independent_readback');
  assert.equal(f.calls.length,3);assert.equal(new Set(f.calls.map(x=>JSON.parse(x.init.body).id)).size,3);
  for(const x of f.calls){assert.equal(x.url,a02AuthCreateUrl);assert.equal(x.init.redirect,'error');assert.equal(Object.keys(JSON.parse(x.init.body)).sort().join(),'email,email_confirm,id,password');}
  assert.equal((await f.create(f)).state,'blocked');assert.equal(f.calls.length,3);f.memory.dispose();
});
test('missing approval, wrong target, collision and fake absence stop before send',async()=>{
  for(const mutate of [f=>delete f.approval.reference,f=>f.approval.projectRef='other',f=>f.approval.wrapperExpiry=t]){
    const f=setup();mutate(f);assert.equal((await f.create(f)).state,'blocked');assert.equal(f.calls.length,0);
  }
  const f=setup({absenceCheck:async()=>true});assert.equal((await f.create(f)).state,'blocked');assert.equal(f.calls.length,0);
});
test('ambiguous write, wrong returned subject and redirect stop with no retry or error leakage',async()=>{
  for(const send of [async()=>{throw Error('private-fixture-value');},async()=>{
    const r=new Response('{"id":"wrong"}',{headers:{'content-type':'application/json'}});Object.defineProperty(r,'url',{value:a02AuthCreateUrl});return r;
  },async()=>{const r=new Response('',{status:302,headers:{location:'https://other.invalid'}});Object.defineProperty(r,'url',{value:a02AuthCreateUrl});return r;}]){
    let count=0;const f=setup({send:(...args)=>{count++;return send(...args);}});const result=await f.create(f);
    assert.equal(result.state,'uncertain');assert.equal(count,1);assert.ok(!JSON.stringify(result).includes('private-fixture-value'));
    assert.equal((await f.create(f)).state,'blocked');assert.equal(count,1);
  }
});
test('cancellation stops a noncooperative write and retains uncertainty',async()=>{
  const c=new AbortController();let called=false;
  const f=setup({send:()=>{called=true;queueMicrotask(()=>c.abort());return new Promise(()=>{});}});
  assert.equal((await f.create({...f,signal:c.signal})).state,'uncertain');assert.equal(called,true);
});
test('Admin transport rejects arbitrary targets and update routes before native request',async()=>{
  let calls=0;const send=createA02AuthAdminTransport({requestImpl:()=>{calls++;throw Error('fixture');}});
  for(const url of ['https://other.invalid/auth/v1/admin/users',a02AuthCreateUrl+'/id'])await assert.rejects(send(url,{}),/A02_AUTH_CREATE_BLOCKED/);
  assert.equal(calls,0);
});
test('pinned Admin transport has explicit TLS verification and sanitized native failures',async()=>{
  const f=setup();await f.create(f);const init=f.calls[0].init;
  const send=createA02AuthAdminTransport({requestImpl:(url,options)=>{
    assert.equal(url,a02AuthCreateUrl);assert.equal(options.rejectUnauthorized,true);assert.equal(options.agent,false);
    assert.equal(options.servername,'gllsiklbvqpxzucvkehw.supabase.co');
    const req=new EventEmitter();req.end=()=>queueMicrotask(()=>req.emit('error',Error('private-native-error')));req.destroy=()=>{};return req;
  }});
  await assert.rejects(send(a02AuthCreateUrl,{...init,signal:new AbortController().signal}),/^Error: A02_AUTH_CREATE_BLOCKED$/);
});
test('observer artifact is read-only, bounded and nominates only fixed subjects',async()=>{
  const sql=await readFile(new URL('../docs/canonical-acceptance/a02-temporary/cohort-observation.sql',import.meta.url),'utf8');
  const statements=sql.replace(/--[^\n]*/g,'');
  assert.doesNotMatch(statements.replace(/'(?:[^']|'')*'/g,"''"),/\b(INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|CALL|DO)\b/i);
  assert.match(sql,/REPEATABLE READ READ ONLY/);assert.match(sql,/statement_timeout='5000ms'/);
  assert.match(sql,/idle_in_transaction_session_timeout='10000ms'/);assert.match(sql,/ROLLBACK;\s*$/);
  assert.match(sql,/LIMIT 3/);assert.match(sql,/LIMIT 12/);assert.match(sql,/LIMIT 2/);
  assert.doesNotMatch(statements,/\b(email|password|access_token|refresh_token|token_digest)\b/);
});
