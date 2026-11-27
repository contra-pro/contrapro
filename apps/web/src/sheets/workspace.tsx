"use client";
import { useEffect,useRef,useState } from "react";
import Link from "next/link";
import type { Locale } from "../i18n/locales";
import { defaults,fields,personal,type Destination,type Field } from "./model";
import { labels,sheetsCopy,statuses } from "./copy";
import { billingCopy } from "../billing/copy";
import styles from "../rentals/workspace.module.css";
import { sendSheets } from "./client";
export { sendSheets } from "./client";
import { CreationRecovery } from "./creation-workspace";
export type Dashboard={a4Enabled?:boolean;page?:number;total?:number;connection:{revision:number;health:string;enabled:boolean;destination:Destination|null};jobs:{contractId:string;state:string;sequence:number;lastSequence:number;retryable:boolean;attempts:number;error:string|null;syncAt:string|null}[];history?:{contractId:string;sequence:number;at:string;destinationRevision:number}[]};
export function SheetsJobs({locale,data}:{locale:Locale;data:Dashboard}){const c=sheetsCopy(locale);return <ul>{data.jobs.length===0&&<li>{c.empty}</li>}{data.jobs.map(j=>{
 const display=j.state==="reconciliation-required"?c.reconcile:data.connection.health!=="connected"?c.connect:!data.connection.enabled?statuses[locale].paused:j.error==="conflict"?(locale==="ar"?"الوجهة غير صالحة أو السطر متعارض":"Destination invalide ou ligne en conflit"):statuses[locale][j.state]??c.error;
 return <li key={j.contractId}><Link href={`/${locale}/app/rentals/${j.contractId}`} prefetch={false}><bdi>{j.contractId}</bdi></Link><p>{c.status}: {display} · {c.version}: {j.lastSequence} / {j.sequence}</p>{j.error&&<p>{j.error==="capacity"?(locale==="ar"?"تجاوزت الورقة حد الفحص 10000 صف. اختر ورقة مخصصة أصغر؛ لم تتم الكتابة.":"La feuille dépasse la limite d’inspection de 10 000 lignes. Choisissez un onglet dédié plus petit ; aucune écriture effectuée."):j.error==="conflict"?c.managed:j.error==="revoked"?c.connect:j.error==="uncertain"?c.reconcile:c.error}</p>}{j.state==="synchronized"&&j.syncAt&&<p><time dateTime={j.syncAt}>{j.syncAt}</time></p>}</li>;
 })}</ul>;}
export function SheetsDashboard({locale,contractId}:{locale:Locale;contractId?:string}){
 const c=sheetsCopy(locale),[data,setData]=useState<Dashboard|null>(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),lock=useRef(false),[book,setBook]=useState(""),[sheet,setSheet]=useState(0),[title,setTitle]=useState("ContratPro"),[columns,setColumns]=useState<Field[]>([...defaults]),[tabs,setTabs]=useState<{sheetId:number;title:string}[]>([]),[mode,setMode]=useState("created"),[filter,setFilter]=useState(contractId??""),[unknown,setUnknown]=useState(false);
 const reload=async(id=filter)=>{const result=await sendSheets(locale,"dashboard",{...(id?{contractId:id}:{}),page:data?.page??1});setData(result as Dashboard);};
 useEffect(()=>{let current=true;sendSheets(locale,"dashboard",contractId?{contractId}:{}).then(result=>{if(current)setData(result as Dashboard);}).catch(()=>{if(current)setMessage(c.error);});return()=>{current=false;};},[locale,contractId,c.error]);
 const run=async(action:string,input:object={},create=false)=>{if(lock.current)return;lock.current=true;setBusy(true);setMessage("");try{const result=await sendSheets(locale,action,input);
   if(action==="connect"){const url=(result as {url:string}).url;if(new URL(url).origin!=="https://accounts.google.com")throw Error();window.location.assign(url);}
   if(action==="metadata")setTabs((result as {sheets:{sheetId:number;title:string}[]}).sheets);
   if(action==="create-spreadsheet"){const r=result as {spreadsheetId:string;sheets:{properties:{sheetId:number;title:string}}[]};setBook(r.spreadsheetId);setTabs(r.sheets.map(s=>s.properties));}
   if(action==="create-worksheet")setTabs(t=>[...t,{sheetId:(result as {sheetId:number}).sheetId,title}]);
   if(action==="dashboard")setData(result as Dashboard);else await reload();setMessage(c.done);
 }catch(e){if(create)setUnknown(true);const code=e instanceof Error?e.message:"";setMessage(code==="restricted"?billingCopy(locale).restricted:code==="quota"?billingCopy(locale).quota:create?c.unknown:c.error);}finally{setBusy(false);lock.current=false;}};
 const selected={spreadsheetId:book,sheetId:sheet,columns};
 return <section className={styles.root} dir={locale==="ar"?"rtl":"ltr"} aria-label={c.title} aria-busy={busy}>
  <p role="status" aria-live="polite">{message||(!data?c.loading:"")}</p><button disabled={busy} onClick={()=>void run("dashboard",filter?{contractId:filter}:{})}>{c.refresh}</button>
  {data&&<><p>{c.health}: {statuses[locale][data.connection.health]} · {data.connection.enabled?c.enabled:c.disabled}</p>
  {!contractId&&<>
   {data.a4Enabled&&<CreationRecovery locale={locale} onAbandoned={()=>setUnknown(false)} onRecovered={id=>{setBook(id);setUnknown(false);void run("metadata",{spreadsheetId:id});}}/>}
   <form onSubmit={e=>{e.preventDefault();void run("connect",{mode});}}><label>{c.scope}<select value={mode} onChange={e=>setMode(e.target.value)}><option value="created">{c.created}</option><option value="existing">{c.existing}</option></select></label><p>{c.scopeHelp}</p><button disabled={busy}>{c.connect}</button><button type="button" disabled={busy} onClick={()=>void run("disconnect")}>{c.disconnect}</button></form>
   <form onSubmit={e=>{e.preventDefault();void run("metadata",{spreadsheetId:book});}}><label>{c.spreadsheet}<input dir="ltr" value={book} onChange={e=>setBook(e.target.value)} required maxLength={150}/></label><button disabled={busy}>{c.load}</button><label>{c.sheet}<select value={sheet} onChange={e=>setSheet(Number(e.target.value))}><option value={0}>—</option>{tabs.map(t=><option key={t.sheetId} value={t.sheetId}>{t.title}</option>)}</select></label><label>{c.newTitle}<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={80}/></label><div className={styles.actions}><button type="button" disabled={busy||unknown} onClick={()=>void run("create-spreadsheet",{title,requestId:crypto.randomUUID()},true)}>{c.createBook}</button><button type="button" disabled={busy||!book||unknown} onClick={()=>{const id=crypto.getRandomValues(new Uint32Array(1))[0]!%2147483647;setSheet(id);void run("create-worksheet",{...selected,sheetId:id,title,revision:data.connection.revision},true);}}>{c.createSheet}</button></div></form>
   <fieldset><legend>{c.columns}</legend><div className={styles.grid}>{fields.map(f=><label className={styles.check} key={f}><input type="checkbox" checked={columns.includes(f)} onChange={e=>setColumns(v=>e.target.checked?[...v,f]:v.filter(x=>x!==f))}/>{labels[locale][f]}{personal.includes(f)&&<small>{c.personal}</small>}</label>)}</div></fieldset>
   <section className={styles.panel}><h2>{c.preview}</h2><p><bdi>ContratPro ID · ContratPro version · ContratPro destination</bdi> · {columns.map(f=>labels[locale][f]).join(" · ")}</p><p>{c.managed}</p>{data.connection.destination&&<p dir="ltr">{data.connection.destination.spreadsheetId} / {data.connection.destination.sheetId}</p>}</section>
   <div className={styles.actions}><button disabled={busy||!book||columns.length===0} onClick={()=>void run("configure",{revision:data.connection.revision,destination:selected,enabled:false})}>{c.save}</button><button disabled={busy||!data.connection.destination} onClick={()=>void run("configure",{revision:data.connection.revision,enabled:!data.connection.enabled})}>{data.connection.enabled?c.pause:c.enable}</button></div>
   <form onSubmit={e=>{e.preventDefault();void run("dashboard",filter?{contractId:filter}:{});}}><label>{c.filter}<input value={filter} onChange={e=>setFilter(e.target.value)} dir="ltr"/></label><button disabled={busy}>{c.search}</button></form>
  </>}
  <h2>{c.history}</h2><SheetsJobs locale={locale} data={data}/>{data.jobs.filter(j=>j.retryable||j.state==="reconciliation-required").map(j=><div className={styles.actions} key={j.contractId}><bdi>{j.contractId}</bdi><button disabled={busy} onClick={()=>void run(j.state==="reconciliation-required"?"reconcile":"retry",{contractId:j.contractId})}>{j.state==="reconciliation-required"?c.reconcile:c.retry}</button>{j.state==="reconciliation-required"&&<button disabled={busy} onClick={()=>void run("resolve-destination",{contractId:j.contractId,acknowledge:true})}>{locale==="ar"?"بعد انتهاء المهلة: ترك النتيجة القديمة مجهولة والتصدير إلى وجهة مختلفة":"Après expiration du bail : laisser l’ancien résultat inconnu et exporter vers une destination différente"}</button>}</div>)}
  {data.a4Enabled&&<><p>{locale==="ar"?"سجل آخر 100 عملية مزامنة. تُفحص حتى 10000 صف في الورقة؛ تجاوز الحد يوقف الكتابة ولا يقتطع البيانات.":"Historique des 100 dernières synchronisations. Jusqu’à 10 000 lignes sont inspectées ; dépasser la limite bloque l’écriture sans tronquer les données."}</p>
   {data.jobs.filter(j=>!["processing","reconciliation-required"].includes(j.state)).map(j=><button type="button" key={j.contractId} disabled={busy} onClick={()=>void run("resync",{contractId:j.contractId})}>{locale==="ar"?"إعادة مزامنة العقد":"Resynchroniser le contrat"} <bdi>{j.contractId}</bdi></button>)}
   <button type="button" disabled={busy||(data.page??1)<=1} onClick={()=>void run("dashboard",{page:(data.page??1)-1,...(filter?{contractId:filter}:{})})}>{locale==="ar"?"السابق":"Précédent"}</button><button type="button" disabled={busy||(data.page??1)*20>=(data.total??0)} onClick={()=>void run("dashboard",{page:(data.page??1)+1,...(filter?{contractId:filter}:{})})}>{locale==="ar"?"التالي":"Suivant"}</button>
  </>}
  <ul>{data.history?.map((h,i)=><li key={`${h.contractId}:${h.sequence}:${i}`}><bdi>{h.contractId}</bdi> · {statuses[locale].synchronized} · {h.sequence} · <time dateTime={h.at}>{h.at}</time></li>)}</ul>
  </>}
 </section>;
}
