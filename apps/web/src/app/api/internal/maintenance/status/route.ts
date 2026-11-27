import { NextRequest,NextResponse } from "next/server";
import { workerAuthorized } from "../../../../../maintenance/access";
import { maintenanceRepository } from "../../../../../maintenance/runtime";
export async function GET(request:NextRequest){
 const reply=(body:object,status:number)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
 if(!workerAuthorized(request.headers.get("authorization"),process.env.CONTRATPRO_MAINTENANCE_ACCESS_SECRET))return reply({ok:false},403);
 try{return reply({ok:true,metrics:await maintenanceRepository().call("overview")},200);}catch{return reply({ok:false},503);}
}
