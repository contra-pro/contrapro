import { describe,it,expect,vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { GoogleSheets,owner,identityKey,ownerKey,type Transport } from "./google";
import { GoogleOAuth,hash,scopes,type OAuthConfig } from "./oauth";
import { defaults,fields,headers,mapping,money,row,SheetsFault,type Destination,type Repository,type Snapshot,type Claim } from "./model";
import { fingerprint,SheetsWorker } from "./worker";
import { seal,unseal } from "../delivery/secrets";
import { SheetsDashboard,SheetsJobs,type Dashboard } from "./workspace";
import { labels,statuses } from "./copy";
const aid="40000000-0000-4000-8000-000000000003",cid="40000000-0000-4000-8000-000000000004";
const d:Destination={spreadsheetId:"synthetic_spreadsheet",sheetId:42,revision:2,columns:[...defaults]};
const s:Snapshot={agencyId:aid,contractId:cid,sequence:1,rentalVersion:1,signatureVersion:0,values:{reference:"=IMPORTXML(\"private\")",total:"900719925474099.99",state:"brouillon"}};
const now=Date.parse("2026-11-24T12:00:00Z"),at=new Date(now).toISOString(),values=row(s,d,at);
function fakeBook(){
 const rows:{values:string[];metadataId:number|null;formula?:boolean}[]=[],calls:{url:string;body:Record<string,unknown>|undefined}[]=[];
 let failure=0,timeout=false,badHeader=false;
 const json=(value:object)=>new Response(JSON.stringify(value),{status:200});
 const transport:Transport=async(url,init)=>{
  expect(url.startsWith("https://sheets.googleapis.com/v4/spreadsheets/")).toBe(true);
  expect((init.headers as Record<string,string>).Authorization).toBe("Bearer synthetic-token");
  const body=init.body?JSON.parse(String(init.body)):undefined;calls.push({url,body});if(failure)return new Response("sensitive provider error",{status:failure});
  if(url.endsWith("developerMetadata:search")){
   const lookup=body.dataFilters[0].developerMetadataLookup;
   return json({matchedDeveloperMetadata:lookup.metadataKey===ownerKey?[{developerMetadata:{metadataId:1,metadataValue:owner(aid,d),location:{sheetId:42}}}]:rows.flatMap((r,i)=>r.values[0]===lookup.metadataValue&&r.metadataId!==null?[{developerMetadata:{metadataId:r.metadataId,location:{dimensionRange:{sheetId:42,startIndex:i+1,endIndex:i+2}}}}]:[])});
  }
  if(url.includes("?fields="))return json({sheets:[{properties:{sheetId:42,title:"ContratPro"}}]});
  if(url.includes("/values/")&&!url.includes(":batch"))return json({values:rows.map(r=>[r.values[0]])});
  if(url.includes("includeGridData")){
   const range=new URL(url).searchParams.get("ranges")!,index=Number(/!A(\d+)/.exec(range)![1]);
   const v=index===1?headers(d):rows[index-2]?.values??[];
   return json({sheets:[{data:[{rowData:[{values:v.map((v,i)=>({userEnteredValue:rows[index-2]?.formula&&i===3?{formulaValue:"=1+1"}:{stringValue:badHeader&&index===1&&i===0?"user header":v}}))}]}]}]});
  }
  if(url.endsWith("/values:batchUpdateByDataFilter")){
   expect(body.valueInputOption).toBe("RAW");const item=rows.find(r=>r.metadataId===body.data[0].dataFilter.developerMetadataLookup.metadataId)!;item.values=body.data[0].values[0];if(timeout)throw Error("private network details");return json({totalUpdatedRows:1,totalUpdatedCells:item.values.length});
  }
  if(url.endsWith(":batchUpdate")){
   expect(body.requests[2].createDeveloperMetadata.developerMetadata.metadataKey).toBe(identityKey);
   rows.unshift({metadataId:99,values:body.requests[1].updateCells.rows[0].values.map((c:{userEnteredValue:{stringValue:string}})=>c.userEnteredValue.stringValue)});
   if(timeout)throw Error("private network details");return json({replies:[{},{},{createDeveloperMetadata:{developerMetadata:{metadataId:99}}}]});
  }
  throw Error(`unexpected fake endpoint ${url}`);
 };
 return {rows,calls,transport,api:new GoogleSheets(true,transport),fail:(n:number)=>{failure=n;},timeout:()=>{timeout=true;},headers:()=>{badHeader=true;}};
}
describe("minimized export contract",()=>{
 it("rejects sensitive mappings, duplicates and controls",()=>{expect(()=>mapping(["identityNumber"])).toThrow("invalid");expect(()=>mapping(["state","state"])).toThrow();expect(()=>row({...s,values:{state:"bad\u0000"}},d,at)).toThrow();expect(defaults).not.toContain("clientName");expect(defaults).not.toContain("clientPhone");});
 it("keeps huge amounts exact and leaves unavailable locations/payments empty",()=>{expect(money("90071992547409999")).toBe("900719925474099.99");const r=row(s,{...d,columns:["total","pickup","payment","lastSync"]},at);expect(r.slice(3)).toEqual(["900719925474099.99","","",at]);expect(()=>money("1e8")).toThrow();});
 it("has localized labels/status for every field and confirmed status only",()=>{for(const locale of ["fr","ar"] as const){expect(Object.keys(labels[locale])).toEqual([...fields]);const data:Dashboard={connection:{revision:2,health:"connected",enabled:true,destination:d},jobs:[{contractId:cid,state:"pending",sequence:3,lastSequence:0,attempts:0,retryable:false,error:null,syncAt:at}]};const html=renderToStaticMarkup(createElement(SheetsJobs,{locale,data}));expect(html).toContain(statuses[locale].pending);expect(html).not.toContain("<time");expect(html).not.toContain(statuses[locale].synchronized);}});
 it("renders FR/AR direction and an announced loading state",()=>{for(const locale of ["fr","ar"] as const){const html=renderToStaticMarkup(createElement(SheetsDashboard,{locale}));expect(html).toContain(`dir="${locale==="ar"?"rtl":"ltr"}"`);expect(html).toContain('role="status"');expect(html).not.toContain(statuses[locale].synchronized);}});
});
describe("Google row adapter with injected transport",()=>{
 it("creates metadata and literal user values atomically, then updates the same moved row",async()=>{
  const f=fakeBook();expect(await f.api.write("synthetic-token",aid,d,values,false)).toBe(99);expect(f.rows[0]!.values[3]).toBe(s.values.reference);
  f.rows.unshift({values:["unrelated","preserve formula"],metadataId:null});
  const newer=row({...s,sequence:3,values:{...s.values,state:"confirme"}},d,at);expect(await f.api.write("synthetic-token",aid,d,newer,true)).toBe(99);
  expect(f.rows).toHaveLength(2);expect(f.rows[0]!.values).toEqual(["unrelated","preserve formula"]);expect(f.rows[1]!.values).toEqual(newer);
  expect(f.calls.filter(c=>c.url.endsWith(":batchUpdate"))).toHaveLength(1);
 });
 it("rejects out-of-order writes and copied identifiers without writing",async()=>{const f=fakeBook();f.rows.push({values:row({...s,sequence:5},d,at),metadataId:99});await expect(f.api.write("synthetic-token",aid,d,values,true)).rejects.toThrow("conflict");f.rows.push({values,metadataId:null});await expect(f.api.inspect("synthetic-token",aid,d,values[0]!)).rejects.toThrow("conflict");expect(f.calls.some(c=>c.url.endsWith(":batchUpdate"))).toBe(false);});
 it("detects deleted known rows, missing metadata, changed headers and formulas",async()=>{
  const f=fakeBook();await expect(f.api.write("synthetic-token",aid,d,values,true)).rejects.toThrow("conflict");
  f.rows.push({values,metadataId:null});await expect(f.api.inspect("synthetic-token",aid,d,values[0]!)).rejects.toThrow("conflict");f.rows[0]!.metadataId=99;f.rows[0]!.formula=true;await expect(f.api.inspect("synthetic-token",aid,d,values[0]!)).rejects.toThrow("conflict");f.headers();await expect(f.api.inspect("synthetic-token",aid,d,values[0]!)).rejects.toThrow("conflict");
 });
 it.each([[401,"revoked"],[403,"forbidden"],[429,"quota"],[503,"unavailable"]])("sanitizes HTTP %s to %s",async(status,code)=>{const f=fakeBook();f.fail(Number(status));await expect(f.api.inspect("synthetic-token",aid,d,values[0]!)).rejects.toThrow(String(code));});
 it("does not dispatch behind a disabled gate",async()=>{const transport=vi.fn();await expect(new GoogleSheets(false,transport).metadata("token",d.spreadsheetId)).rejects.toThrow("unavailable");expect(transport).not.toHaveBeenCalled();});
 it("reconciles an inserted row after a lost response without another append",async()=>{
  const f=fakeBook();f.timeout();await expect(f.api.write("synthetic-token",aid,d,values,false)).rejects.toThrow("uncertain");
  const repo:Repository={call:vi.fn(async(_aid,action)=>action==="reconcile-context"?{destination:d,sequence:1,lease:"lease",fingerprint:fingerprint(values)}:true) as Repository["call"]};
  await new SheetsWorker(repo,{access:async()=>"synthetic-token"},f.api).reconcile(aid,cid);expect(repo.call).toHaveBeenLastCalledWith(aid,"reconciled",{contractId:cid,lease:"lease",state:"synchronized",metadataId:99});expect(f.rows).toHaveLength(1);
 });
 it("absence after uncertain append remains quarantined",async()=>{const f=fakeBook(),repo:Repository={call:vi.fn(async()=>({destination:d,sequence:1,lease:"lease",fingerprint:fingerprint(values)})) as Repository["call"]};await expect(new SheetsWorker(repo,{access:async()=>"synthetic-token"},f.api).reconcile(aid,cid)).rejects.toThrow("conflict");expect(f.calls.some(c=>c.url.endsWith(":batchUpdate"))).toBe(false);});
 it("cannot confirm success for zero matched rows or server failure during writes",async()=>{const f=fakeBook();f.rows.push({values,metadataId:99});
  const noMatch=new GoogleSheets(true,async(url,init)=>url.endsWith("/values:batchUpdateByDataFilter")?new Response(JSON.stringify({totalUpdatedRows:0,totalUpdatedCells:0})):f.transport(url,init));await expect(noMatch.write("synthetic-token",aid,d,values,true)).rejects.toThrow("uncertain");
  const server=new GoogleSheets(true,async(url,init)=>url.endsWith("/values:batchUpdateByDataFilter")?new Response("provider details",{status:503}):f.transport(url,init));await expect(server.write("synthetic-token",aid,d,values,true)).rejects.toThrow("uncertain");
 });
});
describe("OAuth and credentials",()=>{
 const config:OAuthConfig={enabled:true,origin:"https://contratpro.example",clientId:"synthetic-client",clientSecret:"synthetic-secret",key:"a".repeat(64),keyId:"sheets-test"};
 function flow(){let saved:Record<string,unknown>={},used=false;const calls:unknown[][]=[];
  const repo:Repository={call:async<T>(a:string|null,action:string,input:object)=>{calls.push([a,action,input]);if(action==="oauth-start")saved=input as Record<string,unknown>;if(action==="oauth-consume"){if(used||saved.hash!==(input as {hash:string}).hash)throw new SheetsFault("forbidden");used=true;return {envelope:saved.envelope,revision:0,credentialRevision:0} as T;}return true as T;}};return {repo,calls};
 }
 it("uses offline authorization, exact redirect, PKCE, limited scope and single-use state",async()=>{
  const f=flow(),transport=vi.fn(async()=>new Response(JSON.stringify({access_token:"private-access",refresh_token:"private-refresh",expires_in:3600,token_type:"Bearer",scope:scopes.created}))),oauth=new GoogleOAuth(f.repo,config,transport,()=>now);
  const start=await oauth.start(aid,"ar","created"),url=new URL(start.url);expect(url.searchParams.get("scope")).toBe(scopes.created);expect(url.searchParams.get("redirect_uri")).toBe("https://contratpro.example/ar/app/sheets/callback");expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  await expect(oauth.complete(aid,"ar",start.state,"0".repeat(64),"code")).rejects.toThrow("forbidden");expect(transport).not.toHaveBeenCalled();
  await oauth.complete(aid,"ar",start.state,start.state,"code");expect(transport).toHaveBeenCalledTimes(1);expect(JSON.stringify(f.calls)).not.toContain("private-refresh");expect(JSON.stringify(f.calls)).not.toContain("private-access");
  const connect=f.calls.find(c=>c[1]==="connect")![2] as {envelope:Parameters<typeof unseal>[0]};expect(unseal(connect.envelope,config.key,config.keyId,`sheets|${aid}|credentials|1`,now)).toMatchObject({refreshToken:"private-refresh"});
  await expect(oauth.complete(aid,"ar",start.state,start.state,"code")).rejects.toThrow("forbidden");
 });
 it("binds flow to agency, locale and expiry and rejects reconnect without refresh token",async()=>{
  const f=flow(),transport=vi.fn(async()=>new Response(JSON.stringify({access_token:"a",expires_in:3600,token_type:"Bearer",scope:scopes.created}))),oauth=new GoogleOAuth(f.repo,config,transport,()=>now),start=await oauth.start(aid,"fr","created");
  await expect(oauth.complete(cid,"fr",start.state,start.state,"code")).rejects.toThrow();expect(transport).not.toHaveBeenCalled();
  const g=flow(),other=new GoogleOAuth(g.repo,config,transport,()=>now),next=await other.start(aid,"fr","created");await expect(other.complete(aid,"fr",next.state,next.state,"code")).rejects.toThrow("revoked");expect(g.calls.some(c=>c[1]==="connect")).toBe(false);
  expect(hash(start.state)).not.toBe(start.state);
 });
 it("rotates refresh credentials with revision and lease fencing",async()=>{
  const envelope=seal({accessToken:"old",refreshToken:"old-refresh",expiresAt:now-1,scope:scopes.created},config.key,config.keyId,`sheets|${aid}|credentials|1`,new Date(now+86400000).toISOString());
  const repo:Repository={call:vi.fn(async(_a,action)=>action==="credentials"?{envelope,revision:1,health:"connected"}:action==="refresh-claim"?{lease:"unique-lease"}:true) as Repository["call"]};
  const oauth=new GoogleOAuth(repo,config,async()=>new Response(JSON.stringify({access_token:"new",refresh_token:"rotated",expires_in:3600,token_type:"Bearer"})),()=>now);expect(await oauth.access(aid)).toBe("new");
  const call=vi.mocked(repo.call).mock.calls.find(c=>c[1]==="refresh-result")![2] as {envelope:Parameters<typeof unseal>[0];lease:string};expect(call.lease).toBe("unique-lease");expect(unseal(call.envelope,config.key,config.keyId,`sheets|${aid}|credentials|2`,now)).toMatchObject({refreshToken:"rotated"});
 });
 it("checks locale and expiry before exchanging an authorization code",async()=>{const f=flow(),transport=vi.fn(),oauth=new GoogleOAuth(f.repo,config,transport,()=>now),start=await oauth.start(aid,"fr","created");await expect(oauth.complete(aid,"ar",start.state,start.state,"code")).rejects.toThrow("forbidden");expect(transport).not.toHaveBeenCalled();
  const g=flow(),other=new GoogleOAuth(g.repo,config,transport,()=>now),next=await other.start(aid,"fr","created");const expired=new GoogleOAuth(g.repo,config,transport,()=>now+600001);await expect(expired.complete(aid,"fr",next.state,next.state,"code")).rejects.toThrow("expired");expect(transport).not.toHaveBeenCalled();});
 it("marks expired envelopes and ambiguous refresh as reconnect-required without reusing the token",async()=>{
  const envelope=seal({accessToken:"old",refreshToken:"private",expiresAt:now-1},config.key,config.keyId,`sheets|${aid}|credentials|1`,new Date(now+86400000).toISOString());const repo:Repository={call:vi.fn(async(_a,action)=>action==="credentials"?{envelope,revision:1,health:"connected"}:action==="refresh-claim"?{lease:"lease"}:true) as Repository["call"]};const transport=vi.fn(async()=>{throw Error("sensitive");});await expect(new GoogleOAuth(repo,config,transport,()=>now).access(aid)).rejects.toThrow("revoked");expect(repo.call).toHaveBeenLastCalledWith(aid,"refresh-result",{revision:1,lease:"lease"});expect(transport).toHaveBeenCalledTimes(1);
 });
 it.each([400,401])("treats refresh rejection %s as revoked",async(status)=>{const envelope=seal({accessToken:"old",refreshToken:"private",expiresAt:now-1},config.key,config.keyId,`sheets|${aid}|credentials|1`,new Date(now+86400000).toISOString()),repo:Repository={call:vi.fn(async(_a,action)=>action==="credentials"?{envelope,revision:1,health:"connected"}:action==="refresh-claim"?{lease:"lease"}:true) as Repository["call"]};await expect(new GoogleOAuth(repo,config,async()=>new Response("private-error",{status}),()=>now).access(aid)).rejects.toThrow("revoked");expect(repo.call).toHaveBeenLastCalledWith(aid,"refresh-result",{revision:1,lease:"lease"});});
 it("expires stored credential material without dispatching a refresh",async()=>{const envelope=seal({accessToken:"old",refreshToken:"private",expiresAt:now-1},config.key,config.keyId,`sheets|${aid}|credentials|1`,new Date(now-1).toISOString()),repo:Repository={call:vi.fn(async()=>({envelope,revision:1,health:"connected"})) as Repository["call"]},transport=vi.fn();await expect(new GoogleOAuth(repo,config,transport,()=>now).access(aid)).rejects.toThrow("revoked");expect(transport).not.toHaveBeenCalled();expect(repo.call).toHaveBeenLastCalledWith(aid,"revoked",{revision:1});});
});
describe("worker fencing",()=>{
 const claim:Claim={agencyId:aid,contractId:cid,sequence:1,lease:"lease",destination:d,snapshot:s,known:false,reconcile:false,syncAt:at};
 it("does not dispatch a stale unarmed claim",async()=>{const repo:Repository={call:vi.fn(async(_a,action)=>action==="next"?{agencyId:aid}:action==="claim"?claim:false) as Repository["call"]};const write=vi.fn(),access=vi.fn();expect(await new SheetsWorker(repo,{access},{write,inspect:vi.fn()}).tick()).toBe(false);expect(write).not.toHaveBeenCalled();expect(access).not.toHaveBeenCalled();});
 it("records uncertainty and never claims provider success",async()=>{const repo:Repository={call:vi.fn(async(_a,action)=>action==="next"?{agencyId:aid}:action==="claim"?claim:true) as Repository["call"]};await new SheetsWorker(repo,{access:async()=>"token"},{write:async()=>{throw new SheetsFault("uncertain");},inspect:vi.fn()}).tick();expect(repo.call).toHaveBeenLastCalledWith(aid,"result",{contractId:cid,lease:"lease",state:"reconciliation-required",code:"uncertain",metadataId:undefined});});
});
