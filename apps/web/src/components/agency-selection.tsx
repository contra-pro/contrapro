"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "../i18n/locales";
import { agencyManagementMessages } from "../i18n/agency-management";
import { isRecord } from "../../../../packages/application/src/agency-management";
export function AgencySelection({ locale, choices }: { locale: Locale; choices: { agencyId: string; name: string }[] }) {
  const copy = agencyManagementMessages(locale); const router = useRouter();
  const [busy, setBusy] = useState(false); const [failed, setFailed] = useState(false);
  async function select(agencyId: string) {
    if (busy) return; setBusy(true); setFailed(false);
    try {
      const response = await fetch(`/${locale}/app/agency-action`, { method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "select", agencyId }) });
      const result: unknown = await response.json();
      if (response.ok && isRecord(result) && result.ok === true && result.destination === `/${locale}/app`) router.push(result.destination);
      else setFailed(true);
    } catch { setFailed(true); } finally { setBusy(false); }
  }
  return <section aria-label={copy.select} aria-busy={busy}>
    {failed && <p role="alert">{copy.unavailable}</p>}
    <ul className="agency-choices">{choices.map(choice => <li key={choice.agencyId} className="status-panel">
      <div><h2>{choice.name}</h2><button type="button" disabled={busy} onClick={() => void select(choice.agencyId)}>{busy ? copy.busy : copy.choose}</button></div>
    </li>)}</ul>
  </section>;
}
