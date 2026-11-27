import "server-only";
import { createClient } from "@supabase/supabase-js";
import { appOrigin,publicAuthConfig } from "../auth/config";
import { DeliveryFault } from "./model";
import { type DeliveryConfig } from "./service";
import { SupabaseDeliveryRepository } from "./repository";
import { ResendAdapter } from "./resend";
import { DeliveryWorker } from "./worker";
import { keyRing } from "../maintenance/keys";
export function deliveryConfig(worker=false):DeliveryConfig {
  if(process.env.CONTRATPRO_DELIVERY_VERIFIED!=="true")throw new DeliveryFault("unavailable");
  const gatewaySecret=process.env.CONTRATPRO_DELIVERY_GATEWAY_SECRET??"",encryptionKey=process.env.CONTRATPRO_DELIVERY_ENCRYPTION_KEY??"",signingSecret=worker?"":process.env.CONTRATPRO_SIGNING_SECRET??"";
  if(![gatewaySecret,encryptionKey,...(worker?[]:[signingSecret])].every(k=>/^[a-f0-9]{64}$/.test(k))||gatewaySecret===encryptionKey||gatewaySecret===signingSecret||encryptionKey===signingSecret)throw new DeliveryFault("unavailable");
  const keyId=process.env.CONTRATPRO_DELIVERY_KEY_ID??"v1",historicalKeys=process.env.CONTRATPRO_DELIVERY_HISTORICAL_KEYS??"{}",derivationKey=process.env.CONTRATPRO_DELIVERY_DERIVATION_KEY??"";
  const ring=keyRing(keyId,encryptionKey,historicalKeys);
  if(!/^[a-f0-9]{64}$/.test(derivationKey)||derivationKey===gatewaySecret||derivationKey===signingSecret||Object.values(ring.keys).some(key=>[derivationKey,gatewaySecret,signingSecret].includes(key)))throw new DeliveryFault("unavailable");
  return {gatewaySecret,encryptionKey,signingSecret,keyId,historicalKeys,derivationKey,origin:appOrigin(process.env.CONTRATPRO_APP_ORIGIN)};
}
export function workerRepository(){const config=deliveryConfig(true),{url,key}=publicAuthConfig(),client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:"no-store",signal:AbortSignal.timeout(15000)})}});return {config,repo:new SupabaseDeliveryRepository(client,config.gatewaySecret,true)};}
export function createDeliveryWorker(){
  if(process.env.CONTRATPRO_RESEND_VERIFIED!=="true")throw new DeliveryFault("unavailable");const {config,repo}=workerRepository();
  const provider=new ResendAdapter({enabled:true,apiKey:process.env.CONTRATPRO_RESEND_API_KEY??"",from:process.env.CONTRATPRO_EMAIL_FROM??"",...(process.env.CONTRATPRO_EMAIL_REPLY_TO?{replyTo:process.env.CONTRATPRO_EMAIL_REPLY_TO}:{})});
  if(!config.origin.startsWith("https://"))throw new DeliveryFault("unavailable");provider.validateConfiguration();return new DeliveryWorker(repo,config,provider);
}
