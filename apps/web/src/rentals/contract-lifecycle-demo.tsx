"use client";

import { useState, type FormEvent } from "react";
import { contractLifecycleLabels, futureSigningEvidenceRequirements, type ContractLifecycleState, type LifecycleResult, type OfflineContractLifecycle, type OfflineContractLifecycleService } from "../../../../packages/application/src/rentals/contract-lifecycle";
import type { SimulatedContext } from "../../../../packages/application/src/rentals/contract-settings";
import { ContractDocument } from "./contract-document";
import { ContractPdfExport } from "./contract-pdf-export";
import styles from "./contract-studio.module.css";

/** Remount on selected agency/document changes. All writes go through the
 * in-memory state machine; PDF printing has no lifecycle callback. */
export function ContractLifecycleDemo({ entry, service, context, onChanged }: {
  entry: OfflineContractLifecycle | null; service: OfflineContractLifecycleService; context: SimulatedContext; onChanged: (entry: OfflineContractLifecycle) => void;
}) {
  const content = entry?.state === "draft" ? entry.draft : entry?.snapshot;
  const document = content?.document;
  const initialName = document ? document.schemaVersion === 2 || document.schemaVersion === 3 ? document.primaryDriver.fullName : document.primaryDriver.name : "";
  const [name, setName] = useState(initialName), [pickup, setPickup] = useState(document?.rental.pickup ?? ""), [returnLocation, setReturn] = useState(document?.rental.returnLocation ?? "");
  const [status, setStatus] = useState({ text: "", error: false });
  if (!entry || !content || context.simulation !== true || entry.simulation !== true || entry.agencyId !== context.agencyId ||
    content.settings.agencyId !== context.agencyId || content.document.agencyId !== context.agencyId ||
    !["draft", "finalized", "signing-pending"].includes(entry.state)) return <p role="alert">Aucune location simulée disponible pour cette agence.</p>;
  const draft = entry.state === "draft";
  const dirty = draft && (name !== entry.draft.document.primaryDriver.fullName || pickup !== entry.draft.document.rental.pickup || returnLocation !== entry.draft.document.rental.returnLocation);
  function finish(result: LifecycleResult, text: string) {
    if (result.ok) { onChanged(result.value); setStatus({ text, error: false }); }
    else setStatus({ text: result.code === "conflict" ? "Révision périmée : opération refusée. Aucune relance automatique." : "Opération refusée par le cycle de vie hors ligne. Aucune relance automatique.", error: true });
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (entry!.state !== "draft") return;
    const previous = entry!.draft.document;
    finish(service.editDraft(context, entry!.id, entry!.revision, { ...previous, primaryDriver: { ...previous.primaryDriver, fullName: name }, rental: { ...previous.rental, pickup, returnLocation } }), "Modifications du brouillon enregistrées en mémoire.");
  }
  function transition(target: ContractLifecycleState) {
    if (dirty) return;
    finish(service.transition(context, entry!.id, entry!.revision, target), target === "finalized"
      ? "Finalisation simulée : document et configuration figés. Aucune validité juridique attestée."
      : "Intention de demander les signatures uniquement. Aucune demande de signature envoyée.");
  }
  return <section data-contract-lifecycle="true">
    <div className={styles.lifecycleControls}>
      <h2>Cycle de vie — démonstration hors ligne</h2>
      <p>État : <strong data-lifecycle-state={entry.state}>{contractLifecycleLabels[entry.state]}</strong> · révision {entry.revision}</p>
      <p>{draft ? "Données de simulation modifiables. Configuration d’agence héritée automatiquement" : "Instantané figé : modifications refusées. Configuration d’agence capturée"} · révision {content.settings.revision}. Aucun contrat réel, aucune signature ni validité juridique attestée.</p>
      {entry.simulationId && <p>Identifiant de simulation uniquement : <code>{entry.simulationId}</code>. Aucun numéro de contrat de production attribué.</p>}
      <form onSubmit={save}>
        <fieldset disabled={!draft}><legend>Champs du brouillon modifiables dans cette démonstration</legend>
          <label>Nom du conducteur principal<input name="lifecycle-driver-name" value={name} onChange={event => setName(event.target.value)} /></label>
          <label>Lieu de prise en charge<input name="lifecycle-pickup" value={pickup} onChange={event => setPickup(event.target.value)} /></label>
          <label>Lieu de restitution<input name="lifecycle-return" value={returnLocation} onChange={event => setReturn(event.target.value)} /></label>
          <button type="submit" disabled={!draft || !dirty}>Enregistrer les modifications du brouillon</button>
        </fieldset>
      </form>
      {dirty && <p>Enregistrez les modifications avant de finaliser le brouillon.</p>}
      <div className={styles.lifecycleActions}>
        <button type="button" data-lifecycle-action="finalized" disabled={!draft || dirty} onClick={() => transition("finalized")}>Finaliser — simulation uniquement</button>
        <button type="button" data-lifecycle-action="signing-pending" disabled={entry.state !== "finalized"} onClick={() => transition("signing-pending")}>Passer en signature en attente — sans envoi</button>
        <button type="button" data-lifecycle-action="signed" disabled title="Preuves de signature vérifiées requises">Signé — indisponible</button>
      </div>
      {entry.state === "signing-pending" && <p>Aucune demande de signature envoyée. Aucune signature, date de signature ou acceptation du client attestée.</p>}
      <details><summary>Conditions préalables à une future intégration de signature</summary><ul>{futureSigningEvidenceRequirements.map(requirement => <li key={requirement}>{requirement}</li>)}</ul></details>
      <p role={status.error ? "alert" : "status"} data-lifecycle-status="true">{status.text}</p>
    </div>
    {entry.state === "draft" ? <ContractDocument settings={entry.draft.settings} document={entry.draft.document} /> : <ContractPdfExport snapshot={entry.snapshot} agencyId={context.agencyId} />}
  </section>;
}
