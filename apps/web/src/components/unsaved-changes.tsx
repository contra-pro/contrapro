"use client";
import { useEffect } from "react";
import type { Locale } from "../i18n/locales";
/** No draft values leave memory. Browser reload and navigation require a decision. */
export function UnsavedChanges({when,locale}:{when:boolean;locale:Locale}){
 const message=locale==="ar"?"لديك تغييرات لم يتم حفظها. هل تريد مغادرة الصفحة؟":"Des modifications ne sont pas enregistrées. Quitter cette page ?";
 useEffect(()=>{if(!when)return;
  const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
  const navigate=(event:MouseEvent)=>{const link=event.target instanceof Element?event.target.closest<HTMLAnchorElement>("a[href]"):null;if(!link||link.download||link.target==="_blank"||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;const next=new URL(link.href,location.href);if(next.pathname===location.pathname&&next.search===location.search)return;if(!window.confirm(message)){event.preventDefault();event.stopPropagation();}};
  window.addEventListener("beforeunload",unload);document.addEventListener("click",navigate,true);return()=>{window.removeEventListener("beforeunload",unload);document.removeEventListener("click",navigate,true);};
 },[when,message]);
 return when?<p className="draft-notice" role="status">{locale==="ar"?"تغييرات لم يتم حفظها بعد":"Modifications non enregistrées"}</p>:null;
}
