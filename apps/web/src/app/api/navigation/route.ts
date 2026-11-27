import { NextResponse } from "next/server";
import { getAgencyContext } from "../../../server/agency-access";
import { componentAuthClient } from "../../../auth/server";
import { navigationCapabilities } from "../../../components/navigation-model";
export async function GET(){
 const reply=(body:object,status:number)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
 try{const context=await getAgencyContext();if(context.access.status!=="authorized"||!context.canonical||context.canonical.userId!==context.access.userId)return reply({ok:false},403);
  const {data,error}=await (await componentAuthClient()).rpc("contratpro_navigation",{p_agency_id:context.access.agencyId});
  if(error)return reply({ok:false},503);return reply({ok:true,capabilities:navigationCapabilities(data,process.env)},200);
 }catch{return reply({ok:false},503);}
}
