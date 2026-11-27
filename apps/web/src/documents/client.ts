import type { Locale } from "../i18n/locales";
export async function sendDocument(locale: Locale, action: string, input: object = {}, binary = false): Promise<unknown> {
  const response = await fetch(`/${locale}/app/document-action`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, input }) });
  if (response.redirected) throw Error("unavailable");
  if (!response.ok) { const error = await response.json(); throw Error(error.code ?? "unavailable"); }
  return binary ? response.blob() : (await response.json()).value;
}
