/** Exact A02 read-only reconciliation. No write transport, retry or cleanup capability. */
import {readFile,lstat,realpath} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {a02Subjects} from './a02-independent-observer.mjs';
import {isValidatedA02CompletionReceipt} from './a02-authoritative-completion.mjs';
const project='gllsiklbvqpxzucvkehw';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const fail=()=>{throw Error('A02_RECONCILIATION_BLOCKED');};
const ref=x=>typeof x==='string'&&x===x.trim()&&x.length>0&&x.length<=256&&x!=='UNBOUND';
/** Read a separately captured, independently reviewed completion export by exact ID/hash.
 * Hash/shape checks establish integrity, NOT the truth of an exported completion claim.
 * approvedSource + sourceReviewReference must identify a real reviewed authoritative source.
 * Cannot be instantiated with UNBOUND source references. Never reads executor success logs.
 */
export function createA02TerminalReceiptReader({directory,approvedSource,sourceReviewReference,authorityAdapter}={}){
  if(typeof directory!=='string'||directory.startsWith('\\\\')||(process.platform==='win32'&&!/^[A-Za-z]:\\/.test(directory))
    ||!ref(approvedSource)||!ref(sourceReviewReference)||typeof authorityAdapter!=='function')fail();
  return async({attemptId,expectedSha256})=>{
    try{
      if(!uuid.test(attemptId)||!/^[0-9a-f]{64}$/.test(expectedSha256))fail();
      const root=await realpath(directory);if(resolve(directory)!==root)fail();
      let path=root;
      for(;;){if((await lstat(path)).isSymbolicLink())fail();try{await lstat(join(path,'.git'));fail();}catch(e){if(e.code!=='ENOENT')throw e;}
        const parent=dirname(path);if(parent===path)break;path=parent;}
      const file=join(root,`${attemptId}.json`);const stat=await lstat(file);
      if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8192)fail();
      const bytes=await readFile(file);if(createHash('sha256').update(bytes).digest('hex')!==expectedSha256)fail();
      const r=JSON.parse(bytes);
      if(Object.keys(r).sort().join()!=='attemptId,commit,completedAt,kind,label,projectRef,runReference,source,state,subject'
        ||r.projectRef!==project||r.source!==approvedSource||!ref(r.runReference)||r.attemptId!==attemptId
        ||!['auth','auth-delete','provision'].includes(r.kind)||!['A','B','U'].includes(r.label)||r.subject!==a02Subjects[r.label]
        ||(r.kind==='provision'&&r.label==='U')||!['FINISHED','IN_FLIGHT','UNKNOWN'].includes(r.state)
        ||!['COMMITTED','ROLLED_BACK','UNKNOWN'].includes(r.commit)
        ||!(r.completedAt===null||Number.isSafeInteger(r.completedAt))
        ||(r.state==='FINISHED'&&r.completedAt===null)||(r.state!=='FINISHED'&&(r.commit!=='UNKNOWN'||r.completedAt!==null)))fail();
      const sourceFile=join(root,`${attemptId}.transaction.json`),sourceStat=await lstat(sourceFile);
      if(!sourceStat.isFile()||sourceStat.isSymbolicLink()||sourceStat.size>8192)fail();
      const result=authorityAdapter({normalized:r,normalizedSha256:expectedSha256,sourceBytes:await readFile(sourceFile)});
      if(!isValidatedA02CompletionReceipt(result)||result.sourceReviewReference!==sourceReviewReference)fail();
      return result;
    }catch{fail();}
  };
}
/** One reconciliation per attempted operation; observe actual rows only AFTER proven completion.
 * Pending/unknown/unavailable source -> BLOCKED, never infer rollback from row absence.
 */
export function createA02Reconciler({observer,readTerminal,runReference,now=Date.now}={}){
  if(typeof observer?.observeCohort!=='function'||typeof readTerminal!=='function'||!ref(runReference))fail();
  const used=new Set();
  let authCapture;
  return async({attemptId,kind,label,attemptedAt,terminalSha256,signal}={})=>{
    try{
      if(!Number.isSafeInteger(now())||!uuid.test(attemptId)||used.has(attemptId)||!['auth','provision'].includes(kind)||!['A','B','U'].includes(label)
        ||(kind==='provision'&&label==='U')||!signal||signal.aborted||!Number.isSafeInteger(attemptedAt)||attemptedAt>now())fail();
      used.add(attemptId);
      const terminal=await bounded(()=>readTerminal({attemptId,expectedSha256:terminalSha256}),signal,2000);
      if(!isValidatedA02CompletionReceipt(terminal)||terminal.gate!=='2'
        ||terminal.startedAt!==attemptedAt||terminal.projectRef!==project||terminal.attemptId!==attemptId||terminal.runReference!==runReference
        ||terminal.subject!==a02Subjects[label]||terminal.kind!==kind||terminal.label!==label
        ||!ref(terminal.sourceReviewReference)||!ref(terminal.source)||!Number.isSafeInteger(now())
        ||!/^[0-9a-f]{64}$/.test(terminalSha256)||terminal.sha256!==terminalSha256||signal.aborted)fail();
      if(terminal.state!=='FINISHED')return {state:'blocked',reason:'COMPLETION_NOT_PROVEN',retryAllowed:false};
      if(!Number.isSafeInteger(terminal.completedAt)||terminal.completedAt<attemptedAt||terminal.completedAt>now()
        ||now()-terminal.completedAt>30000)fail();
      if(kind==='auth'&&!authCapture)authCapture=observer.observeCohort('reconcile-auth',{signal});
      const capture=await (kind==='auth'?authCapture:observer.observeCohort(`reconcile-${label}`,{signal}));
      if(signal.aborted||!Number.isSafeInteger(now())||now()-terminal.completedAt>30000||capture.projectRef!==project||capture.rollback!=='SUCCEEDED'
        ||capture.checkpoint!==(kind==='auth'?'reconcile-auth':`reconcile-${label}`)
        ||capture.runReference!==runReference||!Number.isSafeInteger(capture.startedAt)||!Number.isSafeInteger(capture.endedAt)
        ||capture.startedAt<terminal.completedAt||capture.endedAt<capture.startedAt||capture.endedAt>now()
        ||capture.endedAt-capture.startedAt>=20000||now()-capture.endedAt>20000)fail();
      const {sha256,receiptReference,...payload}=capture;
      if(createHash('sha256').update(JSON.stringify(payload)).digest('hex')!==sha256
        ||receiptReference!==`a02-observer-sha256:${sha256}`)fail();
      const rows=capture.rows,row=rows.find(x=>x.label===label);if(!row||rows.length!==3)fail();
      if(rows.map(x=>x.label).sort().join()!=='A,B,U'||rows.some(x=>typeof x.auth_exists!=='boolean'
        ||!(x.canonical_active===null||typeof x.canonical_active==='boolean')
        ||!(x.canonical_user_id===null||typeof x.canonical_user_id==='string'&&uuid.test(x.canonical_user_id))))fail();
      const ids=rows.filter(x=>x.canonical_user_id!==null).map(x=>x.canonical_user_id.toLowerCase());
      if(new Set(ids).size!==ids.length||ids.some(x=>Object.values(a02Subjects).includes(x))
        ||rows.some(x=>x.canonical_user_id!==null&&(!x.auth_exists||x.canonical_active!==true))
        ||rows.find(x=>x.label==='U')?.canonical_user_id!==null
        ||rows.some(x=>['memberships','agencies','clients','invitations_by_cohort','audit_by_cohort'].some(k=>String(x[k])!=='0')))
        return {state:'blocked',reason:'PARTIAL_OR_UNEXPECTED_STATE',retryAllowed:false};
      const present=kind==='auth'?row.auth_exists:row.auth_exists&&row.canonical_active===true&&row.canonical_user_id!==null;
      const absent=kind==='auth'?!row.auth_exists&&row.canonical_user_id===null:row.auth_exists&&row.canonical_user_id===null;
      if(terminal.commit==='COMMITTED'&&present)return {state:'confirmed-committed',retryAllowed:false,observation: capture.receiptReference,terminal:terminal.sha256};
      if(terminal.commit==='ROLLED_BACK'&&absent)return {state:'confirmed-no-write',retryAllowed:false,observation:capture.receiptReference,terminal:terminal.sha256};
      return {state:'blocked',reason:'COMMIT_OR_STATE_UNCERTAIN',retryAllowed:false};
    }catch{return {state:'blocked',reason:'EVIDENCE_UNAVAILABLE_OR_INVALID',retryAllowed:false};}
  };
}
async function bounded(fn,signal,ms){
  let timer,abort;
  try{return await Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{
    abort=()=>reject(Error('A02_RECONCILIATION_BLOCKED'));signal.addEventListener('abort',abort,{once:true});
    if(signal.aborted)abort();timer=setTimeout(abort,ms);
  })]);}finally{clearTimeout(timer);if(abort)signal.removeEventListener('abort',abort);}
}
