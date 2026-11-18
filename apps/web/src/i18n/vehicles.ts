import type { Locale } from "./locales";
const messages = {
  fr: {
    title: "Véhicules", prepare: "Préparer une fiche véhicule", review: "Vérifier la fiche", reviewTitle: "Fiche vérifiée localement — non enregistrée",
    notice: "La gestion du parc n’est pas encore disponible. Cette fiche reste uniquement dans cette page et disparaît si vous la quittez ou la rechargez. Aucun véhicule ne sera enregistré.",
    hint: "Tous les champs sont obligatoires. Le format de l’immatriculation est vérifié, mais ni sa validité légale ni son unicité.",
    back: "Modifier la fiche", clear: "Effacer la fiche", dashboard: "Retour au tableau de bord", invalid: "Vérifiez les champs indiqués.",
    create: "Ajouter un véhicule", details: "Fiche véhicule", save: "Enregistrer le véhicule", saved: "Modifications enregistrées et vérifiées.",
    busy: "Enregistrement et vérification…", confirm: "Vérifier avant d’enregistrer", reviewSaved: "Vérifier les informations", list: "Retour aux véhicules",
    unavailable: "La gestion des véhicules n’est pas disponible. Aucune sauvegarde ne peut être confirmée.", forbidden: "Vous n’avez pas l’autorisation d’effectuer cette opération.",
    "signed-out": "Votre session a expiré. Reconnectez-vous.", "not-found": "Ce véhicule est introuvable ou inaccessible.",
    conflict: "Cette immatriculation existe déjà dans l’agence, ou la fiche a été modifiée. Consultez la liste avant de réessayer.",
    uncertain: "L’enregistrement n’a pas pu être confirmé. Consultez la liste avant toute nouvelle tentative. Aucun nouvel essai automatique n’a été effectué.",
    empty: "Aucun véhicule enregistré dans cette agence.", previous: "Précédent", next: "Suivant", loading: "Chargement des véhicules…",
    fields: { registration: "Immatriculation", make: "Marque", model: "Modèle", year: "Année du modèle", mileage: "Kilométrage (km)" },
    errors: { required: "Ce champ est obligatoire.", invalid: "La valeur saisie est invalide.", "too-long": "La valeur saisie est trop longue." },
  },
  ar: {
    title: "السيارات", prepare: "إعداد بطاقة سيارة", review: "التحقق من البطاقة", reviewTitle: "تم التحقق محلياً — لم تُحفظ البطاقة",
    notice: "إدارة السيارات غير متاحة بعد. تبقى هذه البطاقة في هذه الصفحة فقط وتختفي عند مغادرتها أو إعادة تحميلها. لن تُحفظ أي سيارة.",
    hint: "جميع الحقول إلزامية. يتم التحقق من صيغة رقم التسجيل فقط، دون تأكيد صحته القانونية أو عدم تكراره.",
    back: "تعديل البطاقة", clear: "مسح البطاقة", dashboard: "العودة إلى لوحة التحكم", invalid: "تحقق من الحقول المشار إليها.",
    create: "إضافة سيارة", details: "بطاقة السيارة", save: "حفظ السيارة", saved: "تم حفظ التعديلات والتحقق منها.",
    busy: "جارٍ الحفظ والتحقق…", confirm: "التحقق قبل الحفظ", reviewSaved: "مراجعة المعلومات", list: "العودة إلى السيارات",
    unavailable: "إدارة السيارات غير متاحة. لا يمكن تأكيد أي عملية حفظ.", forbidden: "ليس لديك إذن بإجراء هذه العملية.",
    "signed-out": "انتهت صلاحية جلستك. سجّل الدخول مجدداً.", "not-found": "السيارة غير موجودة أو لا يمكنك الوصول إليها.",
    conflict: "رقم التسجيل موجود في الوكالة أو تم تعديل البطاقة. راجع القائمة قبل المحاولة مجدداً.",
    uncertain: "تعذر تأكيد الحفظ. راجع القائمة قبل أي محاولة أخرى. لم تُجرَ أي محاولة تلقائية.",
    empty: "لا توجد سيارات مسجلة في هذه الوكالة.", previous: "السابق", next: "التالي", loading: "جارٍ تحميل السيارات…",
    fields: { registration: "رقم التسجيل", make: "العلامة التجارية", model: "الطراز", year: "سنة الطراز", mileage: "المسافة المقطوعة (كم)" },
    errors: { required: "هذا الحقل إلزامي.", invalid: "القيمة المدخلة غير صالحة.", "too-long": "القيمة المدخلة طويلة جداً." },
  },
};
export const vehicleMessages = (locale: Locale) => messages[locale];
export const vehicleFailureCodes = ["invalid", "forbidden", "unavailable", "uncertain", "conflict", "not-found", "signed-out"] as const;
export type VehicleMessageCode = typeof vehicleFailureCodes[number];
