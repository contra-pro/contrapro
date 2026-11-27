import "server-only";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { publicAuthConfig } from "../auth/config";
import { deliveryConfig,createDeliveryWorker,workerRepository } from "../delivery/runtime";
import { sheetsConfig,sheetsServices } from "../sheets/runtime";
import { keyRing,rotateEnvelope } from "./keys";
import type { Envelope } from "../delivery/model";
import { readFile } from "node:fs/promises";
import { Documents } from "../documents/service";
import { SigningStorage } from "../signing/storage";
import { SigningEngine } from "../signing/service";
import { SupabaseSigningRepository } from "../signing/repository";
import { ContainerDocxConverter } from "../documents/converter";
import { validateKeyReferences } from "./readiness";

export type Task="delivery"|"sheets"|"reconcile"|"inventory"|"lifecycle"|"health"|"rotation"|"cleanup"|"generation"|"finalization";
export type Claim={task:Task;lease:string};
export function maintenanceRepository(){
 const secret=process.env.CONTRATPRO_MAINTENANCE_GATEWAY_SECRET??"";
 if(process.env.CONTRATPRO_A5_VERIFIED!=="true"||!/^[a-f0-9]{64}$/.test(secret)||secret===process.env.CONTRATPRO_MAINTENANCE_ACCESS_SECRET)throw Error("maintenance_unavailable");
 const {url,key}=publicAuthConfig(),client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:"no-store",signal:AbortSignal.timeout(15000)})}});
 return {async call<T>(action:string,input:object={}):Promise<T>{
  const payload=JSON.stringify({action,input}),mac=createHmac("sha256",Buffer.from(secret,"hex")).update(payload).digest("hex");
  const {data,error}=await client.rpc("contratpro_maintenance_worker",{payload,mac});if(error)throw Error("maintenance_unavailable");return data as T;
 }};
}
export async function executeTask(task:Task,repo:ReturnType<typeof maintenanceRepository>):Promise<"ok"|"disabled">{
 const env=process.env;
 if(task==="delivery"){
  if(env.CONTRATPRO_DELIVERY_VERIFIED!=="true"||env.CONTRATPRO_RESEND_VERIFIED!=="true")return "disabled";
  const worker=createDeliveryWorker();if(env.CONTRATPRO_A3_VERIFIED==="true")await worker.reminderOnce();await worker.materializeOnce();await worker.runOnce();await workerRepository().repo.call(null,"purge-expired",{});
 }else if(task==="sheets"){
  if(env.CONTRATPRO_SHEETS_VERIFIED!=="true")return "disabled";const {worker,workerRepo}=sheetsServices();await worker.tick();await workerRepo.call(null,"purge",{});
 }else if(task==="reconcile"){
  if(env.CONTRATPRO_SHEETS_VERIFIED!=="true"&&(env.CONTRATPRO_DELIVERY_VERIFIED!=="true"||env.CONTRATPRO_RESEND_VERIFIED!=="true"))return "disabled";
  const next=await repo.call<{delivery:string|null;sheets:{agencyId:string;contractId:string}|null}>("reconcile-next");
  if(next.delivery&&env.CONTRATPRO_DELIVERY_VERIFIED==="true"&&env.CONTRATPRO_RESEND_VERIFIED==="true")await createDeliveryWorker().reconcile(next.delivery);
  if(next.sheets&&env.CONTRATPRO_SHEETS_VERIFIED==="true")await sheetsServices().worker.reconcile(next.sheets.agencyId,next.sheets.contractId);
 }else if(task==="rotation"){
  const item=await repo.call<{consumer:"delivery"|"sheets";id:string;aad:string;target:string;envelope:Envelope}|null>("rotation-next");
  if(item){const c=item.consumer==="delivery"?deliveryConfig(true):sheetsConfig(),ring="encryptionKey" in c?keyRing(c.keyId,c.encryptionKey,c.historicalKeys):keyRing(c.keyId,c.key,c.historicalKeys);
   if(ring.activeId!==item.target)throw Error("rotation_configuration_mismatch");
   await repo.call("rotation-cas",{consumer:item.consumer,id:item.id,previous:item.envelope,envelope:rotateEnvelope(item.envelope,ring,item.aad)});
  }
 }else if(task==="cleanup"){
  if(env.CONTRATPRO_STORAGE_CLEANUP_VERIFIED!=="true")return "disabled";
  const serviceKey=env.CONTRATPRO_MAINTENANCE_STORAGE_SERVICE_KEY??"";if(!serviceKey)throw Error("cleanup_unavailable");
  // No bucket listing or caller-supplied paths: one database-fenced exact object.
  const item=await repo.call<{agencyId:string;key:string;lease:string}|null>("cleanup-claim");
  if(item){if(!new RegExp(`^${item.agencyId}/drafts/[a-f0-9-]{36}/[a-f0-9]{64}\\.pdf$`).test(item.key))throw Error("cleanup_scope_invalid");
   if(await repo.call<boolean>("cleanup-finish",item))return "ok"; // Lost delete acknowledgement: physical absence is authoritative.
   const {url}=publicAuthConfig(),storage=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}}).storage;
   const {error}=await storage.from("contract-documents").remove([item.key]);if(error)throw Error("cleanup_unavailable");await repo.call("cleanup-finish",item);
  }
 }else if(task==="finalization"){
  if(env.CONTRATPRO_SIGNING_VERIFIED!=="true"||!env.CONTRATPRO_DOCUMENT_FONT_PATH||!env.CONTRATPRO_SIGNING_SECRET)return "disabled";
  const claim=await repo.call<{agencyId:string;sessionId:string;tokenHash:string}|null>("finalization-claim");
  if(claim){const {url,key}=publicAuthConfig(),client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:"no-store",signal:AbortSignal.timeout(15000)})}}),gateway=new SupabaseSigningRepository(client,env.CONTRATPRO_SIGNING_SECRET);
   // Guest authority rechecks expiry/revocation on every step. No actor is forged,
   // no new signature/verification action is allowed and no raw token is recovered.
   const engine=new SigningEngine({call:<T>(_agency:string|null,action:string,input:object)=>{if(!["get","finalize-prepare","stage-final","complete","finalize-failed"].includes(action))throw Error("recovery_action_denied");return gateway.call<T>(null,action,{...input,tokenHash:claim.tokenHash});}},new SigningStorage(null),"",new Uint8Array(await readFile(env.CONTRATPRO_DOCUMENT_FONT_PATH)));
   await engine.finalize(claim.agencyId,claim.sessionId);
  }
 }else if(task==="generation"){
  if(env.CONTRATPRO_DOCUMENTS_VERIFIED!=="true"||!env.CONTRATPRO_DOCUMENT_FONT_PATH||!env.CONTRATPRO_DOCUMENT_RENDERER_SECRET)return "disabled";
  const claim=await repo.call<{agencyId:string;lease:string;input:Parameters<Documents["generate"]>[0]}|null>("generation-claim");
  if(claim){const font=new Uint8Array(await readFile(env.CONTRATPRO_DOCUMENT_FONT_PATH));
   const documents=new Documents(claim.agencyId,{call:<T>(agencyId:string,step:string,input:object)=>repo.call<T>("generation-step",{agencyId,requestId:claim.input.requestId,lease:claim.lease,step,input})},new SigningStorage(null),font,env.CONTRATPRO_DOCX_IMAGE?new ContainerDocxConverter(env.CONTRATPRO_DOCX_IMAGE):undefined,env.CONTRATPRO_DOCUMENT_RENDERER_SECRET);
   await documents.generate(claim.input);
  }
 }else if(task==="inventory")await repo.call("inventory");
 else if(task==="health")await repo.call("overview");
 else if(task==="lifecycle")await repo.call("lifecycle");
 return "ok";
}
export async function maintenanceTick(){
 const repo=maintenanceRepository();await maintenanceReadiness(repo);
 const claim=await repo.call<Claim|null>("claim");if(!claim)return {processed:false};
 let outcome:"ok"|"disabled"|"failed"="failed";
 try{outcome=await executeTask(claim.task,repo);}catch{/* Durable lease and bounded backoff own retry; never log errors with payloads. */}
 await repo.call("finish",{...claim,outcome});
 return {processed:true,task:claim.task,outcome};
}
export async function maintenanceReadiness(repo=maintenanceRepository()){
 const overview=await repo.call<{keyReferences:Record<string,Record<string,number>>}>("overview");validateKeyReferences(overview.keyReferences,process.env);
}
