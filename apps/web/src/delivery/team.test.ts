import { expect, it, vi } from "vitest";
import { queueTeamEmail } from "./team";
import { unseal } from "./secrets";
import { message } from "./messages";
import type { Material } from "./model";
import type { OperationsRepository } from "../operations/repository";
import { teamInvitation } from "../operations/invitation";
const aid="10000000-0000-4000-8000-000000000001",inv="10000000-0000-4000-8000-000000000002",req="10000000-0000-4000-8000-000000000003";
it("queues an encrypted team invitation in the existing delivery infrastructure without sending mail",async()=>{
 const expiresAt=new Date(Date.now()+86400000).toISOString(),key="b".repeat(64),call=vi.fn(async(_aid,action,input)=>action==="invite-context"?{id:inv,email:"invitee@example.com",digest:teamInvitation("a".repeat(64),aid,inv).digest,agencyName:"Atlas",expiresAt,deliveryState:null}:input);
 await queueTeamEmail({call},aid,inv,req,"ar","https://contratpro.example","a".repeat(64),{encryptionKey:key,keyId:"v1"});
 const input=call.mock.calls[1]![2] as {jobId:string;envelope:Parameters<typeof unseal>[0]};
 const material=unseal<Material>(input.envelope,key,"v1",`${aid}|${inv}|${input.jobId}|team-invitation`);
 expect(material.purpose).toBe("team-invitation");expect(material.link).toContain("/ar/app/team/accept#token=");expect(message(material).subject).toContain("فريق");
 expect(JSON.stringify(input.envelope)).not.toContain(material.link);expect(call.mock.calls.map(c=>c[1])).toEqual(["invite-context","invite-email"]);
});
it("does not regenerate ciphertext or duplicate an already queued invitation",async()=>{
 const call=vi.fn(async()=>({deliveryState:"queued"}));expect(await queueTeamEmail({call:call as OperationsRepository["call"]},aid,inv,req,"fr","https://contratpro.example","a".repeat(64),{encryptionKey:"b".repeat(64),keyId:"v1"})).toEqual({state:"queued"});expect(call).toHaveBeenCalledTimes(1);
});
it("refuses to queue an invalid link after gateway-key rotation",async()=>{
 const call=vi.fn(async()=>({id:inv,email:"invitee@example.com",digest:teamInvitation("b".repeat(64),aid,inv).digest,agencyName:"Atlas",expiresAt:new Date(Date.now()+86400000).toISOString(),deliveryState:null}));
 await expect(queueTeamEmail({call:call as OperationsRepository["call"]},aid,inv,req,"fr","https://contratpro.example","a".repeat(64),{encryptionKey:"b".repeat(64),keyId:"v1"})).rejects.toThrow("conflict");expect(call).toHaveBeenCalledTimes(1);
});
