"use client";
import { useState } from "react";
import type { Locale } from "../i18n/locales";
import { formatRentalMad } from "../rentals/form";
import type { RentalOperations, Payment } from "./model";
import { kinds, methods } from "./model";
import { operationsCopy } from "./copy";
import { useOperations } from "./client";
import styles from "../rentals/workspace.module.css";
export function RentalOperationsPanel({locale,rentalId,initial,onTermsChanged}:{locale:Locale;rentalId:string;initial?:RentalOperations;onTermsChanged?:()=>void}) {
 const c=operationsCopy(locale),op=useOperations<RentalOperations>(locale,"rental",{rentalId},initial),d=op.data,[reversal,setReversal]=useState<Payment|null>(null);
 const invoke=(action:string,input:object)=>op.perform(action,{rentalId,revision:d!.revision,...input},()=>{setReversal(null);if(action==="locations")onTermsChanged?.();});
 return <section className={styles.root} dir={locale==="ar"?"rtl":"ltr"} aria-label={c.rental} aria-busy={op.busy}><h2>{c.rental}</h2>{op.feedback}<button type="button" disabled={op.busy} onClick={op.refresh}>{c.refresh}</button>
 {d&&<><p>{c.locationsHint}</p><form key={`locations:${d.revision}`} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void invoke("locations",{locations:{pickup:f.get("pickup"),returnLocation:f.get("returnLocation")}});}}><fieldset disabled={op.locked||d.state!=="brouillon"}><legend>{c.terms}</legend><div className={styles.grid}>
 <label>{c.pickup}<input name="pickup" required maxLength={400} defaultValue={d.locations?.pickup??""}/></label><label>{c.returnLocation}<input name="returnLocation" required maxLength={400} defaultValue={d.locations?.returnLocation??""}/></label></div><button>{c.save}</button></fieldset></form>
 <form key={`signer:${d.revision}`} onSubmit={e=>{e.preventDefault();void invoke("signer-select",{membershipId:new FormData(e.currentTarget).get("signer")});}}><fieldset disabled={op.locked||!["brouillon","confirme"].includes(d.state)}><legend>{c.signer}</legend><label>{c.signer}<select name="signer" defaultValue={d.signerId??""} required><option value="">{c.none}</option>{d.eligibleSigners.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>{!d.eligibleSigners.length&&<p>{c.empty}</p>}<button disabled={!d.eligibleSigners.length}>{c.assign}</button></fieldset></form>
 <dl>{([[c.paid,d.paidMinor],[c.remaining,d.remainingMinor],[c.held,d.depositHeldMinor]] as const).map(([label,value])=><div key={label}><dt>{label}</dt><dd><bdi>{formatRentalMad(BigInt(value))}</bdi></dd></div>)}</dl><p>{d.status==="paid"?c.complete:d.status==="partial"?c.partial:c.unpaid}</p>
 <p>{c.paymentHint}</p><p>{c.privacy}</p><form key={`payment:${reversal?.id??"new"}:${d.revision}`} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void invoke("payment",{payment:{kind:reversal?"reversal":f.get("kind"),amountMinor:reversal?.amountMinor??f.get("amount"),method:f.get("method"),date:f.get("date"),reference:f.get("reference"),reason:f.get("reason"),reverses:reversal?.id??null}});}}><fieldset disabled={op.locked||!d.canPay}><legend>{reversal?c.reversal:c.payment}</legend><div className={styles.grid}>
 {!reversal&&<label>{c.kind}<select name="kind">{kinds.filter(k=>k!=="reversal").map(k=><option key={k} value={k}>{c[k]}</option>)}</select></label>}
 <label>{c.amount}<input name="amount" inputMode="numeric" pattern="[1-9][0-9]{0,17}" required readOnly={!!reversal} defaultValue={reversal?.amountMinor??""} dir="ltr"/></label>
 <label>{c.method}<select name="method" defaultValue={reversal?.method??"cash"}>{methods.map(m=><option key={m} value={m}>{c[m]}</option>)}</select></label>
 <label>{c.date}<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0,10)} dir="ltr"/></label><label>{c.reference}<input name="reference" maxLength={120}/></label><label>{c.reason}<input name="reason" required={!!reversal} maxLength={400}/></label></div><button>{c.save}</button>{reversal&&<button type="button" onClick={()=>setReversal(null)}>{c.revoke}</button>}</fieldset></form>
 <h3>{c.ledger}</h3>{!d.payments.length&&<p>{c.empty}</p>}<ol>{d.payments.map(p=><li key={p.id}><strong>{c[p.kind]}</strong> · <bdi>{formatRentalMad(BigInt(p.amountMinor))}</bdi> · {c[p.method]} · <time>{p.date}</time><p><bdi>{p.reference}</bdi> {p.reason}</p>
 {d.canPay&&p.kind!=="reversal"&&!d.payments.some(x=>x.reverses===p.id)&&<button type="button" disabled={op.locked} onClick={()=>setReversal(p)}>{c.reverse}</button>}</li>)}</ol>
 </>}
 </section>;
}
