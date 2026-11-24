import { invitation,digest } from "../signing/crypto";
import { DeliveryFault,deliveryScope,email,phone,separate,type Channel,type DeliveryContext,type DeliveryJob,type DeliveryRepository,type Envelope,type Material,type Purpose } from "./model";
import { deliveryId,keyed,seal,unseal } from "./secrets";
import { message,whatsapp } from "./messages";
export type DeliveryConfig={gatewaySecret:string;encryptionKey:string;keyId:string;signingSecret:string;origin:string};
export type QueuedJob={id:string;eventKey:string;purpose:Purpose;channel:Channel;tokenHash:string|null;grantId:string|null;checksum:string;intentHash:string;envelope:Envelope;expiresAt:string;delayMinutes:number};
export class DeliveryService {
  constructor(private repo:DeliveryRepository,private config:DeliveryConfig){}
  context(agencyId:string,sessionId:string){deliveryScope(agencyId,sessionId);return this.repo.call<DeliveryContext>(agencyId,"context",{sessionId});}
  list(agencyId:string,sessionId:string){deliveryScope(agencyId,sessionId);return this.repo.call<{jobs:DeliveryJob[];events:{id:string;state:string;errorCode:string|null}[];downloads:{id:string;expiresAt:string;revoked:boolean}[]}>(agencyId,"list",{sessionId});}
  private prepare(c:DeliveryContext,eventKey:string,purpose:Purpose,channel:Channel,material:Material,binding:{tokenHash?:string;grantId?:string;checksum:string},delayMinutes=0):QueuedJob {
    const id=deliveryId(this.config.encryptionKey,`${c.agencyId}|${c.sessionId}|${eventKey}|${purpose}|${channel}`),aad=`${c.agencyId}|${c.sessionId}|${id}|${purpose}`;
    return {id,eventKey,purpose,channel,tokenHash:binding.tokenHash??null,grantId:binding.grantId??null,checksum:binding.checksum,expiresAt:material.expiresAt,delayMinutes,intentHash:keyed(this.config.encryptionKey,`intent|${JSON.stringify(material)}`),envelope:seal(material,this.config.encryptionKey,this.config.keyId,aad,material.expiresAt)};
  }
  async invitation(agencyId:string,sessionId:string,input:{linkChannel:Channel;codeChannel:Channel;reminder:boolean;requestId:string}) {
    deliveryScope(agencyId,sessionId,input.requestId);separate(input.linkChannel,input.codeChannel);const c=await this.context(agencyId,sessionId);
    if(c.state!=="awaiting_client"||!c.invitation)throw new DeliveryFault("conflict");const inv=invitation(this.config.signingSecret,agencyId,sessionId,c.invitation.requestId);if(inv.tokenHash!==c.invitation.hash)throw new DeliveryFault("conflict");
    const link=`${this.config.origin}/${c.locale}/sign#token=${inv.token}`,base={version:1 as const,locale:c.locale,agencyName:c.agencyName,replyTo:c.agencyEmail?email(c.agencyEmail):null,expiresAt:c.invitation.expiresAt,reference:c.reference};
    const eventKey=input.reminder?`reminder:${c.invitation.hash}:${input.requestId}`:`invitation:${c.invitation.hash}`;
    const linkJob=this.prepare(c,eventKey,input.reminder?"reminder":"invitation",input.linkChannel,{...base,purpose:input.reminder?"reminder":"invitation",recipient:input.linkChannel==="email"?email(c.clientEmail):phone(c.clientPhone),link,code:null},{tokenHash:inv.tokenHash,checksum:c.originalChecksum},input.reminder?360:0);
    const jobs=[linkJob];if(!input.reminder)jobs.push(this.prepare(c,eventKey,"verification-code",input.codeChannel,{...base,purpose:"verification-code",recipient:phone(c.clientPhone),link:null,code:inv.code},{tokenHash:inv.tokenHash,checksum:c.originalChecksum}));
    return this.repo.call(agencyId,"queue",{sessionId,jobs});
  }
  async final(agencyId:string,sessionId:string,requestId:string,channel:Channel,agencyNotification=false){
    deliveryScope(agencyId,sessionId,requestId);if(!["email","manual-whatsapp"].includes(channel))throw new DeliveryFault("invalid");const c=await this.context(agencyId,sessionId);return this.queueFinal(c,requestId,channel,agencyNotification);
  }
  async queueFinal(c:DeliveryContext,requestId:string,channel:Channel,agencyNotification:boolean){
    if(c.state!=="completed"||!c.final)throw new DeliveryFault("conflict");const grantId=deliveryId(this.config.encryptionKey,`grant|${c.agencyId}|${c.sessionId}|${requestId}`),token=keyed(this.config.gatewaySecret,`download|${c.agencyId}|${c.sessionId}|${grantId}`);
    const grant=await this.repo.call<{id:string;expiresAt:string;checksum:string}>(c.agencyId,"prepare-final",{sessionId:c.sessionId,grantId,tokenHash:digest(token)});
    const base={version:1 as const,locale:c.locale,agencyName:c.agencyName,replyTo:c.agencyEmail?email(c.agencyEmail):null,expiresAt:grant.expiresAt,reference:c.reference};
    const eventKey=`final:${grant.id}`,jobs=[this.prepare(c,eventKey,"final-document",channel,{...base,purpose:"final-document",recipient:channel==="email"?email(c.clientEmail):phone(c.clientPhone),link:`${this.config.origin}/${c.locale}/contract#access=${token}`,code:null},{grantId:grant.id,checksum:grant.checksum})];
    if(agencyNotification&&c.agencyEmail)jobs.push(this.prepare(c,`agency-completed:${c.sessionId}`,"agency-notification","email",{...base,purpose:"agency-notification",recipient:email(c.agencyEmail),link:`${this.config.origin}/${c.locale}/app/rentals/${c.rentalId}`,code:null},{checksum:grant.checksum}));
    return this.repo.call(c.agencyId,"queue",{sessionId:c.sessionId,jobs});
  }
  async material(agencyId:string,jobId:string){deliveryScope(agencyId,jobId);const value=await this.repo.call<{job:DeliveryJob;envelope:Envelope}>(agencyId,"material",{jobId});
    const m=unseal<Material>(value.envelope,this.config.encryptionKey,this.config.keyId,`${agencyId}|${value.job.sessionId}|${jobId}|${value.job.purpose}`);
    if(m.purpose!==value.job.purpose||m.code&&m.link)throw new DeliveryFault("invalid");const text=message(m).text;
    return {job:value.job,message:text,link:m.link,code:m.code,whatsappUrl:value.job.channel==="manual-whatsapp"?whatsapp(m).url:null};
  }
  action(agencyId:string,action:"manual"|"retry"|"cancel"|"revoke"|"purge",input:object){return this.repo.call(agencyId,action,input);}
}
