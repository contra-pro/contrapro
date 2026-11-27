import { describe, expect, it } from "vitest";
import { paymentInput, balances, locationInput, brandingInput, readRentalOperations } from "./model";
import { teamInvitation } from "./invitation";

describe("A1 authoritative rental accounting and agency boundaries", () => {
  it("keeps exact rental payments, advance and refundable deposits separate", () => {
    expect(balances("10001", [
      { kind: "advance", amountMinor: "3000", id: "a", reverses: null },
      { kind: "payment", amountMinor: "2001", id: "b", reverses: null },
      { kind: "deposit-in", amountMinor: "5000", id: "c", reverses: null },
      { kind: "deposit-out", amountMinor: "1000", id: "d", reverses: null },
      { kind: "reversal", amountMinor: "2001", id: "e", reverses: "b" },
    ])).toEqual({ paidMinor: "3000", remainingMinor: "7001", depositHeldMinor: "4000", status: "partial" });
  });
  it("rejects floating-point money, invalid dates, editable balances and unknown payment methods", () => {
    const input = { kind: "payment", amountMinor: "100", method: "cash", date: "2026-11-25", reference: "", reason: "", reverses: null };
    expect(paymentInput(input)).toEqual(input);
    for (const patch of [{ amountMinor: 100 }, { amountMinor: "1.5" }, { amountMinor: "0" }, { date: "2026-02-30" }, { remaining: "0" }, { method: "provider" }]) expect(() => paymentInput({ ...input, ...patch })).toThrow("invalid");
    expect(() => paymentInput({ ...input, kind: "reversal" })).toThrow("invalid");
  });
  it("never substitutes locations or accepts hidden tenant fields", () => {
    expect(locationInput({ pickup: "Rabat centre", returnLocation: "Aéroport" })).toEqual({ pickup: "Rabat centre", returnLocation: "Aéroport" });
    expect(() => locationInput({ pickup: "", returnLocation: "Rabat" })).toThrow();
    expect(() => locationInput({ pickup: "Rabat", returnLocation: "Rabat", agencyId: "foreign" })).toThrow();
  });
  it("keeps optional fiscal identifiers optional and rejects unsafe branding values", () => {
    expect(brandingInput({ legalName: "Atlas", commercialName: "", representativeName: "", representativeRole: "", primary: "#173b56", accent: "#b68a35" })).toMatchObject({ legalName: "Atlas" });
    expect(() => brandingInput({ legalName: "Atlas", primary: "url(javascript:evil)" })).toThrow();
  });
  it("derives retry-stable invitation secrets without storing raw tokens", () => {
    const aid = "10000000-0000-4000-8000-000000000001", req = "10000000-0000-4000-8000-000000000002";
    const first = teamInvitation("a".repeat(64), aid, req);
    expect(teamInvitation("a".repeat(64), aid, req)).toEqual(first);
    expect(first.token).toMatch(/^[a-f0-9]{64}$/); expect(first.digest).not.toBe(first.token);
    expect(teamInvitation("b".repeat(64), aid, req).digest).not.toBe(first.digest);
    expect(() => teamInvitation("", aid, req)).toThrow("unavailable");
  });
  it("rejects forged display totals and derives rental status from the authoritative ledger",()=>{
    const value={totalMinor:"10001",revision:0,canPay:false,state:"brouillon",signerId:null,eligibleSigners:[],payments:[],locations:null,paidMinor:"0",remainingMinor:"10001",depositHeldMinor:"0",status:"unpaid"};
    expect(readRentalOperations(value)).toMatchObject({remainingMinor:"10001",status:"unpaid"});
    expect(()=>readRentalOperations({...value,remainingMinor:"0",status:"paid"})).toThrow("unavailable");
  });
});
