import type { SupabaseClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { OperationFault } from "./model";
export interface OperationsRepository { call<T>(agencyId: string | null, action: string, input: object): Promise<T> }
export class SupabaseOperationsRepository implements OperationsRepository {
  constructor(private client: SupabaseClient, private secret: string) {}
  async call<T>(agencyId: string | null, action: string, input: object): Promise<T> {
    if (!/^[a-f0-9]{64}$/.test(this.secret)) throw new OperationFault("unavailable");
    const payload = JSON.stringify({ agencyId, action, input });
    const tag = createHmac("sha256", Buffer.from(this.secret, "hex")).update(payload).digest("hex");
    const { data, error } = await this.client.rpc("contratpro_a1", { p_payload: payload, p_mac: tag });
    if (error) throw new OperationFault(error.code === "42501" ? "forbidden" : error.code === "PBL01" ? "quota" : error.code === "PBL02" ? "restricted" : error.code === "P0002" ? "not-found" : ["40001", "23505"].includes(error.code) ? "conflict" : ["22023", "22007", "22008", "23514", "22P02"].includes(error.code) ? "invalid" : "unavailable");
    return data as T;
  }
}
