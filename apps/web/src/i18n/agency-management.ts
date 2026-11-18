import type { Locale } from "./locales";
const messages = {
  fr: {
    dashboard: "Tableau de bord", clients: "Clients", create: "Créer une agence", profile: "Profil de l’agence", settings: "Paramètres", select: "Choisir une agence",
    createTitle: "Bienvenue dans votre nouvelle agence", createText: "Renseignez les coordonnées de votre agence. Vous en deviendrez le propriétaire. Elle sera active dès sa création.",
    profileTitle: "Les coordonnées de votre agence", settingsTitle: "Les préférences de votre agence", selectTitle: "Dans quelle agence souhaitez-vous travailler ?",
    optional: "Facultatif", required: "Obligatoire", save: "Enregistrer les modifications", submit: "Créer mon agence", choose: "Ouvrir cette agence", busy: "Enregistrement…",
    saved: "Les modifications ont été enregistrées et vérifiées.", unavailable: "La gestion de votre agence n’est pas disponible pour le moment.",
    forbidden: "Vous n’avez pas l’autorisation d’effectuer cette opération.", "signed-out": "Votre session a expiré. Reconnectez-vous.",
    uncertain: "Impossible de confirmer l’opération. Vérifiez votre tableau de bord avant de recommencer. Aucune nouvelle tentative automatique n’a été effectuée.",
    invalid: "Vérifiez les champs indiqués.", ownerOnly: "Seul le propriétaire de l’agence peut modifier ces informations.",
    noStorage: "La gestion du logo et des signataires n’est pas encore disponible.", defaults: "Ces préférences s’appliquent aux futurs documents.",
    hints: "ICE : 15 chiffres. IF : chiffres uniquement. Téléphone : indicatif et chiffres, sans espaces. ICE, IF et RC peuvent être complétés plus tard.",
    fields: { name: "Raison sociale / nom commercial", ice: "ICE", ifNumber: "IF", rc: "RC", address: "Adresse", city: "Ville", phone: "Téléphone", email: "E-mail professionnel", defaultLocale: "Langue par défaut", timeZone: "Fuseau horaire", currency: "Devise" },
    errors: { required: "Ce champ est obligatoire.", invalid: "La valeur saisie n’est pas valide.", "too-long": "La valeur saisie est trop longue." },
  },
  ar: {
    dashboard: "لوحة التحكم", clients: "العملاء", create: "إنشاء وكالة", profile: "ملف الوكالة", settings: "الإعدادات", select: "اختيار وكالة",
    createTitle: "مرحباً بك في وكالتك الجديدة", createText: "أدخل بيانات وكالتك. ستصبح مالكها وستكون نشطة فور إنشائها.",
    profileTitle: "بيانات الاتصال بوكالتك", settingsTitle: "تفضيلات وكالتك", selectTitle: "في أي وكالة ترغب في العمل؟",
    optional: "اختياري", required: "إلزامي", save: "حفظ التغييرات", submit: "إنشاء وكالتي", choose: "فتح هذه الوكالة", busy: "جارٍ الحفظ…",
    saved: "تم حفظ التغييرات والتحقق منها.", unavailable: "إدارة وكالتك غير متاحة حالياً.",
    forbidden: "ليس لديك إذن بإجراء هذه العملية.", "signed-out": "انتهت صلاحية جلستك. سجّل الدخول مجدداً.",
    uncertain: "تعذر تأكيد العملية. تحقق من لوحة التحكم قبل المحاولة مجدداً. لم تُجرَ أي محاولة تلقائية أخرى.",
    invalid: "تحقق من الحقول المشار إليها.", ownerOnly: "مالك الوكالة وحده يستطيع تعديل هذه المعلومات.",
    noStorage: "إدارة الشعار والموقّعين غير متاحة بعد.", defaults: "تُطبّق هذه التفضيلات على المستندات المقبلة.",
    hints: "ICE: خمسة عشر رقماً. IF: أرقام فقط. الهاتف: رمز الاتصال والأرقام دون مسافات. يمكن إكمال ICE وIF وRC لاحقاً.",
    fields: { name: "الاسم القانوني / التجاري", ice: "ICE", ifNumber: "IF", rc: "RC", address: "العنوان", city: "المدينة", phone: "الهاتف", email: "البريد الإلكتروني المهني", defaultLocale: "اللغة الافتراضية", timeZone: "المنطقة الزمنية", currency: "العملة" },
    errors: { required: "هذا الحقل إلزامي.", invalid: "القيمة المدخلة غير صالحة.", "too-long": "القيمة المدخلة طويلة جداً." },
  },
};
export const agencyManagementMessages = (locale: Locale) => messages[locale];
