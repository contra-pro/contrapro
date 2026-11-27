import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyContext } from "../auth/identity";
import { handleOperations } from "./handler";
vi.mock("server-only",()=>({}));
const subject="10000000-0000-4000-8000-000000000001",aid="10000000-0000-4000-8000-000000000002",uid="10000000-0000-4000-8000-000000000003",mid="10000000-0000-4000-8000-000000000004";
const context:AgencyContext={canonical:{subject,userId:uid,expiresAt:9999999999999},access:{status:"authorized",userId:uid,agencyId:aid,membershipId:mid,agencyName:"Fixture"},choices:[]};
const call=vi.fn(),getUser=vi.fn(),origin="https://contratpro.example";
const client={auth:{getUser}} as unknown as SupabaseClient;
const deps={ready:()=>true,secret:()=>"a".repeat(64),origin:()=>origin,client:()=>client,context:async()=>context,repository:()=>({call})};
const request=(action:string,input:object={},requestOrigin=origin)=>new NextRequest(`${origin}/fr/app/operations-action`,{method:"POST",headers:{origin:requestOrigin,"content-type":"application/json"},body:JSON.stringify({action,input})});
beforeEach(()=>{vi.clearAllMocks();call.mockResolvedValue({id:mid,expiresAt:"2026-12-02T00:00:00Z"});getUser.mockResolvedValue({data:{user:{id:subject,email:"verified@example.com",email_confirmed_at:"2026-01-01T00:00:00Z"}},error:null});});
it("rejects cross-origin, disabled gate and oversized bodies before any mutation",async()=>{
 expect((await handleOperations(request("team",{},"https://foreign.example"),"fr",deps)).status).toBe(403);
 expect((await handleOperations(request("team"),"fr",{...deps,ready:()=>false})).status).toBe(503);
 expect((await handleOperations(request("team",{padding:"x".repeat(400001)}),"fr",deps)).status).toBe(422);
 expect(call).not.toHaveBeenCalled();
});
it("binds acceptance to fresh confirmed Auth email and canonical subject, not a posted identity",async()=>{
 const req=request("accept",{token:"f".repeat(64)});
 expect((await handleOperations(req,"fr",deps)).status).toBe(200);
 expect(call).toHaveBeenCalledWith(null,"accept",{digest:expect.stringMatching(/^[a-f0-9]{64}$/),verifiedEmail:"verified@example.com"});
 expect((await handleOperations(request("accept",{token:"f".repeat(64),verifiedEmail:"attacker@example.com"}),"fr",deps)).status).toBe(422);
 getUser.mockResolvedValue({data:{user:{id:subject,email:"verified@example.com"}},error:null});
 expect((await handleOperations(request("accept",{token:"f".repeat(64)}),"fr",deps)).status).toBe(403);
});
it("prepares stable private invitation links and never invokes email delivery",async()=>{
 const input={requestId:mid,roleId:uid,email:"Owner@example.com"};
 const a=await (await handleOperations(request("invite",input),"fr",deps)).json(),b=await (await handleOperations(request("invite",input),"fr",deps)).json();
 expect(a.value.url).toBe(b.value.url);expect(a.value.url).toContain("/fr/app/team/accept#token=");expect(a.value.delivery).toBe("prepared-not-sent");
 expect(call).toHaveBeenCalledWith(aid,"invite",expect.objectContaining({email:"owner@example.com",digest:expect.any(String)}));
});
it("validates exact money, location shape and rental details before RPC",async()=>{
 expect((await handleOperations(request("payment",{requestId:mid,rentalId:uid,revision:0,payment:{kind:"payment",amountMinor:1.5}}),"fr",deps)).status).toBe(422);
 expect((await handleOperations(request("locations",{requestId:mid,rentalId:uid,revision:0,locations:{pickup:"",returnLocation:"Rabat"}}),"fr",deps)).status).toBe(422);
 expect(call).not.toHaveBeenCalled();
});
