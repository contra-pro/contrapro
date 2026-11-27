import { NextRequest,NextResponse } from "next/server";
import { workerAuthorized } from "../../../../../maintenance/access";
import { maintenanceTick } from "../../../../../maintenance/runtime";
export const runtime="nodejs";
export const maxDuration=120;
export async function POST(request:NextRequest){
 const reply=(body:object,status:number)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
 if(!workerAuthorized(request.headers.get("authorization"),process.env.CONTRATPRO_MAINTENANCE_ACCESS_SECRET))return reply({ok:false},403);
 if(process.env.CONTRATPRO_A5_VERIFIED!=="true")return reply({ok:true,disabled:true},200);
 try{return reply({ok:true,...await maintenanceTick()},200);}catch{return reply({ok:false,code:"unavailable"},503);}
}
