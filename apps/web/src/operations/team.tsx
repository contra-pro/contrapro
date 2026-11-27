"use client";
import { useState } from "react";
import type { Locale } from "../i18n/locales";
import type { Member, Team } from "./model";
import { operationsCopy, permissionLabel } from "./copy";
import { useOperations } from "./client";
import { deliveryCopy } from "../delivery/copy";
import type { DeliveryState } from "../delivery/model";
import styles from "../rentals/workspace.module.css";
export function TeamWorkspace({locale,initial,deliveryEnabled=false}:{locale:Locale;initial?:Team;deliveryEnabled?:boolean}) {
 const c=operationsCopy(locale),op=useOperations<Team>(locale,"team",{},initial),[link,setLink]=useState(""),[selectedRole,setSelectedRole]=useState("");
 const data=op.data,role=data?.roles.find(r=>r.id===selectedRole);
 const memberAction=(m:Member,action:string,input:object)=>op.perform(action,{membershipId:m.id,revision:m.revision,...input});
 return <section className={styles.root} dir={locale==="ar"?"rtl":"ltr"} aria-busy={op.busy}>{op.feedback}<button type="button" disabled={op.busy} onClick={op.refresh}>{c.refresh}</button><p>{c.ownerSafety}</p>
 {data&&<><h2>{c.members}</h2>{!data.members.length&&<p>{c.empty}</p>}<ul>{data.members.map(m=><li key={m.id}><strong>{m.signerName||m.email||m.userId}</strong><p>{c[m.state]} · {m.eligible?c.eligible:c.ineligible}</p><p>{data.roles.filter(r=>m.roles.includes(r.id)).map(r=>r.name).join(" · ")}</p>
 {data.canManage&&<><fieldset disabled={op.locked}><legend>{c.role}</legend><select aria-label={c.role} defaultValue="" onChange={e=>{if(e.target.value)void memberAction(m,"member-role",{roleId:e.target.value});}}><option value="">—</option>{data.roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
 <button type="button" onClick={()=>void memberAction(m,"member-state",{state:m.state==="active"?"revoked":"active"})}>{m.state==="active"?c.deactivate:c.reactivate}</button></fieldset>
 <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void memberAction(m,"signer-grant",{enabled:!m.signer,name:String(f.get("name"))});}}><fieldset disabled={op.locked||m.state!=="active"}><legend>{c.signer}</legend><label>{c.signerName}<input name="name" required maxLength={200} defaultValue={m.signerName}/></label><button>{m.signer?c.ungrant:c.grant}</button></fieldset></form></>}
 </li>)}</ul>{data.canManage&&<>
 <form className={styles.panel} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void op.perform("invite",{email:f.get("email"),roleId:f.get("roleId")},v=>setLink(String((v as {url:string}).url)));}}><fieldset disabled={op.locked}><legend>{c.invite}</legend><label>{c.email}<input name="email" type="email" required maxLength={254} dir="ltr"/></label><label>{c.role}<select name="roleId" required>{data.roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><button>{c.invite}</button></fieldset></form>
 {link&&<div className={styles.panel}><p>{c.notSent}</p><label>{c.link}<input readOnly value={link} dir="ltr" onFocus={e=>e.target.select()}/></label></div>}
 <h2>{c.invitations}</h2>{!data.invitations.length&&<p>{c.empty}</p>}<ul>{data.invitations.map(i=><li key={i.id}><bdi>{i.email}</bdi> · {c[i.state as "pending"]??i.state} · <time>{i.expiresAt}</time>
 {i.deliveryState&&<p>{locale==="ar"?"حالة البريد":"État de l’e-mail"} : {deliveryCopy(locale).states[i.deliveryState as DeliveryState]??c.unavailable}</p>}
 {i.state==="pending"&&<><button type="button" disabled={op.locked} onClick={()=>void op.perform("invite-revoke",{invitationId:i.id})}>{c.revoke}</button>
 {deliveryEnabled&&!i.deliveryState&&<button type="button" disabled={op.locked} onClick={()=>void op.perform("invite-email",{invitationId:i.id})}>{locale==="ar"?"إضافة البريد إلى طابور الإرسال":"Mettre l’e-mail en file d’envoi"}</button>}</>}</li>)}</ul>
 <form className={styles.panel} key={role?.id??"new"} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void op.perform("role-save",{roleId:role?.id??crypto.randomUUID(),key:f.get("key"),name:f.get("name"),permissions:f.getAll("permission")});}}><fieldset disabled={op.locked}><legend>{c.newRole}</legend>
 <label>{c.role}<select value={selectedRole} onChange={e=>setSelectedRole(e.target.value)}><option value="">{c.newRole}</option>{data.roles.filter(r=>r.key!=="owner").map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
 <label>{c.roleKey}<input name="key" required pattern={"[a-z][a-z0-9_.\\-]{0,63}"} maxLength={64} readOnly={!!role} defaultValue={role?.key??""} dir="ltr"/></label><label>{c.name}<input name="name" required maxLength={100} defaultValue={role?.name??""}/></label>
 <fieldset><legend>{c.permissions}</legend>{data.permissions.map(p=><label key={p}><input type="checkbox" name="permission" value={p} defaultChecked={role?.permissions.includes(p)}/>{permissionLabel(locale,p)}</label>)}</fieldset><button>{c.save}</button></fieldset></form>
 </>}</>}
 </section>;
}
