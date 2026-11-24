import { useState, type FormEvent } from "react";
import { contractTemplates, saveContractSettings, type ContractSettings, type ContractSettingsRepository, type ContractPresentation, type SimulatedContext } from "../../../../packages/application/src/rentals/contract-settings";
import { ContractDocument } from "./contract-document";
import styles from "./contract-studio.module.css";

/** Remount with key=agencyId/role when simulated context changes. No default repository. */
export function ContractSettingsStudio({ initial, context, repository, document, onSaved }: {
  initial: ContractSettings; context: SimulatedContext; repository: ContractSettingsRepository; document: ContractPresentation; onSaved: () => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(initial));
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const editable = context.role === "owner" && context.simulation && context.agencyId === draft.agencyId;
  async function submit(event: FormEvent) {
    event.preventDefault(); if (pending) return; setPending(true);
    const result = await saveContractSettings(repository, context, draft);
    setPending(false);
    if (result === "saved") { setDraft(value => ({ ...value, revision: value.revision + 1 })); onSaved(); }
    setStatus(result === "saved" ? "Configuration enregistrée en mémoire pour cette agence." : "Configuration refusée ou indisponible. Vérifiez les champs et rechargez en cas de conflit.");
  }
  return <div className={styles.workspace}><form className={styles.editor} onSubmit={submit}>
    <h2>Paramètres du contrat</h2><p>Owner simulé uniquement. Révision {draft.revision}. Aperçu des modifications non enregistrées.</p>
    <fieldset disabled={!editable || pending}><legend>Identité visuelle</legend>
      <label>Modèle<select value={draft.template} onChange={e => setDraft({ ...draft, template: e.target.value as ContractSettings["template"] })}>{Object.entries(contractTemplates).map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label>Logo PNG · 200 Kio maximum<input type="file" accept="image/png" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 204800) { setStatus("Logo trop volumineux."); return; } const buffer = new Uint8Array(await file.arrayBuffer()); let raw = ""; for (const byte of buffer) raw += String.fromCharCode(byte); const logo = `data:image/png;base64,${btoa(raw)}`; const { validContractLogo } = await import("../../../../packages/application/src/rentals/contract-settings"); if (!validContractLogo(logo)) { setStatus("Logo PNG invalide."); return; } setDraft(value => ({ ...value, logo })); }} /></label>
      <button type="button" onClick={() => setDraft({ ...draft, logo: null })}>Retirer le logo</button>
      <label>Couleur principale<input type="color" value={draft.primary} onChange={e => setDraft({ ...draft, primary: e.target.value })} /></label>
      <label>Couleur d’accent<input type="color" value={draft.accent} onChange={e => setDraft({ ...draft, accent: e.target.value })} /></label>
    </fieldset>
    <fieldset disabled={!editable || pending}><legend>Informations de l’agence</legend>{Object.entries(draft.company).map(([key,value]) => <label key={key}>{({ name: "Raison sociale", ice: "ICE", ifNumber: "Identifiant fiscal", rc: "Registre de commerce", address: "Adresse", city: "Ville", phone: "Téléphone", email: "E-mail" } as Record<string,string>)[key]}<input value={value} onChange={e => setDraft({ ...draft, company: { ...draft.company, [key]: e.target.value } })} /></label>)}</fieldset>
    <label>Conditions générales<textarea disabled={!editable || pending} maxLength={8000} rows={8} value={draft.conditions} onChange={e => setDraft({ ...draft, conditions: e.target.value })} /></label>
    <label>Pied de page et mentions<textarea disabled={!editable || pending} maxLength={500} value={draft.footer} onChange={e => setDraft({ ...draft, footer: e.target.value })} /></label>
    <button disabled={!editable || pending} type="submit">{pending ? "Enregistrement…" : "Enregistrer pour cette agence"}</button><p role="status">{status || (!editable ? "Lecture seule — Staff simulé." : "Aucune sauvegarde permanente.")}</p>
  </form><section aria-label="Aperçu A4"><ContractDocument settings={draft} document={document} /></section></div>;
}
