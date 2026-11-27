import { createHmac } from "node:crypto";
import { expect, it, vi } from "vitest";
import { authenticateHmac, BillingPayments, type BillingProvider, type VerifiedPaymentEvent } from "./provider";
const event:VerifiedPaymentEvent={provider:"synthetic-only",eventId:"event-1",paymentId:"50000000-0000-4000-8000-000000000001",providerPaymentId:"test-payment",sequence:"1",status:"confirmed",amountMinor:"9007199254740993",currency:"MAD"};
function fixture() {
 const provider:BillingProvider={id:event.provider,authenticate:vi.fn(async(raw,headers)=>{authenticateHmac(raw,headers.get("x-test-signature")??"","test-secret");return event;}),checkout:vi.fn(async()=>({state:"accepted" as const,reference:"test-ref"})),renew:vi.fn(async()=>({state:"accepted" as const,reference:"test-renew"})),cancel:vi.fn(async()=>({state:"accepted" as const,reference:"test-cancel"})),refund:vi.fn(async()=>({state:"accepted" as const,reference:"test-refund"})),reconcile:vi.fn(async()=>event)};
 const call=vi.fn(async()=>({state:"prepared",send:true,amountMinor:event.amountMinor,currency:event.currency}));return {provider,call,engine:new BillingPayments(provider,{call:call as never})};
}
it("rejects invalid raw webhook authentication before durable ingress",async()=>{const f=fixture();await expect(f.engine.webhook(new TextEncoder().encode("test"),new Headers())).rejects.toThrow("forbidden");expect(f.call).not.toHaveBeenCalled();});
it("ingests authenticated events with exact amounts; redirect assertions have no role",async()=>{const f=fixture(),raw=new TextEncoder().encode("test"),signature=createHmac("sha256","test-secret").update(raw).digest("hex");await f.engine.webhook(raw,new Headers({"x-test-signature":signature}));expect(f.call).toHaveBeenCalledWith({action:"event",...event});});
it("records uncertain provider failures without inventing success",async()=>{const f=fixture();vi.mocked(f.provider.checkout).mockRejectedValue(Error("lost response"));expect(await f.engine.operate("checkout",{operationId:"op",paymentId:event.paymentId,amountMinor:"3",currency:"MAD",returnUrl:"https://test.invalid"})).toEqual({state:"uncertain"});expect(f.call).toHaveBeenLastCalledWith(expect.objectContaining({action:"operation-result",state:"uncertain"}));});
it("does not resend a durable prepared or uncertain operation",async()=>{const f=fixture();f.call.mockResolvedValue({state:"prepared",send:false,amountMinor:event.amountMinor,currency:event.currency});await f.engine.operate("checkout",{operationId:"op",paymentId:event.paymentId,amountMinor:"3",currency:"MAD",returnUrl:"https://test.invalid"});expect(f.provider.checkout).not.toHaveBeenCalled();});
it("uses authoritative prepared terms instead of caller-supplied prices",async()=>{const f=fixture();await f.engine.operate("checkout",{operationId:"op",paymentId:event.paymentId,amountMinor:"3",currency:"USD",returnUrl:"https://test.invalid"});expect(f.provider.checkout).toHaveBeenCalledWith(expect.objectContaining({amountMinor:event.amountMinor,currency:"MAD"}));});
it("keeps unknown-reference operations unresolved when positive correlation is unsupported",async()=>{
 const f=fixture(),gateway={call:vi.fn(async()=>({paymentId:event.paymentId,provider:event.provider,operations:[{operationId:"op",kind:"checkout",reference:null}]}))};
 expect(await new BillingPayments(f.provider,{call:gateway.call as never}).recover(event.paymentId,"op")).toEqual({state:"reconciliation-required"});expect(f.provider.checkout).not.toHaveBeenCalled();expect(f.provider.reconcile).not.toHaveBeenCalled();
});
it("admits only a positively verified matching operation recovery event",async()=>{
 const f=fixture();f.provider.reconcileOperation=vi.fn(async()=>event);
 const call=vi.fn(async(p:{action:string})=>p.action==="recovery-context"?{paymentId:event.paymentId,provider:event.provider,operations:[{operationId:"op",kind:"checkout",reference:null}]}:true);
 await new BillingPayments(f.provider,{call:call as never}).recover(event.paymentId,"op");expect(call).toHaveBeenLastCalledWith({action:"event",...event});expect(f.provider.checkout).not.toHaveBeenCalled();
});
it("reconciles only a matching verified provider payment",async()=>{const f=fixture();await f.engine.reconcile(event.paymentId,"ref");expect(f.call).toHaveBeenCalledWith({action:"event",...event});vi.mocked(f.provider.reconcile).mockResolvedValue({...event,paymentId:"foreign"});await expect(f.engine.reconcile(event.paymentId,"ref")).rejects.toThrow();});
it("normalizes verified events and discards extra provider payload properties",async()=>{const f=fixture();vi.mocked(f.provider.reconcile).mockResolvedValue({...event,action:"prepare"} as VerifiedPaymentEvent);await f.engine.reconcile(event.paymentId,"ref");expect(f.call).toHaveBeenCalledWith({action:"event",...event});});
