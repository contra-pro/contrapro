/** One-purpose psql supervisor. Import is inert. Never imports acceptance code. */
import {open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {isAbsolute,dirname,join,basename} from 'node:path';
import {isIP} from 'node:net';
import {pathToFileURL} from 'node:url';
const project='gllsiklbvqpxzucvkehw',host='aws-0-eu-west-1.pooler.supabase.com';
const caPin='700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7';
const sqlName='preflight-client-idempotency-0009.sql';
const marker='CATALOG_CAPTURED_MANUAL_TARGET_AUTHORITY_PRIVILEGE_AND_CACHE_REVIEW_REQUIRED';
const sha=b=>createHash('sha256').update(b).digest('hex');
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const ref=x=>typeof x==='string'&&/^[A-Za-z0-9_./:#-]{1,256}$/.test(x)&&x!=='UNBOUND';
const path=x=>typeof x==='string'&&x.length<=4096&&!/[\0\r\n]/.test(x)&&!/^[/\\]{2}/.test(x)&&isAbsolute(x);
const blocked=()=>{throw Error('P3_PREFLIGHT_BLOCKED');};
export function validatePreflightConfig(c,now){
  const keys='projectRef,scope,authorizationReference,targetEvidenceReference,tlsEvidenceReference,windowStart,windowEnd,psqlPath,psqlSha256,psqlMajor,caPath,caSha256,manifestPath,manifestSha256,databaseOid,serverAddress,serverPort';
  if(!c||Object.keys(c).sort().join()!==keys.split(',').sort().join()||c.projectRef!==project||c.scope!=='P3_READ_ONLY_CATALOG_PREFLIGHT'
    ||![c.authorizationReference,c.targetEvidenceReference,c.tlsEvidenceReference].every(ref)
    ||!Number.isSafeInteger(now)||!Number.isSafeInteger(c.windowStart)||!Number.isSafeInteger(c.windowEnd)
    ||c.windowStart>now||c.windowEnd<=now||c.windowEnd-c.windowStart>7200000
    ||![c.psqlPath,c.caPath,c.manifestPath].every(path)||basename(c.psqlPath).toLowerCase()!=='psql.exe'||c.psqlMajor!==17
    ||![c.psqlSha256,c.caSha256,c.manifestSha256].every(hex)||c.caSha256!==caPin
    ||typeof c.databaseOid!=='string'||! /^[1-9][0-9]{0,9}$/.test(c.databaseOid)||Number(c.databaseOid)>4294967295
    ||typeof c.serverAddress!=='string'||!isIP(c.serverAddress)||!Number.isInteger(c.serverPort)||c.serverPort<1||c.serverPort>65535)blocked();
}
async function readLimited(file,max){
  const fd=await open(file,'r');
  try{const s=await fd.stat();if(!s.isFile()||s.size>max)blocked();
    const buffer=Buffer.alloc(s.size+1);let used=0;
    while(used<buffer.length){const {bytesRead}=await fd.read(buffer,used,buffer.length-used,null);if(!bytesRead)break;used+=bytesRead;}
    if(used!==s.size)blocked();return buffer.subarray(0,used);
  }finally{await fd.close();}
}
/** Tests inject ALL I/O, environment and clocks; native psql is never run offline.
 * Future execution reads ONLY the operator-approved process PGPASSWORD channel.
 * References are operator bindings, not cryptographic authorization attestations.
 */
export function runReadOnlyPreflight(configuration,ports={}){
  const utc=ports.utc??Date.now,mono=ports.mono??(()=>performance.now());
  const read=ports.read??readLimited,launch=ports.spawn??spawn,hash=ports.hash??sha;
  const set=ports.setTimer??setTimeout,clear=ports.clearTimer??clearTimeout;
  return new Promise(resolve=>{
    let config,child,timer,finished=false,terminationRequested=false,terminationConfirmed=false;
    let chunks=[],outBytes=0,errorBytes=0;
    const started=mono();let budget=20000;
    const terminate=()=>{if(child){try{terminationRequested=child.kill('SIGKILL')===true;}catch{terminationRequested=false;}
      try{child.stdout?.destroy();child.stderr?.destroy();}catch{ /* sanitized result */ }}};
    const abort=()=>finish('DEADLINE_EXCEEDED');
    const finish=(status,output)=>{if(finished)return;finished=true;clear(timer);ports.signal?.removeEventListener('abort',abort);
      if(status!=='CATALOG_CAPTURED_MANUAL_REVIEW_REQUIRED')terminate();
      chunks=[];resolve(Object.freeze({status,output:output??null,terminationRequested,terminationConfirmed,
        databaseRollbackProven:false,migrationAuthorized:false}));};
    const check=()=>{if(finished||mono()-started>=budget||(config&&utc()>=config.windowEnd)){finish('DEADLINE_EXCEEDED');blocked();}};
    timer=set(()=>finish('DEADLINE_EXCEEDED'),20000);
    ports.signal?.addEventListener('abort',abort,{once:true});
    if(ports.signal?.aborted)abort();
    (async()=>{
      config=await configuration;if(finished)blocked();validatePreflightConfig(config,utc());check();
      budget=Math.min(20000,mono()-started+config.windowEnd-utc());clear(timer);
      timer=set(()=>finish('DEADLINE_EXCEEDED'),Math.max(0,budget-(mono()-started)));check();
      const manifestBytes=await read(config.manifestPath,65536);check();if(hash(manifestBytes)!==config.manifestSha256)blocked();
      const manifest=JSON.parse(manifestBytes.toString('utf8'));
      if(manifest.projectRef!==project||manifest.environment!=='development'||manifest.liveExecutionAuthorized!==false)blocked();
      const item=manifest.ancillaryArtifacts?.find(x=>x.stagedFile===`scripts/${sqlName}`);
      if(!item||!hex(item.sha256))blocked();
      // Fixed sibling script, never a caller-selected SQL filename or command.
      const sqlFile=join(dirname(config.manifestPath),'scripts',sqlName);
      const sql=await read(sqlFile,131072);check();if(hash(sql)!==item.sha256)blocked();
      if(hash(await read(config.psqlPath,33554432))!==config.psqlSha256)blocked();check();
      if(hash(await read(config.caPath,16384))!==caPin)blocked();check();
      const env=ports.env??process.env;
      if(['NODE_OPTIONS','NODE_DEBUG','NODE_TLS_REJECT_UNAUTHORIZED','SSLKEYLOGFILE'].some(k=>Object.hasOwn(env,k)))blocked();
      if(!ports.env&&process.execArgv.some(x=>/^--(?:inspect|require|import)/.test(x)))blocked();
      const password=env.PGPASSWORD;
      if(typeof password!=='string'||!password||password.length>1024||/[\0\r\n]/.test(password))blocked();
      const childEnv={PGHOST:host,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:`postgres.${project}`,PGPASSWORD:password,
        PGSSLMODE:'verify-full',PGSSLROOTCERT:config.caPath,PGCONNECT_TIMEOUT:'5',PGCLIENTENCODING:'UTF8',
        PGAPPNAME:'contratpro-p3-readonly-preflight',
        PGOPTIONS:'-c default_transaction_read_only=on -c search_path=pg_catalog,pg_temp -c statement_timeout=5000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=10000'};
      // No inherited PG service/passfile/options, proxy, shell, tracing or PATH.
      if(typeof env.SystemRoot==='string')childEnv.SystemRoot=env.SystemRoot;
      const args=['-X','-w','-v','ON_ERROR_STOP=1','-v',`project_ref=${project}`,'-v',`database_oid=${config.databaseOid}`,
        '-v',`server_address=${config.serverAddress}`,'-v',`server_port=${config.serverPort}`,
        '-v',`target_evidence_ref=${config.targetEvidenceReference}`,'-v',`tls_evidence_ref=${config.tlsEvidenceReference}`,'-f',sqlFile];
      check();child=launch(config.psqlPath,args,{shell:false,windowsHide:true,env:childEnv,stdio:['ignore','pipe','pipe']});
      child.once('error',()=>finish('PROCESS_FAILED'));
      child.stdout.on('data',b=>{if(finished)return;outBytes+=b.length;if(outBytes>4194304){finish('OUTPUT_LIMIT_EXCEEDED');return;}chunks.push(Buffer.from(b));});
      child.stderr.on('data',b=>{if(finished)return;errorBytes+=b.length;if(errorBytes>16384)finish('DIAGNOSTIC_LIMIT_EXCEEDED');});
      child.once('close',(code,signal)=>{terminationConfirmed=true;if(finished)return;
        if(mono()-started>=budget||utc()>=config.windowEnd){finish('DEADLINE_EXCEEDED');return;}
        if(code!==0||signal||errorBytes){finish('PROCESS_FAILED');return;}
        const output=Buffer.concat(chunks).toString('utf8');
        if(!output.trimEnd().endsWith(marker)){finish('INCOMPLETE_EVIDENCE');return;}
        finish('CATALOG_CAPTURED_MANUAL_REVIEW_REQUIRED',output);
      });
    })().catch(()=>finish('PREFLIGHT_BLOCKED'));
  });
}
// Only the explicit operator command enables native execution. No default action.
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  let result;const controller=new AbortController();
  // Covers configuration I/O AND final stdout delivery. Abort synchronously
  // requests child termination before the supervisor exits. No retry/continuation.
  const hardStop=setTimeout(()=>{controller.abort();process.exit(1);},20000);
  try{
    if(process.argv.length!==4||process.argv[2]!=='--run-reviewed-preflight'||!path(process.argv[3]))blocked();
    const c=readLimited(process.argv[3],16384).then(b=>JSON.parse(b.toString('utf8')));
    result=await runReadOnlyPreflight(c,{signal:controller.signal});
  }catch{result={status:'PREFLIGHT_BLOCKED',output:null};}
  // Only bounded successful catalog output; all failure diagnostics are constant.
  if(result.output)process.stdout.write(result.output);
  process.stdout.write(JSON.stringify({...result,output:undefined})+'\n',()=>clearTimeout(hardStop));
  if(result.status!=='CATALOG_CAPTURED_MANUAL_REVIEW_REQUIRED')process.exitCode=1;
}
