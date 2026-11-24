import { useState } from "react";
import { createRoot } from "react-dom/client";
import { RentalDetails } from "../../src/rentals/rental-details";
import "../../src/app/globals.css";
import "./preview.css";

const agencyId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const id = "33333333-3333-3333-3333-333333333333";
const base = { id, agency_id: agencyId, client_id: "44444444-4444-4444-4444-444444444444", vehicle_id: "55555555-5555-5555-5555-555555555555",
  state: "brouillon", starts_at: "2026-01-01T08:00:00Z", ends_at: "2026-01-02T08:00:00.000001Z", daily_rate_minor: 12_345n,
  deposit_minor: 50_000n, billable_days: 2, total_minor: 24_690n, currency: "MAD", number_year: null, number_serial: null,
  contract_number: null, confirmed_at: null, returned_at: null, version: 1, created_at: "2025-12-20T10:00:00Z", updated_at: "2025-12-20T10:00:00Z",
  physicalUnavailable: false, overdueConflict: false };
// An explicit synthetic response number; no number is allocated or inferred by the view.
const numbered = { ...base, state: "confirme", number_year: 2025, number_serial: 42n, contract_number: "CTR-2025-0042",
  confirmed_at: "2025-12-21T10:00:00Z", updated_at: "2025-12-21T10:00:00Z", version: 2 };
const fixtures = [
  { label: "Brouillon", data: base }, { label: "Confirmé (fictif)", data: numbered },
  { label: "En cours (fictif)", data: { ...numbered, state: "en_cours", version: 3, updated_at: "2026-01-01T08:00:00Z" } },
  { label: "Terminé (fictif)", data: { ...numbered, state: "termine", version: 4, returned_at: "2026-01-02T09:00:00Z", updated_at: "2026-01-02T09:00:00Z" } },
  { label: "Annulé sans numéro", data: { ...base, state: "annule", version: 2 } },
  { label: "Annulé avec numéro fictif", data: { ...numbered, state: "annule", version: 3 } },
];
function Preview() {
  const [index, setIndex] = useState(0);
  return <main className="rental-preview"><div className="preview-tools"><strong>ContratPro · consultation isolée</strong>
    <label htmlFor="fixture">Fixture affichée <select id="fixture" value={index} onChange={event => setIndex(Number(event.target.value))}>
      {fixtures.map((fixture, i) => <option key={fixture.label} value={i}>{fixture.label}</option>)}
    </select></label></div><RentalDetails response={fixtures[index]!.data} context={{ agencyId, contractId: id }}
      clients={[{ id: base.client_id, label: "Client fictif A" }]} vehicles={[{ id: base.vehicle_id, label: "Véhicule fictif A · DEMO-01" }]} /></main>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
