import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicAuthConfig } from "../auth/config";
import { SupabasePrivateStorage, scopedKey, type PrivateStorage } from "../documents/storage";
import { SigningFault } from "./model";
/** Lifecycle authorization always uses a request JWT or the authenticated gateway.
 * The optional backend key is used only for server-mediated guest file access,
 * after the gateway has resolved the invitation. Never return keys/clients to UI. */
export class SigningStorage implements PrivateStorage {
  constructor(private requestClient:SupabaseClient|null) {}
  private forKey(key:string) {
    const agencyId=key.split("/")[0] ?? "";scopedKey(agencyId,key);
    if(this.requestClient) return new SupabasePrivateStorage(this.requestClient,agencyId);
    const secret=process.env.CONTRATPRO_SIGNING_STORAGE_SERVICE_KEY;
    if(!secret || !(secret.startsWith("sb_secret_") || secret.split(".").length===3)) throw new SigningFault("unavailable");
    const {url}=publicAuthConfig();
    return new SupabasePrivateStorage(createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:"no-store",signal:AbortSignal.timeout(15000)})}}),agencyId);
  }
  get(key:string) {return this.forKey(key).get(key);}
  put(key:string,bytes:Uint8Array,mime:string) {return this.forKey(key).put(key,bytes,mime);}
  async remove():Promise<void> {throw new SigningFault("forbidden");}
}
