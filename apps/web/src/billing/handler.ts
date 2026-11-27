import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { serverAuthClient } from "../auth/server";
import { supabaseAgencyContext, verifiedSubject } from "../auth/identity";
import { appOrigin } from "../auth/config";
import { readSelection, selectionCookie } from "../agency/selection";
import { isLocale } from "../i18n/locales";
import { isRecord } from "../../../../packages/application/src/agency-management";
import { signingBody, signingHeaders } from "../signing/handler";
import { BillingFault } from "./model";
import { BillingRepository } from "./repository";
export async function handleBilling(request: NextRequest, locale: string, platform=false) {
  const pending: {name:string;value:string;options?:Parameters<NextResponse["cookies"]["set"]>[2]}[]=[];
  const json=(value:object,status=200)=>{const r=NextResponse.json(value,{status,headers:signingHeaders});for(const c of pending)r.cookies.set(c.name,c.value,c.options??{});return r;};
  try {
    if(!isLocale(locale))throw new BillingFault("invalid");
    const origin=appOrigin(process.env.CONTRATPRO_APP_ORIGIN);
    if(request.method!=="POST"||request.nextUrl.origin!==origin||request.headers.get("origin")!==origin)throw new BillingFault("forbidden");
    if(process.env.CONTRATPRO_BILLING_VERIFIED!=="true")throw new BillingFault("unavailable");
    const client=serverAuthClient({getAll:()=>request.cookies.getAll(),setAll:values=>{for(const c of values){request.cookies.set(c.name,c.value);pending.push(c);}}});
    let agencyId:string|null=null;
    if(platform){if(!await verifiedSubject(client))throw new BillingFault("forbidden");}
    else {const ctx=await supabaseAgencyContext(client,process.env.CONTRATPRO_AUTH_ACCESS_VERIFIED==="true",Date.now,readSelection(request.cookies.get(selectionCookie)?.value));if(ctx.access.status!=="authorized"||!ctx.canonical||ctx.canonical.userId!==ctx.access.userId)throw new BillingFault("forbidden");agencyId=ctx.access.agencyId;}
    let body:unknown;try{body=await signingBody(request);}catch{throw new BillingFault("invalid");}
    if(!isRecord(body)||typeof body.action!=="string"||!isRecord(body.input))throw new BillingFault("invalid");
    if(["history","support-page"].includes(body.action)&&process.env.CONTRATPRO_A4_VERIFIED!=="true")throw new BillingFault("unavailable");
    const value=await new BillingRepository(client).call(agencyId,body.action,body.input,platform);
    if(body.action==="dashboard"&&isRecord(value))value.a4Enabled=process.env.CONTRATPRO_A4_VERIFIED==="true";
    return json({ok:true,value});
  } catch(error) {const code=error instanceof BillingFault?error.code:"unavailable";return json({ok:false,code},code==="forbidden"?403:code==="invalid"?422:code==="conflict"?409:code==="quota"?429:code==="restricted"?402:503);}
}
