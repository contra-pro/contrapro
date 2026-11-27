import type { Locale } from "../i18n/locales";
export async function sendBilling(locale:Locale,action:string,input:object,platform=false):Promise<unknown>{
 const r=await fetch(`/${locale}/${platform?"platform":"app/billing"}/action`,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,input})});
 const value=await r.json();if(!r.ok||r.redirected||value.ok!==true)throw Error(value.code??"unavailable");return value.value;
}
