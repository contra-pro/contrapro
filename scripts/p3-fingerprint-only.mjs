/** Dedicated acquisition port. Import is inert; no dependency on P3 acceptance. */
import {open} from 'node:fs/promises';
import {createHash,X509Certificate} from 'node:crypto';
import {spawn} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {isIP} from 'node:net';
import {isAbsolute,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
export const nodePath='C:/Program Files/nodejs/node.exe';
export const psqlPath='C:/Program Files/PostgreSQL/17/bin/psql.exe';
export const nodeSha256='3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5';
export const psqlSha256='c290c7f0a3335f290f8c18011a1e5afa03ee3cdd628697a5f3e767e5f1d3d10d';
export const caSha256='700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7';
export const fingerprintSqlSha256='f53c1dc15b3f699582804fda64191d112dab8dc7091314dab1e101065185efc5';
const sqlPath=fileURLToPath(new URL('./p3-fingerprint-only.sql',import.meta.url));
const project='gllsiklbvqpxzucvkehw',host='aws-0-eu-west-1.pooler.supabase.com';
const hash=b=>createHash('sha256').update(b).digest('hex');
const ref=x=>typeof x==='string'&&/^[A-Za-z0-9_./:#-]{1,256}$/.test(x)&&x!=='UNBOUND';
const localPath=x=>typeof x==='string'&&x.length<=4096&&!/[\0\r\n]/.test(x)&&!/^[/\\]{2}/.test(x)&&isAbsolute(x);
const fail=()=>{throw Error('FINGERPRINT_BLOCKED');};
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.split(',').sort().join();
export function validateFingerprintConfig(c,utc){
  if(!exact(c,'projectRef,scope,authorizationReference,targetEvidenceReference,tlsEvidenceReference,windowStart,windowEnd,caPath,caSha256')
    ||c.projectRef!==project||c.scope!=='P3_READ_ONLY_FINGERPRINT_ACQUISITION'
    ||![c.authorizationReference,c.targetEvidenceReference,c.tlsEvidenceReference].every(ref)
    ||!Number.isSafeInteger(utc)||!Number.isSafeInteger(c.windowStart)||!Number.isSafeInteger(c.windowEnd)
    ||c.windowStart>utc||c.windowEnd<=utc||c.windowEnd-c.windowStart>7200000
    ||!localPath(c.caPath)||c.caSha256!==caSha256)fail();
}
export function validateFingerprintRow(r){
  if(!exact(r,'database,sessionUser,currentUser,versionNum,databaseOid,serverAddress,serverPort,readOnly,isolation')
    ||r.database!=='postgres'||r.sessionUser!=='postgres'||r.currentUser!=='postgres'
    ||typeof r.versionNum!=='string'||!/^17[0-9]{4}$/.test(r.versionNum)
    ||typeof r.databaseOid!=='string'||! /^[1-9][0-9]{0,9}$/.test(r.databaseOid)||Number(r.databaseOid)>4294967295
    ||typeof r.serverAddress!=='string'||!isIP(r.serverAddress)||!Number.isInteger(r.serverPort)||r.serverPort<1||r.serverPort>65535
    ||r.readOnly!=='on'||r.isolation!=='repeatable read')fail();
  return Object.freeze({...r});
}
async function readLimited(path,max){
  const fd=await open(path,'r');try{
    const st=await fd.stat();if(!st.isFile()||st.size>max)fail();const b=Buffer.alloc(st.size+1);let n=0;
    while(n<b.length){const {bytesRead}=await fd.read(b,n,b.length-n,null);if(!bytesRead)break;n+=bytesRead;}
    if(n!==st.size)fail();return b.subarray(0,n);
  }finally{await fd.close();}
}
function validCa(bytes,utc){const cert=new X509Certificate(bytes);return cert.ca&&Date.parse(cert.validFrom)<=utc&&utc<Date.parse(cert.validTo);}
/** Only synthetic ports are used by offline tests. Native CLI fixes both binary
 * paths/hashes, SQL path/hash and destination; no caller can select arbitrary SQL.
 * Evidence references require independent review, not just syntactic validation.
 */
export function runFingerprint(configuration,ports={}){
  const utc=ports.utc??Date.now,mono=ports.mono??(()=>performance.now()),read=ports.read??readLimited;
  const digest=ports.hash??hash,certificateOk=ports.validCa??validCa,launch=ports.spawn??spawn;
  const set=ports.setTimer??setTimeout,clear=ports.clearTimer??clearTimeout;
  return new Promise(resolveResult=>{
    let child,timer,config,done=false,requested=false,confirmed=false,chunks=[],bytes=0,diagnostics=0;
    const started=mono();let budget=20000;
    const abort=()=>finish('DEADLINE_EXCEEDED');
    const terminate=()=>{if(child){try{requested=child.kill('SIGKILL')===true;}catch{requested=false;}
      try{child.stdout?.destroy();child.stderr?.destroy();}catch{ /* no raw diagnostics */ }}};
    const finish=(status,row)=>{if(done)return;done=true;clear(timer);ports.signal?.removeEventListener('abort',abort);
      if(status!=='FINGERPRINT_CAPTURED_REVIEW_REQUIRED')terminate();chunks=[];
      resolveResult(Object.freeze({status,fingerprint:row??null,terminationRequested:requested,terminationConfirmed:confirmed,
        observedAtUtc:row?new Date(utc()).toISOString():null,projectIdentityProven:false,clientTlsAttestedBySql:false,
        rollbackIndependentlyProven:false,serverCancellationProven:false}));};
    const check=()=>{if(done||mono()-started>=budget||(config&&utc()>=config.windowEnd)){finish('DEADLINE_EXCEEDED');fail();}};
    timer=set(()=>finish('DEADLINE_EXCEEDED'),20000);ports.signal?.addEventListener('abort',abort,{once:true});
    if(ports.signal?.aborted)abort();
    (async()=>{
      config=await configuration;if(done)fail();validateFingerprintConfig(config,utc());check();
      budget=Math.min(20000,mono()-started+config.windowEnd-utc());clear(timer);
      timer=set(()=>finish('DEADLINE_EXCEEDED'),Math.max(0,budget-(mono()-started)));
      const activeNode=ports.execPath??process.execPath;if(resolve(activeNode)!==resolve(nodePath))fail();
      if(digest(await read(nodePath,134217728))!==nodeSha256)fail();check();
      if(digest(await read(psqlPath,33554432))!==psqlSha256)fail();check();
      if(digest(await read(sqlPath,16384))!==fingerprintSqlSha256)fail();check();
      const cert=await read(config.caPath,16384);check();if(digest(cert)!==caSha256||!certificateOk(cert,utc()))fail();
      const env=ports.env??process.env;
      if(['NODE_OPTIONS','NODE_DEBUG','NODE_TLS_REJECT_UNAUTHORIZED','SSLKEYLOGFILE'].some(k=>Object.hasOwn(env,k)))fail();
      if(!ports.env&&process.execArgv.some(x=>/^--(?:inspect|require|import)/.test(x)))fail();
      const password=env.PGPASSWORD;if(typeof password!=='string'||!password||password.length>1024||/[\0\r\n]/.test(password))fail();
      const childEnv={PGHOST:host,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:`postgres.${project}`,PGPASSWORD:password,
        PGSSLMODE:'verify-full',PGSSLROOTCERT:config.caPath,PGCONNECT_TIMEOUT:'5',PGCLIENTENCODING:'UTF8',PGAPPNAME:'contratpro-p3-fingerprint-only',
        PGOPTIONS:'-c default_transaction_read_only=on -c search_path=pg_catalog,pg_temp -c statement_timeout=5000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=10000'};
      if(typeof env.SystemRoot==='string')childEnv.SystemRoot=env.SystemRoot;
      check();child=launch(psqlPath,['-X','-w','-q','-A','-t','-v','ON_ERROR_STOP=1','-P','pager=off','-f',sqlPath],
        {shell:false,windowsHide:true,env:childEnv,stdio:['ignore','pipe','pipe']});
      child.once('error',()=>finish('PROCESS_FAILED'));
      child.stdout.on('data',b=>{if(done)return;bytes+=b.length;if(bytes>8192){finish('OUTPUT_LIMIT_EXCEEDED');return;}chunks.push(Buffer.from(b));});
      child.stderr.on('data',b=>{if(done)return;diagnostics+=b.length;if(diagnostics>8192)finish('DIAGNOSTIC_LIMIT_EXCEEDED');});
      child.once('close',(code,signal)=>{confirmed=true;if(done)return;
        if(mono()-started>=budget||utc()>=config.windowEnd){finish('DEADLINE_EXCEEDED');return;}
        if(code!==0||signal||diagnostics){finish('PROCESS_FAILED');return;}
        try{const row=validateFingerprintRow(JSON.parse(Buffer.concat(chunks).toString('utf8')));check();finish('FINGERPRINT_CAPTURED_REVIEW_REQUIRED',row);}
        catch{finish('INVALID_FINGERPRINT');}
      });
    })().catch(()=>finish('FINGERPRINT_BLOCKED'));
  });
}
// No native process can start on import or without this exact operator switch.
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const controller=new AbortController();let result;
  const hardStop=setTimeout(()=>{controller.abort();process.exit(1);},20000);
  try{
    if(process.argv.length!==4||process.argv[2]!=='--run-reviewed-fingerprint'||!localPath(process.argv[3]))fail();
    const c=readLimited(process.argv[3],16384).then(b=>JSON.parse(b.toString('utf8')));
    result=await runFingerprint(c,{signal:controller.signal});
  }catch{result={status:'FINGERPRINT_BLOCKED',fingerprint:null};}
  process.stdout.write(JSON.stringify(result)+'\n',()=>clearTimeout(hardStop));
  if(result.status!=='FINGERPRINT_CAPTURED_REVIEW_REQUIRED')process.exitCode=1;
}
