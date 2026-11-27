// One foreground server process. Persistence is provided only by authorized PowerShell Start-Process.
import {createServer as createHttpServer} from 'node:http';
import {createServer as createPipeServer,createConnection} from 'node:net';
import {readFile,writeFile,mkdir,unlink,open} from 'node:fs/promises';
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {reviewEnvironment} from './start.mjs';
const root=resolve(import.meta.dirname,'../..'),directory=resolve(root,'.verification/v41-session');
const recordPath=resolve(directory,'session.json'),lockPath=resolve(directory,'session.lock');
const pipeName='contratpro-v41-'+createHash('sha256').update(root.toLowerCase()).digest('hex').slice(0,20);
const pipe=process.platform==='win32'?`\\\\.\\pipe\\${pipeName}`:resolve(directory,'control.sock');
export function authenticates(expected,actual){if(typeof actual!=='string')return false;const a=Buffer.from(actual),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b);}
export async function requestSession(command){
 const state=JSON.parse(await readFile(recordPath,'utf8'));
 if(state.pipe!==pipe||!Number.isSafeInteger(state.pid)||typeof state.token!=='string')throw Error('Invalid session record; no process was signalled');
 return await new Promise((accept,reject)=>{let text='';const socket=createConnection(pipe);socket.setTimeout(5000,()=>socket.destroy(Error('Session control timeout')));socket.on('error',reject);socket.on('connect',()=>socket.write(JSON.stringify({command,token:state.token})+'\n'));socket.on('data',b=>{text+=b;if(text.length>8192)socket.destroy(Error('Oversized control response'));});socket.on('end',()=>{try{const reply=JSON.parse(text);if(reply.pid!==state.pid)throw Error('Session PID mismatch; no process was signalled');accept(reply);}catch(e){reject(e);}});});
}
export async function serveSession(){
 // Strip all inherited application credentials before any framework module is imported.
 const env=reviewEnvironment();for(const key of Object.keys(process.env))delete process.env[key];Object.assign(process.env,env);
 const require=createRequire(import.meta.url);require(resolve(root,'scripts/ui-review/isolate.cjs'));
 await mkdir(directory,{recursive:true});
 const lock=await open(lockPath,'wx'); // Never overwrite an existing session, including an unverified stale PID.
 const token=randomBytes(32).toString('hex'),startedAt=new Date().toISOString();let http,control,app,closing=false;
 const state={pid:process.pid,pipe,token,startedAt,host:'127.0.0.1',port:3330};
 await lock.writeFile(JSON.stringify({pid:process.pid,startedAt,host:state.host,port:3330}));
 async function cleanup(){await Promise.allSettled([unlink(recordPath),unlink(lockPath)]);await lock.close();}
 async function stop(){if(closing)return;closing=true;const deadline=setTimeout(()=>process.exit(1),10000);try{http?.closeAllConnections();if(http?.listening)await new Promise(r=>http.close(r));await app?.close();if(control?.listening)await new Promise(r=>control.close(r));await cleanup();clearTimeout(deadline);process.exitCode=0;}catch(e){console.error(e.message);await cleanup();process.exitCode=1;}}
 const signal=()=>{void stop();};process.on('SIGINT',signal);process.on('SIGTERM',signal);
 try{
  // Next's production app and HTTP server share this PID: no detached worker/server child to orphan.
  process.chdir(resolve(root,'apps/web'));
  require(resolve(root,'node_modules/next/dist/server/require-hook'));
  const next=require(resolve(root,'node_modules/next')).default??require(resolve(root,'node_modules/next'));
  app=next({dev:false,dir:resolve(root,'apps/web'),hostname:'127.0.0.1',port:3330});await app.prepare();
  http=createHttpServer(app.getRequestHandler());await new Promise((r,j)=>{http.once('error',j);http.listen(3330,'127.0.0.1',r);});
  control=createPipeServer(socket=>{let data='';socket.setTimeout(5000,()=>socket.destroy());socket.on('error',()=>{});socket.on('data',b=>{data+=b;if(data.length>1024){socket.destroy();return;}if(!data.endsWith('\n'))return;let message;try{message=JSON.parse(data);}catch{socket.destroy();return;}if(!authenticates(token,message.token)){socket.destroy();return;}const reply={pid:process.pid,startedAt,host:'127.0.0.1',port:3330,state:closing?'stopping':'running'};socket.end(JSON.stringify(reply));if(message.command==='stop')socket.once('close',()=>{void stop();});});});
  await new Promise((r,j)=>{control.once('error',j);control.listen(pipe,r);});await writeFile(recordPath,JSON.stringify(state,null,2),{mode:0o600});
  console.log(JSON.stringify({state:'running',pid:process.pid,startedAt,host:state.host,port:3330}));
 }catch(e){await stop();throw e;}
}
export async function sessionCommand(command){
 if(command==='serve')return serveSession();
 if(!['status','stop'].includes(command))throw Error('Use serve, status or stop');
 try{await readFile(recordPath);}catch(e){if(e.code!=='ENOENT')throw e;try{const pending=JSON.parse(await readFile(lockPath,'utf8'));throw Error(`Session starting or stale: recorded PID ${pending.pid}. Inspect logs and that exact process; no process was killed.`);}catch(lockError){if(lockError.code!=='ENOENT')throw lockError;console.log(JSON.stringify({state:'stopped'}));return;}}
 let state;try{state=await requestSession(command);}catch(e){throw Error(`No verified session connection: ${e.message}. No PID was killed. A stale lock requires manual process/port inspection.`);}
 if(command==='status'){
  const routes=[];for(const locale of ['fr','ar']){const response=await fetch(`http://127.0.0.1:3330/${locale}`,{signal:AbortSignal.timeout(10000)});await response.arrayBuffer();routes.push({locale,status:response.status});}console.log(JSON.stringify({...state,routes}));if(routes.some(r=>r.status!==200))process.exitCode=1;
 }else{
  const deadline=Date.now()+15000;while(Date.now()<deadline){try{await requestSession('status');}catch{try{await readFile(recordPath); }catch{console.log(JSON.stringify({state:'stopped',pid:state.pid}));return;}}await new Promise(r=>setTimeout(r,100));}throw Error('Shutdown not confirmed; inspect the exact recorded PID. No broad process termination performed.');
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{await sessionCommand(process.argv[2]);}catch(e){console.error(e.message);process.exitCode=1;}}
