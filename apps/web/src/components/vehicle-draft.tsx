"use client";
import { useReducer, useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "../i18n/locales";
import { vehicleMessages, type VehicleMessageCode } from "../i18n/vehicles";
import { saveVehicle } from "../vehicles/save";
import type { VehicleRecord, VehiclePermissions } from "../../../../packages/application/src/vehicles";
import { vehicleDraftFields, vehicleDraftLimits, initialVehicleDraftState, vehicleDraftReducer, type VehicleDraft } from "../../../../packages/application/src/vehicle-draft";

export function VehicleDraftReview({ locale, value }: { locale: Locale; value: VehicleDraft }) {
  const copy = vehicleMessages(locale);
  return <dl className="client-details">{vehicleDraftFields.map(field => <div key={field}>
    <dt>{copy.fields[field]}</dt><dd dir="auto">{value[field]}</dd>
  </div>)}</dl>;
}

/** The same review workflow serves local drafts and explicitly permission-gated persistence. */
export function VehicleDraftForm({ locale, persistence }: { locale: Locale; persistence?: { permissions: VehiclePermissions; requestId: string; initial?: VehicleRecord } }) {
  const copy = vehicleMessages(locale); const router = useRouter();
  const [state, dispatch] = useReducer(vehicleDraftReducer, persistence?.initial ? {
    values: Object.fromEntries(vehicleDraftFields.map(field => [field, persistence.initial![field]])) as VehicleDraft, errors: {}, review: null,
  } : initialVehicleDraftState);
  const [busy, setBusy] = useState(false); const [status, setStatus] = useState<VehicleMessageCode | "saved" | null>(null);
  const [version, setVersion] = useState(persistence?.initial?.version ?? 1);
  const canSave = !!persistence && persistence.permissions.read && (persistence.initial ? persistence.permissions.update : persistence.permissions.create);
  const frozen = busy || status === "uncertain" || status === "conflict";
  const feedback = useRef<HTMLHeadingElement>(null); const summary = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (state.review) feedback.current?.focus(); else if (Object.keys(state.errors).length) summary.current?.focus(); }, [state.review, state.errors]);
  async function save() {
    if (!persistence || !canSave || !state.review || frozen) return;
    setBusy(true); setStatus(null);
    const result = await saveVehicle(locale, persistence.initial ? { action: "update", id: persistence.initial.id, version, data: state.review } :
      { action: "create", requestId: persistence.requestId, data: state.review }, fetch);
    if (!result.ok) setStatus(result.code);
    else if (!persistence.initial) router.replace(`/${locale}/app/vehicles/${result.id}`);
    else { setVersion(result.version); setStatus("saved"); router.refresh(); }
    setBusy(false);
  }
  if (persistence && !canSave) return <section><VehicleDraftReview locale={locale} value={persistence.initial ?? state.values} /><p role="status">{copy.forbidden}</p></section>;
  return <section aria-label={copy.prepare}>
    {!persistence && <p role="status">{copy.notice}</p>}
    {status && <p role={status === "saved" ? "status" : "alert"}>{copy[status]}</p>}
    {state.review ? <>
      <h2 tabIndex={-1} ref={feedback}>{persistence ? copy.reviewSaved : copy.reviewTitle}</h2>
      <VehicleDraftReview locale={locale} value={state.review} />
      <button type="button" disabled={frozen} onClick={() => { setStatus(null); dispatch({ type: "back" }); }}>{copy.back}</button>
      {canSave && <button type="button" disabled={frozen} onClick={() => void save()}>{busy ? copy.busy : copy.save}</button>}
    </> : <div className="agency-form">
      {Object.keys(state.errors).length > 0 && <p role="alert" tabIndex={-1} ref={summary}>{copy.invalid}</p>}
      <fieldset disabled={frozen} aria-describedby="vehicle-draft-hint"><legend>{copy.prepare}</legend>
        <p id="vehicle-draft-hint">{copy.hint}</p>
        <div className="agency-grid">{vehicleDraftFields.map(field => <div key={field}>
          <label htmlFor={`vehicle-${field}`}>{copy.fields[field]}</label>
          <input id={`vehicle-${field}`} value={state.values[field]} required maxLength={vehicleDraftLimits[field]}
            autoComplete="off" type="text" inputMode={field === "year" || field === "mileage" ? "numeric" : "text"}
            dir={field === "year" || field === "mileage" ? "ltr" : "auto"} aria-invalid={!!state.errors[field]}
            aria-describedby={state.errors[field] ? `vehicle-error-${field}` : undefined}
            onChange={event => dispatch({ type: "edit", field, value: event.target.value })} />
          {state.errors[field] && <p className="field-error" id={`vehicle-error-${field}`}>{copy.errors[state.errors[field]!]}</p>}
        </div>)}</div>
      </fieldset>
      <button type="button" disabled={frozen} onClick={() => { setStatus(null); dispatch({ type: "review", currentYear: new Date().getUTCFullYear() }); }}>{persistence ? copy.confirm : copy.review}</button>
    </div>}
    <button type="button" disabled={frozen} onClick={() => { setStatus(null); dispatch({ type: "clear" }); }}>{copy.clear}</button>
    {persistence && <p><Link prefetch={false} href={`/${locale}/app/vehicles`}>{copy.list}</Link></p>}
  </section>;
}
