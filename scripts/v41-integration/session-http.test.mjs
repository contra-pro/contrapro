// Bounded foreground test only. Does not detach a process or test persistent launch authorization.
import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import {serveSession,requestSession} from './session.mjs';
const root=resolve(import.meta.dirname,'../..');
test('single-PID production review serves FR/AR and shuts down through authenticated control',{timeout:60000},async()=>{
 let started=false;const results=[];
 try{
  await serveSession();started=true;
  const status=await requestSession('status');assert.equal(status.pid,process.pid);assert.equal(status.state,'running');
  await assert.rejects(serveSession(),/EEXIST/);
  for(const locale of ['fr','ar']){const r=await fetch(`http://127.0.0.1:3330/${locale}`,{signal:AbortSignal.timeout(10000)});const body=await r.text();assert.equal(r.status,200);assert.match(body,new RegExp(`dir="${locale==='ar'?'rtl':'ltr'}"`));results.push({locale,status:r.status,pid:status.pid});}
 }finally{
  if(started){await requestSession('stop');const deadline=Date.now()+15000;let removed=false;while(Date.now()<deadline){try{await readFile(resolve(root,'.verification/v41-session/session.json'));}catch{removed=true;break;}await new Promise(r=>setTimeout(r,100));}assert.equal(removed,true);}
 }
 await assert.rejects(fetch('http://127.0.0.1:3330/fr',{signal:AbortSignal.timeout(1000)}));
 await writeFile(resolve(root,'.verification/v41-session/foreground-test.json'),JSON.stringify({mode:'bounded foreground, not persistent',results,shutdown:'confirmed'},null,2));
});
