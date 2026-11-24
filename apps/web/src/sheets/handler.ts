import "server-only";
import { NextRequest,NextResponse } from "next/server";
import { serverAuthClient } from "../auth/server";
import { supabaseAgencyContext } from "../auth/identity";
import { readSelection,selectionCookie } from "../agency/selection";
import { isLocale } from "../i18n/locales";
import { isRecord,isUuid } from "../../../../packages/application/src/agency-management";
import { signingBody,signingHeaders } from "../signing/handler";
import { SheetsFault,destination,mapping } from "./model";
import { sheetsServices } from "./runtime";
const cookieName="__Host-contratpro-sheets-state";
export async function handleSheets(request:NextRequest,locale:string,callback=false){
  let safeOrigin:string|undefined;
  const pending:{name:string;value:string;options?:Parameters<NextResponse["cookies"]["set"]>[2]}[]=[];
  const finish=(response:NextResponse)=>{for(const c of pending)response.cookies.set(c.name,c.value,c.options??{});return response;};
  const json=(value:object,status=200)=>finish(NextResponse.json(value,{status,headers:signingHeaders}));
  try{
    if(!isLocale(locale))throw new SheetsFault("invalid");
    const client=serverAuthClient({getAll:()=>request.cookies.getAll(),setAll:values=>{for(const c of values){request.cookies.set(c.name,c.value);pending.push(c);}}});
    const context=await supabaseAgencyContext(client,process.env.CONTRATPRO_AUTH_ACCESS_VERIFIED==="true",Date.now,readSelection(request.cookies.get(selectionCookie)?.value));
    if(context.access.status!=="authorized"||!context.canonical||context.canonical.userId!==context.access.userId)throw new SheetsFault("forbidden");
    const {config,agency,oauth,google,worker}=sheetsServices(client),aid=context.access.agencyId;
    safeOrigin=config.origin;
    if(request.nextUrl.origin!==config.origin)throw new SheetsFault("forbidden");
    if(callback){
      if(request.method!=="GET")throw new SheetsFault("invalid");
      pending.push({name:cookieName,value:"",options:{path:"/",httpOnly:true,secure:true,sameSite:"lax",maxAge:0}});
      await oauth.complete(aid,locale,request.nextUrl.searchParams.get("state")??"",request.cookies.get(cookieName)?.value??"",request.nextUrl.searchParams.get("code")??"");
      return finish(NextResponse.redirect(new URL(`/${locale}/app/sheets?oauth=connected`,config.origin),{status:303,headers:signingHeaders}));
    }
    if(request.method!=="POST"||request.headers.get("origin")!==config.origin)throw new SheetsFault("forbidden");
    const body:unknown=await signingBody(request);if(!isRecord(body)||typeof body.action!=="string"||!isRecord(body.input))throw new SheetsFault("invalid");const p=body.input;let value:unknown;
    if(body.action==="dashboard"){if(p.contractId!==undefined&&!isUuid(p.contractId))throw new SheetsFault("invalid");value=await agency!.call(aid,"dashboard",p.contractId?{contractId:p.contractId}:{});}
    else {
      await agency!.call(aid,"authorize",{});
      if(body.action==="connect"){
        if(p.mode!=="created"&&p.mode!=="existing")throw new SheetsFault("invalid");const result=await oauth.start(aid,locale,p.mode);
        pending.push({name:cookieName,value:result.state,options:{path:"/",httpOnly:true,secure:true,sameSite:"lax",maxAge:600}});value={url:result.url};
      }else if(body.action==="disconnect"){await oauth.revoke(aid);value=true;}
      else if(body.action==="metadata"){const meta=await google.metadata(await oauth.access(aid),String(p.spreadsheetId));value={spreadsheetId:meta.spreadsheetId,sheets:meta.sheets.map(s=>s.properties)};}
      else if(body.action==="create-spreadsheet"){value=await google.createSpreadsheet(await oauth.access(aid),String(p.title),String(p.requestId));}
      else if(body.action==="create-worksheet"){
        const d=destination({spreadsheetId:String(p.spreadsheetId),sheetId:Number(p.sheetId),columns:mapping(p.columns),revision:Number(p.revision)+1});
        await google.createWorksheet(await oauth.access(aid),aid,d,String(p.title));value={sheetId:d.sheetId};
      }else if(body.action==="configure"){
        let d;if(p.destination!==undefined){if(!isRecord(p.destination))throw new SheetsFault("invalid");d=destination({spreadsheetId:String(p.destination.spreadsheetId),sheetId:Number(p.destination.sheetId),columns:mapping(p.destination.columns),revision:Number(p.revision)+1});await google.inspect(await oauth.access(aid),aid,d,`${aid}:configuration-probe`);}
        if(typeof p.enabled!=="boolean"||!Number.isSafeInteger(p.revision))throw new SheetsFault("invalid");value=await agency!.call(aid,"configure",{revision:p.revision,enabled:p.enabled,...(d?{destination:d}:{})});
      }else if(body.action==="retry"||body.action==="reconcile"||body.action==="resolve-destination"){
        if(!isUuid(p.contractId))throw new SheetsFault("invalid");value=body.action==="reconcile"?await worker.reconcile(aid,p.contractId):await agency!.call(aid,body.action,{contractId:p.contractId,...(body.action==="resolve-destination"?{acknowledge:p.acknowledge===true}:{})});
      }else throw new SheetsFault("invalid");
    }
    return json({ok:true,value:value??true});
  }catch(error){const code=error instanceof SheetsFault?error.code:"unavailable";
    if(callback&&isLocale(locale)&&safeOrigin)return finish(NextResponse.redirect(new URL(`/${locale}/app/sheets?oauth=failed`,safeOrigin),{status:303,headers:signingHeaders}));
    return json({ok:false,code},code==="restricted"?402:code==="forbidden"?403:code==="conflict"?409:code==="quota"?429:code==="invalid"?422:503);
  }
}
