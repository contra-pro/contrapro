import type { Locale } from "./locales";

const messages = {
  fr: {
    title: "Connexion à ContratPro", email: "Adresse e-mail", magic: "Recevoir un lien de connexion",
    google: "Continuer avec Google", signOut: "Se déconnecter", back: "Retour à mon espace",
    note: "La connexion ne crée aucune adhésion à une agence. Ouvrez le lien reçu dans ce même navigateur.",
    unavailable: "La connexion n’est pas configurée dans cet environnement.",
    sent: "Si la demande peut être traitée, un lien de connexion vous sera envoyé. Consultez votre messagerie.",
    error: "La connexion n’a pas abouti. Le lien peut être expiré ou ouvert dans un autre navigateur. Réessayez.",
    "signed-out": "Vous êtes déconnecté de ce navigateur.",
  },
  ar: {
    title: "تسجيل الدخول إلى ContratPro", email: "البريد الإلكتروني", magic: "إرسال رابط تسجيل الدخول",
    google: "المتابعة باستخدام Google", signOut: "تسجيل الخروج", back: "العودة إلى مساحتي",
    note: "تسجيل الدخول لا ينشئ عضوية في أي وكالة. افتح الرابط في هذا المتصفح نفسه.",
    unavailable: "تسجيل الدخول غير مهيأ في هذه البيئة.",
    sent: "إذا أمكن معالجة الطلب، فسيُرسل إليك رابط تسجيل الدخول. تحقق من بريدك الإلكتروني.",
    error: "تعذر تسجيل الدخول. قد تكون صلاحية الرابط انتهت أو فُتح في متصفح آخر. حاول مجدداً.",
    "signed-out": "تم تسجيل خروجك من هذا المتصفح.",
  },
};
export function authMessages(locale: Locale) { return messages[locale]; }
