"use client";
import { useEffect, useState } from "react";
import type { Locale } from "../i18n/locales";
import type { ClauseVersion } from "./clauses";
import { sendDocument } from "./client";
import { documentMessages } from "./messages";

export function ClauseManager({locale}:{locale:Locale}) {
  const ar=locale==="ar",c=documentMessages(locale),[versions,setVersions]=useState<ClauseVersion[]>([]),[edit,setEdit]=useState<ClauseVersion|null>(null),[title,setTitle]=useState(""),[fr,setFr]=useState(""),[arabic,setArabic]=useState(""),[enabled,setEnabled]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function load(){try{setVersions(await sendDocument(locale,"clauses") as ClauseVersion[]);setError("");}catch{setError(c.errors.unavailable);}}
  useEffect(()=>{let live=true;sendDocument(locale,"clauses").then(v=>{if(live)setVersions(v as ClauseVersion[]);}).catch(()=>{if(live)setError(c.errors.unavailable);});return()=>{live=false;};},[locale,c.errors.unavailable]);
  function reset(){setEdit(null);setTitle("");setFr("");setArabic("");setEnabled(true);}
  return <section dir={ar?"rtl":"ltr"}><h2>{ar?"بنود العقد":"Clauses du contrat"}</h2>
    <p>{ar?"تضاف البنود في ملحق. راجع الصياغة قانونياً؛ لا تتغير الإصدارات السابقة.":"Les clauses sont ajoutées en annexe. Faites valider leur rédaction ; les versions précédentes sont conservées."}</p>
    {error&&<p role="alert">{error}</p>}<button type="button" disabled={busy} onClick={()=>void load()}>{c.retry}</button>
    <form onSubmit={e=>{e.preventDefault();if(busy)return;setBusy(true);setError("");void sendDocument(locale,"clause-save",{id:edit?.clauseId??crypto.randomUUID(),expectedRevision:edit?.revision??0,title,fr,ar:arabic,enabled}).then(async()=>{reset();await load();}).catch(e=>setError(c.errors[e.message as keyof typeof c.errors]??c.errors.unavailable)).finally(()=>setBusy(false));}}>
      <fieldset disabled={busy}><legend>{edit?c.edit:c.add}</legend>
        <label>{ar?"عنوان البند":"Titre de la clause"}<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label>
        <label>Français<textarea lang="fr" dir="ltr" required maxLength={8000} value={fr} onChange={e=>setFr(e.target.value)}/></label>
        <label>العربية<textarea lang="ar" dir="rtl" required maxLength={8000} value={arabic} onChange={e=>setArabic(e.target.value)}/></label>
        <label><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>{ar?"مفعّل":"Activée"}</label>
        <button type="submit">{c.save}</button><button type="button" onClick={reset}>{c.cancel}</button>
      </fieldset>
    </form>
    <ul>{versions.map(v=><li key={v.id}>{v.title} · {v.revision} · {v.enabled?(ar?"مفعّل":"Activée"):(ar?"معطّل":"Désactivée")}
      <button type="button" disabled={busy||versions.some(x=>x.clauseId===v.clauseId&&x.revision>v.revision)} onClick={()=>{setEdit(v);setTitle(v.title);setFr(v.fr);setArabic(v.ar);setEnabled(v.enabled);}}>{c.edit}</button>
      <details><summary>{c.versions}</summary><p lang="fr" dir="ltr">{v.fr}</p><p lang="ar" dir="rtl">{v.ar}</p></details>
    </li>)}</ul>
  </section>;
}

export function ClauseChoice({locale,value,change}:{locale:Locale;value:string[];change:(ids:string[])=>void}) {
  const [versions,setVersions]=useState<ClauseVersion[]>([]),[error,setError]=useState(false),c=documentMessages(locale);
  async function load(){try{setVersions(await sendDocument(locale,"clauses") as ClauseVersion[]);setError(false);}catch{setError(true);}}
  useEffect(()=>{let live=true;sendDocument(locale,"clauses").then(v=>{if(live)setVersions(v as ClauseVersion[]);}).catch(()=>{if(live)setError(true);});return()=>{live=false;};},[locale]);
  return <fieldset><legend>{locale==="ar"?"البنود وترتيبها في الملحق":"Clauses et ordre dans l’annexe"}</legend>
    {error&&<p role="alert">{c.errors.unavailable}<button type="button" onClick={()=>void load()}>{c.retry}</button></p>}
    <ol>{value.map((id,i)=><li key={id}>{versions.find(v=>v.id===id)?.title??c.loading}
      <button type="button" disabled={i===0} aria-label={locale==="ar"?"نقل إلى الأعلى":"Monter"} onClick={()=>{const next=[...value];[next[i-1],next[i]]=[next[i]!,next[i-1]!];change(next);}}>↑</button>
      <button type="button" onClick={()=>change(value.filter(v=>v!==id))}>{c.remove}</button>
    </li>)}</ol>
    <label>{locale==="ar"?"إضافة إصدار بند":"Ajouter une version de clause"}<select value="" onChange={e=>{if(e.target.value)change([...value,e.target.value]);}}><option value="">—</option>{versions.filter(v=>!value.includes(v.id)).map(v=><option key={v.id} value={v.id}>{v.title} · {v.revision} · {v.enabled?"✓":"—"}</option>)}</select></label>
  </fieldset>;
}
