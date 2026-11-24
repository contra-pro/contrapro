import type { Locale } from "../i18n/locales";
import { vehicleFailureCodes, type VehicleMessageCode } from "../i18n/vehicles";
import { isRecord, isUuid } from "../../../../packages/application/src/agency-management";
import type { VehicleDraft } from "../../../../packages/application/src/vehicle-draft";
import type { VehicleAttributes } from "../../../../packages/application/src/vehicles";
import { vehicleVersionLimit } from "../../../../packages/application/src/vehicles";
type SaveInput = { action: "create"; requestId: string; data: VehicleDraft & Partial<VehicleAttributes> } | { action: "update"; id: string; version: number; data: VehicleDraft & Partial<VehicleAttributes> };
export type VehicleSaveResult = { ok: true; id: string; version: number } | { ok: false; code: VehicleMessageCode };
/** UI confirmation boundary: no retry, raw exception or caller-supplied tenant ID. */
export async function saveVehicle(locale: Locale, body: SaveInput, send: typeof fetch): Promise<VehicleSaveResult> {
  try {
    const response = await send(`/${locale}/app/vehicle-action`, { method: "POST", credentials: "same-origin", redirect: "error", cache: "no-store",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result: unknown = await response.json();
    if (!isRecord(result)) return { ok: false, code: "uncertain" };
    if (!response.ok || result.ok !== true) return { ok: false, code: result.ok === false && vehicleFailureCodes.includes(result.code as VehicleMessageCode) ? result.code as VehicleMessageCode : "uncertain" };
    if (response.status !== 200 || response.redirected || !isUuid(result.id) || !Number.isSafeInteger(result.version) || (result.version as number) < 1 || (result.version as number) > vehicleVersionLimit
      || (body.action === "update" && (result.id !== body.id || result.version !== body.version + 1))) return { ok: false, code: "uncertain" };
    return { ok: true, id: result.id, version: result.version as number };
  } catch { return { ok: false, code: "uncertain" }; }
}
