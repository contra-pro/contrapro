import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createA02AuthCreator} from './a02-auth-create.mjs';
import {createInMemoryAdminHeaderProvider,createInMemoryCredentialProvider} from './a02-private-input.mjs';
const get=f=>readFile(new URL(f,import.meta.url),'utf8');
test('static client paths have no logging sinks or secret persistence; email values are parameters',async()=>{
  for(const f of ['a02-auth-create.mjs','a02-session-transport.mjs','a02-independent-observer.mjs','a02-reconciliation.mjs','a02-private-input.mjs']){
    const source=await get('./'+f);assert.doesNotMatch(source,/console\.|\.writeFile\(|appendFile\(|logger\.|localStorage|sessionStorage/);
  }
  const observer=await get('./a02-independent-observer.mjs');
  assert.match(observer,/\$2::text/);assert.match(observer,/client\.query\(text,params\)/);
  assert.match(observer,/parameterLoggingCleared!==true/);assert.match(observer,/parameterLoggingReview/);
});
test('prepared Admin provider integrates with exact bounded executor; raw transport errors never appear in results',async()=>{
  const admin=createInMemoryAdminHeaderProvider({projectRef:'gllsiklbvqpxzucvkehw',apikey:'offline-private-apikey-value',bearerToken:'offline-private-bearer-value'});
  const users=createInMemoryCredentialProvider(Object.fromEntries(['A','B','U'].map(x=>[x,{email:`${x}@offline.invalid`,password:'offline-private-password-value'}])));
  const t=1794916800000;let sent=0;
  const create=createA02AuthCreator({adminHeaderProvider:admin.provider,credentialProvider:users.provider,now:()=>t,
    absenceCheck:async x=>({...x,idExists:false,emailExists:false,receiptReference:'offline-only-evidence',observedAt:t}),
    send:async(_url,init)=>{sent++;assert.equal(init.headers.apikey,'offline-private-apikey-value');throw Error('offline-private-bearer-value offline-private-password-value');}});
  const result=await create({approval:{projectRef:'gllsiklbvqpxzucvkehw',runReference:'offline-run',reference:'offline-fixture-approval',maximumCreates:3,start:t,end:t+7200000,wrapperExpiry:t+900000},signal:new AbortController().signal});
  assert.equal(result.state,'uncertain');assert.equal(sent,1);assert.ok(!JSON.stringify(result).includes('private'));
  admin.dispose();users.dispose();
});
test('reconciliation always requires independent exact-ID state after terminal evidence, never executor status alone',async()=>{
  const source=await get('./a02-reconciliation.mjs');
  assert.match(source,/terminal\.state!=='FINISHED'/);assert.match(source,/observer\.observeCohort/);
  assert.match(source,/capture\.startedAt<terminal\.completedAt/);
  assert.match(source,/terminal\.commit==='COMMITTED'&&present/);
  assert.match(source,/terminal\.commit==='ROLLED_BACK'&&absent/);
});
