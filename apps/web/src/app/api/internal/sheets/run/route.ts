import { timingSafeEqual } from "node:crypto";
import { NextRequest,NextResponse } from "next/server";
import { sheetsServices } from "../../../../../sheets/runtime";
export const runtime="nodejs";
export async function POST(request:NextRequest){
  const key=process.env.CONTRATPRO_SHEETS_WORKER_ACCESS_SECRET??"",provided=request.headers.get("authorization")?.replace(/^Bearer /,"")??"";
  const reply=(body:object,status:number)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
  if(!/^[a-f0-9]{64}$/.test(key)||!/^[a-f0-9]{64}$/.test(provided)||!timingSafeEqual(Buffer.from(key),Buffer.from(provided)))return reply({ok:false},403);
  try{const {worker,workerRepo}=sheetsServices();const processed=await worker.tick();await workerRepo.call(null,"purge",{});return reply({ok:true,processed},200);}catch{return reply({ok:false,code:"unavailable"},503);}
}
