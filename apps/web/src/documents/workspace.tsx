"use client";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "../i18n/locales";
import { fields, type Artifact, type Configuration, type Mapping, type Template, type TemplateVersion, type Zone } from "./model";
import { documentMessages } from "./messages";
import styles from "./workspace.module.css";
import { AgencySigning } from "../signing/workspace";
export async function sendDocument(locale: Locale, action: string, input: object = {}, binary = false): Promise<unknown> {
  const response = await fetch(`/${locale}/app/document-action`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, input }) });
  if (response.redirected) throw Error("unavailable");
  if (!response.ok) { const error = await response.json(); throw Error(error.code ?? "unavailable"); }
  return binary ? response.blob() : (await response.json()).value;
}
function useStatus(locale: Locale) {
  const c = documentMessages(locale); const [status, setStatus] = useState(""); const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const run = async (work: () => Promise<void>) => { if (flight.current) return; flight.current = true; setBusy(true); setStatus(""); try { await work(); setStatus(c.success); } catch (e) { const code = e instanceof Error ? e.message : "unavailable"; setStatus(c.errors[code as keyof typeof c.errors] ?? c.errors.unavailable); } finally { flight.current = false; setBusy(false); } };
  return { busy, run, feedback: <p role="status" aria-live="polite">{busy ? c.loading : status}</p> };
}
const box = { page: 1, x: 20, y: 20, width: 200, height: 24 };
export function MappingEditor({ locale, value, change }: { locale: Locale; value: Configuration; change: (v: Configuration) => void }) {
  const c = documentMessages(locale);
  function numeric<T extends Pick<Mapping, "page" | "x" | "y" | "width" | "height">>(v: T, onChange: (v: T) => void) { return (["page", "x", "y", "width", "height"] as const).map(key =>
    <label key={key}>{c[key]}<input type="number" step={key === "page" ? 1 : "any"} min={key === "page" ? 1 : 0} value={v[key]} onChange={e => onChange({ ...v, [key]: Number(e.target.value) })} required /></label>); }
  return <div className={styles.editor}>
    <label>{c.language}<select value={value.locale} onChange={e => change({ ...value, locale: e.target.value as "fr" | "ar" })}><option value="fr">Français</option><option value="ar">العربية</option></select></label>
    <label>{c.custom}<input value={value.custom.join(",")} onChange={e => change({ ...value, custom: e.target.value ? e.target.value.split(",").map(s => s.trim()) : [] })} /></label>
    <label>{locale === "ar" ? "شعار الوكالة PNG (200 كيلوبايت)" : "Logo de l’agence PNG (200 Ko)"}<input type="file" accept="image/png" onChange={e => { const file = e.target.files?.[0]; if (!file || file.size > 204800) return;
      const reader = new FileReader(); reader.onload = () => change({ ...value, logo: { ...box, width: 80, height: 40, data: String(reader.result) } }); reader.readAsDataURL(file); }} /></label>
    {value.logo && <fieldset><legend>{locale === "ar" ? "موضع الشعار" : "Position du logo"}</legend>{numeric(value.logo, v => change({ ...value, logo: v }))}
      <button type="button" onClick={() => change({ ...value, logo: null })}>{c.remove}</button></fieldset>}
    <h3>{c.mapping}</h3>{value.mappings.map((m, i) => <fieldset key={i}><legend>{c.field} {i + 1}</legend>
      <label>{c.field}<select value={m.field} onChange={e => change({ ...value, mappings: value.mappings.map((v, n) => n === i ? { ...v, field: e.target.value } : v) })}>
        {[...fields, ...value.custom.map(k => `custom.${k}`)].map(f => <option key={f} value={f}>{f}</option>)}</select></label>
      {numeric(m, v => change({ ...value, mappings: value.mappings.map((old, n) => n === i ? v as Mapping : old) }))}
      <label>{c.size}<input type="number" min="6" max="48" value={m.fontSize} onChange={e => change({ ...value, mappings: value.mappings.map((v, n) => n === i ? { ...v, fontSize: Number(e.target.value) } : v) })} /></label>
      {(["required", "rtl"] as const).map(key => <label key={key}><input type="checkbox" checked={m[key]} onChange={e => change({ ...value, mappings: value.mappings.map((v, n) => n === i ? { ...v, [key]: e.target.checked } : v) })} />{c[key]}</label>)}
      <button type="button" onClick={() => change({ ...value, mappings: value.mappings.filter((_, n) => n !== i) })}>{c.remove}</button>
    </fieldset>)}
    <button type="button" onClick={() => change({ ...value, mappings: [...value.mappings, { ...box, field: "agency.name", required: true, rtl: locale === "ar", fontSize: 12 }] })}>{c.add}</button>
    <h3>{c.signatures}</h3>{value.signatures.map((zone, i) => <fieldset key={i}><legend>{c.signatures} {i + 1}</legend>
      <label>{c.field}<select value={zone.party} onChange={e => change({ ...value, signatures: value.signatures.map((z, n) => n === i ? { ...z, party: e.target.value as "agency" | "client" } : z) })}><option value="agency">{c.agency}</option><option value="client">{c.client}</option></select></label>
      {numeric(zone, v => change({ ...value, signatures: value.signatures.map((old, n) => n === i ? v as Zone : old) }))}
      <button type="button" onClick={() => change({ ...value, signatures: value.signatures.filter((_, n) => n !== i) })}>{c.remove}</button>
    </fieldset>)}<button type="button" onClick={() => change({ ...value, signatures: [...value.signatures, { ...box, party: "agency" }] })}>{c.addZone}</button>
  </div>;
}
async function asBase64(file: File) { const bytes = new Uint8Array(await file.arrayBuffer()); let text = ""; for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(text); }
function Preview({ url, close, locale }: { url: string; close: () => void; locale: Locale }) {
  const c = documentMessages(locale);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <section aria-label={c.preview}><button type="button" onClick={close}>{c.cancel}</button><a href={url} download="contrat.pdf">{c.download}</a><iframe className={styles.preview} src={url} title={c.preview} /></section>;
}
export function TemplateLibrary({ locale }: { locale: Locale }) {
  const c = documentMessages(locale), status = useStatus(locale);
  const [items, setItems] = useState<Template[] | null>(null), [edit, setEdit] = useState<TemplateVersion | null>(null), [name, setName] = useState("");
  const [config, setConfig] = useState<Configuration>({ locale, custom: [], mappings: [], signatures: [] }), [file, setFile] = useState<File | null>(null), [url, setUrl] = useState(""), [loadError, setLoadError] = useState(false);
  const refresh = async () => setItems(await sendDocument(locale, "list") as Template[]);
  useEffect(() => { let live = true; sendDocument(locale, "list").then(v => { if (live) setItems(v as Template[]); }).catch(() => { if (live) setLoadError(true); }); return () => { live = false; }; }, [locale]);
  return <div className={styles.root} dir={locale === "ar" ? "rtl" : "ltr"}><p>{c.limits}</p>{status.feedback}
    <form onSubmit={e => { e.preventDefault(); void status.run(async () => {
      const input = { templateId: edit?.templateId ?? crypto.randomUUID(), expectedRevision: edit?.revision ?? 0, name, config,
        ...(file ? { base64: await asBase64(file), filename: file.name, mime: file.type } : { sourceVersionId: edit?.id }) };
      await sendDocument(locale, "save", input); await refresh(); setEdit(null); setName(""); setFile(null);
    }); }}><fieldset disabled={status.busy}><legend>{edit ? c.edit : c.upload}</legend>
      <label>{c.name}<input value={name} maxLength={120} onChange={e => setName(e.target.value)} required /></label>
      <label>{c.file}<input key={edit?.id ?? "new"} type="file" accept=".pdf,.docx" required={!edit} onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>
      <MappingEditor locale={locale} value={config} change={setConfig} /><button type="submit">{c.save}</button>
      {edit && <button type="button" onClick={() => { setEdit(null); setName(""); setFile(null); }}>{c.cancel}</button>}
    </fieldset></form>
    {loadError ? <p role="alert">{c.errors.unavailable}</p> : !items ? <p role="status">{c.loading}</p> : !items.length ? <p>{c.empty}</p> : <ul>{items.map(t => <li key={t.id}><h3>{t.name}</h3><p>{t.archived ? c.archived : t.isDefault ? c.currentDefault : ""}</p>
      <fieldset disabled={status.busy || t.archived}><legend>{c.edit}</legend>
        <button onClick={() => { setEdit(t.versions[0]!); setConfig(structuredClone(t.versions[0]!.config)); setName(t.name); setFile(null); }}>{c.edit}</button>
        <button onClick={() => void status.run(async () => { await sendDocument(locale, "save", { templateId: crypto.randomUUID(), expectedRevision: 0, name: `${t.name.slice(0, 110)} (2)`, config: t.versions[0]!.config, sourceVersionId: t.versions[0]!.id }); await refresh(); })}>{c.duplicate}</button>
        <button onClick={() => void status.run(async () => { await sendDocument(locale, "default", { templateId: t.id }); await refresh(); })}>{c.default}</button>
        <button onClick={() => void status.run(async () => { await sendDocument(locale, "archive", { templateId: t.id }); await refresh(); })}>{c.archive}</button>
      </fieldset><details><summary>{c.versions}</summary><ul>{t.versions.map(v => <li key={v.id}>{v.revision} · {v.name} · <bdi>{v.checksum}</bdi>
        {v.format === "pdf" && <button disabled={status.busy} onClick={() => void status.run(async () => setUrl(URL.createObjectURL(await sendDocument(locale, "preview", { id: v.id }, true) as Blob)))}>{c.preview}</button>}</li>)}</ul></details>
    </li>)}</ul>}{url && <Preview url={url} locale={locale} close={() => setUrl("")} />}
  </div>;
}
export function RentalDocuments({ locale, rentalId, rentalVersion, signingEnabled=false,deliveryEnabled=false }: { locale: Locale; rentalId: string; rentalVersion: number; signingEnabled?:boolean;deliveryEnabled?:boolean }) {
  const c = documentMessages(locale), status = useStatus(locale), [templates, setTemplates] = useState<Template[]>([]), [history, setHistory] = useState<Artifact[]>([]);
  const [selected, setSelected] = useState(""), [date, setDate] = useState(() => new Date().toISOString().slice(0, 10)), [custom, setCustom] = useState<Record<string, string>>({}), [url, setUrl] = useState("");
  const [retry, setRetry] = useState<object | null>(null);
  const [loadError, setLoadError] = useState(false);
  const refresh = async () => setHistory(await sendDocument(locale, "history", { rentalId }) as Artifact[]);
  useEffect(() => { let live = true; Promise.all([sendDocument(locale, "list"), sendDocument(locale, "history", { rentalId }), sendDocument(locale, "selection", { rentalId })]).then(([t, h, selected]) => { if (live) { const items = (t as Template[]).filter(x => !x.archived); setTemplates(items); setHistory(h as Artifact[]); setSelected(typeof selected === "string" && items.some(x => x.versions.some(v => v.id === selected)) ? selected : (items.find(x => x.isDefault) ?? items[0])?.versions[0]?.id ?? ""); } }).catch(() => { if (live) setLoadError(true); }); return () => { live = false; }; }, [locale, rentalId]);
  const version = templates.flatMap(t => t.versions).find(v => v.id === selected);
  async function generate(kind: "draft" | "issued") { const input = retry ?? { rentalId, rentalVersion, templateVersionId: selected, requestId: crypto.randomUUID(), issueDate: date, custom, status: kind };
    setRetry(input); try { await sendDocument(locale, "generate", input); setRetry(null); await refresh(); }
    catch (error) { if (error instanceof Error && error.message !== "unavailable") setRetry(null); throw error; } }
  return <section className={styles.root} dir={locale === "ar" ? "rtl" : "ltr"}><h2>{c.history}</h2>{status.feedback}<p>{c.unsigned}</p>
    {loadError && <p role="alert">{c.errors.unavailable}</p>}
    <fieldset disabled={status.busy || !!retry}><legend>{c.template}</legend><label>{c.template}<select value={selected} onChange={e => { setSelected(e.target.value); setCustom({}); }}><option value="">—</option>{templates.flatMap(t => t.versions.map(v => <option key={v.id} value={v.id}>{t.name} · {v.revision}</option>))}</select></label>
      <label>{c.issueDate}<input type="date" value={date} onChange={e => setDate(e.target.value)} required /></label>
      {version?.config.custom.map(k => <label key={k}>{k}<input maxLength={2000} value={custom[k] ?? ""} onChange={e => setCustom({ ...custom, [k]: e.target.value })} /></label>)}
      <button disabled={!selected} onClick={() => void status.run(() => generate("draft"))}>{c.generate}</button><button disabled={!selected} onClick={() => void status.run(() => generate("issued"))}>{c.issue}</button>
    </fieldset>{retry && <button disabled={status.busy} onClick={() => void status.run(() => generate("draft"))}>{c.retry}</button>}
    <ul>{history.map(a => <li key={a.id}>{a.status === "issued" ? locale === "ar" ? "صادر" : "Émis" : locale === "ar" ? "مسودة" : "Brouillon"} · {a.rentalVersion} · <bdi>{a.createdAt}</bdi> · <bdi>{a.checksum}</bdi><button disabled={status.busy} onClick={() => void status.run(async () => setUrl(URL.createObjectURL(await sendDocument(locale, "download", { id: a.id }, true) as Blob)))}>{c.preview} / {c.download}</button></li>)}</ul>
    {url && <Preview url={url} locale={locale} close={() => setUrl("")} />}
    {signingEnabled&&<AgencySigning locale={locale} rentalId={rentalId} artifacts={history} deliveryEnabled={deliveryEnabled}/>}
  </section>;
}
export function RentalTemplateChoice({ locale, rentalId }: { locale: Locale; rentalId: string | null }) {
  const c = documentMessages(locale), status = useStatus(locale), [templates, setTemplates] = useState<Template[]>([]), [selected, setSelected] = useState("");
  useEffect(() => { let live = true; sendDocument(locale, "list").then(t => { if (live) { const items = (t as Template[]).filter(x => !x.archived); setTemplates(items); setSelected((items.find(x => x.isDefault) ?? items[0])?.versions[0]?.id ?? ""); } }).catch(() => {}); return () => { live = false; }; }, [locale]);
  return <fieldset disabled={status.busy}><legend>{c.template}</legend><label>{c.template}<select value={selected} onChange={e => setSelected(e.target.value)}><option value="">—</option>{templates.flatMap(t => t.versions.map(v => <option key={v.id} value={v.id}>{t.name} · {v.revision}</option>))}</select></label>
    <p>{locale === "ar" ? "احفظ المسودة ثم اربط إصدار النموذج المختار قبل التأكيد." : "Enregistrez le brouillon, puis associez la version choisie avant confirmation."}</p>
    <button type="button" disabled={!rentalId || !selected} onClick={() => void status.run(async () => { await sendDocument(locale, "select", { rentalId, templateVersionId: selected }); })}>{c.save}</button>{status.feedback}
  </fieldset>;
}
