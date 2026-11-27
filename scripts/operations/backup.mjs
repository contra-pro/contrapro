// No network or database access unless explicitly invoked with --execute.
import { createHash,randomUUID } from 'node:crypto';
import { lstat,readdir,readFile,writeFile,mkdir,copyFile } from 'node:fs/promises';
import { resolve,relative,isAbsolute,join } from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function inside(root,path){const r=relative(resolve(root),resolve(root,path));if(r.startsWith('..')||isAbsolute(r)||r==='')throw Error('invalid_backup_path');return resolve(root,path);}
export function validateManifest(m){
 if(m?.version!==1||typeof m.id!=='string'||!/^\d{4}-\d\d-\d\dT/.test(m.createdAt)||m.consistency!=='writes-frozen'||!Array.isArray(m.files)||!m.files.length||m.files.length>1000000)throw Error('invalid_manifest');
 const seen=new Set();for(const f of m.files){if(typeof f.path!=='string'||f.path.includes('\\')||f.path.startsWith('/')||f.path.split('/').some(p=>!p||p==='.'||p==='..')||seen.has(f.path)||!Number.isSafeInteger(f.bytes)||f.bytes<0||!/^[a-f0-9]{64}$/.test(f.sha256))throw Error('invalid_manifest');seen.add(f.path);}
 for(const p of ['database.dump','references.json','recovery-keys.age','managed-service.json'])if(!seen.has(p))throw Error('incomplete_backup');return m;
}
export async function tree(root,prefix=''){
 const result=[];for(const name of (await readdir(join(root,prefix))).sort()){
  const p=prefix?`${prefix}/${name}`:name,full=inside(root,p),st=await lstat(full);if(st.isSymbolicLink())throw Error('symlink_forbidden');
  if(st.isDirectory())result.push(...await tree(root,p));else if(st.isFile()&&p!=='manifest.json')result.push({path:p,bytes:st.size,sha256:sha256(await readFile(full))});else if(!st.isFile())throw Error('unsupported_backup_file');
 }return result;
}
export async function verifyBundle(root){
 const m=validateManifest(JSON.parse(await readFile(join(root,'manifest.json'),'utf8'))),actual=await tree(root),byPath=(a,b)=>a.path<b.path?-1:a.path>b.path?1:0;
 if(JSON.stringify(actual.sort(byPath))!==JSON.stringify([...m.files].sort(byPath)))throw Error('backup_integrity_failed');
 const refs=JSON.parse(await readFile(join(root,'references.json'),'utf8'));
 if(!Array.isArray(refs))throw Error('invalid_references');
 let missingPending=0;for(const r of refs){if(typeof r.key!=='string')throw Error('invalid_references');const file=m.files.find(f=>f.path===`objects/${r.key}`);if(!file&&r.required===false){missingPending++;continue;}if(!file||r.sha256&&file.sha256!==r.sha256)throw Error('missing_referenced_object');}
 return {id:m.id,files:m.files.length,missingPending,manifestSha256:sha256(await readFile(join(root,'manifest.json')))};
}
function command(executable,args,env=process.env){return new Promise((resolvePromise,reject)=>{const child=spawn(executable,args,{env,stdio:['ignore','pipe','ignore'],shell:false});let output='';child.stdout.on('data',d=>{output+=d;if(output.length>16000000)child.kill();});child.once('error',()=>reject(Error('backup_tool_unavailable')));child.once('close',code=>code===0?resolvePromise(output):reject(Error('backup_tool_failed')));});}
function authorized(env){if(env.CONTRATPRO_BACKUP_AUTHORIZED!=='true'||env.CONTRATPRO_WRITES_FROZEN!=='true'||env.CONTRATPRO_PRIVATE_STAGING_APPROVED!=='true'||!env.PGSERVICE||!env.RESTIC_REPOSITORY||!env.RESTIC_PASSWORD_FILE||!env.CONTRATPRO_BACKUP_STAGING||!env.CONTRATPRO_RECOVERY_KEYS_AGE)throw Error('backup_configuration_invalid');}
export async function backup(env=process.env){
 authorized(env);const root=resolve(env.CONTRATPRO_BACKUP_STAGING,randomUUID());await mkdir(root,{recursive:true,mode:0o700});
 // PGSERVICE/PGPASSFILE avoid credentials in argv and manifests. The operator must
 // stop ALL writes for the database, Auth and object-store consistency boundary.
 await command('pg_dump',['--format=custom','--no-owner','--no-acl',`--file=${join(root,'database.dump')}`],env);
 const refs=await command('psql',['-X','-A','-t','-v','ON_ERROR_STOP=1','-f',new URL('./references.sql',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],env);
 await writeFile(join(root,'references.json'),JSON.stringify(JSON.parse(refs.trim())),{mode:0o600});
 const origin=new URL(env.CONTRATPRO_SUPABASE_BACKUP_URL??'');if(origin.protocol!=='https:'||origin.username||origin.password)throw Error('backup_configuration_invalid');
 const headers={apikey:env.CONTRATPRO_SUPABASE_BACKUP_SERVICE_KEY??'',authorization:`Bearer ${env.CONTRATPRO_SUPABASE_BACKUP_SERVICE_KEY??''}`};if(!headers.apikey)throw Error('backup_configuration_invalid');
 async function list(prefix=''){
  for(let offset=0;;offset+=100){const response=await fetch(new URL('/storage/v1/object/list/contract-documents',origin),{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({prefix,limit:100,offset,sortBy:{column:'name',order:'asc'}}),signal:AbortSignal.timeout(30000),redirect:'error'});if(!response.ok)throw Error('storage_backup_failed');const items=await response.json();if(!Array.isArray(items)||items.length>100)throw Error('storage_backup_failed');
   for(const item of items){if(typeof item.name!=='string'||!item.name||item.name.includes('/')||item.name.includes('\\')||['.','..'].includes(item.name))throw Error('storage_backup_failed');const key=prefix?`${prefix}/${item.name}`:item.name;if(!item.id){await list(key);continue;}
    const target=inside(root,`objects/${key}`),r=await fetch(new URL('/storage/v1/object/contract-documents/'+key.split('/').map(encodeURIComponent).join('/'),origin),{headers,signal:AbortSignal.timeout(30000),redirect:'error'});if(!r.ok)throw Error('storage_backup_failed');const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length>10485760)throw Error('storage_backup_failed');await mkdir(resolve(target,'..'),{recursive:true,mode:0o700});await writeFile(target,bytes,{mode:0o600});
   }if(items.length<100)break;
  }
 }
 await list();const encryptedKeys=await readFile(env.CONTRATPRO_RECOVERY_KEYS_AGE,'utf8');if(!encryptedKeys.startsWith('age-encryption.org/v1')&&!encryptedKeys.startsWith('-----BEGIN AGE ENCRYPTED FILE-----'))throw Error('encrypted_key_archive_required');await copyFile(env.CONTRATPRO_RECOVERY_KEYS_AGE,join(root,'recovery-keys.age'));
 await writeFile(join(root,'managed-service.json'),JSON.stringify({supabaseVersion:env.CONTRATPRO_SUPABASE_VERSION??'unrecorded',auth:'schema/data in database.dump; managed signing keys, SMTP, project configuration and OAuth consoles require separate recovery',storage:'contract-documents bytes and database metadata; provision compatible Storage service separately',migrationHistory:'included in full PostgreSQL dump',keys:'external age-encrypted recovery file; decryption identity stored separately',portability:'Supabase managed schemas are not an application-only portable restore'}),{mode:0o600});
 const manifest={version:1,id:randomUUID(),createdAt:new Date().toISOString(),consistency:'writes-frozen',gitRevision:env.CONTRATPRO_RELEASE_REVISION??'unrecorded',files:await tree(root)};
 await writeFile(join(root,'manifest.json'),JSON.stringify(manifest),{mode:0o600});const verified=await verifyBundle(root);
 await command('restic',['backup','--tag','contratpro-a5','--',root],env);
 // No automatic local removal or remote retention: verify the encrypted repository
 // and retention policy first. Staging remains sensitive until securely removed.
 return verified;
}
export async function restore(env=process.env){
 if(env.CONTRATPRO_RESTORE_AUTHORIZED!=='true'||env.CONTRATPRO_RESTORE_ISOLATED!=='true'||env.CONTRATPRO_PRIVATE_STAGING_APPROVED!=='true'||!env.CONTRATPRO_RESTORE_DIRECTORY||!env.CONTRATPRO_RESTORE_SNAPSHOT||!env.RESTIC_PASSWORD_FILE||!env.RESTIC_REPOSITORY)throw Error('restore_configuration_invalid');
 await command('restic',['restore',env.CONTRATPRO_RESTORE_SNAPSHOT,'--target',env.CONTRATPRO_RESTORE_DIRECTORY],env);
 // restic preserves original paths. Explicitly select the bundle after extraction;
 // there is no automatic pg_restore against a possibly live Supabase project.
 return {extracted:true,requires:'verify, isolated managed Auth/Storage provisioning, reviewed pg_restore and post-restore-quarantine.sql'};
}
export async function restoreDatabase(root,env=process.env){
 if(env.CONTRATPRO_RESTORE_AUTHORIZED!=='true'||env.CONTRATPRO_RESTORE_ISOLATED!=='true'||env.CONTRATPRO_RESTORE_EMPTY_TARGET_APPROVED!=='true'||!env.PGSERVICE)throw Error('restore_configuration_invalid');
 await verifyBundle(root);
 // Target must already provide matching roles, extensions, Auth and Storage service
 // versions. No --clean, no production target discovery and no credential argv.
 await command('pg_restore',['--exit-on-error','--single-transaction','--no-owner','--no-acl','--dbname',`service=${env.PGSERVICE}`,join(root,'database.dump')],env);
 await command('psql',['-X','-v','ON_ERROR_STOP=1','-f',new URL('./post-restore-quarantine.sql',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],env);
 return {databaseRestored:true,externalReplay:'held',requires:'private-object restoration and independent managed-service validation before traffic'};
}
export async function restoreObjects(root,env=process.env){
 if(env.CONTRATPRO_RESTORE_AUTHORIZED!=='true'||env.CONTRATPRO_RESTORE_ISOLATED!=='true')throw Error('restore_configuration_invalid');await verifyBundle(root);
 const origin=new URL(env.CONTRATPRO_SUPABASE_RESTORE_URL??''),secret=env.CONTRATPRO_SUPABASE_RESTORE_SERVICE_KEY??'';if(origin.protocol!=='https:'||origin.username||origin.password||!secret)throw Error('restore_configuration_invalid');
 const m=validateManifest(JSON.parse(await readFile(join(root,'manifest.json'),'utf8'))),headers={apikey:secret,authorization:`Bearer ${secret}`};let restored=0;
 for(const file of m.files.filter(f=>f.path.startsWith('objects/'))){const key=file.path.slice(8),url=new URL('/storage/v1/object/contract-documents/'+key.split('/').map(encodeURIComponent).join('/'),origin),get=await fetch(url,{headers,signal:AbortSignal.timeout(30000),redirect:'error'});
  if(get.ok){if(sha256(new Uint8Array(await get.arrayBuffer()))!==file.sha256)throw Error('restore_object_conflict');continue;}
  // No overwrite: missing backend bytes with pre-existing managed metadata may
  // require provider-specific metadata recovery before this API can accept them.
  if(get.status!==404&&get.status!==400)throw Error('restore_storage_unavailable');const mime=key.endsWith('.pdf')?'application/pdf':key.endsWith('.docx')?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':key.endsWith('.png')?'image/png':'application/octet-stream';const put=await fetch(url,{method:'POST',headers:{...headers,'content-type':mime,'x-upsert':'false'},body:await readFile(inside(root,file.path)),signal:AbortSignal.timeout(30000),redirect:'error'});if(!put.ok)throw Error('restore_storage_conflict');
  const check=await fetch(url,{headers,signal:AbortSignal.timeout(30000),redirect:'error'});if(!check.ok||sha256(new Uint8Array(await check.arrayBuffer()))!==file.sha256)throw Error('restore_storage_integrity_failed');restored++;
 }return {objectsRestored:restored,externalReplay:'held'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const [mode,flag,path]=process.argv.slice(2);let result;if(mode==='verify')result=await verifyBundle(flag);else if(flag!=='--execute')result={dryRun:true,mode,network:false};else if(mode==='backup')result=await backup();else if(mode==='restore')result=await restore();else if(mode==='restore-database')result=await restoreDatabase(path);else if(mode==='restore-objects')result=await restoreObjects(path);else throw Error('invalid_command');process.stdout.write(JSON.stringify(result)+'\n');}catch{process.stderr.write('{"ok":false,"code":"backup_or_restore_failed"}\n');process.exitCode=1;}
}
