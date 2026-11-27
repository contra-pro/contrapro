// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { useOperations } from "./client";
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(()=>vi.unstubAllGlobals());
it("replays the identical payment request after a lost response and retains success callbacks",async()=>{
 const calls:Record<string,unknown>[]=[],fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>{
  const b=JSON.parse(String(init?.body));if(b.action==="branding")return Response.json({ok:true,value:{ready:true}});
  calls.push(b);if(calls.length===1)throw new TypeError("connection lost after commit");return Response.json({ok:true,value:{id:"receipt"}});
 });vi.stubGlobal("fetch",fetcher);
 function Panel(){const op=useOperations("fr","branding",{}, {ready:true}),[done,setDone]=useState(false);return <>{op.feedback}<button disabled={op.locked} onClick={()=>void op.perform("payment",{amountMinor:"100"},()=>setDone(true))}>Record</button>{done&&<p>Completed</p>}</>;}
 const div=document.createElement("div"),root=createRoot(div);await act(async()=>root.render(<Panel/>));
 await act(async()=>div.querySelector("button")!.click());expect(div.textContent).toContain("Réessayer la même demande");
 await act(async()=>div.querySelector("button")!.click());expect(calls[1]).toEqual(calls[0]);expect(div.textContent).toContain("Completed");await act(async()=>root.unmount());
});
