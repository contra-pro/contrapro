import "server-only";
import { NextRequest,NextResponse } from "next/server";
import { serverAuthClient } from "../auth/server";
import { supabaseAgencyContext } from "../auth/identity";
import { readSelection,selectionCookie } from "../agency/selection";
import { isLocale } from "../i18n/locales";
import { isRecord } from "../../../../packages/application/src/agency-management";
import { signingBody,signingHeaders } from "../signing/handler";
import { SigningStorage } from "../signing/storage";
import { digest } from "../signing/crypto";
import { DeliveryFault,deliveryScope,type Channel,type DeliveryJob } from "./model";
import { deliveryConfig,workerRepository,createDeliveryWorker } from "./runtime";
import { SupabaseDeliveryRepository } from "./repository";
import { DeliveryService } from "./service";
import { reminderPolicy } from "./reminders";
export async function handleDelivery(request:NextRequest,locale:string,download=false){
  const pending:{name:string;value:string;options?:Parameters<NextResponse["cookies"]["set"]>[2]}[]=[];
  const json=(body:object,status=200)=>{const response=NextResponse.json(body,{status,headers:signingHeaders});for(const c of pending)response.cookies.set(c.name,c.value,c.options??{});return response;};
  try{if(!isLocale(locale))return json({ok:false,code:"not-found"},404);const config=deliveryConfig(download);
    if(request.method!=="POST"||request.nextUrl.origin!==config.origin||request.headers.get("origin")!==config.origin)throw new DeliveryFault("forbidden");
    let body:unknown;try{body=await signingBody(request);}catch{throw new DeliveryFault("invalid");}if(!isRecord(body)||typeof body.action!=="string"||!isRecord(body.input))throw new DeliveryFault("invalid");const p=body.input;
    if(download){if(body.action!=="download"||typeof p.token!=="string"||!/^[a-f0-9]{64}$/.test(p.token))throw new DeliveryFault("not-found");const {repo}=workerRepository();const ref=await repo.call<{key:string;checksum:string}>(null,"download",{tokenHash:digest(p.token)});
      const bytes=await new SigningStorage(null).get(ref.key);if(digest(bytes)!==ref.checksum)throw new DeliveryFault("conflict");return new NextResponse(Buffer.from(bytes),{headers:{...signingHeaders,"Content-Type":"application/pdf","Content-Disposition":'attachment; filename="contrat-signe.pdf"'}});}
    const client=serverAuthClient({getAll:()=>request.cookies.getAll(),setAll:values=>{for(const c of values){request.cookies.set(c.name,c.value);pending.push(c);}}});
    const context=await supabaseAgencyContext(client,process.env.CONTRATPRO_AUTH_ACCESS_VERIFIED==="true",Date.now,readSelection(request.cookies.get(selectionCookie)?.value));
    if(context.access.status!=="authorized"||!context.canonical||context.canonical.userId!==context.access.userId)throw new DeliveryFault("forbidden");const aid=context.access.agencyId,repo=new SupabaseDeliveryRepository(client,config.gatewaySecret),service=new DeliveryService(repo,config);let value:unknown;
    if(body.action==="reconcile"){
      if(process.env.CONTRATPRO_A3_VERIFIED!=="true")throw new DeliveryFault("unavailable");
      deliveryScope(aid,p.jobId);
      const job=await repo.call<DeliveryJob>(aid,"reconciliation-context",{jobId:p.jobId});
      if(!job.providerId)throw new DeliveryFault("uncertain");
      value=await createDeliveryWorker().reconcile(job.id);
    }
    else if(["reminder-policy","reminder-policy-save","reminder-history","manual-resolve","recover-final-event"].includes(body.action)){
      if(process.env.CONTRATPRO_A3_VERIFIED!=="true")throw new DeliveryFault("unavailable");
      value=await repo.call(aid,body.action,body.action==="reminder-policy-save"?reminderPolicy(p):p);
    }
    else if(body.action==="dashboard")value=await repo.call(aid,"dashboard",{page:p.page,filter:p.filter});
    else if(body.action==="list")value=await service.list(aid,String(p.sessionId));
    else if(body.action==="context"){const c=await service.context(aid,String(p.sessionId));value={state:c.state,clientEmail:c.clientEmail,clientPhone:c.clientPhone,invitationExpiresAt:c.invitation?.expiresAt??null,hasFinal:!!c.final,a3Enabled:process.env.CONTRATPRO_A3_VERIFIED==="true"};}
    else if(body.action==="invitation"||body.action==="reminder")value=await service.invitation(aid,String(p.sessionId),{linkChannel:String(p.linkChannel) as Channel,codeChannel:String(p.codeChannel) as Channel,requestId:String(p.requestId),reminder:body.action==="reminder"});
    else if(body.action==="final")value=await service.final(aid,String(p.sessionId),String(p.requestId),String(p.channel) as Channel);
    else if(body.action==="material")value=await service.material(aid,String(p.jobId));
    else if(["manual","retry","cancel"].includes(body.action)){deliveryScope(aid,p.jobId);value=await service.action(aid,body.action as "manual"|"retry"|"cancel",{jobId:p.jobId,...(body.action==="manual"?{observed:p.observed}:{})});}
    else if(body.action==="revoke"){deliveryScope(aid,p.sessionId,p.grantId);value=await service.action(aid,"revoke",{sessionId:p.sessionId,grantId:p.grantId});}
    else throw new DeliveryFault("invalid");return json({ok:true,value});
  }catch(error){const code=error instanceof DeliveryFault?error.code:"unavailable";return json({ok:false,code},code==="forbidden"?403:code==="not-found"?404:code==="conflict"?409:code==="rate-limited"?429:code==="unavailable"?503:422);}
}
