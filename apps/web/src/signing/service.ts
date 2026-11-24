import { randomUUID } from "node:crypto";
import type { PrivateStorage } from "../documents/storage";
import { objectKey } from "../documents/storage";
import { digest, invitation, mac, tokenDigest, verifyEvidence } from "./crypto";
import { capture, SigningFault, signingZones, uuid, type Assurance, type EvidenceEvent, type Session, type SigningRepository } from "./model";
import { signatureFontHash, signaturePdf } from "./pdf";
import { configuredProviders, selectProvider, type SignatureProvider } from "./providers";
export type InvitationDeliveryDraft = { channel: "email"|"manual-whatsapp"; status: "prepared-not-sent"; sessionId: string; invitationRequestId: string; tokenHash: string };
export interface InvitationDeliveryPort { prepare(draft: InvitationDeliveryDraft): Promise<void> }
export class SigningEngine {
  constructor(private repo: SigningRepository,private store: PrivateStorage,private secret: string,private font: Uint8Array=new Uint8Array(),private providers: readonly SignatureProvider[]=configuredProviders) {}
  async create(agencyId: string,input: { artifactId:string;requestId:string;locale:"fr"|"ar";assurance:Assurance;providerId:string|null }) {
    uuid(agencyId,input.artifactId,input.requestId);selectProvider(input.assurance,input.providerId,this.providers);
    return this.repo.call<Session>(agencyId,"create",input);
  }
  list(agencyId:string,rentalId:string) { uuid(agencyId,rentalId);return this.repo.call<Session[]>(agencyId,"list",{rentalId}); }
  async get(agencyId:string|null,sessionId:string|null,token?:string) {
    if(agencyId) uuid(agencyId,sessionId);return this.repo.call<Session>(agencyId,"get",agencyId ? {sessionId} : {tokenHash:tokenDigest(token)});
  }
  private async bytes(key:string,checksum:string) {
    const bytes=await this.store.get(key);if(digest(bytes)!==checksum) throw new SigningFault("modified-document");return bytes;
  }
  async document(agencyId:string|null,sessionId:string|null,token?:string,final=false) {
    const s=agencyId ? await this.get(agencyId,sessionId,token) : await this.repo.call<Session>(null,"document",{tokenHash:tokenDigest(token)});
    if(["cancelled","declined","expired","failed"].includes(s.state) && !agencyId) throw new SigningFault("expired");
    const revision=final || s.state==="completed" ? s.final : s.intermediate ?? {key:s.original.key,checksum:s.original.checksum};
    if(!revision || final && s.state!=="completed") throw new SigningFault("conflict");
    return this.bytes(revision.key,revision.checksum);
  }
  async agencySign(agencyId:string,input:{sessionId:string;version:number;requestId:string;capture:unknown}) {
    uuid(agencyId,input.sessionId,input.requestId);const s=await this.get(agencyId,input.sessionId);
    if(s.state==="agency_signed") return this.repo.call<Session>(agencyId,"agency-sign",{sessionId:s.id,version:input.version,requestId:input.requestId,intent:{captureText:JSON.stringify(capture(input.capture,s.locale,s.original.checksum)),fontHash:signatureFontHash(this.font)}});
    if(s.state!=="awaiting_agency" || s.version!==input.version) throw new SigningFault("conflict");
    signingZones(s.original.signing.zones);const cap=capture(input.capture,s.locale,s.original.checksum),intent={captureText:JSON.stringify(cap),fontHash:signatureFontHash(this.font)};
    const bytes=await signaturePdf(await this.bytes(s.original.key,s.original.checksum),s,{agency:cap.typedName},this.font),checksum=digest(bytes),key=objectKey(agencyId,"issued",s.id,checksum,"pdf");
    await this.repo.call(agencyId,"stage-agency",{sessionId:s.id,version:s.version,requestId:input.requestId,key,checksum,intent});
    await this.store.put(key,bytes,"application/pdf");
    return this.repo.call<Session>(agencyId,"agency-sign",{sessionId:s.id,version:s.version,requestId:input.requestId,intent});
  }
  async invite(agencyId:string,input:{sessionId:string;version:number;requestId:string;renew:boolean},origin:string,locale:"fr"|"ar") {
    uuid(agencyId,input.sessionId,input.requestId);const values=invitation(this.secret,agencyId,input.sessionId,input.requestId);
    const session=await this.repo.call<Session>(agencyId,input.renew ? "renew" : "invite",{sessionId:input.sessionId,version:input.version,requestId:input.requestId,tokenHash:values.tokenHash,codeHash:values.codeHash});
    return {session,url:`${origin}/${locale}/sign#token=${values.token}`,code:values.code,delivery:{channel:"manual-whatsapp",status:"prepared-not-sent",sessionId:session.id,invitationRequestId:input.requestId,tokenHash:values.tokenHash} satisfies InvitationDeliveryDraft};
  }
  async verify(token:string,code:string,requestId:string) {
    uuid(requestId);if(!/^[0-9]{8}$/.test(code)) throw new SigningFault("invalid");const tokenHash=tokenDigest(token),s=await this.get(null,null,token);
    return this.repo.call<{challengeId:string;session:Session}>(null,"verify",{tokenHash,version:s.version,requestId,codeHash:mac(this.secret,`verify|${tokenHash}|${code}`)});
  }
  async clientSign(token:string,input:{version:number;requestId:string;challengeId:string;capture:unknown}) {
    uuid(input.requestId,input.challengeId);const tokenHash=tokenDigest(token),s=await this.repo.call<Session>(null,"document",{tokenHash});
    const cap=capture(input.capture,s.locale,s.intermediate?.checksum ?? "");
    if(cap.typedName.toLowerCase()!==s.clientName.trim().normalize("NFC").toLowerCase()) throw new SigningFault("invalid");
    if(!s.intermediate) throw new SigningFault("conflict");await this.bytes(s.intermediate.key,s.intermediate.checksum);
    // Validate font and placement before consuming the authorization.
    await signaturePdf(await this.bytes(s.original.key,s.original.checksum),s,{agency:s.agencySignature?.typedName ?? "",client:cap.typedName},this.font);
    return this.repo.call<Session>(null,"client-sign",{tokenHash,version:input.version,requestId:input.requestId,challengeId:input.challengeId,captureText:JSON.stringify(cap),fontHash:signatureFontHash(this.font)});
  }
  async command(agencyId:string|null,action:"cancel"|"decline",input:{sessionId?:string;version:number;requestId:string},token?:string) {
    uuid(input.requestId);return this.repo.call<Session>(agencyId,action,{...input,...(agencyId ? {} : {tokenHash:tokenDigest(token)})});
  }
  async finalize(agencyId:string|null,sessionId:string|null,token?:string) {
    let s=await this.get(agencyId,sessionId,token);if(s.state==="completed") return s;
    const auth=agencyId ? {sessionId:s.id} : {tokenHash:tokenDigest(token)};
    try {
      s=await this.repo.call<Session>(agencyId,"finalize-prepare",{...auth,version:s.version,requestId:randomUUID()});
      if(!s.agencySignature || !s.clientSignature) throw new SigningFault("conflict");
      if(s.agencySignature.fontHash!==signatureFontHash(this.font) || s.clientSignature.fontHash!==signatureFontHash(this.font) || !s.intermediate) throw new SigningFault("reconciliation-required");
      await this.bytes(s.intermediate.key,s.intermediate.checksum);
      const original=await this.bytes(s.original.key,s.original.checksum);
      const bytes=await signaturePdf(original,s,{agency:s.agencySignature.typedName,client:s.clientSignature.typedName},this.font),checksum=digest(bytes),key=objectKey(s.agencyId,"issued",s.id,checksum,"pdf");
      await this.repo.call(agencyId,"stage-final",{...auth,version:s.version,requestId:randomUUID(),key,checksum,intent:{originalChecksum:s.original.checksum,agencySignature:s.agencySignature.artifactChecksum,clientSignature:s.clientSignature.artifactChecksum,fontHash:signatureFontHash(this.font)}});
      await this.store.put(key,bytes,"application/pdf");
      return await this.repo.call<Session>(agencyId,"complete",{...auth,version:s.version,requestId:randomUUID(),checksum});
    } catch(error) {
      // Never reverse a successful but uncertain completion. Read before recording failure.
      try { const current=await this.get(agencyId,sessionId,token);if(current.state==="completed") return current;
        if(current.state==="finalization_pending") await this.repo.call(agencyId,"finalize-failed",{...auth,version:current.version,requestId:randomUUID()}); } catch { /* Durable pending state remains recoverable. */ }
      throw error instanceof SigningFault ? error : new SigningFault("reconciliation-required");
    }
  }
  async dossier(agencyId:string,sessionId:string) {
    uuid(agencyId,sessionId);const value=await this.repo.call<{session:Session;events:EvidenceEvent[];signatureArtifacts:Record<string,{text:string;checksum:string}|null>}>(agencyId,"evidence",{sessionId});
    for(const artifact of Object.values(value.signatureArtifacts))if(artifact && digest(artifact.text)!==artifact.checksum)throw new SigningFault("modified-document");
    const head=verifyEvidence(value.events);return {...value,integrity:{algorithm:"sha256-chain",head,independentlyCertifiedTime:false,absoluteTamperProof:false}};
  }
}
