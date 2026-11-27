import {NextResponse} from 'next/server';
import {getAgencyContext} from '../../../server/agency-access';
import {operationalDashboard} from '../../../server/operational-dashboard';
import {dashboardTime} from '../../../server/dashboard-time';
export async function GET(){
 const reply=(body:object,status:number)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
 try{const context=await getAgencyContext();if(context.access.status!=='authorized'||!context.canonical||context.canonical.userId!==context.access.userId)return reply({ok:false},403);
 const at=await dashboardTime();return reply({ok:true,data:await operationalDashboard(context.access.agencyId,at),at},200);
 }catch{return reply({ok:false},503);}
}
