"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import type { Locale } from "../i18n/locales";
import { operationsCopy } from "./copy";
import { sendOperation } from "./client";
export function invitationStore(initialToken?:string) {
 let value:string|null=initialToken&&/^[a-f0-9]{64}$/.test(initialToken)?initialToken:null;const listeners=new Set<()=>void>();
 const read=()=>{const token=new URLSearchParams(location.hash.slice(1)).get("token");history.replaceState(null,"",location.pathname);if(token)value=/^[a-f0-9]{64}$/.test(token)?token:"";else value??="";for(const notify of listeners)notify();};
 return {get:()=>value,subscribe:(notify:()=>void)=>{listeners.add(notify);read();window.addEventListener("hashchange",read);return()=>{listeners.delete(notify);window.removeEventListener("hashchange",read);};},clear:()=>{value="";for(const notify of listeners)notify();}};
}
export function AcceptTeamInvitation({locale,initialToken}:{locale:Locale;initialToken?:string}) {
 const c=operationsCopy(locale),[store]=useState(()=>invitationStore(initialToken)),token=useSyncExternalStore(store.subscribe,store.get,()=>null),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[feedback,setFeedback]=useState("");
 return <section dir={locale==="ar"?"rtl":"ltr"} aria-busy={busy}><p>{c.acceptHint}</p><p role="status" aria-live="polite">{feedback||(!done&&token===""?c.expired:"")}</p>{done?<><p>{c.acceptedHint}</p><Link href={`/${locale}/app/select`}>{c.select}</Link></>:<button type="button" disabled={busy||!token} onClick={()=>{setBusy(true);void sendOperation(locale,"accept",{token}).then(()=>{setDone(true);store.clear();setFeedback(c.success);}).catch(e=>{const code=e instanceof Error?e.message:"unavailable";setFeedback(c[code as keyof typeof c]??c.unavailable);}).finally(()=>setBusy(false));}}>{c.accept}</button>}</section>;
}
