import { expect,it,vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { rentalRpc } from "../rentals/data";
import { vehicleRpc } from "../vehicles/data";
import { SupabaseSigningRepository } from "../signing/repository";
import { billingError } from "./repository";
import { rentalMessages } from "../rentals/messages";
import { signingMessages } from "../signing/messages";
import { documentMessages } from "../documents/messages";
import { vehicleMessages } from "../i18n/vehicles";
it.each([['PBL01','quota'],['PBL02','restricted']] as const)("maps %s separately from missing records across business RPCs",async(code,reason)=>{
 const client={rpc:vi.fn(async()=>({data:null,error:{code}}))} as unknown as SupabaseClient;
 await expect(rentalRpc(client,"test",{})).rejects.toMatchObject({code:reason});
 await expect(vehicleRpc(client,"test",{})).rejects.toMatchObject({code:reason});
 await expect(new SupabaseSigningRepository(client,"a".repeat(64)).call("agency","create",{})).rejects.toMatchObject({code:reason});
 expect(billingError(code).code).toBe(reason);
});
it.each(["fr","ar"] as const)("%s supplies quota and restricted copy to existing workflows",locale=>{
 for(const copy of [rentalMessages(locale),signingMessages(locale).errors,documentMessages(locale).errors,vehicleMessages(locale)]){expect(copy.quota.length).toBeGreaterThan(10);expect(copy.restricted.length).toBeGreaterThan(10);}
});
