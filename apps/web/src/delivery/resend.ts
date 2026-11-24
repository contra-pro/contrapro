import { createHmac,timingSafeEqual } from "node:crypto";
import { isRecord } from "../../../../packages/application/src/agency-management";
import { DeliveryFault,email,type Material } from "./model";
import { message } from "./messages";
export type SendOutcome={state:"accepted";providerId:string}|{state:"failed";retryable:boolean;errorCode:"rate-limit"|"rejected"}|{state:"uncertain";retryable:false;errorCode:"transport-unknown"};
export type ProviderObservation={eventId:string;providerId:string;state:"accepted"|"delivered"|"failed"|"bounced";at:string};
export interface EmailProvider {send(jobId:string,material:Material):Promise<SendOutcome>;reconcile(providerId:string):Promise<{state:"accepted"|"delivered"|"failed"|"bounced"}|null>}
export class ResendAdapter implements EmailProvider {
  constructor(private config:{enabled:boolean;apiKey:string;from:string;replyTo?:string},private transport:typeof fetch=fetch){}
  private ready(){if(!this.config.enabled||!/^re_[A-Za-z0-9_-]+$/.test(this.config.apiKey))throw new DeliveryFault("unavailable");const from=email(this.config.from);if(from.toLowerCase().endsWith("@resend.dev"))throw new DeliveryFault("unavailable");if(this.config.replyTo)email(this.config.replyTo);}
  validateConfiguration(){this.ready();}
  async send(jobId:string,material:Material):Promise<SendOutcome>{this.ready();if(material.purpose==="verification-code"||material.code!==null)throw new DeliveryFault("invalid");email(material.recipient);if(material.replyTo)email(material.replyTo);if(material.link&&new URL(material.link).protocol!=="https:")throw new DeliveryFault("unavailable");const content=message(material);
    try {const response=await this.transport("https://api.resend.com/emails",{method:"POST",redirect:"error",signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${this.config.apiKey}`,"Content-Type":"application/json","Idempotency-Key":`contratpro/${jobId}`},body:JSON.stringify({from:this.config.from,to:[material.recipient],reply_to:this.config.replyTo??material.replyTo??undefined,subject:content.subject,text:content.text,html:content.html,tags:[{name:"delivery_job",value:jobId}]})});
      if(response.ok){const data:unknown=await response.json();if(isRecord(data)&&typeof data.id==="string"&&/^[A-Za-z0-9_-]{1,128}$/.test(data.id))return {state:"accepted",providerId:data.id};return {state:"uncertain",retryable:false,errorCode:"transport-unknown"};}
      if(response.status===429)return {state:"failed",retryable:true,errorCode:"rate-limit"};
      if([400,401,403,404,422].includes(response.status))return {state:"failed",retryable:false,errorCode:"rejected"};
      return {state:"uncertain",retryable:false,errorCode:"transport-unknown"};
    }catch{return {state:"uncertain",retryable:false,errorCode:"transport-unknown"};}}
  async reconcile(providerId:string):Promise<{state:"accepted"|"delivered"|"failed"|"bounced"}|null>{this.ready();if(!/^[A-Za-z0-9_-]{1,128}$/.test(providerId))throw new DeliveryFault("invalid");try{const response=await this.transport(`https://api.resend.com/emails/${providerId}`,{headers:{Authorization:`Bearer ${this.config.apiKey}`},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(10000)});if(!response.ok)return null;const data:unknown=await response.json();if(!isRecord(data))return null;const state=providerState(`email.${String(data.last_event)}`);return state?{state}:null;}catch{return null;}}
}
export function providerState(type:string){return type==="email.sent"?"accepted":type==="email.delivered"?"delivered":type==="email.bounced"?"bounced":type==="email.failed"?"failed":null;}
export function authenticateResend(raw:Uint8Array,headers:Headers,keys:readonly string[],now=Date.now()):ProviderObservation|null {
  const id=headers.get("svix-id"),timestamp=headers.get("svix-timestamp"),signatures=headers.get("svix-signature");
  if(raw.length>65536||!id||!/^[A-Za-z0-9_-]{1,256}$/.test(id)||!timestamp||!/^\d{10}$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300||!signatures||signatures.length>4096)return null;
  let verified=false;for(const key of keys){if(!/^whsec_[A-Za-z0-9+/=_-]+$/.test(key))continue;const secret=Buffer.from(key.slice(6),"base64");if(secret.length<16)continue;
    const mac=createHmac("sha256",secret).update(`${id}.${timestamp}.`).update(raw).digest();for(const signature of signatures.split(" ")){const [version,value]=signature.split(",");if(version!=="v1"||!value)continue;const candidate=Buffer.from(value,"base64");if(candidate.length===mac.length&&timingSafeEqual(candidate,mac))verified=true;}}
  if(!verified)return null;try{const payload:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(raw));if(!isRecord(payload)||!isRecord(payload.data))return null;const state=providerState(String(payload.type));if(!state||typeof payload.data.email_id!=="string"||!/^[A-Za-z0-9_-]{1,128}$/.test(payload.data.email_id)||typeof payload.created_at!=="string"||!Number.isFinite(Date.parse(payload.created_at)))return null;return {eventId:id,providerId:payload.data.email_id,state,at:payload.created_at};}catch{return null;}
}
