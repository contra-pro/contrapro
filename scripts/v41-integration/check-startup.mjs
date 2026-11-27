import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
const root=resolve(import.meta.dirname,'../..');
const env={NODE_OPTIONS:`--require="${resolve(root,'scripts/ui-review/isolate.cjs').replaceAll('\\','/')}"`,NEXT_TELEMETRY_DISABLED:'1',A6_ISOLATION_DIAGNOSTICS:'1'};
for(const key of ['SystemRoot','WINDIR','PATH','PATHEXT','TEMP','TMP','COMSPEC'])if(process.env[key])env[key]=process.env[key];
const child=spawn(process.execPath,[resolve(root,'scripts/v41-integration/start.mjs'),'--diagnostics'],{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
let output='',exited=false;child.on('exit',()=>{exited=true;});for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{output+=b;});
const results=[];
try{
 const deadline=Date.now()+180000;
 while(Date.now()<deadline&&!exited&&!output.includes('Ready in')&&!output.includes('External network excluded'))await new Promise(r=>setTimeout(r,250));
 if(!exited&&output.includes('Ready in')&&!output.includes('External network excluded'))for(const locale of ['fr','ar']){try{const r=await fetch(`http://127.0.0.1:3330/${locale}`,{signal:AbortSignal.timeout(60000)});const body=await r.text();results.push({locale,status:r.status,hasBrand:body.includes('ContratPro'),hasDirection:body.includes(`dir="${locale==='ar'?'rtl':'ltr'}"`),hasDevClient:/webpack-hmr|next-devtools|turbopack-hot-reloader/.test(body)});}catch(e){results.push({locale,error:e.message});}}
 await new Promise(r=>setTimeout(r,3000));
}finally{
 if(!exited){if(process.platform==='win32')await new Promise(r=>spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'}).on('exit',r));else child.kill('SIGTERM');}
 await mkdir(resolve(root,'.verification/v41-startup'),{recursive:true});await writeFile(resolve(root,'.verification/v41-startup/startup.log'),output);await writeFile(resolve(root,'.verification/v41-startup/http.json'),JSON.stringify(results,null,2));
 console.log(output);console.log(JSON.stringify(results));if(results.length!==2||results.some(r=>r.status!==200||!r.hasBrand||!r.hasDirection||r.hasDevClient)||output.includes('External network excluded')||output.includes('external-request')||output.includes('fetch-initiator')||output.includes('uncaughtException')||output.includes('unhandledRejection'))process.exitCode=1;
}
