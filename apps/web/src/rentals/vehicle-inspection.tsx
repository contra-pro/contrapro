import { inspectionViews, validVehicleInspections, type InspectionPresentation, type InspectionView, type VehicleInspections } from "../../../../packages/application/src/rentals/inspection-presentation";
import styles from "./vehicle-inspection.module.css";

const viewLabels = { top: ["Dessus","من الأعلى"], front: ["Avant","الأمام"], rear: ["Arrière","الخلف"], left: ["Gauche","اليسار"], right: ["Droite","اليمين"] } as const;
const categories = { scratch: ["Rayure","خدش"], dent: ["Enfoncement","انبعاج"], other: ["Autre","آخر"] } as const;
function Outline({ view }: { view: InspectionView }) {
  if (view === "top") return <g fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="27" y="7" width="46" height="86" rx="15"/><path d="M31 28 Q50 18 69 28 L65 42 H35 Z M35 58 H65 L69 75 Q50 83 31 75 Z M29 34 V68 M71 34 V68 M36 45 H64 V56 H36 Z"/><path strokeWidth="4" d="M25 24 V39 M75 24 V39 M25 65 V80 M75 65 V80"/></g>;
  if (view === "front") return <g fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M15 48 L25 25 Q50 19 75 25 L85 48 V79 H15 Z M22 47 H78 M30 29 H70 L77 43 H23 Z M32 62 H68 V72 H32 Z"/><circle cx="25" cy="58" r="5"/><circle cx="75" cy="58" r="5"/><path strokeWidth="5" d="M19 79 V86 M81 79 V86"/></g>;
  if (view === "rear") return <g fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M17 43 L28 24 H72 L83 43 V80 H17 Z M30 29 H70 L76 44 H24 Z M21 64 H79 M40 66 H60 V73 H40 Z"/><rect x="23" y="50" width="13" height="7"/><rect x="64" y="50" width="13" height="7"/><path strokeWidth="5" d="M21 80 V86 M79 80 V86"/></g>;
  return <g transform={view === "left" ? undefined : "translate(100 0) scale(-1 1)"} fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7 64 V49 L25 43 L38 27 H65 L79 43 L93 49 V65 H84 M67 65 H35 M18 65 H7 M30 43 L41 31 H62 L73 43 Z M50 31 V43 M9 52 H20 M82 50 H91"/><circle cx="26" cy="64" r="9"/><circle cx="76" cy="64" r="9"/><path d="M26 61 V67 M23 64 H29 M76 61 V67 M73 64 H79"/></g>;
}
export function VehicleInspectionPages({ inspections, bilingual = false }: { inspections: VehicleInspections; bilingual?: boolean }) {
  if (!validVehicleInspections(inspections)) return <p role="alert">Données d’inspection invalides.</p>;
  const label = (fr: string, ar: string) => <><span lang="fr">{fr}</span>{bilingual && <> / <bdi lang="ar" dir="rtl">{ar}</bdi></>}</>;
  const stage = (value: "departure" | "return") => value === "departure" ? label("Départ", "المغادرة") : label("Retour", "الإرجاع");
  function content(item: InspectionPresentation) {
    return <>
      <p className={styles.notice}>{item.provenance === "demonstration" ? label("DONNÉES FICTIVES — aucune inspection réelle", "بيانات تجريبية — لا يوجد فحص فعلي") : label("Observations fournies comme relevées — origine non vérifiée", "ملاحظات مقدمة كمعاينة — المصدر غير متحقق منه")}</p>
      <p>{label("Aucune inspection achevée ni acceptation du client attestée par cet aperçu", "هذه المعاينة لا تثبت اكتمال الفحص أو موافقة الزبون")}</p>
      <div className={styles.views}>{inspectionViews.map(view => <figure key={view}><svg data-view={view} viewBox="-22 -22 144 144" role="img" aria-label={`${viewLabels[view][0]}${bilingual ? ` / ${viewLabels[view][1]}` : ""}`}>
        <Outline view={view} />{item.damage.map((marker,index) => marker.view === view && <g key={marker.id} data-marker={index + 1} transform={`translate(${marker.x} ${marker.y})`}><title>{index + 1}. {categories[marker.category][0]}</title><circle r="20" fill="white" stroke="black" strokeWidth="1"/><text textAnchor="middle" dominantBaseline="central" fontSize="32" fontWeight="bold" fill="black">{index + 1}</text></g>)}
      </svg><figcaption>{label(viewLabels[view][0], viewLabels[view][1])}</figcaption></figure>)}</div>
      <p>{label("Carburant", "الوقود")} — {stage(item.stage)} : {item.fuelLevel === null ? label("Non renseigné", "غير متوفر") : `${item.fuelLevel}/4`}</p>
      {item.fuelLevel !== null && <div className={styles.fuel} role="img" aria-label={`${item.fuelLevel}/4`}><span>0</span>{[1,2,3,4].map(n => <span key={n} aria-hidden="true">{n <= item.fuelLevel! ? "■" : "□"}</span>)}<span>1/1</span></div>}
      <p>{label("Compteur (km)", "عداد المسافة (كم)")} : {item.mileageKm === null ? label("Non renseigné", "غير متوفر") : String(item.mileageKm)}</p>
      <h3>{label("Repères des dommages", "علامات الأضرار")}</h3>
      {item.damage.length ? <ol>{item.damage.map(marker => <li key={marker.id}>{label(categories[marker.category][0], categories[marker.category][1])} · {label(viewLabels[marker.view][0], viewLabels[marker.view][1])} · ({marker.x} %, {marker.y} %)</li>)}</ol> : <p>{label("Aucun repère fourni — ne signifie pas absence de dommages", "لا توجد علامات مقدمة — هذا لا يعني عدم وجود أضرار")}</p>}
      {item.notes !== null && <p className={styles.notes}>{label("Notes", "ملاحظات")} : {item.notes}</p>}
    </>;
  }
  return <div className={styles.stages}>{(["departure","return"] as const).map(key => <section key={key} className={styles.page} data-inspection-stage={key}>
    <h2>{label("État du véhicule", "حالة السيارة")} — {stage(key)}</h2>
    {inspections[key] ? content(inspections[key]) : <p>{label("Inspection non renseignée — aucune valeur déduite", "الفحص غير متوفر — لم يتم استنتاج أي قيمة")}</p>}
  </section>)}</div>;
}
