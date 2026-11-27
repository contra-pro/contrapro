import { NextRequest,NextResponse } from "next/server";
import { workerAuthorized } from "../../../../maintenance/access";
import { maintenanceReadiness } from "../../../../maintenance/runtime";
export async function GET(request:NextRequest){
 const reply=(ready:boolean,status:number)=>NextResponse.json({ready},{status,headers:{"Cache-Control":"private, no-store"}});
 if(!workerAuthorized(request.headers.get("authorization"),process.env.CONTRATPRO_MAINTENANCE_ACCESS_SECRET))return reply(false,403);
 try{await maintenanceReadiness();return reply(true,200);}catch{return reply(false,503);}
}
