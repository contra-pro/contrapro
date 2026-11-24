import { useId } from "react";
import { readRentalDetail, type RentalDetailContext, type RentalDetailInstant, type RentalState } from "../../../../packages/application/src/rentals/detail";
import { formatRentalMad, type DemoChoice } from "./form";
import { formatRentalInstant } from "./detail-time";
import styles from "./rental-details.module.css";

const labels: Record<RentalState, string> = { brouillon: "Brouillon", confirme: "Confirmé", en_cours: "En cours", termine: "Terminé", annule: "Annulé" };
function Instant({ value }: { value: RentalDetailInstant }) {
  const display = formatRentalInstant(value);
  return <><time dateTime={value.source}>{display.local}</time><small className={styles.utc}>UTC : {display.utc}</small></>;
}

/** Read-only fixture/response injection. No fetch, default data, route or mutation controls. */
export function RentalDetails({ response, context, clients = [], vehicles = [] }: {
  response: unknown; context: RentalDetailContext; clients?: readonly DemoChoice[]; vehicles?: readonly DemoChoice[];
}) {
  const heading = useId();
  const result = readRentalDetail(response, context);
  if (!result.ok) return <section lang="fr" className={styles.root} aria-labelledby={heading}>
    <p className={styles.notice}><strong>Démonstration locale</strong> · aucune donnée réelle chargée</p>
    <h1 id={heading}>{result.code === "not-found" ? "Aucun contrat trouvé" : "Détails indisponibles"}</h1>
    <p role="alert">La réponse de démonstration ne peut pas être affichée. Aucun accès réel n’est activé.</p>
  </section>;
  const rental = result.value;
  return <section lang="fr" className={styles.root} aria-labelledby={heading}>
    <p className={styles.notice}><strong>Démonstration locale</strong> · données fictives injectées, aucun enregistrement réel</p>
    <header className={styles.header}><div><p className={styles.eyebrow}>CONTRAT DE LOCATION / CONSULTATION</p><h1 id={heading}>Détail de la location</h1>
      <p>Vue en lecture seule. Aucune confirmation, signature ou action de gestion n’est activée.</p></div><span className={styles.badge}>{labels[rental.state]}</span></header>
    <div className={styles.layout}><div className={styles.stack}>
      <section className={styles.panel} aria-labelledby={`${heading}-parties`}><h2 id={`${heading}-parties`}>Client et véhicule</h2><dl className={styles.grid}>
        <div><dt>Client</dt><dd>{clients.find(choice => choice.id === rental.clientId)?.label ?? "Référence client"}<small className={styles.reference}>{rental.clientId}</small></dd></div>
        <div><dt>Véhicule</dt><dd>{vehicles.find(choice => choice.id === rental.vehicleId)?.label ?? "Référence véhicule"}<small className={styles.reference}>{rental.vehicleId}</small></dd></div>
      </dl></section>
      <section className={styles.panel} aria-labelledby={`${heading}-period`}><h2 id={`${heading}-period`}>Période de location</h2>
        <p className={styles.hint}>Heures locales · Africa/Casablanca · période [début, fin)</p><dl className={styles.grid}>
          <div><dt>Début</dt><dd><Instant value={rental.startsAt} /></dd></div>
          <div><dt>Fin prévue</dt><dd><Instant value={rental.endsAt} /></dd></div>
        </dl><p className={styles.hint}>Les instants UTC sont conservés à la microseconde. La fin prévue ne prouve pas la restitution du véhicule.</p>
      </section>
      <section className={styles.panel} aria-labelledby={`${heading}-history`}><h2 id={`${heading}-history`}>État et références</h2><dl className={styles.grid}>
        <div><dt>Identifiant de location</dt><dd className={styles.reference}>{rental.id}</dd></div>
        <div><dt>Agence</dt><dd className={styles.reference}>{rental.agencyId}</dd></div>
        <div><dt>Version</dt><dd>{rental.version}</dd></div>
        <div><dt>Numéro fourni par la fixture</dt><dd>{rental.contractNumber ?? "Aucun numéro — attribution uniquement à la confirmation."}</dd></div>
        <div><dt>Création</dt><dd><Instant value={rental.createdAt} /></dd></div>
        <div><dt>Dernière modification</dt><dd><Instant value={rental.updatedAt} /></dd></div>
        {rental.confirmedAt && <div><dt>Confirmation simulée</dt><dd><Instant value={rental.confirmedAt} /></dd></div>}
        {rental.returnedAt && <div><dt>Restitution explicite simulée</dt><dd><Instant value={rental.returnedAt} /></dd></div>}
      </dl></section>
    </div><aside className={styles.panel} aria-labelledby={`${heading}-amount`}><p className={styles.eyebrow}>MONTANTS EN MAD</p><h2 id={`${heading}-amount`}>Récapitulatif</h2><dl className={styles.amounts}>
      <div><dt>Durée facturée</dt><dd>{rental.billableDays} jour{rental.billableDays > 1 ? "s" : ""}</dd></div>
      <div><dt>Tarif journalier</dt><dd>{formatRentalMad(rental.dailyRateMinor)}</dd></div>
      <div className={styles.total}><dt>Location</dt><dd>{formatRentalMad(rental.totalMinor)}</dd></div>
      <div><dt>Dépôt séparé</dt><dd>{formatRentalMad(rental.depositMinor)}</dd></div>
    </dl><p className={styles.hint}>Facturation par tranche de 24 heures commencée. Le dépôt n’est pas inclus dans le prix de location.</p>
      {rental.physicalUnavailable && <p className={styles.warning}>Véhicule non restitué sur une autre location (signal de démonstration).</p>}
      {rental.overdueConflict && <p className={styles.warning}>Conflit avec une location en retard. Aucune remise du véhicule n’est autorisée par cette vue.</p>}
      <p className={styles.hint}>Ces indicateurs sont un instantané ; ils ne garantissent ni disponibilité ni autorisation.</p>
    </aside></div>
  </section>;
}
