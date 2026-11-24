import { SigningFault, type Assurance, type SigningRepository } from "./model";
import { randomUUID } from "node:crypto";
export type ProviderCapabilities = { id: string; assurances: Exclude<Assurance,"simple">[]; sequential: boolean; immutableBytes: boolean; idempotency: boolean; reconciliation: boolean; authenticatedWebhooks: boolean; evidenceExport: boolean; independentlyVerifiedResults: boolean };
export interface SignatureProvider {
  capabilities: ProviderCapabilities;
  dispatch(operation: { id: string; checksum: string; party: "agency" | "client" }): Promise<{ outcome: "accepted"; transactionId: string } | { outcome: "rejected" } | { outcome: "unknown" }>;
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
export class ProviderCoordinator {
  constructor(private repo: SigningRepository) {}
  async dispatch(agencyId: string, sessionId: string, provider: SignatureProvider, operation: { id: string; checksum: string; party: "agency" | "client" }) {
    // Durable claim precedes the external effect. Unknown outcomes must be reconciled, never redispatched.
    const session=await this.repo.call<{version:number}>(agencyId,"get",{sessionId});
    const claim=await this.repo.call<{version:number}>(agencyId,"provider-claim",{ sessionId,version:session.version,requestId:randomUUID(), providerId: provider.capabilities.id, operation });
    let result; try { result = await provider.dispatch(operation); } catch { result = { outcome: "unknown" as const }; }
    await this.repo.call(agencyId,"provider-result",{ sessionId,version:claim.version,requestId:operation.id, operationId: operation.id, ...result }); return result;
  }
  async reconcile(agencyId:string,sessionId:string,operationId:string,provider:SignatureProvider){
    const operation=await this.repo.call<{id:string;transactionId:string|null;version:number;providerId:string}>(agencyId,"provider-read",{sessionId,operationId});
    if(operation.providerId!==provider.capabilities.id)throw new SigningFault("forbidden");
    let result;try{result=await provider.reconcile({id:operation.id,transactionId:operation.transactionId});}catch{result={outcome:"unknown" as const};}
    return this.repo.call(agencyId,"provider-reconciled",{sessionId,operationId,version:operation.version,requestId:randomUUID(),outcome:result.outcome});
  }
}
