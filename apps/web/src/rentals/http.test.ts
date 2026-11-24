import { describe, expect, it, vi } from "vitest";
import type { RentalCreateContext, RentalCreatePort } from "../../../../packages/application/src/rentals/create";
import { rentalJsonMaxBytes } from "../../../../packages/domain/src/rentals/json-boundary";
vi.mock("server-only", () => ({}));
import { createRentalHttpHandler } from "./http";

const origin = "https://contratpro.example";
const agencyId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const otherAgency = "22222222-2222-2222-2222-222222222222";
const creationKey = "11111111-1111-1111-1111-111111111111";
const receipt = { id: "33333333-3333-3333-3333-333333333333", version: 1, state: "brouillon", number: null };
const input = { clientId: "44444444-4444-4444-4444-444444444444", vehicleId: "55555555-5555-5555-5555-555555555555",
  start: "2026-01-01T01:00:00+01:00", end: "2026-01-02T00:00:00.000001Z", dailyRateMinor: 12_345, depositMinor: 50_000 };
const raw = JSON.stringify(input);
function request(body: BodyInit | null = raw, headers: Record<string, string> = {}) {
  return new Request(origin + "/offline-rental-test", { method: "POST", headers: { origin, "content-type": "application/json", ...headers }, body });
}
function fixture(context: RentalCreateContext | null = { agencyId, creationKey }) {
  const create = vi.fn<RentalCreatePort["create"]>().mockResolvedValue({ kind: "success", data: { ...receipt } });
  const resolveContext = vi.fn<(request: Request) => Promise<RentalCreateContext | null>>().mockResolvedValue(context);
  const handler = createRentalHttpHandler({ origin, resolveContext, port: { create } });
  return { handler, create, resolveContext };
}
function streamed(chunks: Uint8Array[], cancel = vi.fn()) {
  let position = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (position === chunks.length) controller.close();
      else controller.enqueue(chunks[position++]!);
    }, cancel,
  });
  return new Request(origin + "/offline-rental-test", { method: "POST", headers: { origin, "content-type": "application/json" }, body,
    duplex: "half" } as RequestInit & { duplex: "half" });
}

describe("rental HTTP factory — isolated Web requests, fake dependencies only", () => {
  it("returns the validated receipt and exact canonical RPC parameters", async () => {
    const f = fixture();
    const response = await f.handler(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, value: receipt });
    expect(f.create).toHaveBeenCalledExactlyOnceWith({ p_agency_id: agencyId, p_key: creationKey, p_details: {
      clientId: input.clientId, vehicleId: input.vehicleId, start: "2026-01-01T00:00:00.000000Z", end: input.end,
      dailyRateMinor: 12_345, depositMinor: 50_000,
    } });
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.has("access-control-allow-origin")).toBe(false);
  });

  it.each(["GET", "PUT", "DELETE", "OPTIONS", "HEAD"])("rejects unsupported method %s", async method => {
    const f = fixture();
    const response = await f.handler(new Request(origin + "/offline-rental-test", { method }));
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    if (method === "HEAD") expect(await response.text()).toBe("");
    expect(f.resolveContext).not.toHaveBeenCalled();
    expect(f.create).not.toHaveBeenCalled();
  });

  it.each(["", "null", "https://attacker.example", "https://contratpro.example.attacker.example"])
    ("rejects missing/foreign request origin %#", async supplied => {
      const f = fixture();
      const response = await f.handler(request(raw, { origin: supplied }));
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ ok: false, code: "forbidden" });
      expect(f.resolveContext).not.toHaveBeenCalled();
      expect(f.create).not.toHaveBeenCalled();
    });

  it("rejects a foreign request URL despite a matching Origin header", async () => {
    const f = fixture();
    const response = await f.handler(new Request("https://attacker.example/test", { method: "POST", headers: { origin, "content-type": "application/json" }, body: raw }));
    expect(response.status).toBe(403);
    expect(f.create).not.toHaveBeenCalled();
  });

  it.each(["text/plain", "application/jsonp", "application/json; charset=latin1", "application/json; charset=utf-8; charset=utf-8", "application/json; x=1", ""])
    ("rejects unsupported content type %s", async contentType => {
      const f = fixture();
      const response = await f.handler(request(raw, { "content-type": contentType }));
      expect(response.status).toBe(415);
      expect(f.resolveContext).not.toHaveBeenCalled();
      expect(f.create).not.toHaveBeenCalled();
    });

  it.each(["application/json", "Application/JSON", "application/json; charset=UTF-8", 'application/json; charset="utf-8"'])
    ("accepts supported JSON media type %s", async contentType => {
      expect((await fixture().handler(request(raw, { "content-type": contentType }))).status).toBe(200);
    });

  it("rejects compressed content rather than guessing an encoding", async () => {
    const f = fixture();
    expect((await f.handler(request(raw, { "content-encoding": "gzip" }))).status).toBe(415);
    expect(f.create).not.toHaveBeenCalled();
  });

  it("enforces actual bytes regardless of Content-Length, before resolution/validation", async () => {
    const f = fixture();
    const tooLarge = raw + " ".repeat(rentalJsonMaxBytes - raw.length + 1);
    const response = await f.handler(request(tooLarge, { "content-length": "1" }));
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ ok: false, code: "too-large" });
    expect(f.resolveContext).not.toHaveBeenCalled();
    expect(f.create).not.toHaveBeenCalled();
    expect((await f.handler(request(raw + " ".repeat(rentalJsonMaxBytes - raw.length)))).status).toBe(200);
  });

  it("cancels an oversized stream and preserves size failure if cancellation throws", async () => {
    const f = fixture();
    const cancel = vi.fn(() => { throw new Error("PRIVATE_MARKER"); });
    const bytes = new Uint8Array(rentalJsonMaxBytes + 1).fill(32);
    const response = await f.handler(streamed([bytes], cancel));
    expect(response.status).toBe(413);
    expect(cancel).toHaveBeenCalledOnce();
    expect(f.create).not.toHaveBeenCalled();
  });

  it.each([new Uint8Array([0xff]), new Uint8Array([0xc3]), new Uint8Array([0xc0, 0xaf]), new Uint8Array([0xed, 0xa0, 0x80])])
    ("rejects invalid/truncated UTF-8 before context resolution %#", async bytes => {
      const f = fixture();
      const response = await f.handler(request(bytes));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ ok: false, code: "invalid-input" });
      expect(f.resolveContext).not.toHaveBeenCalled();
      expect(f.create).not.toHaveBeenCalled();
    });

  it("preserves a BOM for rejection rather than silently accepting it", async () => {
    const f = fixture();
    expect((await f.handler(request(new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(raw)])))).status).toBe(400);
    expect(f.create).not.toHaveBeenCalled();
  });

  it("decodes arbitrary byte chunk boundaries without losing raw JSON precision", async () => {
    const bytes = new TextEncoder().encode(raw.replace('"clientId"', '"client\\u0049d"'));
    expect((await fixture().handler(streamed([...bytes].map(byte => new Uint8Array([byte]))))).status).toBe(200);
    const unicode = new TextEncoder().encode('{"private":"😀"}');
    const f = fixture();
    expect((await f.handler(streamed([...unicode].map(byte => new Uint8Array([byte]))))).status).toBe(400);
    expect(f.create).not.toHaveBeenCalled();
  });

  it.each([null, "", "{", raw.replace("12345", "1.00000000000000001"), JSON.stringify({ ...input, agencyId: otherAgency }),
    JSON.stringify({ ...input, creationKey }), JSON.stringify({ ...input, dailyRateMinor: -1 })])
    ("rejects invalid JSON/business fields without calling the port %#", async body => {
      const f = fixture();
      const response = await f.handler(request(body));
      expect(response.status).toBe(400);
      expect((await response.json()).code).toBe("invalid-input");
      expect(f.create).not.toHaveBeenCalled();
    });

  it.each([null, { agencyId: "PRIVATE_MARKER", creationKey }, { agencyId, creationKey: "PRIVATE_MARKER" }])
    ("fails closed for missing/invalid trusted context %#", async context => {
      const f = fixture(context);
      const response = await f.handler(request());
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ ok: false, code: "forbidden" });
      expect(f.create).not.toHaveBeenCalled();
    });

  it("sanitizes resolver failures and never retries resolution", async () => {
    const f = fixture();
    f.resolveContext.mockRejectedValue(new Error("PRIVATE_MARKER"));
    const response = await f.handler(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, code: "unavailable" });
    expect(f.resolveContext).toHaveBeenCalledOnce();
    expect(f.create).not.toHaveBeenCalled();
  });

  it.each([["42501", 403, "forbidden"], ["40001", 409, "conflict"], ["22023", 400, "invalid"], ["XX000", 503, "uncertain"]] as const)
    ("maps service rejection %s", async (sqlState, status, code) => {
      const f = fixture();
      f.create.mockResolvedValue({ kind: "rejected", sqlState });
      const response = await f.handler(request());
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ ok: false, code });
      expect(f.create).toHaveBeenCalledOnce();
    });

  it("maps bounded-UTC failure to 400 without a port call", async () => {
    const f = fixture();
    const response = await f.handler(request(JSON.stringify({ ...input,
      start: "0001-01-01T00:00:00+01:00", end: "0001-01-01T00:00:00.000001+01:00" })));
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("out-of-range");
    expect(f.create).not.toHaveBeenCalled();
  });

  it("preserves keys across explicit retries and never retries uncertain results automatically", async () => {
    const f = fixture();
    f.create.mockRejectedValueOnce(new Error("PRIVATE_MARKER")).mockResolvedValue({ kind: "success", data: receipt });
    const first = await f.handler(request());
    expect(first.status).toBe(503);
    expect(await first.json()).toEqual({ ok: false, code: "uncertain" });
    expect(f.create).toHaveBeenCalledOnce();
    expect((await f.handler(request())).status).toBe(200);
    expect(f.create).toHaveBeenCalledTimes(2);
    expect(f.create.mock.calls[0]![0]).toEqual(f.create.mock.calls[1]![0]);
  });

  it("ignores agency/key headers and uses only the injected server context", async () => {
    const f = fixture();
    await f.handler(request(raw, { "x-agency-id": otherAgency, "idempotency-key": receipt.id }));
    expect(f.create.mock.calls[0]![0].p_agency_id).toBe(agencyId);
    expect(f.create.mock.calls[0]![0].p_key).toBe(creationKey);
  });

  it("requires explicit dependencies and a canonical configured origin", () => {
    const f = fixture();
    expect(() => createRentalHttpHandler({ origin: "https://contratpro.example/path", resolveContext: f.resolveContext, port: { create: f.create } })).toThrow("RENTAL_HTTP_CONFIGURATION_INVALID");
    expect(() => createRentalHttpHandler(undefined as never)).toThrow("RENTAL_HTTP_CONFIGURATION_INVALID");
  });

  it("sanitizes failed body streams without context/port invocation", async () => {
    const f = fixture();
    const body = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error("PRIVATE_MARKER")); } });
    const req = new Request(origin + "/test", { method: "POST", headers: { origin, "content-type": "application/json" },
      body, duplex: "half" } as RequestInit & { duplex: "half" });
    const response = await f.handler(req);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, code: "invalid-input" });
    expect(f.resolveContext).not.toHaveBeenCalled();
    expect(f.create).not.toHaveBeenCalled();
  });

  it("treats malformed successful RPC output as uncertain without retrying", async () => {
    const f = fixture();
    f.create.mockResolvedValue({ kind: "success", data: { ...receipt, secret: "PRIVATE_MARKER" } });
    const response = await f.handler(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, code: "uncertain" });
    expect(f.create).toHaveBeenCalledOnce();
  });
});
