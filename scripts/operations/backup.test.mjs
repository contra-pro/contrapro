import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve,relative} from 'node:path';
import {validateManifest,verifyBundle,tree,inside,backup,restore,restoreDatabase,restoreObjects} from './backup.mjs';
test('backup and restore refuse execution without explicit isolated configuration',async()=>{await assert.rejects(backup({}));await assert.rejects(restore({}));await assert.rejects(restoreDatabase('unused',{}));await assert.rejects(restoreObjects('unused',{}));});
test('manifest rejects traversal, missing components, duplicate paths and wrong versions',()=>{
 assert.throws(()=>validateManifest({version:2}));assert.throws(()=>inside('C:/fixture','../escape'));
 assert.throws(()=>validateManifest({version:1,id:'fixture',createdAt:'2026-11-26T00:00Z',consistency:'writes-frozen',files:[{path:'../secret',bytes:0,sha256:'a'.repeat(64)}]}));
});
test('bundle integrity and missing referenced-object validation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'contratpro-a5-fixture-'));
 try{for(const [p,v] of Object.entries({'database.dump':'offline fixture','references.json':'[]','recovery-keys.age':'age-encrypted fixture','managed-service.json':'{}'}))await writeFile(join(root,p),v);
  await writeFile(join(root,'manifest.json'),JSON.stringify({version:1,id:'fixture',createdAt:'2026-11-26T00:00Z',consistency:'writes-frozen',files:await tree(root)}));assert.equal((await verifyBundle(root)).files,4);
  await writeFile(join(root,'database.dump'),'tampered');await assert.rejects(verifyBundle(root),/integrity/);
  await writeFile(join(root,'references.json'),'[{"key":"agency/issued/missing.pdf"}]');await writeFile(join(root,'manifest.json'),JSON.stringify({version:1,id:'fixture',createdAt:'2026-11-26T00:00Z',consistency:'writes-frozen',files:await tree(root)}));await assert.rejects(verifyBundle(root),/missing_referenced/);
 }finally{assert.ok(relative(resolve(tmpdir()),resolve(root)).startsWith('contratpro-a5-fixture-'));await rm(root,{recursive:true,force:true});}
});
