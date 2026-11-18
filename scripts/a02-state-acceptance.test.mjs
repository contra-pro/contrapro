import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspect} from 'node:util';
import {createA02Acceptance,createA02StateAcceptance,assessA02StatePolicy,a02StateControls} from './a02-state-acceptance.mjs';
import {a02Subjects} from './a02-independent-observer.mjs';
import {createA02AuthCreator} from './a02-auth-create.mjs';
import {createFixtureProvisioner} from './a02-session-transport.mjs';
import {validateA02Packet} from './a02-packet-readiness.mjs';
import {projectRef,t,ca,cb,digest,policy,row,rows,fixture,initialized,authReady,provisioned,removed,cleaned} from "./a02-state-fixtures.mjs";
function sessions(f){return Object.fromEntries(['A','B','U'].map(label=>{
  const expiresAt=Math.floor((f.clock+600000)/1000)*1000;
  const claims={sub:a02Subjects[label],iss:`https://${projectRef}.supabase.co/auth/v1`,aud:'authenticated',role:'authenticated',is_anonymous:false,exp:expiresAt/1000};
  return [label,{accessToken:`e30.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.offline`,subject:a02Subjects[label],
    canonicalUserId:label==='A'?ca:label==='B'?cb:null,verifiedAt:f.clock,expiresAt,isSynthetic:true,source:'operator-verified-existing-session',projectRef}];
}));}
function isolationPorts(f,{wrong,reviewMissing,stale}={}){
  const verified=sessions(f);if(stale)verified.B.verifiedAt-=60001;
  const config={projectRef,environment:'development',appOrigin:'http://127.0.0.1:3000',projectUrl:`https://${projectRef}.supabase.co`,provisioningEnabled:false,
    authenticatedExecuteDenied:true,operatorTargetConfirmed:true,artifactContractVerified:true,publicKey:'sb_publishable_offline',sessions:verified};
  const requests=[];let count=0;
  const request=async(url,init)=>{const label=['A','B','U'][count++];assert.equal(init.method,'GET');
    requests.push({method:'GET',url,label,subject:a02Subjects[label]});
    const r=label==='U'?[]:[{supabase_user_id:a02Subjects[label],user_id:label==='A'?ca:cb,user_state:'active',
      membership_id:null,agency_id:null,agency_name:null,membership_state:null,agency_state:null}];
    if(wrong==='swap'&&label==='A')r[0].user_id=cb;if(wrong==='U'&&label==='U')r.push({});
    const response=new Response(JSON.stringify(r),{headers:{'content-type':'application/json'}});Object.defineProperty(response,'url',{value:url});return response;
  };
  const readIndependentTransportReview=async()=>{
    if(reviewMissing)return {noDataChanges:true};
    // Independent synthetic source, intentionally not the executor's requests array.
    const body={projectRef,runReference:f.p.runReference,sourceReviewReference:f.p.gate3TransportReview,startedAt:f.clock,endedAt:f.clock,
      requests:['A','B','U'].map(label=>({method:'GET',url:`https://${projectRef}.supabase.co/rest/v1/rpc/contratpro_auth_access`,label,subject:a02Subjects[label]}))};
    return {...body,sha256:digest(JSON.stringify(body))};
  };
  return {config,request,readIndependentTransportReview,signal:f.signal,count:()=>count,requests};
}

test('B01 explicit policy required; unknown mode is BLOCKED and strict is the default',()=>{
  assert.throws(()=>createA02Acceptance({mode:'state-based-v1'}),/A02_STATE_BLOCKED/);
  assert.throws(()=>createA02Acceptance({mode:'fallback'}),/A02_STATE_BLOCKED/);
  assert.throws(()=>createA02Acceptance(),/A02_RECONCILIATION_BLOCKED/);
});

test('B02 baseline and nominations bind exact target/run/identity; collisions, duplicates and stale evidence block',async()=>{
  for(const mutate of [p=>p.projectRef='other',p=>p.subjects.A=p.subjects.B,p=>p.operations[0].subject=a02Subjects.B,p=>p.runReference='UNBOUND']){
    const p=policy();mutate(p);assert.equal(assessA02StatePolicy(p).status,'BLOCKED');
  }
  for(const kind of ['stale','wrong-run','existing','duplicate','missing']){
    const f=await fixture();if(kind==='existing')f.rows=rows('auth');let c=await f.capture('baseline');
    if(kind==='stale')f.advance(20001);
    if(kind==='wrong-run')c={...c,runReference:'other'};
    if(kind==='missing')c=undefined;
    if(kind==='duplicate')assert.equal(f.engine.initialize(c).status,'PASS');
    assert.equal(f.engine.initialize(c).status,'BLOCKED');assert.equal(f.begin('auth-create','A').status,'BLOCKED');
  }
  const f=await fixture();f.engine.initialize(await f.capture('baseline'));f.engine.installation({transport:'ACKNOWLEDGED',capture:await f.capture('post-install'),reviewReference:'offline-native'});
  f.collision=true;assert.equal(f.engine.collisions(await f.observer.observeAbsence(f)).status,'BLOCKED');
});

test('B03 three Auth ACKs require exact independent three-present unmapped state',async()=>{
  for(const complete of [true,false]){
    const f=await initialized();for(const label of ['A','B','U'])f.ack('auth-create',label);
    f.rows=rows('auth');if(!complete)f.rows[2].auth_exists=false;
    assert.equal(f.engine.accept('auth',await f.capture('after-auth')).status,complete?'PASS':'UNKNOWN');
  }
});

test('B04 ACK alone, cached clone or executor success flag cannot establish committed state',async()=>{
  for(const kind of ['none','clone','flag']){
    const f=await initialized();for(const label of ['A','B','U'])f.ack('auth-create',label);f.rows=rows('auth');
    const c=kind==='none'?undefined:kind==='flag'?{state:'confirmed'}:structuredClone(await f.capture('after-auth'));
    assert.equal(f.engine.accept('auth',c).status,'UNKNOWN');assert.equal(f.begin('provision','A').status,'BLOCKED');
  }
});

test('B05 partial Auth timeout freezes existing creator and a second creator before B/U or replay',async()=>{
  const f=await initialized();let sends=0;
  const options={stateAcceptance:f.engine,now:()=>f.clock,credentialProvider:label=>({email:`${label}@offline.invalid`,password:'offline-only-password'}),
    adminHeaderProvider:()=>({apikey:'offline-header-value-only',Authorization:'Bearer offline-header-value-only'}),absenceCheck:f.observer.absenceCheck,
    send:async(url,init)=>{sends++;if(sends===2)throw Error('SYNTHETIC timeout');const body=JSON.parse(init.body);
      const r=new Response(JSON.stringify({id:body.id,email:body.email}),{headers:{'content-type':'application/json'}});Object.defineProperty(r,'url',{value:url});return r;}};
  const input={approval:{projectRef,runReference:f.p.runReference,reference:'offline-auth',start:f.p.start,end:f.p.end,maximumCreates:3,wrapperExpiry:t+600000},signal:f.signal};
  const creator=createA02AuthCreator(options);
  assert.equal((await creator(input)).state,'uncertain');assert.equal(sends,2);
  assert.equal((await creator(input)).state,'blocked');assert.equal((await createA02AuthCreator(options)(input)).state,'blocked');assert.equal(sends,2);
  assert.equal(f.engine.status().frozen,true);
  assert.throws(()=>createA02StateAcceptance({policy:f.p,observer:f.observer,now:()=>f.clock}),/A02_STATE_BLOCKED/);
});

test('B06 existing provisioner integrates sequential A/B independent mapping acceptance; U never provisioned',async()=>{
  const f=await authReady();const verified=sessions(f);let sends=0;
  const provision=createFixtureProvisioner({...a02Subjects,projectRef,expiresAt:new Date(t+600000).toISOString()},
    {stateAcceptance:f.engine,now:()=>f.clock,confirmMapping:f.engine.confirmMapping,send:async url=>{
      sends++;f.rows=rows(sends===1?'A':'B');const r=new Response(JSON.stringify('created'),{headers:{'content-type':'application/json'}});Object.defineProperty(r,'url',{value:url});return r;}});
  for(const label of ['A','B'])assert.equal((await provision(label,verified[label],{publicKey:'sb_publishable_offline',signal:f.signal})).state,'confirmed');
  assert.equal((await provision('U',verified.U,{publicKey:'sb_publishable_offline',signal:f.signal})).state,'blocked');
  assert.equal(sends,2);assert.equal(f.engine.status().frozen,false);
});

test('B07 equal/shared/switched/inactive canonical IDs, missing Auth and premature B/U are integrity FAIL',async()=>{
  for(const mutate of [r=>r[0].canonical_user_id=a02Subjects.A,r=>r[0].canonical_active=false,r=>r[1].auth_exists=false,
    r=>{r[1].canonical_user_id=ca;r[1].canonical_active=true;},r=>{r[1].canonical_user_id=cb;r[1].canonical_active=true;},
    r=>{r[2].canonical_user_id=cb;r[2].canonical_active=true;}]){
    const f=await authReady();f.ack('provision','A');f.rows=rows('A');mutate(f.rows);assert.equal(f.engine.accept('A',await f.capture('after-A')).status,'FAIL');
  }
  const f=await authReady();f.ack('provision','A');f.rows=rows('A');f.engine.accept('A',await f.capture('after-A'));
  f.ack('provision','B');f.rows=rows('B');f.rows[0].canonical_user_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  assert.equal(f.engine.accept('B',await f.capture('after-B')).status,'FAIL');
  const g=await uncertainA();g.rows[1].auth_exists=false;assert.equal((await g.engine.recover('A',g)).status,'FAIL');
});

test('B08 every scoped membership (including revoked) or business reference fails cohort acceptance',async()=>{
  for(const field of ['memberships','agencies','clients','invitations_by_cohort','audit_by_cohort']){
    const f=await authReady();f.ack('provision','A');f.rows=rows('A');f.rows[0][field]='1';
    assert.equal(f.engine.accept('A',await f.capture('after-A')).status,'FAIL');
  }
});

test('B09 timeout/loss/cancellation/post-write expiry freeze mutations and never retry',async()=>{
  for(const observation of ['TIMEOUT','CONNECTION_LOST','CANCELED','POST_WRITE_EXPIRY','MALFORMED','EXISTING','REJECTED']){
    const f=await authReady();const intent=f.begin('provision','A');assert.equal(f.engine.transport({attemptId:intent.attemptId,observation}).status,'UNKNOWN');
    assert.equal(f.begin('provision','A').status,'BLOCKED');assert.equal(f.begin('provision','B').status,'BLOCKED');
    assert.equal(f.engine.ledger().filter(a=>a.operation==='provision').length,1);
  }
});

async function uncertainA(){const f=await authReady();f.ack('provision','A','TIMEOUT');return f;}
test('B10 two absent recovery snapshots remain UNKNOWN, never rollback/no-write proof',async()=>{
  const f=await uncertainA();assert.equal((await f.engine.recover('A',f)).status,'UNKNOWN');f.advance(1000);
  const r=await f.engine.recover('A',f);assert.equal(r.status,'UNKNOWN');assert.equal(r.requestFinality,'UNPROVEN');
  assert.doesNotMatch(JSON.stringify(r),/ROLLED_BACK|confirmed-no-write|FINISHED/);
});

test('B11 stable positive recovery requires explicit owner adoption and grants no continuation or cleanup',async()=>{
  const f=await uncertainA();f.rows=rows('A');await f.engine.recover('A',f);f.advance(1000);
  assert.equal((await f.engine.recover('A',f)).reason,'POSITIVE_STATE_OBSERVED');assert.equal(f.engine.status().unresolved,true);
  const input={phase:'A',operator:'project owner',reviewReference:'offline-owner-adoption',acknowledgeUnprovenFinality:true,
    captureReferences:['reconcile-A-1','reconcile-A-2'].map(c=>f.observer.receiptFor(c).receiptReference)};
  assert.equal(f.engine.adopt({...input,reviewReference:'UNBOUND'}).status,'BLOCKED');
  const r=f.engine.adopt(input);assert.equal(r.status,'PASS');assert.equal(r.requestFinality,'UNPROVEN');
  assert.equal(f.begin('provision','B').status,'BLOCKED');assert.equal(f.engine.beginCleanup({signal:f.signal}).status,'BLOCKED');
});

test('B12 changing/one capture, failed ROLLBACK, tampered or stale metadata cannot PASS recovery',async()=>{
  const f=await uncertainA();f.rows=rows('A');await f.engine.recover('A',f);
  assert.equal(f.engine.adopt({phase:'A'}).status,'BLOCKED');f.advance(1000);f.rows=rows('auth');
  assert.equal((await f.engine.recover('A',f)).reason,'STATE_UNRESOLVED');
  const g=await uncertainA();g.rollbackFailure=true;assert.equal((await g.engine.recover('A',g)).status,'BLOCKED');
  const h=await initialized();for(const label of ['A','B','U'])h.ack('auth-create',label);h.rows=rows('auth');
  const c=await h.capture('after-auth');assert.throws(()=>{c.rows[0].auth_exists=false;},TypeError);
  h.advance(20001);assert.equal(h.engine.accept('auth',c).status,'UNKNOWN');
});

test('B13 two slots per phase/six total, >=1s gap, <=45s pair and cancellation are enforced before extra capture',async()=>{
  const f=await uncertainA();await f.engine.recover('A',f);const clients=f.clients;
  assert.equal((await f.engine.recover('A',f)).status,'BLOCKED');assert.equal(f.clients,clients);
  f.advance(1000);await f.engine.recover('A',f);assert.equal((await f.engine.recover('A',f)).status,'BLOCKED');assert.equal(f.clients,clients+1);
  const g=await uncertainA();await g.engine.recover('A',g);g.advance(45001);assert.equal((await g.engine.recover('A',g)).status,'BLOCKED');
  const h=await uncertainA();const c=new AbortController();c.abort();assert.equal((await h.engine.recover('A',{signal:c.signal})).status,'BLOCKED');
  const j=await fixture();j.rows=rows('auth');
  for(const phase of ['auth','A','B']){await j.capture(`reconcile-${phase}-1`);j.advance(1000);await j.capture(`reconcile-${phase}-2`);}
  const before=j.clients;await assert.rejects(j.capture('reconcile-B-3'),/A02_OBSERVER_BLOCKED/);await assert.rejects(j.capture('reconcile-auth-1'),/A02_OBSERVER_BLOCKED/);assert.equal(j.clients,before);
  const k=await fixture({queryHook:(sql,f)=>{if(sql.startsWith('WITH nominated')&&f.clients===2)f.advance(45001);}});
  await k.capture('reconcile-A-1');k.advance(1000);await assert.rejects(k.capture('reconcile-A-2'),/A02_OBSERVER_BLOCKED/);
});

test('B14 unknown native installation remains UNKNOWN despite absent wrapper: no replay/remove/history shortcut',async()=>{
  const f=await fixture();f.engine.initialize(await f.capture('baseline'));
  assert.equal(f.engine.installation({transport:'TIMEOUT'}).status,'UNKNOWN');
  assert.equal(f.engine.installation({transport:'ACKNOWLEDGED'}).status,'BLOCKED');
  assert.equal(f.engine.lifecycle({operation:'remove',transport:'ACKNOWLEDGED',approvalReference:'offline-containment',capture:await f.capture('post-removal')}).status,'BLOCKED');
  assert.equal(f.engine.status().nativeUnknown,true);
});

test('B15 only explicitly approved containment after known install can accept removal; no drain claim',async()=>{
  const f=await uncertainA();f.advance();const c=await f.capture('post-removal');
  assert.equal(f.engine.lifecycle({operation:'remove',transport:'ACKNOWLEDGED',capture:c,approvalReference:'other'}).status,'BLOCKED');
  const r=f.engine.lifecycle({operation:'remove',transport:'ACKNOWLEDGED',capture:c,approvalReference:f.p.containmentApproval,reviewReference:'offline-native'});
  assert.equal(r.status,'PASS');assert.equal(r.scope,'containment');assert.equal(f.engine.status().unresolved,true);
  assert.equal(r.requestFinality,'UNPROVEN');
});

test('B16 delayed write after absent containment does not clear UNKNOWN or permit cleanup',async()=>{
  const f=await uncertainA();await f.engine.recover('A',f);f.engine.lifecycle({operation:'remove',transport:'ACKNOWLEDGED',capture:await f.capture('post-removal'),
    approvalReference:f.p.containmentApproval,reviewReference:'offline-native'});f.contained=true;f.advance(1000);f.rows=rows('A');
  assert.equal((await f.engine.recover('A',f)).status,'UNKNOWN');assert.equal(f.engine.status().unresolved,true);
  assert.equal(f.engine.beginCleanup({signal:f.signal}).status,'BLOCKED');
});

test('B17 failed DROP has no revoke/removal PASS; expiry is not evidence and disable uses native verifier',async()=>{
  const f=await provisioned();const r=f.engine.lifecycle({operation:'remove',transport:'REJECTED',approvalReference:'offline-lifecycle',rollbackReviewReference:'offline-independent-native-rollback-review'});
  assert.equal(r.status,'UNKNOWN');assert.match(r.reason,/REVIEWED_NATIVE_ROLLBACK/);
  assert.equal(f.engine.lifecycle({operation:'disable',transport:'ACKNOWLEDGED',approvalReference:f.p.containmentApproval}).status,'UNKNOWN');
  f.advance(900000);assert.notEqual(f.engine.lifecycle({operation:'remove',transport:'EXPIRED',approvalReference:f.p.containmentApproval}).status,'PASS');
});

test('B18 Gate 3 executes actual three GETs with independent scoped review; swapped rows and unexpected U FAIL',async()=>{
  for(const wrong of [undefined,'swap','U']){
    const f=await removed(),ports=isolationPorts(f,{wrong});const r=await f.engine.isolation(ports);
    assert.equal(r.status,wrong?'FAIL':'PASS');assert.equal(ports.count(),wrong==='swap'?1:3);
    assert.equal((await f.engine.isolation(ports)).status,'BLOCKED');assert.ok(ports.count()<=3);
  }
});

test('B19 stale/unverified sessions block before GET, no login/refresh/fourth request',async()=>{
  const f=await removed(),ports=isolationPorts(f,{stale:true});assert.equal((await f.engine.isolation(ports)).status,'BLOCKED');assert.equal(ports.count(),0);
});

test('B20 a constant no-change flag is not independent scoped transport/state evidence',async()=>{
  const f=await removed(),ports=isolationPorts(f,{reviewMissing:true});assert.equal((await f.engine.isolation(ports)).status,'UNKNOWN');assert.equal(ports.count(),3);
  const g=await removed(),q=isolationPorts(g);delete q.readIndependentTransportReview;assert.equal((await g.engine.isolation(q)).status,'BLOCKED');assert.equal(q.count(),0);
});

test('B21 unknown creation/canonical identity, ownership or dependencies block Gate 4 before deletion',async()=>{
  const f=await uncertainA();assert.equal(f.engine.beginCleanup({signal:f.signal}).status,'BLOCKED');
  for(const missing of ['ownership','dependency','canonical']){
    const g=await removed();if(missing==='canonical')g.rows[0].canonical_user_id=null;
    const c=await g.capture('cleanup-before');assert.equal(g.engine.beginCleanup({capture:c,signal:g.signal,approvalReference:g.p.gate4Approval,
      ownershipReference:missing==='ownership'?'UNBOUND':g.p.controls.ownership.reference,dependencyReview:missing==='dependency'?'UNBOUND':'offline-dependencies'}).status,'BLOCKED');
    assert.equal(g.engine.beginDelete({label:'A',gate:'4',attemptId:'99999999-1111-4111-8111-111111111111',signal:g.signal}).status,'BLOCKED');
  }
});

test('B22 Gate 4 known cleanup and exact Auth deletion need independent canonical/reverse/Auth absence, not SDK cache',async()=>{
  const f=await cleaned();assert.equal(f.engine.beginDelete({label:'A',gate:'4',attemptId:'99999999-1111-4111-8111-111111111111',signal:f.signal}).status,'PASS');
  f.rows[0].auth_exists=false;const r=f.engine.acceptDelete({label:'A',transport:'ACKNOWLEDGED',capture:await f.capture('delete-A')});assert.equal(r.status,'PASS');assert.equal(r.requestFinality,'UNPROVEN');
  const g=await cleaned();g.engine.beginDelete({label:'A',gate:'4',attemptId:'99999999-1111-4111-8111-111111111111',signal:g.signal});
  assert.equal(g.engine.acceptDelete({label:'A',transport:'ACKNOWLEDGED',capture:{user:{id:a02Subjects.A}}}).status,'UNKNOWN');
});

test('B23 deletion timeout even followed by absence remains UNKNOWN; recreation FAIL; no second DELETE',async()=>{
  const f=await cleaned();const input={label:'A',gate:'4',attemptId:'99999999-1111-4111-8111-111111111111',signal:f.signal};f.engine.beginDelete(input);f.rows[0].auth_exists=false;
  assert.equal(f.engine.acceptDelete({label:'A',transport:'TIMEOUT',capture:await f.capture('delete-A')}).status,'UNKNOWN');assert.equal(f.engine.beginDelete(input).status,'BLOCKED');
  const g=await cleaned();g.engine.beginDelete({...input,signal:g.signal});g.rows[0].auth_exists=false;g.engine.acceptDelete({label:'A',transport:'ACKNOWLEDGED',capture:await g.capture('delete-A')});
  g.engine.beginDelete({...input,label:'B',attemptId:'99999998-1111-4111-8111-111111111111',signal:g.signal});g.rows[0].auth_exists=true;g.rows[1].auth_exists=false;
  assert.equal(g.engine.acceptDelete({label:'B',transport:'ACKNOWLEDGED',capture:await g.capture('delete-B')}).status,'FAIL');
  const h=await removed();h.engine.beginCleanup({capture:await h.capture('cleanup-before'),signal:h.signal,
    approvalReference:h.p.gate4Approval,ownershipReference:h.p.controls.ownership.reference,dependencyReview:'offline-dependencies'});
  assert.equal(h.engine.acceptCleanup({transport:'TIMEOUT'}).status,'UNKNOWN');h.rows=rows('auth');h.cleanupRows=0;h.reverseMappings=0;
  assert.equal(h.engine.acceptCleanup({transport:'ACKNOWLEDGED',capture:await h.capture('cleanup-after')}).status,'BLOCKED');
});

test('B24 Gate 2 deletion and unapproved Gate 3/4 transitions are BLOCKED',async()=>{
  const f=await initialized();assert.equal(f.begin('auth-delete','A').status,'BLOCKED');
  assert.equal(f.engine.beginDelete({label:'A',gate:'2',attemptId:'99999999-1111-4111-8111-111111111111',signal:f.signal}).status,'BLOCKED');
  assert.equal((await f.engine.isolation({signal:f.signal})).status,'BLOCKED');
  const g=await removed();const p=structuredClone(g.p);p.runReference+='-unapproved-isolation';delete p.gate3Approval;
  const separate=createA02StateAcceptance({policy:p,observer:g.observer,now:()=>g.clock});assert.equal((await separate.isolation(isolationPorts(g))).status,'BLOCKED');
});

test('B25 every independent logging/Admin/runtime/TLS/credential/ownership/run/approval blocker remains required',()=>{
  for(const key of a02StateControls){const p=policy();p.controls[key].verdict='UNVERIFIED';assert.equal(assessA02StatePolicy(p).status,'BLOCKED');}
  for(const key of ['gate2Approval','approvalReference','reviewReference']){const p=policy();p[key]='UNBOUND';assert.equal(assessA02StatePolicy(p).status,'BLOCKED');}
  const p=policy();p.loggingEvidence=undefined;assert.equal(assessA02StatePolicy(p).status,'BLOCKED');
});

test('B26 diagnostics/ledger/results do not expose private inputs; original five template hashes remain exact',async()=>{
  const f=await authReady();const out=JSON.stringify({ledger:f.engine.ledger(),status:f.engine.status(),inspection:inspect(f.engine)});
  assert.doesNotMatch(out,/@|password|accessToken|refresh_token|Authorization|offline-only-password/);
  const packet=JSON.parse(await readFile(new URL('../docs/canonical-acceptance/a02-temporary/gate2-execution-packet.json',import.meta.url),'utf8'));
  const expected=['08f4b66973ca4c786751fd47a04dff5713e9ed898bf66820c36405cb8836a922','f384fb20e2ab3afa2eca28b5845aba518917ccd191caafe9bfdbeed3eace1652',
    'e542db7cd26f1f2c7c582322a33c65936e0c3f8c53738fa3da96cee87bf568fc','106508c4d0319e43938b5bfd660788f333354189d0e225dbf8af6ee5cc5b28e9','bd9fda16e2979f203ad75d50db95cc3e711318dabbd97dd7d728463e56057c8d'];
  for(const [i,name] of ['ownership-reference.json','credential-channel-reference.json','destination-reference.json','execution-manifest.json','observation-manifest.json'].entries()){
    assert.equal(digest(await readFile(`${packet.privateEvidence.actualAbsoluteDirectory}/${name}`)),expected[i]);
  }
});

test('B27 state tooling remains separate from app gates; FR/AR and mapped-user/client behavior is checked by existing web suites',async()=>{
  const source=await readFile(new URL('./a02-state-acceptance.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/apps\/web|process\.env|writeFile|node:https|\.query\(/);
  const packet=JSON.parse(await readFile(new URL('../docs/canonical-acceptance/a02-temporary/gate2-execution-packet.json',import.meta.url),'utf8'));
  assert.equal(packet.invariants.applicationProvisioningFlag,'OFF');assert.equal(packet.liveExecutionAuthorized,false);
  // This boundary test is paired with the real, separately run web regression suites.
});

test('B28 state PASS never fabricates transaction identity, FINISHED, rollback/drain or live authorization',async()=>{
  const f=await provisioned();const r=f.engine.lifecycle({operation:'remove',transport:'ACKNOWLEDGED',capture:await f.capture('post-removal'),approvalReference:'offline-lifecycle',reviewReference:'offline-native'});
  assert.equal(r.requestFinality,'UNPROVEN');assert.equal(r.liveExecutionAuthorized,false);
  for(const key of ['transactionId','requestId','commit','terminal','state','allWorkDrained'])assert.equal(Object.hasOwn(r,key),false);
  const selfAsserted={...r,transactionId:'fake',state:'FINISHED',commit:'ROLLED_BACK'};
  assert.equal(f.engine.accept('B',selfAsserted).status,'UNKNOWN');
});

test('invalid diagnostic inputs are sanitized and stale/duplicate adoption cannot establish acceptance',async()=>{
  const f=await fixture();const r=f.engine.installation({transport:'password@example.invalid'});
  assert.doesNotMatch(JSON.stringify(r),/@|password/);
  const g=await uncertainA();g.rows=rows('A');await g.engine.recover('A',g);g.advance(1000);await g.engine.recover('A',g);
  const input={phase:'A',operator:'project owner',reviewReference:'offline-adoption',acknowledgeUnprovenFinality:true,
    captureReferences:['reconcile-A-1','reconcile-A-2'].map(c=>g.observer.receiptFor(c).receiptReference)};
  g.advance(20001);assert.equal(g.engine.adopt(input).status,'BLOCKED');
});

test('intent ledger is append-only; transport observations cannot rewrite a previously captured intent',async()=>{
  const f=await initialized();const intent=f.begin('auth-create','A');const before=f.engine.ledger();
  f.engine.transport({attemptId:intent.attemptId,observation:'TIMEOUT'});
  assert.deepEqual(f.engine.ledger(),before);assert.equal(f.engine.transportLedger()[0].observation,'TIMEOUT');
});

test('independently observed Gate 3 state drift fails instead of claiming scoped no-change',async()=>{
  const f=await removed(),ports=isolationPorts(f);const send=ports.request;
  ports.request=async(...args)=>{const r=await send(...args);if(ports.count()===3)f.rows[2]=row('U',cb);return r;};
  assert.equal((await f.engine.isolation(ports)).status,'FAIL');assert.equal(f.engine.status().failed,true);
});

test('existing mapping port rejection preserves independently captured integrity FAIL in integrated state mode',async()=>{
  const f=await authReady();f.ack('provision','A');f.rows=rows('A');f.rows[0].canonical_active=false;
  await assert.rejects(f.engine.confirmMapping({label:'A',subject:a02Subjects.A,signal:f.signal}),/A02_STATE_BLOCKED/);
  assert.equal(f.engine.status().failed,true);assert.equal(f.engine.accept('A',undefined).status,'FAIL');
});

test('fully bound synthetic state policy replaces only strict-source requirements, preserves live blockers and refuses wrong source/run',async()=>{
  const packet=JSON.parse(await readFile(new URL('../docs/canonical-acceptance/a02-temporary/gate2-execution-packet.json',import.meta.url),'utf8'));
  const p=policy();p.approvalReference=packet.acceptancePolicy.statePolicyApprovalReference;
  packet.acceptancePolicy={mode:'state-based-v1',policy:p,statePolicyApprovalReference:p.approvalReference};
  packet.gate2Bindings.runReference=p.runReference;packet.gate2Bindings.gate2ApproverAndApprovalRecord=p.gate2Approval;
  packet.gate2Bindings.authorizationWindowStartUtc=new Date(p.start).toISOString();packet.gate2Bindings.authorizationWindowEndUtc=new Date(p.end).toISOString();
  packet.gate2Bindings.wrapperExpiresAtUtc=new Date(t+600000).toISOString();packet.loggingEvidence=p.loggingEvidence;
  packet.independentEvidenceBindings.statePolicyApprovalReference=p.approvalReference;
  packet.independentEvidenceBindings.stateIntentLedgerReference='offline-ledger';packet.independentEvidenceBindings.stateCaptureReviewReference='offline-capture-review';
  for(const op of p.operations)op.artifactSha256=packet.sourceArtifactSha256[op.operation==='auth-create'?'scripts/a02-auth-create.mjs':'scripts/a02-session-transport.mjs'];
  const r=await validateA02Packet(packet,{now:t});assert.equal(r.statePolicyStatus,'BINDINGS_VALIDATED_NOT_AUTHORIZED');
  assert.ok(!r.liveVerificationRequired.includes('authTerminalSource'));assert.ok(r.liveVerificationRequired.includes('adminCredentialAuthority'));
  assert.ok(r.liveVerificationRequired.includes('stateObservationSource'));assert.equal(r.liveExecutionAuthorized,false);
  delete packet.acceptancePolicy.statePolicyApprovalReference;
  const missingApproval=await validateA02Packet(packet,{now:t});assert.ok(missingApproval.statePolicyBlockers.includes('recordedPolicyApprovalBinding'));
  assert.ok(missingApproval.liveVerificationRequired.includes('authTerminalSource'));
  packet.acceptancePolicy.statePolicyApprovalReference=p.approvalReference;
  p.runReference='wrong-run';const b=await validateA02Packet(packet,{now:t});assert.equal(b.statePolicyStatus,'BLOCKED');assert.ok(b.liveVerificationRequired.includes('authTerminalSource'));
  p.runReference=packet.gate2Bindings.runReference;p.operations[0].artifactSha256='0'.repeat(64);
  const badSource=await validateA02Packet(packet,{now:t});assert.ok(badSource.statePolicyBlockers.includes('statePolicySourceBinding'));
});
