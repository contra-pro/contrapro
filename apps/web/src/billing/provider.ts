import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { BillingFault, minorUnits } from "./model";

export type VerifiedPaymentEvent = { provider: string; eventId: string; paymentId: string; providerPaymentId: string; sequence: string; status: "confirmed" | "failed" | "cancelled" | "refunded"; amountMinor: string; currency: string };
export type ProviderRequest = { operationId: string; paymentId: string; amountMinor: string; currency: string; returnUrl: string };
export type ProviderResult = { state: "accepted"; reference: string; checkoutUrl?: string } | { state: "rejected" | "uncertain" };
/** No commercial adapter is installed. Implementations must authenticate raw bytes,
 * bind merchant/account + internal payment ID, and reconcile verified provider state.
 * A checkout return URL conveys no payment authority. */
export interface BillingProvider {
  readonly id: string;
  checkout(request: ProviderRequest): Promise<ProviderResult>;
  renew(request: ProviderRequest): Promise<ProviderResult>;
  cancel(request: ProviderRequest): Promise<ProviderResult>;
  refund(request: ProviderRequest): Promise<ProviderResult>;
  reconcile(paymentId: string, providerReference: string): Promise<VerifiedPaymentEvent | null>;
  /** Optional positive lookup by an already persisted operation identity. Absence
   * is uncertainty, never proof that an external charge did not occur. */
  reconcileOperation?(input:{paymentId:string;operationId:string;kind:string;reference:string|null}):Promise<VerifiedPaymentEvent|null>;
  authenticate(raw: Uint8Array, headers: Headers): Promise<VerifiedPaymentEvent>;
}
export interface BillingGateway { call<T>(payload: object): Promise<T>; }
export function validateEvent(event: VerifiedPaymentEvent) {
  minorUnits(event.amountMinor);
  if (!/^[A-Z]{3}$/.test(event.currency) || !/^[0-9]{1,18}$/.test(event.sequence) || !/^[0-9a-f-]{36}$/i.test(event.paymentId) || !event.provider || !event.eventId || !event.providerPaymentId || !["confirmed","failed","cancelled","refunded"].includes(event.status)) throw new BillingFault("invalid");
  return {provider:event.provider,eventId:event.eventId,paymentId:event.paymentId,providerPaymentId:event.providerPaymentId,sequence:event.sequence,status:event.status,amountMinor:event.amountMinor,currency:event.currency};
}
export class BillingPayments {
  constructor(private provider: BillingProvider, private gateway: BillingGateway) {}
  async webhook(raw: Uint8Array, headers: Headers) {
    const event = validateEvent(await this.provider.authenticate(raw, headers));
    if (event.provider !== this.provider.id) throw new BillingFault("forbidden");
    return this.gateway.call({ action: "event", ...event });
  }
  async reconcile(paymentId: string, reference: string) {
    const event = await this.provider.reconcile(paymentId, reference);
    if (!event) return null;
    const verified=validateEvent(event);
    if (verified.provider !== this.provider.id || verified.paymentId !== paymentId) throw new BillingFault("forbidden");
    return this.gateway.call({ action: "event", ...verified });
  }
  async operate(kind: "checkout" | "renew" | "cancel" | "refund", request: ProviderRequest) {
    minorUnits(request.amountMinor);
    const op = await this.gateway.call<{ state: string; send: boolean;amountMinor:string;currency:string }>({ action: "prepare", provider: this.provider.id, kind, paymentId: request.paymentId, operationId: request.operationId });
    // Only the transaction that first prepared the operation may send it. After
    // a crash or lost response, reconcile; never blindly retry an external charge.
    // Adapters must also use operationId as the provider's durable idempotency key.
    if (op.state !== "prepared" || !op.send) return { state: op.state };
    minorUnits(op.amountMinor);if(!/^[A-Z]{3}$/.test(op.currency))throw new BillingFault("invalid");
    let result: ProviderResult;
    try { result = await this.provider[kind]({...request,amountMinor:op.amountMinor,currency:op.currency}); } catch { result = { state: "uncertain" }; }
    await this.gateway.call({ action: "operation-result", provider: this.provider.id, paymentId: request.paymentId, operationId: request.operationId, ...result });
    return result;
  }
  async recover(paymentId:string,operationId:string){
    const context=await this.gateway.call<{paymentId:string;provider:string;operations:{operationId:string;kind:string;reference:string|null}[]}>({action:"recovery-context",provider:this.provider.id,paymentId});
    const op=context.operations.find(o=>o.operationId===operationId);
    if(context.paymentId!==paymentId||context.provider!==this.provider.id||!op)throw new BillingFault("forbidden");
    if(!this.provider.reconcileOperation)return {state:"reconciliation-required"};
    const event=await this.provider.reconcileOperation({paymentId,operationId,kind:op.kind,reference:op.reference});
    if(!event)return {state:"reconciliation-required"};const verified=validateEvent(event);
    if(verified.provider!==this.provider.id||verified.paymentId!==paymentId)throw new BillingFault("forbidden");
    return this.gateway.call({action:"event",...verified});
  }
}
export function gatewayMac(secret: string, payload: string) { return createHmac("sha256", Buffer.from(secret,"hex")).update(payload).digest("hex"); }
/** Utility for local injected HMAC transports; real provider protocols stay isolated. */
export function authenticateHmac(raw: Uint8Array, supplied: string, secret: string) {
  const expected = createHmac("sha256",secret).update(raw).digest();
  if (!/^[a-f0-9]{64}$/.test(supplied) || !timingSafeEqual(expected,Buffer.from(supplied,"hex"))) throw new BillingFault("forbidden");
  return createHash("sha256").update(raw).digest("hex");
}
