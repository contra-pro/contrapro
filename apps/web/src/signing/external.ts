import type { PrivateStorage } from "../documents/storage";
import { objectKey } from "../documents/storage";
import { digest } from "./crypto";
import { SigningFault,uuid,type Session,type SigningRepository } from "./model";
import { selectProvider,type SignatureProvider } from "./providers";

export type ExternalOperation={id:string;transactionId:string|null;providerId:string;version:number;operation:{checksum:string;party:"agency"|"client"}};
export type ExternalResult={state:"pending"|"unknown"|"rejected"}|{state:"completed";bytes:Uint8Array;evidence:Uint8Array;transactionId:string};
export interface ExternalSignatureProvider extends SignatureProvider {
  retrieveResult(operation:{id:string;transactionId:string|null}):Promise<ExternalResult>;
  hostedUrl?(operation:{id:string;transactionId:string|null}):Promise<string|null>;
  trustedHostedOrigins?:readonly string[];
}
/** A separately implemented, reviewed provider/trust profile. Never use callback
 * claims as verification. No implementation or trust anchors are enabled here. */
export interface IndependentSignatureVerifier {
  verify(input:{session:Session;operation:ExternalOperation;original:Uint8Array;previous:Uint8Array|null;result:Extract<ExternalResult,{state:"completed"}>}):Promise<{
    valid:true;providerId:string;transactionId:string;party:"agency"|"client";assurance:Session["assurance"];originalChecksum:string;previousChecksum:string|null;signedChecksum:string;evidenceChecksum:string;
    identityVerified:true;consentVerified:true;sequenceVerified:true;trustVerified:true;profileVersion:string;
  }|null>;
}
export class ExternalCompletion {
  constructor(private repo:SigningRepository,private store:PrivateStorage){}
  async hostedLink(agencyId:string,sessionId:string,operationId:string,provider:ExternalSignatureProvider){
    uuid(agencyId,sessionId,operationId);
    const session=await this.repo.call<Session>(agencyId,"get",{sessionId});
    selectProvider(session.assurance,session.providerId,[provider]);
    if(["completed","cancelled","expired","failed","declined"].includes(session.state))throw new SigningFault("conflict");
    const op=await this.repo.call<ExternalOperation>(agencyId,"provider-read",{sessionId,operationId});
    if(op.providerId!==provider.capabilities.id||!provider.hostedUrl)throw new SigningFault("unsupported-assurance");
    const value=await provider.hostedUrl({id:op.id,transactionId:op.transactionId});
    if(!value||value.length>2048)throw new SigningFault("reconciliation-required");
    let url:URL;try{url=new URL(value);}catch{throw new SigningFault("forbidden");}
    if(url.protocol!=="https:"||url.username||url.password||!provider.trustedHostedOrigins?.includes(url.origin))throw new SigningFault("forbidden");
    return url.href;
  }
  async complete(agencyId:string,sessionId:string,operationId:string,provider:ExternalSignatureProvider,verifier:IndependentSignatureVerifier){
    uuid(agencyId,sessionId,operationId);
    const session=await this.repo.call<Session>(agencyId,"get",{sessionId});
    selectProvider(session.assurance,session.providerId,[provider]);
    if(session.assurance==="simple")throw new SigningFault("unsupported-assurance");
    const operation=await this.repo.call<ExternalOperation>(agencyId,"provider-read",{sessionId,operationId});
    if(operation.providerId!==provider.capabilities.id||operation.operation.checksum!==session.original.checksum)throw new SigningFault("modified-document");
    if(session.state==="completed")return session;
    if(operation.operation.party==="agency"&&session.agencySignature&&"operationId" in session.agencySignature&&session.agencySignature.operationId===operationId)return session;
    if(operation.operation.party==="client"&&!session.agencySignature)throw new SigningFault("conflict");
    const result=await provider.retrieveResult({id:operation.id,transactionId:operation.transactionId});
    if(result.state!=="completed")throw new SigningFault("reconciliation-required");
    if(!result.bytes.length||result.bytes.length>10*1024*1024||new TextDecoder().decode(result.bytes.subarray(0,5))!=="%PDF-"||!result.evidence.length||result.evidence.length>65536)throw new SigningFault("invalid");
    if(operation.transactionId&&operation.transactionId!==result.transactionId)throw new SigningFault("modified-document");
    const original=await this.store.get(session.original.key),previous=session.intermediate?await this.store.get(session.intermediate.key):null;
    if(digest(original)!==session.original.checksum||previous&&digest(previous)!==session.intermediate?.checksum)throw new SigningFault("modified-document");
    const proof=await verifier.verify({session,operation,original,previous,result});
    if(!proof||proof.valid!==true||proof.providerId!==session.providerId||proof.transactionId!==result.transactionId||proof.party!==operation.operation.party||proof.assurance!==session.assurance||
      proof.originalChecksum!==session.original.checksum||proof.previousChecksum!==(session.intermediate?.checksum??null)||proof.signedChecksum!==digest(result.bytes)||proof.evidenceChecksum!==digest(result.evidence)||
      proof.identityVerified!==true||proof.consentVerified!==true||proof.sequenceVerified!==true||proof.trustVerified!==true||!/^[A-Za-z0-9._-]{1,80}$/.test(proof.profileVersion))throw new SigningFault("modified-document");
    const key=objectKey(agencyId,"issued",sessionId,proof.signedChecksum,"pdf"),input={sessionId,operationId,version:session.version,requestId:operationId,key,checksum:proof.signedChecksum,proof};
    await this.repo.call(agencyId,"external-stage",input);
    // Do not load/re-save provider PDF bytes: that could invalidate cryptographic signatures.
    await this.store.put(key,result.bytes,"application/pdf");
    return this.repo.call<Session>(agencyId,"external-complete",input);
  }
}
