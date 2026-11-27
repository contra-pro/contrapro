import "server-only";
import { NextRequest,NextResponse } from "next/server";
import { appOrigin } from "../auth/config";
import { serverAuthClient } from "../auth/server";
import { verifiedSubject } from "../auth/identity";
import { signingBody } from "../signing/handler";
import { isRecord } from "../../../../packages/application/src/agency-management";
export async function handleMaintenance(request:NextRequest){
 const pending:{name:string;value:string;options?:Parameters<NextResponse["cookies"]["set"]>[2]}[]=[];
 const reply=(body:object,status=200)=>{const r=NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});for(const c of pending)r.cookies.set(c.name,c.value,c.options??{});return r;};
 try{
  const origin=appOrigin(process.env.CONTRATPRO_APP_ORIGIN);
  if(request.headers.get("origin")!==origin||request.nextUrl.origin!==origin)return reply({ok:false},403);
  if(process.env.CONTRATPRO_A5_VERIFIED!=="true")return reply({ok:false},503);
  const client=serverAuthClient({getAll:()=>request.cookies.getAll(),setAll:values=>{for(const c of values)pending.push(c);}});
  if(!await verifiedSubject(client))return reply({ok:false},403);
  const body:unknown=await signingBody(request);if(!isRecord(body)||typeof body.action!=="string"||!isRecord(body.input))return reply({ok:false},422);
  const {data,error}=await client.rpc("contratpro_maintenance_platform",{action:body.action,p:body.input});
  if(error)return reply({ok:false},error.code==="42501"?403:422);
  return reply({ok:true,value:data});
 }catch{return reply({ok:false},503);}
}
