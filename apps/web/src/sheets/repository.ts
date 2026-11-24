import type { SupabaseClient } from "@supabase/supabase-js";
import { keyed } from "../delivery/secrets";
import { SheetsFault,type Repository } from "./model";
export class SheetsRepository implements Repository {
  constructor(private client:SupabaseClient,private secret:string,private worker=false){}
  async call<T>(agencyId:string|null,action:string,input:object):Promise<T>{
    const payload=JSON.stringify({agencyId,action,input}),{data,error}=await this.client.rpc(this.worker?"contratpro_sheets_worker":"contratpro_sheets_agency",{p_payload:payload,p_mac:keyed(this.secret,payload)});
    if(error)throw new SheetsFault(error.code==="PBL01"?"quota":error.code==="PBL02"?"restricted":error.code==="42501"?"forbidden":["40001","23505"].includes(error.code)?"conflict":error.code==="22023"?"invalid":"unavailable");return data as T;
  }
}
