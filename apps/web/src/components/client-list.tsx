"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { Locale } from "../i18n/locales";
import { clientMessages } from "../i18n/clients";
import { isRecord } from "../../../../packages/application/src/agency-management";
import { defaultClientQuery, validateClientQuery, type ClientPage, type ClientQuery } from "../../../../packages/application/src/clients";

export function ClientList({ locale, initial, canCreate }: { locale: Locale; initial: ClientPage; canCreate: boolean }) {
  const copy = clientMessages(locale); const [page, setPage] = useState(initial); const [busy, setBusy] = useState(false); const [failed, setFailed] = useState(false);
  async function load(query: ClientQuery) {
    if (busy) return; setBusy(true); setFailed(false);
    try {
      const response = await fetch(`/${locale}/app/client-action`, { method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list", query }) });
      const result: unknown = await response.json();
      if (!response.ok || !isRecord(result) || result.ok !== true || !isRecord(result.page) || !Array.isArray(result.page.items) || typeof result.page.total !== "number") { setFailed(true); return; }
      setPage(result.page as unknown as ClientPage);
    } catch { setFailed(true); } finally { setBusy(false); }
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    const query = validateClientQuery({ search: values.get("search"), identityType: values.get("identityType"), page: 1, pageSize: Number(values.get("pageSize")) });
    if (query) void load(query); else setFailed(true);
  }
  return <section aria-label={copy.title} aria-busy={busy}>
    {canCreate && <p><Link href={`/${locale}/app/clients/new`} prefetch={false}>{copy.create}</Link></p>}
    <form onSubmit={search} className="client-filters">
      <div><label htmlFor="client-search">{copy.search}</label><input id="client-search" name="search" type="search" maxLength={100} defaultValue={initial.query.search} /></div>
      <div><label htmlFor="client-filter">{copy.filter}</label><select id="client-filter" name="identityType" defaultValue={initial.query.identityType}>
        <option value="all">{copy.all}</option><option value="none">{copy.none}</option><option value="cin">{copy.cin}</option><option value="passport">{copy.passport}</option></select></div>
      <div><label htmlFor="client-size">{copy.size}</label><select id="client-size" name="pageSize" defaultValue={initial.query.pageSize}><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></div>
      <button type="submit" disabled={busy}>{busy ? copy.busy : copy.searchButton}</button>
      <button type="reset" disabled={busy} onClick={() => void load({ ...defaultClientQuery })}>{copy.reset}</button>
    </form>
    {failed && <p role="alert">{copy.unavailable}</p>}
    {busy && <p role="status">{copy.busy}</p>}
    {!failed && <><p aria-live="polite">{copy.results}: {new Intl.NumberFormat(locale).format(page.total)}</p>
    {!page.items.length ? <p className="status-panel">{page.query.search || page.query.identityType !== "all" ? copy.noResults : copy.empty}</p> :
      <div className="client-table-wrap"><table className="client-table"><caption>{copy.title}</caption><thead><tr>
        <th scope="col">{copy.fields.lastName}</th><th scope="col">{copy.fields.phone}</th><th scope="col">{copy.fields.email}</th><th scope="col">{copy.fields.city}</th>
      </tr></thead><tbody>{page.items.map(item => <tr key={item.id}>
        <th scope="row"><Link href={`/${locale}/app/clients/${item.id}`} prefetch={false}>{item.firstName} {item.lastName}</Link></th>
        <td dir="ltr">{item.phone}</td><td dir="ltr">{item.email || "—"}</td><td>{item.city || "—"}</td>
      </tr>)}</tbody></table></div>}
    <nav className="client-pagination" aria-label={copy.page}>
      <button type="button" disabled={busy || page.query.page <= 1} onClick={() => void load({ ...page.query, page: page.query.page - 1 })}>{copy.previous}</button>
      <span>{copy.page} {new Intl.NumberFormat(locale).format(page.query.page)}</span>
      <button type="button" disabled={busy || page.query.page >= 10000 || page.query.page * page.query.pageSize >= page.total} onClick={() => void load({ ...page.query, page: page.query.page + 1 })}>{copy.next}</button>
    </nav></>}
  </section>;
}
