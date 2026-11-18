import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
import { handleAccessProbe, probeTransport } from "./access-probe";
import { AUTH_PROJECT_URL } from "./config";
const subject = "10000000-0000-4000-8000-000000000001";
const user = "20000000-0000-4000-8000-000000000001";
function setup() {
  const row = { supabase_user_id: subject, user_id: user, user_state: "active", membership_id: null,
    agency_id: null, agency_name: null, membership_state: null, agency_state: null };
  const auth = { getUser: vi.fn(async () => ({ data: { user: { id: subject } }, error: null as unknown })),
    getClaims: vi.fn(async () => ({ data: { claims: { sub: subject, iss: `${AUTH_PROJECT_URL}/auth/v1`, aud: "authenticated", exp: 2000 } }, error: null })) };
  const rpc = vi.fn(async () => ({ data: [row] as unknown, error: null as unknown }));
  const client = vi.fn(() => ({ auth, rpc }) as unknown as SupabaseClient);
  const transport = vi.fn<typeof fetch>();
  return { row, auth, rpc, client, deps: { development: () => true, enabled: () => true,
    origin: () => "http://localhost:3000", client, transport, now: () => 1000 } };
}
const request = (origin: string | undefined = "http://localhost:3000") => new NextRequest("http://localhost:3000/dev/auth-access-probe", {
  method: "POST", headers: origin === undefined ? {} : { origin } });
describe("temporary auth probe: offline injected transport only", () => {
  function streamed(body: ReadableStream<Uint8Array>, headers: Record<string, string> = {}, signal?: AbortSignal) {
    return new NextRequest("http://localhost:3000/dev/auth-access-probe", { method: "POST",
      headers: { origin: "http://localhost:3000", ...headers }, body, ...(signal ? { signal } : {}), duplex: "half" });
  }
  async function expectBodyBlocked(req: NextRequest) {
    const f = setup(); const response = await handleAccessProbe(req, f.deps);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ state: "blocked", stage: "request" });
    expect(f.client).not.toHaveBeenCalled(); expect(f.rpc).not.toHaveBeenCalled();
  }
  it("accepts a null body", async () => {
    const f = setup(); const req = request(); expect(req.body).toBeNull();
    expect(await (await handleAccessProbe(req, f.deps)).json()).toEqual({ state: "onboarding_ready" });
  });
  it.each([{}, { "content-length": "0" }, { "content-length": "100" }])("accepts a zero-byte stream independently of Content-Length %j", async headers => {
    const f = setup(); const req = streamed(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(0)); controller.close(); } }), headers);
    expect(req.body).not.toBeNull();
    expect(await (await handleAccessProbe(req, f.deps)).json()).toEqual({ state: "onboarding_ready" });
    expect(f.rpc).toHaveBeenCalledTimes(1);
  });
  it.each([{}, { "content-length": "0" }])("rejects non-empty bytes independently of Content-Length %j", async headers => {
    await expectBodyBlocked(streamed(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1])); controller.close(); } }), headers));
  });
  it("rejects excessive data without buffering the body", async () => {
    const cancel = vi.fn();
    await expectBodyBlocked(streamed(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(65536)); }, cancel })));
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it("rejects stream errors without exposing their messages", async () => {
    await expectBodyBlocked(streamed(new ReadableStream({ start(controller) { controller.error(new Error("private body data")); } })));
  });
  it("rejects an already aborted request, including a null body", async () => {
    const controller = new AbortController(); controller.abort();
    await expectBodyBlocked(new NextRequest("http://localhost:3000/dev/auth-access-probe", { method: "POST", headers: { origin: "http://localhost:3000" }, signal: controller.signal }));
  });
  it("stops a pending read on abort without awaiting stalled cancellation", async () => {
    const controller = new AbortController(); const cancel = vi.fn(() => new Promise<void>(() => {}));
    const pending = expectBodyBlocked(streamed(new ReadableStream({ cancel }), {}, controller.signal));
    controller.abort(); await pending; expect(cancel).toHaveBeenCalledTimes(1);
  });
  it("times out a stalled read and does not await stalled cancellation", async () => {
    vi.useFakeTimers();
    try {
      const cancel = vi.fn(() => new Promise<void>(() => {}));
      const pending = expectBodyBlocked(streamed(new ReadableStream({ cancel })));
      await vi.advanceTimersByTimeAsync(1000); await pending;
      expect(cancel).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });
  it("bounds endless zero-byte chunks", async () => {
    const pull = vi.fn((controller: ReadableStreamDefaultController<Uint8Array>) => controller.enqueue(new Uint8Array(0)));
    await expectBodyBlocked(streamed(new ReadableStream({ pull })));
    expect(pull.mock.calls.length).toBeLessThanOrEqual(17);
  });
  it.each(["production", "disabled"])("blocks %s before client creation", async kind => {
    const f = setup();
    const response = await handleAccessProbe(request(), { ...f.deps, ...(kind === "production" ? { development: () => false } : { enabled: () => false }) });
    expect(await response.json()).toEqual({ state: "blocked", stage: "activation" }); expect(f.client).not.toHaveBeenCalled();
  });
  it.each(["null", "", "https://evil.example"])("rejects origin %s", async origin => {
    const f = setup(); const response = await handleAccessProbe(request(origin), f.deps);
    expect(response.status).toBe(403); expect(await response.json()).toEqual({ state: "blocked", stage: "request" }); expect(f.client).not.toHaveBeenCalled();
  });
  it("rejects missing Origin", async () => {
    const f = setup(); const req = request(); req.headers.delete("origin");
    const response = await handleAccessProbe(req, f.deps);
    expect(response.status).toBe(403); expect(await response.json()).toEqual({ state: "blocked", stage: "request" }); expect(f.client).not.toHaveBeenCalled();
  });
  it("blocks a missing session before RPC", async () => {
    const f = setup(); f.auth.getUser.mockResolvedValue({ data: { user: { id: subject } }, error: new Error("private detail") });
    expect(await (await handleAccessProbe(request(), f.deps)).json()).toEqual({ state: "blocked", stage: "authentication" }); expect(f.rpc).not.toHaveBeenCalled();
  });
  it("blocks expired credentials before RPC", async () => {
    const f = setup(); f.deps.now = () => 2000000;
    expect(await (await handleAccessProbe(request(), f.deps)).json()).toEqual({ state: "blocked", stage: "authentication" }); expect(f.rpc).not.toHaveBeenCalled();
  });
  it("reports active mapping without memberships and emits no identifiers", async () => {
    const f = setup(); const response = await handleAccessProbe(request(), f.deps);
    expect(await response.json()).toEqual({ state: "onboarding_ready" });
    expect(f.rpc).toHaveBeenCalledExactlyOnceWith("contratpro_auth_access");
    expect(response.headers.get("cache-control")).toContain("no-store"); expect(response.cookies.getAll()).toEqual([]);
  });
  it("reports missing mapping", async () => {
    const f = setup(); f.rpc.mockResolvedValue({ data: [], error: null });
    expect(await (await handleAccessProbe(request(), f.deps)).json()).toEqual({ state: "unmapped" });
  });
  it("reports an active membership without exposing it", async () => {
    const f = setup(); f.rpc.mockResolvedValue({ data: [{ ...f.row, membership_id: "30000000-0000-4000-8000-000000000001",
      agency_id: "40000000-0000-4000-8000-000000000001", agency_name: "Private name", membership_state: "active", agency_state: "active" }], error: null });
    expect(await (await handleAccessProbe(request(), f.deps)).json()).toEqual({ state: "membership_present" });
  });
  it.each([null, [{}], Array(101).fill({})])("fails closed on malformed/overflow evidence", async data => {
    const f = setup(); f.rpc.mockResolvedValue({ data, error: null });
    const response = await handleAccessProbe(request(), f.deps);
    expect(response.status).toBe(Array.isArray(data) && data.length === 1 ? 403 : 503);
    expect(await response.json()).toEqual(Array.isArray(data) && data.length === 1 ? { state: "blocked", stage: "rpc_validation" } : { state: "rpc_error" });
  });
  it("blocks a different authenticated subject in RPC evidence", async () => {
    const f = setup(); f.rpc.mockResolvedValue({ data: [{ ...f.row, supabase_user_id: user }], error: null });
    expect(await (await handleAccessProbe(request(), f.deps)).json()).toEqual({ state: "blocked", stage: "rpc_validation" });
  });
  it("sanitizes RPC errors", async () => {
    const f = setup(); f.rpc.mockResolvedValue({ data: null, error: new Error("secret private/path") });
    expect(await (await handleAccessProbe(request(), f.deps)).json()).toEqual({ state: "rpc_error" });
  });
  it("rejects all cookie writes", async () => {
    const f = setup(); await handleAccessProbe(request(), f.deps);
    const factory = f.client as unknown as { mock: { calls: [{ setAll: () => void }][] } };
    expect(() => factory.mock.calls[0]![0].setAll()).toThrow("PROBE_BLOCKED");
  });
  it.each(["refresh", "network", "cookie"])("retains transport stage when the SDK swallows a %s failure", async kind => {
    const f = setup();
    const deps = { ...f.deps, transport: vi.fn<typeof fetch>().mockRejectedValue(new Error("sensitive network detail")),
      client: ((cookies, transport) => {
        f.auth.getUser.mockImplementation(async () => {
          try {
            if (kind === "cookie") await cookies.setAll?.([{ name: "private-cookie", value: "private-value", options: {} }], {});
            else await transport(`${AUTH_PROJECT_URL}/auth/v1/${kind === "refresh" ? "token?grant_type=refresh_token" : "user"}`, { method: kind === "refresh" ? "POST" : "GET" });
            return { data: { user: { id: subject } }, error: null };
          } catch (error) { return { data: { user: { id: subject } }, error }; }
        });
        return f.client();
      }) satisfies NonNullable<Parameters<typeof handleAccessProbe>[1]>["client"] };
    const response = await handleAccessProbe(request(), deps);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ state: "blocked", stage: "transport" });
    expect(response.cookies.getAll()).toEqual([]); expect(f.rpc).not.toHaveBeenCalled();
    expect(deps.transport).toHaveBeenCalledTimes(kind === "network" ? 1 : 0);
  });
  it("sanitizes unexpected client initialization failures as internal", async () => {
    const f = setup(); f.client.mockImplementation(() => { throw new Error("authentication secret https://private.example/path"); });
    const response = await handleAccessProbe(request(), f.deps);
    expect(response.status).toBe(403); expect(await response.json()).toEqual({ state: "blocked", stage: "internal" });
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it("sanitizes a rejected RPC as internal without altering its previous blocked status", async () => {
    const f = setup(); f.rpc.mockRejectedValue(new Error("rpc_validation secret SQL data"));
    const response = await handleAccessProbe(request(), f.deps);
    expect(response.status).toBe(403); expect(await response.json()).toEqual({ state: "blocked", stage: "internal" });
  });
  it("classifies invalid origin configuration as request without exposing it", async () => {
    const f = setup(); f.deps.origin = () => "private invalid configuration";
    const response = await handleAccessProbe(request(), f.deps);
    expect(await response.json()).toEqual({ state: "blocked", stage: "request" }); expect(f.client).not.toHaveBeenCalled();
  });
  it.each(["body", "query", "method", "loopback"])("preserves the %s request guard", async kind => {
    const f = setup(); const req = new NextRequest(`http://localhost:3000/dev/auth-access-probe${kind === "query" ? "?secret=hidden" : ""}`, {
      method: kind === "method" ? "GET" : "POST", headers: { origin: "http://localhost:3000" }, ...(kind === "body" ? { body: "private payload" } : {}) });
    if (kind === "loopback") f.deps.origin = () => "https://remote.example";
    const response = await handleAccessProbe(req, f.deps);
    expect(await response.json()).toEqual({ state: "blocked", stage: "request" }); expect(f.client).not.toHaveBeenCalled();
  });
  it("labels expiry after the RPC as authentication", async () => {
    const f = setup(); f.deps.now = vi.fn().mockReturnValueOnce(1000).mockReturnValue(2000000);
    const response = await handleAccessProbe(request(), f.deps);
    expect(await response.json()).toEqual({ state: "blocked", stage: "authentication" }); expect(f.rpc).toHaveBeenCalledTimes(1);
  });
  it("labels a disabled canonical identity as rpc_validation", async () => {
    const f = setup(); f.rpc.mockResolvedValue({ data: [{ ...f.row, user_state: "disabled" }], error: null });
    const response = await handleAccessProbe(request(), f.deps);
    expect(await response.json()).toEqual({ state: "blocked", stage: "rpc_validation" });
  });
  it("denies refresh, writes, alternate targets and RPC replay before transport", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}"));
    const limited = probeTransport(transport);
    for (const path of ["/auth/v1/token?grant_type=refresh_token", "/rest/v1/clients", "/rest/v1/rpc/other"]) {
      await expect(limited(`${AUTH_PROJECT_URL}${path}`, { method: "POST" })).rejects.toThrow("PROBE_BLOCKED");
    }
    await expect(limited("https://evil.example/auth/v1/user")).rejects.toThrow("PROBE_BLOCKED");
    expect(transport).not.toHaveBeenCalled();
    await limited(`${AUTH_PROJECT_URL}/rest/v1/rpc/contratpro_auth_access`, { method: "POST" });
    await expect(limited(`${AUTH_PROJECT_URL}/rest/v1/rpc/contratpro_auth_access`, { method: "POST" })).rejects.toThrow("PROBE_BLOCKED");
    expect(transport).toHaveBeenCalledTimes(1); expect(transport.mock.calls[0]![1]).toMatchObject({ redirect: "error", cache: "no-store" });
  });
});
