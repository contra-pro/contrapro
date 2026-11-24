import { isUuid } from "../agency-management";
import { contractPresentationVersion, loadContractSettings, type ContractPresentation, type ContractSettingsRepository, type DocumentSnapshot, type DocumentSnapshotV3, type SimulatedContext } from "./contract-settings";

/** Signed is vocabulary for a future boundary, never an offline record state. */
export type ContractLifecycleState = "draft" | "finalized" | "signing-pending" | "signed";
export const contractLifecycleLabels = { draft: "Brouillon (Draft)", finalized: "Finalisé (simulation)", "signing-pending": "Signature en attente (intention simulée)", signed: "Signé — indisponible" } as const;
export const futureSigningEvidenceRequirements = Object.freeze([
  "Identité vérifiée de chaque signataire et consentement explicite reliés au document exact.",
  "Empreinte et version du document figé, intégrité de l’acte signé et piste d’audit vérifiables.",
  "Événements et dates de signature issus d’une source authentifiée et vérifiée, jamais de l’horloge locale.",
  "Frontière authentifiée, contrôle d’agence, protection contre les rejeux et traitement explicite des résultats incertains.",
]);
type Base = Readonly<{ simulation: true; agencyId: string; id: string; revision: number; signingEvidence: null }>;
export type OfflineContractLifecycle = Base & (
  | Readonly<{ state: "draft"; simulationId: null; draft: DocumentSnapshotV3; snapshot: null }>
  | Readonly<{ state: "finalized" | "signing-pending"; simulationId: string; draft: null; snapshot: DocumentSnapshot }>
);
export type LifecycleResult = { ok: true; value: OfflineContractLifecycle } | { ok: false; code: "forbidden" | "invalid" | "not-found" | "conflict" | "immutable" | "settings-unavailable" | "invalid-transition" | "signed-unavailable" };
export type OfflineContractLifecycleService = ReturnType<typeof createOfflineContractLifecycle>;

function freeze<T>(value: T): T {
  if (value && typeof value === "object") { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
}
const validContext = (context: SimulatedContext) => context?.simulation === true && isUuid(context.agencyId) && context.agencyId.length === 36 && ["owner", "staff"].includes(context.role);
/** Bounded current-write guard, not an importer/decoder for arbitrary documents. */
function unsignedCurrent(document: ContractPresentation, agencyId: string): boolean {
  try {
    const keys = ["schemaVersion", "demonstration", "agencyId", "rentalId", "number", "primaryDriver", "secondaryDriver", "vehicle", "rental", "inspection", "signatures"];
    if (!document || Object.getPrototypeOf(document) !== Object.prototype || Reflect.ownKeys(document).length !== keys.length || keys.some(key => {
      const d = Object.getOwnPropertyDescriptor(document, key); return !d?.enumerable || !("value" in d);
    })) return false;
    const signatures = document.signatures;
    return document.demonstration === true && document.agencyId === agencyId && isUuid(document.rentalId) && document.rentalId.length === 36 &&
      document.number === null && contractPresentationVersion(document) === 3 && !!signatures && Object.getPrototypeOf(signatures) === Object.prototype &&
      Reflect.ownKeys(signatures).length === 2 && ["customer", "agency"].every(key => {
        const d = Object.getOwnPropertyDescriptor(signatures, key); return d?.enumerable && "value" in d && d.value === "not-signed";
      });
  } catch { return false; }
}

/** Isolated in-memory simulation. No network, persistence, clock, signing adapter,
 * retry loop or production-number generator. Frozen values change only via CAS. */
export function createOfflineContractLifecycle(settingsRepository: ContractSettingsRepository) {
  const records = new Map<string, OfflineContractLifecycle>();
  const key = (agencyId: string, id: string) => `${agencyId}:${id}`;
  function get(context: SimulatedContext, id: string): OfflineContractLifecycle | null {
    return validContext(context) ? records.get(key(context.agencyId, id)) ?? null : null;
  }
  function list(context: SimulatedContext): readonly OfflineContractLifecycle[] {
    return Object.freeze(validContext(context) ? [...records.values()].filter(entry => entry.agencyId === context.agencyId) : []);
  }
  async function createDraft(context: SimulatedContext, input: ContractPresentation): Promise<LifecycleResult> {
    if (!validContext(context)) return { ok: false, code: "forbidden" };
    const capturedContext = { ...context };
    if (!unsignedCurrent(input, capturedContext.agencyId)) return { ok: false, code: "invalid" };
    let document: ContractPresentation;
    try { document = structuredClone(input); } catch { return { ok: false, code: "invalid" }; }
    const id = document.rentalId, recordKey = key(capturedContext.agencyId, id);
    if (records.has(recordKey)) return { ok: false, code: "conflict" };
    const settings = await loadContractSettings(settingsRepository, capturedContext);
    if (!settings) return { ok: false, code: "settings-unavailable" };
    // Recheck after the one asynchronous read; concurrent creates never overwrite.
    if (records.has(recordKey)) return { ok: false, code: "conflict" };
    const entry: OfflineContractLifecycle = freeze({ simulation: true, agencyId: capturedContext.agencyId, id, revision: 1,
      state: "draft", simulationId: null, signingEvidence: null, draft: { demonstration: true, settings, document }, snapshot: null });
    records.set(recordKey, entry); return { ok: true, value: entry };
  }
  function current(context: SimulatedContext, id: string, expectedRevision: number): LifecycleResult {
    if (!validContext(context)) return { ok: false, code: "forbidden" };
    const entry = get(context, id);
    if (!entry) return { ok: false, code: "not-found" };
    return !Number.isSafeInteger(expectedRevision) || expectedRevision !== entry.revision || entry.revision >= Number.MAX_SAFE_INTEGER - 1
      ? { ok: false, code: "conflict" } : { ok: true, value: entry };
  }
  function editDraft(context: SimulatedContext, id: string, expectedRevision: number, document: ContractPresentation): LifecycleResult {
    const result = current(context, id, expectedRevision); if (!result.ok) return result;
    const entry = result.value;
    if (entry.state !== "draft") return { ok: false, code: "immutable" };
    if (!unsignedCurrent(document, entry.agencyId) || document.rentalId !== entry.id) return { ok: false, code: "invalid" };
    let copy: ContractPresentation;
    try { copy = structuredClone(document); } catch { return { ok: false, code: "invalid" }; }
    const updated: OfflineContractLifecycle = freeze({ ...entry, revision: entry.revision + 1, draft: { ...entry.draft, document: copy } });
    records.set(key(entry.agencyId, id), updated); return { ok: true, value: updated };
  }
  function transition(context: SimulatedContext, id: string, expectedRevision: number, target: ContractLifecycleState): LifecycleResult {
    const result = current(context, id, expectedRevision); if (!result.ok) return result;
    const entry = result.value;
    if (target === "signed") return { ok: false, code: "signed-unavailable" };
    let updated: OfflineContractLifecycle;
    if (entry.state === "draft" && target === "finalized") {
      updated = freeze({ ...entry, state: "finalized", revision: entry.revision + 1, simulationId: `SIM-${entry.agencyId}-${entry.id}`,
        draft: null, snapshot: structuredClone(entry.draft) });
    } else if (entry.state === "finalized" && target === "signing-pending") {
      updated = freeze({ ...entry, state: "signing-pending", revision: entry.revision + 1 });
    } else return { ok: false, code: "invalid-transition" };
    records.set(key(entry.agencyId, id), updated); return { ok: true, value: updated };
  }
  return Object.freeze({ createDraft, get, list, editDraft, transition });
}
