// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
const {send}=vi.hoisted(()=>({send:vi.fn()}));
vi.mock("./client",()=>({sendDocument:send}));
import { DraftPreview } from "./draft-workspace";
import { config } from "./fixtures";
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(()=>{vi.clearAllMocks();vi.unstubAllGlobals();});
it.each(["fr","ar"] as const)("retains the exact rendering request after uncertainty and displays stale state in %s",async locale=>{
  const generation:object[]=[],rentalId="22222222-2222-4222-8222-222222222222",versionId="33333333-3333-4333-8333-333333333333";
  send.mockImplementation(async(_locale:string,action:string,input:object)=>{
    if(action==="list")return [{id:versionId,name:"Fixture",archived:false,versions:[{id:versionId,revision:1,config}]}];
    if(action==="draft-input")return {templateVersionId:versionId,custom:{},issueDate:"2026-11-25",revision:1};
    if(action==="preview-state")return {stale:true,requestId:versionId};
    if(action==="clauses")return [];
    if(action==="preview-generate"){generation.push(input);throw Error("unavailable");}
    return null;
  });
  const div=document.createElement("div"),root=createRoot(div);
  await act(async()=>root.render(<DraftPreview locale={locale} rentalId={rentalId}/>));
  expect(div.querySelector('[role="alert"]')?.textContent).toContain(locale==="ar"?"قديمة":"périmé");
  const button=Array.from(div.querySelectorAll("button")).find(b=>b.textContent?.includes(locale==="ar"?"حفظ وإعادة":"Enregistrer et"))!;
  await act(async()=>button.click());
  const retry=Array.from(div.querySelectorAll("button")).find(b=>b.textContent?.includes(locale==="ar"?"بنفس المعلمات":"mêmes paramètres"))!;
  await act(async()=>retry.click());
  expect(generation).toHaveLength(2);expect(generation[1]).toEqual(generation[0]);
  expect(send.mock.calls.filter(c=>c[1]==="draft-configure")).toHaveLength(1);
  expect(send.mock.calls.some(c=>["confirm","generate","sign","issue"].includes(c[1]))).toBe(false);
  await act(async()=>root.unmount());
});
