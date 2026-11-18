/** A02 synthetic tooling only. No SQL/HTTP/write/credential or persistence capability.
 * Explicit state policy, never a fallback from failed strict evidence. Inputs asserting
 * approvals/reviews must be independently established by the operator; code cannot grant them.
 */
import {createHash} from 'node:crypto';
import {a02Subjects,isA02IndependentCapture} from './a02-independent-observer.mjs';
import {createA02Reconciler} from './a02-reconciliation.mjs';
import {assessA02LoggingEvidence} from './a02-logging-evidence.mjs';
import {createCategoryAObserver} from './canonical-category-a-observer.mjs';
const project='gllsiklbvqpxzucvkehw';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const sha=/^[0-9a-f]{64}$/;
const ref=x=>typeof x==='string'&&/^[A-Za-z0-9_./:#-]{1,256}$/.test(x)&&x!=='UNBOUND';
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.split(',').sort().join();
const hash=x=>createHash('sha256').update(x).digest('hex');
const fail=()=>{throw Error('A02_STATE_BLOCKED');};
const claimedRuns=new Set(); // no reset/resume API; a new controller is not retry authority
const deletionPorts=new WeakMap();
export function isA02Gate4DeletionPort(value,{projectRef,runReference,reference}={}){
  const binding=value&&deletionPorts.get(value);
  return !!binding&&binding.projectRef===projectRef&&binding.runReference===runReference&&binding.reference===reference;
}
export const a02StateControls=Object.freeze(['targetTls','adminAuthority','runtime','credentialTransport','ownership','privateEvidence','runBindings','exclusiveCohortControl']);
const scopes=['baseline','installation','collision','intent','transport','auth-create','provision','auth','A','B','recovery','adoption','lifecycle','disable','removal','containment','isolation','A02_SELF_IDENTITY_ISOLATION','cleanup','cleanup-intent','auth-delete','delete-intent'];
const transports=['NOT_ATTEMPTED','ACKNOWLEDGED','REJECTED','TIMEOUT','CONNECTION_LOST','CANCELED','POST_WRITE_EXPIRY','MALFORMED','EXISTING','PENDING'];
const result=(status,scope,reason,transport='NOT_ATTEMPTED')=>Object.freeze({status,scope:scopes.includes(scope)?scope:'intent',reason,transport:transports.includes(transport)?transport:'MALFORMED',
  requestFinality:'UNPROVEN',retryAllowed:false,liveExecutionAuthorized:false});

/** Default stays the existing strict factory, with no state fallback. */
export function createA02Acceptance({mode='strict',strict,state}={}){
  if(mode==='strict')return createA02Reconciler(strict);
  if(mode!=='state-based-v1')fail();
  return createA02StateAcceptance(state);
}

export function assessA02StatePolicy(policy){
  const missing=[];
  if(policy?.mode!=='state-based-v1'||policy?.projectRef!==project)missing.push('explicitDevelopmentStatePolicy');
  for(const k of ['runReference','approvalReference','reviewReference','observerReference','gate2Approval'])if(!ref(policy?.[k]))missing.push(k);
  if(!exact(policy?.subjects,'A,B,U')||Object.entries(a02Subjects).some(([k,v])=>policy?.subjects?.[k]!==v))missing.push('nominations');
  if(!Number.isSafeInteger(policy?.start)||!Number.isSafeInteger(policy?.end)||policy.end-policy.start!==7200000)missing.push('window');
  if(assessA02LoggingEvidence(policy?.loggingEvidence).status!=='CLEARED')missing.push('loggingClearance');
  for(const k of a02StateControls)if(!exact(policy?.controls?.[k],'verdict,reference')||policy.controls[k].verdict!=='PASS'||!ref(policy.controls[k].reference))missing.push(k);
  if(!exact(policy?.wrapper,'definitionSha256,aclSha256,reviewReference')||!sha.test(policy.wrapper.definitionSha256)||!sha.test(policy.wrapper.aclSha256)||!ref(policy.wrapper.reviewReference))missing.push('wrapperReview');
  const ops=policy?.operations;
  if(!Array.isArray(ops)||ops.length!==5||new Set(ops.map(x=>x?.attemptId)).size!==5
    ||ops.some((x,i)=>!exact(x,'attemptId,operation,label,subject,artifactSha256')||!uuid.test(x.attemptId)
      ||x.operation!==(i<3?'auth-create':'provision')||x.label!==['A','B','U','A','B'][i]
      ||x.subject!==a02Subjects[x.label]||!sha.test(x.artifactSha256)))missing.push('intentLedger');
  return Object.freeze({status:missing.length?'BLOCKED':'PASS',missing:Object.freeze(missing),requestFinality:'UNPROVEN',liveExecutionAuthorized:false});
}

export function createA02StateAcceptance({policy,observer,now=Date.now}={}){
  if(assessA02StatePolicy(policy).status!=='PASS'||typeof observer?.observeCohort!=='function'||typeof now!=='function')fail();
  policy=structuredClone(policy);
  if(claimedRuns.has(policy.runReference)||!Number.isSafeInteger(now())||now()<policy.start||now()>=policy.end)fail();
  claimedRuns.add(policy.runReference);
  const used=new Set(),attempts=[],intents=[],observations=[],pins={},recovery=new Map(),accepted=new Set(),adopted=new Set(),deleted=new Set();
  let initialized=false,installed=false,collision=false,frozen=false,failed=false,nativeUnknown=false,removed=false,cleanup=false,cleanupOutcomeConsumed=false;
  let lastCapture,collisionAt,unresolved=false,cleanupAttempt=false,isolationUsed=false,disableRequired=false,deletionBound=false;
  const outcome=(status,scope,reason,transport)=>result(status,scope,reason,transport);
  const active=()=>Number.isSafeInteger(now())&&now()>=policy.start&&now()<policy.end;
  function capture(c,checkpoint,after=policy.start,maxAge=20000,reuse=false){
    if(!active()||!isA02IndependentCapture(c,{runReference:policy.runReference,observerReference:policy.observerReference})
      ||c.projectRef!==project||c.runReference!==policy.runReference||c.checkpoint!==checkpoint||c.rollback!=='SUCCEEDED'
      ||!Number.isSafeInteger(c.startedAt)||!Number.isSafeInteger(c.endedAt)||c.startedAt<after||c.endedAt<c.startedAt
      ||c.endedAt>now()||now()-c.endedAt>maxAge||c.endedAt-c.startedAt>=(['after-A','after-B'].includes(checkpoint)?2000:20000)
      ||(!reuse&&used.has(c.receiptReference)))fail();
    const {sha256,receiptReference,...payload}=c;
    if(hash(JSON.stringify(payload))!==sha256||receiptReference!==`a02-observer-sha256:${sha256}`)fail();
    if(c.metadata!==null){
      if(c.metadata.originalDenied!==true||c.metadata.temporaryRightsAbsent!==true)fail();
      for(const w of c.metadata.wrappers)if(w.definitionSha256!==policy.wrapper.definitionSha256||w.aclSha256!==policy.wrapper.aclSha256)fail();
    }
    if(!reuse)used.add(c.receiptReference);
    return c;
  }
  function integrity(rows){
    const ids=rows.filter(r=>r.canonical_user_id!==null).map(r=>r.canonical_user_id.toLowerCase());
    return rows.length===3&&rows.map(r=>r.label).join()==='A,B,U'&&new Set(ids).size===ids.length
      &&!ids.some(id=>Object.values(a02Subjects).includes(id))
      &&rows.every(r=>['memberships','agencies','clients','invitations_by_cohort','audit_by_cohort'].every(k=>String(r[k])==='0')
        &&(r.canonical_user_id===null?r.canonical_active===null:r.auth_exists&&r.canonical_active===true)
        &&(!pins[r.label]||pins[r.label]===r.canonical_user_id))&&rows[2].canonical_user_id===null;
  }
  const absent=rows=>integrity(rows)&&rows.every(r=>!r.auth_exists&&r.canonical_user_id===null);
  function expected(rows,phase){
    if(!integrity(rows)||rows.some(r=>!r.auth_exists))return false;
    return rows.every(r=>((phase==='A'&&r.label==='A')||(phase==='B'&&r.label!=='U'))?r.canonical_user_id!==null:r.canonical_user_id===null);
  }
  function unknown(scope,transport='CONNECTION_LOST',reason='OUTCOME_UNCERTAIN'){
    frozen=true;unresolved=true;return outcome('UNKNOWN',scope,reason,transport);
  }
  function violation(scope){failed=true;frozen=true;return outcome('FAIL',scope,'COHORT_INTEGRITY_VIOLATION');}
  function initialize(c){
    try{if(initialized)fail();capture(c,'baseline');if(!absent(c.rows))fail();initialized=true;lastCapture=c;return outcome('PASS','baseline','INDEPENDENT_ABSENCE_ONLY');}
    catch{return outcome('BLOCKED','baseline','BASELINE_UNAVAILABLE_OR_CONFLICTING');}
  }
  function installation({transport,capture:c,reviewReference}={}){
    if(!initialized||installed||nativeUnknown)return outcome('BLOCKED','installation','BASELINE_OR_NATIVE_BARRIER');
    if(transport!=='ACKNOWLEDGED'){nativeUnknown=true;return unknown('installation',transport);}
    try{if(!ref(reviewReference))fail();capture(c,'post-install',lastCapture.endedAt);if(!absent(c.rows))return violation('installation');installed=true;lastCapture=c;return outcome('PASS','installation','REVIEWED_NATIVE_INSTALL_AND_STATE');}
    catch{nativeUnknown=true;return unknown('installation',transport,'NATIVE_VERIFICATION_MISSING');}
  }
  function collisions(c){
    try{if(!installed||frozen||collision)fail();capture(c,'absence',lastCapture.endedAt,30000);
      if(c.rows.some(r=>r.idExists||r.emailExists))fail();collision=true;collisionAt=c.endedAt;return outcome('PASS','collision','PRIVATE_ID_EMAIL_ABSENCE');}
    catch{return outcome('BLOCKED','collision','COLLISION_OR_STALE_EVIDENCE');}
  }
  function begin({operation,label,gate='2',signal}={}){
    try{
      if(!active()||!signal||signal.aborted||gate!=='2'||frozen||failed||nativeUnknown||removed||!installed||!collision)fail();
      const op=policy.operations[attempts.length];
      if(!op||op.operation!==operation||op.label!==label||attempts.some(a=>a.transport==='PENDING'))fail();
      if(operation==='auth-create'&&(now()-collisionAt>30000||accepted.has('auth')))fail();
      if(operation==='provision'&&(!accepted.has('auth')||(label==='B'&&!accepted.has('A'))))fail();
      const a={...op,gate,order:attempts.length+1,startedAt:now(),transport:'PENDING',observedAt:null};attempts.push(a);
      intents.push(Object.freeze({...op,gate,order:a.order,startedAt:a.startedAt,maximumAttempts:1}));
      return Object.freeze({...outcome('PASS','intent','INTENT_ONLY_NOT_WRITE_AUTHORITY'),attemptId:a.attemptId});
    }catch{return outcome('BLOCKED','intent','SCOPE_SEQUENCE_OR_SECURITY_BARRIER');}
  }
  function transport({attemptId,observation}={}){
    const a=attempts.find(a=>a.attemptId===attemptId);
    if(!a||a.transport!=='PENDING')return outcome('BLOCKED','transport','DUPLICATE_OR_UNKNOWN_ATTEMPT');
    const allowed=['ACKNOWLEDGED','REJECTED','TIMEOUT','CONNECTION_LOST','CANCELED','POST_WRITE_EXPIRY','MALFORMED','EXISTING'];
    a.transport=allowed.includes(observation)?observation:'MALFORMED';a.observedAt=now();
    observations.push(Object.freeze({attemptId:a.attemptId,observedAt:a.observedAt,observation:a.transport}));
    if(!active()||a.transport!=='ACKNOWLEDGED')return unknown(a.operation,a.transport);
    return outcome('UNKNOWN',a.operation,'ACK_REQUIRES_INDEPENDENT_STATE',a.transport);
  }
  function accept(phase,c){
    if(failed)return outcome('FAIL',phase,'COHORT_INTEGRITY_VIOLATION');
    const relevant=phase==='auth'?attempts.filter(a=>a.operation==='auth-create'):attempts.filter(a=>a.operation==='provision'&&a.label===phase);
    try{
      if(frozen||failed||!relevant.length||accepted.has(phase)||relevant.some(a=>a.transport!=='ACKNOWLEDGED'))fail();
      if(phase==='auth'&&relevant.length!==3)fail();
      capture(c,phase==='auth'?'after-auth':`after-${phase}`,Math.max(...relevant.map(a=>a.observedAt)),phase==='auth'?20000:2000);
      if(!integrity(c.rows)||(phase==='auth'&&c.rows.some(r=>r.canonical_user_id!==null))||(phase!=='auth'&&c.rows.some(r=>!r.auth_exists))
        ||(phase==='A'&&c.rows[1].canonical_user_id!==null))return violation(phase);
      if(!expected(c.rows,phase))return unknown(phase,'ACKNOWLEDGED','EXPECTED_STATE_INCOMPLETE');
      accepted.add(phase);for(const r of c.rows)if(r.canonical_user_id)pins[r.label]=r.canonical_user_id;
      lastCapture=c;return outcome('PASS',phase,'INDEPENDENT_COMMITTED_STATE','ACKNOWLEDGED');
    }catch{return unknown(phase,relevant.at(-1)?.transport??'NOT_ATTEMPTED','INDEPENDENT_EVIDENCE_MISSING');}
  }
  async function recover(phase,{signal}={}){
    try{
      if(!active()||!signal||signal.aborted||!frozen||failed||nativeUnknown||!policy.recoveryApproved||!['auth','A','B'].includes(phase))fail();
      const ops=attempts.filter(a=>phase==='auth'?a.operation==='auth-create':a.operation==='provision'&&a.label===phase);
      if(!ops.length)fail();
      let r=recovery.get(phase);if(!r){r=[];recovery.set(phase,r);}
      if(r.length>=2||[...recovery.values()].reduce((n,x)=>n+x.length,0)>=6)fail();
      if(r.length&&(!r[0]||now()-r[0].endedAt<1000||now()-r[0].startedAt>=45000))fail();
      const index=r.length+1;r.push(null); // failed/canceled capture consumes its slot
      const c=await observer.observeCohort(`reconcile-${phase}-${index}`,{signal});
      if(signal.aborted)fail();capture(c,`reconcile-${phase}-${index}`,Math.max(...ops.map(a=>a.observedAt??a.startedAt)));
      if(index===2&&(c.startedAt-r[0].endedAt<1000||c.endedAt-r[0].startedAt>45000))fail();
      r[index-1]=c;
      if(!integrity(c.rows)||c.metadata.wrappers.length!==(removed?0:1)
        ||(phase==='auth'?c.rows.some(r=>r.canonical_user_id!==null):c.rows.some(r=>!r.auth_exists)))return violation(phase);
      const stable=r.length===2&&r.every(Boolean)&&JSON.stringify(r[0].rows)===JSON.stringify(r[1].rows)&&expected(c.rows,phase);
      return outcome('UNKNOWN',phase,stable?'POSITIVE_STATE_OBSERVED':'STATE_UNRESOLVED');
    }catch{return outcome('BLOCKED','recovery','RECOVERY_BOUND_OR_EVIDENCE_FAILURE');}
  }
  function adopt({phase,operator,reviewReference,captureReferences,acknowledgeUnprovenFinality}={}){
    const r=recovery.get(phase);
    if(!active()||failed||nativeUnknown||adopted.has(phase)||operator!=='project owner'||!ref(reviewReference)||acknowledgeUnprovenFinality!==true
      ||r?.length!==2||r.some(x=>!x)||!expected(r[1].rows,phase)||JSON.stringify(r[0].rows)!==JSON.stringify(r[1].rows)
      ||now()-r[1].endedAt>20000
      ||JSON.stringify(captureReferences)!==JSON.stringify(r.map(c=>c.receiptReference)))return outcome('BLOCKED','adoption','EXPLICIT_OWNER_REVIEW_REQUIRED');
    adopted.add(phase);accepted.add(phase);for(const row of r[1].rows)if(row.canonical_user_id)pins[row.label]=row.canonical_user_id;
    lastCapture=r[1]; // frozen/unresolved deliberately retained: adoption grants no continuation or cleanup
    return outcome('PASS',phase,'OWNER_ADOPTED_COMMITTED_STATE_ONLY');
  }
  function lifecycle({operation,transport:observation,capture:c,approvalReference,reviewReference,rollbackReviewReference}={}){
    if(!active()||!installed||removed||nativeUnknown||failed||!['disable','remove'].includes(operation)||!ref(approvalReference))return outcome('BLOCKED','lifecycle','NATIVE_OR_APPROVAL_BARRIER');
    const containment=frozen;
    if(containment?approvalReference!==policy.containmentApproval:!accepted.has('B'))return outcome('BLOCKED','lifecycle','CONTAINMENT_OR_SETUP_INCOMPLETE');
    if(operation==='disable'){
      // Disable requires separately captured native/ACL verification; this state engine
      // does not have that source. Never turn an executor ACK into disable acceptance.
      return outcome(observation==='ACKNOWLEDGED'?'UNKNOWN':'BLOCKED','disable','USE_REVIEWED_NATIVE_DISABLE_VERIFIER',observation);
    }
    if(observation!=='ACKNOWLEDGED'){
      if(observation!=='REJECTED'||!ref(rollbackReviewReference))nativeUnknown=true;
      else disableRequired=true;
      return unknown('removal',observation,observation==='REJECTED'&&ref(rollbackReviewReference)?'REVIEWED_NATIVE_ROLLBACK_SEPARATE_DISABLE_REQUIRED':'NATIVE_OUTCOME_UNCERTAIN');
    }
    try{if(!ref(reviewReference))fail();capture(c,'post-removal',lastCapture.endedAt);
      if(disableRequired&&!c.metadata.history.includes('20261117000200'))fail();
      if(!integrity(c.rows)||(!containment&&!expected(c.rows,'B')))return violation('removal');
      removed=true;lastCapture=c;return outcome('PASS',containment?'containment':'removal','OBSERVED_REMOVAL_NOT_DRAIN',observation);
    }catch{nativeUnknown=true;return unknown('removal',observation,'NATIVE_VERIFICATION_MISSING');}
  }
  async function isolation({config,request,readIndependentTransportReview,signal}={}){
    if(isolationUsed||!active()||failed||!removed||!accepted.has('B')||!ref(policy.gate3Approval)||!ref(policy.gate3TransportReview)
      ||typeof readIndependentTransportReview!=='function'||typeof request!=='function'||!signal||signal.aborted)return outcome('BLOCKED','isolation','GATE3_APPROVAL_OR_SETUP_REQUIRED');
    isolationUsed=true;let requests=0,badRows=false,before,after,getsEndedAt;
    const startedAt=now();
    try{
      before=lastCapture?.checkpoint==='post-removal'&&now()-lastCapture.endedAt<=2000?capture(lastCapture,'post-removal',policy.start,2000,true)
        :capture(await observer.observeCohort('isolation-before',{signal}),'isolation-before',policy.start,2000);
      if(!expected(before.rows,'B'))return violation('isolation');
      for(const label of ['A','B','U'])if(config?.sessions?.[label]?.subject!==a02Subjects[label]||config.sessions[label].canonicalUserId!==(pins[label]??null))fail();
      const observe=createCategoryAObserver(config,{now,request:async(url,init)=>{
        const label=['A','B','U'][requests++];
        const response=await request(url,init);
        if(response.status===200){
          const rows=await accessRows(response);
          badRows=!Array.isArray(rows)||rows.length!==(label==='U'?0:1)||label!=='U'&&(
            Object.keys(rows[0]??{}).length!==8||rows[0]?.supabase_user_id!==a02Subjects[label]||rows[0]?.user_id!==pins[label]||rows[0]?.user_state!=='active'
            ||['membership_id','agency_id','agency_name','membership_state','agency_state'].some(k=>rows[0]?.[k]!==null));
        }
        getsEndedAt=now();
        return response;
      },confirmEvidence:async()=>{
        after=capture(await observer.observeCohort('isolation-after',{signal}),'isolation-after',startedAt);
        if(!expected(after.rows,'B')||JSON.stringify(before.rows)!==JSON.stringify(after.rows)){badRows=true;fail();}
        // Independent source/review is an operator trust boundary. This is NOT a
        // producer, signature verifier, or proof of unrelated/transient no-writes.
        const review=await boundedReview(readIndependentTransportReview,signal);
        if(!exact(review,'projectRef,runReference,sourceReviewReference,startedAt,endedAt,requests,sha256')
          ||review.projectRef!==project||review.runReference!==policy.runReference||review.sourceReviewReference!==policy.gate3TransportReview
          ||!Number.isSafeInteger(review.startedAt)||!Number.isSafeInteger(review.endedAt)||review.startedAt>startedAt||startedAt-review.startedAt>2000
          ||review.endedAt<getsEndedAt||review.endedAt>now()||now()-review.endedAt>2000
          ||!Array.isArray(review.requests)||review.requests.length!==3)fail();
        const {sha256,...body}=review;if(!sha.test(sha256)||hash(JSON.stringify(body))!==sha256)fail();
        for(const [i,r] of review.requests.entries())if(!exact(r,'method,url,label,subject')||r.method!=='GET'
          ||r.url!==`https://${project}.supabase.co/rest/v1/rpc/contratpro_auth_access`||r.label!==['A','B','U'][i]||r.subject!==a02Subjects[r.label])fail();
        return {noDataChanges:true}; // only after both state captures AND reviewed independent request capture
      }});
      await observe({id:'A02',signal});lastCapture=after;return outcome('PASS','A02_SELF_IDENTITY_ISOLATION','THREE_GETS_AND_INDEPENDENT_SCOPED_EVIDENCE');
    }catch{if(badRows)return violation('isolation');return outcome(requests?'UNKNOWN':'BLOCKED','isolation','ACCESS_OR_INDEPENDENT_EVIDENCE_FAILED');}
  }
  function beginCleanup({capture:c,ownershipReference,dependencyReview,approvalReference,signal}={}){
    try{
      if(!active()||!signal||signal.aborted||!removed||failed||unresolved||!accepted.has('B')||cleanupAttempt
        ||!ref(policy.gate4Approval)||approvalReference!==policy.gate4Approval
        ||ownershipReference!==policy.controls.ownership.reference||!ref(dependencyReview))fail();
      capture(c,'cleanup-before',lastCapture.endedAt);
      if(!expected(c.rows,'B')||!cleanupSummary(c,2,2))fail();cleanupAttempt=true;lastCapture=c;
      return outcome('PASS','cleanup-intent','EXACT_ID_PRIVILEGED_BYPASS_SCOPE_ONLY');
    }catch{return outcome('BLOCKED','cleanup','UNRESOLVED_OWNERSHIP_DEPENDENCY_OR_GATE4_BARRIER');}
  }
  function cleanupSummary(c,n,m){return c.metadata?.cleanup?.canonical?.join()===[pins.A,pins.B].join()
    &&c.metadata.cleanup.canonicalRows===n&&c.metadata.cleanup.reverseMappings===m;}
  function acceptCleanup({transport:observation,capture:c}={}){
    if(!cleanupAttempt||cleanup||cleanupOutcomeConsumed||frozen||unresolved)return outcome('BLOCKED','cleanup','NO_APPROVED_CLEANUP_ATTEMPT');
    cleanupOutcomeConsumed=true;
    if(observation!=='ACKNOWLEDGED')return unknown('cleanup',observation);
    try{capture(c,'cleanup-after',lastCapture.endedAt);
      if(!integrityAfterCleanup(c)||!cleanupSummary(c,0,0))return violation('cleanup');
      cleanup=true;lastCapture=c;return outcome('PASS','cleanup','OBSERVED_CANONICAL_ABSENCE_ONLY',observation);
    }catch{return unknown('cleanup',observation,'POST_CLEANUP_EVIDENCE_MISSING');}
  }
  function integrityAfterCleanup(c){return c.rows.every(r=>r.canonical_user_id===null&&r.canonical_active===null
    &&r.auth_exists===!deleted.has(r.label)&&['memberships','agencies','clients','invitations_by_cohort','audit_by_cohort'].every(k=>String(r[k])==='0'));}
  function beginDelete({label,attemptId,gate,signal}={}){
    if(!active()||!signal||signal.aborted||gate!=='4'||!ref(policy.gate4Approval)||!cleanup||frozen||failed||unresolved
      ||!['A','B','U'].includes(label)||!uuid.test(attemptId)||attempts.some(a=>a.attemptId===attemptId||a.operation==='auth-delete'&&(a.label===label||a.transport==='PENDING')))
      return outcome('BLOCKED','auth-delete','GATE4_OR_UNKNOWN_BARRIER');
    const a={attemptId,operation:'auth-delete',label,subject:a02Subjects[label],gate,order:attempts.length+1,startedAt:now()};
    intents.push(Object.freeze({...a,maximumAttempts:1}));attempts.push({...a,transport:'PENDING',observedAt:null});
    return outcome('PASS','delete-intent','EXACT_ID_ONCE_ONLY');
  }
  function acceptDelete({label,transport:observation,capture:c}={}){
    const a=attempts.find(a=>a.operation==='auth-delete'&&a.label===label&&a.transport==='PENDING');
    if(!a)return outcome('BLOCKED','auth-delete','DUPLICATE_OR_UNAPPROVED_DELETE');
    a.transport=transports.includes(observation)?observation:'MALFORMED';a.observedAt=now();
    observations.push(Object.freeze({attemptId:a.attemptId,observedAt:a.observedAt,observation:a.transport}));
    if(observation!=='ACKNOWLEDGED')return unknown('auth-delete',observation);
    try{capture(c,`delete-${label}`,a.startedAt);deleted.add(label);
      if(!integrityAfterCleanup(c)||!cleanupSummary(c,0,0))return violation('auth-delete');
      lastCapture=c;return outcome('PASS','auth-delete','OBSERVED_AUTH_ABSENCE_ONLY',observation);
    }catch{return unknown('auth-delete',observation,'POST_DELETE_EVIDENCE_MISSING');}
  }
  /** Offline composition port only. Approval is an external operator assertion,
   * not proof of actual Admin rights. No HTTP, credentials or SQL execution here. */
  function bindAuthDeletion(authorization){
    try{
      const a=structuredClone(authorization);
      if(deletionBound||!active()||!cleanup||!removed||unresolved||frozen||failed||deleted.size!==0||attempts.some(op=>op.operation==='auth-delete')
        ||a?.mode!=='offline-synthetic-only'||a.liveExecutionAuthorized!==false||a.gate!=='4'||a.operation!=='auth-delete'
        ||a.projectRef!==project||a.runReference!==policy.runReference||!ref(policy.gate4Approval)||a.reference!==policy.gate4Approval
        ||!Number.isSafeInteger(a.start)||!Number.isSafeInteger(a.end)||a.start<policy.start||a.end>policy.end
        ||a.ownershipReference!==policy.controls.ownership.reference||a.cleanupReference!==lastCapture?.receiptReference
        ||lastCapture.checkpoint!=='cleanup-after'||now()-lastCapture.endedAt>20000
        ||!integrityAfterCleanup(lastCapture)||!cleanupSummary(lastCapture,0,0)
        ||!exact(a.subjects,'A,B,U')||Object.entries(a02Subjects).some(([k,v])=>a.subjects[k]!==v)
        ||!Array.isArray(a.operations)||a.operations.length!==3||new Set(a.operations.map(op=>op?.attemptId)).size!==3
        ||a.operations.some((op,i)=>!exact(op,'label,subject,attemptId')||op.label!==['A','B','U'][i]||op.subject!==a02Subjects[op.label]
          ||!uuid.test(op.attemptId)||attempts.some(old=>old.attemptId===op.attemptId)))fail();
      deletionBound=true;let index=0,pending;
      const matches=op=>exact(op,'label,subject,attemptId')&&JSON.stringify(op)===JSON.stringify(a.operations[index]);
      const stop=observation=>{
        if(pending)acceptDelete({label:pending.label,transport:transports.includes(observation)&&observation!=='ACKNOWLEDGED'?observation:'MALFORMED'});
        pending=undefined;return unknown('auth-delete',observation);
      };
      const port=Object.freeze({
        begin:(op,signal)=>{
          if(!matches(op)||pending||signal?.aborted)return outcome('BLOCKED','auth-delete','GATE4_SCOPE_OR_SEQUENCE');
          const r=beginDelete({...op,gate:'4',signal});if(r.status==='PASS')pending={...op};return r;
        },
        confirm:async(op,signal)=>{
          if(!matches(op)||!pending)return outcome('BLOCKED','auth-delete','NO_PENDING_EXACT_ID');
          if(!signal||signal.aborted)return stop(signal?.reason==='TIMEOUT'?'TIMEOUT':'CANCELED');
          const acknowledgedAt=now();
          try{
            const c=await observer.observeCohort(`delete-${op.label}`,{signal,canonical:[pins.A,pins.B]});
            if(signal.aborted||!active())return stop(signal.reason==='TIMEOUT'?'TIMEOUT':'CANCELED');
            if(c.startedAt<acknowledgedAt)return stop('MALFORMED');
            const r=acceptDelete({label:op.label,transport:'ACKNOWLEDGED',capture:c});pending=undefined;
            if(r.status==='PASS')index++;return r;
          }catch{const r=acceptDelete({label:op.label,transport:'ACKNOWLEDGED'});pending=undefined;return r;}
        },
        stop,
        complete:()=>({
          ...outcome(index===3&&deleted.size===3&&cleanup&&!unresolved&&!frozen&&!failed&&active()
            &&lastCapture?.checkpoint==='delete-U'&&now()-lastCapture.endedAt<=20000?'PASS':'BLOCKED','auth-delete','OBSERVED_EXACT_COHORT_STATE_ONLY'),
          cleanupComplete:index===3&&deleted.size===3&&cleanup&&!unresolved&&!frozen&&!failed&&active()
            &&lastCapture?.checkpoint==='delete-U'&&now()-lastCapture.endedAt<=20000,
        }),
      });
      deletionPorts.set(port,{projectRef:project,runReference:policy.runReference,reference:a.reference});return port;
    }catch{fail();}
  }
  async function confirmMapping(input){
    let mapping;
    try{mapping=await observer.confirmMapping(input);}catch{
      // The existing port can reject after capturing an actual integrity violation.
      // Preserve that independently observed FAIL rather than downgrading it to a
      // generic transport UNKNOWN. An absent/failed capture still remains UNKNOWN.
      accept(input.label,observer.receiptFor(`after-${input.label}`));fail();
    }
    if(accept(input.label,observer.receiptFor(`after-${input.label}`)).status!=='PASS')fail();
    return mapping;
  }
  return Object.freeze({initialize,installation,collisions,begin,transport,accept,recover,adopt,lifecycle,isolation,beginCleanup,acceptCleanup,beginDelete,acceptDelete,bindAuthDeletion,confirmMapping,
    ledger:()=>Object.freeze([...intents]),transportLedger:()=>Object.freeze([...observations]),
    status:()=>Object.freeze({frozen,unresolved,nativeUnknown,removed,failed,requestFinality:'UNPROVEN',liveExecutionAuthorized:false})});
}
async function accessRows(response){
  const reader=response.clone().body?.getReader();if(!reader)fail();const chunks=[];let bytes=0;
  try{for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.length;
    if(bytes>8192){void reader.cancel().catch(()=>{});fail();}chunks.push(part.value);}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }finally{reader.releaseLock();}
}
async function boundedReview(read,signal){
  let timer,abort;
  try{return await Promise.race([Promise.resolve().then(read),new Promise((_,reject)=>{
    abort=()=>reject(Error('A02_STATE_BLOCKED'));signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();timer=setTimeout(abort,2000);
  })]);}finally{clearTimeout(timer);if(abort)signal.removeEventListener('abort',abort);}
}
