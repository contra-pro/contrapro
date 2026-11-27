import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import {createHeartbeat} from './worker-health.mjs';
import {deploymentEnvironment} from './deployment-environment.mjs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
export function workerConfig(env){
 if(env.CONTRATPRO_A5_VERIFIED!=='true')throw Error('worker_disabled');
 deploymentEnvironment(env);
 const origin=new URL(env.CONTRATPRO_WORKER_ORIGIN??''),concurrency=Number(env.CONTRATPRO_WORKER_CONCURRENCY??1),pollMs=Number(env.CONTRATPRO_WORKER_POLL_MS??5000),secret=env.CONTRATPRO_MAINTENANCE_ACCESS_SECRET??'';
 if(origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||origin.protocol!=='https:'&&!(env.NODE_ENV!=='production'&&['localhost','127.0.0.1'].includes(origin.hostname)&&origin.protocol==='http:')||!Number.isInteger(concurrency)||concurrency<1||concurrency>8||!Number.isInteger(pollMs)||pollMs<1000||pollMs>60000||!/^[a-f0-9]{64}$/.test(secret))throw Error('worker_configuration_invalid');
 return {url:new URL('/api/internal/maintenance/run',origin),concurrency,pollMs,secret};
}
export async function runWorker(config,{signal,transport=fetch,wait=delay,log=value=>process.stdout.write(JSON.stringify(value)+'\n'),heartbeat=async()=>{}}={}){
 const failureStop=new AbortController(),stopSignal=signal?AbortSignal.any([signal,failureStop.signal]):failureStop.signal;
 const report=async state=>{try{await heartbeat(state);}catch{failureStop.abort();throw Error('worker_health_unavailable');}};
 await report({phase:'starting',ok:false});
 async function lane(){let failures=0;while(!stopSignal.aborted){
  let ok=false;
  try{const response=await transport(config.url,{method:'POST',headers:{authorization:`Bearer ${config.secret}`},signal:AbortSignal.timeout(120000),redirect:'error'});
   if(!response.ok)throw Error('unavailable');const value=await response.json();
   if(!value||typeof value!=='object'||Array.isArray(value)||value.ok!==true||value.outcome!==undefined&&!['ok','disabled'].includes(value.outcome))throw Error('unavailable');failures=0;ok=value.disabled!==true;
   // Allowlisted fields only: never echo server errors, credentials or bodies.
   log({event:'worker.tick',ok:value.ok===true,processed:value.processed===true,disabled:value.disabled===true,...(['ok','failed','disabled'].includes(value.outcome)?{outcome:value.outcome}:{})});
  }catch{failures=Math.min(failures+1,6);log({event:'worker.tick',ok:false});}
  await report({phase:stopSignal.aborted?'stopping':'running',ok});
  if(stopSignal.aborted)break;
  try{await wait(Math.min(60000,config.pollMs*2**failures),undefined,{signal:stopSignal});}catch{break;}
 }}
 const results=await Promise.allSettled(Array.from({length:config.concurrency},()=>lane().catch(error=>{failureStop.abort();throw error;})));
 if(results.some(r=>r.status==='rejected'))throw Error('worker_health_unavailable');
 await report({phase:'stopped',ok:false});log({event:'worker.stopped'});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const stop=new AbortController();process.once('SIGTERM',()=>stop.abort());process.once('SIGINT',()=>stop.abort());
 try{await runWorker(workerConfig(process.env),{signal:stop.signal,heartbeat:createHeartbeat(join(tmpdir(),'contratpro-worker-health.json'))});}catch{process.stderr.write('{"event":"worker.start_failed"}\n');process.exitCode=1;}
}
