import { afterEach,beforeEach,expect,it,vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only",()=>({}));
const mocks=vi.hoisted(()=>({context:vi.fn(),agency:vi.fn(),access:vi.fn(),metadata:vi.fn(),start:vi.fn(),complete:vi.fn(),services:vi.fn()}));
vi.mock("../auth/server",()=>({serverAuthClient:()=>({})}));
vi.mock("../auth/identity",()=>({supabaseAgencyContext:mocks.context}));
vi.mock("./runtime",()=>({sheetsServices:mocks.services}));
import { handleSheets } from "./handler";
const aid="40000000-0000-4000-8000-000000000003",origin="https://contratpro.example";
function request(action:string,input:object={},from=origin){return new NextRequest(`${origin}/fr/app/sheets/action`,{method:"POST",headers:{origin:from,"Content-Type":"application/json"},body:JSON.stringify({action,input})});}
beforeEach(()=>{vi.resetAllMocks();mocks.context.mockResolvedValue({access:{status:"authorized",agencyId:aid,userId:"user"},canonical:{userId:"user"}});mocks.agency.mockResolvedValue(true);mocks.services.mockReturnValue({config:{origin},agency:{call:mocks.agency},oauth:{access:mocks.access,start:mocks.start,complete:mocks.complete},google:{metadata:mocks.metadata}});});
afterEach(()=>vi.unstubAllEnvs());
it("denies a missing canonical identity before reading integration credentials",async()=>{mocks.context.mockResolvedValue({access:{status:"authorized",agencyId:aid,userId:"user"},canonical:null});expect((await handleSheets(request("dashboard"),"fr")).status).toBe(403);expect(mocks.services).not.toHaveBeenCalled();});
it("denies a foreign origin before authorized provider calls",async()=>{expect((await handleSheets(request("metadata",{spreadsheetId:"synthetic"},"https://foreign.example"),"fr")).status).toBe(403);expect(mocks.access).not.toHaveBeenCalled();});
it("checks manage capability before external metadata access",async()=>{const {SheetsFault}=await import("./model");mocks.agency.mockRejectedValue(new SheetsFault("forbidden"));expect((await handleSheets(request("metadata",{spreadsheetId:"synthetic"}),"fr")).status).toBe(403);expect(mocks.access).not.toHaveBeenCalled();expect(mocks.metadata).not.toHaveBeenCalled();});
it("uses a secure HttpOnly OAuth state cookie without exposing state in JSON",async()=>{mocks.start.mockResolvedValue({url:"https://accounts.google.com/o/oauth2/v2/auth?state=public-authorization-state",state:"f".repeat(64)});const response=await handleSheets(request("connect",{mode:"created"}),"ar");expect(response.status).toBe(200);expect(response.cookies.get("__Host-contratpro-sheets-state")).toMatchObject({value:"f".repeat(64),httpOnly:true,secure:true,sameSite:"lax",path:"/"});expect(JSON.stringify(await response.json())).not.toContain("f".repeat(64));});
it("immediately cleans the callback URL and expires the state cookie",async()=>{const request=new NextRequest(`${origin}/fr/app/sheets/callback?state=state&code=private-code`,{headers:{cookie:"__Host-contratpro-sheets-state=state"}});const response=await handleSheets(request,"fr",true);expect(response.status).toBe(303);expect(response.headers.get("location")).toBe(`${origin}/fr/app/sheets?oauth=connected`);expect(response.headers.get("referrer-policy")).toBe("no-referrer");expect(response.cookies.get("__Host-contratpro-sheets-state")?.maxAge).toBe(0);expect(await response.text()).not.toContain("private-code");});
it("accepts no browser-supplied agency identity",async()=>{await handleSheets(request("dashboard",{agencyId:"foreign",contractId:undefined}),"fr");expect(mocks.agency).toHaveBeenCalledWith(aid,"dashboard",{});});
