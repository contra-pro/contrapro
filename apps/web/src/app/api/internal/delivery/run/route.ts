import { timingSafeEqual } from "node:crypto";
import { NextRequest,NextResponse } from "next/server";
import { createDeliveryWorker,workerRepository } from "../../../../../delivery/runtime";
export const runtime="nodejs";
export async function POST(request:NextRequest){
  const key=process.env.CONTRATPRO_DELIVERY_WORKER_ACCESS_SECRET??"",provided=request.headers.get("authorization")?.replace(/^Bearer /,"")??"";
  const reply=(body:object,status:number)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
  if(!/^[a-f0-9]{64}$/.test(key)||!/^[a-f0-9]{64}$/.test(provided)||!timingSafeEqual(Buffer.from(provided),Buffer.from(key)))return reply({ok:false},403);
  try{const worker=createDeliveryWorker();await worker.materializeOnce();const result=await worker.runOnce();await workerRepository().repo.call(null,"purge-expired",{});return reply({ok:true,processed:result!==null},200);}catch{return reply({ok:false,code:"unavailable"},503);}
}
