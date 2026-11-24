import { expect,it } from "vitest";
import { invitation } from "../signing/crypto";
import { DeliveryService,type DeliveryConfig,type QueuedJob } from "./service";
import type { DeliveryContext,DeliveryRepository } from "./model";
import { unseal } from "./secrets";
const aid="11111111-1111-4111-8111-111111111111",sid="22222222-2222-4222-8222-222222222222",requestId="33333333-3333-4333-8333-333333333333";
const config:DeliveryConfig={gatewaySecret:"a".repeat(64),encryptionKey:"b".repeat(64),signingSecret:"c".repeat(64),keyId:"v1",origin:"https://app.example.test"};
it("queues separately encrypted link/code payloads without ordinary plaintext persistence",async()=>{const inv=invitation(config.signingSecret,aid,sid,requestId),calls:{action:string;input:object}[]=[],context:DeliveryContext={agencyId:aid,sessionId:sid,rentalId:sid,state:"awaiting_client",locale:"fr",agencyName:"Agence",agencyEmail:"agency@example.test",clientEmail:"client@example.test",clientPhone:"+212612345678",reference:"CTR-1",originalChecksum:"a".repeat(64),invitation:{hash:inv.tokenHash,requestId,expiresAt:"2030-01-01T00:00:00Z"},final:null,eventId:null,eventExpiresAt:null};
  const repo:DeliveryRepository={async call<T>(_a:string|null,action:string,input:object):Promise<T>{calls.push({action,input});return (action==="context"?context:null) as T;}};await new DeliveryService(repo,config).invitation(aid,sid,{requestId,linkChannel:"email",codeChannel:"manual-whatsapp",reminder:false});
  const data=calls.find(c=>c.action==="queue")!.input as {jobs:QueuedJob[]},persisted=JSON.stringify(data);expect(persisted).not.toContain(inv.token);expect(persisted).not.toContain(`"${inv.code}"`);expect(persisted).not.toContain("client@example.test");expect(data.jobs.map(j=>j.channel)).toEqual(["email","manual-whatsapp"]);
  for(const j of data.jobs){const value=unseal<{link:string|null;code:string|null}>(j.envelope,config.encryptionKey,"v1",`${aid}|${sid}|${j.id}|${j.purpose}`);expect(!!value.link&&!!value.code).toBe(false);}
});
