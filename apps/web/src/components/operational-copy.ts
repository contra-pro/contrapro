import type {Locale} from "../i18n/locales";
export function dashboardLabels(locale:Locale){const ar=locale==="ar";
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
return labels;}
