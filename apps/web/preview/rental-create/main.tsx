import { useState } from "react";
import { createRoot } from "react-dom/client";
import { RentalCreationForm } from "../../src/rentals/rental-create-form";
import { createRental, type RentalCreatePort } from "../../../../packages/application/src/rentals/create";
import type { RentalCreateTransport } from "../../src/rentals/form";
import "../../src/app/globals.css";
import "./preview.css";

// Explicit synthetic fixtures. These do not represent real people, fleet or agencies.
const clients = [
  { id: "44444444-4444-4444-4444-444444444444", label: "Client fictif A · démonstration" },
  { id: "66666666-6666-6666-6666-666666666666", label: "Client fictif B · démonstration" },
];
const vehicles = [
  { id: "55555555-5555-5555-5555-555555555555", label: "Véhicule fictif A · DEMO-01" },
  { id: "77777777-7777-7777-7777-777777777777", label: "Véhicule fictif B · DEMO-02" },
];
function Preview() {
  const [scenario, setScenario] = useState("success");
  const transport: RentalCreateTransport = async ({ body, creationKey }) => {
    const port: RentalCreatePort = { create: async () => {
      await new Promise(resolve => setTimeout(resolve, 400));
      if (scenario === "uncertain") throw new Error("Synthetic response loss");
      if (scenario === "conflict") return { kind: "rejected", sqlState: "40001" };
      return { kind: "success", data: { id: "33333333-3333-3333-3333-333333333333", version: 1, state: "brouillon", number: null } };
    } };
    const result = await createRental(body, { agencyId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", creationKey }, port);
    const status = result.ok ? 200 : result.code === "conflict" ? 409 : result.code === "uncertain" ? 503 : 400;
    return Response.json(result, { status });
  };
  return <main className="rental-preview"><div className="preview-tools"><strong>ContratPro · aperçu isolé</strong>
    <label htmlFor="scenario">Réponse simulée <select id="scenario" value={scenario} onChange={event => setScenario(event.target.value)}>
      <option value="success">Réussite fictive</option><option value="conflict">Conflit</option><option value="uncertain">Réponse perdue</option>
    </select></label></div>
    <RentalCreationForm draftScope="offline-demo-identity" clients={clients} vehicles={vehicles} transport={transport} newKey={() => crypto.randomUUID()} />
  </main>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
