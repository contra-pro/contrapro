import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest,NextResponse } from "next/server";
import { publicAuthConfig } from "../auth/config";
import { digest } from "./crypto";
import { configuredProviders,type SignatureProvider } from "./providers";
import { SupabaseSigningRepository } from "./repository";
import { type SigningRepository } from "./model";
/** Provider authentication precedes durable deduplication; an observation never
 * authorizes Completed. No vendor or external verification profile is activated. */
export async function admitProviderWebhook(provider:SignatureProvider,bytes:Uint8Array,headers:Headers,repo:SigningRepository){
  if(bytes.length>65536)throw Error("invalid");const observed=await provider.authenticateWebhook(bytes,headers);if(!observed)throw Error("forbidden");
  if(!observed.eventId || observed.eventId.length>256 || !observed.transactionId || observed.transactionId.length>512)throw Error("invalid");
  return repo.call(null,"provider-webhook",{providerId:provider.capabilities.id,eventId:observed.eventId,transactionId:observed.transactionId,operationId:observed.operationId,hash:digest(bytes),requestId:randomUUID()});
}
export async function handleProviderWebhook(request:NextRequest,providerId:string){
  const reply=(body:object,status:number)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});
  const provider=configuredProviders.find(p=>p.capabilities.id===providerId),secret=process.env.CONTRATPRO_SIGNING_SECRET;
  if(process.env.CONTRATPRO_SIGNING_VERIFIED!=="true" || !provider || !secret)return reply({ok:false,code:"unavailable"},503);
  if(!request.body)return reply({ok:false},400);const reader=request.body.getReader(),parts:Uint8Array[]=[];let size=0;
  try{for(;;){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>65536){void reader.cancel().catch(()=>{});return reply({ok:false},413);}parts.push(p.value);}
    const {url,key}=publicAuthConfig(),client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    await admitProviderWebhook(provider,Buffer.concat(parts),request.headers,new SupabaseSigningRepository(client,secret));return reply({ok:true},200);
  }catch{return reply({ok:false,code:"not-admitted"},503);}finally{reader.releaseLock();}
}
