import { isRecord, isUuid } from "../../../../packages/application/src/agency-management";
import type { Artifact, Zone } from "../documents/model";
export class SigningFault extends Error {
  constructor(readonly code: "invalid" | "forbidden" | "not-found" | "conflict" | "expired" | "consumed" | "rate-limited" | "verification-failed" | "unsupported-assurance" | "modified-document" | "unavailable" | "reconciliation-required" | "quota" | "restricted") { super(code); }
}
export const states = ["awaiting_agency", "agency_signed", "awaiting_client", "client_signed", "finalization_pending", "completed", "expired", "declined", "cancelled", "failed", "reconciliation_required"] as const;
export type SigningState = typeof states[number];
export type Assurance = "simple" | "external-advanced" | "external-qualified-requested";
export type Capture = { typedName: string; reviewed: true; identityConfirmed: true; consent: true; consentVersion: "simple-fr-v1" | "simple-ar-v1"; reviewedChecksum: string };
export type SignatureRecord = Capture & { method: "typed"; assurance: "simple"; artifactChecksum: string; fontHash: string; at: string; actor: string; authority: string; verification: string };
export type Revision = { key: string; checksum: string };
export type Session = { id: string; agencyId: string; rentalId: string; artifactId: string; version: number; state: SigningState; locale: "fr" | "ar"; assurance: Assurance;
  original: Artifact; clientName: string; clientId: string; expiresAt: string; agencySignature: SignatureRecord | null; clientSignature: SignatureRecord | null;
  intermediate: Revision | null; final: Revision | null; providerId: string | null; clientVerified?:boolean };
export const consent = {
  fr: { version: "simple-fr-v1" as const, text: "Je confirme mon identité déclarée, avoir examiné ce document et vouloir le signer par une signature électronique simple sous forme de mon nom saisi. Cette méthode ne constitue pas une signature électronique qualifiée." },
  ar: { version: "simple-ar-v1" as const, text: "أؤكد هويتي المصرح بها وأنني راجعت هذا المستند وأوافق على توقيعه بتوقيع إلكتروني بسيط عبر كتابة اسمي. هذه الطريقة ليست توقيعاً إلكترونياً مؤهلاً." },
};
export function capture(input: unknown, locale: "fr" | "ar", checksum: string): Capture {
  if (!isRecord(input) || typeof input.typedName !== "string" || input.typedName.trim().length < 2 || input.typedName.length > 100 ||
    /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(input.typedName) || input.reviewed !== true || input.identityConfirmed !== true || input.consent !== true ||
    input.consentVersion !== consent[locale].version || input.reviewedChecksum !== checksum || !/^[a-f0-9]{64}$/.test(checksum)) throw new SigningFault("invalid");
  return { typedName: input.typedName.trim().normalize("NFC"), reviewed: true, identityConfirmed: true, consent: true, consentVersion: consent[locale].version, reviewedChecksum: checksum };
}
export function uuid(...ids: unknown[]) { if (!ids.every(isUuid)) throw new SigningFault("invalid"); }
export function signingZones(zones: Zone[]) {
  if (!Array.isArray(zones) || !zones.length || zones.length > 20 || !["agency","client"].every(p => zones.some(z => z.party === p)) || zones.some(z =>
    !["agency","client"].includes(z.party) || !Number.isInteger(z.page) || z.page < 1 || z.page > 50 || ![z.x,z.y,z.width,z.height].every(Number.isFinite) || z.x < 0 || z.y < 0 || z.width < 30 || z.height < 12)) throw new SigningFault("invalid");
  return zones;
}
export type EvidenceEvent = { sequence: number; previousHash: string; hash: string; event: string };
export interface SigningRepository { call<T>(agencyId: string | null, action: string, input: object): Promise<T> }
