// Manual local review only. No credentials, feature flags, or external providers.
import {spawn} from 'node:child_process';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..'),preload=resolve(root,'scripts/ui-review/isolate.cjs').replaceAll('\\','/');
export function reviewEnvironment(source=process.env,diagnostics=false){
 const env={NODE_OPTIONS:`--require="${preload}"`,NEXT_TELEMETRY_DISABLED:'1',NODE_ENV:'production',A6_ISOLATED_REVIEW:'1',...(diagnostics?{A6_ISOLATION_DIAGNOSTICS:'1'}:{})};
 for(const key of ['SystemRoot','WINDIR','PATH','PATHEXT','TEMP','TMP','COMSPEC'])if(source[key])env[key]=source[key];
 return env;
}
// Dev-mode advisory assessment and HMR version polling both access the npm registry.
// Build/start the real production application so neither dev-only module is initialized.
export const reviewStages=[['build'],['start','--hostname','127.0.0.1','--port','3330']];
export async function startReview(){
 const env=reviewEnvironment(process.env,process.argv.includes('--diagnostics'));let child,stopping=false;
 const stop=()=>{stopping=true;child?.kill('SIGTERM');};process.on('SIGINT',stop);process.on('SIGTERM',stop);
 try{for(const args of process.argv.includes('--build-only')?reviewStages.slice(0,1):reviewStages){if(stopping)break;child=spawn(process.execPath,[resolve(root,'node_modules/next/dist/bin/next'),...args],{cwd:resolve(root,'apps/web'),env,windowsHide:true,stdio:'inherit'});const code=await new Promise((r,reject)=>{child.on('error',reject);child.on('exit',r);});if(code!==0){process.exitCode=code??1;break;}}}finally{process.off('SIGINT',stop);process.off('SIGTERM',stop);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await startReview();
