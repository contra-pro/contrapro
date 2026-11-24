"use client";
import { useRef, useState } from "react";
import type { Locale } from "../i18n/locales";
import { authMessages } from "../i18n/auth";
export function AccountSetup({ locale, enabled }: { locale: Locale; enabled: boolean }) {
  const copy = authMessages(locale), flight = useRef(false);
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  async function setup() {
    if (!enabled || flight.current) return;
    flight.current = true; setStatus("pending");
    try {
      const response = await fetch(`/${locale}/auth/provision`, { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error" });
      const result: unknown = await response.json();
      if (response.status !== 200 || !result || typeof result !== "object" || !("ok" in result) || result.ok !== true ||
        !("destination" in result) || result.destination !== `/${locale}/app`) throw new Error();
      window.location.replace(`/${locale}/auth/continue`);
    } catch { flight.current = false; setStatus("error"); }
  }
  return <section aria-label={copy.setup}>
    <p>{copy.setupNote}</p><button type="button" disabled={!enabled || status === "pending"} onClick={setup}>
      {status === "pending" ? copy.busy : copy.setup}</button>
    <p role="status" aria-live="polite">{!enabled ? copy.unavailable : status === "error" ? copy.setupError : ""}</p>
  </section>;
}
