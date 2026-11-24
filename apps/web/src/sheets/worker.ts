import { createHash } from "node:crypto";
import { SheetsFault,row,type Claim,type Repository,type Destination } from "./model";
import type { GoogleSheets } from "./google";
import type { GoogleOAuth } from "./oauth";
export const fingerprint=(v:string[])=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
export class SheetsWorker {
  constructor(private repo:Repository,private oauth:Pick<GoogleOAuth,"access">,private google:Pick<GoogleSheets,"write"|"inspect">){}
  async tick(){
    const next=await this.repo.call<{agencyId:string|null}>(null,"next",{});if(!next.agencyId)return false;
    const claim=await this.repo.call<Claim|null>(next.agencyId,"claim",{});if(!claim)return false;
    const {agencyId,contractId,lease}=claim,values=row(claim.snapshot,claim.destination,claim.syncAt);
    const armed=await this.repo.call<boolean>(agencyId,"arm",{contractId,lease,fingerprint:fingerprint(values)});if(!armed)return false;
    let state="failed",code:string|undefined,metadataId:number|undefined;
    try{const token=await this.oauth.access(agencyId);metadataId=await this.google.write(token,agencyId,claim.destination,values,claim.known);state="synchronized";}
    catch(e){code=e instanceof SheetsFault?e.code:"uncertain";if(code==="uncertain")state="reconciliation-required";
      if(code==="revoked"){const credential=await this.repo.call<{revision:number}>(agencyId,"credentials",{});await this.repo.call(agencyId,"revoked",{revision:credential.revision});}}
    // A failed result write leaves an armed lease: expiry quarantines it.
    await this.repo.call(agencyId,"result",{contractId,lease,state,code,metadataId});return true;
  }
  async reconcile(agencyId:string,contractId:string){
    const context=await this.repo.call<{destination:Destination;sequence:number;fingerprint:string;lease:string}>(agencyId,"reconcile-context",{contractId});
    const token=await this.oauth.access(agencyId),existing=await this.google.inspect(token,agencyId,context.destination,`${agencyId}:${contractId}`);
    // Absence is not proof an old timed-out request cannot still arrive. Never insert.
    if(!existing||Number(existing.values[1])!==context.sequence||fingerprint(existing.values)!==context.fingerprint)throw new SheetsFault("conflict");
    await this.repo.call(agencyId,"reconciled",{contractId,lease:context.lease,state:"synchronized",metadataId:existing.metadataId});
  }
}
