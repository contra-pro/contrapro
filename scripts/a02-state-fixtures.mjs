/** Deterministic SYNTHETIC test fixtures only. No live client/transport, secrets or import-time operations. */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {createA02Acceptance,a02StateControls} from "./a02-state-acceptance.mjs";
import {createA02IndependentObserver,a02Subjects} from "./a02-independent-observer.mjs";
const projectRef='gllsiklbvqpxzucvkehw',t=1794916800000;
const ca='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',cb='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const digest=x=>createHash('sha256').update(x).digest('hex');
const definition='SYNTHETIC wrapper definition, not SQL',acl='SYNTHETIC ACL';
const loggingEvidence={projectRef,provenance:{kind:'reviewed-read-only-capture',reference:'offline-log-fixture'},
  settings:{log_parameter_max_length:'0',log_parameter_max_length_on_error:'0','pgaudit.log_parameter':'off'},
  inspection:{targetVerified:true,tlsVerifyFullVerified:true,credentialTransportVerified:true,readOnly:true,rolledBack:true,deadlineVerified:true,overallDeadlineMs:20000},
  review:{verdict:'PASS',reference:'offline-review',providerLoggingCleared:true,clientRuntimeLoggingCleared:true,auditCoverageCleared:true}};
const policy=()=>({mode:'state-based-v1',projectRef,runReference:'offline-state-run',subjects:{...a02Subjects},
  approvalReference:'offline-state-policy-NOT-LIVE-AUTHORIZATION',reviewReference:'offline-code-review',observerReference:'offline-observer',
  start:t-1000,end:t-1000+7200000,gate2Approval:'offline-gate2',gate3Approval:'offline-gate3',gate4Approval:'offline-gate4',
  containmentApproval:'offline-containment',gate3TransportReview:'offline-independent-request-review',recoveryApproved:true,loggingEvidence,
  wrapper:{definitionSha256:digest(definition),aclSha256:digest(acl),reviewReference:'offline-semantic-review'},
  controls:Object.fromEntries(a02StateControls.map(k=>[k,{verdict:'PASS',reference:`offline-${k}`} ])),
  operations:['A','B','U','A','B'].map((label,i)=>({attemptId:`0000000${i+1}-1111-4111-8111-111111111111`,
    operation:i<3?'auth-create':'provision',label,subject:a02Subjects[label],artifactSha256:digest('offline-artifact-'+i)}))});
const row=(label,canonical=null,exists=true)=>({label,auth_exists:exists,canonical_user_id:canonical,canonical_active:canonical===null?null:true,
  memberships:'0',agencies:'0',clients:'0',invitations_by_cohort:'0',audit_by_cohort:'0'});
const rows=phase=>['A','B','U'].map(label=>row(label,phase==='A'&&label==='A'||phase==='B'&&label==='A'?ca:phase==='B'&&label==='B'?cb:null,phase!=='absent'));
let fixtureRun=0;
async function fixture({mutatePolicy,queryHook}={}){
  const p=policy();p.runReference+=`-${++fixtureRun}`;mutatePolicy?.(p);
  const f={p,clock:t,rows:rows('absent'),queries:[],clients:0,signal:new AbortController().signal,
    cleanupRows:2,reverseMappings:2,collision:false,rollbackFailure:false};
  f.observer=await createA02IndependentObserver({approval:{projectRef,runReference:p.runReference,reference:p.observerReference,
    start:p.start,end:p.end,parameterLoggingCleared:true,parameterLoggingReview:'offline-log-review',loggingEvidence,
    acceptanceMode:'state-based-v1',statePolicyReview:p.reviewReference,gate2Approval:p.gate2Approval,gate3Approval:p.gate3Approval,
    gate4Approval:p.gate4Approval,recoveryAllowed:true},credentialProvider:label=>({email:`${label}@offline.invalid`,password:'offline-only-password'}),now:()=>f.clock,
    clientFactory:({checkpoint})=>{f.clients++;return {connect:async()=>{},end:async()=>{},query:async(sql,values)=>{
      f.queries.push({sql,values});const overridden=await queryHook?.(sql,f);if(overridden)return overridden;
      if(sql==='ROLLBACK'&&f.rollbackFailure)throw Error('SYNTHETIC private failure');
      if(sql.includes(' AS ok'))return {rows:[{ok:true}]};
      const absent=['baseline','post-removal','isolation-before','isolation-after','cleanup-before','cleanup-after','delete-A','delete-B','delete-U'].includes(checkpoint)
        ||f.contained&&checkpoint.startsWith('reconcile-');
      if(sql.startsWith('SELECT transaction_timestamp()'))return {rows:[{original_denied:true,temporary_set_absent:true,temporary_create_absent:true,temporary_self_grant_absent:true}]};
      if(sql.startsWith('SELECT p.oid'))return {rows:absent?[]:[{signature:'public.contratpro_a02_fixture_provision()',owner:'contratpro_identity_writer',prosecdef:true,
        proconfig:['search_path=pg_catalog','row_security=on'],proacl:acl,definition}]};
      if(sql.startsWith('SELECT count(*) AS wrapper_overloads'))return {rows:[{wrapper_overloads:absent?0:1}]};
      const history=['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700',
        ...(checkpoint==='baseline'?[]:['20261117000100']),...(absent&&checkpoint!=='baseline'?['20261117000300']:[])];
      if(sql.startsWith('SELECT count(*) AS history_count'))return {rows:[{history_count:history.length}]};
      if(sql.startsWith('SELECT version'))return {rows:history.map(version=>({version}))};
      if(sql.startsWith('WITH nominated(label,subject,email)'))return {rows:['A','B','U'].map(label=>({label,id_exists:f.collision,email_exists:f.collision}))};
      if(sql.startsWith('WITH nominated(label,subject)'))return {rows:structuredClone(f.rows)};
      if(sql.startsWith('SELECT (SELECT count(*)'))return {rows:[{canonical_rows:f.cleanupRows,reverse_mappings:f.reverseMappings}]};
      return {rows:[]};
    }};}
  });
  f.engine=createA02Acceptance({mode:'state-based-v1',state:{policy:p,observer:f.observer,now:()=>f.clock}});
  f.capture=checkpoint=>f.observer.observeCohort(checkpoint,{signal:f.signal,canonical:[ca,cb]});
  f.advance=(ms=1)=>{f.clock+=ms;};
  f.begin=(operation,label)=>f.engine.begin({operation,label,signal:f.signal});
  f.ack=(operation,label,observation='ACKNOWLEDGED')=>{const intent=f.begin(operation,label);assert.equal(intent.status,'PASS');
    return f.engine.transport({attemptId:intent.attemptId,observation});};
  return f;
}
async function initialized(options){const f=await fixture(options);
  assert.equal(f.engine.initialize(await f.capture('baseline')).status,'PASS');f.advance();
  assert.equal(f.engine.installation({transport:'ACKNOWLEDGED',capture:await f.capture('post-install'),reviewReference:'offline-native-review'}).status,'PASS');f.advance();
  assert.equal(f.engine.collisions(await f.observer.observeAbsence(f)).status,'PASS');return f;
}
async function authReady(options){const f=await initialized(options);for(const label of ['A','B','U'])f.ack('auth-create',label);
  f.rows=rows('auth');f.advance();assert.equal(f.engine.accept('auth',await f.capture('after-auth')).status,'PASS');return f;}
async function provisioned(options){const f=await authReady(options);for(const label of ['A','B']){
  f.ack('provision',label);f.rows=rows(label);f.advance();assert.equal(f.engine.accept(label,await f.capture(`after-${label}`)).status,'PASS');}return f;}
async function removed(options){const f=await provisioned(options);f.advance();assert.equal(f.engine.lifecycle({operation:'remove',transport:'ACKNOWLEDGED',
  capture:await f.capture('post-removal'),approvalReference:'offline-lifecycle',reviewReference:'offline-native-review'}).status,'PASS');return f;}
async function cleaned(options){const f=await removed(options);assert.equal(f.engine.beginCleanup({capture:await f.capture('cleanup-before'),signal:f.signal,
  approvalReference:f.p.gate4Approval,ownershipReference:f.p.controls.ownership.reference,dependencyReview:'offline-dependencies'}).status,'PASS');
  f.rows=rows('auth');f.cleanupRows=0;f.reverseMappings=0;
  assert.equal(f.engine.acceptCleanup({transport:'ACKNOWLEDGED',capture:await f.capture('cleanup-after')}).status,'PASS');return f;}

export {projectRef,t,ca,cb,digest,policy,row,rows,fixture,initialized,authReady,provisioned,removed,cleaned};
