/** Future explicitly approved rollback-only acceptance. No CLI, import-time I/O,
 * ambient credential discovery, migration execution, retry or logging. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {isIP} from 'node:net';
import {checkServerIdentity} from 'node:tls';
import {performance} from 'node:perf_hooks';
const project='gllsiklbvqpxzucvkehw',host='aws-0-eu-west-1.pooler.supabase.com';
const caHash='700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7';
export const acceptanceSqlSha256='5e65d8f153b1fb4d07c1d64de82490d8193f58160c970d4c3f6ef31516fd7460'; // Bound below only after reviewed source preparation.
const scriptUrl=new URL('./test-client-idempotency-postgres.sql',import.meta.url);
const plans=new WeakMap();
const sha=x=>createHash('sha256').update(x).digest('hex');
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(x);
const ref=x=>typeof x==='string'&&/^[A-Za-z0-9_./:#-]{1,256}$/.test(x)&&x!=='UNBOUND';
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.split(',').sort().join();
const fail=()=>{throw Error('CLIENT_ACCEPTANCE_BLOCKED');};

export function validateClientAcceptance(config,now=Date.now()){
  const {approval:a,evidence:e,subjects:s}=config??{};
  if(!exact(config,'projectRef,approval,evidence,subjects,sqlSha256')||config.projectRef!==project||config.sqlSha256!==acceptanceSqlSha256||! /^[0-9a-f]{64}$/.test(acceptanceSqlSha256)
    ||!exact(a,'projectRef,scope,reference,start,end')||a.projectRef!==project||a.scope!=='P3_CLIENT_IDEMPOTENCY_ROLLBACK_ACCEPTANCE'
    ||!ref(a.reference)||!Number.isSafeInteger(now)||!Number.isSafeInteger(a.start)||!Number.isSafeInteger(a.end)||a.start>now||a.end<=now||a.end-a.start>7200000
    ||!exact(e,'projectRef,environment,host,port,user,database,postgresMajor,databaseOid,serverAddress,serverPort,observedAt,controlPlaneReference,databaseReference')
    ||e.projectRef!==project||e.environment!=='development'||e.host!==host||e.port!==5432||e.user!==`postgres.${project}`||e.database!=='postgres'||e.postgresMajor!==17
    ||!ref(e.controlPlaneReference)||!ref(e.databaseReference)||!Number.isSafeInteger(e.observedAt)||e.observedAt>now||now-e.observedAt>900000
    ||typeof e.databaseOid!=='string'||! /^[1-9][0-9]{0,9}$/.test(e.databaseOid)||Number(e.databaseOid)>4294967295
    ||typeof e.serverAddress!=='string'||!isIP(e.serverAddress)||!Number.isInteger(e.serverPort)||e.serverPort<1||e.serverPort>65535
    ||!exact(s,'subjectA,subjectB,agencyA,agencyB,ownershipReference')||!ref(s.ownershipReference)
    ||![s.subjectA,s.subjectB,s.agencyA,s.agencyB].every(uuid)||new Set([s.subjectA,s.subjectB,s.agencyA,s.agencyB]).size!==4)fail();
  return true;
}
export function validateClientObservation(row,evidence,tls){
  return row?.database==='postgres'&&row.session_user==='postgres'&&row.current_user==='postgres'
    &&Number(row.version_num)>=170000&&Number(row.version_num)<180000&&row.database_oid===evidence.databaseOid
    &&row.server_address===evidence.serverAddress&&row.server_port===evidence.serverPort
    &&tls?.encrypted===true&&tls.authorized===true&&tls.hostnameVerified===true;
}
export async function prepareClientAcceptance(config,{now=Date.now,read=readFile}={}){
  validateClientAcceptance(config,now());
  const sql=await read(scriptUrl,'utf8');if(sha(sql)!==acceptanceSqlSha256)fail();
  const plan=Object.freeze({status:'PREPARED_ONLY',projectRef:project,runReference:config.approval.reference,liveAcceptanceComplete:false});
  plans.set(plan,{config:structuredClone(config),sql});return plan;
}
function defaultClient(options){
  const require=createRequire(new URL('../packages/infrastructure/database/package.json',import.meta.url));
  if(require('pg/package.json').version!=='8.23.1')fail();
  const {Client}=require('pg');return new Client(options);
}
/** NOT executed by offline preparation/tests. Approval authenticity and custody
 * are independent operator prerequisites; metadata/reference strings are not signatures.
 * The provider is the existing memory-only observer connection contract, plus dispose.
 */
export async function executeClientAcceptance(plan,{credentials,now=Date.now}={}){
  let client,secret,timer,attempted=false,disposalFailed=false,stopped=false;
  let answer={status:'BLOCKED',liveAcceptanceComplete:false,rollbackAcknowledged:false};
  try{
    const bound=plans.get(plan);if(!bound||typeof credentials?.provide!=='function'||typeof credentials?.dispose!=='function')fail();
    plans.delete(plan);const {config,sql}=bound;validateClientAcceptance(config,now());
    // Presence checks only, at future execution. Never retrieve an ambient secret.
    if(Object.keys(process.env).some(k=>k.startsWith('PG')||['NODE_OPTIONS','NODE_DEBUG','NODE_TLS_REJECT_UNAUTHORIZED','SSLKEYLOGFILE'].includes(k))
      ||process.execArgv.some(arg=>arg.startsWith('--inspect')||arg.startsWith('--require')||arg.startsWith('--import')))fail();
    const budget=Math.min(20000,config.approval.end-now());if(budget<=0)fail();
    const started=performance.now();const check=()=>{if(stopped||performance.now()-started>=budget)fail();validateClientAcceptance(config,now());};
    const expired=new Promise((_,reject)=>{timer=setTimeout(()=>{stopped=true;client?.connection?.stream?.destroy();reject(Error('CLIENT_ACCEPTANCE_BLOCKED'));},budget);});
    const work=(async()=>{
      secret=credentials.provide();
      if(!exact(secret,'password,ca')||typeof secret.password!=='string'||!secret.password||secret.password.length>1024||secret.password.includes('\0')||!Buffer.isBuffer(secret.ca)||sha(secret.ca)!==caHash)fail();
      // Every connection-affecting pg field is explicit. No connectionString,
      // service, pgpass, native driver, proxy, env spread, certificate-file lookup or pool.
      check();client=defaultClient({host,port:5432,user:`postgres.${project}`,database:'postgres',password:secret.password,
        ssl:{ca:Buffer.from(secret.ca),rejectUnauthorized:true,servername:host,checkServerIdentity},
        application_name:'contratpro-p3-idempotency-acceptance',fallback_application_name:'contratpro-p3-idempotency-acceptance',
        client_encoding:'UTF8',connectionTimeoutMillis:5000,query_timeout:10000,keepAlive:false,
        options:'-c search_path=pg_catalog,pg_temp -c client_encoding=UTF8 -c statement_timeout=5000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=10000 -c default_transaction_read_only=off'});
      client.on('error',()=>{});check();await client.connect();check();
      const stream=client.connection?.stream;
      const tls={encrypted:stream?.encrypted===true,authorized:stream?.authorized===true,
        hostnameVerified:typeof stream?.getPeerCertificate==='function'&&checkServerIdentity(host,stream.getPeerCertificate())===undefined};
      const result=await client.query("BEGIN READ ONLY; SELECT current_database() AS database,session_user,current_user,current_setting('server_version_num') AS version_num,(SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database()) AS database_oid,inet_server_addr()::text AS server_address,inet_server_port() AS server_port; ROLLBACK;");
      const rows=(Array.isArray(result)?result:[result]).flatMap(r=>r.rows??[]);
      if(rows.length!==1||!validateClientObservation(rows[0],config.evidence,tls))fail();
      check();
      const values={subject_a:config.subjects.subjectA,subject_b:config.subjects.subjectB,agency_a:config.subjects.agencyA,agency_b:config.subjects.agencyB,
        database_oid:config.evidence.databaseOid,server_address:config.evidence.serverAddress,server_port:String(config.evidence.serverPort)};
      // Only fixed validated UUID/integer/IP literals; no arbitrary SQL or unbound variables.
      const prepared=sql.replace(/^\\set ON_ERROR_STOP on\r?\n/m,'').replace(/:'([a-z_]+)'/g,(_,key)=>{if(!Object.hasOwn(values,key))fail();return `'${values[key].replaceAll("'","''")}'`;});
      if(/:'[a-z_]+'|^\\/m.test(prepared))fail();
      let notice=false;client.on('notice',n=>{if(n.message==='CLIENT_IDEMPOTENCY_SINGLE_SESSION_CHECKS_PASSED_ROLLBACK_REQUIRED')notice=true;});
      check();attempted=true;const results=await client.query(prepared);check();
      if(!notice||(Array.isArray(results)?results.at(-1):results)?.command!=='ROLLBACK')fail();
      return {status:'SQL_CHECKS_COMPLETED_INDEPENDENT_REVIEW_REQUIRED',rollbackAcknowledged:true,liveAcceptanceComplete:false,gatewayJwtVerified:false,multiSessionConcurrencyVerified:false};
    })();
    answer=await Promise.race([work,expired]);
  }catch{answer={status:attempted?'UNKNOWN':'BLOCKED',rollbackAcknowledged:false,liveAcceptanceComplete:false};}
  finally{
    stopped=true;clearTimeout(timer);try{client?.connection?.stream?.destroy();client?.end()?.catch(()=>{});}catch{ /* fixed outputs only */ }
    try{credentials?.dispose();}catch{disposalFailed=true;}
    secret=null;client=null;
  }
  return Object.freeze(disposalFailed?{status:'UNKNOWN',rollbackAcknowledged:false,liveAcceptanceComplete:false}:answer);
}
