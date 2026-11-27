import { createHash, createHmac } from "node:crypto";
import { isUuid } from "../../../../packages/application/src/agency-management";
import { OperationFault } from "./model";
export function teamInvitation(secret: string, agencyId: string, requestId: string) {
  if (!/^[a-f0-9]{64}$/.test(secret)) throw new OperationFault("unavailable");
  if (![agencyId, requestId].every(isUuid)) throw new OperationFault("invalid");
  const token = createHmac("sha256", Buffer.from(secret, "hex")).update(`team-invitation-v1|${agencyId}|${requestId}`).digest("hex");
  return { token, digest: invitationDigest(token) };
}
export function invitationDigest(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new OperationFault("invalid");
  return createHash("sha256").update(token).digest("hex");
}
