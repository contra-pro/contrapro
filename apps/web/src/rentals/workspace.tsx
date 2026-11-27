"use client";
import Link from "next/link";
import {visibleRentals} from "./list-presentation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Locale } from "../i18n/locales";
import { isRecord, isUuid } from "../../../../packages/application/src/agency-management";
import { validateRentalCreateInput } from "../../../../packages/domain/src/rentals/create-input";
import { parseRentalTimestamp } from "../../../../packages/domain/src/rentals/timestamps";
import type { RentalChoice, RentalPage, RentalView } from "./data";
import { formatRentalMad } from "./form";
import { rentalMessages } from "./messages";
import styles from "./workspace.module.css";
import { RentalDocuments, RentalTemplateChoice } from "../documents/workspace";
import { DraftPreview } from "../documents/draft-workspace";
import { SheetsDashboard } from "../sheets/workspace";
import { sendOperation } from "../operations/client";
import { operationsCopy } from "../operations/copy";
import { RentalOperationsPanel } from "../operations/rental";
import { ConfirmAction } from "../components/confirm-action";
import { UnsavedChanges } from "../components/unsaved-changes";
import { LoadingState,ErrorState,StatusBadge,Pagination } from "../components/ui";
import { dateTime,money } from "../i18n/presentation";

export async function sendRental(locale: Locale, body: object) {
  const response = await fetch(`/${locale}/app/rental-action`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result: unknown = await response.json();
  if (response.redirected || !isRecord(result)) throw Error("uncertain");
  if (!response.ok || result.ok !== true) throw Error(typeof result.code === "string" && ["quota", "restricted", "invalid", "invalid-input", "forbidden", "conflict", "not-found"].includes(result.code) ? result.code : "uncertain");
  return result.value as unknown;
}
type Sender = typeof sendRental;
function useFeedback(locale: Locale) {
  const [message, setMessage] = useState(""); const ref = useRef<HTMLParagraphElement>(null); const copy = rentalMessages(locale);
  useEffect(() => { if (message) ref.current?.focus(); }, [message]);
  const failure = (error: unknown) => { const code = error instanceof Error ? error.message : "uncertain";
    setMessage(code === "quota" ? copy.quota : code === "restricted" ? copy.restricted : code === "invalid" || code === "invalid-input" ? copy.invalid : code === "conflict" ? copy.conflict : code === "forbidden" ? copy.forbidden : copy.uncertain); };
  return { message, setMessage, failure, element: <p ref={ref} tabIndex={-1} role="status" aria-live="polite">{message}</p> };
}

export function RentalListScreen({ locale, send = sendRental }: { locale: Locale; send?: Sender }) {
 const copy=rentalMessages(locale),ar=locale==='ar';const [page,setPage]=useState(1),[value,setValue]=useState<RentalPage|null>(null),[failed,setFailed]=useState(false),[query,setQuery]=useState(''),[state,setState]=useState(''),[sort,setSort]=useState('');
 useEffect(()=>{let alive=true;send(locale,{action:'list',page}).then(data=>{if(alive){setValue(data as RentalPage);setFailed(false);}}).catch(()=>{if(alive)setFailed(true);});return()=>{alive=false;};},[locale,page,send]);
 const items=visibleRentals(value?.items??[],query,state,sort);
 return <div className={styles.root} dir={ar?'rtl':'ltr'}><div className="section-heading"><h2>{copy.title}</h2><Link className="dashboard-primary-action" href={`/${locale}/app/rentals/new`}>{copy.create}</Link></div>
 {failed?<ErrorState title={copy.unavailable}><button type="button" onClick={()=>window.location.reload()}>{copy.reload}</button></ErrorState>:!value?<LoadingState label={copy.loading}/>:<>
 <div className="v41-list-toolbar"><label>{ar?'بحث في رقم العقد · هذه الصفحة':'Référence du contrat · cette page'}<input type="search" value={query} maxLength={100} onChange={e=>setQuery(e.target.value)}/></label><label>{ar?'الحالة · هذه الصفحة':'État · cette page'}<select value={state} onChange={e=>setState(e.target.value)}><option value="">{ar?'كل الحالات':'Tous les états'}</option>{Object.entries(copy.states).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>{ar?'الترتيب · هذه الصفحة':'Trier · cette page'}<select value={sort} onChange={e=>setSort(e.target.value)}><option value="">{ar?'ترتيب الخادم':'Ordre du serveur'}</option><option value="start-asc">{ar?'التسليم تصاعدياً':'Départ croissant'}</option><option value="start-desc">{ar?'التسليم تنازلياً':'Départ décroissant'}</option><option value="reference">{ar?'رقم العقد':'Référence'}</option></select></label><button type="button" onClick={()=>{setQuery('');setState('');setSort('');}}>{ar?'إعادة الضبط':'Réinitialiser'}</button></div>
 <p>{value.total} · {copy.page} {page} · {items.length}/{value.items.length} {ar?'في الصفحة الحالية؛ الفلاتر لا تبحث في كل الوكالة.':'sur cette page ; les filtres ne recherchent pas dans toute l’agence.'}</p>
 {!items.length?<p role="status">{copy.empty}</p>:<div className="table-region" role="region" tabIndex={0} aria-label={copy.title}><table><caption>{copy.title}</caption><thead><tr><th scope="col">{ar?'العقد':'Contrat'}</th><th scope="col">{ar?'الحالة':'État'}</th><th scope="col">{copy.start}</th><th scope="col">{copy.end}</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><th scope="row"><Link href={`/${locale}/app/rentals/${item.id}`}><bdi>{item.contract_number??copy.draft}</bdi></Link></th><td><StatusBadge tone={item.state==='termine'?'success':item.state==='annule'?'neutral':'warning'}>{copy.states[item.state]}</StatusBadge></td><td><bdi>{dateTime(locale,item.starts_at)}</bdi></td><td><bdi>{dateTime(locale,item.ends_at)}</bdi></td></tr>)}</tbody></table></div>}
 <Pagination page={page} total={value.total} previous={copy.previous} next={copy.next} label={copy.page} onPage={p=>{setValue(null);setPage(p);}}/></>}
 </div>;
}

function Choices({ locale, kind, label, value, onChange, send, disabled = false, optional = false }: {
  locale: Locale; kind: "client" | "vehicle"; label: string; value: string; onChange: (id: string) => void; send: Sender; disabled?: boolean; optional?: boolean;
}) {
  const copy = rentalMessages(locale), id = useId(); const [search, setSearch] = useState(""); const [query, setQuery] = useState(""); const [page, setPage] = useState(1);
  const [choices, setChoices] = useState<{ items: RentalChoice[]; total: number }>({ items: [], total: 0 }); const [error, setError] = useState(false);
  const [selected, setSelected] = useState<RentalChoice | null>(null);
  useEffect(() => { let alive = true; send(locale, { action: "choices", kind, search: query, page }).then(data => {
    if (alive) { setChoices(data as typeof choices); setError(false); }
  }).catch(() => { if (alive) setError(true); }); return () => { alive = false; }; }, [locale, kind, query, page, send]);
  const selectedChoice = selected ?? (value ? { id: value, label: value } : null);
  const items = selectedChoice && !choices.items.some(item => item.id === selectedChoice.id) ? [selectedChoice, ...choices.items] : choices.items;
  return <div className={styles.panel}>
    <label htmlFor={`${id}-search`}>{copy.search} · {label}<input id={`${id}-search`} value={search} maxLength={100} disabled={disabled} onChange={e => setSearch(e.target.value)} /></label>
    <button type="button" disabled={disabled} onClick={() => { setPage(1); setQuery(search); }}>{copy.search}</button>
    <label htmlFor={id}>{label}<select id={id} value={value} required={!optional} disabled={disabled} onChange={e => { onChange(e.target.value); setSelected(items.find(item => item.id === e.target.value) ?? null); }}>
      <option value="">{optional ? copy.none : copy.choose}</option>{items.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    {error && <p role="alert">{copy.unavailable}</p>}<div className={styles.actions}>
      <button type="button" disabled={disabled || page === 1} onClick={() => setPage(page - 1)}>{copy.previous}</button>
      <button type="button" disabled={disabled || page >= 10000 || page * 20 >= choices.total} onClick={() => setPage(page + 1)}>{copy.next}</button></div>
  </div>;
}
function amount(raw: string): number | null {
  if (!/^(0|[1-9][0-9]{0,10})([.,][0-9]{1,2})?$/.test(raw)) return null;
  const [whole, fraction = ""] = raw.split(/[.,]/); const minor = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"));
  return minor <= 1000000000000n ? Number(minor) : null;
}
function madInput(minor: string) { return `${BigInt(minor) / 100n}.${(BigInt(minor) % 100n).toString().padStart(2, "0")}`; }
export function RentalEditor({ locale, initial, send = sendRental, onSaved, documentsEnabled = false, a1Enabled = false,a2Enabled=false }: { locale: Locale; initial?: RentalView; send?: Sender; onSaved?: () => void; documentsEnabled?: boolean; a1Enabled?: boolean;a2Enabled?:boolean }) {
  const copy = rentalMessages(locale), id = useId(), feedback = useFeedback(locale); const busy = useRef(false);
  const [pending, setPending] = useState(false); const [locked, setLocked] = useState(false); const [retryAllowed, setRetryAllowed] = useState(false); const [created, setCreated] = useState<string | null>(null);
  const [clientId, setClient] = useState(initial?.client_id ?? ""), [vehicleId, setVehicle] = useState(initial?.vehicle_id ?? "");
  const [start, setStart] = useState(initial?.starts_at ?? ""), [end, setEnd] = useState(initial?.ends_at ?? "");
  const [rate, setRate] = useState(initial ? madInput(initial.daily_rate_minor) : ""), [deposit, setDeposit] = useState(initial ? madInput(initial.deposit_minor) : "0");
  const [pickup,setPickup]=useState(""),[returnLocation,setReturnLocation]=useState("");const a1Copy=operationsCopy(locale);
  const attempt = useRef<object | null>(null); const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const data = { clientId, vehicleId, start, end, dailyRateMinor: amount(rate), depositMinor: amount(deposit) };
  const review = validateRentalCreateInput(data);
  const dirty=!created&&(pending||locked||clientId!==(initial?.client_id??"")||vehicleId!==(initial?.vehicle_id??"")||start!==(initial?.starts_at??"")||end!==(initial?.ends_at??"")||rate!==(initial?madInput(initial.daily_rate_minor):"")||deposit!==(initial?madInput(initial.deposit_minor):"0")||!!pickup||!!returnLocation);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy.current || created || (locked && (!!initial || !retryAllowed))) return;
    if (!attempt.current) {
      if (!review.ok) { feedback.setMessage(copy.invalid); return; }
      if(a1Enabled&&!initial&&(!pickup.trim()||!returnLocation.trim())){feedback.setMessage(copy.invalid);return;}
      attempt.current = a1Enabled&&!initial?{action:"rental-create",requestId:crypto.randomUUID(),details:data,locations:{pickup,returnLocation}}:{ action: initial ? "update" : "create", requestId: crypto.randomUUID(), data: JSON.stringify(data),
        ...(initial ? { id: initial.id, version: initial.version } : {}) };
    }
    busy.current = true; setPending(true);
    try { const savedAttempt=attempt.current as {requestId:string;details:unknown;locations:unknown};
      const result = a1Enabled&&!initial?await sendOperation(locale,"rental-create",{requestId:savedAttempt.requestId,details:savedAttempt.details,locations:savedAttempt.locations}):await send(locale, attempt.current);
      if (!alive.current) return;
      if (!isRecord(result) || !isUuid(result.id)) throw Error("uncertain");
      setCreated(result.id); setLocked(true); feedback.setMessage(copy.saved);
      onSaved?.();
    } catch (error) {
      if (!alive.current) return;
      feedback.failure(error);
      const code = error instanceof Error ? error.message : "uncertain";
      if (["invalid", "invalid-input"].includes(code)) attempt.current = null; else { setLocked(true); setRetryAllowed(!["conflict", "forbidden", "not-found"].includes(code)); }
    } finally { busy.current = false; if (alive.current) setPending(false); }
  }
  return <section><form onSubmit={submit} noValidate aria-busy={pending} dir={locale === "ar" ? "rtl" : "ltr"}>
    <UnsavedChanges when={dirty} locale={locale}/>
    <p>{locale==="ar"?"احفظ المسودة أولاً، ثم اختر النموذج وراجع ملف PDF قبل التأكيد. الحفظ لا يعني إصدار العقد أو توقيعه.":"Enregistrez d’abord le brouillon, puis choisissez le modèle et vérifiez le PDF avant confirmation. Enregistrer ne signifie ni émettre ni signer le contrat."}</p>
    <ol className="workflow-steps" aria-label={locale==="ar"?"مراحل العقد":"Étapes du contrat"}>{(locale==="ar"?["المسودة","النموذج والمعاينة","التأكيد","الإصدار والتوقيع"]:["Brouillon","Modèle et aperçu","Confirmation","Émission et signature"]).map((step,i)=><li key={step} aria-current={i===0?"step":undefined}>{step}</li>)}</ol>
    {!initial && <div className={styles.grid}><Choices locale={locale} kind="client" label={copy.client} value={clientId} onChange={setClient} send={send} disabled={locked || pending} />
      <Choices locale={locale} kind="vehicle" label={copy.vehicle} value={vehicleId} onChange={setVehicle} send={send} disabled={locked || pending} /></div>}
    <p id={`${id}-hint`}>{copy.periodHint}</p>
    {a1Enabled&&!initial&&<fieldset disabled={locked||pending} className={styles.grid}><legend>{a1Copy.terms}</legend><label>{a1Copy.pickup}<input required maxLength={400} value={pickup} onChange={e=>setPickup(e.target.value)}/></label><label>{a1Copy.returnLocation}<input required maxLength={400} value={returnLocation} onChange={e=>setReturnLocation(e.target.value)}/></label></fieldset>}
    <fieldset disabled={locked || pending} className={styles.grid} aria-describedby={`${id}-hint`}>
      <legend>{locale==="ar"?"مدة الكراء والتسعير":"Période et tarification"}</legend>
      {([["start", copy.start, start, setStart], ["end", copy.end, end, setEnd], ["rate", copy.rate, rate, setRate], ["deposit", copy.deposit, deposit, setDeposit]] as const).map(([key, label, value, setter]) =>
        <label key={key} htmlFor={`${id}-${key}`}>{label}<input id={`${id}-${key}`} dir="ltr" value={value} required maxLength={40} aria-invalid={feedback.message === copy.invalid && !review.ok || undefined}
          aria-describedby={`${id}-hint`} onChange={e => setter(e.target.value)} /></label>)}
    </fieldset>
    {review.ok && <p>{copy.days}: {review.value.billableDays} · {copy.total}: {formatRentalMad(review.value.rentalTotalMinor)}</p>}
    {feedback.element}
    {created ? <Link href={`/${locale}/app/rentals/${created}`}>{copy.reload}</Link> : <button type="submit" disabled={pending || (locked && (!!initial || !retryAllowed))}>{pending ? copy.pending : locked && retryAllowed ? copy.retry : initial ? copy.update : copy.save}</button>}
    {locked && initial && <button type="button" onClick={() => window.location.reload()}>{copy.reload}</button>}
  </form>{documentsEnabled && !(initial&&a2Enabled) && <RentalTemplateChoice locale={locale} rentalId={initial?.id??created} />}</section>;
}

export function RentalDetailScreen({ locale, id, send = sendRental, documentsEnabled = false, signingEnabled=false,deliveryEnabled=false,sheetsEnabled=false,a1Enabled=false,a2Enabled=false }: { locale: Locale; id: string; send?: Sender; documentsEnabled?: boolean; signingEnabled?:boolean;deliveryEnabled?:boolean;sheetsEnabled?:boolean;a1Enabled?:boolean;a2Enabled?:boolean }) {
  const copy = rentalMessages(locale), feedback = useFeedback(locale); const [rental, setRental] = useState<RentalView | null>(null);
  const [generation, reload] = useState(0), [failed, setFailed] = useState(false), [pending, setPending] = useState(false), [blocked, setBlocked] = useState(false);
  const [approved, approve] = useState(false), [returned, returnVehicle] = useState(false), [end, setEnd] = useState(""), [driver, setDriver] = useState("");
  const [previewReady,setPreviewReady]=useState(false);
  const [document, setDocument] = useState<unknown>(undefined); const flight = useRef(false); const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { let active = true; send(locale, { action: "detail", id }).then(value => { if (active) { setRental(value as RentalView); setDriver((value as RentalView).secondaryClientId ?? ""); setFailed(false); } }).catch(() => { if (active) setFailed(true); }); return () => { active = false; }; }, [locale, id, send, generation]);
  async function mutate(action: string) {
    if (!rental || flight.current || blocked || !approved) return;
    if (action === "extend") { try { if (parseRentalTimestamp(end) <= parseRentalTimestamp(rental.ends_at)) throw Error(); } catch { feedback.setMessage(copy.invalid); return; } }
    flight.current = true; setPending(true);
    try { const value = await send(locale, { action, id, version: rental.version, requestId: crypto.randomUUID(),
      ...(action === "complete" ? { returnConfirmed: returned } : action === "extend" ? { end } : action === "driver" ? { clientId: driver || null } : {}) });
      if (!alive.current) return;
      setRental(value as RentalView); setDocument(undefined); approve(false); returnVehicle(false); feedback.setMessage(copy.saved);
    } catch (error) { if (alive.current) { feedback.failure(error); setBlocked(true); } }
    finally { flight.current = false; if (alive.current) setPending(false); }
  }
  if (failed) return <ErrorState title={copy.unavailable}><button type="button" onClick={()=>{setFailed(false);reload(v=>v+1);}}>{copy.reload}</button></ErrorState>;
  if (!rental) return <LoadingState label={copy.loading}/>;
  const draft = rental.state === "brouillon", reserved = ["confirme", "en_cours"].includes(rental.state);
  return <div className={styles.root} dir={locale === "ar" ? "rtl" : "ltr"} aria-busy={pending}><Link href={`/${locale}/app/rentals`}>{copy.back}</Link>
    <h2><bdi>{rental.contract_number ?? copy.draft}</bdi></h2><p><StatusBadge tone={rental.state==="termine"?"success":rental.state==="brouillon"?"neutral":"warning"}>{copy.states[rental.state]}</StatusBadge></p>
    <nav className="detail-navigation" aria-label={locale==="ar"?"أقسام العقد":"Sections du contrat"}><a href="#rental-summary">{locale==="ar"?"ملخص":"Résumé"}</a><a href="#rental-workflow">{locale==="ar"?"الإجراءات":"Actions"}</a><a href="#rental-documents">{copy.document}</a></nav>
    <dl id="rental-summary"><dt>{copy.start}</dt><dd><bdi>{dateTime(locale,rental.starts_at)}</bdi></dd><dt>{copy.end}</dt><dd><bdi>{dateTime(locale,rental.ends_at)}</bdi></dd>
      <dt>{copy.client}</dt><dd><Link href={`/${locale}/app/clients/${rental.client_id}`}>{locale==="ar"?"فتح ملف العميل":"Ouvrir la fiche client"}</Link></dd>
      <dt>{copy.vehicle}</dt><dd><Link href={`/${locale}/app/vehicles/${rental.vehicle_id}`}>{locale==="ar"?"فتح ملف المركبة":"Ouvrir la fiche véhicule"}</Link></dd>
      <dt>{copy.days}</dt><dd>{rental.billable_days}</dd><dt>{copy.total}</dt><dd><bdi>{money(locale,rental.total_minor)}</bdi></dd><dt>{copy.deposit}</dt><dd><bdi>{money(locale,rental.deposit_minor)}</bdi></dd></dl>
    <p>{copy.immutable}</p>{rental.physicalUnavailable && <p role="alert">{copy.physical}</p>}
    {a1Enabled&&<RentalOperationsPanel key={`operations:${id}:${rental.version}`} locale={locale} rentalId={id} onTermsChanged={()=>{setRental(null);reload(v=>v+1);}}/>}
    {draft && !blocked && <RentalEditor key={`${id}:${rental.version}`} locale={locale} initial={rental} send={send} documentsEnabled={documentsEnabled} a2Enabled={a2Enabled} onSaved={() => { setRental(null); reload(value => value + 1); }} />}
    {draft && <Choices locale={locale} kind="client" optional label={copy.secondary} value={driver} onChange={setDriver} send={send} disabled={blocked || pending} />}
    {documentsEnabled && a2Enabled && draft && <DraftPreview key={`preview:${id}:${rental.version}`} locale={locale} rentalId={id} onReady={setPreviewReady}/>}
    <div id="rental-workflow"/>{(draft || reserved) && <section className={styles.panel}>
      <label className={styles.check}><input type="checkbox" checked={approved} onChange={e => approve(e.target.checked)} disabled={blocked || pending} />{copy.confirmAction}</label>
      <div className={styles.actions}>{draft && <><button disabled={!approved || pending || blocked} onClick={() => void mutate("driver")}>{copy.driver}</button>
        <ConfirmAction label={copy.confirm} title={copy.confirm} description={copy.immutable} confirm={locale==="ar"?"تأكيد العملية":"Confirmer l’opération"} cancel={locale==="ar"?"رجوع":"Revenir"} disabled={!approved||pending||blocked||documentsEnabled&&a2Enabled&&!previewReady} onConfirm={()=>void mutate("confirm")}/></>}
        {rental.state === "confirme" && <ConfirmAction label={copy.handover} title={copy.handover} description={copy.confirmAction} confirm={locale==="ar"?"تأكيد العملية":"Confirmer l’opération"} cancel={locale==="ar"?"رجوع":"Revenir"} disabled={!approved||pending||blocked} onConfirm={()=>void mutate("start")}/>}
        {rental.state !== "en_cours" && <ConfirmAction label={copy.cancel} title={copy.cancel} description={copy.immutable} confirm={locale==="ar"?"تأكيد الإلغاء":"Confirmer l’annulation"} cancel={locale==="ar"?"رجوع":"Revenir"} disabled={!approved||pending||blocked} onConfirm={()=>void mutate("cancel")}/>}</div>
      {reserved && <><label>{copy.end}<input dir="ltr" value={end} maxLength={32} disabled={pending || blocked} onChange={e => setEnd(e.target.value)} /></label><button disabled={!approved || pending || blocked} onClick={() => void mutate("extend")}>{copy.extend}</button></>}
      {rental.state === "en_cours" && <><label className={styles.check}><input type="checkbox" checked={returned} disabled={pending || blocked} onChange={e => returnVehicle(e.target.checked)} />{copy.returnConfirmed}</label>
        <ConfirmAction label={copy.complete} title={copy.complete} description={copy.returnConfirmed} confirm={locale==="ar"?"تأكيد العملية":"Confirmer l’opération"} cancel={locale==="ar"?"رجوع":"Revenir"} disabled={!approved||!returned||pending||blocked} onConfirm={()=>void mutate("complete")}/></>}
    </section>}
    {feedback.element}<button disabled={pending} onClick={() => { setRental(null); setBlocked(false); setDocument(undefined); approve(false); reload(generation + 1); }}>{copy.reload}</button>
    <div id="rental-documents"/>{documentsEnabled && !draft && <RentalDocuments key={`${id}:${rental.version}`} locale={locale} rentalId={id} rentalVersion={rental.version} signingEnabled={signingEnabled} deliveryEnabled={deliveryEnabled} a2Enabled={a2Enabled} />}
    {sheetsEnabled && <SheetsDashboard key={`sheets:${id}:${rental.version}`} locale={locale} contractId={id} />}
    <section className={styles.panel}><h3>{copy.document}</h3><p>{copy.documentHint}</p><p>{copy.unsigned}</p>
      <button disabled={pending} onClick={() => { void send(locale, { action: "document", id }).then(setDocument).catch(feedback.failure); }}>{copy.document}</button>
      {document !== undefined && (isRecord(document) && isRecord(document.parties) ? <dl>
        <dt>{copy.client}</dt><dd>{isRecord(document.parties.primaryDriver) ? String(document.parties.primaryDriver.fullName ?? "") : copy.none}</dd>
        <dt>{copy.secondary}</dt><dd>{isRecord(document.parties.secondaryDriver) ? String(document.parties.secondaryDriver.fullName ?? "") : copy.none}</dd>
        <dt>{copy.vehicle}</dt><dd>{isRecord(document.parties.vehicle) ? String(document.parties.vehicle.registrationNumber ?? "") : copy.none}</dd>
      </dl> : <p>{copy.none}</p>)}
    </section>
  </div>;
}
