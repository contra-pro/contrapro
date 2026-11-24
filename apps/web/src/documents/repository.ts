import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentRepository } from "./service";
import { DocumentFault, scope } from "./model";
export class SupabaseDocumentRepository implements DocumentRepository {
  constructor(private client: SupabaseClient) {}
  async call<T>(agencyId: string, action: string, input: object): Promise<T> {
    scope(agencyId);
    const { data, error } = await this.client.rpc("contratpro_documents", { p_agency_id: agencyId, p_action: action, p_input: input });
    if (error) throw new DocumentFault(error.code === "PBL01" ? "quota" : error.code === "PBL02" ? "restricted" : error.code === "42501" ? "forbidden" : error.code === "P0002" ? "not-found" : ["40001", "23505"].includes(error.code) ? "conflict" : error.code === "22023" ? "invalid" : "unavailable");
    return data as T;
  }
}
