// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readRentalDetail } from "../../../../packages/application/src/rentals/detail";
import { RentalDetails } from "./rental-details";
import { formatRentalInstant } from "./detail-time";

const agencyId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const id = "33333333-3333-3333-3333-333333333333";
const context = { agencyId, contractId: id };
const draft = {
  id, agency_id: agencyId, client_id: "44444444-4444-4444-4444-444444444444", vehicle_id: "55555555-5555-5555-5555-555555555555",
  state: "brouillon", starts_at: "2026-01-01T08:00:00Z", ends_at: "2026-01-02T08:00:00.000001Z",
  daily_rate_minor: 12_345, deposit_minor: 50_000, billable_days: 2, total_minor: 24_690, currency: "MAD",
  number_year: null, number_serial: null, contract_number: null, confirmed_at: null, returned_at: null,
  version: 1, created_at: "2025-12-20T10:00:00Z", updated_at: "2025-12-20T10:00:00Z",
  physicalUnavailable: false, overdueConflict: false,
};
const numbered = { ...draft, state: "confirme", number_year: 2025, number_serial: 42n,
  contract_number: "CTR-2025-0042", confirmed_at: "2025-12-21T10:00:00Z", version: 2 };
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden"); }));
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function render(response: unknown) { await act(async () => root.render(<RentalDetails response={response} context={context} />)); }

describe("offline rental details — SQL-derived read model and injected view", () => {
  it("reads all expected draft fields with exact references and bigint values", () => {
    const result = readRentalDetail(draft, context);
    expect(result).toMatchObject({ ok: true, value: { id, agencyId, clientId: draft.client_id, vehicleId: draft.vehicle_id,
      state: "brouillon", dailyRateMinor: 12_345n, totalMinor: 24_690n, depositMinor: 50_000n, billableDays: 2,
      contractNumber: null, version: 1, physicalUnavailable: false, overdueConflict: false } });
    if (!result.ok) throw new Error("Invalid fixture");
    expect(result.value.endsAt.epochMicroseconds - result.value.startsAt.epochMicroseconds).toBe(86_400_000_001n);
  });

  it.each([
    [draft, "Brouillon", false], [numbered, "Confirmé", true],
    [{ ...numbered, state: "en_cours", version: 3 }, "En cours", true],
    [{ ...numbered, state: "termine", version: 4, returned_at: "2026-01-02T09:00:00Z" }, "Terminé", true],
    [{ ...draft, state: "annule", version: 2 }, "Annulé", false],
    [{ ...numbered, state: "annule", version: 3 }, "Annulé", true],
  ] as const)("displays SQL lifecycle %s", async (response, label, hasNumber) => {
    await render(response);
    expect(host.textContent).toContain(label);
    expect(host.textContent).toContain("Démonstration locale");
    expect(host.textContent?.includes("CTR-2025-0042")).toBe(hasNumber);
    expect(host.querySelector("button,form")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("formats rental charge and deposit separately, with preserved UTC instants", async () => {
    await render(draft);
    expect(host.textContent).toContain("246,90 MAD");
    expect(host.textContent).toContain("500,00 MAD");
    expect(host.textContent).toContain("Africa/Casablanca");
    expect(host.textContent).toContain("09:00:00,000000");
    expect(host.textContent).toContain("2026-01-01T08:00:00.000000Z");
    expect(host.textContent).toContain("2026-01-02T08:00:00.000001Z");
    expect(host.querySelectorAll("time").length).toBeGreaterThanOrEqual(2);
  });

  it("formats negative epoch fractions without millisecond truncation", () => {
    expect(formatRentalInstant({ source: "1969-12-31T23:59:59.999999Z", epochMicroseconds: -1n }).utc)
      .toBe("1969-12-31T23:59:59.999999Z");
    const display = formatRentalInstant({ source: "2026-01-01T08:00:00.123456Z", epochMicroseconds: 1_767_254_400_123_456n });
    expect(display.local).toContain("09:00:00,123456");
    expect(display.utc).toBe("2026-01-01T08:00:00.123456Z");
  });

  it("supports exact maximum totals using a losslessly decoded fixture", async () => {
    const response = { ...draft, starts_at: "0001-01-01T00:00:00Z", ends_at: "2738-11-29T00:00:00Z",
      daily_rate_minor: 1_000_000_000_000n, deposit_minor: 1_000_000_000_000n, billable_days: 1_000_000,
      total_minor: 1_000_000_000_000_000_000n };
    expect(readRentalDetail(response, context)).toMatchObject({ ok: true, value: { totalMinor: 1_000_000_000_000_000_000n } });
    await render(response);
    expect(host.textContent).toContain("10\u202f000\u202f000\u202f000\u202f000\u202f000,00 MAD");
    expect(readRentalDetail({ ...response, total_minor: 1_000_000_000_000_000_000 }, context).ok).toBe(false);
  });

  it.each([
    { state: "draft" }, { state: "signed" }, { currency: "EUR" }, { version: 0 }, { version: 2_147_483_648 },
    { daily_rate_minor: "12345" }, { deposit_minor: -1 }, { total_minor: 1 }, { billable_days: 1 },
    { ends_at: draft.starts_at }, { starts_at: "2026-01-01T08:00:00" }, { created_at: "PRIVATE_MARKER" },
    { physicalUnavailable: "false" }, { overdueConflict: true }, { returned_at: draft.ends_at },
    { creator_membership_id: "PRIVATE_MARKER" }, { return_membership_id: null }, { secret: "PRIVATE_MARKER" },
  ])("rejects inconsistent or unexpected fields %#", change => {
    const result = readRentalDetail({ ...draft, ...change }, context);
    expect(result).toEqual({ ok: false, code: "invalid-response" });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_MARKER");
  });

  it.each([
    { ...draft, contract_number: "CTR-2025-0042" }, { ...numbered, state: "brouillon" },
    { ...draft, state: "confirme" }, { ...numbered, contract_number: "CTR-2025-42" },
    { ...numbered, number_year: null }, { ...numbered, number_serial: 0n },
    { ...numbered, confirmed_at: null }, { ...numbered, state: "termine", returned_at: null },
  ])("rejects illegal number/return lifecycle combinations %#", response => {
    expect(readRentalDetail(response, context)).toEqual({ ok: false, code: "invalid-response" });
  });

  it("preserves a supplied long serial without inventing or truncating a number", () => {
    expect(readRentalDetail({ ...numbered, number_serial: 10_000n, contract_number: "CTR-2025-10000" }, context))
      .toMatchObject({ ok: true, value: { numberSerial: 10_000n, contractNumber: "CTR-2025-10000" } });
  });

  it("rejects cross-agency and wrong-rental responses", async () => {
    const response = { ...draft, agency_id: "22222222-2222-2222-2222-222222222222" };
    expect(readRentalDetail(response, context)).toEqual({ ok: false, code: "scope-mismatch" });
    expect(readRentalDetail({ ...draft, id: response.agency_id }, context)).toEqual({ ok: false, code: "scope-mismatch" });
    await render(response);
    expect(host.getAttribute("lang") ?? host.querySelector('[lang="fr"]')).toBeTruthy();
    expect(host.textContent).toContain("Détails indisponibles");
    expect(host.textContent).not.toContain(response.agency_id);
  });

  it.each([{}, [], "PRIVATE_MARKER", undefined])("rejects malformed response %#", response => {
    expect(readRentalDetail(response, context)).toEqual({ ok: false, code: "invalid-response" });
  });

  it("distinguishes SQL null result from malformed data and invalid context", async () => {
    expect(readRentalDetail(null, context)).toEqual({ ok: false, code: "not-found" });
    expect(readRentalDetail(draft, { ...context, agencyId: "PRIVATE_MARKER" })).toEqual({ ok: false, code: "invalid-context" });
    await render(null); expect(host.textContent).toContain("Aucun contrat trouvé");
  });

  it("requires every response field and never invokes accessors", () => {
    for (const field of Object.keys(draft)) {
      const response: Record<string, unknown> = { ...draft }; delete response[field];
      expect(readRentalDetail(response, context).ok).toBe(false);
    }
    let reads = 0;
    expect(readRentalDetail({ ...draft, get total_minor() { reads++; return 24_690; } }, context).ok).toBe(false);
    expect(reads).toBe(0);
    expect(readRentalDetail(Object.create(draft), context).ok).toBe(false);
    expect(readRentalDetail({ ...draft, [Symbol("extra")]: true }, context).ok).toBe(false);
  });

  it("shows advisory handover flags without implying authorization", async () => {
    await render({ ...numbered, physicalUnavailable: true, overdueConflict: true });
    expect(host.textContent).toContain("Véhicule non restitué");
    expect(host.textContent).toContain("Conflit avec une location en retard");
    expect(host.querySelector("button")).toBeNull();
    expect(host.querySelector('section[aria-labelledby]')).not.toBeNull();
    expect(host.querySelector("dl")).not.toBeNull();
  });
});
