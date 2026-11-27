// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RentalDetailScreen, RentalEditor, RentalListScreen, sendRental } from "./workspace";
import type { RentalView } from "./data";
const id = "30000000-0000-4000-8000-000000000001", key = "40000000-0000-4000-8000-000000000001";
const rental: RentalView = { id, agency_id: key, secondaryClientId: null, client_id: key, vehicle_id: id, version: 2, state: "en_cours", contract_number: "CTR-2026-0001",
  starts_at: "2026-12-01T09:00:00Z", ends_at: "2026-12-02T09:00:00Z", daily_rate_minor: "10000", deposit_minor: "0", total_minor: "10000", billable_days: 1,
  physicalUnavailable: false, overdueConflict: false };
let host: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.stubGlobal("fetch", vi.fn(() => { throw Error("No network in component tests"); })); HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event("close"));};host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function click(text: string) { await act(async () => { const button = [...host.querySelectorAll("button")].find(item => item.textContent === text); expect(button).toBeDefined(); button!.click(); }); }
async function change(control: HTMLInputElement | HTMLSelectElement, value: string) { await act(async () => {
  Object.getOwnPropertyDescriptor(control.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype, "value")!.set!.call(control, value);
  control.dispatchEvent(new Event("input", { bubbles: true })); control.dispatchEvent(new Event("change", { bubbles: true }));
}); }
it.each(["fr", "ar"] as const)("renders %s list, locale links and direction without network", async locale => {
  const send = vi.fn(async () => ({ total: 1, items: [rental] }));
  await act(async () => root.render(<RentalListScreen locale={locale} send={send} />));
  expect(host.querySelector(`[dir=${locale === "ar" ? "rtl" : "ltr"}]`)).not.toBeNull();
  expect(host.querySelector(`a[href='/${locale}/app/rentals/${id}']`)).not.toBeNull(); expect(fetch).not.toHaveBeenCalled();
});
it("requires explicit return and operation confirmation and blocks ambiguous retries", async () => {
  const send = vi.fn(async (_locale, body: object) => { const action = (body as { action: string }).action; if (action === "detail") return rental; throw Error("uncertain"); });
  await act(async () => root.render(<RentalDetailScreen locale="fr" id={id} send={send} />));
  const complete = () => [...host.querySelectorAll("button")].find(item => item.textContent === "Enregistrer le retour")!;
  expect(complete().disabled).toBe(true);
  const checks = host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  await act(async () => checks[0]!.click()); expect(complete().disabled).toBe(true);
  await act(async () => checks[1]!.click()); expect(complete().disabled).toBe(false);
  await click("Enregistrer le retour");
  expect(host.querySelector("dialog[open]")).not.toBeNull();expect(send.mock.calls.filter(([,body])=>(body as {action:string}).action==="complete")).toHaveLength(0);
  await click("Confirmer l’opération");
  expect(send.mock.calls.at(-1)?.[1]).toMatchObject({ action: "complete", version: 2, id, returnConfirmed: true });
  expect(complete().disabled).toBe(true); expect(host.textContent).toContain("Résultat non confirmé");
  expect(send.mock.calls.filter(([, body]) => (body as { action: string }).action === "complete")).toHaveLength(1);
});
it("hides all lifecycle mutations on terminal history", async () => {
  const send = vi.fn(async () => ({ ...rental, state: "termine" }));
  await act(async () => root.render(<RentalDetailScreen locale="ar" id={id} send={send} />));
  expect(host.querySelectorAll('input[type="checkbox"]')).toHaveLength(0); expect(host.querySelector("form")).toBeNull();
});
it("does not send an invalid creation and labels its controls", async () => {
  const send = vi.fn<typeof sendRental>(async () => ({ items: [], total: 0 }));
  await act(async () => root.render(<RentalEditor locale="ar" send={send} />));
  await act(async () => host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(send.mock.calls.every(([, body]) => (body as { action: string }).action === "choices")).toBe(true);
  expect(host.textContent).toContain("تحقق من الحقول");
  for (const input of host.querySelectorAll("input")) expect(input.closest("label") || host.querySelector(`label[for='${input.id}']`)).not.toBeNull();
});
it("retains the exact body and key on an explicit uncertain creation retry", async () => {
  const send = vi.fn(async (_locale, body: object): Promise<unknown> => {
    const request = body as { action: string; kind?: string };
    if (request.action === "choices") return { items: [{ id: request.kind === "client" ? key : id, label: "Synthetic" }], total: 1 };
    throw Error("uncertain");
  });
  await act(async () => root.render(<RentalEditor locale="fr" send={send} />));
  const selects = host.querySelectorAll("select"); await change(selects[0]!, key); await change(selects[1]!, id);
  const controls = [...host.querySelectorAll<HTMLInputElement>("fieldset input")];
  for (const [index, value] of ["2026-12-01T09:00:00Z", "2026-12-02T09:00:00Z", "123,45", "0"].entries()) await change(controls[index]!, value);
  const submit = async () => act(async () => host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await submit(); expect(host.textContent).toContain("Résultat non confirmé"); expect(controls[0]!.matches(":disabled")).toBe(true);
  await submit();
  const attempts = send.mock.calls.filter(([, body]) => (body as { action: string }).action === "create");
  expect(attempts).toHaveLength(2); expect(attempts[0]![1]).toEqual(attempts[1]![1]);
});
it("marks transport failures as uncertain and never retries automatically", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => { throw Error("lost response"); }));
  await expect(sendRental("fr", { action: "list", page: 1 })).rejects.toThrow(); expect(fetch).toHaveBeenCalledTimes(1);
});
