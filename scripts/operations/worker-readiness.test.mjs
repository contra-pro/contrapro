import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve,relative} from 'node:path';
import {createHeartbeat,workerHealth,heartbeatMaxAgeMs} from '../worker-health.mjs';
import {deploymentEnvironment} from '../deployment-environment.mjs';
import {workerConfig,runWorker} from '../maintenance-worker.mjs';
const env={CONTRATPRO_A5_VERIFIED:'true',CONTRATPRO_WORKER_ORIGIN:'https://worker.example.invalid',CONTRATPRO_MAINTENANCE_ACCESS_SECRET:'a'.repeat(64)};
test('production deployment refuses test markers, missing stage and development stage',()=>{
 assert.throws(()=>deploymentEnvironment({NODE_ENV:'production'}));assert.throws(()=>deploymentEnvironment({NODE_ENV:'production',CONTRATPRO_DEPLOYMENT_STAGE:'development'}));
 for(const extra of [{VITEST:'true'},{A6_ISOLATED_REVIEW:'1'},{A6_AUTH_POLISH_VERIFY:'1'}])assert.throws(()=>deploymentEnvironment({NODE_ENV:'production',CONTRATPRO_DEPLOYMENT_STAGE:'production',...extra}));
 for(const stage of ['staging','production'])assert.equal(deploymentEnvironment({NODE_ENV:'production',CONTRATPRO_DEPLOYMENT_STAGE:stage}),stage);
 assert.throws(()=>deploymentEnvironment({NODE_ENV:'development',CONTRATPRO_DEPLOYMENT_STAGE:'isolated-acceptance'}));
 assert.throws(()=>workerConfig({...env,NODE_ENV:'production'}));
});
test('HTTP success with failed, malformed or unrecognized job outcome backs off',async()=>{
 for(const value of [null,[],{ok:false},{ok:true,outcome:'failed'},{ok:true,outcome:'unknown'}]){
  const stop=new AbortController(),waits=[],logs=[];await runWorker(workerConfig(env),{signal:stop.signal,transport:async(_url,init)=>{assert.equal(init.body,undefined);assert.equal(init.redirect,'error');return {ok:true,json:async()=>value};},wait:async ms=>{waits.push(ms);stop.abort();},log:v=>logs.push(v)});
  assert.deepEqual(waits,[10000]);assert.equal(logs[0].ok,false);
 }
});
test('exponential polling backoff is capped without replaying task payloads',async()=>{
 const stop=new AbortController(),waits=[];await runWorker(workerConfig(env),{signal:stop.signal,transport:async()=>{throw Error('synthetic failure');},wait:async ms=>{waits.push(ms);if(waits.length===5)stop.abort();},log:()=>{}});assert.deepEqual(waits,[10000,20000,40000,60000,60000]);
});
test('heartbeat failure halts all lanes and drains in-flight requests before rejection',async()=>{
 let active=0,calls=0;const releases=[];await assert.rejects(runWorker({...workerConfig(env),concurrency:2},{transport:async()=>{active++;calls++;await new Promise(r=>{releases.push(r);if(calls===2)queueMicrotask(()=>releases.forEach(fn=>fn()));});active--;return {ok:true,json:async()=>({ok:true})};},heartbeat:async state=>{if(state.phase!=='starting')throw Error('private filesystem detail');},log:()=>{}}),/worker_health_unavailable/);assert.equal(active,0);assert.equal(calls,2);
});
test('a logging failure also stops peer lanes instead of leaving polling alive',{timeout:2000},async()=>{
 let calls=0;await assert.rejects(runWorker({...workerConfig(env),concurrency:2},{transport:async()=>{calls++;return {ok:true,json:async()=>({ok:true})};},log:()=>{throw Error('synthetic logger failure');}}),/worker_health_unavailable/);assert.ok(calls<=2);
});
test('atomic heartbeat distinguishes live and ready, rejects stale/dead/future/stopped snapshots',async()=>{
 const root=await mkdtemp(join(tmpdir(),'contratpro-c2-health-')),file=join(root,'health.json'),now=1000000;
 try{
  const beat=createHeartbeat(file,()=>now);await beat({phase:'starting'});assert.equal(await workerHealth(file,{now:()=>now,alive:()=>true}),false);
  await beat({phase:'running',ok:false});assert.equal(await workerHealth(file,{now:()=>now,alive:()=>true,ready:false}),true);assert.equal(await workerHealth(file,{now:()=>now,alive:()=>true}),false);
  await Promise.all([beat({phase:'running',ok:false}),beat({phase:'running',ok:true})]);assert.equal(await workerHealth(file,{now:()=>now,alive:()=>true}),true);assert.equal(await workerHealth(file,{now:()=>now,alive:()=>false}),false);assert.equal(await workerHealth(file,{now:()=>now+heartbeatMaxAgeMs+1,alive:()=>true}),false);assert.equal(await workerHealth(file,{now:()=>now-1,alive:()=>true}),false);
  await beat({phase:'stopped'});assert.equal(await workerHealth(file,{now:()=>now,alive:()=>true,ready:false}),false);await writeFile(file,'{invalid');assert.equal(await workerHealth(file),false);
 }finally{assert.ok(relative(resolve(tmpdir()),resolve(root)).startsWith('contratpro-c2-health-'));await rm(root,{recursive:true,force:true});}
});
