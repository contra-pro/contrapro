"use client";
import { useRef, useState } from "react";
import type { Locale } from "../i18n/locales";
import { vehicleMessages } from "../i18n/vehicles";
import { isRecord } from "../../../../packages/application/src/agency-management";
export function VehicleArchive({ locale, id, version, disabled }: { locale: Locale; id: string; version: number; disabled: boolean }) {
  const copy = vehicleMessages(locale), flight = useRef(false);
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false);
  async function archive() {
    if (disabled || !confirm || flight.current) return;
    flight.current = true; setBusy(true); setFailed(false);
    try {
      const response = await fetch(`/${locale}/app/vehicle-action`, { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "archive", id, version }) });
      const result: unknown = await response.json();
      const destination = `/${locale}/app/vehicles`;
      if (response.status !== 200 || !isRecord(result) || result.ok !== true || result.destination !== destination) throw new Error();
      window.location.replace(destination);
    } catch { setFailed(true); setBusy(false); flight.current = false; }
  }
  return <section aria-label={copy.archive}>
    {!confirm ? <button type="button" disabled={disabled || busy} onClick={() => setConfirm(true)}>{copy.archive}</button> :
      <div role="group" aria-labelledby="vehicle-archive-question"><h2 id="vehicle-archive-question">{copy.archiveQuestion}</h2><p>{copy.archiveHint}</p>
        <button type="button" disabled={disabled || busy} onClick={() => void archive()}>{busy ? copy.busy : copy.confirmArchive}</button>
        <button type="button" disabled={busy} onClick={() => { setConfirm(false); setFailed(false); }}>{copy.cancel}</button></div>}
    {failed && <p role="alert">{copy.uncertain}</p>}
  </section>;
}
