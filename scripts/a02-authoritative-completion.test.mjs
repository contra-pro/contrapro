import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createA02AuthoritativeCompletionAdapter,isValidatedA02CompletionReceipt} from './a02-authoritative-completion.mjs';
import {syntheticA02Completion,completionFixtureTime as t} from './a02-completion-fixtures.mjs';
import {a02Subjects} from './a02-independent-observer.mjs';
import {createA02Reconciler} from './a02-reconciliation.mjs';
const bytes=f=>({normalized:f.normalized,normalizedSha256:f.normalizedSha256,sourceBytes:f.sourceBytes});
function updateSyntheticSource(f){
  // Fixture-only policy refresh to test semantic rejection independently of hashing.
  f.sourceBytes=Buffer.from(JSON.stringify(f.raw));f.policy.operations[0].sourceSha256=createHash('sha256').update(f.sourceBytes).digest('hex');
}
for(const [kind,label] of [['auth','A'],['auth','U'],['auth-delete','B'],['provision','A'],['provision','B']]){
  test(`synthetic ${kind}/${label} committed and rolled-back receipts require matching independently reviewed transaction export`,()=>{
    for(const commit of ['COMMITTED','ROLLED_BACK']){
      const f=syntheticA02Completion({kind,label,subject:a02Subjects[label],commit});
      const result=createA02AuthoritativeCompletionAdapter({policy:f.policy,now:()=>t})(bytes(f));
      assert.equal(isValidatedA02CompletionReceipt(result),true);assert.equal(result.commit,commit);
      assert.equal(result.subject,a02Subjects[label]);assert.equal(result.gate,kind==='auth-delete'?'4':'2');
      assert.equal(Object.isFrozen(result),true);
    }
  });
}
test('self-declared source, executor/access log or missing authority/commit semantics cannot create a validator',()=>{
  for(const mutate of [p=>p.authority.type='executor-log',p=>p.authority.type='gateway-access-status',
    p=>p.authority.reviewReference='UNBOUND',p=>p.authority.backendCompletion=false,p=>p.authority.commitOutcome=false,
    p=>p.authority.requestCorrelation=false,p=>p.authority.supportedOperations=['auth-create'],p=>p.independentlyCaptured=false,p=>p.reviewReference='UNBOUND',p=>p.projectRef='other']){
    const f=syntheticA02Completion();mutate(f.policy);
    assert.throws(()=>createA02AuthoritativeCompletionAdapter({policy:f.policy,now:()=>t}),/A02_COMPLETION_EVIDENCE_BLOCKED/);
  }
});
test('exact target, operation, request, subject, source and timestamps are checked against policy',()=>{
  for(const mutate of [f=>f.raw.projectRef='other',f=>f.raw.attemptId='22222222-2222-4222-8222-222222222222',
    f=>f.raw.subject=a02Subjects.B,f=>f.raw.label='U',f=>f.raw.operation='auth-create',f=>f.raw.requestId='different',
    f=>f.raw.authorityId='executor-message',f=>f.raw.startedAt=t-11,f=>f.raw.completedAt=t+1,
    f=>f.raw.completedAt=t-30001,f=>f.raw.transactionId='',f=>f.raw.terminal=false]){
    const f=syntheticA02Completion();mutate(f);updateSyntheticSource(f);
    assert.throws(()=>createA02AuthoritativeCompletionAdapter({policy:f.policy,now:()=>t})(bytes(f)),/A02_COMPLETION_EVIDENCE_BLOCKED/);
  }
});
test('ambiguous, missing-commit, timeout-only and mismatched normalized successes are rejected',()=>{
  for(const mutate of [f=>f.raw.outcome='UNKNOWN',f=>delete f.raw.transactionId,
    f=>{f.raw.httpStatus=200;f.raw.outcome='TIMEOUT';},f=>f.normalized.commit='ROLLED_BACK',
    f=>f.normalized.kind='auth',f=>f.normalized.state='IN_FLIGHT',f=>f.normalized.completedAt=t-2,
    f=>f.normalized.runReference='other',f=>f.normalized.source='arbitrary-source']){
    const f=syntheticA02Completion();mutate(f);updateSyntheticSource(f);
    assert.throws(()=>createA02AuthoritativeCompletionAdapter({policy:f.policy,now:()=>t})(bytes(f)),/A02_COMPLETION_EVIDENCE_BLOCKED/);
  }
});
test('source tampering, unbounded input, stale replay and duplicate receipt consumption fail closed',()=>{
  const f=syntheticA02Completion(),adapter=createA02AuthoritativeCompletionAdapter({policy:f.policy,now:()=>t});
  adapter(bytes(f));assert.throws(()=>adapter(bytes(f)),/A02_COMPLETION_EVIDENCE_BLOCKED/);
  for(const input of [{...bytes(f),sourceBytes:Buffer.from('{}')},{...bytes(f),sourceBytes:Buffer.alloc(8193)},
    {...bytes(f),normalizedSha256:'invalid'}])assert.throws(()=>createA02AuthoritativeCompletionAdapter({policy:f.policy,now:()=>t})(input),/A02_COMPLETION_EVIDENCE_BLOCKED/);
  for(const now of [t+30001,t-2,NaN])assert.throws(()=>createA02AuthoritativeCompletionAdapter({policy:f.policy,now:()=>now})(bytes(f)),/A02_COMPLETION_EVIDENCE_BLOCKED/);
});
test('ledger forbids duplicate IDs/actors, provisioning U and deletion in Gate 2',()=>{
  for(const mutate of [p=>p.operations.push({...p.operations[0]}),p=>p.operations[0].subject=a02Subjects.U,
    p=>p.operations[0].label='U',p=>p.operations[0].operation='auth-delete']){
    const f=syntheticA02Completion();mutate(f.policy);
    assert.throws(()=>createA02AuthoritativeCompletionAdapter({policy:f.policy,now:()=>t}),/A02_COMPLETION_EVIDENCE_BLOCKED/);
  }
  const deletion=syntheticA02Completion({kind:'auth-delete'});deletion.policy.gate='2';
  assert.throws(()=>createA02AuthoritativeCompletionAdapter({policy:deletion.policy,now:()=>t}),/A02_COMPLETION_EVIDENCE_BLOCKED/);
});
test('plain importer objects and forged verified flags cannot bypass reconciliation provenance',async()=>{
  const f=syntheticA02Completion();let queries=0;
  const reconcile=createA02Reconciler({observer:{observeCohort:async()=>{queries++;}},runReference:'offline-run',now:()=>t,
    readTerminal:async()=>({...f.normalized,gate:'2',sha256:f.normalizedSha256,sourceReviewReference:'typed-reference',authoritativeEvidenceVerified:true})});
  const result=await reconcile({attemptId:f.normalized.attemptId,kind:'provision',label:'A',attemptedAt:t-10,terminalSha256:f.normalizedSha256,signal:new AbortController().signal});
  assert.equal(result.state,'blocked');assert.equal(queries,0);
  const verified=createA02AuthoritativeCompletionAdapter({policy:f.policy,now:()=>t})(bytes(f));
  const stale=createA02Reconciler({observer:{observeCohort:async()=>{queries++;}},readTerminal:async()=>verified,runReference:'offline-run',now:()=>t+30001});
  assert.equal((await stale({attemptId:f.normalized.attemptId,kind:'provision',label:'A',attemptedAt:t-10,terminalSha256:f.normalizedSha256,signal:new AbortController().signal})).state,'blocked');
  assert.equal(queries,0);
});
test('validated deletion evidence is not a Gate 2 action or database-state confirmation',async()=>{
  const f=syntheticA02Completion({kind:'auth-delete'}),receipt=createA02AuthoritativeCompletionAdapter({policy:f.policy,now:()=>t})(bytes(f));
  let queries=0;const reconcile=createA02Reconciler({observer:{observeCohort:async()=>{queries++;}},readTerminal:async()=>receipt,runReference:'offline-run',now:()=>t});
  const result=await reconcile({attemptId:f.normalized.attemptId,kind:'auth-delete',label:'A',attemptedAt:t-10,terminalSha256:f.normalizedSha256,signal:new AbortController().signal});
  assert.equal(result.state,'blocked');assert.equal(queries,0);
});
