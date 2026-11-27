// Offline manifest preparation/check only, never starts software or connects.
import {readFile,writeFile,readdir,lstat} from 'node:fs/promises';import {resolve} from 'node:path';import {repository,sessionRoot,sha,verifyResources} from './resources.mjs';
const action=process.argv[2];if(process.argv.length!==3||!['--prepare','--check'].includes(action))throw Error('Explicit offline --prepare/--check required');
const dir=resolve(repository,'scripts/d2-native');
if(action==='--prepare'){
 try{await lstat(sessionRoot);throw Error('Native session already exists; no repack after initialization');}catch(e){if(e.code!=='ENOENT')throw e;}
 const inventory=JSON.parse(await readFile(resolve(repository,'.verification/d1/inventory.json'),'utf8'));
 const selected=inventory.filter(x=>x.path.startsWith('supabase/migrations/')||x.path==='supabase/migration-drafts/20261118000800_vehicles.sql').map(({path,sha256})=>({path,sha256})).sort((a,b)=>a.path.split('/').at(-1).localeCompare(b.path.split('/').at(-1)));
 if(selected.length!==9||selected.some(x=>/0009/.test(x.path)))throw Error('Unexpected baseline selection');
 const baselinePath=resolve(dir,'baseline-sources.json'),serialized=JSON.stringify(selected,null,2)+'\n';try{if(await readFile(baselinePath,'utf8')!==serialized)throw Error('Baseline bindings changed');}catch(e){if(e.code==='ENOENT')await writeFile(baselinePath,serialized,{flag:'wx'});else throw e;}
 const files=[];for(const name of (await readdir(dir)).filter(n=>n!=='package-manifest.json'&&!n.endsWith('.test.mjs')).sort()){if(!/^[a-z0-9_.-]+$/.test(name))throw Error('Unexpected native file');const path='scripts/d2-native/'+name;files.push({path,sha256:sha(await readFile(resolve(repository,path)))});}
 for(const f of selected)files.push({path:f.path,sha256:f.sha256});
 await verifyResources();
 const packet={schema:1,profile:'independent-synthetic-only-not-faithful-upgrade',authorized:false,candidateManifestSha256:'c5f3bcaa94e92843e26a55b9069542cc9274800d003155e4aee4e4b7bfb2cdc8',target:{sessionRoot,database:'contratpro_d2_native',port:54329,pgVersion:'17.11',tls:true},baseline:{model:true,selectsHistorical0009Variant:false,historyRowsAreSyntheticMarkers:true},files};
 await writeFile(resolve(dir,'package-manifest.json'),JSON.stringify(packet,null,2)+'\n');console.log(JSON.stringify({packageSha256:sha(JSON.stringify(packet,null,2)+'\n'),files:files.length,sqlExecuted:false}));
}else{
 const bytes=await readFile(resolve(dir,'package-manifest.json')),p=JSON.parse(bytes);for(const f of p.files)if(sha(await readFile(resolve(repository,f.path)))!==f.sha256)throw Error('Package file drift: '+f.path);await verifyResources();console.log(JSON.stringify({status:'OFFLINE_PACKAGE_VERIFIED',packageSha256:sha(bytes),files:p.files.length,sqlExecuted:false}));
}
