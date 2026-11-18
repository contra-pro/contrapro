export const profileFields = ["name", "ice", "ifNumber", "rc", "address", "city", "phone", "email"] as const;
export type ProfileField = typeof profileFields[number];
export type AgencyProfile = Record<ProfileField, string>;
export type AgencySettings = { defaultLocale: "fr" | "ar"; timeZone: "Africa/Casablanca" | "UTC"; currency: "MAD" };
export type FieldErrors = Partial<Record<ProfileField | keyof AgencySettings | "form", "required" | "invalid" | "too-long">>;
type Validation<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };
export const isUuid = (value: unknown): value is string => typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Projection of existing tenancy.agencies; no owner, role, state or tenant input. */
export function validateAgencyProfile(input: unknown): Validation<AgencyProfile> {
  if (!isRecord(input) || Object.keys(input).some(key => !profileFields.includes(key as ProfileField))) {
    return { ok: false, errors: { form: "invalid" } };
  }
  const value = {} as AgencyProfile;
  const errors: FieldErrors = {};
  const limits: Record<ProfileField, number> = { name: 200, ice: 15, ifNumber: 20, rc: 50, address: 400, city: 100, phone: 16, email: 320 };
  for (const field of profileFields) {
    const supplied = input[field];
    if (supplied !== undefined && typeof supplied !== "string") { errors[field] = "invalid"; continue; }
    value[field] = typeof supplied === "string" ? supplied.trim() : "";
    if (!value[field] && !["ice", "ifNumber", "rc"].includes(field)) errors[field] = "required";
    else if (value[field].length > limits[field]) errors[field] = "too-long";
    else if (/[\u0000-\u001f\u007f]/u.test(value[field])) errors[field] = "invalid";
  }
  if (value.ice && !/^\d{15}$/.test(value.ice)) errors.ice = "invalid";
  if (value.ifNumber && !/^\d{1,20}$/.test(value.ifNumber)) errors.ifNumber = "invalid";
  if (value.phone && !/^\+?[0-9]{8,15}$/.test(value.phone)) errors.phone = "invalid";
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) errors.email = "invalid";
  if (Object.keys(errors).length) return { ok: false, errors };
  value.email = value.email.toLowerCase();
  return { ok: true, value };
}

export function validateAgencySettings(input: unknown): Validation<AgencySettings> {
  if (!isRecord(input) || Object.keys(input).some(key => !["defaultLocale", "timeZone", "currency"].includes(key))) return { ok: false, errors: { form: "invalid" } };
  const errors: FieldErrors = {};
  if (input.defaultLocale !== "fr" && input.defaultLocale !== "ar") errors.defaultLocale = "invalid";
  if (input.timeZone !== "Africa/Casablanca" && input.timeZone !== "UTC") errors.timeZone = "invalid";
  if (input.currency !== "MAD") errors.currency = "invalid";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: input as AgencySettings };
}
