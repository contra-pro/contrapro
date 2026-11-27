import { isRecord, isUuid } from "../../../../packages/application/src/agency-management";
export const overviewModules = ["rentals", "signing", "delivery", "sheets"] as const;
export type OverviewModule = typeof overviewModules[number];
export type Task = { id: string; reference: string | null; state: string; at?: string };
export type TaskResult = { status: "ready"; groups: Record<string, Task[]> } | { status: "unavailable" | "error" | "restricted" };
export type Overview = Record<OverviewModule, TaskResult>;
export const rentalGroups = ["active", "pickups", "returns", "drafts", "activity"] as const;
const states: Record<OverviewModule, readonly string[]> = {
  rentals: ["brouillon", "confirme", "en_cours", "termine", "annule"],
  signing: ["awaiting_agency", "agency_signed", "awaiting_client", "client_signed", "finalization_pending", "reconciliation_required"],
  delivery: ["failed", "bounced", "uncertain"],
  sheets: ["pending", "processing", "failed", "paused", "reconciliation-required"],
};
export function overviewResult(module: OverviewModule, value: unknown): TaskResult {
  const groups = module === "rentals" ? value : { [module]: value };
  const keys = module === "rentals" ? [...rentalGroups] : [module];
  if (!isRecord(groups) || Object.keys(groups).sort().join() !== keys.sort().join()) throw Error("invalid overview");
  const result: Record<string, Task[]> = {};
  for (const key of Object.keys(groups)) {
    const rows = groups[key];
    if (!Array.isArray(rows) || rows.length > 20) throw Error("invalid overview");
    result[key] = rows.map(row => {
      if (!isRecord(row) || !isUuid(row.id) || !(row.reference === null || typeof row.reference === "string" && /^CTR-\d{1,4}-\d{4,19}$/.test(row.reference)) || !states[module].includes(String(row.state)) ||
        (module === "rentals" || module === "signing") && (typeof row.at !== "string" || !Number.isFinite(Date.parse(row.at)))) throw Error("invalid overview");
      return { id: row.id, reference: row.reference as string | null, state: String(row.state), ...(typeof row.at === "string" ? { at: row.at } : {}) };
    });
  }
  return { status: "ready", groups: result };
}
