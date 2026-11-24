export const features = ["contracts", "vehicles", "team", "templates", "documents", "signatures", "email", "sheets", "storage"] as const;
export type Feature = typeof features[number];
export const states = ["trialing", "active", "pending_payment", "past_due", "grace_period", "suspended", "cancelled", "expired"] as const;
export type SubscriptionState = typeof states[number];
export const transitions: Record<SubscriptionState, readonly SubscriptionState[]> = {
  trialing: ["pending_payment", "expired", "cancelled", "suspended"],
  active: ["pending_payment", "past_due", "cancelled", "suspended", "expired"],
  pending_payment: ["past_due", "cancelled", "expired", "suspended"],
  past_due: ["grace_period", "suspended", "cancelled", "expired"],
  grace_period: ["suspended", "cancelled", "expired"],
  suspended: ["pending_payment", "cancelled", "expired"],
  cancelled: ["pending_payment"], expired: ["pending_payment"],
};
export class BillingFault extends Error {
  constructor(public code: "forbidden" | "invalid" | "conflict" | "quota" | "restricted" | "unavailable") { super(code); }
}
/** Money crosses JSON boundaries as decimal integer strings, never floats. */
export function minorUnits(value: unknown): string {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]{0,18})$/.test(value) || BigInt(value) > 9223372036854775807n) throw new BillingFault("invalid");
  return value;
}
export type Plan = { id: string; plan_key: string; version: number; name: string; description_fr: string; description_ar: string; interval: "month" | "year"; amount_minor: string; currency: string; trial_days: number | null; features: Feature[]; limits: Partial<Record<Feature, string>>; archived: boolean };
export type Subscription = { agency_id: string; revision: number; state: SubscriptionState; plan_id: string | null; period_start: string | null; period_end: string | null; trial_end: string | null; grace_end: string | null; cancel_at_end: boolean; pending_plan: string | null; suspended: boolean };
export type Payment = { id: string; agency_id: string; plan_id: string; state: string; amount_minor: string; currency: string; reference: string | null; source: string; period_start: string; period_end: string; invoice_reference: string };
export type Dashboard = { subscription: Subscription | null; plans: Plan[]; usage: { metric: Feature; bucket: string; used: string; reserved: string }[]; payments: Payment[]; profile: { name?: string; address?: string; taxId?: string }; };
