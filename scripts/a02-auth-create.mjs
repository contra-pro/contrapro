/** Gate 2 only. Import is inert. No default transport, credential discovery or logging. */
import {request as httpsRequest} from 'node:https';
const projectRef='gllsiklbvqpxzucvkehw';
export const a02AuthCreateUrl=`https://${projectRef}.supabase.co/auth/v1/admin/users`;
const ids={A:'17eaeec9-37e1-4720-ba7a-c1e16f659af5',B:'305fb936-588e-42f9-bc4d-f41a0d3f60c0',U:'f7334db7-f402-4f00-9c1a-754eb3eb2f3e'};
const fail=()=>{throw Error('A02_AUTH_CREATE_BLOCKED');};
const reference=x=>typeof x==='string'&&x.length>0&&x.length<=256&&x!=='UNBOUND';
/** Dedicated Admin transport; never add Admin access to the ordinary session port. */
export function createA02AuthAdminTransport({requestImpl=httpsRequest}={}){
  return async(url,init)=>{
    try{
      if(url!==a02AuthCreateUrl||init?.method!=='POST'||init.redirect!=='error'||init.credentials!=='omit'
        ||!init.signal||init.signal.aborted||typeof init.body!=='string'||Buffer.byteLength(init.body)>4096
        ||Object.keys(init.headers??{}).sort().join()!=='Accept,Authorization,Content-Type,apikey'
        ||init.headers.Accept!=='application/json'||init.headers['Content-Type']!=='application/json'
        ||!/^\S{20,8192}$/.test(init.headers.apikey)||!/^Bearer \S{20,8192}$/.test(init.headers.Authorization))fail();
      const body=JSON.parse(init.body);
      if(Object.keys(body).sort().join()!=='email,email_confirm,id,password'||!Object.values(ids).includes(body.id)
        ||body.email_confirm!==true||typeof body.email!=='string'||typeof body.password!=='string')fail();
      return await new Promise((resolve,reject)=>{
        let timer;const req=requestImpl(url,{method:'POST',headers:init.headers,signal:init.signal,agent:false,
          rejectUnauthorized:true,servername:'gllsiklbvqpxzucvkehw.supabase.co',maxHeaderSize:16384},res=>{
          let size=0;const chunks=[];
          res.on('data',chunk=>{size+=chunk.length;if(size>32768){clearTimeout(timer);req.destroy();reject(Error('A02_AUTH_CREATE_BLOCKED'));}else chunks.push(chunk);});
          res.on('error',()=>{clearTimeout(timer);reject(Error('A02_AUTH_CREATE_BLOCKED'));});
          res.on('end',()=>{clearTimeout(timer);try{
            const headers=new Headers();for(let i=0;i<res.rawHeaders.length;i+=2)headers.append(res.rawHeaders[i],res.rawHeaders[i+1]);
            const result=new Response(Buffer.concat(chunks),{status:res.statusCode,headers});
            Object.defineProperty(result,'url',{value:url});resolve(result);
          }catch{reject(Error('A02_AUTH_CREATE_BLOCKED'));}});
        });
        timer=setTimeout(()=>{req.destroy();reject(Error('A02_AUTH_CREATE_BLOCKED'));},7000);
        req.on('error',()=>{clearTimeout(timer);reject(Error('A02_AUTH_CREATE_BLOCKED'));});req.end(init.body);
      });
    }catch{fail();}
  };
}
/** One-shot executor instance: maximum three creates, never SDK retries or compensation.
 * send is a separately reviewed pinned HTTPS port; no live adapter is selected here.
 * absenceCheck receives private inputs and MUST compare exact UUID AND email privately.
 */
export function createA02AuthCreator({send,credentialProvider,adminHeaderProvider,absenceCheck,now=Date.now,stateAcceptance}={}){
  if(![send,credentialProvider,adminHeaderProvider,absenceCheck,now].every(x=>typeof x==='function'))fail();
  let used=false;
  return async ({approval,signal}={})=>{
    let attempted=false;const receipts=[];let controller,timer,abort,intent;
    try{
      if(used||!signal||signal.aborted||!Number.isSafeInteger(now())||approval?.projectRef!==projectRef||approval.maximumCreates!==3
        ||!reference(approval.reference)||!reference(approval.runReference)
        ||!Number.isSafeInteger(approval.start)||!Number.isSafeInteger(approval.end)
        ||approval.end-approval.start!==120*60000||!Number.isSafeInteger(approval.wrapperExpiry)
        ||approval.wrapperExpiry>approval.end||approval.wrapperExpiry<=now()
        ||approval.wrapperExpiry-now()>900000||now()<approval.start||now()>=approval.end)fail();
      used=true; // A fresh invocation/instance is NOT authorization to retry an uncertain run.
      controller=new AbortController();abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});
      if(signal.aborted)controller.abort();timer=setTimeout(abort,30000);
      const limit=now()+30000;
      for(const label of ['A','B','U']){
        if(controller.signal.aborted||!Number.isSafeInteger(now())||now()>=limit||now()>=approval.wrapperExpiry||now()>=approval.end)fail();
        const credentials=credentialProvider(label);
        if(Object.keys(credentials??{}).sort().join()!=='email,password'
          ||typeof credentials.email!=='string'||credentials.email.length>320
          ||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)
          ||typeof credentials.password!=='string'||credentials.password.length<12||credentials.password.length>1024)fail();
        // No true-only callback: require a run-correlated receipt bound to exact input.
        const evidence=await bounded(s=>absenceCheck({label,subject:ids[label],email:credentials.email,
          runReference:approval.runReference,signal:s}),controller.signal,2000);
        if(evidence?.runReference!==approval.runReference||evidence.subject!==ids[label]
          ||evidence.email!==credentials.email||evidence.idExists!==false||evidence.emailExists!==false
          ||!reference(evidence.receiptReference)||!Number.isSafeInteger(evidence.observedAt)
          ||now()-evidence.observedAt>30000||evidence.observedAt>now())fail();
        if(controller.signal.aborted||now()>=approval.wrapperExpiry||now()>=approval.end)fail();
        const headers=adminHeaderProvider();
        if(!headers||Object.keys(headers).sort().join()!=='Authorization,apikey'
          ||typeof headers.apikey!=='string'||!/^\S{20,8192}$/.test(headers.apikey)
          ||typeof headers.Authorization!=='string'||!/^Bearer \S{20,8192}$/.test(headers.Authorization))fail();
        if(stateAcceptance){
          intent=stateAcceptance.begin({operation:'auth-create',label,signal:controller.signal});
          if(intent.status!=='PASS')fail();
        }
        attempted=true;
        const response=await bounded(s=>send(a02AuthCreateUrl,{method:'POST',redirect:'error',credentials:'omit',cache:'no-store',
          headers:{...headers,Accept:'application/json','Content-Type':'application/json'},signal:s,
          body:JSON.stringify({id:ids[label],email:credentials.email,password:credentials.password,email_confirm:true})}),controller.signal,7000);
        if(response.url!==a02AuthCreateUrl||response.redirected||![200,201].includes(response.status)
          ||response.headers.has('location')||response.headers.has('set-cookie')
          ||!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')??''))fail();
        const user=await bounded(async()=>{
          const reader=response.body?.getReader();if(!reader)fail();let size=0;const chunks=[];
          try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;
            if(size>32768){void reader.cancel().catch(()=>{});fail();}chunks.push(part.value);}}
          finally{reader.releaseLock();}
          return JSON.parse(Buffer.concat(chunks).toString('utf8'));
        },controller.signal,2000);
        if(user?.id!==ids[label]||user.email?.toLowerCase()!==credentials.email.toLowerCase()
          ||controller.signal.aborted||now()>=approval.wrapperExpiry||now()>=approval.end)fail();
        if(stateAcceptance&&stateAcceptance.transport({attemptId:intent.attemptId,observation:'ACKNOWLEDGED'}).reason!=='ACK_REQUIRES_INDEPENDENT_STATE')fail();
        intent=undefined;receipts.push({label,state:'acknowledged_requires_independent_readback'});
      }
      return {state:'acknowledged_requires_independent_readback',receipts};
    }catch{
      if(intent?.status==='PASS')stateAcceptance.transport({attemptId:intent.attemptId,observation:'CONNECTION_LOST'});
      if(stateAcceptance&&attempted)stateAcceptance.accept('auth',undefined);
      return {state:attempted?'uncertain':'blocked',receipts};
    }
    finally{clearTimeout(timer);if(abort)signal.removeEventListener('abort',abort);controller?.abort();}
  };
}
async function bounded(fn,parent,ms){
  const c=new AbortController();const abort=()=>c.abort();parent.addEventListener('abort',abort,{once:true});
  if(parent.aborted)c.abort();const timer=setTimeout(abort,ms);
  try{return await Promise.race([Promise.resolve().then(()=>{if(c.signal.aborted)fail();return fn(c.signal);}),
    new Promise((_,reject)=>{if(c.signal.aborted)reject(Error('A02_AUTH_CREATE_BLOCKED'));else c.signal.addEventListener('abort',()=>reject(Error('A02_AUTH_CREATE_BLOCKED')),{once:true});})]);}
  finally{clearTimeout(timer);parent.removeEventListener('abort',abort);c.abort();}
}
