"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { Locale } from "../i18n/locales";
const subscribe=(listener:()=>void)=>{window.addEventListener("popstate",listener);return()=>window.removeEventListener("popstate",listener);};
const current=()=>window.location.pathname;
/** Paths only: never forward invitation fragments, auth codes or arbitrary queries. */
export function LanguageSwitch({locale,fallback,label}:{locale:Locale;fallback:string;label:string}){
 const pathname=useSyncExternalStore(subscribe,current,()=>fallback),path=/^\/(fr|ar)(\/|$)/.test(pathname)?pathname.replace(/^\/(fr|ar)/,""):fallback.replace(/^\/(fr|ar)/,"");
 return <nav aria-label={label} className="languages">{(["fr","ar"] as const).map(language=><Link key={language} href={`/${language}${path}`} lang={language} hrefLang={language} aria-current={locale===language?"page":undefined} prefetch={false}>{language==="fr"?"Français":"العربية"}</Link>)}</nav>;
}
