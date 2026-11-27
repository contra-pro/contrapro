import {readFile,writeFile,rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
export const heartbeatMaxAgeMs=240000;
export function createHeartbeat(file,now=Date.now){
 let queue=Promise.resolve();
 return state=>{
  queue=queue.then(async()=>{const value={version:1,pid:process.pid,at:now(),phase:state.phase,ok:state.ok===true};const temp=`${file}.${process.pid}.${randomUUID()}.tmp`;await writeFile(temp,JSON.stringify(value),{mode:0o600,flag:'wx'});await rename(temp,file);});
  return queue;
 };
}
export async function workerHealth(file,{now=Date.now,alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}},ready=true}={}){
 try{const raw=await readFile(file,'utf8');if(raw.length>1024)return false;const v=JSON.parse(raw),age=now()-v.at;
  return v.version===1&&Number.isSafeInteger(v.pid)&&v.pid>0&&Number.isSafeInteger(v.at)&&age>=0&&age<=heartbeatMaxAgeMs&&v.phase==='running'&&typeof v.ok==='boolean'&&(!ready||v.ok)&&alive(v.pid);
 }catch{return false;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){process.exitCode=await workerHealth(process.argv[2]??'/tmp/contratpro-worker-health.json',{ready:!process.argv.includes('--live')})?0:1;}
