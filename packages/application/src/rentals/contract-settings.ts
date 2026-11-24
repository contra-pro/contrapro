import { isUuid, validateAgencyProfile, type AgencyProfile } from "../agency-management";
import { validVehicleInspections, type VehicleInspections } from "./inspection-presentation";

export const contractTemplates = { classic: "Classic Professional", luxury: "Luxury Premium", modern: "Modern Minimal", detailed: "Auto Rental Detailed", bilingual: "Bilingual FR/AR" } as const;
export type ContractTemplate = keyof typeof contractTemplates;
export type ContractSettings = { agencyId: string; revision: number; template: ContractTemplate; logo: string | null;
  primary: string; accent: string; company: AgencyProfile; conditions: string; footer: string };
export type SimulatedContext = { simulation: true; agencyId: string; role: "owner" | "staff" };
export interface ContractSettingsRepository {
  get(agencyId: string): Promise<ContractSettings | null>;
  save(value: ContractSettings, expectedRevision: number): Promise<boolean>;
}
const uuid = (v: unknown): v is string => isUuid(v) && v.length === 36;
const contextValid = (c: SimulatedContext) => c?.simulation === true && uuid(c.agencyId) && ["owner", "staff"].includes(c.role);
export function defaultContractSettings(agencyId: string, company: AgencyProfile): ContractSettings {
  return { agencyId, revision: 0, template: "classic", logo: null, primary: "#173b56", accent: "#b68a35", company: { ...company }, conditions: "Conditions de démonstration à configurer par l’agence. Aucune validité juridique.", footer: "Document de démonstration — non signé" };
}
/** Bounded PNG only. Structural screening, not a full image-decoder/security certification. */
export function validContractLogo(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value !== "string" || value.length > 280000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  try {
    const bytes = atob(value.slice(22));
    if (bytes.length > 204800 || bytes.length < 57 || btoa(bytes) !== value.slice(22)) return false;
    const n = (i: number) => bytes.charCodeAt(i);
    const u32 = (i: number) => n(i) * 16777216 + n(i + 1) * 65536 + n(i + 2) * 256 + n(i + 3);
    if ([137,80,78,71,13,10,26,10].some((b, i) => n(i) !== b) || u32(8) !== 13 || bytes.slice(12,16) !== "IHDR") return false;
    if (![u32(16),u32(20)].every(v => v > 0 && v <= 2048)) return false;
    let i = 8, image = false;
    while (i + 12 <= bytes.length) {
      const len = u32(i), type = bytes.slice(i + 4, i + 8);
      if (len > bytes.length - i - 12) return false;
      if (type === "acTL") return false;
      if (type === "IDAT") image = true;
      i += len + 12;
      if (type === "IEND") return len === 0 && image && i === bytes.length;
    }
  } catch { return false; }
  return false;
}
export function validContractSettings(value: unknown): value is ContractSettings {
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const keys = ["agencyId","revision","template","logo","primary","accent","company","conditions","footer"];
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value).length !== keys.length || keys.some(k => !descriptors[k]?.enumerable || !("value" in descriptors[k]))) return false;
  const v = value as ContractSettings;
  if (!v.company || Object.getPrototypeOf(v.company) !== Object.prototype || Reflect.ownKeys(v.company).length !== 8 ||
    ["name","ice","ifNumber","rc","address","city","phone","email"].some(k => {
      const d = Object.getOwnPropertyDescriptor(v.company, k); return !d?.enumerable || !("value" in d) || typeof d.value !== "string";
    })) return false;
  return uuid(v.agencyId) && Number.isSafeInteger(v.revision) && v.revision >= 0 && v.revision < Number.MAX_SAFE_INTEGER &&
    typeof v.template === "string" && Object.hasOwn(contractTemplates, v.template) && validContractLogo(v.logo) && [v.primary,v.accent].every(c => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c)) &&
    validateAgencyProfile(v.company).ok && typeof v.conditions === "string" && v.conditions.trim().length > 0 && v.conditions.length <= 8000 &&
    typeof v.footer === "string" && v.footer.length <= 500 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v.conditions + v.footer);
}
export async function saveContractSettings(repo: ContractSettingsRepository, context: SimulatedContext, input: unknown): Promise<"saved" | "forbidden" | "invalid" | "conflict" | "unavailable"> {
  if (!contextValid(context) || context.role !== "owner") return "forbidden";
  if (!validContractSettings(input) || input.agencyId !== context.agencyId) return "invalid";
  try { return await repo.save(structuredClone(input), input.revision) ? "saved" : "conflict"; } catch { return "unavailable"; }
}
export async function loadContractSettings(repo: ContractSettingsRepository, context: SimulatedContext): Promise<ContractSettings | null> {
  if (!contextValid(context)) return null;
  try {
    const result = await repo.get(context.agencyId);
    return validContractSettings(result) && result.agencyId === context.agencyId ? structuredClone(result) : null;
  } catch { return null; }
}

/** Historical payload: never split or rewrite these combined strings. */
export type DemoDriverV1 = { name: string; identity: string; licence: string; licenceDates: string; address: string };
export type ContractPresentationV1 = {
  schemaVersion?: 1;
  demonstration: true; agencyId: string; rentalId: string; number: string | null;
  primaryDriver: DemoDriverV1; secondaryDriver: DemoDriverV1 | null;
  vehicle: { registration: string; makeModel: string; vin: string };
  rental: { start: string; end: string; duration: string; pickup: string; returnLocation: string; dailyRateMinor: bigint; amountMinor: bigint; depositMinor: bigint; mileage: string; allowance: string };
  inspection: { fuel: "vide" | "quart" | "demi" | "trois-quarts" | "plein"; notes: string; damage: readonly { view: "avant" | "arrière" | "gauche" | "droite"; x: number; y: number }[] };
  signatures: { customer: "not-signed"; agency: "not-signed" };
};
export type DemoDriver = { fullName: string; cin: string | null; passportNumber: string | null; drivingLicenseNumber: string | null;
  city: string | null; nationality: string | null; licenceDates: string | null; address: string | null };
export type ContractPresentationV2 = Omit<ContractPresentationV1, "schemaVersion" | "primaryDriver" | "secondaryDriver" | "vehicle"> & {
  schemaVersion: 2; primaryDriver: DemoDriver; secondaryDriver: DemoDriver | null;
  vehicle: { make: string | null; model: string | null; registrationNumber: string | null; vin: string | null };
};
/** Current write model. Historical reads use ReadableContractPresentation. */
export type ContractPresentationV3 = Omit<ContractPresentationV2, "schemaVersion" | "inspection"> & { schemaVersion: 3; inspection: VehicleInspections };
export type ContractPresentation = ContractPresentationV3;
export type ReadableContractPresentation = ContractPresentationV1 | ContractPresentationV2 | ContractPresentationV3;
export type DocumentSnapshotV1 = Readonly<{ demonstration: true; settings: ContractSettings; document: ContractPresentationV1 }>;
export type DocumentSnapshotV2 = Readonly<{ demonstration: true; settings: ContractSettings; document: ContractPresentationV2 }>;
export type DocumentSnapshotV3 = Readonly<{ demonstration: true; settings: ContractSettings; document: ContractPresentationV3 }>;
export type DocumentSnapshot = DocumentSnapshotV1 | DocumentSnapshotV2 | DocumentSnapshotV3;

/** Driver/vehicle version dispatch plus strict V3 inspection validation; never converts historical payloads. */
export function contractPresentationVersion(document: ReadableContractPresentation): 1 | 2 | 3 | null {
  const exact = (value: unknown, fields: readonly string[], nullable: boolean) => {
    if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype || Reflect.ownKeys(value).length !== fields.length) return false;
    return fields.every(field => {
      const d = Object.getOwnPropertyDescriptor(value, field);
      return d?.enumerable && "value" in d && (typeof d.value === "string" || (nullable && d.value === null));
    });
  };
  if (document.schemaVersion === 2 || document.schemaVersion === 3) {
    const driverFields = ["fullName","cin","passportNumber","drivingLicenseNumber","city","nationality","licenceDates","address"];
    const driver = (value: unknown) => exact(value, driverFields, true) && typeof (value as DemoDriver).fullName === "string";
    return driver(document.primaryDriver) && (document.secondaryDriver === null || driver(document.secondaryDriver)) &&
      exact(document.vehicle, ["make","model","registrationNumber","vin"], true) &&
      (document.schemaVersion !== 3 || validVehicleInspections(document.inspection)) ? document.schemaVersion : null;
  }
  if (document.schemaVersion !== undefined && document.schemaVersion !== 1) return null;
  const fields = ["name","identity","licence","licenceDates","address"];
  return exact(document.primaryDriver, fields, false) && (document.secondaryDriver === null || exact(document.secondaryDriver, fields, false)) &&
    exact(document.vehicle, ["registration","makeModel","vin"], false) ? 1 : null;
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") { for (const item of Object.values(value)) freeze(item); Object.freeze(value); }
  return value;
}
/** Simulated finalization only; no legal signing, lifecycle mutation or persistence. */
export async function snapshotDemoContract(repo: ContractSettingsRepository, context: SimulatedContext, document: ContractPresentation): Promise<DocumentSnapshotV3 | null> {
  if (!contextValid(context) || contractPresentationVersion(document) !== 3 || document.demonstration !== true || document.agencyId !== context.agencyId || !uuid(document.rentalId) || document.number !== null || document.signatures.customer !== "not-signed" || document.signatures.agency !== "not-signed") return null;
  const settings = await loadContractSettings(repo, context);
  return settings ? freeze({ demonstration: true as const, settings, document: structuredClone(document) }) : null;
}
