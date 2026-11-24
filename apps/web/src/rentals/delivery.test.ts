import { expect, it } from "vitest";
import { defaultContractSettings } from "../../../../packages/application/src/rentals/contract-settings";
import { prepareRentalDelivery } from "../../../../packages/application/src/rentals/delivery";
const agencyId = "10000000-0000-4000-8000-000000000001", rentalId = "20000000-0000-4000-8000-000000000001";
const settings = { ...defaultContractSettings(agencyId, { name: "Current agency", ice: "", ifNumber: "", rc: "", address: "Synthetic street", city: "Synthetic city", phone: "+212600000000", email: "fixture@example.invalid" }), revision: 1 };
const snapshot = { schemaVersion: 1, agencyId, rentalId, version: 2, number: "CTR-2026-0001", templateRevision: null,
  parties: { agency: { name: "Issued agency" }, primaryDriver: { fullName: "Issued driver" }, secondaryDriver: null, vehicle: { registrationNumber: "TEST" } },
  terms: { dailyRateMinor: "1000000000000", depositMinor: "0", totalMinor: "100000000000000000" },
  signatures: { order: ["agency", "client"], agency: null, client: null }, evidence: null, sheets: { eventKey: `${agencyId}:${rentalId}:2` } };
it("prepares immutable unsigned template/PDF inputs and a versioned Sheets key without fabricating evidence", () => {
  const result = prepareRentalDelivery(snapshot, settings, { agencyId, rentalId });
  expect(result).toMatchObject({ document: { parties: { agency: { name: "Issued agency" } } }, template: { revision: 1, template: "classic" },
    signing: { status: "unsigned", order: ["agency", "client"], evidence: null, requiresPersistedArtifactAndDigest: true }, sheets: { status: "not-sent" } });
  expect(Object.isFrozen(result?.document)).toBe(true); expect(snapshot.templateRevision).toBeNull();
});
it.each([{ ...snapshot, agencyId: rentalId }, { ...snapshot, version: 0 }, { ...snapshot, evidence: {} },
  { ...snapshot, signatures: { order: ["client", "agency"], agency: null, client: null } },
  { ...snapshot, signatures: { order: ["agency", "client"], agency: "drawn", client: null } },
  { ...snapshot, terms: { dailyRateMinor: 100, depositMinor: "0", totalMinor: "100" } }])("rejects incompatible preparation input %#", value => {
  expect(prepareRentalDelivery(value, settings, { agencyId, rentalId })).toBeNull();
});
it("requires an explicitly saved same-agency template revision", () => {
  expect(prepareRentalDelivery(snapshot, { ...settings, revision: 0 }, { agencyId, rentalId })).toBeNull();
  expect(prepareRentalDelivery(snapshot, { ...settings, agencyId: rentalId }, { agencyId, rentalId })).toBeNull();
});
