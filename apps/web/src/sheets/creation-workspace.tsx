"use client";
import { useEffect,useState } from "react";
import type { Locale } from "../i18n/locales";
import { sendSheets } from "./client";
type Creation={requestId:string;title:string;state:string;spreadsheetId:string|null};
export function CreationRecovery({locale,onRecovered,onAbandoned}:{locale:Locale;onRecovered:(id:string)=>void;onAbandoned?:()=>void}){
 const ar=locale==="ar",[items,setItems]=useState<Creation[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function load(){const v=await sendSheets(locale,"creation-list",{}) as {items:Creation[]};setItems(v.items);}
 useEffect(()=>{let live=true;sendSheets(locale,"creation-list",{}).then(v=>{if(live)setItems((v as {items:Creation[]}).items);}).catch(()=>{if(live)setError(ar?"تعذر تحميل الطلبات.":"Impossible de charger les demandes.");});return()=>{live=false;};},[locale,ar]);
 async function run(action:string,input:object){if(busy)return;setBusy(true);setError("");try{const v=await sendSheets(locale,action,input);if(action==="recover-spreadsheet")onRecovered((v as {spreadsheetId:string}).spreadsheetId);if(action==="creation-abandon")onAbandoned?.();await load();}catch{setError(ar?"تعذر تأكيد المطابقة. لا تكرر الإنشاء؛ تحقق من الملف واسم الطلب.":"Correspondance non confirmée. Ne recréez pas le fichier ; vérifiez son identifiant et le titre de demande.");}finally{setBusy(false);}}
 return <section><h2>{ar?"استعادة إنشاء جدول البيانات":"Récupérer une création de fichier"}</h2><p>{ar?"إذا ضاع الرد، ابحث في Google Drive عن اسم الطلب أدناه ثم أدخل معرف الملف. لا يُعاد الإنشاء تلقائياً.":"Si la réponse a été perdue, recherchez dans Google Drive le titre de demande ci-dessous, puis indiquez l’identifiant du fichier. Aucune nouvelle création automatique."}</p>
  {error&&<p role="alert">{error}</p>}<button type="button" disabled={busy} onClick={()=>void run("creation-list",{})}>{ar?"تحديث الطلبات":"Actualiser les demandes"}</button>
  <p>{ar?"آخر 50 طلباً؛ الطلب غير المحسوم يبقى ظاهراً حتى حله.":"50 dernières demandes ; toute demande non résolue reste visible jusqu’à sa résolution."}</p>
  <ul>{items.map(v=><li key={v.requestId}><bdi>{v.title} ({v.requestId})</bdi> · {v.state==="confirmed"?(ar?"مؤكد":"Confirmé"):v.state==="abandoned"?(ar?"متروك، النتيجة القديمة مجهولة":"Abandonné, ancien résultat inconnu"):(ar?"يحتاج إلى تسوية":"Réconciliation requise")}
   {v.state==="uncertain"&&<form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void run("recover-spreadsheet",{requestId:v.requestId,spreadsheetId:f.get("id")});}}><label>{ar?"معرف الملف الموجود":"Identifiant du fichier existant"}<input name="id" required minLength={10} maxLength={150} autoComplete="off"/></label><button disabled={busy}>{ar?"فحص وربط الملف":"Vérifier et rattacher le fichier"}</button>
    <label><input name="abandon" type="checkbox"/>{ar?"أقر بأن الملف القديم قد يكون موجوداً؛ التخلي لا يحذفه ولا يثبت فشل الإنشاء.":"Je reconnais que l’ancien fichier peut exister ; l’abandon ne le supprime pas et ne prouve pas un échec."}</label><button type="button" disabled={busy} onClick={e=>{const checkbox=e.currentTarget.form?.elements.namedItem("abandon") as HTMLInputElement|null;if(checkbox?.checked)void run("creation-abandon",{requestId:v.requestId,acknowledge:true});}}>{ar?"تسجيل التخلي دون إعادة المحاولة":"Enregistrer l’abandon sans réessayer"}</button>
   </form>}
   {v.spreadsheetId&&<button type="button" disabled={busy} onClick={()=>onRecovered(v.spreadsheetId!)}>{ar?"اختيار الملف المؤكد":"Sélectionner le fichier confirmé"}</button>}
  </li>)}</ul>
 </section>;
}
