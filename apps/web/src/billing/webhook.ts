import { BillingFault } from "./model";
import type { BillingPayments } from "./provider";
import { signingHeaders } from "../signing/handler";
export async function billingWebhook(request:Request,service:BillingPayments|null) {
 try {
  if(!service)throw new BillingFault("unavailable");
  if(request.method!=="POST"||!request.body)throw new BillingFault("invalid");
  const reader=request.body.getReader();const chunks:Uint8Array[]=[];let total=0;
  try {for(;;){const p=await reader.read();if(p.done)break;total+=p.value.length;if(total>32768){await reader.cancel();throw new BillingFault("invalid");}chunks.push(p.value);}}finally{reader.releaseLock();}
  const raw=new Uint8Array(total);let offset=0;for(const c of chunks){raw.set(c,offset);offset+=c.length;}
  const value=await service.webhook(raw,request.headers);return Response.json({ok:true,value},{headers:signingHeaders});
 }catch(e){const code=e instanceof BillingFault?e.code:"unavailable";return Response.json({ok:false,code},{status:code==="forbidden"?403:code==="invalid"?422:code==="conflict"?409:503,headers:signingHeaders});}
}
