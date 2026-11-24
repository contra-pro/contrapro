export const inspectionViews = ["top", "front", "rear", "left", "right"] as const;
export type InspectionView = typeof inspectionViews[number];
export type DamageCategory = "scratch" | "dent" | "other";
export type InspectionPresentation = {
  stage: "departure" | "return";
  provenance: "demonstration" | "recorded";
  /** Quarter-tank scale: 0 empty, 4 full; null means unknown, never empty. */
  fuelLevel: 0 | 1 | 2 | 3 | 4 | null;
  mileageKm: number | null;
  notes: string | null;
  /** Coordinates are percentages of a fixed 100 x 100 diagram canvas. */
  damage: readonly { id: string; view: InspectionView; category: DamageCategory; x: number; y: number }[];
};
export type VehicleInspections = { departure: InspectionPresentation | null; return: InspectionPresentation | null };

function record(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype || Reflect.ownKeys(value).length !== keys.length) return false;
  return keys.every(key => { const d = Object.getOwnPropertyDescriptor(value, key); return d?.enumerable && "value" in d; });
}
export function validVehicleInspections(value: unknown): value is VehicleInspections {
  try {
    if (!record(value, ["departure", "return"])) return false;
    return (["departure", "return"] as const).every(stage => {
      const item = value[stage];
      if (item === null) return true;
      if (!record(item, ["stage","provenance","fuelLevel","mileageKm","notes","damage"]) || item.stage !== stage ||
        !["demonstration","recorded"].includes(item.provenance as string) ||
        !(item.fuelLevel === null || [0,1,2,3,4].includes(item.fuelLevel as number)) ||
        !(item.mileageKm === null || (typeof item.mileageKm === "number" && Number.isSafeInteger(item.mileageKm) && item.mileageKm >= 0)) ||
        !(item.notes === null || (typeof item.notes === "string" && item.notes.length <= 2000 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(item.notes))) ||
        !Array.isArray(item.damage) || Object.getPrototypeOf(item.damage) !== Array.prototype || item.damage.length > 50 ||
        Reflect.ownKeys(item.damage).length !== item.damage.length + 1) return false;
      const ids = new Set<string>();
      for (let i = 0; i < item.damage.length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(item.damage, String(i));
        if (!descriptor || !("value" in descriptor)) return false;
        const marker: unknown = descriptor.value;
        if (!record(marker, ["id","view","category","x","y"]) || typeof marker.id !== "string" || !/^[a-zA-Z0-9_-]{1,40}$/.test(marker.id) || ids.has(marker.id) ||
          !inspectionViews.includes(marker.view as InspectionView) || !["scratch","dent","other"].includes(marker.category as string) ||
          ![marker.x,marker.y].every(v => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100)) return false;
        ids.add(marker.id);
      }
      return true;
    });
  } catch { return false; }
}
