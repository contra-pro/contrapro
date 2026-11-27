import { SigningFault, type Assurance, type SigningRepository } from "./model";
import { randomUUID } from "node:crypto";
import type { PrivateStorage } from "../documents/storage";
import { digest } from "./crypto";
export type ProviderCapabilities = { id: string; assurances: Exclude<Assurance,"simple">[]; sequential: boolean; immutableBytes: boolean; idempotency: boolean; reconciliation: boolean; authenticatedWebhooks: boolean; evidenceExport: boolean; independentlyVerifiedResults: boolean };
export interface SignatureProvider {
  capabilities: ProviderCapabilities;
  dispatch(operation: { id: string; checksum: string; party: "agency" | "client";document?:Uint8Array;documentChecksum?:string;sessionId?:string }): Promise<{ outcome: "accepted"; transactionId: string } | { outcome: "rejected" } | { outcome: "unknown" }>;
  authenticateWebhook(bytes: Uint8Array, headers: Headers): Promise<{ eventId: string; transactionId: string; operationId: string; disposition: "observation" } | null>;
  reconcile(operation: {id:string;transactionId:string|null}): Promise<{ outcome: "pending" | "rejected" | "unknown" }>;
}
export function selectProvider(requested: Assurance, id: string | null, providers: readonly SignatureProvider[]) {
  if (requested === "simple") { if (id !== null) throw new SigningFault("unsupported-assurance"); return null; }
  const provider = providers.find(p => p.capabilities.id === id), c = provider?.capabilities;
  if (!provider || !c?.assurances.includes(requested) || !c.sequential || !c.immutableBytes || !c.idempotency || !c.reconciliation || !c.authenticatedWebhooks || !c.evidenceExport || !c.independentlyVerifiedResults) throw new SigningFault("unsupported-assurance");
  return provider;
}
/** Empty in production until provider-specific integration and legal/profile review. */
export const configuredProviders: readonly SignatureProvider[] = [];
export function discoverProviders(providers:readonly SignatureProvider[]=configuredProviders){
  return providers.flatMap(p=>{
    const assurances=p.capabilities.assurances.filter(a=>{try{return selectProvider(a,p.capabilities.id,[p])!==null;}catch{return false;}});
    return assurances.length?[{...p.capabilities,assurances}]:[];
  });
}
export class ProviderCoordinator {
  constructor(private repo: SigningRepository,private store?:PrivateStorage) {}
  async submit(agencyId:string,sessionId:string,provider:SignatureProvider,operation:{id:string;checksum:string;party:"agency"|"client"}){
    if(!this.store)throw new SigningFault("unavailable");
    const s=await this.repo.call<import("./model").Session>(agencyId,"get",{sessionId});selectProvider(s.assurance,s.providerId,[provider]);
    if(s.assurance==="simple"||operation.checksum!==s.original.checksum)throw new SigningFault("unsupported-assurance");
    let document=await this.store.get(s.original.key);if(digest(document)!==operation.checksum)throw new SigningFault("modified-document");
    if(operation.party==="client"){
      if(!s.agencySignature||!s.intermediate)throw new SigningFault("conflict");
      document=await this.store.get(s.intermediate.key);if(digest(document)!==s.intermediate.checksum)throw new SigningFault("modified-document");
    }
    return this.dispatch(agencyId,sessionId,provider,operation,document);
  }
  async dispatch(agencyId: string, sessionId: string, provider: SignatureProvider, operation: { id: string; checksum: string; party: "agency" | "client" },document?:Uint8Array) {
    // Durable claim precedes the external effect. Unknown outcomes must be reconciled, never redispatched.
    const session=await this.repo.call<{version:number}>(agencyId,"get",{sessionId});
    const claim=await this.repo.call<{version:number}>(agencyId,"provider-claim",{ sessionId,version:session.version,requestId:randomUUID(), providerId: provider.capabilities.id, operation });
    let result; try { result = await provider.dispatch({...operation,...(document?{document,documentChecksum:digest(document),sessionId}:{})}); } catch { result = { outcome: "unknown" as const }; }
    await this.repo.call(agencyId,"provider-result",{ sessionId,version:claim.version,requestId:operation.id, operationId: operation.id, ...result }); return result;
  }
  async reconcile(agencyId:string,sessionId:string,operationId:string,provider:SignatureProvider){
    const operation=await this.repo.call<{id:string;transactionId:string|null;version:number;providerId:string}>(agencyId,"provider-read",{sessionId,operationId});
    if(operation.providerId!==provider.capabilities.id)throw new SigningFault("forbidden");
    let result;try{result=await provider.reconcile({id:operation.id,transactionId:operation.transactionId});}catch{result={outcome:"unknown" as const};}
    return this.repo.call(agencyId,"provider-reconciled",{sessionId,operationId,version:operation.version,requestId:randomUUID(),outcome:result.outcome});
  }
}
