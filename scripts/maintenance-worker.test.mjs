import {test} from 'node:test';import assert from 'node:assert/strict';
import {workerConfig,runWorker} from './maintenance-worker.mjs';
const env={CONTRATPRO_A5_VERIFIED:'true',CONTRATPRO_WORKER_ORIGIN:'https://app.example.invalid',CONTRATPRO_MAINTENANCE_ACCESS_SECRET:'a'.repeat(64)};
test('startup fails closed and bounds concurrency/polling',()=>{
 assert.throws(()=>workerConfig({}));assert.throws(()=>workerConfig({...env,CONTRATPRO_WORKER_CONCURRENCY:'9'}));assert.throws(()=>workerConfig({...env,CONTRATPRO_WORKER_POLL_MS:'0'}));assert.throws(()=>workerConfig({...env,CONTRATPRO_WORKER_ORIGIN:'http://app.example.invalid',NODE_ENV:'production'}));assert.equal(workerConfig(env).concurrency,1);
});
test('shutdown drains bounded lanes and logs only allowlisted fields',async()=>{
 const stop=new AbortController(),logs=[];let calls=0;
 await runWorker({...workerConfig(env),concurrency:2},{signal:stop.signal,transport:async()=>{calls++;stop.abort();return {ok:true,json:async()=>({ok:true,processed:true,secret:env.CONTRATPRO_MAINTENANCE_ACCESS_SECRET})};},log:v=>logs.push(v)});
 assert.equal(calls,1);assert.equal(logs.at(-1).event,'worker.stopped');assert.ok(!JSON.stringify(logs).includes(env.CONTRATPRO_MAINTENANCE_ACCESS_SECRET));
});
test('transient failures back off without replaying the same task payload',async()=>{
 const stop=new AbortController(),waits=[];
 await runWorker(workerConfig(env),{signal:stop.signal,transport:async()=>{throw Error('secret provider payload');},wait:async ms=>{waits.push(ms);stop.abort();},log:()=>{}});assert.deepEqual(waits,[10000]);
});
test('concurrency never exceeds configured lanes and shutdown drains all in-flight requests',async()=>{
 const stop=new AbortController();let active=0,peak=0,calls=0;const releases=[];
 const work=runWorker({...workerConfig(env),concurrency:3},{signal:stop.signal,transport:async()=>{active++;peak=Math.max(peak,active);calls++;await new Promise(resolve=>{releases.push(resolve);if(calls===3){stop.abort();for(const release of releases)release();}});active--;return {ok:true,json:async()=>({ok:true})};},log:()=>{}});
 await work;assert.equal(peak,3);assert.equal(calls,3);assert.equal(active,0);
});
