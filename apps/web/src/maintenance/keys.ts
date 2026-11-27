import { isRecord } from "../../../../packages/application/src/agency-management";
import { seal,unseal } from "../delivery/secrets";
import { DeliveryFault,type Envelope } from "../delivery/model";
export type KeyRing={activeId:string;active:string;keys:Readonly<Record<string,string>>};
export function keyRing(activeId:string,active:string,historical="{}"):KeyRing{
 let old:unknown;try{old=JSON.parse(historical);}catch{throw new DeliveryFault("unavailable");}
 if(!/^[A-Za-z0-9_-]{1,40}$/.test(activeId)||!/^[a-f0-9]{64}$/.test(active)||!isRecord(old)||Object.keys(old).length>8||Object.entries(old).some(([id,key])=>!/^[A-Za-z0-9_-]{1,40}$/.test(id)||typeof key!=="string"||!/^[a-f0-9]{64}$/.test(key)||id===activeId&&key!==active))throw new DeliveryFault("unavailable");
 return {activeId,active,keys:Object.freeze({...old,[activeId]:active}) as Readonly<Record<string,string>>};
}
export function openEnvelope<T>(envelope:Envelope,ring:KeyRing,aad:string,now=Date.now()):T{
 const key=Object.hasOwn(ring.keys,envelope.keyId)?ring.keys[envelope.keyId]:undefined;if(!key)throw new DeliveryFault("unavailable");return unseal<T>(envelope,key,envelope.keyId,aad,now);
}
export function rotateEnvelope(envelope:Envelope,ring:KeyRing,aad:string,now=Date.now()):Envelope{
 const value=openEnvelope(envelope,ring,aad,now);if(envelope.keyId===ring.activeId)return envelope;
 return seal(value,ring.active,ring.activeId,aad,envelope.expiresAt);
}
