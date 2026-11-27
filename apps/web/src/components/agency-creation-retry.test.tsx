// @vitest-environment jsdom
import { act, cloneElement, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgencyForm, type AgencyFormProps } from "./agency-form";

import { getAgencyContext } from "../server/agency-access";
import { handleAgencyAction } from "../agency/handler";
import type { AgencyContext } from "../auth/identity";
import { agencyManagementMessages } from "../i18n/agency-management";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("../server/agency-access", () => ({ getAgencyContext: vi.fn() }));
vi.mock("server-only", () => ({}));

const origin = "https://contratpro.example";
const userA = "10000000-0000-4000-8000-000000000001";
const userB = "10000000-0000-4000-8000-000000000002";
const subject = "20000000-0000-4000-8000-000000000001";
const agencyId = "30000000-0000-4000-8000-000000000001";
const membershipId = "40000000-0000-4000-8000-000000000001";
const profile = { name: "Atlas", ice: "", ifNumber: "", rc: "", address: "12 rue Atlas", city: "Rabat", phone: "+212612345678", email: "atlas@example.com" };

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals();
});

function fixture(failure: "response-lost" | "readback-failed" | "none" = "none") {
  // Scripted RPC responses exercise real page/form/HTTP wiring, not SQL or RLS.
  const creations = new Set<string>();
  const state = { userId: userA, failed: false };
  const context = (selection?: { userId: string; agencyId: string }): AgencyContext => ({
    access: selection?.userId === state.userId && selection.agencyId === agencyId ?
      { status: "authorized", userId: state.userId, agencyId, membershipId, agencyName: profile.name } : { status: "onboarding" },
    canonical: { userId: state.userId, subject, expiresAt: 9999999999999 }, choices: [],
  });
  vi.mocked(getAgencyContext).mockImplementation(async () => context());
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> => {
    if (name === "contratpro_create_agency") {
      creations.add(`${state.userId}:${args.p_request_id}`);
      return { data: [{ agency_id: agencyId, user_id: state.userId, membership_id: membershipId }], error: null };
    }
    if (name === "contratpro_agency_profile") {
      if (failure === "readback-failed" && !state.failed) { state.failed = true; return { data: null, error: { code: "synthetic" } }; }
      return { data: [{ agency_id: agencyId, is_owner: true, profile,
        settings: { defaultLocale: "fr", timeZone: "Africa/Casablanca", currency: "MAD" } }], error: null };
    }
    throw new Error("Unexpected synthetic RPC");
  });
  const client = { rpc } as unknown as SupabaseClient;
  const deps = { origin: () => origin, client: () => client,
    context: async (_client: SupabaseClient, selection?: { userId: string; agencyId: string }) => context(selection), writesReady: () => true };
  const fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
    if (typeof init?.body !== "string") throw new Error("Expected JSON body");
    const response = await handleAgencyAction(new NextRequest(`${origin}/fr/app/agency-action`, {
      method: "POST", headers: { origin, "content-type": "application/json" }, body: init.body,
    }), "fr", deps);
    if (failure === "response-lost" && !state.failed) { state.failed = true; throw new Error("Response lost after synthetic creation"); }
    return response;
  });
  vi.stubGlobal("fetch", fetch);
  return { state, fetch, rpc, creations };
}

async function render(enabled = true) {
  const context=await getAgencyContext();
  const form = createElement(AgencyForm,{key:context.canonical?.userId,locale:"fr",action:"create",requestId:crypto.randomUUID(),enabled,isOwner:true}) as ReactElement<AgencyFormProps>;
  expect(form.type).toBe(AgencyForm);
  // Enable only this isolated component prop; never change a feature flag.
  await act(async () => root.render(cloneElement(form, { enabled })));
  return form.props.requestId;
}
function fill() {
  for (const [field, value] of Object.entries(profile)) host.querySelector<HTMLInputElement>(`[name="${field}"]`)!.value = value;
}
async function submit() {
  await act(async () => { host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
}

describe("legacy agency form identity through the existing HTTP handler", () => {
  it("preserves the mounted creation key and entered fields across a server refresh before submission", async () => {
    const f = fixture(); const originalKey = await render(); fill();
    expect(await render()).not.toBe(originalKey);
    expect(f.fetch).not.toHaveBeenCalled();
    expect(host.querySelector<HTMLInputElement>('[name="name"]')!.value).toBe(profile.name);
    await submit();
    expect(f.rpc).toHaveBeenCalledWith("contratpro_create_agency", { p_profile: profile, p_locale: "fr", p_request_id: originalKey });
  });
  it.each(["response-lost", "readback-failed"] as const)("retries %s using the original key after refresh, without an automatic retry", async failure => {
    const f = fixture(failure); const originalKey = await render(); fill(); await submit();
    expect(host.textContent).toContain(agencyManagementMessages("fr").uncertain);
    expect(router.push).not.toHaveBeenCalled(); expect(f.fetch).toHaveBeenCalledTimes(1);
    await render(); expect(f.fetch).toHaveBeenCalledTimes(1);
    await submit();
    expect(f.rpc.mock.calls.filter(([name]) => name === "contratpro_create_agency").map(([, args]) => args.p_request_id)).toEqual([originalKey, originalKey]);
    expect(f.creations.size).toBe(1);
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/fr/app");
  });
  it("resets fields, feedback and creation key when the trusted canonical user changes", async () => {
    const f = fixture("response-lost"); const originalKey = await render(); fill(); await submit();
    f.state.userId = userB;
    const nextKey = await render();
    expect(host.querySelector<HTMLInputElement>('[name="name"]')!.value).toBe("");
    expect(host.textContent).not.toContain(agencyManagementMessages("fr").uncertain);
    expect(f.fetch).toHaveBeenCalledTimes(1);
    fill(); await submit();
    expect(f.rpc.mock.calls.filter(([name]) => name === "contratpro_create_agency").map(([, args]) => args.p_request_id)).toEqual([originalKey, nextKey]);
    expect(f.creations).toEqual(new Set([`${userA}:${originalKey}`, `${userB}:${nextKey}`]));
  });
  it("does not submit on mount, refresh or attempted submission while writes are disabled", async () => {
    const f = fixture(); await render(false); fill(); await render(false); await submit();
    expect(f.fetch).not.toHaveBeenCalled(); expect(f.rpc).not.toHaveBeenCalled();
  });
});
