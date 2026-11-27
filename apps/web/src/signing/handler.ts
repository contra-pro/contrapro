import "server-only";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { NextRequest,NextResponse } from "next/server";
import { appOrigin,publicAuthConfig } from "../auth/config";
import { serverAuthClient } from "../auth/server";
import { supabaseAgencyContext } from "../auth/identity";
import { readSelection,selectionCookie } from "../agency/selection";
import { isRecord } from "../../../../packages/application/src/agency-management";
import { isLocale } from "../i18n/locales";
import { SigningFault,type Assurance,type Session } from "./model";
import { SupabaseSigningRepository } from "./repository";
import { SigningEngine } from "./service";
import { SigningStorage } from "./storage";
import { discoverProviders } from "./providers";
export const signingHeaders={"Cache-Control":"private, no-store, max-age=0","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow, noarchive"};
export async function signingBody(request:NextRequest) {
  if(request.headers.get("content-type")?.split(";")[0]!=="application/json" || !request.body) throw new SigningFault("invalid");
  const reader=request.body.getReader(),decoder=new TextDecoder("utf-8",{fatal:true});let text="",size=0;
  try {for(;;){const p=await reader.read();if(p.done) break;size+=p.value.length;if(size>32768){void reader.cancel().catch(()=>{});throw new SigningFault("invalid");}text+=decoder.decode(p.value,{stream:true});}
    return JSON.parse(text+decoder.decode()) as unknown;
  }catch{throw new SigningFault("invalid");}finally{reader.releaseLock();}
}
export function publicSigningView(s:Session) {const verified=s.clientVerified===true || ["client_signed","finalization_pending","completed"].includes(s.state);return {id:s.id,version:s.version,state:s.state,locale:s.locale,assurance:s.assurance,clientVerified:verified,clientName:verified?s.clientName:"",expiresAt:s.expiresAt,
  originalChecksum:s.original.checksum,reviewChecksum:s.intermediate?.checksum ?? s.original.checksum,finalChecksum:s.final?.checksum ?? null,agencyName:verified?s.agencySignature?.typedName ?? null:null};}
export async function handleSigning(request:NextRequest,locale:string,guest=false) {
  const pending:{name:string;value:string;options?:Parameters<NextResponse["cookies"]["set"]>[2]}[]=[];
  const json=(body:object,status=200)=>{const r=NextResponse.json(body,{status,headers:signingHeaders});for(const c of pending)r.cookies.set(c.name,c.value,c.options??{});return r;};
  try {
    if(!isLocale(locale)) return json({ok:false,code:"not-found"},404);
    const origin=appOrigin(process.env.CONTRATPRO_APP_ORIGIN);
    if(request.method!=="POST" || request.nextUrl.origin!==origin || request.headers.get("origin")!==origin) throw new SigningFault("forbidden");
    if(process.env.CONTRATPRO_SIGNING_VERIFIED!=="true" || !/^[a-f0-9]{64}$/.test(process.env.CONTRATPRO_SIGNING_SECRET??"")) throw new SigningFault("unavailable");
    let agencyId:string|null=null;
    const config=publicAuthConfig();
    const client=guest ? createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:"no-store",signal:AbortSignal.timeout(15000)})}}) :
      serverAuthClient({getAll:()=>request.cookies.getAll(),setAll:values=>{for(const c of values){request.cookies.set(c.name,c.value);pending.push(c);}}});
    if(!guest){const context=await supabaseAgencyContext(client,process.env.CONTRATPRO_AUTH_ACCESS_VERIFIED==="true",Date.now,readSelection(request.cookies.get(selectionCookie)?.value));
      if(context.access.status!=="authorized" || !context.canonical || context.canonical.userId!==context.access.userId)throw new SigningFault("forbidden");agencyId=context.access.agencyId;}
    const body=await signingBody(request);if(!isRecord(body) || typeof body.action!=="string" || !isRecord(body.input))throw new SigningFault("invalid");
    const p=body.input,action=body.action,token=typeof body.token==="string" ? body.token : undefined;
    const font=["agency-sign","client-sign","finalize"].includes(action) && process.env.CONTRATPRO_DOCUMENT_FONT_PATH ? new Uint8Array(await readFile(process.env.CONTRATPRO_DOCUMENT_FONT_PATH)) : new Uint8Array();
    const engine=new SigningEngine(new SupabaseSigningRepository(client,process.env.CONTRATPRO_SIGNING_SECRET!),new SigningStorage(guest?null:client),process.env.CONTRATPRO_SIGNING_SECRET!,font);
    let value:unknown;
    const sessionId=guest ? null : typeof p.sessionId==="string" ? p.sessionId : null;
    if(action==="providers"&&agencyId)value=discoverProviders();
    else if(action==="get") {const s=await engine.get(agencyId,sessionId,token);value=guest?publicSigningView(s):s;}
    else if(action==="document" || action==="final-pdf" || action==="evidence") {
      let bytes:Uint8Array;let mime="application/pdf",name="contrat-signe.pdf";
      if(action==="evidence") {if(guest || !agencyId || !sessionId)throw new SigningFault("forbidden");bytes=Buffer.from(JSON.stringify(await engine.dossier(agencyId,sessionId),null,2));mime="application/json";name="preuves-signature.json";}
      else bytes=await engine.document(agencyId,sessionId,token,action==="final-pdf");
      const r=new NextResponse(Buffer.from(bytes),{headers:{...signingHeaders,"Content-Type":mime,"Content-Disposition":`attachment; filename="${name}"`}});for(const c of pending)r.cookies.set(c.name,c.value,c.options??{});return r;
    }else if(action==="list" && agencyId) value=(await engine.list(agencyId,String(p.rentalId))).map(s=>({...s,recoveryAvailable:process.env.CONTRATPRO_A3_VERIFIED==="true"}));
    else if(action==="create" && agencyId) {
      if(!["simple","external-advanced","external-qualified-requested"].includes(String(p.assurance)))throw new SigningFault("unsupported-assurance");
      value=await engine.create(agencyId,{artifactId:String(p.artifactId),requestId:String(p.requestId),locale,assurance:p.assurance as Assurance,providerId:typeof p.providerId==="string"?p.providerId:null});
    }else if(action==="agency-sign" && agencyId && sessionId) value=await engine.agencySign(agencyId,{sessionId,version:Number(p.version),requestId:String(p.requestId),capture:p.capture});
    else if((action==="invite" || action==="renew") && agencyId && sessionId)value=await engine.invite(agencyId,{sessionId,version:Number(p.version),requestId:String(p.requestId),renew:action==="renew"},origin,locale);
    else if(action==="verify" && guest && token)value=await engine.verify(token,String(p.code),String(p.requestId)).then(r=>({challengeId:r.challengeId,session:publicSigningView(r.session)}));
    else if(action==="client-sign" && guest && token)value=publicSigningView(await engine.clientSign(token,{version:Number(p.version),requestId:String(p.requestId),challengeId:String(p.challengeId),capture:p.capture}));
    else if(action==="finalize") {const s=await engine.finalize(agencyId,sessionId,token);value=guest?publicSigningView(s):s;}
    else if(action==="cancel" && agencyId && sessionId)value=await engine.command(agencyId,"cancel",{sessionId,version:Number(p.version),requestId:String(p.requestId)});
    else if(action==="revoke-invitation" && agencyId && sessionId){
      if(process.env.CONTRATPRO_A3_VERIFIED!=="true")throw new SigningFault("unavailable");
      value=await new SupabaseSigningRepository(client,process.env.CONTRATPRO_SIGNING_SECRET!).call(agencyId,"revoke-invitation",{sessionId,version:Number(p.version),requestId:String(p.requestId)});
    }
    else if(action==="decline" && guest && token)value=publicSigningView(await engine.command(null,"decline",{version:Number(p.version),requestId:String(p.requestId)},token));
    else throw new SigningFault("invalid");
    return json({ok:true,value});
  }catch(error){const code=error instanceof SigningFault?error.code:"unavailable";return json({ok:false,code},code==="quota"?429:code==="restricted"?402:code==="forbidden"?403:code==="not-found"?404:code==="rate-limited"?429:code==="conflict"?409:code==="unavailable" || code==="reconciliation-required"?503:422);}
}
