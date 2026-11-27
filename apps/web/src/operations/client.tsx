"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "../i18n/locales";
import { operationsCopy } from "./copy";
import { readRentalOperations } from "./model";
export async function sendOperation<T = unknown>(locale: Locale, action: string, input: object = {}): Promise<T> {
 try {const r=await fetch(`/${locale}/app/operations-action`,{method:"POST",credentials:"same-origin",cache:"no-store",referrerPolicy:"no-referrer",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,input})});
 if(r.redirected)throw Error("unavailable");const b=await r.json();if(!r.ok||b.ok!==true)throw Error(["invalid","forbidden","conflict","quota","restricted","expired","not-found"].includes(b.code)?b.code:"unavailable");return (action==="rental"?readRentalOperations(b.value):b.value) as T;
 }catch(e){if(e instanceof Error&&["invalid","forbidden","conflict","quota","restricted","expired","not-found"].includes(e.message))throw e;throw Error("unavailable");}
}
export function useOperations<T>(locale: Locale, action: string, input: object = {}, initial?: T) {
 const c=operationsCopy(locale),[data,setData]=useState<T|undefined>(initial),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false);
 const flight=useRef(false),attempt=useRef<{action:string;input:object;success:((value:unknown)=>void)|undefined}|null>(null),inputText=JSON.stringify(input);
 const refresh=useCallback(async()=>{setData(await sendOperation<T>(locale,action,JSON.parse(inputText) as object));},[locale,action,inputText]);
 useEffect(()=>{if(initial!==undefined)return;let live=true;sendOperation<T>(locale,action,JSON.parse(inputText) as object).then(v=>{if(live)setData(v);}).catch(()=>{if(live)setMessage(c.unavailable);});return()=>{live=false;};},[locale,action,inputText,initial,c.unavailable]);
 const perform=async(cmd:string,p:object,success?:(value:unknown)=>void)=>{
  if(flight.current)return;flight.current=true;setBusy(true);setMessage("");
  attempt.current??={action:cmd,input:{requestId:crypto.randomUUID(),...p},success};
  try{const current=attempt.current,v=await sendOperation(locale,current.action,current.input);attempt.current=null;setUncertain(false);current.success?.(v);await refresh();setMessage(c.success);}
  catch(e){const code=e instanceof Error?e.message:"unavailable";setMessage(c[code as keyof typeof c]??c.unavailable);if(code==="unavailable"&&attempt.current){setUncertain(true);}else{attempt.current=null;setUncertain(false);}}
  finally{flight.current=false;setBusy(false);}
 };
 return {data,busy,locked:busy||uncertain,refresh:()=>void refresh().catch(()=>setMessage(c.unavailable)),perform,
  feedback:<><p role="status" aria-live="polite">{message||(!data?c.loading:"")}</p>{uncertain&&<button type="button" disabled={busy} onClick={()=>void perform("",{})}>{c.retry}</button>}</>};
}
