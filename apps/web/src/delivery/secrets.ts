import { createCipheriv,createDecipheriv,createHmac,randomBytes } from "node:crypto";
import { DeliveryFault,type Envelope } from "./model";
export function keyed(secret:string,text:string){if(!/^[a-f0-9]{64}$/.test(secret))throw new DeliveryFault("unavailable");return createHmac("sha256",Buffer.from(secret,"hex")).update(text).digest("hex");}
export function deliveryId(secret:string,scope:string){const h=keyed(secret,`id|${scope}`);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
export function seal(value:unknown,secret:string,keyId:string,aad:string,expiresAt:string):Envelope {keyed(secret,"validate");if(!/^[A-Za-z0-9_-]{1,40}$/.test(keyId)||!Number.isFinite(Date.parse(expiresAt)))throw new DeliveryFault("invalid");
  const nonce=randomBytes(12),cipher=createCipheriv("aes-256-gcm",Buffer.from(secret,"hex"),nonce);cipher.setAAD(Buffer.from(`${aad}|${keyId}|${expiresAt}`));
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),"utf8"),cipher.final()]);return {version:1,keyId,nonce:nonce.toString("base64"),tag:cipher.getAuthTag().toString("base64"),ciphertext:encrypted.toString("base64"),expiresAt};}
export function unseal<T>(value:Envelope,secret:string,keyId:string,aad:string,now=Date.now()):T {if(value.version!==1||value.keyId!==keyId||Date.parse(value.expiresAt)<=now||!Number.isFinite(Date.parse(value.expiresAt)))throw new DeliveryFault("expired");
  try {keyed(secret,"validate");if(value.ciphertext.length>65536)throw Error();const nonce=Buffer.from(value.nonce,"base64"),tag=Buffer.from(value.tag,"base64");if(nonce.length!==12||tag.length!==16)throw Error();
    const decipher=createDecipheriv("aes-256-gcm",Buffer.from(secret,"hex"),nonce);decipher.setAAD(Buffer.from(`${aad}|${keyId}|${value.expiresAt}`));decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext,"base64")),decipher.final()]).toString("utf8")) as T;
  }catch{throw new DeliveryFault("invalid");}}
