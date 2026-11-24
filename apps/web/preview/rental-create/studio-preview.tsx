import { useState } from "react";
import { createRoot } from "react-dom/client";
import { defaultContractSettings, loadContractSettings, type ContractPresentation, type SimulatedContext } from "../../../../packages/application/src/rentals/contract-settings";
import { createOfflineContractLifecycle, contractLifecycleLabels, type OfflineContractLifecycle } from "../../../../packages/application/src/rentals/contract-lifecycle";
import { createMemoryContractSettingsRepository } from "../../../../packages/application/src/rentals/contract-settings-memory";
import { createRental } from "../../../../packages/application/src/rentals/create";
import { ContractSettingsStudio } from "../../src/rentals/contract-settings-studio";
import { ContractLifecycleDemo } from "../../src/rentals/contract-lifecycle-demo";
import { RentalCreationForm } from "../../src/rentals/rental-create-form";
import type { RentalCreateTransport } from "../../src/rentals/form";
import styles from "../../src/rentals/contract-studio.module.css";
import "../../src/app/globals.css";
import "./preview.css";
const repository = createMemoryContractSettingsRepository();
const lifecycle = createOfflineContractLifecycle(repository);
const agencies = ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"];
const clients = [{ id: "44444444-4444-4444-4444-444444444444", label: "Conducteur fictif · DEMO" }];
const vehicles = [{ id: "55555555-5555-5555-5555-555555555555", label: "Véhicule fictif · DEMO-01" }];
function example(agencyId: string, mode: "departure" | "both" | "missing"): ContractPresentation {
  const value: ContractPresentation = { schemaVersion: 3, demonstration: true, agencyId, rentalId: "cccccccc-cccc-cccc-cccc-cccccccccccc", number: null,
    primaryDriver: { fullName: "Conducteur fictif", cin: "CIN-DEMO", passportNumber: null, drivingLicenseNumber: "PERMIS-DEMO", city: "Ville fictive", nationality: null, licenceDates: null, address: null }, secondaryDriver: null,
    vehicle: { registrationNumber: "DEMO-01", make: "Marque fictive", model: "Modèle fictif", vin: null },
    rental: { start: "20/11/2026 09:00 · Africa/Casablanca (exemple)", end: "22/11/2026 09:00 (exemple)", duration: "2 × 24 h", pickup: "Agence fictive", returnLocation: "Agence fictive", dailyRateMinor: 30000n, amountMinor: 60000n, depositMinor: 200000n, mileage: "10 000 km (fictif)", allowance: "200 km / jour (fictif)" },
    inspection: { departure: { stage: "departure", provenance: "demonstration", fuelLevel: 3, mileageKm: 10000, notes: "Exemple fictif. Aucun constat réel.", damage: [{ id: "demo-1", view: "left", category: "scratch", x: 55, y: 48 }, { id: "demo-2", view: "top", category: "dent", x: 50, y: 65 }] }, return: null }, signatures: { customer: "not-signed", agency: "not-signed" } };
  if (mode === "both") value.inspection.return = { stage: "return", provenance: "demonstration", fuelLevel: 1, mileageKm: 10200, notes: "Retour fictif uniquement — aucune restitution réelle.", damage: [{ id: "return-demo", view: "rear", category: "other", x: 70, y: 55 }] };
  if (mode === "missing") value.inspection = { departure: null, return: null };
  return value;
}
function Preview() {
  const [agency, setAgency] = useState(0), [role, setRole] = useState<"owner"|"staff">("owner"), [tab, setTab] = useState("settings"), [revision, setRevision] = useState(0);
  const [documents, setDocuments] = useState<OfflineContractLifecycle[]>([]), [selected, setSelected] = useState(0);
  const [inspectionFixture, setInspectionFixture] = useState<"departure" | "both" | "missing">("both");
  const [savedByAgency, setSavedByAgency] = useState<Record<string, Awaited<ReturnType<typeof loadContractSettings>>>>({});
  const context: SimulatedContext = { simulation: true, agencyId: agencies[agency]!, role };
  const saved = savedByAgency[context.agencyId] ?? null;
  const initial = defaultContractSettings(context.agencyId, { name: `Agence fictive ${agency ? "B" : "A"}`, ice: "", ifNumber: "", rc: "", address: "Adresse fictive", city: "Casablanca", phone: "+212600000000", email: "demo@example.invalid" });
  async function refresh() { const value = await loadContractSettings(repository, context); setSavedByAgency(previous => ({ ...previous, [context.agencyId]: value })); }
  const transport: RentalCreateTransport = async ({ body, creationKey }) => {
    const settings = await loadContractSettings(repository, context);
    if (!settings) return Response.json({ ok: false, code: "forbidden" }, { status: 403 });
    const result = await createRental(body, { agencyId: context.agencyId, creationKey }, { create: async args => {
      const doc = example(context.agencyId, inspectionFixture); doc.rentalId = crypto.randomUUID();
      doc.rental = { ...doc.rental, start: args.p_details.start, end: args.p_details.end, duration: "Période validée — montants calculés", dailyRateMinor: BigInt(args.p_details.dailyRateMinor), depositMinor: BigInt(args.p_details.depositMinor ?? 0) };
      const { parseRentalCreateJson } = await import("../../../../packages/domain/src/rentals/json-boundary");
      const parsed = parseRentalCreateJson(body);
      if (!parsed.ok) return { kind: "rejected", sqlState: "22023" };
      doc.rental.amountMinor = parsed.value.rentalTotalMinor;
      doc.rental.duration = `${parsed.value.billableDays} × 24 h`;
      const draft = await lifecycle.createDraft(context, doc);
      if (!draft.ok) return { kind: "rejected", sqlState: draft.code === "conflict" ? "40001" : "42501" };
      setDocuments(previous => [...previous, draft.value]);
      return { kind: "success", data: { id: doc.rentalId, version: 1, state: "brouillon", number: null } };
    } });
    return Response.json(result, { status: result.ok ? 200 : 400 });
  };
  const ownDocuments = documents.filter(d => d.agencyId === context.agencyId);
  return <main className={styles.studio}><h1>Studio des contrats</h1><p className={styles.notice}>Démonstration locale · données fictives · mémoire temporaire perdue au redémarrage/rechargement. Aucun contrat enregistré, aucune signature réelle.</p>
    <div className={styles.toolbar}><label>Agence simulée<select value={agency} onChange={e => { setAgency(Number(e.target.value)); setTab("settings"); setSelected(0); setRevision(v => v + 1); }}><option value={0}>Agence fictive A</option><option value={1}>Agence fictive B</option></select></label><label>Rôle simulé<select value={role} onChange={e => { setRole(e.target.value as "owner"|"staff"); setRevision(v => v + 1); }}><option value="owner">Owner</option><option value="staff">Staff</option></select></label>
      <label>Inspection fictive<select id="inspection-fixture" value={inspectionFixture} onChange={e => setInspectionFixture(e.target.value as "departure" | "both" | "missing")}><option value="both">Départ et retour fictifs</option><option value="departure">Départ seul · retour absent</option><option value="missing">Aucune donnée</option></select></label>
      <button onClick={async () => { await refresh(); setTab("settings"); setRevision(v => v + 1); }}>Paramètres agence</button><button onClick={async () => { await refresh(); setTab("create"); }}>Créer une location</button><button onClick={() => setTab("documents")}>Documents simulés ({ownDocuments.length})</button></div>
    {tab === "settings" && <ContractSettingsStudio key={`${agency}:${role}:${revision}`} initial={saved ?? initial} context={context} repository={repository} document={example(context.agencyId, inspectionFixture)} onSaved={() => { void refresh(); }} />}
    {tab === "create" && (saved ? <><p>Modèle enregistré hérité automatiquement : {saved.template} · révision {saved.revision}. Aucun choix de logo dans la location.</p><RentalCreationForm draftScope={`${agency}:${role}`} clients={clients} vehicles={vehicles} transport={transport} newKey={() => crypto.randomUUID()} /></> : <p role="alert">Cette agence n’a pas encore de configuration enregistrée. Un Owner simulé doit la configurer.</p>)}
    {tab === "documents" && <><div className={styles.toolbar}><p>Cycle de vie simulé : brouillon → finalisé → signature en attente. Aucun envoi ni signature réelle.</p><label className={styles.documentSelector}>Document<select value={selected} onChange={e => setSelected(Number(e.target.value))}>{ownDocuments.map((d,i) => <option value={i} key={d.id}>Location fictive {i + 1} · {contractLifecycleLabels[d.state]} · r{d.revision}</option>)}</select></label></div><ContractLifecycleDemo key={`${context.agencyId}:${selected}`} context={context} service={lifecycle} entry={ownDocuments[selected] ?? null} onChanged={value => setDocuments(previous => previous.map(entry => entry.agencyId === value.agencyId && entry.id === value.id ? value : entry))} /></>}
  </main>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
