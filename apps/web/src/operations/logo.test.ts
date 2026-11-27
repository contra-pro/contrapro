import { expect, it, vi } from "vitest";
import { logoBytes, saveLogo } from "./logo";
import { capturedConfiguration } from "../documents/model";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OperationsRepository } from "./repository";
const png="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=";
it("decodes bounded PNG content and rejects unsafe, huge, corrupt or animated uploads",async()=>{
 expect((await logoBytes(png)).length).toBeGreaterThan(50);
 for(const p of ["data:image/svg+xml,<svg/>","data:image/png;base64,AAAA",png+"A",`data:image/png;base64,${"A".repeat(300000)}`])await expect(logoBytes(p)).rejects.toThrow("invalid");
});
it("uses only immutable captured branding, never template-time or current agency bytes",()=>{
 const config={locale:"fr" as const,mappings:[],signatures:[],custom:[],agencyLogo:true,logo:{page:1,x:10,y:10,width:40,height:40,data:"old template bytes"}};
 const snapshot={parties:{agency:{logoData:png}}},result=capturedConfiguration(config,snapshot);
 expect(result.logo?.data).toBe(png);expect(config.logo.data).toBe("old template bytes");
 expect(()=>capturedConfiguration(config,{parties:{agency:{}}})).toThrow("missing-values");
});
it("reserves a scoped immutable logo object, recovers uncertain uploads by hash, and never overwrites",async()=>{
 const calls:string[]=[],call=vi.fn(async(_a,action)=>{calls.push(action);return {revision:1};}),upload=vi.fn(async()=>({error:{message:"response lost"}}));
 const download=vi.fn(async()=>({error:null,data:new Blob([await logoBytes(png)])}));
 const client={storage:{from:()=>({upload,download})}} as unknown as SupabaseClient;
 const input={requestId:"10000000-0000-4000-8000-000000000001",revision:0,data:png},aid="10000000-0000-4000-8000-000000000002";
 await saveLogo(client,{call:call as OperationsRepository["call"]},aid,input);expect(calls).toEqual(["logo-reserve","logo-set"]);expect(upload).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^${aid}/originals/`)),expect.any(Uint8Array),{contentType:"image/png",upsert:false});
 download.mockResolvedValue({error:null,data:new Blob(["wrong"])});await expect(saveLogo(client,{call:call as OperationsRepository["call"]},aid,input)).rejects.toThrow("unavailable");
 expect(call.mock.calls.filter(c=>c[1]==="logo-set")).toHaveLength(1);
});
