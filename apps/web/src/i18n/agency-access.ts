import type { AgencyAccess } from "../../../../packages/application/src/agency-access";
import type { Locale } from "./locales";

type Copy = {
  notice: { title: string; description: string };
  states: Record<AgencyAccess["status"], { title: string; description: string }>;
  retry: string;
  agency: string;
};

const copy: Record<Locale, Copy> = {
  fr: {
    notice: { title: "Développement — accès agence", description: "La connexion ne crée aucune adhésion. Votre accès est vérifié pour chaque agence. Aucune identité de démonstration ne donne accès au tableau de bord." },
    agency: "Agence",
    retry: "Vérifier à nouveau mon accès",
    states: {
      "signed-out": { title: "Connectez-vous pour continuer", description: "Une session valide est nécessaire pour accéder à votre agence." },
      unmapped: { title: "Configurez votre compte", description: "Votre connexion est valide. Continuez la configuration pour créer votre première agence. Aucune agence ne vous est attribuée automatiquement." },
      forbidden: { title: "Accès à l’agence indisponible", description: "Votre compte ou votre adhésion ne permet pas l’accès à une agence active. Contactez le responsable de votre agence." },
      onboarding: { title: "Bienvenue sur ContratPro", description: "Votre compte n’est associé à aucune agence. Créez votre agence pour commencer." },
      "selection-required": { title: "Choisissez votre agence", description: "Sélectionnez une agence parmi vos adhésions actives pour continuer." },
      unavailable: { title: "Connexion à votre espace indisponible", description: "Votre accès n’a pas pu être vérifié. Le tableau de bord reste fermé. Réessayez plus tard." },
      authorized: { title: "Votre espace agence", description: "Votre session et votre adhésion active ont été vérifiées. Les fonctions de gestion seront ajoutées progressivement." },
    },
  },
  ar: {
    notice: { title: "بيئة التطوير — دخول الوكالة", description: "تسجيل الدخول لا ينشئ عضوية. تُفحص صلاحية دخولك لكل وكالة. لا تمنح أي هوية تجريبية حق الدخول إلى لوحة التحكم." },
    agency: "الوكالة",
    retry: "التحقق من صلاحية الدخول مجدداً",
    states: {
      "signed-out": { title: "سجّل الدخول للمتابعة", description: "يتطلب الدخول إلى وكالتك جلسة صالحة." },
      unmapped: { title: "أكمل إعداد حسابك", description: "تسجيل دخولك صالح. تابع الإعداد لإنشاء وكالتك الأولى. لا تُمنح أي وكالة تلقائياً." },
      forbidden: { title: "الدخول إلى الوكالة غير متاح", description: "حسابك أو عضويتك لا يسمحان بالدخول إلى وكالة نشطة. تواصل مع مسؤول وكالتك." },
      onboarding: { title: "مرحباً بك في ContratPro", description: "حسابك غير مرتبط بأي وكالة. أنشئ وكالتك للبدء." },
      "selection-required": { title: "اختر وكالتك", description: "اختر وكالة من بين عضوياتك النشطة للمتابعة." },
      unavailable: { title: "الدخول إلى مساحتك غير متاح", description: "تعذر التحقق من صلاحية دخولك. تبقى لوحة التحكم مغلقة. حاول لاحقاً." },
      authorized: { title: "مساحة وكالتك", description: "تم التحقق من جلستك وعضويتك النشطة. ستُضاف وظائف الإدارة تدريجياً." },
    },
  },
};

export function agencyAccessMessages(locale: Locale): Copy { return copy[locale]; }
