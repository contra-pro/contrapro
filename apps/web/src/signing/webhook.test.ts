import { expect,it,vi } from "vitest";
vi.mock("server-only",()=>({}));
import { admitProviderWebhook } from "./webhook";
import type { SignatureProvider } from "./providers";
import type { SigningRepository } from "./model";
it("authenticates exact callback bytes before admitting an observation",async()=>{
  const calls:string[]=[];const bytes=new Uint8Array([1,2,3]);
  const provider={capabilities:{id:"fixture"},authenticateWebhook:async(actual:Uint8Array)=>{expect(actual).toBe(bytes);calls.push("authenticate");return {eventId:"event",operationId:"op",transactionId:"transaction",disposition:"observation"};}} as unknown as SignatureProvider;
  const repo:SigningRepository={async call<T>(_a:string|null,action:string,input:object){calls.push(action);expect(input).toMatchObject({providerId:"fixture",eventId:"event"});return {signatureVerified:false} as T;}};
  expect(await admitProviderWebhook(provider,bytes,new Headers(),repo)).toEqual({signatureVerified:false});expect(calls).toEqual(["authenticate","provider-webhook"]);
});
it("never admits unauthenticated callbacks or oversized bodies",async()=>{const call=vi.fn();const provider={capabilities:{id:"fixture"},authenticateWebhook:async()=>null} as unknown as SignatureProvider;
  await expect(admitProviderWebhook(provider,new Uint8Array([1]),new Headers(),{call})).rejects.toThrow("forbidden");expect(call).not.toHaveBeenCalled();
  await expect(admitProviderWebhook(provider,new Uint8Array(65537),new Headers(),{call})).rejects.toThrow("invalid");});
