// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientForm } from "./client-form";
import { handleClients } from "../clients/handler";
import { clientMessages } from "../i18n/clients";
import { emptyClient } from "../../../../packages/application/src/clients";
import type { AgencyContext } from "../auth/identity";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => createElement("a", { href }, children) }));
vi.mock("server-only", () => ({}));

const origin = "https://contratpro.example";
const agencyId = "10000000-0000-4000-8000-000000000001";
const userId = "20000000-0000-4000-8000-000000000001";
const key = "30000000-0000-4000-8000-000000000001";
const refreshedKey = "30000000-0000-4000-8000-000000000002";
const id = "40000000-0000-4000-8000-000000000001";
const permissions = { read: true, create: true, update: false, archive: false };
const context: AgencyContext = { access: { status: "authorized", userId, agencyId, membershipId: key, agencyName: "Atlas" },
  canonical: { userId, subject: key, expiresAt: 9999999999999 }, choices: [] };

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals();
});

function fixture() {
  // Scripted 0009 RPC evidence, not a database/RLS implementation or proof.
  // Exercise the real form -> HTTP handler -> RPC argument/error boundary.
  const originals = new Map<string, string>();
  const state = { agencyId, canCreate: true };
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> => {
    if (name === "contratpro_clients_permissions") return { data: { ...permissions, create: state.canCreate }, error: null };
    if (name === "contratpro_client_creation_contract") return { data: 2, error: null };
    if (name === "contratpro_client_create") {
      const slot = `${args.p_agency_id}:${args.p_key}`;
      const payload = JSON.stringify(args.p_details);
      if (originals.has(slot) && originals.get(slot) !== payload) return { data: null, error: { code: "40001" } };
      originals.set(slot, payload); return { data: id, error: null };
    }
    return { data: { ...emptyClient, firstName: "Amina", lastName: "Atlas", phone: "+212612345678", agencyId: state.agencyId, id, state: "active", version: 1 }, error: null };
  });
  const client = { rpc } as unknown as SupabaseClient;
  const deps = { origin: () => origin, client: () => client,
    context: async (): Promise<AgencyContext> => ({ ...context, access: { status: "authorized", userId, agencyId: state.agencyId, membershipId: key, agencyName: "Atlas" } }), ready: () => true };
  let loseResponse = true;
  const fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
    if (typeof init?.body !== "string") throw new Error("Expected JSON body");
    const response = await handleClients(new NextRequest(`${origin}/fr/app/client-action`, {
      method: "POST", headers: { origin, "content-type": "application/json" }, body: init.body,
    }), "fr", deps);
    if (loseResponse) { loseResponse = false; throw new Error("Response lost after commit"); }
    return response;
  });
  vi.stubGlobal("fetch", fetch);
  return { rpc, fetch, originals, state };
}
async function render(requestId = key, scope = agencyId) {
  await act(async () => root.render(createElement(ClientForm, { key: scope, locale: "fr", permissions, requestId })));
}
function fill() {
  for (const [field, value] of Object.entries({ firstName: "Amina", lastName: "Atlas", phone: "+212612345678" })) {
    host.querySelector<HTMLInputElement>(`[name="${field}"]`)!.value = value;
  }
}
async function submit() {
  await act(async () => { host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
}

describe("client creation retry lifecycle with the real HTTP handler", () => {
  it("reuses the creation key after a lost response and a server refresh of the mounted draft", async () => {
    const f = fixture(); await render(); fill(); await submit();
    expect(host.textContent).toContain(clientMessages("fr").uncertain);
    expect(router.replace).not.toHaveBeenCalled();
    await render(refreshedKey); await submit();
    expect(f.rpc.mock.calls.filter(([name]) => name === "contratpro_client_create").map(([, args]) => args.p_key)).toEqual([key, key]);
    expect(f.originals.size).toBe(1);
    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`/fr/app/clients/${id}`);
  });
  it("keeps the same key for changed payloads after uncertainty so 0009 returns conflict", async () => {
    const f = fixture(); await render(); fill(); await submit();
    await render(refreshedKey);
    host.querySelector<HTMLTextAreaElement>('[name="notes"]')!.value = "Changed original";
    await submit();
    expect(host.textContent).toContain(clientMessages("fr").conflict);
    expect(router.replace).not.toHaveBeenCalled();
    expect(f.originals.size).toBe(1);
    expect(f.rpc.mock.calls.filter(([name]) => name === "contratpro_client_create").map(([, args]) => args.p_key)).toEqual([key, key]);
  });
  it("resets the draft fields and creation key when remounted for another agency", async () => {
    const f = fixture(); await render(); fill(); await submit();
    f.state.agencyId = refreshedKey;
    await render(refreshedKey, refreshedKey);
    expect(host.querySelector<HTMLInputElement>('[name="firstName"]')!.value).toBe("");
    fill(); await submit();
    expect(f.rpc.mock.calls.filter(([name]) => name === "contratpro_client_create").map(([, args]) => [args.p_agency_id, args.p_key]))
      .toEqual([[agencyId, key], [refreshedKey, refreshedKey]]);
  });
  it("rechecks creation permission on retry after a lost response", async () => {
    const f = fixture(); await render(); fill(); await submit();
    f.state.canCreate = false;
    await render(refreshedKey); await submit();
    expect(host.textContent).toContain(clientMessages("fr").forbidden);
    expect(f.rpc.mock.calls.filter(([name]) => name === "contratpro_client_create")).toHaveLength(1);
    expect(router.replace).not.toHaveBeenCalled();
  });
});
