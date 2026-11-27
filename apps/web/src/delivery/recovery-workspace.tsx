"use client";
import { useEffect,useRef,useState } from "react";
import type { Locale } from "../i18n/locales";
import { sendDelivery } from "./client";
import type { ReminderPolicy } from "./reminders";
import { deliveryCopy } from "./copy";
export function ReminderSettings({locale,sessionId}:{locale:Locale;sessionId?:string}){
 const ar=locale==="ar",c=deliveryCopy(locale),[policy,setPolicy]=useState<ReminderPolicy|null>(null),[enabled,setEnabled]=useState(false),[manual,setManual]=useState(false),[intervals,setIntervals]=useState(""),[maximum,setMaximum]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[loaded,setLoaded]=useState(false);
 function apply(v:ReminderPolicy|null){setPolicy(v);setEnabled(v?.enabled??false);setManual(v?.manualEnabled??false);setIntervals(v?.intervals.join(",")??"");setMaximum(v?String(v.maxCount):"");setLoaded(true);}
 const [history,setHistory]=useState<{ordinal:number;attempts:number;state:string;policyRevision:number}[]>([]);
 async function loadHistory(){if(sessionId)setHistory(await sendDelivery(locale,"reminder-history",{sessionId}) as typeof history);}
 async function load(){try{apply(await sendDelivery(locale,"reminder-policy",{}) as ReminderPolicy|null);await loadHistory();setError("");}catch{setError(c.errors.unavailable);}}
 useEffect(()=>{let live=true;sendDelivery(locale,"reminder-policy",{}).then(v=>{if(live)apply(v as ReminderPolicy|null);}).catch(()=>{if(live)setError(c.errors.unavailable);});return()=>{live=false;};},[locale,c.errors.unavailable]);
 return <section><h4>{ar?"سياسة التذكيرات للوكالة":"Politique de rappel de l’agence"}</h4><p>{ar?"لا إرسال تلقائي دون سياسة محفوظة. الفواصل بالدقائق منذ تجهيز الدعوة الأصلية. واتساب يبقى يدوياً.":"Aucun rappel automatique sans politique enregistrée. Délais en minutes depuis la préparation de l’invitation initiale. WhatsApp reste manuel."}</p>
  {error&&<p role="alert">{error}</p>}{!loaded&&!error&&<p role="status">{c.loading}</p>}
  <button type="button" disabled={busy} onClick={()=>void load()}>{c.refresh}</button>
  <form onSubmit={e=>{e.preventDefault();if(busy)return;setBusy(true);setError("");void sendDelivery(locale,"reminder-policy-save",{revision:policy?.revision??0,enabled,manualEnabled:manual,intervals:intervals.split(",").map(x=>Number(x.trim())),maxCount:Number(maximum)}).then(v=>{apply(v as ReminderPolicy);setError(ar?"تم الحفظ.":"Enregistré.");}).catch(e=>setError(c.errors[e.message as keyof typeof c.errors]??c.errors.unavailable)).finally(()=>setBusy(false));}}>
   <fieldset disabled={busy||!loaded}><legend>{ar?"الإعدادات":"Paramètres"}</legend>
    <label><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>{ar?"تفعيل التذكيرات التلقائية":"Activer les rappels automatiques"}</label>
    <label><input type="checkbox" checked={manual} onChange={e=>setManual(e.target.checked)}/>{ar?"السماح بالتذكير اليدوي":"Autoriser les rappels manuels"}</label>
    <label>{ar?"الفواصل المتزايدة بالدقائق، مفصولة بفواصل":"Délais croissants en minutes, séparés par des virgules"}<input required value={intervals} onChange={e=>setIntervals(e.target.value)}/></label>
    <label>{ar?"الحد الأقصى لكل دعوة":"Maximum par invitation"}<input type="number" required min={1} max={20} value={maximum} onChange={e=>setMaximum(e.target.value)}/></label>
    <button type="submit">{ar?"حفظ السياسة":"Enregistrer la politique"}</button>
   </fieldset>
  </form>
  {sessionId&&<><button type="button" disabled={busy} onClick={()=>void load()}>{ar?"سجل تجهيز التذكيرات (آخر 100)":"Historique de préparation des rappels (100 derniers)"}</button><ul>{history.map((h,i)=><li key={i}>{h.ordinal} · {h.state==="materialized"?(ar?"تم التجهيز":"Préparé"):h.state==="failed"?(ar?"فشل التجهيز":"Préparation échouée"):(ar?"قيد التجهيز أو إعادة المحاولة":"Préparation ou reprise en cours")} · {ar?"المحاولات":"Tentatives"} : {h.attempts}</li>)}</ul></>}
 </section>;
}
export function UncertainRecovery({locale,jobId,refresh}:{locale:Locale;jobId:string;refresh:()=>Promise<void>}){
 const ar=locale==="ar",c=deliveryCopy(locale),[reference,setReference]=useState(""),[retire,setRetire]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),request=useRef<{requestId:string;input:string}|null>(null);
 return <form onSubmit={e=>{e.preventDefault();if(busy)return;const base={jobId,evidenceRef:reference,disposition:retire?"retire-no-resend":"retain-uncertain"},input=JSON.stringify(base);if(request.current?.input!==input)request.current={requestId:crypto.randomUUID(),input};setBusy(true);setError("");void sendDelivery(locale,"manual-resolve",{...base,requestId:request.current.requestId}).then(refresh).catch(e=>setError(c.errors[e.message as keyof typeof c.errors]??c.errors.unavailable)).finally(()=>setBusy(false));}}>
  <p>{ar?"النتيجة غير معروفة. لا إعادة إرسال تلقائية. الإغلاق الإداري لا يثبت التسليم أو عدم الإرسال.":"Résultat inconnu : aucun renvoi automatique. La clôture administrative ne prouve ni livraison ni absence d’envoi."}</p>
  {error&&<p role="alert">{error}</p>}<fieldset disabled={busy}><legend>{ar?"مراجعة بشرية":"Réconciliation manuelle"}</legend>
   <label>{ar?"مرجع ملف المراجعة، دون أسرار":"Référence du dossier, sans secret"}<input required minLength={3} maxLength={120} value={reference} onChange={e=>setReference(e.target.value)}/></label>
   <label><input type="checkbox" checked={retire} onChange={e=>setRetire(e.target.checked)}/>{ar?"إيقاف هذه المحاولة دون إعادة إرسال":"Retirer cette tentative sans renvoi"}</label>
   <button type="submit">{ar?"تسجيل المراجعة":"Enregistrer la revue"}</button>
  </fieldset>
 </form>;
}
