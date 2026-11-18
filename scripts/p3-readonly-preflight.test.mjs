/** Synthetic ports only: no native process, credentials, network or database. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {runReadOnlyPreflight,validatePreflightConfig} from './p3-readonly-preflight.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const ca='700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7';
const marker='CATALOG_CAPTURED_MANUAL_TARGET_AUTHORITY_PRIVILEGE_AND_CACHE_REVIEW_REQUIRED';
const time=1795000000000;
function rig(){
  const exe=Buffer.from('synthetic executable'),cert=Buffer.from('synthetic CA'),sql=Buffer.from('synthetic non-executed SQL');
  const manifest=Buffer.from(JSON.stringify({projectRef:'gllsiklbvqpxzucvkehw',environment:'development',liveExecutionAuthorized:false,
    ancillaryArtifacts:[{stagedFile:'scripts/preflight-client-idempotency-0009.sql',sha256:hash(sql)}]}));
  const config={projectRef:'gllsiklbvqpxzucvkehw',scope:'P3_READ_ONLY_CATALOG_PREFLIGHT',authorizationReference:'synthetic-authorization',
    targetEvidenceReference:'synthetic-target',tlsEvidenceReference:'synthetic-tls',windowStart:time-1,windowEnd:time+60000,
    psqlPath:'C:/synthetic/psql.exe',psqlSha256:hash(exe),psqlMajor:17,caPath:'C:/synthetic/ca.crt',caSha256:ca,
    manifestPath:'C:/synthetic/manifest.json',manifestSha256:hash(manifest),databaseOid:'5',serverAddress:'192.0.2.1',serverPort:5432};
  const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();
  child.stdout.destroy=()=>{};child.stderr.destroy=()=>{};let kills=0;
  child.kill=()=>{kills++;return true;};
  let elapsed=0,tick,spawns=0,record;
  const ports={utc:()=>time+elapsed,mono:()=>elapsed,env:{PGPASSWORD:'SYNTHETIC_ONLY',PGHOST:'ignored.invalid',PGSERVICE:'ignored'},
    hash:b=>b.equals(cert)?ca:hash(b),
    read:async(file)=>file.endsWith('manifest.json')?manifest:file.endsWith('.sql')?sql:file.endsWith('psql.exe')?exe:cert,
    spawn:(...args)=>{spawns++;record=args;return child;},setTimer:(fn,ms)=>{tick={fn,ms};return 1;},clearTimer:()=>{}};
  return {config,ports,child,setElapsed:n=>{elapsed=n;},timeout:()=>tick.fn(),timer:()=>tick,
    spawns:()=>spawns,kills:()=>kills,record:()=>record};
}
async function started(r){const work=runReadOnlyPreflight(r.config,r.ports);for(let i=0;i<20;i++)await Promise.resolve();return {work};}
test('only fixed preflight file, explicit verified Development libpq settings, no shell or ambient target inheritance',async()=>{
  const r=rig(),{work}=await started(r);assert.equal(r.spawns(),1);
  const [exe,args,options]=r.record();assert.equal(exe,r.config.psqlPath);assert.equal(options.shell,false);assert.equal(options.windowsHide,true);
  assert.equal(args.at(-2),'-f');assert.match(args.at(-1),/scripts[/\\]preflight-client-idempotency-0009.sql$/);
  assert.equal(options.env.PGSSLMODE,'verify-full');assert.equal(options.env.PGHOST,'aws-0-eu-west-1.pooler.supabase.com');
  assert.equal(options.env.PGUSER,'postgres.gllsiklbvqpxzucvkehw');assert.equal(options.env.PGSERVICE,undefined);
  assert.match(options.env.PGOPTIONS,/default_transaction_read_only=on/);assert.ok(!args.some(x=>x.includes('SYNTHETIC_ONLY')));
  r.child.stdout.emit('data',Buffer.from(marker+'\n'));r.child.emit('close',0,null);
  const result=await work;assert.equal(result.status,'CATALOG_CAPTURED_MANUAL_REVIEW_REQUIRED');assert.equal(result.databaseRollbackProven,false);
});
test('real 20-second timer requests termination; late exit/output can never become success',async()=>{
  const r=rig(),{work}=await started(r);assert.equal(r.timer().ms,20000);r.setElapsed(20000);r.timeout();
  const result=await work;assert.equal(result.status,'DEADLINE_EXCEEDED');assert.equal(result.output,null);assert.equal(r.kills(),1);
  r.child.stdout.emit('data',Buffer.from(marker));r.child.emit('close',0,null);assert.equal(result.status,'DEADLINE_EXCEEDED');assert.equal(r.spawns(),1);
});
test('deadline covers pending configuration and prevents late SQL process launch',async()=>{
  const r=rig();let release;const config=new Promise(resolve=>{release=resolve;});const work=runReadOnlyPreflight(config,r.ports);
  r.setElapsed(20000);r.timeout();assert.equal((await work).status,'DEADLINE_EXCEEDED');release(r.config);
  for(let i=0;i<20;i++)await Promise.resolve();assert.equal(r.spawns(),0);
});
test('late validation I/O cannot launch after cancellation',async()=>{
  const r=rig();let release;r.ports.read=()=>new Promise(resolve=>{release=resolve;});
  const work=runReadOnlyPreflight(r.config,r.ports);for(let i=0;i<5;i++)await Promise.resolve();r.setElapsed(20000);r.timeout();
  assert.equal((await work).status,'DEADLINE_EXCEEDED');release(Buffer.from('{}'));for(let i=0;i<10;i++)await Promise.resolve();assert.equal(r.spawns(),0);
});
test('monotonic expiry rejects exit zero even if timer scheduling is delayed',async()=>{
  const r=rig(),{work}=await started(r);r.setElapsed(20001);r.child.stdout.emit('data',Buffer.from(marker));r.child.emit('close',0,null);
  assert.equal((await work).status,'DEADLINE_EXCEEDED');
});
test('unconfirmed termination stays failed and never retries',async()=>{
  const r=rig(),{work}=await started(r);r.child.kill=()=>false;r.setElapsed(20000);r.timeout();
  const result=await work;assert.equal(result.status,'DEADLINE_EXCEEDED');assert.equal(result.terminationRequested,false);assert.equal(result.terminationConfirmed,false);assert.equal(r.spawns(),1);
});
test('outer wall-clock abort terminates the only child before supervisor exit',async()=>{
  const r=rig(),controller=new AbortController();r.ports.signal=controller.signal;
  const {work}=await started(r);controller.abort();const result=await work;
  assert.equal(result.status,'DEADLINE_EXCEEDED');assert.equal(r.kills(),1);assert.equal(result.output,null);
});
test('bounded stdout and diagnostics fail closed without returning captured content',async()=>{
  for(const [stream,size,status] of [['stdout',4194305,'OUTPUT_LIMIT_EXCEEDED'],['stderr',16385,'DIAGNOSTIC_LIMIT_EXCEEDED']]){
    const r=rig(),{work}=await started(r);r.child[stream].emit('data',Buffer.alloc(size,65));
    const result=await work;assert.equal(result.status,status);assert.equal(result.output,null);assert.equal(r.kills(),1);
  }
});
test('errors, incomplete output and even small diagnostics never leak or pass',async()=>{
  for(const scenario of ['error','exit','missing-marker','diagnostic']){
    const r=rig(),{work}=await started(r);if(scenario==='error')r.child.emit('error',Error('SYNTHETIC_SENSITIVE_DIAGNOSTIC'));
    else{if(scenario==='diagnostic')r.child.stderr.emit('data',Buffer.from('SYNTHETIC_SENSITIVE_DIAGNOSTIC'));r.child.emit('close',scenario==='exit'?3:0,null);}
    const result=await work;assert.notEqual(result.status,'CATALOG_CAPTURED_MANUAL_REVIEW_REQUIRED');assert.equal(result.output,null);
    assert.ok(!JSON.stringify(result).includes('SYNTHETIC_SENSITIVE_DIAGNOSTIC'));assert.equal(r.spawns(),1);
  }
});
test('rejects missing proofs, wrong target/scope, paths and stale authorization before spawn',async()=>{
  for(const change of [c=>c.projectRef='production',c=>c.scope='MIGRATION',c=>c.targetEvidenceReference='UNBOUND',c=>c.tlsEvidenceReference='UNBOUND',
    c=>c.windowEnd=time,c=>c.psqlPath='C:/synthetic/supabase.exe',c=>c.caSha256='a'.repeat(64),c=>c.serverAddress='not-an-ip',c=>c.password='SYNTHETIC']){
    const r=rig();change(r.config);assert.throws(()=>validatePreflightConfig(r.config,time));assert.equal((await runReadOnlyPreflight(r.config,r.ports)).status,'PREFLIGHT_BLOCKED');assert.equal(r.spawns(),0);
  }
});
test('rejects tampered files, missing credential channel and unsafe runtime before connection',async()=>{
  for(const tweak of [r=>r.config.psqlSha256='a'.repeat(64),r=>r.config.manifestSha256='b'.repeat(64),r=>r.ports.env={},r=>r.ports.env.NODE_OPTIONS='SYNTHETIC']){
    const r=rig();tweak(r);assert.equal((await runReadOnlyPreflight(r.config,r.ports)).status,'PREFLIGHT_BLOCKED');assert.equal(r.spawns(),0);
  }
});
test('supervisor source cannot invoke acceptance/migration or discover credentials',async()=>{
  const source=await readFile(new URL('./p3-readonly-preflight.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/^import[^\n]*(?:acceptance|supabase)|db push|execSync|shell:true|writeFile|process\.env\.(?:PGHOST|PGUSER|PGSSLMODE)/m);
  assert.match(source,/PGPASSWORD/);assert.match(source,/--run-reviewed-preflight/);assert.match(source,/child\.kill\('SIGKILL'\)/);
});

// Executable bound specification plus production-source assertions, NOT SQL execution.
test('history specification rejects excess, missing, malformed, Unicode, huge and duplicate versions without rendering them',async()=>{
  const source=await readFile(new URL('./preflight-client-idempotency-0009.sql',import.meta.url),'utf8');
  const expected=['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800'];
  const valid=values=>{const v=values.slice(0,10);return v.length===9&&v.every(x=>typeof x==='string'&&Buffer.byteLength(x)===14&&/^[0-9]{14}$/.test(x))&&v.toSorted().join()===expected.join();};
  assert.equal(valid(expected),true);
  for(const values of [[...expected,'20261118000900'],[...expected,...expected],expected.slice(1),
    [...expected.slice(1),'x'.repeat(100000)],[...expected.slice(1),'２０２６１１１５００００００'],
    [...expected.slice(1),null],[...expected.slice(1),'2026111500000'],[...expected.slice(1),expected[1]]])assert.equal(valid(values),false);
  assert.match(source,/WITH candidates AS MATERIALIZED[\s\S]*?octet_length\(version::text\)=14[\s\S]*?LIMIT 10[\s\S]*?array_agg\(v ORDER BY v\)/);
  assert.ok(source.indexOf('blocked_history')<source.indexOf('AS version\nFROM supabase_migrations'));
  assert.doesNotMatch(source,/array_agg\(version/);
});
test('metadata specification rejects oversized bytes/counts and malformed configuration before any raw projection',async()=>{
  const source=await readFile(new URL('./preflight-client-idempotency-0009.sql',import.meta.url),'utf8');
  const config=values=>values===null||(Array.isArray(values)&&values.length<=8&&values.every(x=>typeof x==='string'&&Buffer.byteLength(x)<=256&&!/[\u0000-\u001f\u007f]/u.test(x)&&/^(search_path=(pg_catalog(, ?pg_temp)?|"")|row_security=(on|off))$/.test(x))&&new Set(values.map(x=>x.split('=')[0])).size===values.length);
  for(const x of [null,[],['search_path=pg_catalog,pg_temp','row_security=on']])assert.equal(config(x),true);
  for(const x of [['password=SYNTHETIC'],['row_security=on\n'],['search_path='+'x'.repeat(100000)],[null],Array(9).fill('row_security=on'),['row_security=on','row_security=off']])assert.equal(config(x),false);
  for(const [count,bytes] of [[32,8192],[16,8192],[64,8192],[14,32768],[2,16384]]){
    const within=values=>values.length<=count&&values.every(v=>typeof v==='string'&&Buffer.byteLength(v)<=bytes);
    assert.equal(within(['x'.repeat(bytes)]),true);assert.equal(within(['x'.repeat(bytes+1)]),false);
    assert.equal(within(['é'.repeat(bytes)]),false);assert.equal(within(Array(count+1).fill('x')),false);
  }
  const guard=source.indexOf('blocked_metadata_bounds');
  for(const projection of ['AS complete_definition','AS definition','AS safe_proconfig','AS qual'])assert.ok(guard<source.indexOf(projection));
  for(const cap of ['LIMIT 257','LIMIT 33','LIMIT 17','LIMIT 65','<=8192','<=32768','<=16384','>256','>8'])assert.ok(source.includes(cap));
  assert.ok(source.includes("count(DISTINCT split_part(setting,'=',1))"));
  assert.doesNotMatch(source,/p\.prosecdef,p\.proconfig,/);
});
