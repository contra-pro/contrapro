import type { SupabaseClient } from "@supabase/supabase-js";
import { DeliveryFault,type DeliveryRepository } from "./model";
import { keyed } from "./secrets";
export class SupabaseDeliveryRepository implements DeliveryRepository {
  constructor(private client:SupabaseClient,private secret:string,private worker=false){}
  async call<T>(agencyId:string|null,action:string,input:object):Promise<T>{const payload=JSON.stringify({agencyId,action,input});const {data,error}=await this.client.rpc(this.worker?"contratpro_delivery_worker":"contratpro_delivery_agency",{p_payload:payload,p_mac:keyed(this.secret,payload)});
    if(error)throw new DeliveryFault(error.code==="42501"?"forbidden":error.code==="P0002"?"not-found":["40001","23505"].includes(error.code)?"conflict":error.code==="22023"?"invalid":"unavailable");
    if(data&&typeof data==="object"&&"denied" in data)throw new DeliveryFault(data.denied==="not-found"?"not-found":"rate-limited");return data as T;}
}
