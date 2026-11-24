"use client";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { emptyRentalForm, formatRentalMad, rentalUiOutcome, reviewRentalForm, type DemoChoice,
  type RentalCreateTransport, type RentalFormValues, type RentalUiOutcome } from "./form";
import styles from "./rental-create-form.module.css";

export type RentalCreationFormProps = Readonly<{
  draftScope: string;
  clients: readonly DemoChoice[];
  vehicles: readonly DemoChoice[];
  transport: RentalCreateTransport;
  newKey: () => string;
}>;

/** No fixtures, default fetch, agency fields or production navigation are built in. */
export function RentalCreationForm(props: RentalCreationFormProps) {
  const [revision, setRevision] = useState(0);
  return <RentalDraft key={`${props.draftScope}:${revision}`} {...props} onNewDraft={() => setRevision(value => value + 1)} />;
}

const messages: Record<RentalUiOutcome, string> = {
  success: "Simulation terminée. Aucun contrat enregistré. Le brouillon reste non numéroté, sans signature.",
  invalid: "Vérifiez les champs indiqués. La demande de simulation est invalide.",
  forbidden: "Accès refusé par la simulation. Aucun accès réel n’est activé.",
  conflict: "Conflit de demande simulé. Aucune nouvelle tentative automatique. Vérifiez la demande avant de recommencer.",
  uncertain: "Résultat non confirmé. Réessayez la même demande sans modifier le brouillon. Aucun nouvel envoi automatique.",
};

function RentalDraft({ clients, vehicles, transport, newKey, onNewDraft }: RentalCreationFormProps & { onNewDraft: () => void }) {
  const prefix = useId();
  const [values, setValues] = useState<RentalFormValues>({ ...emptyRentalForm });
  const [creationKey] = useState(newKey);
  const [status, setStatus] = useState<RentalUiOutcome | "pending" | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const flight = useRef(false);
  const alive = useRef(true);
  const snapshot = useRef<{ body: string; creationKey: string } | null>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (status && status !== "pending") feedback.current?.focus(); }, [status]);
  const review = reviewRentalForm(values, clients, vehicles);
  const errors = showErrors && !review.ok ? review.errors : {};
  const locked = status === "pending" || status === "uncertain" || status === "success" || status === "conflict" || status === "forbidden";
  const terminal = status === "success" || status === "conflict" || status === "forbidden";
  function change(field: keyof RentalFormValues) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (locked) return;
      setValues(previous => ({ ...previous, [field]: event.target.value }));
      if (status === "invalid") setStatus(null);
    };
  }
  const control = (field: keyof RentalFormValues) => ({ id: `${prefix}-${field}`, name: field, value: values[field], onChange: change(field),
    "aria-invalid": errors[field] ? true as const : undefined, "aria-describedby": errors[field] ? `${prefix}-${field}-error` : undefined });
  const error = (field: keyof RentalFormValues) => errors[field] && <span className={styles.error} id={`${prefix}-${field}-error`}>{errors[field]}</span>;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (flight.current || terminal) return;
    if (!snapshot.current) {
      if (!review.ok) { setShowErrors(true); setStatus("invalid"); return; }
      snapshot.current = { body: review.body, creationKey };
    }
    flight.current = true; setStatus("pending");
    try {
      const outcome = await rentalUiOutcome(await transport({ ...snapshot.current }));
      if (!alive.current) return;
      if (outcome === "invalid") { snapshot.current = null; setShowErrors(true); }
      setStatus(outcome);
    } catch { if (alive.current) setStatus("uncertain"); }
    finally { flight.current = false; }
  }
  return <section className={styles.root} lang="fr" aria-labelledby={`${prefix}-title`}>
    <div className={styles.notice}><strong>Démonstration locale</strong><span>Données fictives · aucun appel réseau métier · aucun enregistrement réel</span></div>
    <header className={styles.header}><p className={styles.eyebrow}>CONTRATS DE LOCATION / NOUVEAU BROUILLON</p>
      <h1 id={`${prefix}-title`}>Préparer une location</h1><p>Choisissez le client, le véhicule et la période. Vérifiez les montants avant de simuler la demande.</p></header>
    <form noValidate onSubmit={submit} aria-busy={status === "pending"}>
      <div className={styles.layout}><div className={styles.fields}>
        <fieldset disabled={locked} className={styles.panel}><legend>1. Client et véhicule</legend>
          <div className={styles.twoColumns}>
            <div><label htmlFor={`${prefix}-clientId`}>Client</label><select {...control("clientId")} required><option value="">Choisir un client fictif</option>{clients.map(choice => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select>{error("clientId")}</div>
            <div><label htmlFor={`${prefix}-vehicleId`}>Véhicule</label><select {...control("vehicleId")} required><option value="">Choisir un véhicule fictif</option>{vehicles.map(choice => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select>{error("vehicleId")}</div>
          </div>{(!clients.length || !vehicles.length) && <p className={styles.error}>Les choix de démonstration sont indisponibles.</p>}
        </fieldset>
        <fieldset disabled={locked} className={styles.panel} aria-describedby={`${prefix}-zone`}><legend>2. Période de location</legend>
          <p id={`${prefix}-zone`} className={styles.hint}>Agence : Africa/Casablanca. Vérifiez le décalage UTC pour chaque date ; les changements d’heure ne sont pas résolus automatiquement.</p>
          {(["start", "end"] as const).map(edge => <div className={styles.period} key={edge}>
            <h2>{edge === "start" ? "Début" : "Fin prévue"}</h2><div className={styles.dateColumns}>
              <div><label htmlFor={`${prefix}-${edge}Date`}>Date de {edge === "start" ? "début" : "fin"}</label><input {...control(`${edge}Date`)} type="date" required />{error(`${edge}Date`)}</div>
              <div><label htmlFor={`${prefix}-${edge}Time`}>Heure de {edge === "start" ? "début" : "fin"}</label><input {...control(`${edge}Time`)} type="text" placeholder="09:00" maxLength={15} required />{error(`${edge}Time`)}</div>
              <div><label htmlFor={`${prefix}-${edge}Offset`}>Décalage UTC {edge === "start" ? "début" : "fin"}</label><input {...control(`${edge}Offset`)} type="text" placeholder="+01:00" maxLength={6} required />{error(`${edge}Offset`)}</div>
            </div></div>)}<p className={styles.hint}>Heure : HH:MM ou HH:MM:SS, jusqu’à 6 décimales. La fin est exclue de la période.</p>
        </fieldset>
        <fieldset disabled={locked} className={styles.panel}><legend>3. Tarif et dépôt</legend><div className={styles.twoColumns}>
          <div><label htmlFor={`${prefix}-dailyRate`}>Prix journalier (MAD)</label><input {...control("dailyRate")} type="text" inputMode="decimal" maxLength={14} placeholder="350,00" required />{error("dailyRate")}</div>
          <div><label htmlFor={`${prefix}-deposit`}>Dépôt de garantie (MAD) <span className={styles.hint}>facultatif</span></label><input {...control("deposit")} type="text" inputMode="decimal" maxLength={14} placeholder="0,00" />{error("deposit")}</div>
        </div><p className={styles.hint}>Deux décimales maximum. Le dépôt est distinct du prix de location.</p></fieldset>
      </div><aside className={styles.summary} aria-labelledby={`${prefix}-summary`}><p className={styles.eyebrow}>RÉCAPITULATIF</p><h2 id={`${prefix}-summary`}>Votre estimation</h2>
        <div aria-live="polite" aria-atomic="true">{review.ok ? <>
          <dl><div><dt>Durée facturée</dt><dd>{review.price.billableDays} jour{review.price.billableDays > 1 ? "s" : ""}</dd></div>
            <div><dt>Tarif par jour</dt><dd>{formatRentalMad(review.price.dailyRateMinor)}</dd></div>
            <div className={styles.total}><dt>Location</dt><dd>{formatRentalMad(review.price.rentalTotalMinor)}</dd></div>
            <div><dt>Dépôt séparé</dt><dd>{formatRentalMad(review.price.depositMinor)}</dd></div></dl>
        </> : <p className={styles.hint}>Complétez les choix, la période et le tarif pour calculer le prix.</p>}</div>
        <p className={styles.hint}>Chaque tranche de 24 heures commencée est facturée. Aucune disponibilité n’est garantie.</p>
        <p className={styles.draft}>Brouillon non numéroté<br />Aucune signature</p>
      </aside></div>
      <div className={styles.feedback} aria-live="polite">{status && <p ref={feedback} tabIndex={-1} role={status === "pending" || status === "success" ? "status" : "alert"}>
        {status === "pending" ? "Simulation en cours…" : messages[status]}</p>}</div>
      <div className={styles.actions}><p>Cette simulation n’envoie aucune demande à Supabase.</p>
        {terminal ? <button type="button" onClick={onNewDraft}>Nouveau brouillon de démonstration</button>
          : <button type="submit" disabled={status === "pending" || !clients.length || !vehicles.length}>{status === "pending" ? "Simulation en cours…" : status === "uncertain" ? "Réessayer la même demande" : "Simuler la création"}</button>}
      </div>
    </form>
  </section>;
}
