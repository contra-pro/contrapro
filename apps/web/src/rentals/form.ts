import { validateRentalCreateInput, type NormalizedRentalCreate } from "../../../../packages/domain/src/rentals/create-input";
import { parseRentalTimestamp } from "../../../../packages/domain/src/rentals/timestamps";
import { isRecord, isUuid } from "../../../../packages/application/src/agency-management";

export type DemoChoice = Readonly<{ id: string; label: string }>;
export type RentalFormValues = Record<"clientId" | "vehicleId" | "startDate" | "startTime" | "startOffset"
  | "endDate" | "endTime" | "endOffset" | "dailyRate" | "deposit", string>;
export type RentalFormErrors = Partial<Record<keyof RentalFormValues | "form", string>>;
export const emptyRentalForm: RentalFormValues = { clientId: "", vehicleId: "", startDate: "", startTime: "09:00", startOffset: "+01:00",
  endDate: "", endTime: "09:00", endOffset: "+01:00", dailyRate: "", deposit: "" };
export type RentalCreateTransport = (attempt: Readonly<{ body: string; creationKey: string }>) => Promise<Response>;
export type RentalUiOutcome = "success" | "invalid" | "forbidden" | "conflict" | "uncertain";

function centimes(value: string): number | null {
  const match = /^(0|[1-9][0-9]*)([.,][0-9]{1,2})?$/.exec(value);
  if (value.length > 14 || !match || match[0] !== value) return null;
  const [whole, fraction = ""] = value.split(/[.,]/);
  const exact = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"));
  return exact <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(exact) : null;
}

/** Form-string adapter only; domain helpers retain temporal and pricing authority. */
export function reviewRentalForm(values: RentalFormValues, clients: readonly DemoChoice[], vehicles: readonly DemoChoice[]):
  { ok: true; body: string; price: NormalizedRentalCreate } | { ok: false; errors: RentalFormErrors } {
  const errors: RentalFormErrors = {};
  if (!clients.some(choice => choice.id === values.clientId)) errors.clientId = "Choisissez un client de démonstration.";
  if (!vehicles.some(choice => choice.id === values.vehicleId)) errors.vehicleId = "Choisissez un véhicule de démonstration.";
  const dates: Record<string, string> = {};
  for (const edge of ["start", "end"] as const) {
    const clock = values[`${edge}Time`];
    dates[edge] = `${values[`${edge}Date`]}T${clock.length === 5 ? clock + ":00" : clock}${values[`${edge}Offset`]}`;
    try {
      if (!/^\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?$/.test(clock)) throw new Error();
      parseRentalTimestamp(dates[edge]);
    } catch { errors[`${edge}Date`] = "Vérifiez la date, l’heure et le décalage UTC."; }
  }
  const dailyRateMinor = centimes(values.dailyRate);
  const depositMinor = values.deposit === "" ? 0 : centimes(values.deposit);
  if (dailyRateMinor === null) errors.dailyRate = "Saisissez un montant positif ou nul, avec deux décimales maximum.";
  if (depositMinor === null) errors.deposit = "Saisissez un montant positif ou nul, avec deux décimales maximum.";
  if (Object.keys(errors).length) return { ok: false, errors };
  const payload = { clientId: values.clientId, vehicleId: values.vehicleId, start: dates.start, end: dates.end, dailyRateMinor, depositMinor };
  const checked = validateRentalCreateInput(payload);
  if (!checked.ok) {
    if (checked.errors.some(error => error.field === "period")) errors.endDate = "La fin doit suivre le début, en tenant compte des décalages UTC.";
    else { errors.dailyRate = "Montant ou durée hors des limites prises en charge."; errors.deposit = "Vérifiez le dépôt et la durée."; }
    return { ok: false, errors };
  }
  return { ok: true, body: JSON.stringify(payload), price: checked.value };
}

/** Exact display from validated integral centimes; no floating-point division. */
export function formatRentalMad(amount: bigint): string {
  return `${(amount / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f")},${(amount % 100n).toString().padStart(2, "0")} MAD`;
}

/** HTTP output is untrusted; display only fixed local messages, never raw errors. */
export async function rentalUiOutcome(response: Response): Promise<RentalUiOutcome> {
  const body: unknown = await response.json();
  if (response.redirected || !isRecord(body)) return "uncertain";
  if (response.status === 200 && body.ok === true && Object.keys(body).length === 2 && isRecord(body.value)) {
    const receipt = body.value;
    return Object.keys(receipt).length === 4 && isUuid(receipt.id) && receipt.id.length === 36
      && receipt.version === 1 && receipt.state === "brouillon" && receipt.number === null ? "success" : "uncertain";
  }
  if (body.ok !== false) return "uncertain";
  if (response.status === 400 && typeof body.code === "string" && ["invalid-input", "invalid", "out-of-range"].includes(body.code)) return "invalid";
  if (response.status === 403 && body.code === "forbidden") return "forbidden";
  if (response.status === 409 && body.code === "conflict") return "conflict";
  return "uncertain";
}
