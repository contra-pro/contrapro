"use client";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "../i18n/locales";
import { billingCopy, featureLabels, stateLabels } from "./copy";
import { features, type Dashboard, type Plan, type Subscription } from "./model";
import styles from "../rentals/workspace.module.css";

import { sendBilling } from "./client";
export { sendBilling } from "./client";
import { BillingHistory } from "./history-workspace";
export function useBilling<T>(locale:Locale,platform=false) {
  const c=billingCopy(locale),[data,setData]=useState<T|null>(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),lock=useRef(false),pending=useRef<{key:string;requestId:string}|null>(null);
  useEffect(()=>{let current=true;sendBilling(locale,"dashboard",{},platform).then(v=>{if(current)setData(v as T);}).catch(e=>{if(current)setMessage(e.message==="forbidden"?c.forbidden:c.error);});return()=>{current=false;};},[locale,platform,c.error,c.forbidden]);
  const run=async(action:string,input:object={})=>{
    if(lock.current)return;lock.current=true;setBusy(true);setMessage("");
    try {
      const key=JSON.stringify({action,input});if(pending.current?.key!==key)pending.current={key,requestId:crypto.randomUUID()};
      await sendBilling(locale,action,action==="dashboard"?input:{...input,requestId:pending.current.requestId},platform);
      setData(await sendBilling(locale,"dashboard",{},platform) as T);pending.current=null;setMessage(c.done);
    }catch(e){const code=e instanceof Error?e.message:"error";setMessage(code==="quota"?c.quota:code==="restricted"?c.restricted:code==="forbidden"?c.forbidden:c.error);}
    finally {lock.current=false;setBusy(false);}
  };
  return {data,message,busy,run};
}
export function SubscriptionDetails({locale,s,plans}:{locale:Locale;s:Subscription|null;plans:Plan[]}) {
  const c=billingCopy(locale),p=plans.find(p=>p.id===s?.plan_id);
  return <section className={styles.panel}><h2>{c.current}</h2>{!s?<p>{c.noSubscription}</p>:<>
    <p>{p?.name??c.empty} · {c.status}: {s.suspended?stateLabels[locale].suspended:stateLabels[locale][s.state]} · {c.revision}: {s.revision}</p>
    {s.trial_end&&<p>{c.trialEnd}: <time dateTime={s.trial_end}>{s.trial_end}</time></p>}
    {s.period_end&&<p>{c.end}: <time dateTime={s.period_end}>{s.period_end}</time></p>}
    {s.grace_end&&<p>{c.graceEnd}: <time dateTime={s.grace_end}>{s.grace_end}</time></p>}
    {s.cancel_at_end&&<p>{stateLabels[locale].cancelled} · {c.end}</p>}
    {s.pending_plan&&<p>{c.pending}: <bdi>{plans.find(p=>p.id===s.pending_plan)?.name??s.pending_plan}</bdi></p>}
  </>}</section>;
}
export function UsageDetails({locale,data}:{locale:Locale;data:Dashboard}) {
  const c=billingCopy(locale),plan=data.plans.find(p=>p.id===data.subscription?.plan_id);
  return <section className={styles.panel}><h2>{c.usage}</h2><ul>{features.filter(f=>f!=="sheets").map(f=>{
    const u=data.usage.find(u=>u.metric===f),limit=plan?.limits[f],used=BigInt(u?.used??"0"),reserved=BigInt(u?.reserved??"0"),remaining=limit===undefined||limit===null?null:BigInt(limit)-used-reserved;
    return <li key={f}><strong>{featureLabels[locale][f]}</strong> · {c.used}: {used.toString()} · {c.reserved}: {reserved.toString()} · {c.remaining}: {!plan?c.empty:remaining===null?c.unlimited:(remaining<0n?0n:remaining).toString()} · {["vehicles","team","templates","storage"].includes(f)?c.currentCount:c.period}</li>;
  })}</ul></section>;
}
export function PlanDetails({locale,plan}:{locale:Locale;plan:Plan}) {const c=billingCopy(locale);return <>
  <h3>{plan.name} · {c.version} {plan.version}{plan.archived&&` · ${c.archived}`}</h3><p lang={locale}>{locale==="ar"?plan.description_ar:plan.description_fr}</p>
  <p><bdi>{plan.amount_minor} {plan.currency}</bdi> · {c.amount} · {plan.interval==="year"?c.year:c.month}</p>
  {plan.trial_days!==null&&<p>{c.trialDays}: {plan.trial_days}</p>}
  <ul>{plan.features.map(f=><li key={f}>{featureLabels[locale][f]}{plan.limits[f]!=null?` · ${plan.limits[f]}`:` · ${c.unlimited}`}</li>)}</ul>
</>;}
export function AgencyBilling({locale}:{locale:Locale}) {
  const c=billingCopy(locale),op=useBilling<Dashboard>(locale),data=op.data,s=data?.subscription??null;
  const download=async(id:string)=>{try{const record=await sendBilling(locale,"document",{id});const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=`contratpro-internal-${id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{void op.run("dashboard");}};
  return <section className={styles.root} dir={locale==="ar"?"rtl":"ltr"} aria-busy={op.busy} aria-label={c.title}>
    <p role="status" aria-live="polite">{op.message||(!data?c.loading:"")}</p><button disabled={op.busy} onClick={()=>void op.run("dashboard")}>{c.refresh}</button><p>{c.policy}</p>
    {data&&<>{data.a4Enabled&&<BillingHistory locale={locale}/>}<SubscriptionDetails locale={locale} s={s} plans={data.plans}/><UsageDetails locale={locale} data={data}/>
    {s&&<div className={styles.actions}><button disabled={op.busy||s.cancel_at_end} onClick={()=>void op.run("cancel",{revision:s.revision})}>{c.cancel}</button>{s.plan_id&&<button disabled={op.busy} onClick={()=>void op.run("renew",{planId:s.plan_id,revision:s.revision})}>{c.renew}</button>}</div>}
    <section className={styles.panel}><h2>{c.plans}</h2>{data.plans.filter(p=>!p.archived).length===0&&<p>{c.empty}</p>}{data.plans.filter(p=>!p.archived).map(p=><article key={p.id}><PlanDetails locale={locale} plan={p}/><div className={styles.actions}>{!s&&p.trial_days!==null&&<button disabled={op.busy} onClick={()=>void op.run("trial",{planId:p.id})}>{c.trial}</button>}<button disabled={op.busy} onClick={()=>void op.run(s?"change":"request",{planId:p.id,...(s?{revision:s.revision}:{})})}>{s?c.change:c.request}</button></div></article>)}</section>
    <form key={JSON.stringify(data.profile)} className={styles.panel} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void op.run("profile",{name:f.get("name"),address:f.get("address"),taxId:f.get("taxId")});}}><h2>{c.profile}</h2><label>{c.name}<input name="name" maxLength={160} defaultValue={data.profile.name??""}/></label><label>{c.address}<textarea name="address" maxLength={1000} defaultValue={data.profile.address??""}/></label><label>{c.taxId}<input name="taxId" maxLength={80} defaultValue={data.profile.taxId??""}/></label><button disabled={op.busy}>{c.save}</button></form>
    <section className={styles.panel}><h2>{c.history}</h2><p>{c.notice}</p>{data.payments.length===0&&<p>{c.empty}</p>}<ul>{data.payments.map(p=><li key={p.id}><bdi>{p.invoice_reference}</bdi><p><bdi>{p.amount_minor} {p.currency}</bdi> · {stateLabels[locale][p.state]} · {stateLabels[locale][p.source]}</p><p><time>{p.period_start}</time> — <time>{p.period_end}</time></p>{p.reference&&<p>{c.reference}: <bdi>{p.reference}</bdi></p>}{p.source==="manual"&&p.state==="pending"&&!p.reference&&<form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void op.run("reference",{paymentId:p.id,reference:f.get("reference")});}}><label>{c.reference}<input name="reference" required minLength={3} maxLength={160}/></label><button disabled={op.busy}>{c.save}</button></form>}<button disabled={op.busy} onClick={()=>void download(p.id)}>{c.download}</button></li>)}</ul></section>
    </>}
  </section>;
}
