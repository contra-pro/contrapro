"use client";
import { useRef,useState } from "react";
import type { Locale } from "../i18n/locales";
import { drawing,type Drawing } from "./representation";
import styles from "./workspace.module.css";
export function DrawingPad({locale,onChange,disabled=false}:{locale:Locale;onChange:(value:Drawing|null)=>void;disabled?:boolean}) {
  const [strokes,setStrokes]=useState<number[][][]>([]),[limited,setLimited]=useState(false),active=useRef<number|null>(null),data=useRef<number[][][]>([]);
  const publish=()=>{setStrokes(data.current.map(s=>s.slice()));try{onChange(drawing({version:"drawn-v1",strokes:data.current}));}catch{onChange(null);}};
  return <div inert={disabled}><p>{locale==="ar"?"ارسم بإصبعك أو بالقلم أو الفأرة. يمكنك دائماً استخدام اسمك المكتوب دون رسم.":"Dessinez au doigt, au stylet ou à la souris. Votre nom saisi reste une alternative complète sans dessin."}</p>
    <svg className={styles.drawing} viewBox="0 0 1000 1000" preserveAspectRatio="none" role="img" aria-label={locale==="ar"?"مساحة الرسم الاختياري":"Zone de dessin facultatif"}
      onPointerDown={e=>{if(active.current!==null||e.button!==0)return;if(data.current.length>=20){setLimited(true);return;}e.currentTarget.setPointerCapture(e.pointerId);active.current=e.pointerId;const r=e.currentTarget.getBoundingClientRect();data.current.push([[Math.round(Math.max(0,Math.min(1000,(e.clientX-r.left)/r.width*1000))),Math.round(Math.max(0,Math.min(1000,(e.clientY-r.top)/r.height*1000)))]]);publish();}}
      onPointerMove={e=>{if(active.current!==e.pointerId)return;const s=data.current.at(-1)!;if(s.length>=160||data.current.reduce((n,x)=>n+x.length,0)>=1000){setLimited(true);return;}const r=e.currentTarget.getBoundingClientRect(),p=[Math.round(Math.max(0,Math.min(1000,(e.clientX-r.left)/r.width*1000))),Math.round(Math.max(0,Math.min(1000,(e.clientY-r.top)/r.height*1000)))];if(p[0]!==s.at(-1)![0]||p[1]!==s.at(-1)![1]){s.push(p);publish();}}}
      onPointerUp={e=>{if(active.current===e.pointerId){active.current=null;const last=data.current.at(-1);if(last&&last.length<2)data.current.pop();publish();}}} onPointerCancel={()=>{active.current=null;data.current.pop();publish();}}>
      {strokes.map((s,i)=><polyline key={i} points={s.map(p=>p.join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>)}
    </svg><button type="button" onClick={()=>{active.current=null;data.current=[];setLimited(false);publish();}}>{locale==="ar"?"مسح الرسم":"Effacer le dessin"}</button>
    {limited&&<p role="status">{locale==="ar"?"تم بلوغ حد الرسم. امسحه لإعادة المحاولة أو استخدم الاسم المكتوب.":"Limite du dessin atteinte. Effacez pour recommencer ou utilisez le nom saisi."}</p>}</div>;
}
