"use client";
import { createContext,useContext,useRef, useState, type FormEvent, type ReactNode,type InputHTMLAttributes } from "react";
import type { Locale } from "../i18n/locales";
import { authMessages } from "../i18n/auth";
import type { AuthMode } from "./auth-view";
import {registrationInput,type LegalRelease} from '../registration/model';import {registrationCopy} from '../registration/copy';
const Validation=createContext<Record<string,string>>({});
export function AuthField({name,label,hint,...props}:InputHTMLAttributes<HTMLInputElement>&{name:string;label:string;hint?:string}){
 const errors=useContext(Validation),id=`auth-${name==="confirmPassword"?"confirm":name}`,error=errors[name],[visible,setVisible]=useState(false),password=props.type==='password',ar=props.lang==='ar';
 return <div className="auth-field"><label htmlFor={id}>{label}</label><div className={password?'auth-password-control':'auth-input-control'}><input {...props} type={password&&visible?'text':props.type} name={name} id={id} aria-invalid={!!error||undefined} aria-describedby={[hint?`${id}-hint`:"",error?`${id}-error`:""].filter(Boolean).join(" ")||undefined}/>{password&&<button className="auth-password-toggle" type="button" disabled={props.disabled} aria-controls={id} aria-pressed={visible} aria-label={visible?(ar?'إخفاء كلمة المرور':'Masquer le mot de passe'):(ar?'إظهار كلمة المرور':'Afficher le mot de passe')} onClick={()=>setVisible(v=>!v)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{visible&&<path d="m3 3 18 18"/>}</svg></button>}</div>{hint&&<p id={`${id}-hint`} className="field-hint">{hint}</p>}{error&&<p id={`${id}-error`} className="field-error">{error}</p>}</div>;
}

/** Native POST works without JavaScript; enhancement adds localized validation and submission feedback. */
export function AuthForm({ locale, mode, action, configured, children, label,legalRelease=null }: {
  locale: Locale; mode: AuthMode; action: string; configured: boolean; children?: ReactNode; label: string;legalRelease?:LegalRelease|null;
}) {
  const copy = authMessages(locale), flight = useRef(false), feedback = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false), [errors, setErrors] = useState<Record<string,string>>({});
  function submit(event: FormEvent<HTMLFormElement>) {
    if (flight.current || !configured) { event.preventDefault(); return; }
    const data = new FormData(event.currentTarget), email = String(data.get("email") ?? "").trim(), password = String(data.get("password") ?? "");
    const fresh = mode === "sign-up" || mode === "reset-password";
    const next:Record<string,string>={};
    if(mode!=="reset-password"&&(!email||email.length>320||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))next.email=copy["invalid-email"];
    if(mode!=="forgot-password"&&(password.length<(fresh?12:1)||password.length>128))next.password=copy["invalid-password"];
    if(fresh&&password!==data.get("confirmPassword"))next.confirmPassword=copy["password-mismatch"];
    if(mode==='sign-up'){const parsed=registrationInput(Object.fromEntries(data),legalRelease);if(!parsed.ok){const c=registrationCopy(locale);for(const [field,code]of Object.entries(parsed.errors))next[field]=code==='required'?c.required:code==='legal-unavailable'?c.legalUnavailable:c.invalid;}}
    if(Object.keys(next).length){event.preventDefault();setErrors(next);requestAnimationFrame(()=>feedback.current?.focus());return;}
    flight.current = true; setErrors({}); setPending(true);
    // Do not disable named inputs: the browser still needs them for its POST body.
  }
  return <Validation.Provider value={errors}><form className="auth-forms" action={action} method="post" onSubmit={submit} noValidate aria-busy={pending}>
    {children}
    <div ref={feedback} tabIndex={-1} role={Object.keys(errors).length?"alert":"status"} aria-live="polite">{pending?copy.busy:Object.entries(errors).length>0&&<ul>{Object.entries(errors).map(([name,message])=><li key={name}><a href={`#auth-${name==="confirmPassword"?"confirm":name}`}>{message}</a></li>)}</ul>}</div>
    <button type="submit" disabled={!configured || pending}>{pending ? copy.busy : label}</button>
  </form></Validation.Provider>;
}
