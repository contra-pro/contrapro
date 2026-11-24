import type { SupabaseClient } from "@supabase/supabase-js";
import { BillingFault } from "./model";
import { gatewayMac, type BillingGateway } from "./provider";
export function billingError(code: string) {
  return new BillingFault(code === "42501" ? "forbidden" : ["40001","23505"].includes(code) ? "conflict" : code === "PBL01" ? "quota" : code === "PBL02" ? "restricted" : ["22023","22P02","22003","23514","23502","P0002","P0003"].includes(code) ? "invalid" : "unavailable");
}
export class BillingRepository {
  constructor(private client: SupabaseClient) {}
  async call<T>(agencyId: string | null, action: string, input: object, platform=false): Promise<T> {
    const { data,error } = await this.client.rpc(platform ? "contratpro_billing_platform" : "contratpro_billing_agency", platform ? {p_action:action,p_input:input} : {p_agency_id:agencyId,p_action:action,p_input:input});
    if (error) throw billingError(error.code);return data as T;
  }
}
export class ProviderGateway implements BillingGateway {
  constructor(private client: SupabaseClient, private secret: string) {}
  async call<T>(input: object): Promise<T> {
    const payload=JSON.stringify(input), {data,error}=await this.client.rpc("contratpro_billing_gateway",{p_payload:payload,p_mac:gatewayMac(this.secret,payload)});
    if(error) throw billingError(error.code);return data as T;
  }
}
