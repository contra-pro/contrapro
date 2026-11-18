/** A02 only. No connection, credential discovery, capture persistence or logging at import. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {checkServerIdentity} from 'node:tls';
import {redactA02Diagnostics} from './a02-private-input.mjs';
import {assessA02LoggingEvidence} from './a02-logging-evidence.mjs';
export const a02Subjects=Object.freeze({A:'17eaeec9-37e1-4720-ba7a-c1e16f659af5',B:'305fb936-588e-42f9-bc4d-f41a0d3f60c0',U:'f7334db7-f402-4f00-9c1a-754eb3eb2f3e'});
const project='gllsiklbvqpxzucvkehw',host='aws-0-eu-west-1.pooler.supabase.com';
const baseline=['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700'];
const fail=()=>{throw Error('A02_OBSERVER_BLOCKED');};
const hash=x=>createHash('sha256').update(x).digest('hex');
const reference=x=>typeof x==='string'&&x.trim().length>0&&x!=='UNBOUND'&&x.length<=256;
const captureSources=new WeakMap();
/** Process-local capture provenance, not a signature or a portable receipt importer. */
export function isA02IndependentCapture(value,{runReference,observerReference}={}){
  const source=value&&captureSources.get(value);
  return !!source&&source.runReference===runReference&&source.reference===observerReference;
}
const guardSql=`SELECT current_database()='postgres' AND session_user='postgres' AND current_user='postgres'
 AND current_setting('server_version_num')::integer BETWEEN 170000 AND 179999
 AND current_setting('transaction_read_only')='on' AND NOT pg_is_in_recovery()
 AND EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR rolbypassrls)) AS ok`;
const absenceSql=`WITH nominated(label,subject,email) AS (VALUES
 ('A',$1::uuid,$2::text),('B',$3::uuid,$4::text),('U',$5::uuid,$6::text))
 SELECT n.label,EXISTS(SELECT 1 FROM auth.users a WHERE a.id=n.subject) AS id_exists,
 EXISTS(SELECT 1 FROM auth.users a WHERE lower(a.email)=lower(n.email)) AS email_exists
 FROM nominated n ORDER BY n.label LIMIT 3`;
/** Existing pg dependency, fixed session-pooler route. password+CA supplied in memory.
 * Factory never imports the migration runner or executes a write. No environment fallback
 * for route, password, SSL, options or application name. No pool/reconnection/retries.
 */
export function createA02ObserverClientFactory({connectionProvider,caSha256}={}){
  if(typeof connectionProvider!=='function'||caSha256!=='700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7')fail();
  return ()=>{
    try{
      const secret=connectionProvider();
      if(!secret||typeof secret.password!=='string'||!secret.password||!Buffer.isBuffer(secret.ca)||hash(secret.ca)!==caSha256)fail();
      const {Client}=createRequire(new URL('../packages/infrastructure/database/package.json',import.meta.url))('pg');
      return new Client({host,port:5432,user:`postgres.${project}`,database:'postgres',password:secret.password,
        ssl:{ca:Buffer.from(secret.ca),rejectUnauthorized:true,servername:host,checkServerIdentity},
        application_name:'contratpro-a02-independent-observer',connectionTimeoutMillis:2000,query_timeout:5000,
        options:'-c default_transaction_read_only=on -c statement_timeout=5000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=10000'});
    }catch{fail();}
  };
}
/** Fixed query/transaction adapter. Independent client factory is mandatory, never executor logs.
 * Approval is a reviewed operator assertion. It does not authorize itself.
 */
export async function createA02IndependentObserver({clientFactory,credentialProvider,approval,now=Date.now}={}){
  if(typeof clientFactory!=='function'||typeof credentialProvider!=='function'||typeof now!=='function'
    ||approval?.projectRef!==project||!reference(approval.runReference)||!reference(approval.reference)
    ||approval.parameterLoggingCleared!==true||!reference(approval.parameterLoggingReview)
    ||assessA02LoggingEvidence(approval.loggingEvidence).status!=='CLEARED')fail();
  approval=structuredClone(approval);
  const stateMode=approval.acceptanceMode==='state-based-v1';
  if(approval.acceptanceMode!==undefined&&(!stateMode||!reference(approval.statePolicyReview)||!reference(approval.gate2Approval)))fail();
  const sqlFile=await readFile(new URL('../docs/canonical-acceptance/a02-temporary/cohort-observation.sql',import.meta.url),'utf8');
  const cohortSql=sqlFile.slice(sqlFile.indexOf('WITH nominated(label,subject)'),sqlFile.lastIndexOf('ROLLBACK;')).trim();
  const metadataSql=sqlFile.slice(sqlFile.indexOf('SELECT transaction_timestamp()'),sqlFile.indexOf('WITH nominated(label,subject)'))
    .replace(/--[^\n]*/g,'').split(';').map(s=>s.trim()).filter(Boolean);
  if(!cohortSql.startsWith('WITH nominated(label,subject)')||!cohortSql.endsWith('LIMIT 3;'))fail();
  if(metadataSql.length!==5||metadataSql.some(s=>!s.startsWith('SELECT ')))fail();
  const used=new Set(),captures=[],privateAbsence=new Map();
  let disposed=false;
  const checkpoints=['baseline','post-install','after-auth','after-A','after-B','post-removal'];
  async function capture(checkpoint,sql,values,signal,ms,extraQuery){
    if(disposed||used.has(checkpoint)||!signal||signal.aborted||!Number.isSafeInteger(now())
      ||now()<approval.start||now()>=approval.end||!Number.isSafeInteger(approval.start)
      ||!Number.isSafeInteger(approval.end)||approval.end-approval.start!==7200000)fail();
    used.add(checkpoint);let client,rolledBack=false;const start=now();
    const controller=new AbortController();const abort=()=>controller.abort();
    signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();const timer=setTimeout(abort,ms);
    const check=()=>{if(controller.signal.aborted||now()-start>=ms||now()>=approval.end)fail();};
    try{
      const task=(async()=>{
        check();client=clientFactory({checkpoint});await client.connect();check();
        const query=async(text,params)=>{check();const result=await client.query(text,params);check();return result;};
        await query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
        for(const s of ["SET LOCAL search_path=pg_catalog","SET LOCAL statement_timeout='5000ms'","SET LOCAL lock_timeout='2000ms'","SET LOCAL idle_in_transaction_session_timeout='10000ms'"])await query(s);
        const guard=await query(guardSql);if(guard.rows?.length!==1||guard.rows[0].ok!==true)fail();
        const metadata=[];
        if(checkpoint!=='absence')for(const statement of metadataSql)metadata.push((await query(statement)).rows);
        const result=await query(sql,values);
        const extra=extraQuery?(await query(extraQuery.sql,extraQuery.values)).rows:undefined;
        await query('ROLLBACK');rolledBack=true;
        await client.end();check();
        return {rows:result.rows,metadata,extra};
      })();
      const {rows,metadata,extra}=await Promise.race([task,new Promise((_,reject)=>{if(controller.signal.aborted)reject(Error('A02_OBSERVER_BLOCKED'));else controller.signal.addEventListener('abort',()=>reject(Error('A02_OBSERVER_BLOCKED')),{once:true});})]);
      if(!Array.isArray(rows)||rows.length!==3)fail();
      // Fixed allowlists below ensure no raw response, private email or credential reaches captures.
      return {rows,metadata,extra,start,endedAt:now(),rolledBack};
    }catch{
      controller.abort(); // disconnect: do not queue a rollback behind a stuck query
      if(client)void Promise.resolve().then(()=>client.end()).catch(()=>{});
      fail();
    }finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
  }
  function record(checkpoint,result,rows){
    rows=Object.freeze(rows.map(row=>Object.freeze({...row})));
    const payload={projectRef:project,runReference:approval.runReference,checkpoint,
      startedAt:result.start,endedAt:result.endedAt,rollback:result.rolledBack?'SUCCEEDED':'FAILED',rows,
      metadata:result.checkedMetadata??null};
    const digest=hash(JSON.stringify(payload));
    const receipt=Object.freeze({...payload,sha256:digest,receiptReference:`a02-observer-sha256:${digest}`});
    captureSources.set(receipt,{runReference:approval.runReference,reference:approval.reference});
    captures.push(receipt);return receipt;
  }
  async function observeAbsence({signal}={}){
    try{
      const emails=Object.fromEntries(Object.keys(a02Subjects).map(label=>[label,credentialProvider(label).email]));
      if(Object.values(emails).some(x=>typeof x!=='string'||x.length>320)||new Set(Object.values(emails).map(x=>x.toLowerCase())).size!==3)fail();
      const values=Object.keys(a02Subjects).flatMap(label=>[a02Subjects[label],emails[label]]);
      const r=await capture('absence',absenceSql,values,signal,20000);
      const rows=['A','B','U'].map(label=>{
        const matches=r.rows.filter(x=>x.label===label);if(matches.length!==1)fail();const row=matches[0];
        if(Object.keys(row).sort().join()!=='email_exists,id_exists,label'||typeof row.id_exists!=='boolean'||typeof row.email_exists!=='boolean')fail();
        return {label,idExists:row.id_exists,emailExists:row.email_exists};
      });
      const receipt=record('absence',r,rows);
      for(const row of rows)privateAbsence.set(row.label,{...row,email:emails[row.label],observedAt:r.endedAt,receiptReference:receipt.receiptReference});
      return receipt;
    }catch{fail();}
  }
  function absenceCheck({label,subject,email,runReference,signal}={}){
    try{
      const r=privateAbsence.get(label);if(signal?.aborted||!r||subject!==a02Subjects[label]||email!==r.email
        ||disposed
        ||runReference!==approval.runReference||now()<r.observedAt||now()-r.observedAt>30000||r.idExists||r.emailExists)fail();
      return redactA02Diagnostics({runReference,subject,email,idExists:false,emailExists:false,
        receiptReference:r.receiptReference,observedAt:r.observedAt},'private absence evidence');
    }catch{fail();}
  }
  async function observeCohort(checkpoint,{signal,canonical}={}){
    try{
      const recovery=stateMode&&/^reconcile-(auth|A|B)-([12])$/.exec(checkpoint);
      const gate3=stateMode&&['isolation-before','isolation-after'].includes(checkpoint)&&reference(approval.gate3Approval);
      const gate4=stateMode&&['cleanup-before','cleanup-after','delete-A','delete-B','delete-U'].includes(checkpoint)&&reference(approval.gate4Approval);
      if(!checkpoints.includes(checkpoint)&&!(approval.recoveryAllowed===true&&(stateMode?recovery:['reconcile-auth','reconcile-A','reconcile-B'].includes(checkpoint)))&&!gate3&&!gate4)fail();
      if(recovery&&recovery[2]==='2'){
        const first=captures.find(c=>c.checkpoint===`reconcile-${recovery[1]}-1`);
        if(!first||now()-first.endedAt<1000||now()-first.startedAt>=45000)fail();
      }
      let extraQuery;
      if(gate4){
        if(!Array.isArray(canonical)||canonical.length!==2||new Set(canonical).size!==2
          ||canonical.some(x=>typeof x!=='string'||! /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(x)||Object.values(a02Subjects).includes(x)))fail();
        extraQuery={sql:`SELECT (SELECT count(*) FROM identity.users WHERE id=ANY($1::uuid[])) AS canonical_rows,
          (SELECT count(*) FROM identity.supabase_users WHERE user_id=ANY($1::uuid[])) AS reverse_mappings`,values:[canonical]};
      }
      const r=await capture(checkpoint,cohortSql,undefined,signal,['after-A','after-B'].includes(checkpoint)?2000:20000,extraQuery);
      if(recovery&&recovery[2]==='2'&&r.endedAt-captures.find(c=>c.checkpoint===`reconcile-${recovery[1]}-1`).startedAt>45000)fail();
      const [boundaries,wrappers,counts,historyCount,history]=r.metadata;
      if(boundaries?.length!==1||['original_denied','temporary_set_absent','temporary_create_absent','temporary_self_grant_absent'].some(k=>boundaries[0][k]!==true)
        ||counts?.length!==1||Number(counts[0].wrapper_overloads)!==wrappers?.length||wrappers.length>1
        ||historyCount?.length!==1||Number(historyCount[0].history_count)!==history?.length||history.length<8||history.length>11
        ||history.some(x=>Object.keys(x).join()!=='version'||!/^\d{14}$/.test(x.version)))fail();
      if(((gate3||gate4||['baseline','post-removal'].includes(checkpoint))&&wrappers.length!==0)
        ||(['post-install','after-auth','after-A','after-B'].includes(checkpoint)&&wrappers.length!==1))fail();
      const versions=history.map(x=>x.version),extra=versions.slice(8).join();
      if(versions.slice(0,8).join()!==baseline.join()
        ||!['','20261117000100','20261117000100,20261117000200','20261117000100,20261117000300','20261117000100,20261117000200,20261117000300'].includes(extra)
        ||(checkpoint==='baseline'&&extra!=='')
        ||(['post-install','after-auth','after-A','after-B'].includes(checkpoint)&&extra!=='20261117000100')
        ||((gate3||gate4||checkpoint==='post-removal')&&!extra.endsWith('20261117000300')))fail();
      const wrapperEvidence=wrappers.map(w=>{
        if(w.owner!=='contratpro_identity_writer'||w.prosecdef!==true||!Array.isArray(w.proconfig)
          ||w.proconfig.toSorted().join()!=='row_security=on,search_path=pg_catalog'
          ||typeof w.definition!=='string'||w.definition.length>65536||typeof w.signature!=='string'
          ||!/^(public\.)?contratpro_a02_fixture_provision\(\)$/.test(w.signature))fail();
        return {signature:w.signature,owner:w.owner,securityDefiner:true,definitionSha256:hash(w.definition),aclSha256:hash(String(w.proacl))};
      });
      let cleanup;
      if(gate4){
        if(r.extra?.length!==1||Object.keys(r.extra[0]).sort().join()!=='canonical_rows,reverse_mappings'
          ||Object.values(r.extra[0]).some(x=>! /^[0-2]$/.test(String(x))))fail();
        cleanup=Object.freeze({canonical:Object.freeze([...canonical]),canonicalRows:Number(r.extra[0].canonical_rows),reverseMappings:Number(r.extra[0].reverse_mappings)});
      }
      r.checkedMetadata=Object.freeze({originalDenied:true,temporaryRightsAbsent:true,
        wrappers:Object.freeze(wrapperEvidence.map(Object.freeze)),history:Object.freeze(history.map(x=>x.version)),...(cleanup?{cleanup}:{})});
      const expectedKeys='agencies,audit_by_cohort,auth_exists,canonical_active,canonical_user_id,clients,invitations_by_cohort,label,memberships';
      const rows=['A','B','U'].map(label=>{
        const matches=r.rows.filter(x=>x.label===label);if(matches.length!==1)fail();const row=matches[0];
        if(Object.keys(row).sort().join()!==expectedKeys||typeof row.auth_exists!=='boolean'
          ||!(row.canonical_active===null||typeof row.canonical_active==='boolean')
          ||!(row.canonical_user_id===null||/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(row.canonical_user_id)))fail();
        for(const key of ['memberships','agencies','clients','invitations_by_cohort','audit_by_cohort'])if(!/^(0|[1-9][0-9]{0,15})$/.test(String(row[key])))fail();
        return {...row};
      });
      return record(checkpoint,r,rows);
    }catch{fail();}
  }
  async function confirmMapping({label,subject,signal}={}){
    if(!['A','B'].includes(label)||subject!==a02Subjects[label])fail();
    const receipt=await observeCohort(`after-${label}`,{signal});const row=receipt.rows.find(x=>x.label===label);
    const canonical=receipt.rows.filter(x=>x.canonical_user_id!==null).map(x=>x.canonical_user_id.toLowerCase());
    if(now()-receipt.endedAt>2000||!row.auth_exists||!row.canonical_active||!row.canonical_user_id
      ||canonical.some(x=>Object.values(a02Subjects).includes(x))||new Set(canonical).size!==canonical.length
      ||receipt.rows.some(x=>!x.auth_exists||(x.canonical_user_id!==null&&x.canonical_active!==true))
      ||(label==='A'&&receipt.rows.find(x=>x.label==='B').canonical_user_id!==null)
      ||receipt.rows.find(x=>x.label==='U').canonical_user_id!==null
      ||receipt.rows.some(x=>['memberships','agencies','clients','invitations_by_cohort','audit_by_cohort'].some(k=>String(x[k])!=='0')))fail();
    return {subject,canonicalUserId:row.canonical_user_id,state:'active',membershipPresent:false};
  }
  return Object.freeze({observeAbsence,absenceCheck,observeCohort,confirmMapping,
    receiptFor:checkpoint=>captures.find(c=>c.checkpoint===checkpoint),
    evidence:()=>structuredClone(captures),dispose:()=>{disposed=true;privateAbsence.clear();}});
}
