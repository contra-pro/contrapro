"use client";
import Link from "next/link";
import Image from "next/image";
import type { Locale } from "../i18n/locales";
import type { Branding } from "./model";
import { operationsCopy } from "./copy";
import { useOperations } from "./client";
import styles from "../rentals/workspace.module.css";
import own from "./operations.module.css";
type BrandView={revision:number;profile:Partial<Branding>;logoData:string|null;canManage:boolean;unattachedUploads?:number};
export function BrandingWorkspace({locale,initial}:{locale:Locale;initial?:BrandView}) {
 const c=operationsCopy(locale),op=useOperations<BrandView>(locale,"branding",{},initial),b=op.data;
 return <section className={styles.root} dir={locale==="ar"?"rtl":"ltr"} aria-busy={op.busy}>{op.feedback}<Link href={`/${locale}/app/profile`}>{c.profile}</Link><p>{c.retained}</p><button type="button" disabled={op.busy} onClick={op.refresh}>{c.refresh}</button>
 {!!b?.unattachedUploads&&<p role="status">{locale==="ar"?"عمليات رفع غير مرتبطة محفوظة للمراجعة، وقد تُحتسب ضمن التخزين. أعد نفس الطلب عند غموض النتيجة؛ لا تُحذف الملفات تلقائياً.":"Des téléversements non rattachés sont conservés pour réconciliation et peuvent compter dans le stockage. Réessayez la même demande si son résultat est incertain ; aucun fichier n’est supprimé automatiquement."} ({b.unattachedUploads})</p>}
 {b&&<><form key={b.revision} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const profile=Object.fromEntries((["legalName","commercialName","representativeName","representativeRole","primary","accent"] as const).map(k=>[k,String(f.get(k))]));void op.perform("branding-save",{revision:b.revision,profile});}}><fieldset disabled={op.locked||!b.canManage}><legend>{c.branding}</legend><div className={styles.grid}>
 {(["legalName","commercialName","representativeName","representativeRole","primary","accent"] as const).map(k=><label key={k}>{c[k]}<input name={k} type={k==="primary"||k==="accent"?"color":"text"} required={k==="legalName"} maxLength={k.endsWith("Name")?200:100} defaultValue={b.profile[k]??(k==="primary"?"#173b56":k==="accent"?"#b68a35":"")}/></label>)}</div><button>{c.save}</button></fieldset></form>
 {/* PNG data is validated server-side; no remote/user-supplied URL is rendered. */}
 {b.logoData&&<Image alt={c.logo} src={b.logoData} width={120} height={80} className={own.logo} unoptimized/>}
 {b.canManage&&<form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget),file=f.get("logo");if(!(file instanceof File))return;
 const reader=new FileReader();reader.onload=()=>void op.perform("logo-upload",{revision:b.revision,data:String(reader.result)});reader.readAsDataURL(file);
 }}><fieldset disabled={op.locked}><legend>{c.logo}</legend><label>{c.logo}<input name="logo" type="file" accept="image/png" required/></label><button>{c.save}</button>{b.logoData&&<button type="button" onClick={()=>void op.perform("logo-remove",{revision:b.revision})}>{c.removeLogo}</button>}</fieldset></form>}
 </>}
 </section>;
}
