/** OFFLINE SYNTHETIC TOOLING ONLY. No native HTTP, default fetch, CLI, SDK,
 * credential discovery, persistence or live adapter. An injected fake port is
 * mandatory. This contract is not a sandbox against hostile caller-supplied code.
 */
import {performance} from 'node:perf_hooks';
import {setTimeout as schedule,clearTimeout as cancel} from 'node:timers';
import {a02Subjects} from './a02-independent-observer.mjs';
import {isA02Gate4DeletionPort} from './a02-state-acceptance.mjs';
const project='gllsiklbvqpxzucvkehw',mode='offline-synthetic-only';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const ref=x=>typeof x==='string'&&/^[A-Za-z0-9_./:#-]{1,256}$/.test(x)&&x!=='UNBOUND';
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.split(',').sort().join();
const fail=()=>{throw Error('A02_AUTH_DELETE_BLOCKED');};
const safe=(status,reason,transport='NOT_ATTEMPTED',receipts=[],cleanupComplete=false)=>Object.freeze({
  status,reason,transport,receipts:Object.freeze([...receipts]),cleanupComplete,
  requestFinality:'UNPROVEN',retryAllowed:false,liveExecutionAuthorized:false,
});
function validateAuthorization(a,now){
  if(!exact(a,'mode,gate,operation,projectRef,runReference,reference,start,end,subjects,operations,overallDeadlineMs,requestDeadlineMs,observationDeadlineMs,ownershipReference,cleanupReference,sourceArtifactSha256,liveExecutionAuthorized')
    ||a.mode!==mode||a.gate!=='4'||a.operation!=='auth-delete'||a.projectRef!==project||a.liveExecutionAuthorized!==false
    ||!ref(a.runReference)||!ref(a.reference)||!ref(a.ownershipReference)||!ref(a.cleanupReference)||! /^[0-9a-f]{64}$/.test(a.sourceArtifactSha256)
    ||!Number.isSafeInteger(now)||!Number.isSafeInteger(a.start)||!Number.isSafeInteger(a.end)
    ||a.start>now||a.end<=now||a.end-a.start>7200000||a.end<=a.start
    ||!Number.isSafeInteger(a.overallDeadlineMs)||a.overallDeadlineMs<1||a.overallDeadlineMs>30000
    ||!Number.isSafeInteger(a.requestDeadlineMs)||a.requestDeadlineMs<1||a.requestDeadlineMs>7000
    ||!Number.isSafeInteger(a.observationDeadlineMs)||a.observationDeadlineMs<1||a.observationDeadlineMs>20000
    ||!exact(a.subjects,'A,B,U')||Object.entries(a02Subjects).some(([k,v])=>a.subjects[k]!==v)
    ||!Array.isArray(a.operations)||a.operations.length!==3||new Set(a.operations.map(x=>x?.attemptId)).size!==3
    ||a.operations.some((op,i)=>!exact(op,'label,subject,attemptId')||op.label!==['A','B','U'][i]||op.subject!==a02Subjects[op.label]||!uuid.test(op.attemptId)))fail();
}

/** Monotonic overall deadline + per-step cancellation. Cooperative JS, not hard
 * process termination or backend rollback. Throws if clocks/timer setup fail.
 */
function deadline({signal,duration,authorization,wallNow,clock}){
  const controller=new AbortController();let last=-Infinity,timer,timedOut=false;
  const abort=()=>controller.abort(signal.aborted?'CANCELED':'TIMEOUT');signal.addEventListener('abort',abort,{once:true});
  const tick=()=>{const n=clock.now();if(!Number.isFinite(n)||n<last)fail();last=n;return n;};
  let end;
  const check=()=>{const w=wallNow();if(tick()>=end)timedOut=true;if(signal.aborted||controller.signal.aborted||timedOut||!Number.isSafeInteger(w)||w<authorization.start||w>=authorization.end)fail();};
  try{
    const remaining=Math.min(duration,authorization.end-wallNow());end=tick()+remaining;if(!Number.isFinite(end)||remaining<=0)fail();
    timer=clock.schedule(()=>{timedOut=true;abort();},remaining);if(timer===undefined||timer===null)fail();check();
  }catch{controller.abort('MALFORMED');if(timer!==undefined)clock.cancel(timer);signal.removeEventListener('abort',abort);fail();}
  async function step(fn,limit){
    check();const child=new AbortController();let childTimer,listener;
    const stop=()=>child.abort(controller.signal.aborted?controller.signal.reason:'TIMEOUT');controller.signal.addEventListener('abort',stop,{once:true});
    try{
      childTimer=clock.schedule(()=>{timedOut=true;stop();},Math.min(limit,end-tick()));if(childTimer===undefined||childTimer===null)fail();
      const canceled=new Promise((_,reject)=>{listener=()=>reject(Error('A02_AUTH_DELETE_BLOCKED'));child.signal.addEventListener('abort',listener,{once:true});if(child.signal.aborted)listener();});
      const work=Promise.resolve().then(()=>{check();if(child.signal.aborted)fail();return fn(child.signal);});
      const value=await Promise.race([work,canceled]);check();if(child.signal.aborted)fail();return value;
    }finally{if(childTimer!==undefined)clock.cancel(childTimer);controller.signal.removeEventListener('abort',stop);if(listener)child.signal.removeEventListener('abort',listener);child.abort('STEP_FINISHED');}
  }
  return {check,step,failure:()=>signal.aborted?'CANCELED':timedOut?'TIMEOUT':undefined,
    dispose:()=>{controller.abort('DISPOSED');clock.cancel(timer);signal.removeEventListener('abort',abort);}};
}
async function emptyAcknowledgement(response,url,signal){
  if(signal.aborted||response?.url!==url||response.redirected!==false||![200,204].includes(response.status)
    ||response.headers.has('location')||response.headers.has('set-cookie'))fail();
  if(response.status===200&&! /^application\/json(?:;|$)/i.test(response.headers.get('content-type')??''))fail();
  const reader=response.body?.getReader();if(!reader){if(response.status===204)return;fail();}
  const abort=()=>{void Promise.resolve().then(()=>reader.cancel()).catch(()=>{});};
  signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
  const chunks=[];let size=0;
  try{
    for(;;){if(signal.aborted)fail();const part=await reader.read();if(part.done)break;size+=part.value.length;
      if(size>1024){void reader.cancel().catch(()=>{});fail();}chunks.push(part.value);}
    if(signal.aborted)fail();const text=Buffer.concat(chunks).toString('utf8');
    if(response.status===204){if(text!=='')fail();}
    else if(!exact(JSON.parse(text),''))fail();
  }finally{signal.removeEventListener('abort',abort);reader.releaseLock();}
}

export function createA02AuthDeleter({executionMode,request,adminCredentials,acceptance,wallNow=Date.now,
  clock={now:()=>performance.now(),schedule,cancel}}={}){
  if(executionMode!==mode||typeof request!=='function'||typeof adminCredentials?.provider!=='function'
    ||typeof adminCredentials?.dispose!=='function'||typeof acceptance?.bindAuthDeletion!=='function'||typeof wallNow!=='function'
    ||typeof clock?.now!=='function'||typeof clock?.schedule!=='function'||typeof clock?.cancel!=='function')fail();
  let used=false,disposalState='NOT_ATTEMPTED';
  return async({authorization,signal}={})=>{
    let runtime,port,started=false,attempted=false,observation='NOT_ATTEMPTED',answer,disposed=false;
    const receipts=[];
    try{
      if(used||!signal||signal.aborted)fail();used=true;
      authorization=structuredClone(authorization);validateAuthorization(authorization,wallNow());
      runtime=deadline({signal,duration:authorization.overallDeadlineMs,authorization,wallNow,clock});
      port=acceptance.bindAuthDeletion(authorization);
      if(!isA02Gate4DeletionPort(port,authorization))fail();
      for(const op of authorization.operations){
        runtime.check();observation='NOT_ATTEMPTED';
        const url=`https://${project}.supabase.co/auth/v1/admin/users/${op.subject}`;
        await runtime.step(async child=>{
          const headers=adminCredentials.provider();
          if(!exact(headers,'apikey,Authorization')||! /^[\x21-\x7e]{20,8192}$/.test(headers.apikey)||! /^Bearer [\x21-\x7e]{20,8192}$/.test(headers.Authorization))fail();
          runtime.check();if(port.begin(op,child).status!=='PASS')fail();started=true;
          runtime.check();attempted=true;observation='CONNECTION_LOST';
          const response=await request(url,{method:'DELETE',redirect:'error',credentials:'omit',cache:'no-store',
            headers:{Accept:'application/json',apikey:headers.apikey,Authorization:headers.Authorization},signal:child});
          observation='MALFORMED';await emptyAcknowledgement(response,url,child);observation='ACKNOWLEDGED';
        },authorization.requestDeadlineMs);
        const confirmed=await runtime.step(child=>port.confirm(op,child),authorization.observationDeadlineMs);
        if(confirmed.status!=='PASS'){
          port.stop('MALFORMED');answer=safe(confirmed.status==='FAIL'?'FAIL':'UNKNOWN','INDEPENDENT_STATE_NOT_ACCEPTED',observation,receipts);break;
        }
        receipts.push(Object.freeze({label:op.label,attemptId:op.attemptId,acceptance:'PASS',basis:'INDEPENDENT_COMMITTED_STATE',requestFinality:'UNPROVEN'}));
      }
      if(!answer){runtime.check();const final=port.complete();answer=safe(final.status,'OBSERVED_COHORT_CLEANUP_STATE_ONLY',observation,receipts,final.cleanupComplete===true);}
    }catch{
      if(started||attempted){
        const transport=runtime?.failure()??(signal?.aborted?'CANCELED':observation==='ACKNOWLEDGED'?'MALFORMED':observation);
        try{port?.stop(transport);}catch{ /* only fixed sanitized results below */ }
        answer=safe('UNKNOWN','OUTCOME_OR_DEADLINE_UNCERTAIN',transport==='NOT_ATTEMPTED'?'MALFORMED':transport,receipts);
      }else answer=safe('BLOCKED','AUTHORIZATION_SCOPE_OR_DEADLINE_UNAVAILABLE');
    }finally{
      try{runtime?.dispose();}catch{if(started||attempted){try{port?.stop('MALFORMED');}catch{ /* sanitized */ }answer=safe('UNKNOWN','DEADLINE_DISPOSAL_FAILED','MALFORMED',receipts);}}
      try{if(disposalState==='NOT_ATTEMPTED'){disposalState='FAILED';adminCredentials.dispose();disposalState='SUCCEEDED';}
        disposed=disposalState==='SUCCEEDED';if(!disposed)fail();}catch{
        if(started||attempted){try{port?.stop('MALFORMED');}catch{ /* sanitized */ }}
        answer=safe(started||attempted?'UNKNOWN':'BLOCKED','CREDENTIAL_DISPOSAL_FAILED','MALFORMED',receipts);
      }
    }
    return Object.freeze({...answer,credentialDisposal:disposed?'SUCCEEDED':'FAILED'});
  };
}
