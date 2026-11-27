import "server-only";
import { NextRequest,NextResponse } from "next/server";
import { digest } from "../signing/crypto";
import { authenticateResend } from "./resend";
import { workerRepository } from "./runtime";
export async function handleResendWebhook(request:NextRequest){
  const reply=(status:number)=>NextResponse.json({ok:status===200},{status,headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});
  if(process.env.CONTRATPRO_DELIVERY_VERIFIED!=="true"||process.env.CONTRATPRO_RESEND_VERIFIED!=="true")return reply(503);
  if(!request.body)return reply(400);const reader=request.body.getReader(),parts:Uint8Array[]=[];let size=0;
  try{for(;;){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>65536){void reader.cancel().catch(()=>{});return reply(413);}parts.push(p.value);}
    const raw=Buffer.concat(parts),keys=(process.env.CONTRATPRO_RESEND_WEBHOOK_SECRETS??"").split(",").filter(Boolean),event=authenticateResend(raw,request.headers,keys);if(!event)return reply(401);
    if(process.env.CONTRATPRO_A3_VERIFIED!=="true")delete event.jobId;
    await workerRepository().repo.call(null,"webhook",{...event,hash:digest(raw)});return reply(200);
  }catch{return reply(503);}finally{reader.releaseLock();}
}
