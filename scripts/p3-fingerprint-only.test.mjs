/** All process/credential/clock ports are synthetic. Native psql never starts. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {runFingerprint,validateFingerprintConfig,validateFingerprintRow,nodePath,psqlPath,nodeSha256,psqlSha256,caSha256,fingerprintSqlSha256} from './p3-fingerprint-only.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const sql=await readFile(new URL('./p3-fingerprint-only.sql',import.meta.url));
const t=1795000000000;
const row=()=>({database:'postgres',sessionUser:'postgres',currentUser:'postgres',versionNum:'170011',databaseOid:'7',serverAddress:'192.0.2.1',serverPort:5432,readOnly:'on',isolation:'repeatable read'});
function rig(){
  const node=Buffer.from('SYNTHETIC_NODE'),psql=Buffer.from('SYNTHETIC_PSQL'),ca=Buffer.from('SYNTHETIC_CA');
  const c={projectRef:'gllsiklbvqpxzucvkehw',scope:'P3_READ_ONLY_FINGERPRINT_ACQUISITION',authorizationReference:'synthetic-approval',targetEvidenceReference:'synthetic-control-plane',tlsEvidenceReference:'synthetic-tls',windowStart:t-1,windowEnd:t+60000,caPath:'C:/synthetic/ca.crt',caSha256};
  const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdout.destroy=()=>{};child.stderr.destroy=()=>{};
  let elapsed=0,timer,kills=0,spawns=0,args;
  child.kill=()=>{kills++;return true;};
  const ports={utc:()=>t+elapsed,mono:()=>elapsed,env:{PGPASSWORD:'SYNTHETIC_ONLY',PGHOST:'ignored.invalid',PGSERVICE:'ignored'},execPath:nodePath,
    read:async path=>path===nodePath?node:path===psqlPath?psql:path.endsWith('.sql')?sql:ca,
    hash:b=>b===node?nodeSha256:b===psql?psqlSha256:b===ca?caSha256:hash(b),validCa:()=>true,
    spawn:(...a)=>{spawns++;args=a;return child;},setTimer:(fn,ms)=>{timer={fn,ms};return 1;},clearTimer:()=>{}};
  return {c,ports,child,args:()=>args,spawns:()=>spawns,kills:()=>kills,timer:()=>timer,elapsed:n=>{elapsed=n;}};
}
async function start(r){const result=runFingerprint(r.c,r.ports);for(let i=0;i<24;i++)await Promise.resolve();return {result};}
test('minimal pinned SQL parses offline and contains only read-only transaction/settings and one catalog SELECT',async()=>{
  assert.equal(hash(sql),fingerprintSqlSha256);
  const require=createRequire(new URL('../packages/infrastructure/database/package.json',import.meta.url));
  const source=sql.toString('utf8').replace(/^\\.*$/gm,'');const ast=await require('pgsql-parser').parse(source);
  await require('libpg-query').parsePlPgSQL(source);
  assert.ok(ast.stmts.every(x=>['TransactionStmt','VariableSetStmt','SelectStmt'].includes(Object.keys(x.stmt)[0])));
  assert.equal(ast.stmts.filter(x=>x.stmt.SelectStmt).length,1);
  assert.match(source,/BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY/);assert.match(source,/ROLLBACK;\s*$/);
  assert.doesNotMatch(source,/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|GRANT|REVOKE|DO|CALL|NOTIFY)\b|SET ROLE|tenancy\.|identity\.|auth\./i);
});
test('only exact approved binaries, fixed SQL and explicit same-route verify-full settings can be launched',async()=>{
  const r=rig(),{result}=await start(r);assert.equal(r.spawns(),1);
  const [exe,args,opts]=r.args();assert.equal(exe,psqlPath);assert.equal(opts.shell,false);assert.equal(opts.windowsHide,true);
  assert.equal(args.at(-2),'-f');assert.match(args.at(-1),/p3-fingerprint-only.sql$/);assert.ok(!args.some(x=>x.includes('SYNTHETIC_ONLY')));
  assert.equal(opts.env.PGHOST,'aws-0-eu-west-1.pooler.supabase.com');assert.equal(opts.env.PGUSER,'postgres.gllsiklbvqpxzucvkehw');
  assert.equal(opts.env.PGSSLMODE,'verify-full');assert.equal(opts.env.PGSERVICE,undefined);assert.match(opts.env.PGOPTIONS,/default_transaction_read_only=on/);
  r.child.stdout.emit('data',Buffer.from(JSON.stringify(row())));r.child.emit('close',0,null);
  const answer=await result;assert.equal(answer.status,'FINGERPRINT_CAPTURED_REVIEW_REQUIRED');assert.deepEqual(answer.fingerprint,row());
  assert.equal(answer.projectIdentityProven,false);assert.equal(answer.rollbackIndependentlyProven,false);assert.equal(answer.clientTlsAttestedBySql,false);
  assert.ok(Object.isFrozen(answer.fingerprint));
});
test('cannot accept an expected/historical fingerprint or alternate command through acquisition config',async()=>{
  for(const extra of [{databaseOid:'5'},{sqlPath:'arbitrary.sql'},{psqlPath:'other.exe'},{expectedFingerprint:row()}]){
    const r=rig();Object.assign(r.c,extra);assert.throws(()=>validateFingerprintConfig(r.c,t));
    assert.equal((await runFingerprint(r.c,r.ports)).status,'FINGERPRINT_BLOCKED');assert.equal(r.spawns(),0);
  }
});
test('wrong scope/project, missing references, stale windows and insecure CA configuration stop before connection',async()=>{
  for(const change of [c=>c.projectRef='other',c=>c.scope='P3_READ_ONLY_CATALOG_PREFLIGHT',c=>c.targetEvidenceReference='UNBOUND',c=>c.tlsEvidenceReference='UNBOUND',c=>c.windowEnd=t,c=>c.windowStart='UNBOUND',c=>c.caSha256='a'.repeat(64)]){
    const r=rig();change(r.c);assert.equal((await runFingerprint(r.c,r.ports)).status,'FINGERPRINT_BLOCKED');assert.equal(r.spawns(),0);
  }
});
test('active Node path, every binary/SQL/CA digest and certificate validity are enforced',async()=>{
  for(const change of [r=>r.ports.execPath='C:/other/node.exe',r=>r.ports.hash=()=> 'a'.repeat(64),r=>r.ports.validCa=()=>false]){
    const r=rig();change(r);assert.equal((await runFingerprint(r.c,r.ports)).status,'FINGERPRINT_BLOCKED');assert.equal(r.spawns(),0);
  }
});
test('no credential discovery or unsafe diagnostic/preload runtime is accepted',async()=>{
  for(const change of [r=>r.ports.env={},r=>r.ports.env.NODE_OPTIONS='SYNTHETIC',r=>r.ports.env.SSLKEYLOGFILE='SYNTHETIC']){
    const r=rig();change(r);assert.equal((await runFingerprint(r.c,r.ports)).status,'FINGERPRINT_BLOCKED');assert.equal(r.spawns(),0);
  }
});
test('strict row validation rejects missing fields, extra/multiple rows, wrong identity, unsafe transaction and malformed addresses',()=>{
  assert.deepEqual(validateFingerprintRow(row()),row());
  for(const changed of [{...row(),database:'other'},{...row(),sessionUser:'other'},{...row(),versionNum:'180001'},
    {...row(),databaseOid:'UNBOUND'},{...row(),databaseOid:'4294967296'},{...row(),serverAddress:null},{...row(),serverPort:0},
    {...row(),readOnly:'off'},{...row(),isolation:'serializable'},{...row(),secret:'SYNTHETIC'},[row(),row()],{}])assert.throws(()=>validateFingerprintRow(changed));
});
test('exit zero without exactly one valid JSON row never claims a fingerprint',async()=>{
  for(const output of ['',JSON.stringify(row())+'\n'+JSON.stringify(row()),JSON.stringify({...row(),readOnly:'off'}),'SYNTHETIC_ERROR']){
    const r=rig(),{result}=await start(r);r.child.stdout.emit('data',Buffer.from(output));r.child.emit('close',0,null);
    const answer=await result;assert.equal(answer.status,'INVALID_FINGERPRINT');assert.equal(answer.fingerprint,null);
  }
});
test('20-second timeout kills once, discards data, suppresses late success and never retries',async()=>{
  const r=rig(),{result}=await start(r);assert.equal(r.timer().ms,20000);r.elapsed(20000);r.timer().fn();
  const answer=await result;assert.equal(answer.status,'DEADLINE_EXCEEDED');assert.equal(answer.fingerprint,null);assert.equal(r.kills(),1);
  r.child.stdout.emit('data',Buffer.from(JSON.stringify(row())));r.child.emit('close',0,null);assert.equal(answer.status,'DEADLINE_EXCEEDED');assert.equal(r.spawns(),1);
});
test('outer abort, delayed timer and failed kill never become successful completion',async()=>{
  for(const mode of ['abort','late','failed-kill']){
    const r=rig(),controller=new AbortController();r.ports.signal=controller.signal;const {result}=await start(r);
    if(mode==='abort')controller.abort();else if(mode==='late'){r.elapsed(20001);r.child.emit('close',0,null);}
    else{r.child.kill=()=>false;r.elapsed(20000);r.timer().fn();}
    const answer=await result;assert.equal(answer.status,'DEADLINE_EXCEEDED');assert.equal(answer.fingerprint,null);
    if(mode==='failed-kill'){assert.equal(answer.terminationRequested,false);assert.equal(answer.terminationConfirmed,false);}
  }
});
test('late configuration or file I/O cannot launch psql after cancellation',async()=>{
  for(const mode of ['config','read']){
    const r=rig();let release;const pending=new Promise(resolve=>{release=resolve;});if(mode==='read')r.ports.read=()=>pending;
    const result=runFingerprint(mode==='config'?pending:r.c,r.ports);for(let i=0;i<6;i++)await Promise.resolve();
    r.elapsed(20000);r.timer().fn();assert.equal((await result).status,'DEADLINE_EXCEEDED');release(mode==='config'?r.c:Buffer.from('SYNTHETIC'));
    for(let i=0;i<12;i++)await Promise.resolve();assert.equal(r.spawns(),0);
  }
});
test('stdout/stderr caps, process errors and nonzero exits return constant sanitized failure without raw content',async()=>{
  for(const mode of ['out-cap','err-cap','diagnostic','error','exit']){
    const r=rig(),{result}=await start(r);
    if(mode==='out-cap')r.child.stdout.emit('data',Buffer.alloc(8193,65));
    else if(mode==='err-cap')r.child.stderr.emit('data',Buffer.alloc(8193,65));
    else if(mode==='error')r.child.emit('error',Error('SYNTHETIC_SENSITIVE'));
    else{if(mode==='diagnostic')r.child.stderr.emit('data',Buffer.from('SYNTHETIC_SENSITIVE'));r.child.emit('close',mode==='exit'?3:0,null);}
    const answer=await result;assert.notEqual(answer.status,'FINGERPRINT_CAPTURED_REVIEW_REQUIRED');assert.equal(answer.fingerprint,null);
    assert.ok(!JSON.stringify(answer).includes('SYNTHETIC_SENSITIVE'));assert.equal(r.spawns(),1);
  }
});
test('source separation: no acceptance/P3 supervisor import, mutation path, file persistence or automatic config binding',async()=>{
  const source=await readFile(new URL('./p3-fingerprint-only.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/^import[^\n]*(?:acceptance|p3-readonly-preflight)|db push|writeFile|execSync|shell:true|process\.env\.(?:PGHOST|PGUSER)/m);
  assert.match(source,/controller.abort\(\);process.exit\(1\)/);assert.match(source,/--run-reviewed-fingerprint/);
});
