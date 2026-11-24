import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { command, LIMIT, sanitize, stage, cleanup } from './diagnostics.mjs';

function fake({stdout=[],stderr=[],code=1,signal=null,error}={}) {
  return ()=>{
    const child=new EventEmitter(); child.stdout=new PassThrough(); child.stderr=new PassThrough();
    queueMicrotask(()=>{
      for(const data of stdout) child.stdout.write(data);
      for(const data of stderr) child.stderr.write(data);
      if(error) child.emit('error',error);
      child.stdout.end(); child.stderr.end(); child.emit('close',code,signal);
    });
    return child;
  };
}
const report=()=>({status:'NOT_COMPLETED',cleanupFailures:[],cases:[]});
test('simulated initdb preserves setup stage, original reason and bounded stderr',async()=>{
  const r=report();
  await assert.rejects(()=>stage(r,'setup','initdb',()=>command('fake-initdb',[],{},fake({stderr:['initdb: could not create directory: Access is denied'],code:1}))),e=>e.exitCode===1);
  assert.equal(r.failure.stage,'initdb'); assert.equal(r.failure.phase,'setup');
  assert.match(r.failure.stderr,/Access is denied/); assert.equal(r.failure.exitCode,1);
});
test('simulated port selection failure preserves original error before initialization',async()=>{
  const r=report(),error=Object.assign(new Error('listen EACCES on loopback'),{code:'EACCES'});
  const initialized=false;
  await assert.rejects(()=>stage(r,'setup','select-port',async()=>{throw error;}),e=>e===error);
  assert.equal(initialized,false); assert.equal(r.failure.message,error.message); assert.equal(r.failure.code,'EACCES');
});
test('nonzero child exit retains stdout, stderr and signal',async()=>{
  await assert.rejects(()=>command('fake',[],{},fake({stdout:['out'],stderr:['err'],code:null,signal:'SIGTERM'})),e=>
    e.exitCode===null&&e.signal==='SIGTERM'&&e.stdout==='out'&&e.stderr==='err');
});
test('spawn error and missing binary retain ENOENT and original message',async()=>{
  const error=Object.assign(new Error('spawn initdb ENOENT'),{code:'ENOENT'});
  await assert.rejects(()=>command('fake',[],{},fake({error,code:-4058})),e=>e.code==='ENOENT'&&e.message===error.message&&e.cause===error);
});
test('synchronous spawn failure is preserved too',async()=>{
  await assert.rejects(()=>command('fake',[],{},()=>{throw Object.assign(new Error('permission denied'),{code:'EACCES'});}),e=>e.code==='EACCES'&&e.message==='permission denied');
});
test('successful child output is also sanitized and buffers remain bounded',async()=>{
  const result=await command('fake',[],{},fake({code:0,stdout:['x'.repeat(LIMIT*3)],stderr:['y'.repeat(LIMIT*3)]}));
  assert.equal(result.stdout.length,LIMIT); assert.equal(result.stderr.length,LIMIT);
  assert.equal(result.stdoutTruncated,true); assert.equal(result.stderrTruncated,true);
});
test('redacts credentials, URLs, JWTs, cookies, keys and email across chunks',async()=>{
  const result=await command('fake',[],{},fake({code:0,stdout:['password=synt','hetic-secret token=private-value Bearer bearer-value\n',
    'postgres://user:pass@remote/db eyJabc.abc.def\nCOOKIE=session-value\nAWS_SECRET_ACCESS_KEY=key-value\nfixture@example.invalid'],stderr:[]}));
  for(const secret of ['synthetic-secret','private-value','bearer-value','user:pass','eyJabc','session-value','key-value','fixture@example.invalid']) assert.ok(!result.stdout.includes(secret));
  assert.equal(sanitize('PGPASSWORD=private-value'),'PGPASSWORD=[REDACTED]');
  assert.equal(sanitize('password="multi word truncated secret'),'password=[REDACTED]');
});
test('cleanup failure does not mask original setup failure',async()=>{
  const r=report();
  await assert.rejects(()=>stage(r,'setup','initdb',async()=>{throw new Error('original setup failure');}));
  await cleanup(r,'shutdown-cluster',async()=>{throw new Error('cleanup failed');});
  assert.equal(r.failure.message,'original setup failure');
  assert.equal(r.cleanupFailures[0].message,'cleanup failed');
  assert.equal(r.cleanupFailures[0].phase,'teardown');
});
test('execution and teardown-only failures remain distinct',async()=>{
  const r=report();
  await assert.rejects(()=>stage(r,'execution','baseline',async()=>{throw Object.assign(new Error('invalid baseline'),{code:'42501'});}));
  assert.equal(r.failure.phase,'execution'); assert.equal(r.failure.code,'42501');
  const only=report(); await cleanup(only,'write-results',async()=>{throw new Error('cannot write');});
  assert.equal(only.failure.phase,'teardown'); assert.equal(only.status,'FAIL');
});
