import type { OperationsRepository } from "../operations/repository";
import { teamInvitation } from "../operations/invitation";
import { derivedRequest } from "../operations/logo";
import type { Locale } from "../i18n/locales";
import { seal } from "./secrets";
import { email, type Material } from "./model";
import { OperationFault } from "../operations/model";
export async function queueTeamEmail(repo: OperationsRepository, agencyId: string, invitationId: string, requestId: string, locale: Locale, origin: string, secret: string, config: { encryptionKey: string; keyId: string }) {
 const context=await repo.call<{id:string;email:string;digest:string;agencyName:string;expiresAt:string;deliveryState:string|null}>(agencyId,"invite-context",{invitationId});
 if(context.deliveryState)return {state:context.deliveryState};
 const {token,digest}=teamInvitation(secret,agencyId,context.id),jobId=derivedRequest(context.id,"team-email");
 if(digest!==context.digest)throw new OperationFault("conflict"); // Revoke/reissue if the invitation key was rotated.
 const material:Material={version:1,locale,agencyName:context.agencyName,recipient:email(context.email),replyTo:null,purpose:"team-invitation",link:`${origin}/${locale}/app/team/accept#token=${token}`,code:null,expiresAt:context.expiresAt,reference:""};
 const envelope=seal(material,config.encryptionKey,config.keyId,`${agencyId}|${context.id}|${jobId}|team-invitation`,context.expiresAt);
 return repo.call(agencyId,"invite-email",{requestId,invitationId,jobId,envelope});
}
