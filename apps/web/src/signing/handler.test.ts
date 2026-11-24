import { afterEach,expect,it,vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only",()=>({}));
import { handleSigning,signingBody,signingHeaders } from "./handler";
afterEach(()=>vi.unstubAllEnvs());
const request=(origin="http://localhost:3000",body="{}")=>new NextRequest("http://localhost:3000/fr/sign/action",{method:"POST",headers:{origin,"Content-Type":"application/json"},body});
it("fails closed without activation and rejects cross-origin signing",async()=>{vi.stubEnv("CONTRATPRO_APP_ORIGIN","http://localhost:3000");vi.stubEnv("CONTRATPRO_SIGNING_VERIFIED","false");expect((await handleSigning(request(),"fr",true)).status).toBe(503);expect((await handleSigning(request("https://evil.example"),"fr",true)).status).toBe(403);expect(signingHeaders["Referrer-Policy"]).toBe("no-referrer");});
it("bounds actual request bytes and invalid UTF/JSON before signing",async()=>{await expect(signingBody(request("http://localhost:3000","{"))).rejects.toThrow("invalid");await expect(signingBody(request("http://localhost:3000","x".repeat(32769)))).rejects.toThrow("invalid");});
