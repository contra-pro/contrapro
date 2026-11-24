"use client";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Locale } from "../i18n/locales";
import { authMessages } from "../i18n/auth";
import type { AuthMode } from "./auth-view";

/** Native POST works without JavaScript; enhancement adds localized validation and submission feedback. */
export function AuthForm({ locale, mode, action, configured, children, label }: {
  locale: Locale; mode: AuthMode; action: string; configured: boolean; children?: ReactNode; label: string;
}) {
  const copy = authMessages(locale), flight = useRef(false), feedback = useRef<HTMLParagraphElement>(null);
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    if (flight.current || !configured) { event.preventDefault(); return; }
    const data = new FormData(event.currentTarget), email = String(data.get("email") ?? "").trim(), password = String(data.get("password") ?? "");
    const fresh = mode === "sign-up" || mode === "reset-password";
    const message = mode !== "reset-password" && (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ? copy["invalid-email"]
      : mode !== "forgot-password" && (password.length < (fresh ? 12 : 1) || password.length > 128) ? copy["invalid-password"]
      : fresh && password !== data.get("confirmPassword") ? copy["password-mismatch"] : "";
    if (message) { event.preventDefault(); setError(message); requestAnimationFrame(() => feedback.current?.focus()); return; }
    flight.current = true; setError(""); setPending(true);
    // Do not disable named inputs: the browser still needs them for its POST body.
  }
  return <form className="auth-forms" action={action} method="post" onSubmit={submit} noValidate aria-busy={pending}>
    {children}
    <p ref={feedback} tabIndex={-1} role="status" aria-live="polite">{pending ? copy.busy : error}</p>
    <button type="submit" disabled={!configured || pending}>{pending ? copy.busy : label}</button>
  </form>;
}
