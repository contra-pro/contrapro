import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { command, cleanup, recordFailure } from './diagnostics.mjs';
import { requireReadiness, stopOwnedCluster } from './lifecycle.mjs';

const deadlines={timeoutMs:100,drainMs:5,killGraceMs:10};
function child() {
  const c=new EventEmitter(); c.stdout=new PassThrough(); c.stderr=new PassThrough();
  c.kill=()=>true;
  return c;
}
for(const retained of ['stdout','stderr']) {
  test(`exit succeeds despite retained ${retained}, without waiting for close`,{timeout:1000},async()=>{
    const c=child(); let calls=0;
    const result=await command('fake-pgctl',['start'],{},()=>{
      calls++;
      queueMicrotask(()=>{
        c.stdout.write('server started'); c.stderr.write('warning');
        c[retained==='stdout'?'stderr':'stdout'].end();
        c.emit('exit',0,null); // no close event, one pipe held by fake descendant
      }); return c;
    },deadlines);
    assert.equal(result.exitCode,0); assert.equal(result.completionEvent,'exit');
    assert.equal(result.outputMayBeIncomplete,true);
    assert.equal(c.stdout.destroyed,true); assert.equal(c.stderr.destroyed,true);
    assert.equal(calls,1);
  });
}
test('nonzero exit retains actual code and bounded stderr without close',{timeout:1000},async()=>{
  const c=child();
  await assert.rejects(()=>command('fake',[],{},()=>{
    queueMicrotask(()=>{c.stderr.write('startup failed');c.emit('exit',7,null);});return c;
  },deadlines),e=>e.exitCode===7&&e.stderr==='startup failed'&&e.timedOut===false);
});
test('timeout is failure, kills only direct child once, and never retries',{timeout:1000},async()=>{
  const c=child();let spawns=0,kills=0;
  c.kill=signal=>{assert.equal(signal,'SIGTERM');kills++;return true;};
  await assert.rejects(()=>command('fake',[],{},()=>{spawns++;return c;}, {timeoutMs:5,drainMs:5,killGraceMs:5}),
    e=>e.code==='ETIMEDOUT'&&e.timedOut===true&&e.exitCode===null&&e.terminationRequested===true);
  assert.equal(spawns,1);assert.equal(kills,1);
});
test('timeout remains failure even if termination reports exit zero',{timeout:1000},async()=>{
  const c=child(); c.kill=()=>{c.emit('exit',0,null);return true;};
  await assert.rejects(()=>command('fake',[],{},()=>c,{timeoutMs:5,drainMs:5,killGraceMs:10}),
    e=>e.code==='ETIMEDOUT'&&e.exitCode===0);
});
test('normal exit with delayed pipe closure is never killed',{timeout:1000},async()=>{
  const c=child();let kills=0;c.kill=()=>{kills++;return true;};
  await command('fake',[],{},()=>{queueMicrotask(()=>c.emit('exit',0,null));return c;},deadlines);
  assert.equal(kills,0);
});
test('spawn error settles without waiting for close',{timeout:1000},async()=>{
  const c=child();
  await assert.rejects(()=>command('fake',[],{},()=>{
    queueMicrotask(()=>c.emit('error',Object.assign(new Error('missing binary'),{code:'ENOENT'})));return c;
  },deadlines),e=>e.code==='ENOENT'&&e.message==='missing binary');
});
test('command success does not imply readiness and probe is never retried',async()=>{
  let calls=0;
  await assert.rejects(()=>requireReadiness(async()=>{calls++;return null;}),e=>e.code==='READINESS_FAILED');
  assert.equal(calls,1);
  const original=Object.assign(new Error('refused'),{code:'ECONNREFUSED'});
  await assert.rejects(()=>requireReadiness(async()=>{throw original;}),e=>e===original);
  const identity={verified:true}; assert.equal(await requireReadiness(async()=>identity),identity);
});
test('already-stopped owned cluster is a successful no-op',async()=>{
  let stopped=0,verified=0;
  assert.equal(await stopOwnedCluster({verifyOwnership:async()=>{verified++;},pidExists:async()=>false,stop:async()=>{stopped++;}}),'already-stopped');
  assert.equal(verified,1);assert.equal(stopped,0);
});
test('shutdown requires ownership and confirms PID disappearance',async()=>{
  let exists=true,stopped=0;
  assert.equal(await stopOwnedCluster({verifyOwnership:async()=>{},pidExists:async()=>exists,stop:async()=>{stopped++;exists=false;}}),'stopped');
  assert.equal(stopped,1);
  await assert.rejects(()=>stopOwnedCluster({verifyOwnership:async()=>{throw new Error('marker mismatch');},pidExists:async()=>true,stop:async()=>{stopped++;}}),/marker mismatch/);
  assert.equal(stopped,1);
  await assert.rejects(()=>stopOwnedCluster({verifyOwnership:async()=>{},pidExists:async()=>true,stop:async()=>{}}),e=>e.code==='SHUTDOWN_NOT_CONFIRMED');
});
test('cleanup failure leaves startup failure as primary',async()=>{
  const report={status:'NOT_COMPLETED',cleanupFailures:[]};
  recordFailure(report,'setup','start-cluster',Object.assign(new Error('startup deadline'),{code:'ETIMEDOUT'}));
  await cleanup(report,'shutdown-cluster',()=>stopOwnedCluster({verifyOwnership:async()=>{},pidExists:async()=>true,stop:async()=>{throw new Error('stop failed');}}));
  assert.equal(report.failure.code,'ETIMEDOUT');assert.equal(report.cleanupFailures[0].message,'stop failed');
});
