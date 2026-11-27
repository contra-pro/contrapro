"use client";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "../i18n/locales";
import type { Template } from "./model";
import type { PreviewArtifact } from "./service";
import { sendDocument } from "./client";
import { documentMessages } from "./messages";
import { ClauseChoice } from "./clause-workspace";
import styles from "./workspace.module.css";

export function DraftPreview({locale,rentalId,onReady}:{locale:Locale;rentalId:string;onReady?:(ready:boolean)=>void}) {
  const c=documentMessages(locale),ar=locale==="ar",[templates,setTemplates]=useState<Template[]>([]),[selected,setSelected]=useState(""),[custom,setCustom]=useState<Record<string,string>>({}),[date,setDate]=useState(()=>new Date().toISOString().slice(0,10)),[revision,setRevision]=useState(0);
  const [artifact,setArtifact]=useState<PreviewArtifact|null>(null),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[url,setUrl]=useState(""),[retry,setRetry]=useState<string|null>(null),flight=useRef(false);
  const [override,setOverride]=useState(false),[clauses,setClauses]=useState<string[]>([]);
  const version=templates.flatMap(t=>t.versions).find(v=>v.id===selected);
  useEffect(()=>{onReady?.(!!artifact&&!artifact.stale&&!dirty&&!busy&&!retry);},[artifact,dirty,busy,retry,onReady]);
  async function load(){
    const [items,input,state]=await Promise.all([sendDocument(locale,"list"),sendDocument(locale,"draft-input",{rentalId}),sendDocument(locale,"preview-state",{rentalId})]);
    setTemplates((items as Template[]).filter(t=>!t.archived));
    if(input){const v=input as {templateVersionId:string;custom:Record<string,string>;issueDate:string;revision:number;clauseVersions?:string[]};setSelected(v.templateVersionId);setCustom(v.custom);setDate(v.issueDate);setRevision(v.revision);setOverride(!!v.clauseVersions);setClauses(v.clauseVersions??[]);}
    setArtifact(state as PreviewArtifact|null);setDirty(false);
  }
  useEffect(()=>{let live=true;void Promise.all([sendDocument(locale,"list"),sendDocument(locale,"draft-input",{rentalId}),sendDocument(locale,"preview-state",{rentalId})]).then(([items,input,state])=>{
    if(!live)return;setTemplates((items as Template[]).filter(t=>!t.archived));if(input){const v=input as {templateVersionId:string;custom:Record<string,string>;issueDate:string;revision:number;clauseVersions?:string[]};setSelected(v.templateVersionId);setCustom(v.custom);setDate(v.issueDate);setRevision(v.revision);setOverride(!!v.clauseVersions);setClauses(v.clauseVersions??[]);}setArtifact(state as PreviewArtifact|null);
  }).catch(()=>{if(live)setError(c.errors.unavailable);});return()=>{live=false;};},[locale,rentalId,c.errors.unavailable]);
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
  async function run(work:()=>Promise<void>){if(flight.current)return;flight.current=true;setBusy(true);setError("");try{await work();}catch(e){const code=e instanceof Error?e.message:"unavailable";setError(c.errors[code as keyof typeof c.errors]??c.errors.unavailable);}finally{flight.current=false;setBusy(false);}}
  function change(){setDirty(true);setUrl("");}
  async function generate(){
    let requestId=retry;
    if(!requestId){await sendDocument(locale,"draft-configure",{rentalId,templateVersionId:selected,issueDate:date,custom,expectedRevision:revision,...(override?{clauseVersions:clauses}:{})});setRevision(v=>v+1);requestId=crypto.randomUUID();setRetry(requestId);}
    try{const a=await sendDocument(locale,"preview-generate",{rentalId,requestId}) as PreviewArtifact;setArtifact(a);setDirty(false);setRetry(null);setUrl(URL.createObjectURL(await sendDocument(locale,"preview-download",{rentalId,requestId},true) as Blob));}
    catch(e){if(e instanceof Error&&e.message!=="unavailable")setRetry(null);throw e;}
  }
  return <section className={styles.root} dir={ar?"rtl":"ltr"} aria-busy={busy}><h2>{ar?"معاينة المسودة قبل التأكيد":"Aperçu du brouillon avant confirmation"}</h2>
    <p>{ar?"معاينة غير نهائية وغير موقعة. لا تصدر عقداً ولا ترسل دعوات. أعد المعاينة بعد أي تعديل.":"Aperçu non final et non signé. Aucun contrat émis ni invitation envoyée. Régénérez après toute modification."}</p>
    {error&&<p role="alert">{error}</p>}
    {(dirty||artifact?.stale)&&<p role="alert">{ar?"المعاينة قديمة. احفظ القيم وأعد إنشاء المعاينة قبل التأكيد.":"Aperçu périmé. Enregistrez les valeurs et régénérez avant confirmation."}</p>}
    <fieldset disabled={busy||!!retry}><legend>{c.template}</legend>
      <label>{c.template}<select value={selected} onChange={e=>{change();setSelected(e.target.value);setCustom({});}}><option value="">—</option>{templates.flatMap(t=>t.versions.map(v=><option key={v.id} value={v.id}>{t.name} · {v.revision}</option>))}</select></label>
      <label>{c.issueDate}<input type="date" required value={date} onChange={e=>{change();setDate(e.target.value);}}/></label>
      {version?.config.custom.map(k=><label key={k}>{k}<input maxLength={2000} required={version.config.mappings.some(m=>m.field===`custom.${k}`&&m.required)} value={custom[k]??""} onChange={e=>{change();setCustom({...custom,[k]:e.target.value});}}/></label>)}
      <label><input type="checkbox" checked={override} onChange={e=>{change();setOverride(e.target.checked);setClauses(version?.config.clauseVersions??[]);}}/>{ar?"تخصيص اختيار البنود لهذا العقد":"Personnaliser la sélection des clauses pour ce contrat"}</label>
      {override&&<ClauseChoice locale={locale} value={clauses} change={v=>{change();setClauses(v);}}/>}
      <button type="button" disabled={!selected||!date} onClick={()=>void run(generate)}>{ar?"حفظ وإعادة إنشاء المعاينة":"Enregistrer et régénérer l’aperçu"}</button>
    </fieldset>
    {retry&&<button type="button" disabled={busy} onClick={()=>void run(generate)}>{c.retry}</button>}
    <button type="button" disabled={busy} onClick={()=>void run(load)}>{ar?"تحديث الحالة":"Actualiser l’état"}</button>
    {artifact&&!artifact.stale&&!dirty&&<button type="button" disabled={busy} onClick={()=>void run(async()=>setUrl(URL.createObjectURL(await sendDocument(locale,"preview-download",{rentalId,requestId:artifact.requestId},true) as Blob)))}>{c.preview}</button>}
    {url&&<section><a href={url} download="apercu-non-final.pdf">{c.download}</a><button type="button" onClick={()=>setUrl("")}>{c.cancel}</button><iframe title={c.preview} src={url} className={styles.preview}/></section>}
  </section>;
}
