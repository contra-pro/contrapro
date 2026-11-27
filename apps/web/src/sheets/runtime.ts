import "server-only";
import { createClient,type SupabaseClient } from "@supabase/supabase-js";
import { appOrigin,publicAuthConfig } from "../auth/config";
import { SheetsFault,type Repository } from "./model";
import { GoogleOAuth,validateOAuthConfiguration,type OAuthConfig } from "./oauth";
import { GoogleSheets } from "./google";
import { SheetsRepository } from "./repository";
import { SheetsWorker } from "./worker";
import { keyRing } from "../maintenance/keys";
export function sheetsConfig():OAuthConfig&{gatewaySecret:string}{
  const env=process.env,key=env.CONTRATPRO_SHEETS_ENCRYPTION_KEY??"",gatewaySecret=env.CONTRATPRO_SHEETS_GATEWAY_SECRET??"";
  if(env.CONTRATPRO_SHEETS_VERIFIED!=="true"||![key,gatewaySecret].every(k=>/^[a-f0-9]{64}$/.test(k))||key===gatewaySecret)throw new SheetsFault("unavailable");
  const origin=appOrigin(env.CONTRATPRO_APP_ORIGIN);if(!origin.startsWith("https://"))throw new SheetsFault("unavailable");
  const keyId=env.CONTRATPRO_SHEETS_KEY_ID??"v1",historicalKeys=env.CONTRATPRO_SHEETS_HISTORICAL_KEYS??"{}";keyRing(keyId,key,historicalKeys);
  const config={enabled:true,key,gatewaySecret,keyId,historicalKeys,origin,clientId:env.CONTRATPRO_GOOGLE_CLIENT_ID??"",clientSecret:env.CONTRATPRO_GOOGLE_CLIENT_SECRET??""};validateOAuthConfiguration(config);return config;
}
export function sheetsServices(client?:SupabaseClient){
  const config=sheetsConfig(),{url,key}=publicAuthConfig(),backend=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:"no-store",signal:AbortSignal.timeout(15000)})}}),workerRepo=new SheetsRepository(backend,config.gatewaySecret,true);
  const agency=client?new SheetsRepository(client,config.gatewaySecret):null;
  const actions=["oauth-start","oauth-consume","connect","disconnect"];
  const oauthRepo:Repository={call:<T>(aid:string|null,action:string,input:object)=>{if(actions.includes(action)){if(!agency)throw new SheetsFault("forbidden");return agency.call<T>(aid,action,input);}return workerRepo.call<T>(aid,action,input);}};
  const oauth=new GoogleOAuth(oauthRepo,config),google=new GoogleSheets(true),worker=new SheetsWorker(workerRepo,oauth,google);
  return {config,agency,workerRepo,oauth,google,worker};
}
