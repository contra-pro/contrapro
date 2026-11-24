"use client";
import { useRef, useState, type FormEvent } from "react";
import type { Locale } from "../i18n/locales";
import { authMessages } from "../i18n/auth";
export function SignOutForm({ locale }: { locale: Locale }) {
  const copy = authMessages(locale), flight = useRef(false);
  const [pending, setPending] = useState(false), [failed, setFailed] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (flight.current) return;
    flight.current = true; setPending(true); setFailed(false);
    try {
      const response = await fetch(`/${locale}/auth/sign-out`, { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: "" });
      const result: unknown = await response.json();
      const destination = `/${locale}/sign-in?status=signed-out`;
      if (response.status !== 200 || !result || typeof result !== "object" || !("ok" in result) || result.ok !== true ||
        !("destination" in result) || result.destination !== destination) throw new Error();
      window.location.replace(destination);
    } catch { flight.current = false; setPending(false); setFailed(true); }
  }
  return <form action={`/${locale}/auth/sign-out`} method="post" onSubmit={submit} aria-busy={pending}>
    <button type="submit" disabled={pending}>{pending ? copy.busy : copy.signOut}</button>
    {failed && <p role="alert">{copy.logoutError}</p>}
  </form>;
}
