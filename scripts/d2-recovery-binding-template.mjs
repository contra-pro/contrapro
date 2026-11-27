import assert from 'node:assert/strict';import {readFile,lstat,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {repository,sessionRoot,sha} from './resources.mjs';
export const originalHash='d703f3c2e7a3cbaa2f3694eef85a49dad75172e568fe0dd10dcbc647b40d869d';
export function validateFailure(state,receipt){assert.equal(state.status,'STOPPED');assert.equal(state.pid,0);assert.equal(state.profile,'synthetic-only');assert.equal(state.port,54329);assert.equal(resolve(state.dataDirectory),resolve(sessionRoot,'data'));assert.equal(state.packageHash,originalHash);assert.equal(receipt.packageHash,originalHash);assert.equal(receipt.status,'FAILED_STOP_NO_RETRY');assert.equal(receipt.phase,'bootstrap');assert.equal(receipt.code,'ERR_ASSERTION');assert.deepEqual(receipt.events,[]);assert.equal(receipt.diagnostic.message.trim(),"The expression evaluated to a falsy value:\n\n  assert(['127.0.0.1','::1'].includes(x.address))");}
async function absent(name){try{await lstat(resolve(sessionRoot,name));}catch(e){if(e.code==='ENOENT')return;throw e;}throw Error('Recovery artifact already exists: '+name);}
export async function verifyBinding(stopped=true){
 const bytes=await readFile(new URL('./package-manifest.json',import.meta.url)),manifest=JSON.parse(bytes),hash=sha(bytes);
 assert.equal(manifest.originalPackageSha256,originalHash);assert.equal(sha(await readFile(resolve(repository,'scripts/d2-native/package-manifest.json'))),originalHash);
 const original=JSON.parse(await readFile(resolve(repository,'scripts/d2-native/package-manifest.json')));for(const f of original.files)assert.equal(sha(await readFile(resolve(repository,f.path))),f.sha256);
 for(const f of manifest.files)assert.equal(sha(await readFile(resolve(repository,f.path))),f.sha256);
 const state=JSON.parse(await readFile(resolve(sessionRoot,'session.json'))),receipt=JSON.parse(await readFile(resolve(sessionRoot,'acceptance-receipt.json')));validateFailure(state,receipt);
 for(const f of manifest.frozen.filter(f=>stopped||!f.path.startsWith('data/')&&f.path!=='startup.log')){const path=resolve(sessionRoot,f.path);assert(path.startsWith(resolve(sessionRoot)+ '/'.replace('/',process.platform==='win32'?'\\':'/')));const s=await lstat(path);assert(!s.isSymbolicLink()&&s.isFile());assert.equal(s.size,f.bytes);assert.equal(sha(await readFile(path)),f.sha256);}
 if(stopped){await absent('data/postmaster.pid');await absent('acceptance-receipt-recovery.json');}
 return {manifest,hash,state};
}
export async function bind(expected){const {hash,state}=await verifyBinding(true);assert.equal(hash,expected);await absent('session-recovery.json');await absent('recovery-binding.json');
 const next={...state,packageHash:hash,status:'STOPPED',pid:0,recoveryFrom:originalHash};
 await writeFile(resolve(sessionRoot,'recovery-binding.json'),JSON.stringify({originalPackageSha256:originalHash,recoveryPackageSha256:hash,previousFailurePreserved:true,at:new Date().toISOString()},null,2),{flag:'wx'});
 await writeFile(resolve(sessionRoot,'session-recovery.json'),JSON.stringify(next,null,2),{flag:'wx'});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{if(process.argv.length!==4||!['--bind','--check-stopped'].includes(process.argv[2]))throw Error('Explicit binding action/hash required');if(process.argv[2]==='--bind')await bind(process.argv[3]);else assert.equal((await verifyBinding(true)).hash,process.argv[3]);console.log('RECOVERY_BINDING_VERIFIED_NO_SQL');}catch{console.error('D2 recovery binding refused; preserve evidence; no retry.');process.exitCode=1;}}
