"use client";
import Link from "next/link";
import { useEffect,useRef,useState,useSyncExternalStore } from "react";
import type { Locale } from "../i18n/locales";
import type { Channel,DeliveryJob } from "./model";
import { deliveryCopy } from "./copy";
import styles from "../signing/workspace.module.css";
import { sendDelivery } from "./client";
export { sendDelivery } from "./client";
import { ReminderSettings,UncertainRecovery } from "./recovery-workspace";
function useAction(locale:Locale){const c=deliveryCopy(locale),[busy,setBusy]=useState(false),[error,setError]=useState("");const flight=useRef(false),ids=useRef(new Map<string,string>());
  const request=(input:object)=>{const k=JSON.stringify(input);if(!ids.current.has(k))ids.current.set(k,crypto.randomUUID());return {...input,requestId:ids.current.get(k)!};};
  const run=async(work:()=>Promise<void>)=>{if(flight.current)return;flight.current=true;setBusy(true);setError("");try{await work();}catch(e){const code=e instanceof Error?e.message:"unavailable";setError(c.errors[code as keyof typeof c.errors]??c.errors.unavailable);}finally{flight.current=false;setBusy(false);}};return {busy,run,request,feedback:<p role="status" aria-live="polite">{busy?c.loading:error}</p>};}
type History={jobs:DeliveryJob[];events:{id:string;state:string}[];downloads:{id:string;expiresAt:string;revoked:boolean}[];recoveries?:{jobId:string;reference:string;disposition:string;at:string}[]};
type Manual={job:DeliveryJob;message:string;link:string|null;code:string|null;whatsappUrl:string|null};
export function DeliveryPanel({locale,sessionId}:{locale:Locale;sessionId:string}){const c=deliveryCopy(locale),op=useAction(locale),[value,setValue]=useState<History|null>(null),[context,setContext]=useState<{state:string;clientEmail:string;clientPhone:string;hasFinal:boolean;a3Enabled?:boolean}|null>(null),[material,setMaterial]=useState<Manual|null>(null),[linkChannel,setLinkChannel]=useState<Channel>("email"),[codeChannel,setCodeChannel]=useState<Channel>("manual-whatsapp"),[loadError,setLoadError]=useState("");
  const refresh=async()=>{const [h,ctx]=await Promise.all([sendDelivery(locale,"list",{sessionId}),sendDelivery(locale,"context",{sessionId})]);setValue(h as History);setContext(ctx as typeof context);setLoadError("");};
  useEffect(()=>{let live=true;Promise.all([sendDelivery(locale,"list",{sessionId}),sendDelivery(locale,"context",{sessionId})]).then(([h,ctx])=>{if(live){setValue(h as History);setContext(ctx as typeof context);setLoadError("");}}).catch(e=>{if(live)setLoadError(e instanceof Error?e.message:"unavailable");});return()=>{live=false;};},[locale,sessionId]);
  const observe=async(action:string)=>{if(material)await sendDelivery(locale,"manual",{jobId:material.job.id,observed:action});await refresh();};
  return <section className={styles.root} dir={locale==="ar"?"rtl":"ltr"}><h3>{c.title}</h3><p>{c.policy}</p>{op.feedback}<button disabled={op.busy} onClick={()=>void op.run(refresh)}>{c.refresh}</button>
    {context?.a3Enabled&&<ReminderSettings locale={locale} sessionId={sessionId}/>}
    {context&&<fieldset disabled={op.busy}><legend>{c.title}</legend><p><bdi>{context.clientEmail}</bdi> · <bdi>{context.clientPhone}</bdi></p>
      <label>{c.linkChannel}<select value={linkChannel} onChange={e=>{const v=e.target.value as Channel;setLinkChannel(v);if(v==="manual-whatsapp")setCodeChannel("manual-out-of-band");}}><option value="email">{c.email}</option><option value="manual-whatsapp">{c.whatsapp}</option></select></label>
      {context.state==="awaiting_client"&&<><label>{c.codeChannel}<select value={codeChannel} onChange={e=>setCodeChannel(e.target.value as Channel)}><option value="manual-whatsapp" disabled={linkChannel==="manual-whatsapp"}>{c.whatsapp}</option><option value="manual-out-of-band">{c.separate}</option></select></label>
        {(["invitation","reminder"] as const).map(action=><button key={action} onClick={()=>void op.run(async()=>{await sendDelivery(locale,action,op.request({sessionId,linkChannel,codeChannel,action}));await refresh();})}>{action==="reminder"&&context.a3Enabled?(locale==="ar"?"طلب تذكير وفق السياسة":"Demander un rappel selon la politique"):c[action]}</button>)}</>}
      {context.hasFinal&&<button onClick={()=>void op.run(async()=>{await sendDelivery(locale,"final",op.request({sessionId,channel:linkChannel}));await refresh();})}>{c.final}</button>}
      {context.hasFinal&&context.a3Enabled&&<button onClick={()=>void op.run(async()=>{await sendDelivery(locale,"recover-final-event",{sessionId});await refresh();})}>{locale==="ar"?"إعادة تجهيز إشعار المستند النهائي":"Reprendre la préparation de livraison finale"}</button>}
    </fieldset>}
    {loadError?<p role="alert">{c.errors[loadError as keyof typeof c.errors]??c.errors.unavailable}</p>:!value?<p role="status">{c.loading}</p>:<>{!value.jobs.length&&<p>{c.empty}</p>}<ul>{value.jobs.map(j=><li key={j.id}><b>{c.purpose[j.purpose]}</b> · {j.channel==="email"?c.states[j.state]:j.state==="cancelled"?c.states.cancelled:c.manual[j.manualStatus]}<p>{c.expires}: <bdi>{j.expiresAt}</bdi></p>{j.obsolete&&<p>{c.obsolete}</p>}{j.state==="uncertain"&&<p>{c.uncertain}</p>}
      {j.channel!=="email"&&!j.obsolete&&j.state!=="cancelled"&&<button disabled={op.busy} onClick={()=>void op.run(async()=>setMaterial(await sendDelivery(locale,"material",{jobId:j.id}) as Manual))}>{c.prepare}</button>}
      {j.errorCode&&<p>{locale==="ar"?"تعذر الإرسال أو تأكيد نتيجته. راجع الحالة قبل المحاولة.":"Échec d’envoi ou résultat non confirmé. Vérifiez la disposition avant toute reprise."}</p>}
      {context?.a3Enabled&&j.state==="uncertain"&&<UncertainRecovery locale={locale} jobId={j.id} refresh={refresh}/>}
      {context?.a3Enabled&&j.providerId&&["uncertain","accepted"].includes(j.state)&&<button type="button" disabled={op.busy} onClick={()=>void op.run(async()=>{await sendDelivery(locale,"reconcile",{jobId:j.id});await refresh();})}>{locale==="ar"?"التحقق من الحالة لدى المزود":"Vérifier l’état auprès du fournisseur"}</button>}
      {value.recoveries?.filter(r=>r.jobId===j.id).map((r,i)=><p key={i}>{locale==="ar"?"مراجعة بشرية غير مؤكدة":"Revue manuelle, livraison non confirmée"} · <bdi>{r.reference}</bdi> · <bdi>{r.at}</bdi></p>)}
      {j.retryable&&j.state==="failed"&&<button disabled={op.busy} onClick={()=>void op.run(async()=>{await sendDelivery(locale,"retry",{jobId:j.id});await refresh();})}>{c.retry}</button>}
      {["queued","failed","processing"].includes(j.state)&&<button disabled={op.busy} onClick={()=>void op.run(async()=>{await sendDelivery(locale,"cancel",{jobId:j.id});setMaterial(null);await refresh();})}>{c.cancel}</button>}
    </li>)}</ul>{value.events.map(e=><p key={e.id}>{e.state==="materialized"?c.materialized:e.state==="failed"?c.eventFailed:c.pending}</p>)}
      {value.downloads.map(d=><p key={d.id}><bdi>{d.expiresAt}</bdi> · {d.revoked?c.obsolete:<button disabled={op.busy} onClick={()=>void op.run(async()=>{await sendDelivery(locale,"revoke",{sessionId,grantId:d.id});setMaterial(null);await refresh();})}>{c.revoke}</button>}</p>)}</>}
    {material&&<section><h4>{c.purpose[material.job.purpose]}</h4><label>{c.copyMessage}<textarea readOnly value={material.message}/></label>{material.link&&<button disabled={op.busy} onClick={()=>void op.run(async()=>{await navigator.clipboard.writeText(material.link!);await observe("copied-link");})}>{c.copyLink}</button>}
      <button disabled={op.busy} onClick={()=>void op.run(async()=>{await navigator.clipboard.writeText(material.message);await observe("copied-message");})}>{c.copyMessage}</button>
      {material.whatsappUrl&&<a href={material.whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={()=>void op.run(()=>observe("whatsapp-open-requested"))}>{c.open}</a>}
      <button disabled={op.busy} onClick={()=>void op.run(()=>observe("reported-sent"))}>{c.reported}</button><p>{c.policy}</p></section>}
  </section>;
}
export function DeliveryDashboard({locale}:{locale:Locale}){const c=deliveryCopy(locale),op=useAction(locale),[page,setPage]=useState(1),[filter,setFilter]=useState("all"),[value,setValue]=useState<{items:DeliveryJob[];total:number}|null>(null),[selected,setSelected]=useState(""),[loadError,setLoadError]=useState(false);
  useEffect(()=>{let live=true;sendDelivery(locale,"dashboard",{page,filter}).then(v=>{if(live){setValue(v as typeof value);setLoadError(false);}}).catch(()=>{if(live)setLoadError(true);});return()=>{live=false;};},[locale,page,filter]);
  return <div className={styles.root} dir={locale==="ar"?"rtl":"ltr"}>{op.feedback}<label>{c.title}<select value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);}}><option value="all">{c.all}</option>{Object.entries(c.states).map(([key,text])=><option key={key} value={key}>{text}</option>)}</select></label>
    <button disabled={op.busy} onClick={()=>void op.run(async()=>{setValue(await sendDelivery(locale,"dashboard",{page,filter}) as typeof value);setLoadError(false);})}>{c.refresh}</button>
    {loadError?<p role="alert">{c.errors.unavailable}</p>:!value?<p role="status">{c.loading}</p>:<><ul>{value.items.map(j=><li key={j.id}>{c.purpose[j.purpose]} · {j.channel==="email"?c.states[j.state]:c.manual[j.manualStatus]}<button onClick={()=>setSelected(j.sessionId)}>{c.details}</button><Link href={`/${locale}/app/rentals/${j.rentalId}`} prefetch={false}>{j.rentalId}</Link></li>)}</ul>{!value.items.length&&<p>{c.empty}</p>}<button disabled={page===1} onClick={()=>setPage(page-1)}>{c.previous}</button><button disabled={page*20>=value.total} onClick={()=>setPage(page+1)}>{c.next}</button></>}
    {selected&&<DeliveryPanel key={selected} locale={locale} sessionId={selected}/>}</div>;
}
let downloadToken="";function subscribeDownload(listener:()=>void){const read=()=>{const value=new URLSearchParams(window.location.hash.slice(1)).get("access");window.history.replaceState(null,"",window.location.pathname);if(value&&/^[a-f0-9]{64}$/.test(value)){downloadToken=value;listener();}};read();window.addEventListener("hashchange",read);return()=>window.removeEventListener("hashchange",read);}
export function FinalContractAccess({locale}:{locale:Locale}){const c=deliveryCopy(locale),op=useAction(locale),token=useSyncExternalStore(subscribeDownload,()=>downloadToken,()=>""),[blob,setBlob]=useState<Blob|null>(null),link=useRef<HTMLAnchorElement>(null);
  useEffect(()=>{if(!blob)return;const url=URL.createObjectURL(blob);if(link.current)link.current.href=url;return()=>URL.revokeObjectURL(url);},[blob]);
  return <main className={styles.root} dir={locale==="ar"?"rtl":"ltr"}><h1>{c.download}</h1>{op.feedback}{!token?<p>{c.missing}</p>:<button disabled={op.busy} onClick={()=>void op.run(async()=>{const response=await fetch(`/${locale}/contract/action`,{method:"POST",credentials:"omit",cache:"no-store",referrerPolicy:"no-referrer",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"download",input:{token}})});if(!response.ok){const e=await response.json();throw Error(e.code??"unavailable");}setBlob(await response.blob());})}>{c.download}</button>}{blob&&<a ref={link} download="contrat-signe.pdf">{c.download}</a>}</main>;
}
