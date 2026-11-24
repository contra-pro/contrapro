import { validContractSettings, type ContractSettings, type ContractSettingsRepository } from "./contract-settings";

/** Explicit fake: instance-local memory, lost on restart. No network or storage. */
export function createMemoryContractSettingsRepository(): ContractSettingsRepository {
  const settings = new Map<string, ContractSettings>();
  return {
    async get(agencyId) { const value = settings.get(agencyId); return value ? structuredClone(value) : null; },
    async save(value, expectedRevision) {
      if (!validContractSettings(value) || value.revision !== expectedRevision || (settings.get(value.agencyId)?.revision ?? 0) !== expectedRevision) return false;
      settings.set(value.agencyId, structuredClone({ ...value, revision: expectedRevision + 1 })); return true;
    },
  };
}
