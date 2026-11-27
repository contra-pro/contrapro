import { expect,it,vi } from "vitest";
import { ExternalCompletion,type ExternalSignatureProvider,type IndependentSignatureVerifier } from "./external";
import { digest } from "./crypto";
import type { Session,SigningRepository } from "./model";
const aid="11111111-1111-4111-8111-111111111111",sid="22222222-2222-4222-8222-222222222222",oid="33333333-3333-4333-8333-333333333333";
function fixture(){
 const original=new TextEncoder().encode("original fixture"),signed=new TextEncoder().encode("%PDF-1.7 unchanged signed fixture bytes"),evidence=new TextEncoder().encode("verified fixture evidence"),checksum=digest(original);
 const session={id:sid,agencyId:aid,state:"reconciliation_required",version:3,assurance:"external-advanced",providerId:"fixture",agencySignature:null,intermediate:null,original:{key:"original",checksum}} as Session;
 const op={id:oid,providerId:"fixture",transactionId:"transaction",version:3,operation:{checksum,party:"agency" as const}};
 const provider:ExternalSignatureProvider={capabilities:{id:"fixture",assurances:["external-advanced"],sequential:true,immutableBytes:true,idempotency:true,reconciliation:true,authenticatedWebhooks:true,evidenceExport:true,independentlyVerifiedResults:true},dispatch:async()=>({outcome:"unknown"}),authenticateWebhook:async()=>null,reconcile:async()=>({outcome:"unknown"}),retrieveResult:async()=>({state:"completed",bytes:signed,evidence,transactionId:"transaction"})};
 const proof={valid:true as const,providerId:"fixture",transactionId:"transaction",party:"agency" as const,assurance:"external-advanced" as const,originalChecksum:checksum,previousChecksum:null,signedChecksum:digest(signed),evidenceChecksum:digest(evidence),identityVerified:true as const,consentVerified:true as const,sequenceVerified:true as const,trustVerified:true as const,profileVersion:"fixture-v1"};
 const verifier:IndependentSignatureVerifier={verify:vi.fn(async()=>proof)},calls:string[]=[],put=vi.fn(async()=>{});
 const repo:SigningRepository={async call<T>(_aid:string|null,action:string){calls.push(action);return (action==="get"?session:action==="provider-read"?op:session) as T;}};
 const engine=new ExternalCompletion(repo,{get:async()=>original,put,remove:async()=>{}});
 return {engine,provider,verifier,proof,signed,put,calls};
}
it("requires independent result verification and stores exactly the provider's bytes",async()=>{
 const f=fixture();await f.engine.complete(aid,sid,oid,f.provider,f.verifier);
 expect(f.put.mock.calls[0]).toEqual(expect.arrayContaining([f.signed]));expect(f.calls).toEqual(["get","provider-read","external-stage","external-complete"]);
});
it("rejects wrong-document, untrusted and wrong-party proofs without publishing",async()=>{
 for(const change of [{originalChecksum:"0".repeat(64)},{trustVerified:false},{party:"client"},{signedChecksum:"0".repeat(64)}]){
  const f=fixture();f.verifier.verify=vi.fn(async()=>({...f.proof,...change}) as never);
  await expect(f.engine.complete(aid,sid,oid,f.provider,f.verifier)).rejects.toThrow("modified-document");expect(f.put).not.toHaveBeenCalled();
 }
});
it("does not finalize after failed storage or downgrade pending external results",async()=>{
 const f=fixture();f.put.mockRejectedValue(Error("upload failure"));await expect(f.engine.complete(aid,sid,oid,f.provider,f.verifier)).rejects.toThrow();expect(f.calls).not.toContain("external-complete");
 const pending=fixture();pending.provider.retrieveResult=async()=>({state:"pending"});await expect(pending.engine.complete(aid,sid,oid,pending.provider,pending.verifier)).rejects.toThrow("reconciliation-required");expect(pending.put).not.toHaveBeenCalled();
});
