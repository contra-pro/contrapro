// Offline derivative preparation only. Never executes SQL, starts processes or alters session evidence.
import {readFile,writeFile,readdir,lstat,mkdir} from 'node:fs/promises';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),oldDir=resolve(root,'scripts/d2-native'),out=resolve(root,'scripts/d2-native-recovery'),session='C:/Users/lenovo/AppData/Local/ContratPro-D2-native/pg17-54329';
const sha=b=>createHash('sha256').update(b).digest('hex'),original='d703f3c2e7a3cbaa2f3694eef85a49dad75172e568fe0dd10dcbc647b40d869d';
const oldBytes=await readFile(resolve(oldDir,'package-manifest.json'));if(sha(oldBytes)!==original)throw Error('Original package changed');const old=JSON.parse(oldBytes);for(const f of old.files)if(sha(await readFile(resolve(root,f.path)))!==f.sha256)throw Error('Original file changed');
const state=JSON.parse(await readFile(session+'/session.json')),receipt=JSON.parse(await readFile(session+'/acceptance-receipt.json'));
if(state.status!=='STOPPED'||state.pid!==0||state.packageHash!==original||receipt.phase!=='bootstrap'||receipt.code!=='ERR_ASSERTION'||receipt.events.length||!receipt.diagnostic.message.includes("assert(['127.0.0.1','::1'].includes(x.address))"))throw Error('Not diagnosed pre-mutation failure');
try{await lstat(session+'/data/postmaster.pid');throw Error('Server PID file present');}catch(e){if(e.code!=='ENOENT')throw e;}
const frozen=[];async function snapshot(relative){const p=session+'/'+relative,s=await lstat(p);if(s.isSymbolicLink())throw Error('Linked evidence');if(s.isDirectory()){for(const n of (await readdir(p)).sort())await snapshot(relative+'/'+n);}else if(s.isFile())frozen.push({path:relative,bytes:s.size,sha256:sha(await readFile(p))});}
for(const name of ['session.json','acceptance-receipt.json','startup.log','root-ca.crt','server.crt','data'])await snapshot(name);
await mkdir(out,{recursive:true});
const files=[];async function put(name,text){await writeFile(resolve(out,name),text,{flag:'wx'});files.push({path:'scripts/d2-native-recovery/'+name,sha256:sha(text)});}
for(const name of ['resources.mjs','resource-manifest.json','baseline.mjs','baseline-sources.json','provider-fixture.sql','receipt-model.sql','scenarios.mjs'])await put(name,await readFile(resolve(oldDir,name)));
let driver=await readFile(resolve(oldDir,'orchestrate.mjs'),'utf8');
driver=driver.replace('inet_server_addr()::text AS address','pg_catalog.host(inet_server_addr()) AS address');
driver=driver.replace('async function guard(db,user,database){','export async function guard(db,user,database){');
driver=driver.replace("scripts\\/d2-native\\/","scripts\\/d2-native-recovery\\/");
driver=driver.replace("'session.json'","'session-recovery.json'").replace("'acceptance-receipt.json'","'acceptance-receipt-recovery.json'");
driver=driver.replace("'D2-NATIVE-SYNTHETIC-ONLY'","'D2-NATIVE-RECOVERY-ONLY'");
driver=driver.replace("await verifyPackage(packageHash);await verifyResources();","await verifyPackage(packageHash);await verifyBinding(false);await verifyResources();");
driver="import {verifyBinding} from './binding.mjs';\n"+driver;
await put('orchestrate.mjs',driver);
let ps=await readFile(resolve(oldDir,'session.ps1'),'utf8');
ps=ps.replace("'Plan','Initialize','Start','Accept','Status','Stop','Cleanup'","'Plan','Bind','Start','Accept','Status','Stop'");
ps=ps.replace("'session.json'","'session-recovery.json'");
const cleanupStart=ps.indexOf("if ($Action -eq 'Cleanup') {"),envStart=ps.indexOf('foreach($variable in (Get-ChildItem Env:))');ps=ps.slice(0,cleanupStart)+ps.slice(envStart);
const initStart=ps.indexOf("if ($Action -eq 'Initialize') {"),startStart=ps.indexOf("if ($Action -eq 'Start') {");ps=ps.slice(0,initStart)+ps.slice(startStart);
ps=ps.replace("$Action -in @('Initialize','Start')","$Action -eq 'Start'");
ps=ps.replaceAll('D2-NATIVE-START','D2-RECOVERY-START').replaceAll('D2-NATIVE-STOP','D2-RECOVERY-STOP').replaceAll('D2-NATIVE-SYNTHETIC-ONLY','D2-NATIVE-RECOVERY-ONLY');
const bind=`
if ($Action -eq 'Bind') {
  Confirm 'D2-RECOVERY-BIND'
  Check-Private
  if (@(Get-NetTCPConnection -LocalPort 54329 -State Listen -ErrorAction SilentlyContinue).Count -or $null -ne (Own-Server)) { throw 'Cluster must be stopped for binding.' }
  & $node (Join-Path $PSScriptRoot 'binding.mjs') --bind $PackageSha256
  if ($LASTEXITCODE -ne 0) { throw 'Recovery binding refused; no restart.' }
  return
}
`;
ps=ps.replace("if ($Action -eq 'Status') {",bind+"\nif ($Action -eq 'Status') {");
ps=ps.replace("Confirm 'D2-RECOVERY-START';$s=Read-State","Confirm 'D2-RECOVERY-START';$s=Read-State\n  & $node (Join-Path $PSScriptRoot 'binding.mjs') --check-stopped $PackageSha256\n  if ($LASTEXITCODE -ne 0) { throw 'Frozen pre-mutation cluster drift; no start.' }");
await put('session.ps1',ps);
// Binding implementation is authored separately and included before pinning.
const binding=await readFile(resolve(root,'scripts/d2-recovery-binding-template.mjs'),'utf8');await put('binding.mjs',binding);
const manifest={schema:1,profile:'diagnosed-pre-mutation-bootstrap-recovery-only',originalPackageSha256:original,candidateManifestSha256:old.candidateManifestSha256,sessionRoot:session,failureEvidence:{phase:'bootstrap',code:'ERR_ASSERTION',mutationStatus:'not reached by exact original source control flow; runtime zero-collision recheck required'},frozen,files:[...files,...old.files.filter(f=>!f.path.startsWith('scripts/d2-native/'))]};
await writeFile(resolve(out,'package-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({recoveryPackageSha256:sha(JSON.stringify(manifest,null,2)+'\n'),originalPackageSha256:original,frozenFiles:frozen.length,files:manifest.files.length,sqlExecuted:false}));
