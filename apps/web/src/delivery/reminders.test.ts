import { expect,it } from "vitest";
import { reminderPolicy } from "./reminders";
import { DeliveryService,type DeliveryConfig,type QueuedJob,type ReminderClaim } from "./service";
import { seal,unseal } from "./secrets";
import type { DeliveryRepository,Material } from "./model";
it("requires an explicit bounded reminder policy, without commercial defaults",()=>{
  expect(reminderPolicy({enabled:true,manualEnabled:true,intervals:[15,60],maxCount:2,revision:0})).toMatchObject({intervals:[15,60]});
  for(const intervals of [[],[0],[60,15],[15,15],[1.5],[10081]])expect(()=>reminderPolicy({enabled:true,manualEnabled:true,intervals,maxCount:2,revision:0})).toThrow("invalid");
});
it("reseals only invitation link material into a stable reminder identity without reading a code",async()=>{
 const agencyId="11111111-1111-4111-8111-111111111111",sessionId="22222222-2222-4222-8222-222222222222",seedId="33333333-3333-4333-8333-333333333333",tokenHash="d".repeat(64),expiresAt="2030-01-01T00:00:00Z";
 const config:DeliveryConfig={gatewaySecret:"a".repeat(64),encryptionKey:"b".repeat(64),signingSecret:"",derivationKey:"d".repeat(64),keyId:"fixture",origin:"https://example.test"};
 const material:Material={version:1,purpose:"invitation",locale:"fr",agencyName:"Fixture",recipient:"client@example.test",replyTo:null,link:"https://example.test/fr/sign#token=private-fixture",code:null,expiresAt,reference:"FIXTURE"};
 const claim={agencyId,sessionId,tokenHash,ordinal:1,lease:seedId,seed:{id:seedId,channel:"email"},context:{agencyId,sessionId,originalChecksum:"e".repeat(64),invitation:{hash:tokenHash,expiresAt}},envelope:seal(material,config.encryptionKey,config.keyId,`${agencyId}|${sessionId}|${seedId}|invitation`,expiresAt)} as ReminderClaim;
 const jobs:QueuedJob[]=[],repo:DeliveryRepository={async call<T>(_a:string|null,action:string,input:object){expect(action).toBe("reminder-publish");jobs.push((input as {jobs:QueuedJob[]}).jobs[0]!);return null as T;}};
 const service=new DeliveryService(repo,config);await service.automaticReminder(claim);await service.automaticReminder(claim);
 expect(jobs[0]!.id).toBe(jobs[1]!.id);expect(jobs[0]!.intentHash).toBe(jobs[1]!.intentHash);expect(JSON.stringify(jobs)).not.toContain("private-fixture");
 expect(unseal<Material>(jobs[0]!.envelope,config.encryptionKey,config.keyId,`${agencyId}|${sessionId}|${jobs[0]!.id}|reminder`)).toMatchObject({purpose:"reminder",code:null});
});
