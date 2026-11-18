import type { Locale } from "./locales";

export type Area = "agency" | "platform" | "signing";
type Messages = {
  product: string;
  skip: string;
  navigation: string;
  language: string;
  development: string;
  notice: string;
  status: string;
  statusText: string;
  next: string;
  nextText: string;
  footer: string;
  areas: Record<Area, { label: string; title: string; description: string }>;
};

const messages = {
  fr: {
    product: "Location automobile au Maroc",
    skip: "Aller au contenu",
    navigation: "Espaces de développement",
    language: "Langue",
    development: "Développement uniquement · P1.1",
    notice: "Cette page est une maquette publique, sans authentification ni protection d’accès. N’y saisissez aucune donnée réelle.",
    status: "Un espace en préparation",
    statusText: "Seule la structure de l’application est disponible. Aucune opération métier n’est activée.",
    next: "La suite",
    nextText: "Les accès, les permissions et les fonctionnalités seront ajoutés dans des étapes distinctes.",
    footer: "ContratPro · Environnement de développement",
    areas: {
      agency: {
        label: "Espace agence",
        title: "Votre agence, un espace dédié.",
        description: "Le futur espace de travail de votre équipe pour les clients, les véhicules et les contrats de location.",
      },
      platform: {
        label: "Administration plateforme",
        title: "Un espace distinct pour la plateforme.",
        description: "La future administration de ContratPro, séparée des espaces agences. Aucun accès administrateur n’est actif.",
      },
      signing: {
        label: "Espace de signature",
        title: "Une signature, étape par étape.",
        description: "Le futur parcours public de signature. Aucun contrat, lien d’invitation ou mécanisme de signature n’est disponible.",
      },
    },
  },
  ar: {
    product: "كراء السيارات في المغرب",
    skip: "الانتقال إلى المحتوى",
    navigation: "مساحات التطوير",
    language: "اللغة",
    development: "للتطوير فقط · P1.1",
    notice: "هذه صفحة تجريبية عامة دون مصادقة أو حماية للوصول. لا تُدخل أي بيانات حقيقية.",
    status: "مساحة قيد الإعداد",
    statusText: "المتاح حالياً هو هيكل التطبيق فقط. لم يتم تفعيل أي عمليات خاصة بالعمل.",
    next: "الخطوة التالية",
    nextText: "ستُضاف آليات الوصول والصلاحيات والوظائف في مراحل مستقلة.",
    footer: "ContratPro · بيئة التطوير",
    areas: {
      agency: {
        label: "مساحة الوكالة",
        title: "مساحة مخصصة لوكالتك.",
        description: "مساحة العمل المستقبلية لفريقك لإدارة العملاء والسيارات وعقود الكراء.",
      },
      platform: {
        label: "إدارة المنصة",
        title: "مساحة مستقلة لإدارة المنصة.",
        description: "الإدارة المستقبلية لمنصة ContratPro، منفصلة عن مساحات الوكالات. لا توجد صلاحيات إدارية مفعّلة.",
      },
      signing: {
        label: "مساحة التوقيع",
        title: "التوقيع، خطوة بخطوة.",
        description: "المسار العام المستقبلي للتوقيع. لا تتوفر حالياً عقود أو روابط دعوة أو آليات توقيع.",
      },
    },
  },
} satisfies Record<Locale, Messages>;

export function getMessages(locale: Locale): Messages {
  return messages[locale];
}
