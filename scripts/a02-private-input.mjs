/** A02-only private input. Import is inert; never reads credentials from argv/env/files. */
import {StringDecoder} from 'node:string_decoder';
const fail=()=>{throw Error('A02_CREDENTIAL_INPUT_BLOCKED');};
const inspect=Symbol.for('nodejs.util.inspect.custom');
export function redactA02Diagnostics(value,label) {
  Object.defineProperties(value,{
    toJSON:{value:()=>`[A02 ${label} REDACTED]`},
    [inspect]:{value:()=>`[A02 ${label} REDACTED]`},
  });
  return value;
}

/** Exact A/B/U memory port. Explicit extraction/spread and hostile debugging remain unsafe. */
export function createInMemoryCredentialProvider(input) {
  try {
    if(!input||Object.keys(input).sort().join()!=='A,B,U')fail();
    const secrets=new Map();const emails=new Set();
    for(const label of ['A','B','U']){
      const value=input[label];
      if(!value||Object.keys(value).sort().join()!=='email,password'
        ||typeof value.email!=='string'||value.email.length>320||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)
        ||typeof value.password!=='string'||value.password.length<12||value.password.length>1024
        ||emails.has(value.email.toLowerCase()))fail();
      emails.add(value.email.toLowerCase());secrets.set(label,{email:value.email,password:value.password});
    }
    const provider=label=>{
      if(!secrets.has(label))fail();
      const handle={};
      for(const key of ['email','password'])Object.defineProperty(handle,key,{enumerable:true,get:()=>{
        if(!secrets.has(label))fail();return secrets.get(label)[key];
      }});
      return Object.freeze(redactA02Diagnostics(handle,'credentials'));
    };
    return Object.freeze({provider,dispose:()=>secrets.clear()});
  }catch{fail();}
}

/** Dedicated local TTY only. Hide BOTH emails and passwords, no echo or length counts.
 * No import-time prompt; use from approved isolated executor, never a REPL.
 */
export function readA02Credentials(options={}) { return readPrivateFields('cohort',options); }

/** Prepare only: no real key discovery/authority inference. Same hidden TTY mechanism. */
export function readA02AdminCredentials(options={}) { return readPrivateFields('admin',options); }
export function createInMemoryAdminHeaderProvider({projectRef,apikey,bearerToken}={}) {
  if(projectRef!=='gllsiklbvqpxzucvkehw'||typeof apikey!=='string'||! /^[\x21-\x7e]{20,8192}$/.test(apikey)
    ||typeof bearerToken!=='string'||! /^[\x21-\x7e]{20,8192}$/.test(bearerToken))fail();
  let secret={apikey,bearerToken};
  const provider=()=>{
    if(!secret)fail();const handle={};
    Object.defineProperties(handle,{
      apikey:{enumerable:true,get:()=>{if(!secret)fail();return secret.apikey;}},
      Authorization:{enumerable:true,get:()=>{if(!secret)fail();return `Bearer ${secret.bearerToken}`;}},
    });
    return Object.freeze(redactA02Diagnostics(handle,'Admin headers'));
  };
  return Object.freeze({provider,dispose:()=>{secret=null;}});
}
async function readPrivateFields(kind,{input=process.stdin,output=process.stderr,signal,timeoutMs=180000}={}) {
  if(!input?.isTTY||!output?.isTTY||input.isRaw||typeof input.setRawMode!=='function'
    ||!signal||signal.aborted||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>180000
    ||input.listenerCount('data')||input.listenerCount('readable'))fail();
  return await new Promise((resolve,reject)=>{
    const fields=kind==='admin'?[['Admin','apikey'],['Admin','bearerToken']]:[['A','email'],['A','password'],['B','email'],['B','password'],['U','email'],['U','password']];
    let values=kind==='admin'?{Admin:{}}:{A:{},B:{},U:{}};let buffer='';let index=0;let done=false;let timer;let skipLf=false;
    const decoder=new StringDecoder('utf8');const paused=input.isPaused();
    const finish=ok=>{
      if(done)return;done=true;clearTimeout(timer);
      input.removeListener('data',onData);input.removeListener('end',onFailure);input.removeListener('error',onFailure);
      signal.removeEventListener('abort',onFailure);
      try{input.setRawMode(false);if(paused)input.pause();output.write('\n');}catch{ok=false;}
      buffer='';
      try{if(ok)resolve(kind==='admin'?createInMemoryAdminHeaderProvider({projectRef:'gllsiklbvqpxzucvkehw',...values.Admin}):createInMemoryCredentialProvider(values));else reject(Error('A02_CREDENTIAL_INPUT_BLOCKED'));}
      catch{reject(Error('A02_CREDENTIAL_INPUT_BLOCKED'));}
      finally{values=null;}
    };
    const onFailure=()=>finish(false);
    const prompt=()=>output.write(`A02 ${fields[index][0]} ${fields[index][1]} (hidden): `);
    const onData=chunk=>{
      try{
        for(const ch of decoder.write(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk))){
          if(done)break;
          if(ch==='\u0003'||ch==='\u0004'){finish(false);break;}
          if(ch==='\n'&&skipLf){skipLf=false;continue;}skipLf=false;
          if(ch==='\r'||ch==='\n'){
            skipLf=ch==='\r';const [label,key]=fields[index];values[label][key]=buffer;buffer='';index++;
            output.write('\n');if(index===fields.length){finish(true);break;}prompt();
          }else if(ch==='\u007f'||ch==='\b'){buffer=Array.from(buffer).slice(0,-1).join('');}
          else if(/[\x00-\x1f\x7f]/.test(ch)){finish(false);break;}
          else{buffer+=ch;if(buffer.length>(kind==='admin'?8192:fields[index][1]==='email'?320:1024)){finish(false);break;}}
        }
      }catch{finish(false);}
    };
    try{
      input.setRawMode(true);input.on('data',onData);input.once('end',onFailure);input.once('error',onFailure);
      signal.addEventListener('abort',onFailure,{once:true});if(signal.aborted){finish(false);return;}timer=setTimeout(onFailure,timeoutMs);
      prompt();input.resume();
    }catch{finish(false);}
  });
}
