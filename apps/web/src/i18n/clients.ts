import type { Locale } from "./locales";
const copy = {
  fr: {
    title: "Clients", create: "Ajouter un client", createTitle: "Un nouveau dossier client", details: "Dossier client", open: "Voir le dossier", back: "Retour aux clients",
    intro: "Retrouvez les dossiers actifs de votre agence.", search: "Nom, téléphone ou e-mail", searchButton: "Rechercher", filter: "Document", all: "Tous", none: "Non recueilli", cin: "CIN", passport: "Passeport",
    empty: "Aucun client pour le moment.", noResults: "Aucun client ne correspond à votre recherche.", reset: "Réinitialiser la recherche", results: "Résultats", page: "Page", size: "Clients par page", previous: "Précédent", next: "Suivant",
    contact: "Coordonnées", identity: "Identité", licence: "Permis de conduire", additional: "Informations complémentaires", save: "Enregistrer", busy: "Veuillez patienter…", saved: "Le dossier a été enregistré et vérifié.",
    archive: "Archiver le client", archiveQuestion: "Archiver ce dossier ?", archiveHint: "Ce client ne sera plus visible dans la liste ni dans les dossiers actifs.", confirmArchive: "Confirmer l’archivage", cancel: "Annuler", archived: "Le client a été archivé.",
    optional: "Facultatif", required: "Obligatoire", readOnly: "Vous pouvez consulter ce dossier, mais vous n’avez pas l’autorisation de le modifier.", expired: "Le permis enregistré est expiré. Vérifiez son renouvellement avant toute location.",
    documentHint: "CIN ou passeport, si recueilli. Aucun document marocain n’est exigé pour un passeport étranger.", licenceHint: "Si le numéro du permis est renseigné, indiquez ses deux dates. Aucun fichier n’est demandé.",
    unavailable: "Les dossiers clients sont temporairement indisponibles.", forbidden: "Vous n’avez pas l’autorisation d’accéder à cette opération.", "signed-out": "Votre session a expiré. Reconnectez-vous.",
    "not-found": "Ce dossier n’est pas disponible.", conflict: "Ce dossier a changé. Rechargez-le avant de modifier à nouveau.", invalid: "Vérifiez les champs indiqués.",
    uncertain: "Impossible de confirmer l’opération. Vérifiez la liste avant de recommencer. Aucune nouvelle tentative automatique n’a été effectuée.",
    fields: { firstName: "Prénom", lastName: "Nom", phone: "Téléphone", email: "E-mail", nationality: "Nationalité", identityType: "Type de document", identityNumber: "Numéro CIN / passeport", licenceNumber: "Numéro du permis", licenceIssueDate: "Date de délivrance", licenceExpiryDate: "Date d’expiration", address: "Adresse", city: "Ville", notes: "Notes utiles au dossier" },
    errors: { required: "Ce champ est obligatoire.", invalid: "La valeur saisie n’est pas valide.", "too-long": "La valeur est trop longue.", "date-order": "L’expiration doit suivre la délivrance.", "future-date": "La délivrance ne peut pas être dans le futur." },
  },
  ar: {
    title: "العملاء", create: "إضافة عميل", createTitle: "ملف عميل جديد", details: "ملف العميل", open: "عرض الملف", back: "العودة إلى العملاء",
    intro: "اطّلع على الملفات النشطة لعملاء وكالتك.", search: "الاسم أو الهاتف أو البريد الإلكتروني", searchButton: "بحث", filter: "الوثيقة", all: "الكل", none: "غير مسجل", cin: "البطاقة الوطنية", passport: "جواز السفر",
    empty: "لا يوجد عملاء بعد.", noResults: "لا يوجد عميل يطابق بحثك.", reset: "إعادة ضبط البحث", results: "النتائج", page: "الصفحة", size: "عدد العملاء في الصفحة", previous: "السابق", next: "التالي",
    contact: "بيانات الاتصال", identity: "الهوية", licence: "رخصة السياقة", additional: "معلومات إضافية", save: "حفظ", busy: "يرجى الانتظار…", saved: "تم حفظ الملف والتحقق منه.",
    archive: "أرشفة العميل", archiveQuestion: "هل تريد أرشفة هذا الملف؟", archiveHint: "لن يظهر هذا العميل في القائمة أو الملفات النشطة بعد الآن.", confirmArchive: "تأكيد الأرشفة", cancel: "إلغاء", archived: "تمت أرشفة العميل.",
    optional: "اختياري", required: "إلزامي", readOnly: "يمكنك الاطلاع على هذا الملف، لكن ليس لديك إذن بتعديله.", expired: "انتهت صلاحية الرخصة المسجلة. تحقق من تجديدها قبل أي إيجار.",
    documentHint: "سجّل البطاقة أو جواز السفر عند توفره. لا تُشترط بطاقة مغربية لحامل جواز أجنبي.", licenceHint: "عند تسجيل رقم الرخصة، أدخل تاريخي الإصدار والانتهاء. لا يُطلب رفع أي ملف.",
    unavailable: "ملفات العملاء غير متاحة مؤقتاً.", forbidden: "ليس لديك إذن بهذه العملية.", "signed-out": "انتهت صلاحية جلستك. سجّل الدخول مجدداً.",
    "not-found": "هذا الملف غير متاح.", conflict: "تغير هذا الملف. أعد تحميله قبل التعديل مجدداً.", invalid: "تحقق من الحقول المشار إليها.",
    uncertain: "تعذر تأكيد العملية. تحقق من القائمة قبل المحاولة مجدداً. لم تُجرَ أي محاولة تلقائية أخرى.",
    fields: { firstName: "الاسم الشخصي", lastName: "الاسم العائلي", phone: "الهاتف", email: "البريد الإلكتروني", nationality: "الجنسية", identityType: "نوع الوثيقة", identityNumber: "رقم البطاقة / جواز السفر", licenceNumber: "رقم رخصة السياقة", licenceIssueDate: "تاريخ الإصدار", licenceExpiryDate: "تاريخ الانتهاء", address: "العنوان", city: "المدينة", notes: "ملاحظات مفيدة للملف" },
    errors: { required: "هذا الحقل إلزامي.", invalid: "القيمة المدخلة غير صالحة.", "too-long": "القيمة طويلة جداً.", "date-order": "يجب أن يلي تاريخ الانتهاء تاريخ الإصدار.", "future-date": "لا يمكن أن يكون الإصدار في المستقبل." },
  },
};
export const clientMessages = (locale: Locale) => copy[locale];
export const clientFailureCodes = ["unavailable", "forbidden", "signed-out", "not-found", "conflict", "invalid", "uncertain"] as const;
export type ClientMessageCode = typeof clientFailureCodes[number];
