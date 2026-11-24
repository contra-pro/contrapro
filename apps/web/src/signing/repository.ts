import type { SupabaseClient } from "@supabase/supabase-js";
import { isRecord } from "../../../../packages/application/src/agency-management";
import { SigningFault, type SigningRepository } from "./model";
import { mac } from "./crypto";
export class SupabaseSigningRepository implements SigningRepository {
  constructor(private client: SupabaseClient,private secret: string) {}
  async call<T>(agencyId: string|null,action: string,input: object):Promise<T> {
    const payload=JSON.stringify({agencyId,action,input});
    const {data,error}=await this.client.rpc(agencyId ? "contratpro_signing_agency" : "contratpro_signing_public",{p_payload:payload,p_mac:mac(this.secret,payload)});
    if(error) throw new SigningFault(error.code==="PBL01" ? "quota" : error.code==="PBL02" ? "restricted" : error.code==="42501" ? "forbidden" : error.code==="P0002" ? "not-found" : ["40001","23505"].includes(error.code) ? "conflict" : error.code==="22023" ? "invalid" : "unavailable");
    if(!isRecord(data) || data.ok!==true) {
      const code=isRecord(data) ? data.code : "unavailable";
      throw new SigningFault(["expired","consumed","rate-limited","verification-failed"].includes(String(code)) ? code as "expired"|"consumed"|"rate-limited"|"verification-failed" : "unavailable");
    } return data.value as T;
  }
}
