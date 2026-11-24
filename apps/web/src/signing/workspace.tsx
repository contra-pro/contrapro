"use client";
import { useEffect,useRef,useState,useSyncExternalStore } from "react";
import type { Locale } from "../i18n/locales";
import type { Artifact } from "../documents/model";
import { consent,type Capture,type Session,type SigningState,type Assurance } from "./model";
import { signingMessages } from "./messages";
import styles from "./workspace.module.css";
import { DeliveryPanel } from "../delivery/workspace";
type PublicSession={id:string;version:number;state:SigningState;locale:Locale;clientName:string;expiresAt:string;reviewChecksum:string;originalChecksum:string;assurance:Assurance;finalChecksum:string|null;clientVerified?:boolean};
export async function sendSigning(locale:Locale,action:string,input:object,token?:string,binary=false):Promise<unknown>{
  const response=await fetch(token?`/${locale}/sign/action`:`/${locale}/app/signing-action`,{method:"POST",credentials:token?"omit":"same-origin",cache:"no-store",referrerPolicy:"no-referrer",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,input,...(token?{token}:{})})});
  if(response.redirected)throw Error("unavailable");if(!response.ok){const e=await response.json();throw Error(e.code??"unavailable");}return binary?response.blob():(await response.json()).value;
}
function useOperation(locale:Locale){const c=signingMessages(locale),[busy,setBusy]=useState(false),[message,setMessage]=useState("");const flight=useRef(false),ids=useRef(new Map<string,string>());
  const command=(action:string,input:object)=>{const key=JSON.stringify({action,input});if(!ids.current.has(key))ids.current.set(key,crypto.randomUUID());return {...input,requestId:ids.current.get(key)!};};
  const run=async(work:()=>Promise<void>)=>{if(flight.current)return;flight.current=true;setBusy(true);setMessage("");try{await work();}catch(e){const code=e instanceof Error?e.message:"unavailable";setMessage(c.errors[code as keyof typeof c.errors]??c.errors.unavailable);}finally{flight.current=false;setBusy(false);}};
  return{busy,run,command,feedback:<p role="status" aria-live="polite">{busy?c.loading:message}</p>};}
export function SignatureCapture({locale,documentLocale,checksum,disabled,onSign}:{locale:Locale;documentLocale:Locale;checksum:string;disabled:boolean;onSign:(value:Capture)=>void}){
  const c=signingMessages(locale),[name,setName]=useState(""),[review,setReview]=useState(false),[identity,setIdentity]=useState(false),[agreed,setAgreed]=useState(false);
  return <form onSubmit={e=>{e.preventDefault();if(review&&identity&&agreed)onSign({typedName:name,reviewed:true,identityConfirmed:true,consent:true,consentVersion:consent[documentLocale].version,reviewedChecksum:checksum});}}>
    <fieldset disabled={disabled}><legend>{c.simple}</legend><label>{c.name}<input autoComplete="name" minLength={2} maxLength={100} required value={name} onChange={e=>setName(e.target.value)} /></label>
      <p>{c.limit}</p><p lang={documentLocale} dir={documentLocale==="ar"?"rtl":"ltr"}>{consent[documentLocale].text}</p>
      <p><bdi>{checksum}</bdi></p><label><input type="checkbox" checked={review} onChange={e=>setReview(e.target.checked)} required />{c.review}</label>
      <label><input type="checkbox" checked={identity} onChange={e=>setIdentity(e.target.checked)} required />{c.identity}</label><label><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} required />{c.consent}</label>
      <button type="submit" disabled={!review||!identity||!agreed}>{c.sign}</button>
    </fieldset></form>;
}
function FilePreview({blob,close,locale}:{blob:Blob;close:()=>void;locale:Locale}){const c=signingMessages(locale),link=useRef<HTMLAnchorElement>(null),frame=useRef<HTMLIFrameElement>(null);
  useEffect(()=>{const u=URL.createObjectURL(blob);if(link.current)link.current.href=u;if(frame.current)frame.current.src=u;return()=>URL.revokeObjectURL(u);},[blob]);
  return <section><button type="button" onClick={close}>{locale==="ar"?"إغلاق":"Fermer"}</button><a ref={link} download={blob.type==="application/json"?"preuves-signature.json":"contrat.pdf"}>{locale==="ar"?"تنزيل":"Télécharger"}</a>{blob.type!=="application/json"&&<iframe ref={frame} title={c.preview} className={styles.preview}/>}</section>;
}
// Browser-owned external state. Fragments never go to the server and are removed
// on subscription. The token is held only in this page's JS memory, not storage.
let invitationMemory="";
function subscribeInvitation(listener:()=>void){const read=()=>{const value=new URLSearchParams(window.location.hash.slice(1)).get("token");window.history.replaceState(null,"",window.location.pathname);if(value&&/^[a-f0-9]{64}$/.test(value)){invitationMemory=value;listener();}};read();window.addEventListener("hashchange",read);return()=>window.removeEventListener("hashchange",read);}
export function AgencySigning({locale,rentalId,artifacts,deliveryEnabled=false}:{locale:Locale;rentalId:string;artifacts:Artifact[];deliveryEnabled?:boolean}){
  const c=signingMessages(locale),op=useOperation(locale),[sessions,setSessions]=useState<Session[]|null>(null),[selected,setSelected]=useState(""),[assurance,setAssurance]=useState<Assurance>("simple");
  const [blob,setBlob]=useState<Blob|null>(null),[invite,setInvite]=useState<{url:string;code:string}|null>(null),[loadError,setLoadError]=useState(false);
  const refresh=async()=>setSessions(await sendSigning(locale,"list",{rentalId}) as Session[]);
  useEffect(()=>{let live=true;sendSigning(locale,"list",{rentalId}).then(v=>{if(live)setSessions(v as Session[]);}).catch(()=>{if(live)setLoadError(true);});return()=>{live=false;};},[locale,rentalId]);
  async function command(action:string,input:object){const value=await sendSigning(locale,action,op.command(action,input));await refresh();return value;}
  return <section className={styles.root} dir={locale==="ar"?"rtl":"ltr"}><h2>{c.title}</h2>{op.feedback}{loadError&&<p role="alert">{c.errors.forbidden}</p>}
    <fieldset disabled={op.busy}><legend>{c.start}</legend><label>{c.artifact}<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">—</option>{artifacts.filter(a=>a.status==="issued").map(a=><option key={a.id} value={a.id}>{a.rentalVersion} · {a.createdAt}</option>)}</select></label>
      <label>{c.assurance}<select value={assurance} onChange={e=>setAssurance(e.target.value as Assurance)}><option value="simple">{c.simple}</option><option value="external-advanced">{c.advanced}</option><option value="external-qualified-requested">{c.qualified}</option></select></label>
      <button disabled={!selected} onClick={()=>void op.run(async()=>{await command("create",{artifactId:selected,assurance,providerId:null});})}>{c.start}</button><button onClick={()=>void op.run(refresh)}>{c.reload}</button>
    </fieldset>{!sessions?<p role="status">{c.loading}</p>:!sessions.length?<p>{c.empty}</p>:sessions.map(s=><article key={s.id}><h3>{c.states[s.state]}</h3><p>{c.expires}: <bdi>{s.expiresAt}</bdi></p>
      <button disabled={op.busy} onClick={()=>void op.run(async()=>setBlob(await sendSigning(locale,"document",{sessionId:s.id},undefined,true) as Blob))}>{c.preview}</button>
      {s.state==="awaiting_agency"&&<SignatureCapture key={`${s.id}:${s.version}`} locale={locale} documentLocale={s.locale} checksum={s.original.checksum} disabled={op.busy} onSign={value=>void op.run(async()=>{await command("agency-sign",{sessionId:s.id,version:s.version,capture:value});})}/>}
      {["agency_signed","awaiting_client"].includes(s.state)&&<button disabled={op.busy} onClick={()=>void op.run(async()=>{const v=await command(s.state==="agency_signed"?"invite":"renew",{sessionId:s.id,version:s.version}) as {url:string;code:string};if(!deliveryEnabled)setInvite(v);})}>{s.state==="agency_signed"?c.invite:c.renew}</button>}
      {["client_signed","finalization_pending","reconciliation_required"].includes(s.state)&&<button disabled={op.busy} onClick={()=>void op.run(async()=>{await sendSigning(locale,"finalize",{sessionId:s.id});await refresh();})}>{c.finalize}</button>}
      {s.state==="completed"&&<><p>{c.complete}</p><button disabled={op.busy} onClick={()=>void op.run(async()=>setBlob(await sendSigning(locale,"final-pdf",{sessionId:s.id},undefined,true) as Blob))}>{c.download}</button></>}
      {!["completed","expired","declined","cancelled","failed"].includes(s.state)&&<button disabled={op.busy} onClick={()=>void op.run(async()=>{await command("cancel",{sessionId:s.id,version:s.version});setInvite(null);})}>{c.cancel}</button>}
      <button disabled={op.busy} onClick={()=>void op.run(async()=>setBlob(await sendSigning(locale,"evidence",{sessionId:s.id},undefined,true) as Blob))}>{c.evidence}</button>
      {deliveryEnabled&&<DeliveryPanel key={`${s.id}:${s.version}`} locale={locale} sessionId={s.id}/>}
    </article>)}{invite&&<section><p>{c.delivery}</p><label>{c.link}<textarea readOnly value={invite.url} dir="ltr"/></label><label>{c.code}<input readOnly value={invite.code} dir="ltr"/></label></section>}{blob&&<FilePreview blob={blob} locale={locale} close={()=>setBlob(null)}/>}</section>;
}
export function ClientSigning({locale:initialLocale}:{locale:Locale}){
  const [locale,setLocale]=useState(initialLocale),c=signingMessages(locale),op=useOperation(locale),token=useSyncExternalStore(subscribeInvitation,()=>invitationMemory,()=>""),[session,setSession]=useState<PublicSession|null>(null),[code,setCode]=useState(""),[challenge,setChallenge]=useState(""),[blob,setBlob]=useState<Blob|null>(null),[loadError,setLoadError]=useState("");
  useEffect(()=>{if(!token)return;let live=true;sendSigning(initialLocale,"get",{},token).then(s=>{if(live)setSession(s as PublicSession);}).catch(e=>{if(live)setLoadError(e instanceof Error?e.message:"unavailable");});return()=>{live=false;};},[token,initialLocale]);
  const refresh=async()=>setSession(await sendSigning(locale,"get",{},token) as PublicSession);
  return <main className={styles.root} lang={locale} dir={locale==="ar"?"rtl":"ltr"}><h1>{c.title}</h1><nav aria-label={locale==="ar"?"اللغة":"Langue"}><button onClick={()=>setLocale("fr")}>Français</button><button onClick={()=>setLocale("ar")}>العربية</button></nav>
    {op.feedback}{loadError&&<p role="alert">{c.errors[loadError as keyof typeof c.errors]??c.errors.unavailable}</p>}{!token?<p>{c.missing}</p>:<><button disabled={op.busy} onClick={()=>void op.run(refresh)}>{c.reload}</button>{!session?<p role="status">{c.loading}</p>:<><h2>{c.states[session.state]}</h2><p>{session.clientName}</p><p>{c.limit}</p><p>{c.expires}: <bdi>{session.expiresAt}</bdi></p>
      {session.clientVerified&&["awaiting_client","client_signed","finalization_pending","reconciliation_required","completed"].includes(session.state)&&<button disabled={op.busy} onClick={()=>void op.run(async()=>setBlob(await sendSigning(locale,"document",{},token,true) as Blob))}>{c.preview}</button>}
      {session.state==="awaiting_client"&&<><form onSubmit={e=>{e.preventDefault();void op.run(async()=>{const result=await sendSigning(locale,"verify",op.command("verify",{code}),token) as {challengeId:string;session:PublicSession};setChallenge(result.challengeId);setSession(result.session);setCode("");});}}><label>{c.code}<input inputMode="numeric" autoComplete="one-time-code" type="password" pattern="[0-9]{8}" minLength={8} maxLength={8} value={code} onChange={e=>setCode(e.target.value)} required/></label><button disabled={op.busy}>{c.verify}</button></form>
        {challenge&&<SignatureCapture locale={locale} documentLocale={session.locale} checksum={session.reviewChecksum} disabled={op.busy} onSign={value=>void op.run(async()=>{setSession(await sendSigning(locale,"client-sign",op.command("client-sign",{version:session.version,challengeId:challenge,capture:value}),token) as PublicSession);setChallenge("");})}/>}
        <button disabled={op.busy} onClick={()=>void op.run(async()=>setSession(await sendSigning(locale,"decline",op.command("decline",{version:session.version}),token) as PublicSession))}>{c.decline}</button></>}
      {["client_signed","finalization_pending","reconciliation_required"].includes(session.state)&&<button disabled={op.busy} onClick={()=>void op.run(async()=>setSession(await sendSigning(locale,"finalize",{},token) as PublicSession))}>{c.finalize}</button>}
      {session.state==="completed"&&<><p>{c.complete}</p><button disabled={op.busy} onClick={()=>void op.run(async()=>setBlob(await sendSigning(locale,"final-pdf",{},token,true) as Blob))}>{c.download}</button></>}
    </>}</>}{blob&&<FilePreview blob={blob} locale={locale} close={()=>setBlob(null)}/>}</main>;
}
