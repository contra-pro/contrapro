"use client";

import { useRef, useState } from "react";
import { contractPresentationVersion, validContractSettings, type DocumentSnapshot } from "../../../../packages/application/src/rentals/contract-settings";
import { ContractDocument } from "./contract-document";
import styles from "./contract-studio.module.css";

/** Offline, trusted in-memory snapshots only. Never reads live agency settings.
 * Browser printing cannot attest that a user saved or downloaded a PDF. */
export function ContractPdfExport({ snapshot, agencyId }: { snapshot: DocumentSnapshot | null; agencyId: string }) {
  const content = useRef<HTMLElement>(null);
  const [status, setStatus] = useState("");
  if (!snapshot || snapshot.demonstration !== true || snapshot.document.demonstration !== true ||
    !validContractSettings(snapshot.settings) || snapshot.settings.agencyId !== agencyId || snapshot.document.agencyId !== agencyId ||
    !contractPresentationVersion(snapshot.document)) return <p role="alert">Instantané indisponible ou incompatible avec l’agence sélectionnée. Impression indisponible.</p>;

  function print() {
    if (document.fonts?.status === "loading") { setStatus("Chargement des polices en cours. Réessayez après leur chargement."); return; }
    if ([...content.current!.querySelectorAll<HTMLImageElement>("[data-contract-sheet] img")].some(image => !image.complete || image.naturalWidth === 0)) {
      setStatus("Logo non chargé. Attendez son chargement ou vérifiez l’image avant de réessayer."); return;
    }
    if (typeof window.print !== "function") { setStatus("Impression indisponible dans ce navigateur. Ouvrez cet aperçu dans un navigateur compatible."); return; }
    try {
      window.print();
      setStatus("Demande d’impression transmise au navigateur. Aucun téléchargement confirmé.");
    } catch {
      setStatus("Impossible de lancer l’impression. Réessayez avec la commande d’impression du navigateur.");
    }
  }
  return <section ref={content} data-contract-export="true" aria-label="Export PDF de l’instantané">
    <div className={styles.toolbar}>
      <button type="button" data-contract-print-action="true" onClick={print}>Imprimer / Enregistrer en PDF</button>
      <p>Impression de cet instantané uniquement, avec sa configuration d’agence enregistrée. Aucun téléchargement automatique.</p>
      <p>Choisissez « Enregistrer au format PDF », papier A4, échelle 100 %, arrière-plans activés et en-têtes/pieds de page du navigateur désactivés. Vérifiez le nombre de pages ; un contenu long peut nécessiter plusieurs pages.</p>
      <p role="status" data-pdf-status="true">{status}</p>
    </div>
    <ContractDocument settings={snapshot.settings} document={snapshot.document} />
  </section>;
}
