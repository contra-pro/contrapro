import type { Locale } from "../i18n/locales";
const labels: Record<string, [string,string]> = {
  delivery:["Livraison","التسليم"],sheets:["Synchronisation Google Sheets","مزامنة Google Sheets"],inventory:["Inventaire du stockage","جرد التخزين"],rotation:["Rotation des clés","تدوير المفاتيح"],cleanup:["Nettoyage autorisé","التنظيف المصرح به"],health:["Contrôle de santé","فحص التشغيل"],
  reminders:["Rappels","التذكيرات"],documents:["Génération des documents","إنشاء المستندات"],finalization:["Finalisation des signatures","إنهاء التوقيعات"],lifecycle:["Échéances","الآجال"],
  retained:["Conservé","محفوظ"],pending:["En attente","قيد الانتظار"],"expired-preview":["Aperçu expiré","معاينة منتهية"],"manual-review":["Revue manuelle requise","مراجعة يدوية مطلوبة"],missing:["Objet absent","عنصر مفقود"],
  success:["Réussi","ناجح"],failed:["Échec","فشل"],disabled:["Désactivé","معطل"],idle:["Aucune opération","لا توجد عملية"],completed:["Terminé","مكتمل"],
};
export function maintenanceLabel(value: string | null, locale: Locale): string {
  return value === null ? "—" : labels[value]?.[locale === "ar" ? 1 : 0] ?? (locale === "ar" ? "عملية أخرى تتطلب مراجعة دليل التشغيل" : "Autre opération : consulter le guide d’exploitation");
}
