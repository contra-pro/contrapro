// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TextDecoder, TextEncoder } from "node:util";
import type { RentalCreatePort } from "../../../../packages/application/src/rentals/create";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RentalCreationForm, type RentalCreationFormProps } from "./rental-create-form";
import { formatRentalMad, reviewRentalForm } from "./form";
vi.mock("server-only", () => ({}));
import { createRentalHttpHandler } from "./http";

const clientId = "44444444-4444-4444-4444-444444444444";
const vehicleId = "55555555-5555-5555-5555-555555555555";
const key = "11111111-1111-1111-1111-111111111111";
const clients = [{ id: clientId, label: "Client fictif A" }];
const vehicles = [{ id: vehicleId, label: "Véhicule fictif A · DEMO-01" }];
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  // Native Request streams use Node's byte realm; align the jsdom test globals.
  vi.stubGlobal("TextEncoder", TextEncoder); vi.stubGlobal("TextDecoder", TextDecoder);
  vi.stubGlobal("Uint8Array", new TextEncoder().encode("").constructor);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden in offline UI tests"); }));
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
function fixture() {
  const rpc = vi.fn<RentalCreatePort["create"]>(async () => ({ kind: "success" as const, data: { id: "33333333-3333-3333-3333-333333333333", version: 1, state: "brouillon", number: null } }));
  const transport = vi.fn(async ({ body, creationKey }: { body: string; creationKey: string }) => {
    const handler = createRentalHttpHandler({ origin: "https://contratpro.example", resolveContext: async () => ({ agencyId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", creationKey }), port: { create: rpc } });
    return handler(new Request("https://contratpro.example/offline-only", { method: "POST", headers: { origin: "https://contratpro.example", "content-type": "application/json" }, body }));
  });
  const newKey = vi.fn(() => key);
  const props: RentalCreationFormProps = { draftScope: "synthetic-identity-A", clients, vehicles, transport, newKey };
  return { props, transport, rpc, newKey };
}
async function render(props: RentalCreationFormProps) { await act(async () => root.render(<RentalCreationForm {...props} />)); }
async function set(name: string, value: string) {
  await act(async () => {
    const control = host.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!;
    const prototype = control.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(control, value);
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
async function fill() {
  for (const [name, value] of Object.entries({ clientId, vehicleId, startDate: "2026-01-01", startTime: "09:00",
    startOffset: "+01:00", endDate: "2026-01-02", endTime: "09:00:00.000001", endOffset: "+01:00", dailyRate: "123,45", deposit: "500" })) await set(name, value);
}
async function submit() { await act(async () => { host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); }); }

describe("isolated rental creation UI — no real services", () => {
  it("renders labeled native controls and an explicit demo notice", async () => {
    await render(fixture().props);
    expect(host.textContent).toContain("Démonstration locale");
    for (const control of host.querySelectorAll<HTMLInputElement>("input, select")) {
      expect(control.id).not.toBe("");
      expect([...host.querySelectorAll("label")].some(label => label.htmlFor === control.id)).toBe(true);
      expect(control.tabIndex).toBeGreaterThanOrEqual(0);
    }
    expect(host.querySelector('[name="agencyId"]')).toBeNull();
    expect(host.querySelector('[name="creationKey"]')).toBeNull();
  });

  it("validates required fields without sending and links errors accessibly", async () => {
    const f = fixture(); await render(f.props); await submit();
    expect(f.transport).not.toHaveBeenCalled();
    const invalid = host.querySelector<HTMLInputElement>('[name="clientId"]')!;
    expect(invalid.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(invalid.getAttribute("aria-describedby")!)).not.toBeNull();
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
  });

  it("selects injected choices, previews exact prices and submits through the real offline workflow", async () => {
    const f = fixture(); await render(f.props); await fill();
    expect(host.textContent).toContain("246,90 MAD");
    expect(host.textContent).toContain("500,00 MAD");
    await submit();
    expect(f.transport).toHaveBeenCalledOnce();
    expect(f.rpc).toHaveBeenCalledOnce();
    expect(f.rpc.mock.calls[0]?.[0]).toMatchObject({ p_key: key, p_details: { dailyRateMinor: 12_345, depositMinor: 50_000 } });
    expect(host.textContent).toContain("Aucun contrat enregistré");
    expect(host.textContent).not.toContain("CTR-");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["1e3", "0.001", "-1", "10000000000.01"])("rejects unsupported/invalid money %s", async amount => {
    const f = fixture(); await render(f.props); await fill(); await set("dailyRate", amount); await submit();
    expect(f.transport).not.toHaveBeenCalled();
    expect(host.querySelector('[name="dailyRate"][aria-invalid="true"]')).not.toBeNull();
  });

  it("uses explicit offsets and rejects reversed/equal instants", async () => {
    const f = fixture(); await render(f.props); await fill();
    await set("endDate", "2026-01-01"); await set("endTime", "10:00"); await set("endOffset", "+02:00");
    await submit(); expect(f.transport).not.toHaveBeenCalled();
    expect(host.textContent).toContain("La fin doit suivre le début");
  });

  it("keeps key and inputs across a parent refresh", async () => {
    const f = fixture(); await render(f.props); await fill();
    await render({ ...f.props, newKey: () => "22222222-2222-2222-2222-222222222222" });
    await submit(); expect(f.transport.mock.calls[0]![0].creationKey).toBe(key);
  });

  it("locks the uncertain draft and retries only on an explicit submit with identical body/key", async () => {
    const f = fixture(); f.transport.mockRejectedValueOnce(new Error("PRIVATE_MARKER"));
    await render(f.props); await fill(); await submit();
    expect(f.transport).toHaveBeenCalledOnce();
    expect(host.textContent).toContain("Résultat non confirmé");
    expect(host.textContent).not.toContain("PRIVATE_MARKER");
    expect(host.querySelector<HTMLFieldSetElement>("fieldset")!.disabled).toBe(true);
    await submit();
    expect(f.transport).toHaveBeenCalledTimes(2);
    expect(f.transport.mock.calls[1]![0]).toEqual(f.transport.mock.calls[0]![0]);
  });

  it("blocks duplicate in-flight submissions synchronously", async () => {
    const f = fixture(); let release!: (response: Response) => void;
    f.transport.mockImplementation(() => new Promise<Response>(resolve => { release = resolve; }));
    await render(f.props); await fill();
    await act(async () => {
      const form = host.querySelector("form")!;
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(f.transport).toHaveBeenCalledOnce();
    expect(host.textContent).toContain("Simulation en cours");
    await act(async () => release(Response.json({ ok: false, code: "uncertain" }, { status: 503 })));
  });

  it.each([[409, "conflict", "Conflit de demande"], [400, "invalid-input", "Vérifiez les champs"],
    [403, "forbidden", "Accès refusé"], [503, "uncertain", "Résultat non confirmé"]] as const)
    ("handles sanitized %s response", async (status, code, message) => {
      const f = fixture(); f.transport.mockResolvedValue(Response.json({ ok: false, code, message: "PRIVATE_MARKER" }, { status }));
      await render(f.props); await fill(); await submit();
      expect(host.textContent).toContain(message); expect(host.textContent).not.toContain("PRIVATE_MARKER");
      expect(f.transport).toHaveBeenCalledOnce();
    });

  it("does not accept a malformed successful receipt", async () => {
    const f = fixture(); f.transport.mockResolvedValue(Response.json({ ok: true, value: { id: "bad", number: "CTR-FAKE" } }));
    await render(f.props); await fill(); await submit();
    expect(host.textContent).toContain("Résultat non confirmé"); expect(host.textContent).not.toContain("CTR-FAKE");
  });

  it("resets the draft/key when the trusted identity scope changes", async () => {
    const f = fixture(); await render(f.props); await fill();
    await render({ ...f.props, draftScope: "synthetic-identity-B", newKey: () => "22222222-2222-2222-2222-222222222222" });
    expect(host.querySelector<HTMLInputElement>('[name="dailyRate"]')!.value).toBe("");
    await fill(); await submit();
    expect(f.transport.mock.calls[0]![0].creationKey).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("formats MAD with bigint arithmetic and does not accept absent fixtures", () => {
    expect(formatRentalMad(1_000_000_000_000_000_000n)).toBe("10\u202f000\u202f000\u202f000\u202f000\u202f000,00 MAD");
    expect(reviewRentalForm({ clientId, vehicleId, startDate: "2026-01-01", startTime: "09:00", startOffset: "+01:00",
      endDate: "2026-01-02", endTime: "09:00", endOffset: "+01:00", dailyRate: "1", deposit: "" }, [], []).ok).toBe(false);
  });

  it("allocates a fresh draft only after an explicit new-draft action", async () => {
    const f = fixture(); f.newKey.mockReturnValueOnce(key).mockReturnValueOnce("22222222-2222-2222-2222-222222222222");
    await render(f.props); await fill(); await submit();
    await act(async () => { host.querySelector<HTMLButtonElement>('button[type="button"]')!.click(); });
    expect(host.querySelector<HTMLInputElement>('[name="dailyRate"]')!.value).toBe("");
    await fill(); await submit();
    expect(f.transport.mock.calls[1]![0].creationKey).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("ignores a response from the previous identity scope", async () => {
    const f = fixture(); let release!: (response: Response) => void;
    f.transport.mockImplementation(() => new Promise<Response>(resolve => { release = resolve; }));
    await render(f.props); await fill();
    await act(async () => { host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    await render({ ...f.props, draftScope: "synthetic-identity-B" });
    await act(async () => release(Response.json({ ok: true, value: { id: key, version: 1, state: "brouillon", number: null } })));
    expect(host.textContent).not.toContain("Simulation terminée");
    expect(host.querySelector<HTMLInputElement>('[name="dailyRate"]')!.value).toBe("");
  });
});
