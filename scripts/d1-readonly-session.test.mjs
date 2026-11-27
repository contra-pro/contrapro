import {test} from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';import {PassThrough} from 'node:stream';
import {csv,validateIdentity,boundedRead,runtimeConflict,reviewInitial,metadataIds,manifestHash,reviewMetadataFailure,recoveryIds,recoveryQuery,reviewRecovery,conditionalIds,conditionalPermissions,permissionQuery} from './d1-readonly-session.mjs';
import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
test('conditional probe admits only complete identity/SELECT/visibility evidence, never assumes administrative SELECT',()=>{
 const text='query_id,identity_matches,can_read,full_visibility\n'+conditionalIds.map(id=>`${id},t,t,t`).join('\n')+'\n';
 assert.equal(conditionalPermissions(text).size,6);
 assert.equal(conditionalPermissions(text.replace('Q12a-auth-count,t,t,t','Q12a-auth-count,t,f,t')).has('Q12a-auth-count'),false);
 assert.equal(conditionalPermissions(text.replace('Q12b-bucket-count,t,t,t','Q12b-bucket-count,t,t,f')).has('Q12b-bucket-count'),false);
 assert.throws(()=>conditionalPermissions(text.replace('Q9-history-versions,t,t,t','Q9-history-versions,f,t,t')));
 assert.throws(()=>conditionalPermissions(text.replace('Q8b-bucket-config,t,t,t\n','')));
 assert.throws(()=>conditionalPermissions(text.replace('Q10-foundation-journal','Q9-history-versions')));
 assert.throws(()=>conditionalPermissions(text.replace('Q12c-object-count,t,t,t','Q12c-object-count,t,,t')));
 assert.deepEqual(conditionalIds,['Q8b-bucket-config','Q9-history-versions','Q10-foundation-journal','Q12a-auth-count','Q12b-bucket-count','Q12c-object-count']);
});
test('supplemental probe bytes are separately pinned; original six retain their manifest bytes',async()=>{
 const bytes=await readFile(new URL('./d1-readonly-recovery/'+permissionQuery.file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),permissionQuery.sha256);
 const manifest=JSON.parse(await readFile(new URL('../.verification/d1/readonly-packet/manifest.json',import.meta.url)));
 for(const id of conditionalIds){const q=manifest.queries.find(x=>x.id===id),b=await readFile(new URL('../.verification/d1/readonly-packet/'+q.file,import.meta.url));assert.equal(createHash('sha256').update(b).digest('hex'),q.sha256);}
});
test('recovery receipt review preserves zero-row public catalogue evidence and rejects tampered exits/hashes',async()=>{
 const manifestBytes=await readFile(new URL('../.verification/d1/readonly-packet/manifest.json',import.meta.url)),m=JSON.parse(manifestBytes),evidence={},receipt={manifestHash,stage:'recovery',receipts:[]};
 for(const [i,id]of recoveryIds.entries()){const q=id===recoveryQuery.id?recoveryQuery:m.queries.find(x=>x.id===id),sql=await readFile(new URL(id===recoveryQuery.id?'./d1-readonly-recovery/'+q.file:'../.verification/d1/readonly-packet/'+q.file,import.meta.url)),stdout=Buffer.from('total_rows,kind\n');evidence[id]={sql,stdout,stderr:Buffer.alloc(0)};receipt.receipts.push({query:id,querySha256:q.sha256,outputSha256:createHash('sha256').update(stdout).digest('hex'),bytes:stdout.length,status:'CAPTURED',exitCode:0,signal:null,terminationConfirmed:true,pid:123+i,at:'2026-11-27T09:31:00Z'});}
 const authorization={projectRef:'gllsiklbvqpxzucvkehw',manifestHash,stage:'recovery',replacementSha256:recoveryQuery.sha256,noTargetChangesSinceMetadataConfirmed:true,currentProjectCaConfirmed:true,postgresReadOnlyAcknowledged:true,windowStart:'2026-11-27T09:30:00Z',windowEnd:'2026-11-27T09:40:00Z'},input={manifestBytes,receipt,authorization,evidence};
 assert.equal(reviewRecovery(input).verifiedQueries.length,3);
 for(const mutate of [r=>r.receipts[0].exitCode=3,r=>r.receipts[1].querySha256='bad',r=>r.receipts[2].terminationConfirmed=false]){const changed=structuredClone(receipt);mutate(changed);assert.throws(()=>reviewRecovery({...input,receipt:changed}));}
});
test('Q6 recovery changes only the explicit text cast and cannot replay successful queries',async()=>{
 const original=await readFile(new URL('../.verification/d1/readonly-packet/Q6-acls.sql',import.meta.url),'utf8');
 const amended=await readFile(new URL('./d1-readonly-recovery/Q6-acls-text-cast.sql',import.meta.url));
 const normalize=s=>s.replaceAll('\r\n','\n').trimEnd();
 assert.equal(normalize(amended.toString()),normalize(original.replace("||d.defaclobjtype,","||d.defaclobjtype::text,")));
 assert.equal(createHash('sha256').update(amended).digest('hex'),recoveryQuery.sha256);
 assert.deepEqual(recoveryIds,['Q6-acls-text-cast','Q7b-pg16-memberships','Q11-public-relations']);
});
test('recovery requires intact successful prefix and the exact Q6 failure; never treats partial captures as complete',async()=>{
 const manifestBytes=await readFile(new URL('../.verification/d1/readonly-packet/manifest.json',import.meta.url)),manifest=JSON.parse(manifestBytes),evidence={};
 const receipt={manifestHash,stage:'metadata',receipts:[]},sha=b=>createHash('sha256').update(b).digest('hex');
 for(const [i,id]of metadataIds.slice(0,6).entries()){
  const q=manifest.queries.find(q=>q.id===id),stdout=Buffer.from(i<5?'total_rows,kind\n1,synthetic\n':''),stderr=Buffer.from(i<5?'':'ERROR:  operator is not unique: text || "char"');
  evidence[id]={sql:await readFile(new URL('../.verification/d1/readonly-packet/'+q.file,import.meta.url)),stdout,stderr};
  receipt.receipts.push({query:id,querySha256:q.sha256,outputSha256:sha(stdout),bytes:stdout.length,status:i<5?'CAPTURED':'PROCESS_FAILED',terminationConfirmed:true,pid:123+i,at:'2026-11-27T09:11:30Z'});
 }
 const authorization={manifestHash,projectRef:'gllsiklbvqpxzucvkehw',stage:'metadata',currentProjectCaConfirmed:true,postgresReadOnlyAcknowledged:true,windowStart:'2026-11-27T09:10:00Z',windowEnd:'2026-11-27T09:20:00Z'},input={manifestBytes,receipt,authorization,evidence};
 assert.equal(reviewMetadataFailure(input).verifiedSuccessfulQueries.length,5);
 for(const mutate of [r=>r.receipts.pop(),r=>r.receipts[0].outputSha256='bad',r=>r.receipts[5].terminationConfirmed=false,r=>r.receipts[5].status='CAPTURED']){const changed=structuredClone(receipt);mutate(changed);assert.throws(()=>reviewMetadataFailure({...input,receipt:changed}));}
 assert.throws(()=>reviewMetadataFailure({...input,evidence:{...evidence,'Q6-acls':{...evidence['Q6-acls'],stderr:Buffer.from('different error')}}}));
 assert.throws(()=>reviewMetadataFailure({...input,authorization:{...authorization,stage:'initial'}}));
});
test('bounded native receipt records numeric failure exit without retry or raw diagnostic exposure',async()=>{
 let starts=0;const child=fake();const result=await boundedRead('fixed',[],{}, {launch:()=>{starts++;queueMicrotask(()=>{child.stderr.write('synthetic error');child.emit('close',3,null);});return child;}});
 assert.equal(result.status,'PROCESS_FAILED');assert.equal(result.exitCode,3);assert.equal(result.signal,null);assert.equal(result.terminationConfirmed,true);assert.equal(starts,1);
});
test('metadata stage has exactly eight catalogue queries and no initial or shape-dependent queries',()=>{
 assert.equal(metadataIds.length,8);assert.equal(new Set(metadataIds).size,8);assert(Object.isFrozen(metadataIds));
 assert.deepEqual(metadataIds,['Q1-discovery','Q2-columns','Q3-constraints-triggers-indexes','Q4-function-metadata','Q5-policies','Q6-acls','Q7b-pg16-memberships','Q11-public-relations']);
});
test('initial review verifies hashes, window, PID, exit, role coverage and identity without a process launch',async()=>{
 const manifestBytes=await readFile(new URL('../.verification/d1/readonly-packet/manifest.json',import.meta.url)),m=JSON.parse(manifestBytes),evidence={};
 const sha=b=>createHash('sha256').update(b).digest('hex');const receipt={manifestHash,receipts:[]};
 const outputs=['database_name,session_role,effective_role,transaction_read_only,isolation,server_version_num\npostgres,postgres,postgres,on,repeatable read,170011\n','total_rows,kind,name,detail\n1,role,postgres,"{""bypassRls"":true}"\n'];
 for(const [i,id]of ['Q0-fingerprint','Q7-roles'].entries()){const q=m.queries.find(q=>q.id===id);evidence[id]={sql:await readFile(new URL('../.verification/d1/readonly-packet/'+q.file,import.meta.url)),stdout:Buffer.from(outputs[i]),stderr:Buffer.alloc(0)};receipt.receipts.push({query:id,querySha256:q.sha256,outputSha256:sha(evidence[id].stdout),bytes:evidence[id].stdout.length,status:'CAPTURED',terminationConfirmed:true,pid:123+i,at:'2026-11-27T09:04:08Z'});}
 const authorization={manifestHash,projectRef:'gllsiklbvqpxzucvkehw',currentProjectCaConfirmed:true,postgresReadOnlyAcknowledged:true,windowStart:'2026-11-27T09:00:00Z',windowEnd:'2026-11-27T09:10:00Z'};
 const input={manifestBytes,receipt,authorization,evidence};assert.equal(reviewInitial(input).serverVersionNum,170011);assert.equal(reviewInitial(input).postgresAttributes.bypassRls,true);
 for(const mutation of [r=>r.receipts[0].outputSha256='bad',r=>r.receipts[1].terminationConfirmed=false,r=>r.receipts[0].at='2026-11-27T10:00:00Z',r=>r.receipts[0].pid=null]){const changed=structuredClone(receipt);mutation(changed);assert.throws(()=>reviewInitial({...input,receipt:changed}));}
 assert.throws(()=>reviewInitial({...input,authorization:{...authorization,manifestHash:'bad'}}));
 assert.throws(()=>reviewInitial({...input,evidence:{...evidence,'Q7-roles':{...evidence['Q7-roles'],stderr:Buffer.from('private error')}}}));
});
test('runtime gate accepts only absent or whitespace NODE_OPTIONS without changing environment',()=>{
 for(const env of [{},{NODE_OPTIONS:''},{NODE_OPTIONS:' \t\r\n'},{NODE_OPTIONS:'\u0085\u2003'}]){const before={...env};assert.equal(runtimeConflict(env),false);assert.deepEqual(env,before);}
 for(const value of ['--require=./isolate.cjs','--import=./hook.mjs','--inspect','--cpu-prof',' --require=./hook.cjs  ','--dns-result-order=ipv4first','--unknown',' \t--inspect --unknown '])assert.equal(runtimeConflict({NODE_OPTIONS:value}),true);
 for(const key of ['NODE_DEBUG','NODE_TLS_REJECT_UNAUTHORIZED','SSLKEYLOGFILE'])assert.equal(runtimeConflict({[key]:''}),true);
 assert.equal(runtimeConflict({},['--inspect=9229']),true);assert.equal(runtimeConflict({},['--require=hook.cjs']),true);
});
function fake(){const c=new EventEmitter();c.stdout=new PassThrough();c.stderr=new PassThrough();c.pid=123;c.kill=()=>{queueMicrotask(()=>c.emit('close',null,'SIGKILL'));return true;};return c;}
test('CSV decoding and identity gate never treat changed role or writable session as verified',()=>{assert.deepEqual(csv('a,b\r\n"x,y","q""z"\r\n'),[['a','b'],['x,y','q"z']]);const valid='database_name,session_role,effective_role,transaction_read_only,isolation,server_version_num\npostgres,postgres,postgres,on,repeatable read,170011\n';assert.equal(validateIdentity(valid).database_name,'postgres');assert.throws(()=>validateIdentity(valid.replace(',on,',',off,')));assert.throws(()=>validateIdentity(valid.replace('postgres,on','other,on')));});
test('bounded capture passes fixed environment privately and refuses stderr/failure',async()=>{const child=fake(),env={PGPASSWORD:'synthetic-only'};const result=boundedRead('fixed',['-X'],env,{launch:(exe,args,opts)=>{assert.equal(exe,'fixed');assert.deepEqual(args,['-X']);assert.equal(opts.shell,false);assert.equal(opts.env,env);queueMicrotask(()=>{child.stdout.write('safe metadata');child.emit('close',0,null);});return child;}});const r=await result;assert.equal(r.status,'CAPTURED');assert.equal(r.terminationConfirmed,true);assert.equal(r.stdout.toString(),'safe metadata');});
test('timeout kills one native process and does not retry',async()=>{const child=fake();let starts=0;const r=await boundedRead('fixed',[],{}, {budgetMs:5,launch:()=>{starts++;return child;}});assert.equal(r.status,'DEADLINE_EXCEEDED');assert.equal(r.terminationConfirmed,true);assert.equal(starts,1);});
test('combined stdout/stderr cap stops capture and raw diagnostics never become status text',async()=>{const child=fake();const r=await boundedRead('fixed',[],{}, {maxBytes:4,launch:()=>{queueMicrotask(()=>child.stderr.write('private provider error'));return child;}});assert.equal(r.status,'OUTPUT_LIMIT_EXCEEDED');assert.equal(r.stderr.length,0);assert.equal(r.terminationConfirmed,true);});
