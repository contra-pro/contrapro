// Read-only local Git/artifact discovery. Never reads .env, decrypts archives or contacts a remote.
import {execFileSync} from 'node:child_process';import {readFile,readdir,lstat,mkdir,writeFile} from 'node:fs/promises';import {resolve,join,basename} from 'node:path';import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const git=(args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,windowsHide:true});
const branches=git(['branch','--all']).trim().split('\n'),tags=git(['tag','--list']).trim().split('\n').filter(Boolean);
const reachable=git(['rev-list','--all','--','supabase/migration-drafts','docs/deployment-0008','docs/deployment-0009']).trim().split('\n').filter(Boolean);
const reflog=git(['reflog','--all','--format=%H','--max-count=100']).trim().split('\n').filter(Boolean);
const fsck=git(['fsck','--no-reflogs','--unreachable']);const unreachable=[...fsck.matchAll(/^unreachable commit ([0-9a-f]{40})$/gm)].map(m=>m[1]);
const commits=[...new Set([...reachable,...reflog,...unreachable])];if(commits.length>100)throw Error('Provenance commit bound exceeded');
const history=[];
for(const commit of commits){
 const paths=git(['ls-tree','-r','--name-only',commit,'--','supabase/migration-drafts','supabase/migrations','docs/deployment-0008','docs/deployment-0009']).trim().split('\n').filter(p=>/(?:0008|0009)/.test(p)&&/\.(sql|json|md)$/.test(p));
 for(const path of paths){if(!/^(supabase\/(?:migrations|migration-drafts)|docs\/deployment-000[89])\/[a-zA-Z0-9_.\/-]+$/.test(path))throw Error('Unexpected Git path');
  const bytes=execFileSync('git',['show',`${commit}:${path}`],{cwd:root,maxBuffer:4*1024*1024,windowsHide:true});history.push({commit,path,sha256:sha(bytes),bytes:bytes.length});
 }
}
const artifacts=[],scanRoots=['docs/deployment-0008','docs/deployment-0009','docs/evidence','.verification','supabase/migration-drafts'];
for(const entry of await readdir(root,{withFileTypes:true}))if(entry.isDirectory()&&!entry.isSymbolicLink()&&/backup|archive|export|artifact|deployment/i.test(entry.name))scanRoots.push(entry.name);
let filesVisited=0;const maxFiles=25000;
async function walk(path,depth=0){if(depth>12)return;let entries;try{entries=await readdir(path,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}
 for(const entry of entries){if(entry.isSymbolicLink()||entry.name==='node_modules'||entry.name==='.git'||entry.name.startsWith('.env'))continue;const full=join(path,entry.name);if(entry.isDirectory()){await walk(full,depth+1);continue;}if(!entry.isFile())continue;if(++filesVisited>maxFiles)throw Error('Artifact discovery file bound exceeded');
  const rel=full.slice(root.length+1).replaceAll('\\','/');if(!/0008|0009|receipt|backup|deployment|snapshot|export/i.test(rel))continue;
  const stat=await lstat(full);if(stat.size>8*1024*1024){artifacts.push({path:rel,bytes:stat.size,status:'not-read-size-bound'});continue;}
  if(!/\.(sql|json|md|zip|7z|tar|gz|age)$/i.test(entry.name))continue;
  const bytes=await readFile(full);const record={path:rel,sha256:sha(bytes),bytes:bytes.length};
  if(/\.(zip|7z|tar|gz|age)$/i.test(entry.name))record.status='archive-fingerprint-only-no-extraction-or-decryption';
  if(entry.name.endsWith('.json')&&/receipt|execution|backup|export|manifest/.test(entry.name)){
   try{const value=JSON.parse(bytes);record.topLevelShape=Array.isArray(value)?'array':Object.keys(value).filter(k=>/status|manifest|receipt|version|execution|sql|commit|checksum|applied/i.test(k));}catch{record.status='not-json';}
  }
  artifacts.push(record);
 }
}
for(const rel of scanRoots)await walk(resolve(root,rel));
// Only ContratPro-labelled filenames in Downloads; never recurse unrelated personal directories.
const downloadMatches=[];try{for(const entry of await readdir('C:/Users/lenovo/Downloads',{withFileTypes:true})){if(entry.isFile()&&/contrat.?pro/i.test(entry.name)&&/\.(sql|json|zip|7z|tar|gz|age)$/i.test(entry.name)){const path=join('C:/Users/lenovo/Downloads',entry.name),stat=await lstat(path);if(/^contratpro_0009_(?:local_patch_candidate|production_candidate_v3|review_candidate_v2|v3_rollback_rehearsal)\.sql$/.test(entry.name)){const bytes=await readFile(path);downloadMatches.push({name:entry.name,bytes:bytes.length,sha256:sha(bytes),matchesRepository:sha(bytes)===sha(await readFile(resolve(root,'supabase/migration-drafts',entry.name))),status:'bounded relevant SQL fingerprint; not proof of deployment'});}else downloadMatches.push({name:entry.name,bytes:stat.size,status:'metadata-only; no extraction/decryption'});}}}catch(e){if(e.code!=='ENOENT')throw e;}
const staging=[];
for(const name of ['0008','0009']){const m=JSON.parse(await readFile(resolve(root,'docs/deployment-'+name+'/manifest.json'),'utf8'));function find(v,key=''){if(typeof v==='string'&&/stag|directory|workdir/i.test(key)&&/^[A-Z]:[\\/]/i.test(v)&&/contratpro/i.test(v)&&!v.replaceAll('\\','/').toLowerCase().startsWith(root.replaceAll('\\','/').toLowerCase()+'/'))staging.push(resolve(v));else if(v&&typeof v==='object')for(const [k,x]of Object.entries(v))find(x,key+'_'+k);}find(m);}
const stagingObservations=[];for(const path of [...new Set(staging)]){try{const stat=await lstat(path);stagingObservations.push({path,present:true,directory:stat.isDirectory(),linked:stat.isSymbolicLink()});if(stat.isDirectory()&&!stat.isSymbolicLink())await walk(path);}catch(e){if(e.code==='ENOENT')stagingObservations.push({path,present:false});else throw e;}}
const sqlHistory=history.filter(x=>x.path.endsWith('.sql')),identities=[...new Set(sqlHistory.map(x=>x.sha256))].map(hash=>({sha256:hash,paths:[...new Set(sqlHistory.filter(x=>x.sha256===hash).map(x=>x.path))],commits:[...new Set(sqlHistory.filter(x=>x.sha256===hash).map(x=>x.commit))]}));
const report={scope:{repository:root,branches,tags,commitsInspected:commits.length,unreachableCommits:unreachable.length,unreachableUnreferencedBlobs:'not content-scanned: no trustworthy path binding',scanRoots,filesVisited,downloads:'ContratPro-labelled direct filenames; four relevant SQL fingerprints only'},sqlIdentities:identities,history,artifacts,downloadMatches,stagingObservations,remoteConnections:0,sqlExecuted:0,provenanceVerdict:'SOURCE_IDENTITIES_ONLY; no new authenticated deployment-to-target byte binding established'};
await mkdir(resolve(root,'.verification/d2'),{recursive:true});await writeFile(resolve(root,'.verification/d2/provenance.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({branches,tags,commitsInspected:commits.length,unreachableCommits:unreachable.length,filesVisited,artifactMatches:artifacts.length,downloadMatches,stagingObservations,sqlIdentityCount:identities.length,report:'.verification/d2/provenance.json',remoteConnections:0,sqlExecuted:0},null,2));
