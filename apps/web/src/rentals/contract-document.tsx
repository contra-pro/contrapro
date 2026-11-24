/* eslint-disable @next/next/no-img-element -- Isolated offline preview: bounded inline PNG, no Next image server. */
import type { CSSProperties } from "react";
import { contractPresentationVersion, contractTemplates, type ContractSettings, type ReadableContractPresentation, type DemoDriver, type DemoDriverV1 } from "../../../../packages/application/src/rentals/contract-settings";
import { formatRentalMad } from "./form";
import styles from "./contract-studio.module.css";
import { ContractPagination } from "./contract-pagination";
import { VehicleInspectionPages } from "./vehicle-inspection";
import { ContractLegalFooter, ContractSignaturePlaceholders } from "./contract-legal";

export function ContractDocument({ settings, document }: { settings: ContractSettings; document: ReadableContractPresentation }) {
  if (settings.agencyId !== document.agencyId) return <p role="alert">Configuration d’agence incompatible.</p>;
  const version = contractPresentationVersion(document);
  if (!version) return <p role="alert">Version ou structure du document incompatible.</p>;
  const bilingual = settings.template === "bilingual";
  const label = (fr: string, ar: string) => <><span lang="fr">{fr}</span>{bilingual && <> / <bdi lang="ar" dir="rtl">{ar}</bdi></>}</>;
  const field = (fr: string, ar: string, value: string | null | undefined) => <p>{label(fr, ar)} : {value?.trim() ? value : label("Non renseigné", "غير متوفر")}</p>;
  const driver = (value: DemoDriver | null) => <>
    {!value && <p>{label("Conducteur facultatif non renseigné", "السائق الإضافي غير متوفر")}</p>}
    {field("Nom complet", "الاسم الكامل", value?.fullName)}{field("CIN", "رقم البطاقة الوطنية", value?.cin)}
    {field("N° de passeport", "رقم جواز السفر", value?.passportNumber)}{field("N° permis de conduire", "رقم رخصة السياقة", value?.drivingLicenseNumber)}
    {field("Ville", "المدينة", value?.city)}{field("Nationalité", "الجنسية", value?.nationality)}
    {value?.licenceDates && field("Dates du permis", "تواريخ الرخصة", value.licenceDates)}{value?.address && field("Adresse", "العنوان", value.address)}
  </>;
  const legacyDriver = (value: DemoDriverV1 | null) => value ? <><strong>{value.name}</strong><p>Identité (V1, non ventilée) : {value.identity}</p><p>Permis : {value.licence} · {value.licenceDates}</p><p>Adresse : {value.address}</p></> : <p>Non renseigné · facultatif</p>;
  return <ContractPagination className={`${styles.document} ${styles[settings.template]}`} style={{ "--brand": settings.primary, "--accent": settings.accent } as CSSProperties}>
    <article data-contract-sheet="true" className={styles.sheet} aria-label={contractTemplates[settings.template]}>
      <header className={styles.documentHeader}>{settings.logo && <img src={settings.logo} alt="Logo de l’agence" width="64" height="64" />}<div><strong>{settings.company.name}</strong><p>{settings.company.address} · {settings.company.city}</p><p>{settings.company.phone} · {settings.company.email}</p><p>ICE {settings.company.ice || "—"} · IF {settings.company.ifNumber || "—"} · RC {settings.company.rc || "—"}</p></div></header>
      <p className={styles.watermark}>DÉMONSTRATION · NON SIGNÉ · AUCUN ENREGISTREMENT</p>
      {version === 1 && <p role="note">Archive V1 — représentation historique. Identité et marque/modèle non ventilés ; aucune conversion en V2.</p>}
      <h2>{label("Contrat de location", "عقد كراء سيارة")}</h2><p>Numéro : {document.number ?? "Brouillon — numéro non attribué"}</p>
      <div className={styles.documentGrid}>
        <section><h3>{label("Conducteur principal", "السائق الرئيسي")}</h3>{(document.schemaVersion === 2 || document.schemaVersion === 3) ? driver(document.primaryDriver) : legacyDriver(document.primaryDriver)}</section>
        <section><h3>{label("Conducteur secondaire", "السائق الإضافي")}</h3>{(document.schemaVersion === 2 || document.schemaVersion === 3) ? driver(document.secondaryDriver) : legacyDriver(document.secondaryDriver)}</section>
        <section><h3>{label("Véhicule", "السيارة")}</h3>{(document.schemaVersion === 2 || document.schemaVersion === 3) ? <>{field("Marque", "العلامة التجارية", document.vehicle.make)}{field("Modèle", "الطراز", document.vehicle.model)}{field("Immatriculation", "رقم التسجيل", document.vehicle.registrationNumber)}{document.vehicle.vin && field("VIN", "رقم الهيكل", document.vehicle.vin)}</> : <><p>Marque/modèle (V1, non ventilés) : {document.vehicle.makeModel}</p><p>Immatriculation : {document.vehicle.registration}</p><p>VIN : {document.vehicle.vin}</p></>}</section>
        <section><h3>{label("Période et lieux", "المدة والأماكن")}</h3><p>Départ : {document.rental.start}</p><p>Retour : {document.rental.end}</p><p>Durée facturée : {document.rental.duration}</p><p>Prise en charge : {document.rental.pickup}</p><p>Restitution : {document.rental.returnLocation}</p></section>
        <section><h3>{label("Location", "ثمن الكراء")}</h3><p>Tarif / 24 h : {formatRentalMad(document.rental.dailyRateMinor)}</p><p>Montant location : <strong>{formatRentalMad(document.rental.amountMinor)}</strong></p><p>Dépôt de garantie distinct : {formatRentalMad(document.rental.depositMinor)}</p></section>
        <section><h3>{label("Kilométrage", "المسافة")}</h3><p>Compteur : {document.rental.mileage}</p><p>Forfait journalier : {document.rental.allowance}</p></section>
      </div>
      {document.schemaVersion !== 3 && <section><h3>{label("État du véhicule et carburant", "حالة السيارة والوقود")}</h3><p>Inspection historique — stade et provenance non déterminés, aucune conversion en V3.</p><div className={styles.diagrams}>{(["avant","arrière","gauche","droite"] as const).map(view => <figure key={view}><svg viewBox="0 0 160 90" role="img" aria-label={`Schéma illustratif ${view}`}><rect x="22" y="25" width="116" height="42" rx={view === "avant" || view === "arrière" ? 16 : 8} fill="none" stroke="currentColor" strokeWidth="2"/><path d="M45 25 L58 10 H105 L120 25 M40 67 V77 M120 67 V77" fill="none" stroke="currentColor" strokeWidth="2"/>{document.inspection.damage.filter(d => d.view === view).map((d, i) => <text key={i} x={d.x} y={d.y} fill="#a11">×</text>)}</svg><figcaption>{view}</figcaption></figure>)}</div><p>Carburant : {document.inspection.fuel} · Schémas indicatifs, aucune inspection réelle.</p><p>{document.inspection.notes}</p></section>}
      {document.schemaVersion === 3 && <VehicleInspectionPages inspections={document.inspection} bilingual={bilingual} />}
      <section data-contract-conditions="true"><h3>{label("Conditions générales de location", "الشروط العامة للكراء")}</h3><p className={styles.conditions}>{settings.conditions}</p></section>
      <ContractSignaturePlaceholders signatures={document.signatures} bilingual={bilingual} />
      <ContractLegalFooter settings={settings} agencyId={document.agencyId} />
    </article>
  </ContractPagination>;
}
