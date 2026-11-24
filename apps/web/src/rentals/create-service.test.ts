import { describe, expect, it, vi } from "vitest";
import { createRental, type RentalCreateContext, type RentalCreatePort, type RentalCreatePortOutcome } from "../../../../packages/application/src/rentals/create";

const agencyId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const creationKey = "11111111-1111-1111-1111-111111111111";
const otherAgency = "22222222-2222-2222-2222-222222222222";
const savedId = "33333333-3333-3333-3333-333333333333";
const context = { agencyId, creationKey };
const payload = { clientId: "44444444-4444-4444-4444-444444444444", vehicleId: "55555555-5555-5555-5555-555555555555",
  start: "2026-01-01T01:00:00+01:00", end: "2026-01-02T00:00:00.000001Z", dailyRateMinor: 12_345, depositMinor: 50_000 };
const text = JSON.stringify(payload);
const receipt = { id: savedId, version: 1, state: "brouillon", number: null };
const success = (): RentalCreatePortOutcome => ({ kind: "success", data: { ...receipt } });
function fake(outcome: unknown = success()) {
  const create = vi.fn<RentalCreatePort["create"]>().mockResolvedValue(outcome as RentalCreatePortOutcome);
  return { port: { create }, create };
}

describe("offline rental-create application workflow — fake port only", () => {
  it("composes lossless parsing, canonical encoding, one port call and receipt validation", async () => {
    const f = fake();
    expect(await createRental(text, context, f.port)).toEqual({ ok: true, value: receipt });
    expect(f.create).toHaveBeenCalledExactlyOnceWith({ p_agency_id: agencyId, p_key: creationKey, p_details: {
      clientId: payload.clientId, vehicleId: payload.vehicleId, start: "2026-01-01T00:00:00.000000Z",
      end: payload.end, dailyRateMinor: 12_345, depositMinor: 50_000,
    } });
  });

  it.each(["{", "null", "[]", text + "{}", text.replace("12345", "1.00000000000000001"),
    text.slice(0, -1) + ',"dailyRateMinor":1}', " ".repeat(32769)])
    ("rejects invalid raw JSON before invoking the port %#", async raw => {
      const f = fake();
      expect(await createRental(raw, context, f.port)).toMatchObject({ ok: false, code: "invalid-input" });
      expect(f.create).not.toHaveBeenCalled();
    });

  it.each([{ clientId: "PRIVATE_MARKER" }, { dailyRateMinor: -1 }, { depositMinor: null },
    { end: payload.start }, { start: "2026-02-30T00:00:00Z" }, { agencyId: otherAgency },
    { creationKey }, { actorId: savedId }, { number: "PRIVATE_MARKER" }, { availability: true }])
    ("rejects invalid business fields and tenant/key injection %#", async change => {
      const f = fake();
      const result = await createRental(JSON.stringify({ ...payload, ...change }), context, f.port);
      expect(result).toMatchObject({ ok: false, code: "invalid-input" });
      expect(JSON.stringify(result)).not.toContain("PRIVATE_MARKER");
      expect(f.create).not.toHaveBeenCalled();
    });

  it.each([{ agencyId: "PRIVATE_MARKER" }, { creationKey: "PRIVATE_MARKER" }, { agencyId: null }, { creationKey: 1 }])
    ("rejects invalid context identifiers before invoking the port %#", async change => {
      const f = fake();
      expect(await createRental(text, { ...context, ...change } as RentalCreateContext, f.port))
        .toMatchObject({ ok: false, code: "invalid-context" });
      expect(f.create).not.toHaveBeenCalled();
    });

  it.each([null, undefined, {}, [], { ...context, role: "Owner" }])("rejects malformed context %#", async value => {
    const f = fake();
    expect(await createRental(text, value as RentalCreateContext, f.port)).toMatchObject({ ok: false, code: "invalid-context" });
    expect(f.create).not.toHaveBeenCalled();
  });

  it("does not invoke context getters or trust inherited context", async () => {
    const f = fake();
    let reads = 0;
    const getter = { get agencyId() { reads++; return agencyId; }, creationKey };
    expect(await createRental(text, getter, f.port)).toMatchObject({ ok: false, code: "invalid-context" });
    expect(reads).toBe(0);
    expect(await createRental(text, Object.create(context), f.port)).toMatchObject({ ok: false, code: "invalid-context" });
    expect(f.create).not.toHaveBeenCalled();
  });

  it.each([
    ["0001-01-01T00:00:00+01:00", "0001-01-01T00:00:00.000001+01:00"],
    ["9999-12-31T23:59:59.999998-01:00", "9999-12-31T23:59:59.999999-01:00"],
  ])("rejects encoder-incompatible normalized instants %#", async (start, end) => {
    const f = fake();
    expect(await createRental(JSON.stringify({ ...payload, start, end }), context, f.port))
      .toMatchObject({ ok: false, code: "out-of-range" });
    expect(f.create).not.toHaveBeenCalled();
  });

  it.each([null, undefined, {}, receipt, { kind: "success" }, { kind: "other", data: receipt },
    { kind: "success", data: receipt, extra: true }, { kind: "rejected" }])
    ("treats malformed port envelopes as uncertain %#", async output => {
      const f = fake();
      f.create.mockResolvedValue(output as RentalCreatePortOutcome);
      expect(await createRental(text, context, f.port)).toEqual({ ok: false, code: "uncertain" });
      expect(f.create).toHaveBeenCalledTimes(1);
    });

  it.each([null, undefined, [], {}, "PRIVATE_MARKER", { ...receipt, id: "bad" }, { ...receipt, id: savedId + "\n" },
    { ...receipt, version: 2 }, { ...receipt, version: "1" }, { ...receipt, state: "confirme" },
    { ...receipt, number: "CTR-2026-0001" }, { id: savedId, version: 1, state: "brouillon" },
    { ...receipt, agencyId }, { ...receipt, secret: "PRIVATE_MARKER" }])
    ("never trusts malformed or unexpected creation receipts %#", async data => {
      const f = fake({ kind: "success", data });
      expect(await createRental(text, context, f.port)).toEqual({ ok: false, code: "uncertain" });
      expect(f.create).toHaveBeenCalledTimes(1);
    });

  it("rejects getter/inherited/hidden/symbol response fields without evaluating them", async () => {
    let reads = 0;
    const getter = { ...receipt, get id() { reads++; return savedId; } };
    for (const data of [getter, Object.create(receipt), { ...receipt, [Symbol("extra")]: true },
      Object.defineProperty({ ...receipt }, "secret", { value: "PRIVATE_MARKER" })]) {
      expect(await createRental(text, context, fake({ kind: "success", data }).port)).toEqual({ ok: false, code: "uncertain" });
    }
    expect(reads).toBe(0);
  });

  it.each([["42501", "forbidden"], ["40001", "conflict"], ["22023", "invalid"],
    ["23503", "uncertain"], ["XX000", "uncertain"], ["PRIVATE_MARKER", "uncertain"]])
    ("maps only reviewed statement rejection %s to %s", async (sqlState, code) => {
      const f = fake({ kind: "rejected", sqlState });
      expect(await createRental(text, context, f.port)).toEqual({ ok: false, code });
      expect(f.create).toHaveBeenCalledTimes(1);
    });

  it("does not reflect raw error payloads or inspect thrown messages", async () => {
    let reads = 0;
    const thrown = { get message() { reads++; throw new Error("PRIVATE_MARKER"); }, code: "42501" };
    const f = fake();
    f.create.mockRejectedValue(thrown);
    expect(await createRental(text, context, f.port)).toEqual({ ok: false, code: "uncertain" });
    expect(reads).toBe(0);
    expect(await createRental(text, context, fake({ kind: "rejected", sqlState: "42501", message: "PRIVATE_MARKER" }).port))
      .toEqual({ ok: false, code: "uncertain" });
  });

  it("never automatically retries a thrown or uncertain outcome", async () => {
    const f = fake();
    f.create.mockRejectedValueOnce(new Error("PRIVATE_MARKER")).mockResolvedValue(success());
    expect(await createRental(text, context, f.port)).toEqual({ ok: false, code: "uncertain" });
    expect(f.create).toHaveBeenCalledTimes(1);
    expect(await createRental(text, context, f.port)).toEqual({ ok: true, value: receipt });
    expect(f.create).toHaveBeenCalledTimes(2);
    expect(f.create.mock.calls[0]![0]).toEqual(f.create.mock.calls[1]![0]);
    expect(f.create.mock.calls[1]![0].p_key).toBe(creationKey);
  });

  it("forwards immutable original receipt semantics on an explicit replay", async () => {
    const f = fake();
    expect(await createRental(text, context, f.port)).toEqual(await createRental(text, context, f.port));
    expect(f.create).toHaveBeenCalledTimes(2);
    // The fake models a returned receipt, not a real deduplication implementation.
    expect(f.create.mock.calls.every(([args]) => args.p_key === creationKey)).toBe(true);
  });

  it("takes agency only from server context and makes no membership/availability assertion", async () => {
    const f = fake({ kind: "rejected", sqlState: "42501" });
    expect(await createRental(text, { agencyId: otherAgency, creationKey }, f.port)).toEqual({ ok: false, code: "forbidden" });
    expect(f.create.mock.calls[0]![0].p_agency_id).toBe(otherAgency);
    expect(f.create.mock.calls[0]![0].p_details).not.toHaveProperty("agencyId");
  });

  it("snapshots context and freezes outbound arguments across an asynchronous call", async () => {
    const mutableContext = { ...context };
    const f = fake();
    f.create.mockImplementation(async args => {
      mutableContext.agencyId = otherAgency;
      mutableContext.creationKey = savedId;
      expect(Object.isFrozen(args)).toBe(true);
      expect(Object.isFrozen(args.p_details)).toBe(true);
      return success();
    });
    expect(await createRental(text, mutableContext, f.port)).toEqual({ ok: true, value: receipt });
    expect(f.create.mock.calls[0]![0].p_agency_id).toBe(agencyId);
    expect(f.create.mock.calls[0]![0].p_key).toBe(creationKey);
  });
});
