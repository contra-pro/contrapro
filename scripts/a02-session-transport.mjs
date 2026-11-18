/** Explicitly called operator ports only. Import makes no network/credential access.
 * No SDK, refresh, persistence, process.env, CLI, raw response/error logging or retries.
 */
import { request as httpsRequest } from "node:https";
import { validateCohort } from "./a02-cohort-artifacts.mjs";
import { redactA02Diagnostics } from "./a02-private-input.mjs";
const origin="https://gllsiklbvqpxzucvkehw.supabase.co";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=()=>{throw Error("A02_BLOCKED");};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const keyOk=key=>typeof key==='string'&&/^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
const jwtOk=token=>typeof token==='string'&&token.length<=8192&&/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);

function validateRequest(url,init) {
  if(typeof url!=='string') fail();
  const route=`${init?.method} ${url}`;
  if(![
    `POST ${origin}/auth/v1/token?grant_type=password`, `GET ${origin}/auth/v1/user`,
    `GET ${origin}/rest/v1/rpc/contratpro_auth_access`,
    `POST ${origin}/rest/v1/rpc/contratpro_a02_fixture_provision`,
  ].includes(route)||init.redirect!=='error'||init.credentials!=='omit'||!init.signal||init.signal.aborted
    || !object(init.headers)||Object.keys(init.headers).some(key=>!['Accept','apikey','Authorization','Content-Type'].includes(key))
    || init.headers.Accept!=='application/json'||!keyOk(init.headers.apikey)) fail();
  if(init.method==='GET') {
    if(init.body!==undefined||!jwtOk(init.headers.Authorization?.replace(/^Bearer /,''))||!init.headers.Authorization.startsWith('Bearer ')) fail();
  } else if(url.endsWith('/contratpro_a02_fixture_provision')) {
    if(init.body!==undefined||!init.headers.Authorization?.startsWith('Bearer ')
      ||!jwtOk(init.headers.Authorization.slice(7))||init.headers['Content-Type']!==undefined) fail();
  } else {
    if(init.headers.Authorization!==undefined||init.headers['Content-Type']!=='application/json'||typeof init.body!=='string'||Buffer.byteLength(init.body)>4096) fail();
    const body=JSON.parse(init.body);
    if(!object(body)||Object.keys(body).sort().join()!=='email,password'||typeof body.email!=='string'||typeof body.password!=='string') fail();
  }
}

/** Direct HTTPS only; explicit peer/hostname validation, no proxy or redirect handling.
 * Injected request implementation exists solely for deterministic offline tests.
 */
export function createA02HttpsTransport({ requestImpl=httpsRequest }={}) {
  return async (url,init)=>{
    try {
      validateRequest(url,init);
      return await new Promise((resolve,reject)=>{
        let deadline;
        const req=requestImpl(url,{method:init.method,headers:init.headers,signal:init.signal,
          agent:false,rejectUnauthorized:true,servername:'gllsiklbvqpxzucvkehw.supabase.co',maxHeaderSize:16384},res=>{
          let size=0;const chunks=[];const limit=url.includes('/rest/v1/rpc/')?8192:32768;
          res.on('data',chunk=>{size+=chunk.length;if(size>limit){clearTimeout(deadline);req.destroy();reject(Error('A02_BLOCKED'));return;}chunks.push(chunk);});
          res.on('error',()=>{clearTimeout(deadline);reject(Error('A02_BLOCKED'));});
          res.on('end',()=>{
            clearTimeout(deadline);
            try {
              const headers=new Headers();
              for(let index=0;index<res.rawHeaders.length;index+=2) headers.append(res.rawHeaders[index],res.rawHeaders[index+1]);
              const response=new Response([204,205,304].includes(res.statusCode)?null:Buffer.concat(chunks),{status:res.statusCode,headers});
              Object.defineProperty(response,'url',{value:url});resolve(response);
            } catch {reject(Error('A02_BLOCKED'));}
          });
        });
        deadline=setTimeout(()=>{req.destroy();reject(Error('A02_BLOCKED'));},7000);
        req.setTimeout(7000,()=>req.destroy(Error('A02_BLOCKED')));
        req.on('error',()=>{clearTimeout(deadline);reject(Error('A02_BLOCKED'));});req.end(init.body);
      });
    } catch {fail();}
  };
}

async function authJson(send,url,init,signal) {
  const controller=new AbortController();
  const abort=()=>controller.abort(); signal.addEventListener('abort',abort,{once:true});
  if(signal.aborted) abort();
  const timer=setTimeout(abort,7000);
  try {
    return await Promise.race([
      new Promise((_,reject)=>{
        if(controller.signal.aborted) reject(Error('A02_BLOCKED'));
        else controller.signal.addEventListener('abort',()=>reject(Error('A02_BLOCKED')),{once:true});
      }),
      (async()=>{
        if(controller.signal.aborted) fail();
        const response=await send(url,{...init,redirect:'error',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});
        if(controller.signal.aborted||response.url!==url||response.redirected||response.status!==200
          ||response.headers.has('location')||response.headers.has('set-cookie')
          ||!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')??'')) fail();
        const reader=response.body?.getReader();if(!reader) fail();
        const chunks=[];let size=0;
        try {
          while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>32768){void reader.cancel().catch(()=>{});fail();}chunks.push(part.value);}
        }finally{reader.releaseLock();}
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
      })(),
    ]);
  } finally {clearTimeout(timer);signal.removeEventListener('abort',abort);controller.abort();}
}

/** Six calls maximum: password issuance + independent GET user per A/B/U.
 * Obtain explicit Gate 2 Auth/session approval BEFORE calling. No default send.
 * credentialProvider must already hold approved synthetic credentials in memory.
 * Snapshot baseline only; baseline evidence is independently established, not JWT metadata.
 */
export async function bootstrapA02Sessions({projectRef,subjects,canonical,publicKey,credentialProvider,phase='a02'}, {send,now=Date.now,signal}={}) {
  try {
    if(projectRef!=='gllsiklbvqpxzucvkehw'||!keyOk(publicKey)||typeof credentialProvider!=='function'
      ||typeof send!=='function'||!signal||signal.aborted||!object(subjects)||Object.keys(subjects).sort().join()!=='A,B,U'
      ||!Object.values(subjects).every(id=>uuid.test(id))||new Set(Object.values(subjects).map(id=>id.toLowerCase())).size!==3
      ||!['a02','fixture-setup'].includes(phase)||!object(canonical)||Object.keys(canonical).sort().join()!=='A,B,U'||canonical.U!==null) fail();
    if(phase==='fixture-setup') {if(canonical.A!==null||canonical.B!==null)fail();}
    else if(![canonical.A,canonical.B].every(id=>uuid.test(id))
      ||new Set([...Object.values(subjects),canonical.A,canonical.B].map(id=>id.toLowerCase())).size!==5) fail();
    subjects={...subjects};canonical={...canonical};
    const start=now();if(!Number.isSafeInteger(start)) fail();
    const sessions={}; const end=start+30000; // six requests share a bounded overall phase
    const controller=new AbortController();const abort=()=>controller.abort();
    signal.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,30000);
    try {
      for(const label of ['A','B','U']) {
        if(controller.signal.aborted||now()>=end) fail();
        // Credential supply is a synchronous, already-populated memory port, not I/O.
        let credentials=credentialProvider(label);
        if(!object(credentials)||Object.keys(credentials).sort().join()!=='email,password'
          ||typeof credentials.email!=='string'||credentials.email.length>320||!credentials.email.includes('@')
          ||typeof credentials.password!=='string'||credentials.password.length<12||credentials.password.length>1024) fail();
        const headers={Accept:'application/json',apikey:publicKey};
        let tokenResponse;
        try { tokenResponse=await authJson(send,`${origin}/auth/v1/token?grant_type=password`,{
          method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({email:credentials.email,password:credentials.password})},controller.signal);
        } finally {credentials=null;}
        if(!object(tokenResponse)||!jwtOk(tokenResponse.access_token)) fail();
        const accessToken=tokenResponse.access_token;
        tokenResponse=null; // refresh token/raw response are not returned or retained by this module
        const verified=await authJson(send,`${origin}/auth/v1/user`,{method:'GET',headers:{...headers,Authorization:`Bearer ${accessToken}`}},controller.signal);
        const claims=JSON.parse(Buffer.from(accessToken.split('.')[1],'base64url').toString('utf8'));
        const verifiedAt=now();
        if(!Number.isSafeInteger(verifiedAt)||verifiedAt>=end||!object(verified)||verified.id!==subjects[label]
          ||verified.role!=='authenticated'||verified.is_anonymous!==false||verified.aud!=='authenticated'
          ||!object(claims)||claims.sub!==verified.id||claims.iss!==`${origin}/auth/v1`||claims.aud!=='authenticated'
          ||claims.role!=='authenticated'||claims.is_anonymous!==false||!Number.isSafeInteger(claims.exp)
          ||!Number.isSafeInteger(claims.exp*1000)||claims.exp*1000<=verifiedAt+10000) fail();
        // Auth GET, not decoded claims alone, establishes live session identity.
        sessions[label]=redactA02Diagnostics({accessToken,subject:verified.id,canonicalUserId:canonical[label],projectRef,
          isSynthetic:true,source:'operator-verified-existing-session',verifiedAt,expiresAt:claims.exp*1000},'session');
      }
      return redactA02Diagnostics(sessions,'sessions');
    } finally {clearTimeout(timer);signal.removeEventListener('abort',abort);controller.abort();}
  } catch {fail();}
}

/** Gate 2 only. Exactly one attempt per label in this process, never auto-retry.
 * Confirmation is independent exact-subject mapping observation, not RPC acknowledgement.
 * Backend concurrency/idempotency is delegated unchanged to migration 0007.
 */
export function createFixtureProvisioner(input,{send,confirmMapping,now=Date.now,stateAcceptance}={}) {
  const cohort=validateCohort(input,now());
  if(typeof send!=='function'||typeof confirmMapping!=='function') fail();
  const used=new Set();const confirmedCanonical=new Set();
  return async(label,session,{publicKey,signal}={})=>{
    let attempted=false,intent;
    try {
      session=structuredClone(session);
      if(!['A','B'].includes(label)||used.has(label)||!signal||signal.aborted||!keyOk(publicKey)
        ||!Number.isSafeInteger(now())
        ||!session||session.subject!==cohort[label]||!jwtOk(session.accessToken)
        ||!Number.isSafeInteger(session.verifiedAt)||now()-session.verifiedAt>60000||session.verifiedAt>now()
        ||session.expiresAt<=now()||now()>=Date.parse(cohort.expiresAt)) fail();
      const claims=JSON.parse(Buffer.from(session.accessToken.split('.')[1],'base64url'));
      if(claims.sub!==cohort[label]||claims.role!=='authenticated'||claims.aud!=='authenticated'
        ||claims.is_anonymous!==false||claims.iss!==`${origin}/auth/v1`||claims.exp*1000!==session.expiresAt) fail();
      if(stateAcceptance){intent=stateAcceptance.begin({operation:'provision',label,signal});if(intent.status!=='PASS')fail();}
      used.add(label);attempted=true;
      const outcome=await authJson(send,`${origin}/rest/v1/rpc/contratpro_a02_fixture_provision`,{
        method:'POST',headers:{Accept:'application/json',apikey:publicKey,Authorization:`Bearer ${session.accessToken}`}},signal);
      if(!['created','existing'].includes(outcome)||!Number.isSafeInteger(now())||now()>=session.expiresAt||now()>=Date.parse(cohort.expiresAt)) fail();
      if(stateAcceptance){
        const state=stateAcceptance.transport({attemptId:intent.attemptId,observation:outcome==='created'?'ACKNOWLEDGED':'EXISTING'});
        if(state.reason!=='ACK_REQUIRES_INDEPENDENT_STATE')fail();
      }
      // Confirmation has its own bounded cancellation, even for a non-cooperative observer.
      const controller=new AbortController(); const abort=()=>controller.abort();
      signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
      const timer=setTimeout(abort,2000);let mapping;
      try {
        mapping=await Promise.race([Promise.resolve().then(()=>{if(controller.signal.aborted)fail();return confirmMapping({label,subject:cohort[label],signal:controller.signal});}),
          new Promise((_,reject)=>{if(controller.signal.aborted)reject(Error('A02_BLOCKED'));else controller.signal.addEventListener('abort',()=>reject(Error('A02_BLOCKED')),{once:true});})]);
      } finally {clearTimeout(timer);signal.removeEventListener('abort',abort);controller.abort();}
      if(!object(mapping)||Object.keys(mapping).sort().join()!=='canonicalUserId,membershipPresent,state,subject'
        ||mapping.subject!==cohort[label]||!uuid.test(mapping.canonicalUserId)
        ||[cohort.A,cohort.B,cohort.U].includes(mapping.canonicalUserId.toLowerCase())
        ||confirmedCanonical.has(mapping.canonicalUserId.toLowerCase())
        ||mapping.state!=='active'||mapping.membershipPresent!==false||signal.aborted||!Number.isSafeInteger(now())
        ||now()>=session.expiresAt||now()>=Date.parse(cohort.expiresAt)) fail();
      confirmedCanonical.add(mapping.canonicalUserId.toLowerCase());
      return {state:'confirmed',outcome};
    } catch {
      if(intent?.status==='PASS')stateAcceptance.transport({attemptId:intent.attemptId,observation:'CONNECTION_LOST'});
      // A confirmation failure after ACK is still uncertain and freezes state mode.
      if(stateAcceptance&&attempted)stateAcceptance.accept(label,undefined);
      return {state:attempted?'uncertain':'blocked'};
    }
  };
}
