// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach,expect,it,vi } from "vitest";
import { ClientSigning } from "./workspace";
afterEach(()=>{vi.unstubAllGlobals();window.localStorage.clear();window.sessionStorage.clear();});
it("removes invitation fragments, uses POST bodies, and never persists the token",async()=>{
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);const token="e".repeat(64),send=vi.fn(async()=>new Response(JSON.stringify({ok:true,value:{id:"session",version:1,state:"awaiting_client",locale:"fr",clientName:"Client",expiresAt:"2026-11-25",reviewChecksum:"a".repeat(64),originalChecksum:"a".repeat(64),assurance:"simple",finalChecksum:null}}),{headers:{"Content-Type":"application/json"}}));
  vi.stubGlobal("fetch",send);window.history.replaceState(null,"",`/fr/sign#token=${token}`);const div=document.createElement("div");document.body.append(div);const root=createRoot(div);
  try{await act(async()=>root.render(<ClientSigning locale="fr"/>));expect(window.location.hash).toBe("");expect(window.localStorage.length).toBe(0);expect(window.sessionStorage.length).toBe(0);expect(send).toHaveBeenCalled();const [url,options]=send.mock.calls[0]! as unknown as [string,RequestInit];expect(url).toBe("/fr/sign/action");expect(url).not.toContain(token);expect(options).toMatchObject({method:"POST",credentials:"omit",referrerPolicy:"no-referrer",cache:"no-store"});expect(JSON.parse(String(options.body)).token).toBe(token);expect(div.textContent).toContain("Client");}
  finally{await act(async()=>root.unmount());div.remove();}
});
