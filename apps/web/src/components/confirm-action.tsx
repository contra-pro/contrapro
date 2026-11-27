"use client";
import { useId,useRef } from "react";
import type { ReactNode } from "react";
/** Native modal owns the focus trap; cancel is focused, Escape cancels, focus returns. */
export function ConfirmAction({label,title,description,confirm,cancel,onConfirm,disabled=false,children}:{label:string;title:string;description:string;confirm:string;cancel:string;onConfirm:()=>void;disabled?:boolean;children?:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),id=useId();
 return <><button ref={trigger} type="button" disabled={disabled} onClick={()=>dialog.current?.showModal()}>{label}</button>
 <dialog ref={dialog} className="confirm-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onClose={()=>trigger.current?.focus()}>
 <h2 id={`${id}-title`}>{title}</h2><p id={`${id}-description`}>{description}</p>{children}<div className="dialog-actions"><button type="button" autoFocus onClick={()=>dialog.current?.close()}>{cancel}</button><button type="button" disabled={disabled} onClick={()=>{dialog.current?.close();onConfirm();}}>{confirm}</button></div>
 </dialog></>;
}
