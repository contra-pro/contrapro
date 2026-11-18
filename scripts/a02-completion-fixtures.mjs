/** SYNTHETIC TEST DATA ONLY. No real authority, credential, session or provider export. */
import {createHash} from 'node:crypto';
import {a02Subjects} from './a02-independent-observer.mjs';
export const completionFixtureTime=1794916800000;
export function syntheticA02Completion(extra={}){
  const t=completionFixtureTime;
  const normalized={projectRef:'gllsiklbvqpxzucvkehw',runReference:'offline-run',source:'offline-independent-source',
    attemptId:'11111111-1111-4111-8111-111111111111',kind:'provision',label:'A',subject:a02Subjects.A,
    state:'FINISHED',commit:'COMMITTED',completedAt:t-1,...extra};
  const operation=normalized.kind==='auth'?'auth-create':normalized.kind==='auth-delete'?'auth-delete':'provision';
  const raw={format:'a02-reviewed-transaction-export-v1',projectRef:normalized.projectRef,runReference:normalized.runReference,
    authorityId:normalized.source,attemptId:normalized.attemptId,operation,label:normalized.label,subject:normalized.subject,
    requestId:'offline-request-'+normalized.attemptId,transactionId:'offline-transaction-'+normalized.attemptId,
    startedAt:t-10,completedAt:normalized.completedAt,terminal:normalized.state==='FINISHED',outcome:normalized.commit};
  const sourceBytes=Buffer.from(JSON.stringify(raw));
  const normalizedBytes=Buffer.from(JSON.stringify(normalized));
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const policy={projectRef:normalized.projectRef,runReference:normalized.runReference,gate:operation==='auth-delete'?'4':'2',
    reviewReference:'offline-policy-fixture-NOT-AUTHORIZATION',independentlyCaptured:true,start:t-1000,end:t-1000+7200000,
    authority:{id:normalized.source,type:'reviewed-database-transaction-export',reviewReference:'offline-source-review',
      semanticsReference:'offline-fixture-semantics-NOT-A-PROVIDER-GUARANTEE',requestCorrelation:true,backendCompletion:true,commitOutcome:true,supportedOperations:[operation]},
    operations:[{attemptId:normalized.attemptId,operation,label:normalized.label,subject:normalized.subject,startedAt:t-10,
      requestId:raw.requestId,sourceSha256:hash(sourceBytes)}]};
  return {normalized,raw,sourceBytes,normalizedBytes,normalizedSha256:hash(normalizedBytes),policy};
}
