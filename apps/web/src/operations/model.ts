import { isRecord, isUuid } from "../../../../packages/application/src/agency-management";
export class OperationFault extends Error {
  constructor(readonly code: "invalid" | "forbidden" | "not-found" | "conflict" | "expired" | "quota" | "restricted" | "unavailable") { super(code); }
}
export const methods = ["cash", "bank-transfer", "card", "cheque", "other"] as const;
export const kinds = ["advance", "payment", "deposit-in", "deposit-out", "reversal"] as const;
export type Payment = { id: string; kind: typeof kinds[number]; amountMinor: string; method: typeof methods[number]; date: string; reference: string; reason: string; reverses: string | null; createdAt?: string };
export type PaymentInput = Omit<Payment, "id" | "createdAt">;
export type Locations = { pickup: string; returnLocation: string };
export type Branding = { legalName: string; commercialName: string; representativeName: string; representativeRole: string; primary: string; accent: string };
export type Member = { id: string; userId: string; email?: string | null; state: "active" | "revoked"; revision: number; roles: string[]; signer: boolean; signerName: string; eligible: boolean };
export type Role = { id: string; key: string; name: string; permissions: string[] };
export type Team = { canManage: boolean; members: Member[]; roles: Role[]; permissions: string[]; invitations: { id: string; email: string; roleId: string; state: string; expiresAt: string; deliveryState?:string|null }[] };
export type RentalOperations = { revision: number; locations: Locations | null; signerId: string | null; payments: Payment[]; paidMinor: string; remainingMinor: string; depositHeldMinor: string; status: string; canPay: boolean; state: string; eligibleSigners: { id: string; name: string }[] };
export function shape(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  if (!isRecord(value) || Object.keys(value).length !== keys.length || Object.keys(value).some(k => !keys.includes(k))) throw new OperationFault("invalid");
}
function text(v: unknown, max: number, required = false) {
  if (typeof v !== "string" || v.length > max || /[\u0000-\u001f\u007f\uD800-\uDFFF]/u.test(v) || required && !v.trim()) throw new OperationFault("invalid");
  return v.trim();
}
export function locationInput(v: unknown): Locations { shape(v, ["pickup", "returnLocation"]); return { pickup: text(v.pickup, 400, true), returnLocation: text(v.returnLocation, 400, true) }; }
export function brandingInput(v: unknown): Branding {
  const keys = ["legalName", "commercialName", "representativeName", "representativeRole", "primary", "accent"] as const; shape(v, keys);
  const b = Object.fromEntries(keys.map(k => [k, text(v[k], k.endsWith("Name") ? 200 : 100)])) as Branding;
  if (!b.legalName || !/^#[a-f0-9]{6}$/i.test(b.primary) || !/^#[a-f0-9]{6}$/i.test(b.accent)) throw new OperationFault("invalid"); return b;
}
export function paymentInput(v: unknown): PaymentInput {
  shape(v, ["kind", "amountMinor", "method", "date", "reference", "reason", "reverses"]);
  if (!kinds.includes(v.kind as Payment["kind"]) || !methods.includes(v.method as Payment["method"]) || typeof v.amountMinor !== "string" || !/^[1-9][0-9]{0,17}$/.test(v.amountMinor) ||
    typeof v.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.date) || !Number.isFinite(Date.parse(v.date)) || new Date(v.date).toISOString().slice(0, 10) !== v.date ||
    !(v.reverses === null || isUuid(v.reverses)) || (v.kind === "reversal") !== (v.reverses !== null)) throw new OperationFault("invalid");
  const reference = text(v.reference, 120), reason = text(v.reason, 400, v.kind === "reversal");
  return { kind: v.kind as Payment["kind"], amountMinor: v.amountMinor, method: v.method as Payment["method"], date: v.date, reference, reason, reverses: v.reverses as string | null };
}
export function balances(total: string, entries: Pick<Payment, "id" | "kind" | "amountMinor" | "reverses">[]) {
  let paid = 0n, held = 0n;
  const deltas = new Map<string, { paid: bigint; held: bigint }>(); const reversed = new Set<string>();
  for (const e of entries) {
    if (!/^[1-9][0-9]{0,17}$/.test(e.amountMinor) || deltas.has(e.id)) throw new OperationFault("invalid");
    const n = BigInt(e.amountMinor); let delta = { paid: ["advance", "payment"].includes(e.kind) ? n : 0n, held: e.kind === "deposit-in" ? n : e.kind === "deposit-out" ? -n : 0n };
    if (e.kind === "reversal") {
      const original = entries.find(x => x.id === e.reverses), d = e.reverses ? deltas.get(e.reverses) : undefined;
      if (!d || !original || original.kind === "reversal" || original.amountMinor !== e.amountMinor || reversed.has(e.reverses!)) throw new OperationFault("invalid");
      reversed.add(e.reverses!); delta = { paid: -d.paid, held: -d.held };
    }
    deltas.set(e.id, delta); paid += delta.paid; held += delta.held;
    if (paid < 0n || paid > BigInt(total) || held < 0n) throw new OperationFault("invalid");
  }
  return { paidMinor: String(paid), remainingMinor: String(BigInt(total) - paid), depositHeldMinor: String(held), status: paid === BigInt(total) ? "paid" : paid === 0n ? "unpaid" : "partial" };
}
/** Verify the RPC's ledger-derived display totals without accepting editable labels. */
export function readRentalOperations(v: unknown): RentalOperations {
  if (!isRecord(v) || typeof v.totalMinor !== "string" || !/^(0|[1-9][0-9]{0,18})$/.test(v.totalMinor) || !Array.isArray(v.payments) ||
    typeof v.revision !== "number" || !Number.isInteger(v.revision) || v.revision < 0 || typeof v.canPay !== "boolean" || !["brouillon","confirme","en_cours","termine","annule"].includes(String(v.state)) ||
    !(v.signerId === null || isUuid(v.signerId)) || !Array.isArray(v.eligibleSigners) || !v.eligibleSigners.every(s => isRecord(s) && isUuid(s.id) && typeof s.name === "string" && s.name.length <= 200)) throw new OperationFault("unavailable");
  const payments = v.payments.map(p => {
    if (!isRecord(p) || !isUuid(p.id)) throw new OperationFault("unavailable");
    return { ...paymentInput({kind:p.kind,amountMinor:p.amountMinor,method:p.method,date:p.date,reference:p.reference,reason:p.reason,reverses:p.reverses}),id:p.id };
  });
  const expected = balances(v.totalMinor,payments);
  if (Object.entries(expected).some(([k,value])=>v[k]!==value)) throw new OperationFault("unavailable");
  const locations = v.locations === null ? null : locationInput(v.locations);
  return {revision:v.revision,canPay:v.canPay,state:String(v.state),signerId:v.signerId as string|null,eligibleSigners:v.eligibleSigners as {id:string;name:string}[],payments,locations,...expected};
}
