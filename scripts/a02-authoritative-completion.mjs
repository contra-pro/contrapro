/** Offline validation of independently obtained, reviewed transaction exports.
 * Not a provider exporter or authority discovery service. No defaults invent a source.
 * Source-policy authenticity/semantics must be established outside this adapter.
 */
import {createHash} from 'node:crypto';
import {a02Subjects} from './a02-independent-observer.mjs';
const project='gllsiklbvqpxzucvkehw',validated=new WeakSet();
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const digest=x=>createHash('sha256').update(x).digest('hex');
const ref=x=>typeof x==='string'&&x===x.trim()&&x.length>0&&x.length<=256&&x!=='UNBOUND';
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join()===keys.split(',').sort().join();
const fail=()=>{throw Error('A02_COMPLETION_EVIDENCE_BLOCKED');};
export function isValidatedA02CompletionReceipt(value){return value!==null&&typeof value==='object'&&validated.has(value);}

export function createA02AuthoritativeCompletionAdapter({policy,now=Date.now}={}){
  try{policy=structuredClone(policy);}catch{fail();}
  const source=policy?.authority;
  if(!exact(policy,'projectRef,runReference,gate,reviewReference,independentlyCaptured,start,end,authority,operations')
    ||policy.projectRef!==project||!ref(policy.runReference)||!['2','4'].includes(policy.gate)
    ||!ref(policy.reviewReference)||policy.independentlyCaptured!==true
    ||!Number.isSafeInteger(policy.start)||!Number.isSafeInteger(policy.end)||policy.end-policy.start!==7200000
    ||!exact(source,'id,type,reviewReference,semanticsReference,requestCorrelation,backendCompletion,commitOutcome,supportedOperations')
    ||!ref(source.id)||!['reviewed-provider-transaction-export','reviewed-database-transaction-export'].includes(source.type)
    ||!ref(source.reviewReference)||!ref(source.semanticsReference)||source.requestCorrelation!==true
    ||source.backendCompletion!==true||source.commitOutcome!==true||typeof now!=='function'
    ||!Array.isArray(source.supportedOperations)||source.supportedOperations.length<1||source.supportedOperations.length>3
    ||new Set(source.supportedOperations).size!==source.supportedOperations.length
    ||source.supportedOperations.some(x=>!['auth-create','auth-delete','provision'].includes(x))
    ||!Array.isArray(policy.operations)||policy.operations.length<1||policy.operations.length>(policy.gate==='2'?5:3))fail();
  const ids=new Set(),actors=new Set(),requests=new Set();
  for(const op of policy.operations){
    if(!exact(op,'attemptId,operation,label,subject,startedAt,requestId,sourceSha256')||!uuid.test(op.attemptId)
      ||!['auth-create','auth-delete','provision'].includes(op.operation)||!['A','B','U'].includes(op.label)
      ||op.subject!==a02Subjects[op.label]||!ref(op.requestId)||!Number.isSafeInteger(op.startedAt)
      ||op.startedAt<policy.start||op.startedAt>=policy.end||!/^[0-9a-f]{64}$/.test(op.sourceSha256)
      ||!source.supportedOperations.includes(op.operation)
      ||(op.operation==='provision'&&op.label==='U')||(policy.gate==='2'&&op.operation==='auth-delete')
      ||(policy.gate==='4'&&op.operation!=='auth-delete')||ids.has(op.attemptId.toLowerCase())
      ||requests.has(op.requestId)||actors.has(`${op.operation}:${op.label}`))fail();
    ids.add(op.attemptId.toLowerCase());requests.add(op.requestId);actors.add(`${op.operation}:${op.label}`);
  }
  const consumed=new Set();
  return ({normalized,normalizedSha256,sourceBytes}={})=>{
    try{
      if(!exact(normalized,'attemptId,commit,completedAt,kind,label,projectRef,runReference,source,state,subject')
        ||!Buffer.isBuffer(sourceBytes)||sourceBytes.length>8192||!/^[0-9a-f]{64}$/.test(normalizedSha256)
        ||!Number.isSafeInteger(now())||now()<policy.start||now()>=policy.end)fail();
      const op=policy.operations.find(x=>x.attemptId===normalized.attemptId);
      if(!op||consumed.has(op.attemptId))fail();consumed.add(op.attemptId);
      if(digest(sourceBytes)!==op.sourceSha256)fail();
      const raw=JSON.parse(sourceBytes.toString('utf8'));
      if(!exact(raw,'format,projectRef,runReference,authorityId,attemptId,operation,label,subject,requestId,transactionId,startedAt,completedAt,terminal,outcome')
        ||raw.format!=='a02-reviewed-transaction-export-v1'||raw.projectRef!==project||raw.runReference!==policy.runReference
        ||raw.authorityId!==source.id||raw.attemptId!==op.attemptId||raw.operation!==op.operation||raw.label!==op.label
        ||raw.subject!==op.subject||raw.requestId!==op.requestId||!ref(raw.transactionId)||raw.startedAt!==op.startedAt
        ||raw.terminal!==true||!['COMMITTED','ROLLED_BACK'].includes(raw.outcome)
        ||!Number.isSafeInteger(raw.completedAt)||raw.completedAt<op.startedAt||raw.completedAt>now()
        ||raw.completedAt>=policy.end||now()-raw.completedAt>30000)fail();
      const kind=op.operation==='auth-create'?'auth':op.operation==='auth-delete'?'auth-delete':'provision';
      if(normalized.projectRef!==project||normalized.runReference!==policy.runReference||normalized.source!==source.id
        ||normalized.kind!==kind||normalized.label!==op.label||normalized.subject!==op.subject
        ||normalized.state!=='FINISHED'||normalized.commit!==raw.outcome||normalized.completedAt!==raw.completedAt)fail();
      const result=Object.freeze({...normalized,sha256:normalizedSha256,sourceReviewReference:source.reviewReference,
        authorityReviewReference:policy.reviewReference,transactionId:raw.transactionId,requestId:raw.requestId,
        sourceArtifactSha256:op.sourceSha256,operation:op.operation,startedAt:op.startedAt,gate:policy.gate});
      validated.add(result);return result;
    }catch{fail();}
  };
}
