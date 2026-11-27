"use client";
import Link from "next/link";
import { useEffect,useRef,useState } from "react";
import type { Locale } from "../i18n/locales";
import { sendRental } from "./workspace";
import { rentalMessages } from "./messages";
import { archiveQuery,type ArchiveQuery,type ArchiveItem } from "./archive-model";
import styles from "./workspace.module.css";
const initial:ArchiveQuery={page:1,query:"",state:"all",signature:"all",payment:"all",archived:"all",from:"",to:"",createdFrom:"",createdTo:""};
export function ContractArchive({locale}:{locale:Locale}){
 const ar=locale==="ar",c=rentalMessages(locale),[form,setForm]=useState(initial),[applied,setApplied]=useState(initial),[data,setData]=useState<{items:ArchiveItem[];total:number;asOf:string}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),lock=useRef(false);
 useEffect(()=>{let live=true;sendRental(locale,{action:"archive",input:initial}).then(v=>{if(live)setData(v as typeof data);}).catch(()=>{if(live)setError(c.unavailable);});return()=>{live=false;};},[locale,c.unavailable]);
 async function load(input:ArchiveQuery){if(lock.current)return;lock.current=true;setBusy(true);setError("");try{const checked=archiveQuery(input);setData(await sendRental(locale,{action:"archive",input:checked}) as typeof data);setApplied(checked);}catch{setError(c.unavailable);}finally{lock.current=false;setBusy(false);}}
 return <section className={styles.root} dir={ar?"rtl":"ltr"} aria-busy={busy}><h2>{ar?"أرشيف العقود":"Archives des contrats"}</h2>
  <p>{ar?"بحث خاص داخل الوكالة. لا تتضمن النتائج أرقام الهوية. الأرشفة تنظيمية ولا تحذف العقود أو الأدلة.":"Recherche privée dans l’agence. Les résultats n’affichent pas les identifiants d’identité. L’archivage organise les contrats sans supprimer leurs documents ou preuves."}</p>
  {error&&<p role="alert">{error}</p>}<form onSubmit={e=>{e.preventDefault();void load({...form,page:1});}}><fieldset disabled={busy}><legend>{ar?"البحث والفلاتر":"Recherche et filtres"}</legend>
   <label>{ar?"المرجع، العميل، السائق، الاتصال، الهوية أو المركبة":"Référence, client, conducteur, contact, identité ou véhicule"}<input autoComplete="off" maxLength={120} value={form.query} onChange={e=>setForm({...form,query:e.target.value})}/></label>
   <label>{ar?"حالة الإيجار":"État de location"}<select value={form.state} onChange={e=>setForm({...form,state:e.target.value})}><option value="all">{ar?"الكل":"Tous"}</option>{Object.entries(c.states).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
   <label>{ar?"حالة المستند والتوقيع":"Document et signatures"}<select value={form.signature} onChange={e=>setForm({...form,signature:e.target.value})}>{["all","none","issued","agency","client","completed"].map((v,i)=><option key={v} value={v}>{(ar?["الكل","غير موقع","مستند صادر","توقيع الوكالة","توقيع العميل","مكتمل"]:["Tous","Sans signature","PDF émis","Agence signée","Client signé","Finalisé"])[i]}</option>)}</select></label>
   <label>{ar?"دفعات الإيجار":"Paiement du loyer"}<select value={form.payment} onChange={e=>setForm({...form,payment:e.target.value})}>{["all","unpaid","partial","paid"].map((v,i)=><option key={v} value={v}>{(ar?["الكل","غير مدفوع","جزئي","مدفوع"]:["Tous","Non payé","Partiel","Payé"])[i]}</option>)}</select></label>
   <label>{ar?"الأرشفة":"Archivage"}<select value={form.archived} onChange={e=>setForm({...form,archived:e.target.value})}>{["all","yes","no"].map((v,i)=><option key={v} value={v}>{(ar?["الكل","مؤرشف","غير مؤرشف"]:["Tous","Archivé","Non archivé"])[i]}</option>)}</select></label>
   {(["from","to","createdFrom","createdTo"] as const).map((k,i)=><label key={k}>{(ar?["الإيجار من","الإيجار إلى","الإنشاء من","الإنشاء إلى"]:["Location depuis","Location jusqu’au","Création depuis","Création jusqu’au"])[i]}<input type="date" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}
   <button type="submit">{ar?"بحث":"Rechercher"}</button><button type="button" onClick={()=>{setForm(initial);void load(initial);}}>{ar?"إعادة الضبط":"Réinitialiser"}</button>
  </fieldset></form>
  {!data?<p role="status">{c.loading}</p>:<><p>{ar?"النتائج":"Résultats"}: {data.total}</p>{!data.items.length&&<p>{ar?"لا عقود مطابقة.":"Aucun contrat correspondant."}</p>}<ul>{data.items.map(r=><li key={r.id}><Link href={`/${locale}/app/rentals/${r.id}`} prefetch={false}>{r.reference??c.draft}</Link> · {c.states[r.state as keyof typeof c.states]}<p>{r.client} · <bdi>{r.vehicle}</bdi> · <bdi>{r.start}</bdi></p>
   <p>{ar?"المستندات والتوقيعات والأدلة وسجل التسليم متاحة في تفاصيل العقد.":"Documents historiques, signatures, preuves et livraisons sont accessibles dans les détails du contrat."}</p>
   {["termine","annule"].includes(r.state)&&<button type="button" disabled={busy} onClick={()=>{if(lock.current)return;lock.current=true;setBusy(true);void sendRental(locale,{action:"archive-mark",input:{rentalId:r.id,archived:!r.archived,requestId:crypto.randomUUID()}}).then(()=>{lock.current=false;return load(applied);}).catch(()=>setError(c.unavailable)).finally(()=>{lock.current=false;setBusy(false);});}}>{r.archived?(ar?"إزالة علامة الأرشفة":"Retirer des archives"):(ar?"وضع علامة الأرشفة":"Marquer comme archivé")}</button>}
  </li>)}</ul><button type="button" disabled={busy||applied.page<=1} onClick={()=>void load({...applied,page:applied.page-1,asOf:data.asOf})}>{c.previous}</button><button type="button" disabled={busy||applied.page*20>=data.total} onClick={()=>void load({...applied,page:applied.page+1,asOf:data.asOf})}>{c.next}</button></>}
 </section>;
}
