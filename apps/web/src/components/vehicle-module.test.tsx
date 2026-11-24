// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { VehicleList } from "./vehicle-list";
import { VehicleArchive } from "./vehicle-archive";
import { vehicleMessages } from "../i18n/vehicles";
let host: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
it.each(["fr", "ar"] as const)("%s search uses bounded POST, loading feedback and safe failure", async locale => {
  let finish!: (response: Response) => void;
  const send = vi.fn().mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; })); vi.stubGlobal("fetch", send);
  await act(async () => root.render(<VehicleList locale={locale} data={{ items: [], total: 0, page: 1 }} canCreate={false} />));
  const input = host.querySelector<HTMLInputElement>("input")!; input.value = "%_أ";
  await act(async () => host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(JSON.parse(send.mock.calls[0]![1].body)).toEqual({ action: "list", page: 1, search: "%_أ" });
  expect(host.textContent).toContain(vehicleMessages(locale).loading);
  expect(host.querySelector("section")?.getAttribute("aria-busy")).toBe("true");
  await act(async () => finish(Response.json({ ok: true, page: { items: [], total: 0, page: 1, search: "%_أ" } })));
  expect(host.textContent).toContain(vehicleMessages(locale).noResults);
  send.mockResolvedValueOnce(Response.json({ private: "SECRET" }, { status: 503 }));
  await act(async () => host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(host.querySelector('[role="alert"]')?.textContent).toBe(vehicleMessages(locale).unavailable);
  expect(host.textContent).not.toContain("SECRET");
});
it("archive requires confirmation, sends no ownership, and never reports failed requests as success", async () => {
  const send = vi.fn().mockResolvedValue(Response.json({ ok: false, code: "conflict" }, { status: 409 })); vi.stubGlobal("fetch", send);
  const id = "10000000-0000-4000-8000-000000000001";
  await act(async () => root.render(<VehicleArchive locale="fr" id={id} version={2} disabled={false} />));
  await act(async () => host.querySelector("button")!.click()); expect(send).not.toHaveBeenCalled();
  expect(host.querySelector('[role="group"]')?.getAttribute("aria-labelledby")).toBe("vehicle-archive-question");
  await act(async () => host.querySelector("button")!.click());
  expect(JSON.parse(send.mock.calls[0]![1].body)).toEqual({ action: "archive", id, version: 2 });
  expect(host.querySelector('[role="alert"]')?.textContent).toBe(vehicleMessages("fr").uncertain);
});
