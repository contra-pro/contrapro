"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "../i18n/locales";
import { agencyManagementMessages } from "../i18n/agency-management";
import { profileFields, validateAgencyProfile, validateAgencySettings, isRecord,
  type AgencyProfile, type AgencySettings, type FieldErrors } from "../../../../packages/application/src/agency-management";

export type AgencyFormProps = { locale: Locale; action: "create" | "profile" | "settings"; requestId: string;
  enabled: boolean; isOwner: boolean; profile?: AgencyProfile; settings?: AgencySettings };

export function AgencyForm({ locale, action, requestId, enabled, isOwner, profile, settings }: AgencyFormProps) {
  const copy = agencyManagementMessages(locale);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"saved" | "unavailable" | "forbidden" | "signed-out" | "uncertain" | "invalid" | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || !isOwner || busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = action === "settings" ? validateAgencySettings(values) : validateAgencyProfile(values);
    if (!parsed.ok) { setErrors(parsed.errors); setStatus("invalid"); return; }
    setErrors({}); setStatus(null); setBusy(true);
    try {
      const response = await fetch(`/${locale}/app/agency-action`, { method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, requestId, data: parsed.value }) });
      const result: unknown = await response.json();
      if (!isRecord(result)) { setStatus("uncertain"); return; }
      if (response.ok && result.ok === true) {
        if (result.destination === `/${locale}/app`) router.push(result.destination);
        else if (action !== "create") { setStatus("saved"); router.refresh(); }
        else setStatus("uncertain");
      } else {
        const code = result.code;
        setStatus(code === "forbidden" || code === "signed-out" || code === "invalid" || code === "uncertain" ? code : "unavailable");
        if (isRecord(result.errors)) {
          const safe: FieldErrors = {};
          for (const field of [...profileFields, "defaultLocale", "timeZone", "currency", "form"] as const) {
            const value = result.errors[field];
            if (value === "required" || value === "invalid" || value === "too-long") safe[field] = value;
          }
          setErrors(safe);
        }
      }
    } catch { setStatus("uncertain"); } finally { setBusy(false); }
  }
  const fieldError = (field: keyof FieldErrors) => errors[field] ?
    <p id={`error-${field}`} className="field-error">{copy.errors[errors[field]!]}</p> : null;
  return <form onSubmit={submit} noValidate className="agency-form" aria-busy={busy}>
    {!enabled && <p role="status">{copy.unavailable}</p>}
    {!isOwner && <p role="status">{copy.ownerOnly}</p>}
    {status && <p role={status === "saved" ? "status" : "alert"} className="form-feedback">{copy[status]}</p>}
    {fieldError("form")}
    <fieldset disabled={busy || !enabled || !isOwner}>
      <legend>{action === "settings" ? copy.settings : copy.profile}</legend>
      {action === "settings" ? <div className="agency-grid">
        <div><label htmlFor="defaultLocale">{copy.fields.defaultLocale}</label><select id="defaultLocale" name="defaultLocale" defaultValue={settings?.defaultLocale ?? locale} aria-invalid={!!errors.defaultLocale} aria-describedby={errors.defaultLocale ? "error-defaultLocale" : undefined}>
          <option value="fr">Français</option><option value="ar">العربية</option></select>{fieldError("defaultLocale")}</div>
        <div><label htmlFor="timeZone">{copy.fields.timeZone}</label><select id="timeZone" name="timeZone" defaultValue={settings?.timeZone ?? "Africa/Casablanca"} aria-invalid={!!errors.timeZone} aria-describedby={errors.timeZone ? "error-timeZone" : undefined}>
          <option value="Africa/Casablanca">Africa/Casablanca</option><option value="UTC">UTC</option></select>{fieldError("timeZone")}</div>
        <div><label htmlFor="currency">{copy.fields.currency}</label><select id="currency" name="currency" defaultValue="MAD"><option value="MAD">MAD</option></select>{fieldError("currency")}</div>
      </div> : <>
        <p id="agency-input-hints">{copy.hints}</p>
        <div className="agency-grid">{profileFields.map(field => {
          const required = !["ice", "ifNumber", "rc"].includes(field);
          return <div key={field} className={field === "name" || field === "address" ? "wide-field" : undefined}>
            <label htmlFor={`agency-${field}`}>{copy.fields[field]} <span className="field-hint">({required ? copy.required : copy.optional})</span></label>
            <input id={`agency-${field}`} name={field} defaultValue={profile?.[field] ?? ""} required={required}
              type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
              dir={["ice", "ifNumber", "phone", "email"].includes(field) ? "ltr" : "auto"}
              autoComplete={field === "email" ? "email" : field === "phone" ? "tel" : field === "city" ? "address-level2" : field === "address" ? "street-address" : "off"}
              maxLength={field === "name" ? 200 : field === "address" ? 400 : field === "city" ? 100 : field === "email" ? 320 : field === "ice" ? 15 : field === "ifNumber" ? 20 : field === "rc" ? 50 : 16}
              aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `agency-input-hints error-${field}` : "agency-input-hints"} />
            {fieldError(field)}
          </div>;
        })}</div>
      </>}
      {isOwner && <button type="submit">{busy ? copy.busy : action === "create" ? copy.submit : copy.save}</button>}
    </fieldset>
  </form>;
}
