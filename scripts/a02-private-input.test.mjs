import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {inspect,format} from 'node:util';
import {readFile} from 'node:fs/promises';
import {readA02Credentials,createInMemoryCredentialProvider,readA02AdminCredentials,createInMemoryAdminHeaderProvider} from './a02-private-input.mjs';
import {bootstrapA02Sessions} from './a02-session-transport.mjs';

// Fictional test strings only, no operator input or usable Development credentials.
const values=()=>Object.fromEntries(['A','B','U'].map(label=>[label,{email:`${label.toLowerCase()}@a02-fixture.invalid`,password:`fixture-private-${label}-only`}]));
function terminal(){
  const input=new EventEmitter();input.isTTY=true;input.isRaw=false;let paused=true;
  input.isPaused=()=>paused;input.pause=()=>{paused=true;};input.resume=()=>{paused=false;};input.setRawMode=value=>{input.isRaw=value;};
  let text='';const output={isTTY:true,write:value=>{text+=value;}};
  return {input,output,get text(){return text;}};
}
const payload=input=>['A','B','U'].flatMap(label=>[input[label].email,input[label].password]).join('\r\n')+'\r\n';
function assertNoPrivate(text,input){for(const item of Object.values(input)){assert.ok(!text.includes(item.email));assert.ok(!text.includes(item.password));}}
test('hidden interactive capture reuses the synchronous A/B/U provider and restores TTY',async()=>{
  const tty=terminal(),input=values();const controller=new AbortController();
  const pending=readA02Credentials({...tty,signal:controller.signal});assert.equal(tty.input.isRaw,true);
  tty.input.emit('data',Buffer.from(payload(input)));
  const port=await pending;
  for(const label of ['A','B','U'])assert.equal(port.provider(label).email,input[label].email);
  assertNoPrivate(tty.text,input);assert.equal(tty.input.isRaw,false);assert.equal(tty.input.isPaused(),true);assert.equal(tty.input.listenerCount('data'),0);
  port.dispose();assert.throws(()=>port.provider('A'),/^Error: A02_CREDENTIAL_INPUT_BLOCKED$/);
});
test('console-style inspect, format and JSON redact email/password handles',()=>{
  const input=values(),port=createInMemoryCredentialProvider(input),handle=port.provider('A');
  for(const text of [inspect(handle),inspect({credentials:handle}),format('%o',handle),format('%j',handle),JSON.stringify({credentials:handle}),
    inspect(handle,{customInspect:false,showHidden:true}),JSON.stringify(port)])assertNoPrivate(text,input);
  assert.match(JSON.stringify(handle),/REDACTED/);
  assert.deepEqual(Object.keys(handle),['email','password']);assert.throws(()=>{handle.password='changed';},TypeError);
  port.dispose();assert.throws(()=>handle.email,/A02_CREDENTIAL_INPUT_BLOCKED/);
});
test('non-TTY, existing input consumers and already-raw terminals fail closed',async()=>{
  for(const mode of ['pipe','consumer','raw']){
    const tty=terminal();if(mode==='pipe')tty.input.isTTY=false;
    if(mode==='consumer')tty.input.on('data',()=>{});if(mode==='raw')tty.input.isRaw=true;
    await assert.rejects(readA02Credentials({...tty,signal:new AbortController().signal}),/^Error: A02_CREDENTIAL_INPUT_BLOCKED$/);
    assert.equal(tty.text,'');
  }
});
test('cancel, stream failure, EOF and timeout never echo partial private input',async()=>{
  for(const mode of ['ctrl-c','abort','error','eof','timeout']){
    const tty=terminal(),controller=new AbortController();
    const pending=readA02Credentials({...tty,signal:controller.signal,timeoutMs:mode==='timeout'?5:1000});
    tty.input.emit('data',Buffer.from('fixture-private-partial'));
    if(mode==='ctrl-c')tty.input.emit('data',Buffer.from('\x03'));
    if(mode==='abort')controller.abort();if(mode==='error')tty.input.emit('error',Error('fixture-private-error'));
    if(mode==='eof')tty.input.emit('end');
    await assert.rejects(pending,/^Error: A02_CREDENTIAL_INPUT_BLOCKED$/);
    assert.ok(!tty.text.includes('fixture-private'));assert.equal(tty.input.isRaw,false);assert.equal(tty.input.listenerCount('data'),0);
  }
});
test('invalid/duplicate addresses and invalid passwords expose only a fixed error',()=>{
  for(const kind of ['duplicate','email','password']){
    const input=values();if(kind==='duplicate')input.B.email=input.A.email.toUpperCase();
    if(kind==='email')input.A.email='fixture-private-invalid';if(kind==='password')input.A.password='short';
    assert.throws(()=>createInMemoryCredentialProvider(input),/^Error: A02_CREDENTIAL_INPUT_BLOCKED$/);
  }
});
test('protected credentials deliberately serialize only at Auth wire boundary; sessions redact diagnostics',async()=>{
  const input=values(),port=createInMemoryCredentialProvider(input);const now=1900000000000;
  const subjects={A:'10000000-0000-4000-8000-000000000001',B:'10000000-0000-4000-8000-000000000002',U:'10000000-0000-4000-8000-000000000003'};
  const origin='https://gllsiklbvqpxzucvkehw.supabase.co';let index=0,current;const tokens=[];
  const send=async(url,init)=>{
    let body;
    if(init.method==='POST'){
      current=['A','B','U'][index++];const sent=JSON.parse(init.body);
      assert.equal(sent.email,input[current].email);assert.equal(sent.password,input[current].password);
      const token=`header.${Buffer.from(JSON.stringify({sub:subjects[current],iss:`${origin}/auth/v1`,aud:'authenticated',role:'authenticated',is_anonymous:false,exp:now/1000+120})).toString('base64url')}.unsigned`;
      tokens.push(token);body={access_token:token,refresh_token:'fixture-refresh-never-return'};
    }else body={id:subjects[current],aud:'authenticated',role:'authenticated',is_anonymous:false};
    const response=new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}});Object.defineProperty(response,'url',{value:url});return response;
  };
  try{
    const sessions=await bootstrapA02Sessions({projectRef:'gllsiklbvqpxzucvkehw',subjects,canonical:{A:null,B:null,U:null},phase:'fixture-setup',publicKey:'sb_publishable_fixture',credentialProvider:port.provider},
      {send,now:()=>now,signal:new AbortController().signal});
    for(const label of ['A','B','U'])assert.equal(sessions[label].refresh_token,undefined);
    for(const text of [inspect(sessions),JSON.stringify(sessions),inspect(sessions.A),JSON.stringify(sessions.A)]){
      assertNoPrivate(text,input);for(const token of tokens)assert.ok(!text.includes(token));assert.ok(!text.includes('fixture-refresh-never-return'));
    }
    assert.equal(structuredClone(sessions).A.accessToken,tokens[0]);
  }finally{port.dispose();}
});
test('private-input module contains no credential generation, network, file or environment access',async()=>{
  const source=await readFile(new URL('./a02-private-input.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/randomBytes|randomUUID|writeFile|readFile|process\.env|process\.argv|console\.|fetch\(|httpsRequest/);
});
test('Admin channel reuses hidden TTY and yields disposable, redacted existing header contract',async()=>{
  const tty=terminal(),api='offline-apikey-private-fixture',bearer='offline-bearer-private-fixture';
  const pending=readA02AdminCredentials({...tty,signal:new AbortController().signal});
  tty.input.emit('data',Buffer.from(`${api}\r\n${bearer}\r\n`));const port=await pending,handle=port.provider();
  assert.equal(handle.apikey,api);assert.equal(handle.Authorization,`Bearer ${bearer}`);
  assert.deepEqual(Object.keys(handle).sort(),['Authorization','apikey']);
  for(const text of [tty.text,inspect(handle),inspect({headers:handle}),JSON.stringify(handle),format('%o',handle),inspect(handle,{customInspect:false,showHidden:true})]){
    assert.ok(!text.includes(api));assert.ok(!text.includes(bearer));
  }
  assert.equal(tty.input.isRaw,false);port.dispose();assert.throws(()=>port.provider(),/A02_CREDENTIAL_INPUT_BLOCKED/);
  assert.throws(()=>handle.Authorization,/A02_CREDENTIAL_INPUT_BLOCKED/);
});
test('Admin channel rejects wrong target, malformed/header-injection input and aborts without leaking partial values',async()=>{
  for(const value of [{projectRef:'other',apikey:'x'.repeat(32),bearerToken:'y'.repeat(32)},
    {projectRef:'gllsiklbvqpxzucvkehw',apikey:'x'.repeat(32)+'\r\nprivate',bearerToken:'y'.repeat(32)},
    {projectRef:'gllsiklbvqpxzucvkehw',apikey:'x'.repeat(32)+'\0',bearerToken:'y'.repeat(32)},
    {projectRef:'gllsiklbvqpxzucvkehw',apikey:'short',bearerToken:'y'.repeat(32)}])
    assert.throws(()=>createInMemoryAdminHeaderProvider(value),/^Error: A02_CREDENTIAL_INPUT_BLOCKED$/);
  const tty=terminal(),c=new AbortController();const pending=readA02AdminCredentials({...tty,signal:c.signal});
  tty.input.emit('data',Buffer.from('offline-private-partial'));c.abort();
  await assert.rejects(pending,/^Error: A02_CREDENTIAL_INPUT_BLOCKED$/);assert.ok(!tty.text.includes('offline-private-partial'));
  assert.equal(tty.input.isRaw,false);assert.equal(tty.input.listenerCount('data'),0);
});
