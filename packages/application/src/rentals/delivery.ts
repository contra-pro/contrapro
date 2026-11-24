import { isRecord, isUuid } from "../agency-management";
import { validContractSettings, type ContractSettings } from "./contract-settings";

/** Preparation boundary for the existing PDF/template and future provider ports.
 * Never turns a presentation, drawn signature, or local timestamp into evidence. */
export type RentalDeliveryPreparation = Readonly<{
  schemaVersion: 1; agencyId: string; rentalId: string; version: number;
  document: Readonly<Record<string, unknown>>;
  template: Pick<ContractSettings, "revision" | "template" | "logo" | "primary" | "accent" | "conditions" | "footer">;
  signing: { status: "unsigned"; order: readonly ["agency", "client"]; evidence: null; requiresPersistedArtifactAndDigest: true };
  sheets: { eventKey: string; status: "not-sent" };
}>;
function freeze<T>(value: T): T {
  if (value && typeof value === "object") { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
}
export function prepareRentalDelivery(snapshot: unknown, settings: ContractSettings, scope: { agencyId: string; rentalId: string }): RentalDeliveryPreparation | null {
  if (!isUuid(scope.agencyId) || !isUuid(scope.rentalId) || !validContractSettings(settings) || settings.agencyId !== scope.agencyId || settings.revision < 1) return null;
  if (!isRecord(snapshot) || snapshot.schemaVersion !== 1 || snapshot.agencyId !== scope.agencyId || snapshot.rentalId !== scope.rentalId ||
    typeof snapshot.version !== "number" || !Number.isInteger(snapshot.version) || snapshot.version < 1 || snapshot.version > 2147483647 ||
    typeof snapshot.number !== "string" || !/^CTR-[0-9]{1,4}-[0-9]{4,19}$/.test(snapshot.number) || !isRecord(snapshot.parties) ||
    !isRecord(snapshot.parties.agency) || !isRecord(snapshot.parties.primaryDriver) || !isRecord(snapshot.parties.vehicle) ||
    !isRecord(snapshot.terms) || !["dailyRateMinor", "depositMinor", "totalMinor"].every(field => typeof snapshot.terms === "object" && snapshot.terms !== null &&
      typeof (snapshot.terms as Record<string, unknown>)[field] === "string" && /^(0|[1-9][0-9]{0,18})$/.test((snapshot.terms as Record<string, string>)[field]!)) ||
    !isRecord(snapshot.signatures) || snapshot.signatures.agency !== null || snapshot.signatures.client !== null || snapshot.evidence !== null) return null;
  const eventKey = `${scope.agencyId}:${scope.rentalId}:${snapshot.version}`;
  if (!isRecord(snapshot.sheets) || snapshot.sheets.eventKey !== eventKey || !Array.isArray(snapshot.signatures.order) || snapshot.signatures.order.join(",") !== "agency,client") return null;
  // settings.company must never replace the parties captured at issuance.
  const { revision, template, logo, primary, accent, conditions, footer } = settings;
  return freeze({ schemaVersion: 1, ...scope, version: snapshot.version,
    document: structuredClone(snapshot), template: structuredClone({ revision, template, logo, primary, accent, conditions, footer }),
    signing: { status: "unsigned", order: ["agency", "client"], evidence: null, requiresPersistedArtifactAndDigest: true },
    sheets: { eventKey, status: "not-sent" } });
}
