"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "../i18n/locales";
import { clientMessages, clientFailureCodes, type ClientMessageCode } from "../i18n/clients";
import { clientFields, clientLimits, emptyClient, validateClient, type ClientRecord, type ClientPermissions, type ClientErrors, type ClientField } from "../../../../packages/application/src/clients";
import { isRecord, isUuid } from "../../../../packages/application/src/agency-management";

export function ClientForm({ locale, permissions, initial, requestId }: {
  locale: Locale; permissions: ClientPermissions; initial?: ClientRecord; requestId: string;
}) {
  const copy = clientMessages(locale); const router = useRouter();
  // Server refreshes generate a new prop, but retries belong to this same draft.
  const [creationKey] = useState(requestId);
  const [busy, setBusy] = useState(false); const [errors, setErrors] = useState<ClientErrors>({});
  const [status, setStatus] = useState<ClientMessageCode | "saved" | null>(null);
  const [version, setVersion] = useState(initial?.version ?? 1);
  const [confirm, setConfirm] = useState(false); const [archived, setArchived] = useState(false);
  const editable = initial ? permissions.update : permissions.create;
  const values = initial ?? emptyClient;
  async function send(body: object) {
    const response = await fetch(`/${locale}/app/client-action`, { method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result: unknown = await response.json();
    if (!isRecord(result)) { setStatus("uncertain"); return null; }
    if (!response.ok || result.ok !== true) {
      setStatus(clientFailureCodes.includes(result.code as ClientMessageCode) ? result.code as ClientMessageCode : "unavailable");
      if (isRecord(result.errors)) {
        const safe: ClientErrors = {};
        for (const key of [...clientFields, "form"] as const) {
          const code = result.errors[key];
          if (code === "required" || code === "invalid" || code === "too-long" || code === "date-order" || code === "future-date") safe[key] = code;
        }
        setErrors(safe);
      }
      return null;
    }
    return result;
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !editable) return;
    const parsed = validateClient(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.ok) { setErrors(parsed.errors); setStatus("invalid"); return; }
    setBusy(true); setErrors({}); setStatus(null);
    try {
      const result = await send(initial ? { action: "update", id: initial.id, version, data: parsed.value } : { action: "create", requestId: creationKey, data: parsed.value });
      if (!result) return;
      if (!isUuid(result.id) || typeof result.version !== "number" || !Number.isSafeInteger(result.version) || result.version < 1 || (initial && (result.id !== initial.id || result.version !== version + 1))) { setStatus("uncertain"); return; }
      if (!initial) { router.replace(`/${locale}/app/clients/${result.id}`); return; }
      setVersion(result.version); setStatus("saved"); router.refresh();
    } catch { setStatus("uncertain"); } finally { setBusy(false); }
  }
  async function archive() {
    if (busy || !initial || !permissions.archive || !confirm) return;
    setBusy(true); setStatus(null);
    try {
      const result = await send({ action: "archive", id: initial.id, version });
      if (!result) return;
      if (result.destination !== `/${locale}/app/clients`) { setStatus("uncertain"); return; }
      setArchived(true);
      // Full no-store navigation clears the sensitive detail UI and replaces its history entry.
      window.location.replace(result.destination);
    } catch { setStatus("uncertain"); } finally { setBusy(false); }
  }
  if (archived) return <p role="status">{copy.archived}</p>;
  const groups: { title: string; fields: ClientField[]; hint?: string }[] = [
    { title: copy.contact, fields: ["firstName", "lastName", "phone", "email", "nationality"] },
    { title: copy.identity, fields: ["identityType", "identityNumber"], hint: copy.documentHint },
    { title: copy.licence, fields: ["licenceNumber", "licenceIssueDate", "licenceExpiryDate"], hint: copy.licenceHint },
    { title: copy.additional, fields: ["address", "city", "notes"] },
  ];
  return <div>
    {status && <p role={status === "saved" ? "status" : "alert"} className="form-feedback">{copy[status]}</p>}
    {initial?.licenceExpiryDate && initial.licenceExpiryDate < new Date().toISOString().slice(0, 10) && <p role="status">{copy.expired}</p>}
    {!editable ? <section><p>{copy.readOnly}</p><dl className="client-details">{clientFields.map(field => <div key={field}>
      <dt>{copy.fields[field]}</dt><dd dir="auto">{field === "identityType" ? copy[values.identityType] : values[field] || "—"}</dd>
    </div>)}</dl></section> : <form onSubmit={save} noValidate className="agency-form client-form" aria-busy={busy}>
      {errors.form && <p role="alert">{copy.errors[errors.form]}</p>}
      {groups.map((group, index) => <fieldset key={group.title} disabled={busy}>
        <legend>{group.title}</legend>{group.hint && <p id={`client-hint-${index}`}>{group.hint}</p>}
        <div className="agency-grid">{group.fields.map(field => {
          const required = ["firstName", "lastName", "phone"].includes(field);
          const properties = { id: `client-${field}`, name: field, defaultValue: values[field], required,
            "aria-invalid": !!errors[field], "aria-describedby": errors[field] ? `client-error-${field}` : group.hint ? `client-hint-${index}` : undefined };
          return <div key={field} className={field === "notes" || field === "address" ? "wide-field" : undefined}>
            <label htmlFor={properties.id}>{copy.fields[field]} <span className="field-hint">({required ? copy.required : copy.optional})</span></label>
            {field === "identityType" ? <select {...properties}><option value="none">{copy.none}</option><option value="cin">{copy.cin}</option><option value="passport">{copy.passport}</option></select> :
              field === "notes" ? <textarea {...properties} rows={4} maxLength={clientLimits[field]} dir="auto" /> :
                <input {...properties} type={field === "email" ? "email" : field === "phone" ? "tel" : field === "licenceIssueDate" || field === "licenceExpiryDate" ? "date" : "text"}
                  maxLength={clientLimits[field]} dir={["phone", "email", "identityNumber", "licenceNumber", "licenceIssueDate", "licenceExpiryDate"].includes(field) ? "ltr" : "auto"}
                  autoComplete={field === "email" ? "email" : field === "phone" ? "tel" : field === "firstName" ? "given-name" : field === "lastName" ? "family-name" : "off"} />}
            {errors[field] && <p id={`client-error-${field}`} className="field-error">{copy.errors[errors[field]!]}</p>}
          </div>;
        })}</div>
      </fieldset>)}
      <button type="submit" disabled={busy}>{busy ? copy.busy : initial ? copy.save : copy.create}</button>
    </form>}
    {initial && permissions.archive && <section className="client-archive" aria-label={copy.archive}>
      {!confirm ? <button type="button" disabled={busy} onClick={() => setConfirm(true)}>{copy.archive}</button> :
        <div role="group" aria-labelledby="archive-question"><h2 id="archive-question">{copy.archiveQuestion}</h2><p>{copy.archiveHint}</p>
          <button type="button" disabled={busy} onClick={() => void archive()}>{busy ? copy.busy : copy.confirmArchive}</button>{" "}
          <button type="button" disabled={busy} onClick={() => setConfirm(false)}>{copy.cancel}</button>
        </div>}
    </section>}
    <p><Link href={`/${locale}/app/clients`} prefetch={false}>{copy.back}</Link></p>
  </div>;
}
