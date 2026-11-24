import type { Locale } from "../i18n/locales";
import { billingCopy } from "../billing/copy";
const fr = {
  title: "Contrats de location", create: "Nouveau contrat", unavailable: "Les contrats sont indisponibles. Réessayez après vérification de la configuration.",
  forbidden: "Accès refusé.", loading: "Chargement…", empty: "Aucun contrat.", back: "Retour aux contrats", draft: "Brouillon non numéroté",
  client: "Client / conducteur principal", vehicle: "Véhicule actif", secondary: "Conducteur secondaire (facultatif)", search: "Rechercher", choose: "Choisir",
  start: "Début (date ISO avec décalage UTC)", end: "Fin (date ISO avec décalage UTC)", rate: "Tarif journalier (MAD)", deposit: "Dépôt séparé (MAD)",
  save: "Enregistrer le brouillon", update: "Modifier le brouillon", driver: "Enregistrer le conducteur", confirm: "Confirmer et numéroter", handover: "Remettre le véhicule",
  complete: "Enregistrer le retour", cancel: "Annuler le contrat", extend: "Prolonger", returnConfirmed: "Je confirme le retour physique du véhicule",
  confirmAction: "Je confirme cette opération", pending: "Enregistrement…", saved: "Enregistré.", invalid: "Vérifiez les champs, les dates et les montants.",
  conflict: "Le contrat a changé ou le véhicule est indisponible. Rechargez avant toute nouvelle opération.",
  uncertain: "Résultat non confirmé. Rechargez le contrat avant toute nouvelle opération. Pour une création, réessayez uniquement la même demande.",
  reload: "Recharger", retry: "Réessayer la même création", previous: "Précédent", next: "Suivant", total: "Total location", days: "Jours facturés",
  periodHint: "Exemple : 2026-12-01T09:00:00+01:00. Vérifiez le décalage UTC de chaque date. Chaque tranche de 24 h commencée est facturée.",
  immutable: "Les références client/véhicule restent fixes. Les contrats terminés ou annulés sont conservés sans modification.",
  physical: "Un autre contrat indique un véhicule non retourné. La remise nécessite un retour effectif.",
  document: "Données du document", documentHint: "Les parties sont figées à la confirmation. PDF, modèles, signatures et synchronisation seront raccordés lors de l’intégration finale.",
  unsigned: "Non signé · signature agence puis client · synchronisation non envoyée", none: "Aucun", page: "Page",
  states: { brouillon: "Brouillon", confirme: "Confirmé", en_cours: "En cours", termine: "Terminé", annule: "Annulé" },
};
const ar: typeof fr = {
  title: "عقود الكراء", create: "عقد جديد", unavailable: "العقود غير متاحة. أعد المحاولة بعد التحقق من الإعدادات.", forbidden: "غير مسموح بالوصول.",
  loading: "جار التحميل…", empty: "لا توجد عقود.", back: "العودة إلى العقود", draft: "مسودة بدون رقم", client: "العميل / السائق الرئيسي", vehicle: "مركبة نشطة",
  secondary: "السائق الثاني (اختياري)", search: "بحث", choose: "اختر", start: "البداية (تاريخ ISO مع فرق UTC)", end: "النهاية (تاريخ ISO مع فرق UTC)",
  rate: "السعر اليومي (درهم)", deposit: "الضمان المنفصل (درهم)", save: "حفظ المسودة", update: "تعديل المسودة", driver: "حفظ السائق",
  confirm: "تأكيد العقد وإصدار الرقم", handover: "تسليم المركبة", complete: "تسجيل الإرجاع", cancel: "إلغاء العقد", extend: "تمديد",
  returnConfirmed: "أؤكد الإرجاع الفعلي للمركبة", confirmAction: "أؤكد هذه العملية", pending: "جار الحفظ…", saved: "تم الحفظ.",
  invalid: "تحقق من الحقول والتواريخ والمبالغ.", conflict: "تغير العقد أو المركبة غير متاحة. أعد التحميل قبل أي عملية أخرى.",
  uncertain: "لم تتأكد النتيجة. أعد تحميل العقد قبل أي عملية أخرى. عند الإنشاء أعد إرسال نفس الطلب فقط.", reload: "إعادة التحميل", retry: "إعادة نفس طلب الإنشاء",
  previous: "السابق", next: "التالي", total: "مجموع الكراء", days: "الأيام المحتسبة",
  periodHint: "مثال: 2026-12-01T09:00:00+01:00. تحقق من فرق UTC لكل تاريخ. تحتسب كل فترة 24 ساعة بدأت.",
  immutable: "تبقى مراجع العميل والمركبة ثابتة. تحفظ العقود المنتهية والملغاة دون تعديل.", physical: "يوجد عقد آخر لم تسجل عودة مركبته. يلزم الإرجاع الفعلي قبل التسليم.",
  document: "بيانات الوثيقة", documentHint: "تثبت بيانات الأطراف عند التأكيد. سيتم ربط PDF والقوالب والتوقيعات والمزامنة عند التكامل النهائي.",
  unsigned: "غير موقع · توقيع الوكالة ثم العميل · لم ترسل المزامنة", none: "لا يوجد", page: "الصفحة",
  states: { brouillon: "مسودة", confirme: "مؤكد", en_cours: "جار", termine: "منته", annule: "ملغى" },
};
export const rentalMessages = (locale: Locale) => ({...(locale === "ar" ? ar : fr),quota:billingCopy(locale).quota,restricted:billingCopy(locale).restricted});
