import Link from "next/link";
import {OpIcon} from "./operational-icon";
import {DailyPriorities} from "./daily-priorities";
import {OperationalVisualizations} from './operational-visualizations';
import {operationalKpis,latestActivity} from './dashboard-projection';
import {RentalDashboard} from './rental-dashboard';
import type {RentalPage} from '../rentals/data';
import type { Locale } from "../i18n/locales";
import { dateTime } from "../i18n/presentation";
import { type Overview } from "./operational-model";

export function OperationalDashboard({ locale, data, at, rentals=null, unavailable=false }: { locale: Locale; data: Overview; at: number; rentals?:RentalPage|null; unavailable?:boolean }) {
  const ar = locale === "ar";
  const labels: Record<string, string> = ar ? {
    rentals: "عمليات الكراء", active: "كراء جارٍ", pickups: "استلام خلال 24 ساعة أو متأخر", returns: "إرجاع خلال 24 ساعة أو متأخر", drafts: "مسودات للمراجعة", activity: "آخر تحديثات العقود",
    signing: "التوقيعات التي تتطلب متابعة", delivery: "مشاكل التسليم", sheets: "مزامنة Google Sheets",
    awaiting_agency: "توقيع الوكالة مطلوب", agency_signed: "إرسال دعوة العميل مطلوب", awaiting_client: "بانتظار توقيع العميل", client_signed: "إنهاء المستند مطلوب", finalization_pending: "إنهاء المستند معلق", reconciliation_required: "مراجعة الإنهاء مطلوبة",
    failed: "فشل", bounced: "البريد مرفوض", uncertain: "نتيجة غير مؤكدة", pending: "قيد الانتظار", processing: "قيد المعالجة", paused: "متوقف مؤقتاً", "reconciliation-required": "مراجعة المزامنة مطلوبة",
    brouillon: "مسودة", confirme: "مؤكد", en_cours: "جارٍ", termine: "مكتمل", annule: "ملغى",
  } : {
    rentals: "Opérations de location", active: "Locations en cours", pickups: "Départs sous 24 h ou en retard", returns: "Retours sous 24 h ou en retard", drafts: "Brouillons à reprendre", activity: "Dernières modifications des contrats",
    signing: "Signatures à suivre", delivery: "Problèmes de livraison", sheets: "Synchronisation Google Sheets",
    awaiting_agency: "Signature de l’agence requise", agency_signed: "Invitation client à préparer", awaiting_client: "Signature client attendue", client_signed: "Document à finaliser", finalization_pending: "Finalisation en attente", reconciliation_required: "Finalisation à réconcilier",
    failed: "Échec", bounced: "E-mail rejeté", uncertain: "Résultat incertain", pending: "En attente", processing: "En traitement", paused: "En pause", "reconciliation-required": "Synchronisation à réconcilier",
    brouillon: "Brouillon", confirme: "Confirmé", en_cours: "En cours", termine: "Terminé", annule: "Annulé",
  };
  const counts=operationalKpis(data),recent=latestActivity(data);
  const kpiLabels=ar?['كراء جارٍ','التسليم خلال 24 ساعة','الإرجاع خلال 24 ساعة','توقيعات منتظرة','مسودات','للإنهاء']:['Locations en cours','Départs sous 24 h','Retours sous 24 h','Signatures attendues','Brouillons','À finaliser'];

  return <section aria-labelledby="operations-title" className="rental-dashboard v41-dashboard">
    <div className="cp-dashboard-intro"><div><h1>{ar?'مساحة عمل الوكالة':'Votre agence, en mouvement'}</h1><p>{ar?'متابعة العقود والأولويات اليومية':'Retrouvez vos contrats et vos priorités du jour.'}</p></div><Link className="dashboard-primary-action" href={`/${locale}/app/rentals`} prefetch={false}>{ar?'فتح العقود':'Ouvrir les contrats'}</Link></div>
    <div className="op-kpis">{counts.map((count,i)=><article className={`op-kpi op-kpi-${i}`} key={i}><span className="op-kpi-icon" aria-hidden="true"><OpIcon index={i}/></span><div className="op-kpi-copy"><span className="op-kpi-label">{kpiLabels[i]}</span><strong className="op-kpi-value">{count??'—'}</strong><small className="op-kpi-help">{ar?'نتائج المتابعة المعروضة فقط':'Résultats de suivi affichés uniquement'}</small></div></article>)}</div>
    <DailyPriorities locale={locale} data={data} at={at}/>
        <OperationalVisualizations locale={locale} rows={rentals?.items??null} data={data} at={at}/>
    <div className="v41-recent-grid"><RentalDashboard locale={locale} data={rentals} now={at} unavailable={unavailable} compact/><section className="op-panel"><h2>{ar?'آخر النشاطات':'Activité récente'}</h2><p>{ar?'آخر تحديثات النتائج المعروضة':'Dernières modifications des résultats affichés'}</p>{data.rentals.status!=='ready'?<p role="status">{ar?'البيانات غير متاحة':'Données indisponibles'}</p>:recent.length?<ul>{recent.map((r,i)=><li key={r.id+':'+i}><Link href={`/${locale}/app/rentals/${r.id}`} prefetch={false}><bdi>{r.reference??(ar?'مسودة':'Brouillon')}</bdi></Link><p>{labels[r.state]} · <bdi>{r.at?dateTime(locale,r.at):'—'}</bdi></p></li>)}</ul>:<p>{ar?'لا توجد تحديثات في النتائج المعروضة':'Aucune modification dans les résultats affichés'}</p>}</section></div>
  </section>;
}
