import {expect,it,vi} from "vitest";
import {GoogleOAuth,validateOAuthConfiguration,type OAuthConfig,scopes} from "./oauth";
import {GoogleSheets} from "./google";
import type {Repository} from "./model";
import {seal} from "../delivery/secrets";
const config:OAuthConfig={enabled:true,clientId:"synthetic-client",clientSecret:"synthetic-secret",origin:"https://acceptance.example.invalid",key:"a".repeat(64),keyId:"test"};
it.each([{clientId:""},{clientSecret:""},{clientSecret:"secret\nvalue"},{origin:"https://user:password@example.invalid"},{origin:"https://example.invalid/path"},{origin:"http://localhost:3330"},{key:"invalid"},{keyId:""},{historicalKeys:"not-json"},{enabled:false}])("rejects invalid OAuth configuration before repository or transport access: %j",async partial=>{const c={...config,...partial},repo:Repository={call:vi.fn()},send=vi.fn();expect(()=>validateOAuthConfiguration(c)).toThrow();await expect(new GoogleOAuth(repo,c,send).start("agency","fr","created")).rejects.toThrow();expect(repo.call).not.toHaveBeenCalled();expect(send).not.toHaveBeenCalled();});
it("forbids redirect following for token exchange, revocation and Sheets credentials",async()=>{
 const now=Date.now(),aid="test-agency",envelope=seal({accessToken:"old",refreshToken:"synthetic-refresh",scope:scopes.created,expiresAt:now-1},config.key,config.keyId,`sheets|${aid}|credentials|1`,new Date(now+100000).toISOString());
 const repo:Repository={call:vi.fn(async(_a,action)=>action==="credentials"?{envelope,health:"connected",revision:1}:action==="refresh-claim"?{lease:"test-lease"}:true) as Repository["call"]};
 const send=vi.fn(async()=>new Response(JSON.stringify({access_token:"new",expires_in:3600,token_type:"Bearer"}))),oauth=new GoogleOAuth(repo,config,send,()=>now);
 await oauth.access(aid);expect(send.mock.calls[0]).toBeDefined();const first=send.mock.calls[0] as unknown as [string,RequestInit];expect(first[1].redirect).toBe("error");await oauth.revoke(aid);const last=send.mock.calls.at(-1) as unknown as [string,RequestInit];expect(last[1].redirect).toBe("error");
 const sheets=vi.fn(async()=>new Response(JSON.stringify({spreadsheetId:"synthetic_book",sheets:[]})));await new GoogleSheets(true,sheets).metadata("synthetic-access","synthetic_book");expect((sheets.mock.calls[0] as unknown as [string,RequestInit])[1].redirect).toBe("error");
});
