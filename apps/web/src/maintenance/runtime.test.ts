import { afterEach,expect,it,vi } from "vitest";
vi.mock("server-only",()=>({}));
import { executeTask,maintenanceRepository } from "./runtime";
import { workerAuthorized } from "./access";
import { NextRequest } from "next/server";
import { POST } from "../app/api/internal/maintenance/run/route";
import { GET as live } from "../app/api/health/live/route";
import { GET as ready } from "../app/api/health/ready/route";
import { deliveryConfig } from "../delivery/runtime";
afterEach(()=>vi.unstubAllEnvs());
it("does not access queues or providers for disabled integrations",async()=>{
 for(const key of ["DELIVERY","RESEND","SHEETS","SIGNING","DOCUMENTS"])vi.stubEnv(`CONTRATPRO_${key}_VERIFIED`,"false");
 const call=vi.fn();for(const task of ["delivery","sheets","reconcile","finalization","generation","cleanup"] as const)expect(await executeTask(task,{call})).toBe("disabled");expect(call).not.toHaveBeenCalled();
});
it("requires a distinct MAC key and refuses startup while unverified",()=>{
 vi.stubEnv("CONTRATPRO_A5_VERIFIED","false");expect(()=>maintenanceRepository()).toThrow("unavailable");vi.stubEnv("CONTRATPRO_A5_VERIFIED","true");vi.stubEnv("CONTRATPRO_MAINTENANCE_GATEWAY_SECRET","a".repeat(64));vi.stubEnv("CONTRATPRO_MAINTENANCE_ACCESS_SECRET","a".repeat(64));expect(()=>maintenanceRepository()).toThrow("unavailable");
 vi.stubEnv("CONTRATPRO_DELIVERY_VERIFIED","true");vi.stubEnv("CONTRATPRO_DELIVERY_GATEWAY_SECRET","a".repeat(64));vi.stubEnv("CONTRATPRO_DELIVERY_ENCRYPTION_KEY","b".repeat(64));vi.stubEnv("CONTRATPRO_DELIVERY_KEY_ID","v1");vi.stubEnv("CONTRATPRO_DELIVERY_DERIVATION_KEY","");vi.stubEnv("CONTRATPRO_DELIVERY_HISTORICAL_KEYS","{}");vi.stubEnv("CONTRATPRO_APP_ORIGIN","https://app.example.test");
 expect(()=>deliveryConfig(true)).toThrow("unavailable");vi.stubEnv("CONTRATPRO_DELIVERY_DERIVATION_KEY","d".repeat(64));expect(deliveryConfig(true).derivationKey).toBe("d".repeat(64));vi.stubEnv("CONTRATPRO_DELIVERY_HISTORICAL_KEYS",JSON.stringify({old:"d".repeat(64)}));expect(()=>deliveryConfig(true)).toThrow("unavailable");
});
it("health and worker endpoints redact configuration and require worker authority",async()=>{
 vi.stubEnv("CONTRATPRO_MAINTENANCE_ACCESS_SECRET","b".repeat(64));vi.stubEnv("CONTRATPRO_A5_VERIFIED","false");
 expect(workerAuthorized("Bearer bad","b".repeat(64))).toBe(false);
 expect(await live().json()).toEqual({live:true});
 const request=new NextRequest("https://app.example.invalid/api/internal/maintenance/run",{method:"POST"});expect((await POST(request)).status).toBe(403);expect((await ready(request)).status).toBe(403);
 const authorized=new NextRequest(request.url,{method:"POST",headers:{authorization:`Bearer ${"b".repeat(64)}`}});expect(await (await POST(authorized)).json()).toEqual({ok:true,disabled:true});expect(await (await ready(authorized)).json()).toEqual({ready:false});
});
