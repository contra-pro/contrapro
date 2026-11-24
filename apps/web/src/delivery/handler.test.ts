import { afterEach,expect,it,vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only",()=>({}));
import { handleDelivery } from "./handler";
afterEach(()=>vi.unstubAllEnvs());
it("keeps delivery and guest downloads closed without acceptance gates",async()=>{vi.stubEnv("CONTRATPRO_DELIVERY_VERIFIED","false");const request=new NextRequest("http://localhost:3000/fr/contract/action",{method:"POST",headers:{origin:"http://localhost:3000","Content-Type":"application/json"},body:'{"action":"download","input":{"token":"bad"}}'});expect((await handleDelivery(request,"fr",true)).status).toBe(503);});
