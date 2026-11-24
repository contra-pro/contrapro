"use client";
import Link from "next/link";
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
import { SheetsDashboard } from "../sheets/workspace";

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
  const copy = rentalMessages(locale); const [page, setPage] = useState(1); const [value, setValue] = useState<RentalPage | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { let alive = true; send(locale, { action: "list", page }).then(data => { if (alive) { setValue(data as RentalPage); setFailed(false); } }).catch(() => { if (alive) setFailed(true); }); return () => { alive = false; }; }, [locale, page, send]);
  return <div className={styles.root} dir={locale === "ar" ? "rtl" : "ltr"}><Link href={`/${locale}/app/rentals/new`}>{copy.create}</Link>
    {failed ? <p role="alert">{copy.unavailable}</p> : !value ? <p role="status">{copy.loading}</p> : <>
      <p>{value.total} · {copy.page} {page}</p><ul>{value.items.map(item => <li key={item.id}><Link href={`/${locale}/app/rentals/${item.id}`}>{item.contract_number ?? copy.draft}</Link>
        <p>{copy.states[item.state]} · <bdi>{item.starts_at}</bdi> → <bdi>{item.ends_at}</bdi></p></li>)}</ul>{!value.items.length && <p>{copy.empty}</p>}
      <div className={styles.actions}><button disabled={page === 1} onClick={() => { setValue(null); setPage(page - 1); }}>{copy.previous}</button>
        <button disabled={page >= 10000 || page * 20 >= value.total} onClick={() => { setValue(null); setPage(page + 1); }}>{copy.next}</button></div></>}
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
export function RentalEditor({ locale, initial, send = sendRental, onSaved, documentsEnabled = false }: { locale: Locale; initial?: RentalView; send?: Sender; onSaved?: () => void; documentsEnabled?: boolean }) {
  const copy = rentalMessages(locale), id = useId(), feedback = useFeedback(locale); const busy = useRef(false);
  const [pending, setPending] = useState(false); const [locked, setLocked] = useState(false); const [retryAllowed, setRetryAllowed] = useState(false); const [created, setCreated] = useState<string | null>(null);
  const [clientId, setClient] = useState(initial?.client_id ?? ""), [vehicleId, setVehicle] = useState(initial?.vehicle_id ?? "");
  const [start, setStart] = useState(initial?.starts_at ?? ""), [end, setEnd] = useState(initial?.ends_at ?? "");
  const [rate, setRate] = useState(initial ? madInput(initial.daily_rate_minor) : ""), [deposit, setDeposit] = useState(initial ? madInput(initial.deposit_minor) : "0");
  const attempt = useRef<object | null>(null); const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const data = { clientId, vehicleId, start, end, dailyRateMinor: amount(rate), depositMinor: amount(deposit) };
  const review = validateRentalCreateInput(data);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy.current || created || (locked && (!!initial || !retryAllowed))) return;
    if (!attempt.current) {
      if (!review.ok) { feedback.setMessage(copy.invalid); return; }
      attempt.current = { action: initial ? "update" : "create", requestId: crypto.randomUUID(), data: JSON.stringify(data),
        ...(initial ? { id: initial.id, version: initial.version } : {}) };
    }
    busy.current = true; setPending(true);
    try { const result = await send(locale, attempt.current);
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
  return <form onSubmit={submit} noValidate aria-busy={pending} dir={locale === "ar" ? "rtl" : "ltr"}>
    {documentsEnabled && <RentalTemplateChoice locale={locale} rentalId={initial?.id ?? created} />}
    {!initial && <div className={styles.grid}><Choices locale={locale} kind="client" label={copy.client} value={clientId} onChange={setClient} send={send} disabled={locked || pending} />
      <Choices locale={locale} kind="vehicle" label={copy.vehicle} value={vehicleId} onChange={setVehicle} send={send} disabled={locked || pending} /></div>}
    <p id={`${id}-hint`}>{copy.periodHint}</p>
    <fieldset disabled={locked || pending} className={styles.grid} aria-describedby={`${id}-hint`}>
      {([["start", copy.start, start, setStart], ["end", copy.end, end, setEnd], ["rate", copy.rate, rate, setRate], ["deposit", copy.deposit, deposit, setDeposit]] as const).map(([key, label, value, setter]) =>
        <label key={key} htmlFor={`${id}-${key}`}>{label}<input id={`${id}-${key}`} dir="ltr" value={value} required maxLength={40} aria-invalid={feedback.message === copy.invalid && !review.ok || undefined}
          aria-describedby={`${id}-hint`} onChange={e => setter(e.target.value)} /></label>)}
    </fieldset>
    {review.ok && <p>{copy.days}: {review.value.billableDays} · {copy.total}: {formatRentalMad(review.value.rentalTotalMinor)}</p>}
    {feedback.element}
    {created ? <Link href={`/${locale}/app/rentals/${created}`}>{copy.reload}</Link> : <button type="submit" disabled={pending || (locked && (!!initial || !retryAllowed))}>{pending ? copy.pending : locked && retryAllowed ? copy.retry : initial ? copy.update : copy.save}</button>}
    {locked && initial && <button type="button" onClick={() => window.location.reload()}>{copy.reload}</button>}
  </form>;
}

export function RentalDetailScreen({ locale, id, send = sendRental, documentsEnabled = false, signingEnabled=false,deliveryEnabled=false,sheetsEnabled=false }: { locale: Locale; id: string; send?: Sender; documentsEnabled?: boolean; signingEnabled?:boolean;deliveryEnabled?:boolean;sheetsEnabled?:boolean }) {
  const copy = rentalMessages(locale), feedback = useFeedback(locale); const [rental, setRental] = useState<RentalView | null>(null);
  const [generation, reload] = useState(0), [failed, setFailed] = useState(false), [pending, setPending] = useState(false), [blocked, setBlocked] = useState(false);
  const [approved, approve] = useState(false), [returned, returnVehicle] = useState(false), [end, setEnd] = useState(""), [driver, setDriver] = useState("");
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
  if (failed) return <p role="alert">{copy.unavailable}</p>;
  if (!rental) return <p role="status">{copy.loading}</p>;
  const draft = rental.state === "brouillon", reserved = ["confirme", "en_cours"].includes(rental.state);
  return <div className={styles.root} dir={locale === "ar" ? "rtl" : "ltr"} aria-busy={pending}><Link href={`/${locale}/app/rentals`}>{copy.back}</Link>
    <h2>{rental.contract_number ?? copy.draft} · {copy.states[rental.state]}</h2>
    <dl><dt>{copy.start}</dt><dd><bdi>{rental.starts_at}</bdi></dd><dt>{copy.end}</dt><dd><bdi>{rental.ends_at}</bdi></dd>
      <dt>{copy.client}</dt><dd><Link href={`/${locale}/app/clients/${rental.client_id}`}>{rental.client_id}</Link></dd>
      <dt>{copy.vehicle}</dt><dd><bdi>{rental.vehicle_id}</bdi></dd>
      <dt>{copy.days}</dt><dd>{rental.billable_days}</dd><dt>{copy.total}</dt><dd>{formatRentalMad(BigInt(rental.total_minor))}</dd><dt>{copy.deposit}</dt><dd>{formatRentalMad(BigInt(rental.deposit_minor))}</dd></dl>
    <p>{copy.immutable}</p>{rental.physicalUnavailable && <p role="alert">{copy.physical}</p>}
    {draft && !blocked && <RentalEditor key={`${id}:${rental.version}`} locale={locale} initial={rental} send={send} documentsEnabled={documentsEnabled} onSaved={() => { setRental(null); reload(value => value + 1); }} />}
    {draft && <Choices locale={locale} kind="client" optional label={copy.secondary} value={driver} onChange={setDriver} send={send} disabled={blocked || pending} />}
    {(draft || reserved) && <section className={styles.panel}>
      <label className={styles.check}><input type="checkbox" checked={approved} onChange={e => approve(e.target.checked)} disabled={blocked || pending} />{copy.confirmAction}</label>
      <div className={styles.actions}>{draft && <><button disabled={!approved || pending || blocked} onClick={() => void mutate("driver")}>{copy.driver}</button>
        <button disabled={!approved || pending || blocked} onClick={() => void mutate("confirm")}>{copy.confirm}</button></>}
        {rental.state === "confirme" && <button disabled={!approved || pending || blocked} onClick={() => void mutate("start")}>{copy.handover}</button>}
        {rental.state !== "en_cours" && <button disabled={!approved || pending || blocked} onClick={() => void mutate("cancel")}>{copy.cancel}</button>}</div>
      {reserved && <><label>{copy.end}<input dir="ltr" value={end} maxLength={32} disabled={pending || blocked} onChange={e => setEnd(e.target.value)} /></label><button disabled={!approved || pending || blocked} onClick={() => void mutate("extend")}>{copy.extend}</button></>}
      {rental.state === "en_cours" && <><label className={styles.check}><input type="checkbox" checked={returned} disabled={pending || blocked} onChange={e => returnVehicle(e.target.checked)} />{copy.returnConfirmed}</label>
        <button disabled={!approved || !returned || pending || blocked} onClick={() => void mutate("complete")}>{copy.complete}</button></>}
    </section>}
    {feedback.element}<button disabled={pending} onClick={() => { setRental(null); setBlocked(false); setDocument(undefined); approve(false); reload(generation + 1); }}>{copy.reload}</button>
    {documentsEnabled && !draft && <RentalDocuments key={`${id}:${rental.version}`} locale={locale} rentalId={id} rentalVersion={rental.version} signingEnabled={signingEnabled} deliveryEnabled={deliveryEnabled} />}
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
