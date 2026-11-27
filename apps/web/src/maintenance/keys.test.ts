import { expect,it } from "vitest";
import { keyRing,openEnvelope,rotateEnvelope } from "./keys";
import { seal } from "../delivery/secrets";
import { validateKeyReferences } from "./readiness";
it("reads historical AEAD keys, rotates without changing expiry/scope, and fails closed if missing",()=>{
 const ring=keyRing("new","b".repeat(64),JSON.stringify({old:"a".repeat(64)})),expires="2030-01-01T00:00:00Z",old=seal({fixture:"secret"},"a".repeat(64),"old","tenant|record",expires);
 expect(openEnvelope(old,ring,"tenant|record")).toEqual({fixture:"secret"});
 const next=rotateEnvelope(old,ring,"tenant|record");expect(next.keyId).toBe("new");expect(next.expiresAt).toBe(expires);expect(openEnvelope(next,ring,"tenant|record")).toEqual({fixture:"secret"});
 expect(()=>openEnvelope(old,keyRing("new","b".repeat(64)),"tenant|record")).toThrow("unavailable");expect(()=>openEnvelope(next,ring,"other|record")).toThrow();
});
it("rejects malformed key maps and never extends expired invitation material",()=>{
 for(const map of ["not-json",'[]',JSON.stringify({old:"short"}),JSON.stringify({active:"a".repeat(64)})])expect(()=>keyRing("active","b".repeat(64),map)).toThrow("unavailable");
 const expired=seal({code:"fixture"},"a".repeat(64),"old","scope","2020-01-01T00:00:00Z");expect(()=>rotateEnvelope(expired,keyRing("new","b".repeat(64),JSON.stringify({old:"a".repeat(64)})),"scope")).toThrow("expired");
});
it("blocks readiness when a retained record still needs a retired key",()=>{
 const env={CONTRATPRO_DELIVERY_KEY_ID:"new",CONTRATPRO_DELIVERY_ENCRYPTION_KEY:"b".repeat(64)};
 expect(()=>validateKeyReferences({delivery:{old:1}},env)).toThrow("historical_key");
 expect(()=>validateKeyReferences({delivery:{old:1}},{...env,CONTRATPRO_DELIVERY_HISTORICAL_KEYS:JSON.stringify({old:"a".repeat(64)})})).not.toThrow();
});
