import type { DeliveryConfig } from "./service";
import { DeliveryService,type ReminderClaim } from "./service";
import { DeliveryFault,type DeliveryContext,type DeliveryJob,type DeliveryRepository,type Envelope,type Material } from "./model";
import { keyRing,openEnvelope } from "../maintenance/keys";
import type { EmailProvider } from "./resend";
export class DeliveryWorker {
  constructor(private repo:DeliveryRepository,private config:DeliveryConfig,private provider:EmailProvider){}
  async reminderOnce(){
    const claim=await this.repo.call<ReminderClaim|null>(null,"reminder-claim",{});if(!claim)return false;
    try{await new DeliveryService(this.repo,this.config).automaticReminder(claim);}
    catch{await this.repo.call(claim.agencyId,"reminder-failed",{tokenHash:claim.tokenHash,ordinal:claim.ordinal,lease:claim.lease}).catch(()=>{});}
    return true;
  }
  async materializeOnce(){const event=await this.repo.call<{id:string;lease:string;context:DeliveryContext}|null>(null,"claim-event",{});if(!event)return false;
    try{await new DeliveryService(this.repo,this.config).queueFinal(event.context,event.id,"email",true);await this.repo.call(event.context.agencyId,"materialize-done",{sessionId:event.context.sessionId,eventId:event.id,lease:event.lease});}
    catch(error){if(error instanceof DeliveryFault&&["invalid","expired","conflict"].includes(error.code))await this.repo.call(event.context.agencyId,"materialize-failed",{sessionId:event.context.sessionId,eventId:event.id,lease:event.lease});}return true;}
  async runOnce(){const claim=await this.repo.call<{job:DeliveryJob;lease:string;envelope:Envelope}|null>(null,"claim",{});if(!claim)return null;
    const {job,lease}=claim;let material:Material;
    try{material=openEnvelope<Material>(claim.envelope,keyRing(this.config.keyId,this.config.encryptionKey,this.config.historicalKeys),`${job.agencyId}|${job.sessionId}|${job.id}|${job.purpose}`);
      if(job.channel!=="email"||material.purpose!==job.purpose||material.code!==null)throw new DeliveryFault("invalid");
    }catch(error){if(error instanceof DeliveryFault&&error.code==="unavailable")throw error;await this.repo.call(null,"arm",{jobId:job.id,lease});return this.repo.call(null,"result",{jobId:job.id,lease,state:"failed",errorCode:"rejected"});}
    // Durable dispatch fence immediately precedes the external side effect.
    await this.repo.call(null,"arm",{jobId:job.id,lease});
    let result;try{result=await this.provider.send(job.id,material);}catch{result={state:"uncertain" as const,retryable:false,errorCode:"transport-unknown" as const};}
    // A failed result write leaves an armed lease, which expires to uncertain.
    return this.repo.call(null,"result",{jobId:job.id,lease,...result});
  }
  async reconcile(jobId:string){const job=await this.repo.call<DeliveryJob>(null,"reconcile-context",{jobId});if(!job.providerId)throw new DeliveryFault("uncertain");const observation=await this.provider.reconcile(job.providerId);if(!observation)throw new DeliveryFault("uncertain");return this.repo.call(null,"reconciled",{jobId,...observation});}
}
