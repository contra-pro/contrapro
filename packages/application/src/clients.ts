import { isRecord } from "./agency-management";
import { clientUnicodeCase } from "./client-unicode";
export const clientRawFieldBytes = 8192;
export const clientRawJsonBytes = 32768;

export const clientFields = ["firstName", "lastName", "phone", "email", "nationality", "identityType", "identityNumber",
  "licenceNumber", "licenceIssueDate", "licenceExpiryDate", "address", "city", "notes"] as const;
export type ClientField = typeof clientFields[number];
export type ClientInput = Record<ClientField, string> & { identityType: "none" | "cin" | "passport" };
export type ClientRecord = ClientInput & { id: string; version: number };
export type ClientPermissions = { read: boolean; create: boolean; update: boolean; archive: boolean };
export type ClientErrors = Partial<Record<ClientField | "form", "required" | "invalid" | "too-long" | "date-order" | "future-date">>;
export type ClientQuery = { search: string; identityType: "all" | ClientInput["identityType"]; page: number; pageSize: 10 | 20 | 50 };
export type ClientListItem = Pick<ClientInput, "firstName" | "lastName" | "phone" | "email" | "city" | "identityType"> & { id: string };
export type ClientPage = { items: ClientListItem[]; total: number; query: ClientQuery };
export const clientLimits: Record<ClientField, number> = { firstName: 100, lastName: 100, phone: 16, email: 320, nationality: 80,
  identityType: 8, identityNumber: 30, licenceNumber: 40, licenceIssueDate: 10, licenceExpiryDate: 10, address: 400, city: 100, notes: 2000 };
export const emptyClient: ClientInput = { firstName: "", lastName: "", phone: "", email: "", nationality: "", identityType: "none",
  identityNumber: "", licenceNumber: "", licenceIssueDate: "", licenceExpiryDate: "", address: "", city: "", notes: "" };
export const defaultClientQuery: ClientQuery = { search: "", identityType: "all", page: 1, pageSize: 20 };

function isoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01" || value > "2199-12-31") return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Format checks, not government document verification or rental eligibility. */
export function validateClient(input: unknown, today = new Date().toISOString().slice(0, 10)):
  { ok: true; value: ClientInput } | { ok: false; errors: ClientErrors } {
  if (!isRecord(input) || Object.keys(input).some(key => !clientFields.includes(key as ClientField)) || !isoDate(today)) return { ok: false, errors: { form: "invalid" } };
  if (Object.values(input).some(raw => raw !== undefined && typeof raw !== "string")) return { ok: false, errors: { form: "invalid" } };
  // Reject before trim, Unicode iteration or JSON serialization of enormous strings.
  if (Object.values(input).some(raw => typeof raw === "string" && (raw.length > clientRawFieldBytes || new TextEncoder().encode(raw).length > clientRawFieldBytes))) return { ok: false, errors: { form: "too-long" } };
  if (new TextEncoder().encode(JSON.stringify(input)).length > clientRawJsonBytes) return { ok: false, errors: { form: "too-long" } };
  const value = { ...emptyClient }; const errors: ClientErrors = {};
  for (const field of clientFields) {
    const raw = input[field];
    if (raw !== undefined && typeof raw !== "string") { errors[field] = "invalid"; continue; }
    const text = typeof raw === "string" ? raw.trim() : emptyClient[field];
    if (text.length > clientLimits[field]) errors[field] = "too-long";
    if ((field === "notes" ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u : /[\u0000-\u001f\u007f]/u).test(text)) errors[field] = "invalid";
    if (/[\uD800-\uDFFF]/u.test(text)) errors[field] = "invalid"; // Unpaired surrogates; valid pairs are one code point in /u.
    if (field === "identityType") {
      if (text !== "none" && text !== "cin" && text !== "passport") errors.identityType = "invalid";
      else value.identityType = text;
    } else value[field] = text;
  }
  for (const field of ["firstName", "lastName", "phone"] as const) if (!value[field]) errors[field] = "required";
  if (value.phone && !/^\+?[0-9]{8,15}$/.test(value.phone)) errors.phone = "invalid";
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) errors.email = "invalid";
  for (const field of ["email", "identityNumber", "licenceNumber"] as const) {
    if (!errors[field]) value[field] = clientUnicodeCase(value[field], field !== "email");
    if (value[field].length > clientLimits[field]) errors[field] = "too-long";
  }
  if (value.identityType === "none" && value.identityNumber) errors.identityNumber = "invalid";
  if (value.identityType !== "none" && !value.identityNumber) errors.identityNumber = "required";
  if (value.identityNumber && !(value.identityType === "cin" ? /^[A-Z0-9]{4,20}$/ : /^[A-Z0-9-]{4,30}$/).test(value.identityNumber)) errors.identityNumber = "invalid";
  if (value.licenceNumber && !/^[A-Z0-9][A-Z0-9 /-]{2,39}$/.test(value.licenceNumber)) errors.licenceNumber = "invalid";
  for (const field of ["licenceIssueDate", "licenceExpiryDate"] as const) {
    if (value[field] && !isoDate(value[field])) errors[field] = "invalid";
    else if (value.licenceNumber && !value[field]) errors[field] = "required";
  }
  if ((value.licenceIssueDate || value.licenceExpiryDate) && !value.licenceNumber) errors.licenceNumber = "required";
  if (value.licenceIssueDate && !errors.licenceIssueDate && value.licenceIssueDate > today) errors.licenceIssueDate = "future-date";
  if (value.licenceIssueDate && value.licenceExpiryDate && !errors.licenceIssueDate && !errors.licenceExpiryDate && value.licenceExpiryDate < value.licenceIssueDate) errors.licenceExpiryDate = "date-order";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

export function validateClientQuery(input: unknown): ClientQuery | null {
  if (!isRecord(input) || Object.keys(input).some(key => !["search", "identityType", "page", "pageSize"].includes(key))) return null;
  const query = { ...defaultClientQuery, ...input };
  if (typeof query.search !== "string" || query.search.length > 100 || /[\u0000-\u001f\u007f]/u.test(query.search) ||
    !["all", "none", "cin", "passport"].includes(String(query.identityType)) ||
    !Number.isInteger(query.page) || query.page < 1 || query.page > 10000 || ![10, 20, 50].includes(query.pageSize)) return null;
  return { ...query, search: query.search.trim() } as ClientQuery;
}
