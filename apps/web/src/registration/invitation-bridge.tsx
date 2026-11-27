"use client";
import {useRef,useState,useSyncExternalStore} from 'react';import {useRouter} from 'next/navigation';import type {Locale} from '../i18n/locales';import {registrationCopy} from './copy';import {invitationStore} from '../operations/accept';
export function InvitationBridge({locale,pending}:{locale:Locale;pending:boolean}){
 const c=registrationCopy(locale),router=useRouter(),[store]=useState(()=>invitationStore()),token=useSyncExternalStore(store.subscribe,store.get,()=>null),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(''),flight=useRef(false);
 async function proceed(){if(flight.current)return;flight.current=true;setBusy(true);try{if(token){const response=await fetch(`/${locale}/auth/invitation`,{method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});const r:unknown=await response.json();if(!response.ok||!r||typeof r!=='object'||!('ok'in r)||r.ok!==true)throw Error();}else if(!pending)throw Error();router.push(`/${locale}/sign-in`);}catch{flight.current=false;setBusy(false);setFeedback(c.inviteError);}}
 return <section aria-busy={busy}><p>{c.invited}</p><button type="button" disabled={busy||!pending&&!token} onClick={()=>void proceed()}>{busy?c.busy:c.inviteContinue}</button><p role="status">{feedback}</p></section>;
}
