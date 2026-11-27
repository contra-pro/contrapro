import { isRecord, isUuid } from "../../../../packages/application/src/agency-management";
import { validContractLogo } from "../../../../packages/application/src/rentals/contract-settings";

export class DocumentFault extends Error {
  constructor(readonly code: "invalid" | "forbidden" | "not-found" | "conflict" | "unsupported" | "missing-values" | "conversion-failed" | "unavailable" | "quota" | "restricted") { super(code); }
}
export const fields = ["agency.name", "agency.legalName", "agency.commercialName", "agency.representativeName", "agency.representativeRole", "agency.signerName", "agency.ice", "agency.ifNumber", "agency.rc", "agency.address", "agency.city", "agency.phone", "agency.email","agency.country","agency.postalCode","agency.website","agency.rcCity","agency.businessStructure",
  ...["primaryDriver", "secondaryDriver"].flatMap(p => ["fullName", "identityNumber", "drivingLicenseNumber", "licenceIssueDate", "licenceExpiryDate", "nationality", "address", "city", "phone", "email"].map(f => `${p}.${f}`)),
  "vehicle.registrationNumber", "vehicle.make", "vehicle.model", "vehicle.year", "vehicle.mileage", "rental.start", "rental.end", "rental.billableDays", "rental.pickup", "rental.returnLocation",
  "rental.dailyRateMinor", "rental.depositMinor", "rental.totalMinor", "rental.paidMinor", "rental.remainingMinor", "rental.depositHeldMinor", "rental.currency", "rental.payment", "rental.paymentMethod", "rental.paymentDate", "rental.paymentReference", "contract.number", "contract.issueDate"] as const;
export type Mapping = { field: string; required: boolean; page: number; x: number; y: number; width: number; height: number; fontSize: number; rtl: boolean };
export type Zone = Omit<Mapping, "field" | "required" | "fontSize" | "rtl"> & { party: "agency" | "client" };
export type Configuration = { locale: "fr" | "ar"; mappings: Mapping[]; signatures: Zone[]; custom: string[]; clauseVersions?: string[]; clauses?: import("./clauses").ClauseVersion[]; agencyLogo?: boolean; logo?: { data: string; page: number; x: number; y: number; width: number; height: number } | null };
export type TemplateVersion = { agencyId: string; templateId: string; id: string; revision: number; name: string; format: "pdf" | "docx"; originalKey: string; checksum: string; config: Configuration };
export type Template = { id: string; agencyId: string; name: string; archived: boolean; isDefault: boolean; versions: TemplateVersion[] };
export type Artifact = { id: string; agencyId: string; rentalId: string; rentalVersion: number; templateVersionId: string; key: string; checksum: string;
  sourceChecksum: string; status: "draft" | "issued"; requestId: string; createdAt: string; signing: { order: ["agency", "client"]; evidence: null; zones: Zone[] } };
export function scope(agencyId: string, ...ids: string[]) { if (![agencyId, ...ids].every(isUuid)) throw new DocumentFault("invalid"); }
export function validField(field: string, custom: string[]) { return fields.includes(field as typeof fields[number]) || custom.some(c => field === `custom.${c}`); }
function box(v: Record<string, unknown>) { return ["page", "x", "y", "width", "height"].every(k => typeof v[k] === "number" && Number.isFinite(v[k])) &&
  Number.isInteger(v.page) && Number(v.page) >= 1 && Number(v.page) <= 50 && Number(v.x) >= 0 && Number(v.y) >= 0 && Number(v.width) > 0 && Number(v.height) > 0 &&
  Number(v.x) + Number(v.width) <= 2000 && Number(v.y) + Number(v.height) <= 2000; }
export function configuration(v: unknown): Configuration {
  if (!isRecord(v) || !["fr", "ar"].includes(String(v.locale)) || !Array.isArray(v.custom) || v.custom.length > 40 ||
    !v.custom.every(c => typeof c === "string" && /^[a-z][a-z0-9_]{0,39}$/.test(c)) || new Set(v.custom).size !== v.custom.length ||
    !Array.isArray(v.mappings) || v.mappings.length > 150 || !Array.isArray(v.signatures) || v.signatures.length > 20) throw new DocumentFault("invalid");
  const custom = v.custom as string[];
  if (v.clauseVersions !== undefined && (!Array.isArray(v.clauseVersions) || v.clauseVersions.length > 40 || !v.clauseVersions.every(isUuid) || new Set(v.clauseVersions).size !== v.clauseVersions.length)) throw new DocumentFault("invalid");
  if (v.clauses !== undefined && (!Array.isArray(v.clauses) || v.clauses.length > 40 || !v.clauses.every(c => isRecord(c) && isUuid(c.id) && typeof c.enabled === "boolean" && ["title","fr","ar"].every(k => typeof c[k] === "string" && c[k].length > 0 && c[k].length <= (k === "title" ? 120 : 8000) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(c[k] as string))))) throw new DocumentFault("invalid");
  if (v.agencyLogo !== undefined && typeof v.agencyLogo !== "boolean" || v.agencyLogo === true && !v.logo) throw new DocumentFault("invalid");
  if (v.logo !== undefined && v.logo !== null && (!isRecord(v.logo) || !validContractLogo(v.logo.data) || typeof v.logo.data !== "string" || !box(v.logo))) throw new DocumentFault("invalid");
  if (!v.mappings.every(m => isRecord(m) && typeof m.field === "string" && validField(m.field, custom) && typeof m.required === "boolean" && typeof m.rtl === "boolean" &&
    box(m) && typeof m.fontSize === "number" && m.fontSize >= 6 && m.fontSize <= 48) ||
    !v.signatures.every(z => isRecord(z) && ["agency", "client"].includes(String(z.party)) && box(z))) throw new DocumentFault("invalid");
  return structuredClone(v) as Configuration;
}
export function resolveValues(snapshot: unknown, agencyId: string, rentalId: string, custom: Record<string, string>, issueDate: string): Record<string, string> {
  scope(agencyId, rentalId);
  if (!isRecord(snapshot) || snapshot.schemaVersion !== 1 || snapshot.agencyId !== agencyId || snapshot.rentalId !== rentalId || !Number.isSafeInteger(snapshot.version) ||
    !isRecord(snapshot.parties) || !isRecord(snapshot.terms) || typeof snapshot.number !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) throw new DocumentFault("invalid");
  const values: Record<string, string> = Object.create(null);
  for (const key of fields) {
    const [group, name] = key.split(".") as [string, string];
    const parent = group === "rental" ? snapshot.terms : group === "contract" ? { number: snapshot.number, issueDate } : snapshot.parties[group];
    const value = isRecord(parent) ? parent[name] : null;
    if (name.endsWith("Minor")) {
      if ((value === null || value === undefined) && ["paidMinor","remainingMinor","depositHeldMinor"].includes(name)) continue;
      if (typeof value !== "string" || !/^(0|[1-9][0-9]{0,18})$/.test(value)) throw new DocumentFault("invalid");
      const n = BigInt(value); values[key] = `${n / 100n}.${(n % 100n).toString().padStart(2, "0")}`;
    } else if (typeof value === "string" || typeof value === "number" && Number.isSafeInteger(value)) values[key] = String(value);
  }
  for (const [key, value] of Object.entries(custom)) {
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(key) || typeof value !== "string" || value.length > 2000 || /[\u0000-\u001f]/.test(value)) throw new DocumentFault("invalid");
    values[`custom.${key}`] = value;
  }
  if (Object.values(values).some(v => v.length > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))) throw new DocumentFault("invalid");
  return values;
}
/** Logo bytes come only from the immutable issued rental snapshot, never today's profile. */
export function capturedConfiguration(config: Configuration, snapshot: unknown): Configuration {
  if (!config.agencyLogo) return config;
  const agency = isRecord(snapshot) && isRecord(snapshot.parties) ? snapshot.parties.agency : null;
  if (!isRecord(agency) || typeof agency.logoData !== "string" || !validContractLogo(agency.logoData) || !config.logo) throw new DocumentFault("missing-values");
  return { ...config, logo: { ...config.logo, data: agency.logoData } };
}
export function requiredValues(config: Configuration, values: Record<string, string>) {
  const missing = config.mappings.filter(m => m.required && !values[m.field]?.trim()).map(m => m.field);
  if (missing.length) throw new DocumentFault("missing-values");
}
