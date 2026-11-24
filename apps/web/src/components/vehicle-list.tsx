"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import type { Locale } from "../i18n/locales";
import { vehicleMessages } from "../i18n/vehicles";
import { validVehicleSearch, validVehiclePage, vehicleInputFields, validateVehicleInput, vehiclePageSize, vehicleVersionLimit, type VehiclePage, type VehicleRecord } from "../../../../packages/application/src/vehicles";
import { isRecord, isUuid } from "../../../../packages/application/src/agency-management";
export function VehicleList({ locale, data, canCreate }: { locale: Locale; data: VehiclePage; canCreate: boolean }) {
  const copy = vehicleMessages(locale);
  const [page, setPage] = useState(data), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false);
  const flight = useRef(false);
  async function load(number: number, search: string) {
    if (flight.current) return;
    if (!validVehiclePage(number) || !validVehicleSearch(search)) { setFailed(true); return; }
    flight.current = true; setBusy(true); setFailed(false);
    try {
      const response = await fetch(`/${locale}/app/vehicle-action`, { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list", page: number, search }) });
      const result: unknown = await response.json();
      if (response.status !== 200 || !isRecord(result) || result.ok !== true || !isRecord(result.page)) throw new Error();
      const value = result.page;
      if (value.page !== number || value.search !== search || !Number.isSafeInteger(value.total) || (value.total as number) < 0 || !Array.isArray(value.items) || value.items.length > vehiclePageSize ||
        (value.total as number) < value.items.length || (value.items.length && (value.total as number) < (number - 1) * vehiclePageSize + value.items.length)) throw new Error();
      const items: VehicleRecord[] = value.items.map((row: unknown) => {
        if (!isRecord(row) || !isUuid(row.id) || typeof row.version !== "number" || !Number.isSafeInteger(row.version) || row.version < 1 || row.version > vehicleVersionLimit ||
          Object.keys(row).sort().join() !== [...vehicleInputFields, "id", "version"].sort().join()) throw new Error();
        const parsed = validateVehicleInput(Object.fromEntries(vehicleInputFields.map(field => [field, row[field]])));
        if (!parsed.ok) throw new Error(); return { ...parsed.value, id: row.id, version: row.version };
      });
      if (new Set(items.map(item => item.id)).size !== items.length) throw new Error();
      setPage({ items, total: value.total as number, page: number, search });
    } catch { setFailed(true); } finally { flight.current = false; setBusy(false); }
  }
  function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void load(1, String(new FormData(event.currentTarget).get("search") ?? "")); }
  return <section aria-label={copy.title} aria-busy={busy}>
    {canCreate && <p><Link className="dashboard-primary-action" prefetch={false} href={`/${locale}/app/vehicles/new`}>{copy.create}</Link></p>}
    <form className="client-filters" onSubmit={search}>
      <div><label htmlFor="vehicle-search">{copy.search}</label><input id="vehicle-search" name="search" type="search" maxLength={100} defaultValue={data.search ?? ""} /></div>
      <button type="submit" disabled={busy}>{copy.searchButton}</button>
      <button type="reset" disabled={busy} onClick={() => void load(1, "")}>{copy.reset}</button>
    </form>
    {busy && <p role="status">{copy.loading}</p>}{failed && <p role="alert">{copy.unavailable}</p>}
    {!failed && <><p role="status" aria-live="polite">{copy.results}: {new Intl.NumberFormat(locale).format(page.total)}</p>
    {page.items.length ? <ul>{page.items.map(vehicle => <li key={vehicle.id}>
      <Link prefetch={false} href={`/${locale}/app/vehicles/${vehicle.id}`}><bdi>{vehicle.registration}</bdi> — <bdi>{vehicle.make} {vehicle.model}</bdi></Link>
      <span> · {copy.options[vehicle.rentalStatus]}</span>
    </li>)}</ul> : <p role="status">{page.search ? copy.noResults : copy.empty}</p>}
    <nav aria-label={copy.title}>
      <button type="button" disabled={busy || page.page <= 1} onClick={() => void load(page.page - 1, page.search ?? "")}>{copy.previous}</button>{" "}
      <span>{copy.page} {new Intl.NumberFormat(locale).format(page.page)}</span>{" "}
      <button type="button" disabled={busy || page.page >= 10000 || page.page * vehiclePageSize >= page.total} onClick={() => void load(page.page + 1, page.search ?? "")}>{copy.next}</button>
    </nav></>}
  </section>;
}
