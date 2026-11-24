import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { SigningFault, type EvidenceEvent } from "./model";
export const digest = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
export function mac(secret: string, value: string) { if (!/^[a-f0-9]{64}$/.test(secret)) throw new SigningFault("unavailable"); return createHmac("sha256",Buffer.from(secret,"hex")).update(value).digest("hex"); }
export function invitation(secret: string, agencyId: string, sessionId: string, requestId: string) {
  const token = mac(secret,`invite|${agencyId}|${sessionId}|${requestId}`), tokenHash = digest(token);
  const code = (BigInt(`0x${mac(secret,`code|${tokenHash}`)}`)%100000000n).toString().padStart(8,"0");
  return { token, code, tokenHash, codeHash: mac(secret,`verify|${tokenHash}|${code}`) };
}
export function tokenDigest(raw: unknown) { if (typeof raw!=="string" || !/^[a-f0-9]{64}$/.test(raw)) throw new SigningFault("expired"); return digest(raw); }
export function verifyEvidence(events: EvidenceEvent[]) {
  let previous = "0".repeat(64), sequence=1;
  for (const event of events) {
    const expected = digest(`${previous}|${sequence}|${event.event}`);
    if (event.sequence!==sequence || event.previousHash!==previous || !/^[a-f0-9]{64}$/.test(event.hash) || !timingSafeEqual(Buffer.from(expected,"hex"),Buffer.from(event.hash,"hex"))) throw new SigningFault("modified-document");
    previous=event.hash;sequence++;
  } return previous;
}
