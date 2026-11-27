import "server-only";
import { notFound } from "next/navigation";
import { getAgencyContext } from "../server/agency-access";
import { AgencyAccessView } from "../components/agency-access-view";
import { AgencyWorkspace } from "../components/agency-workspace";
import { isLocale } from "../i18n/locales";
import { TemplateLibrary } from "./workspace";
export async function TemplatePage({ locale }: { locale: string }) {
  if (!isLocale(locale)) notFound(); const context = await getAgencyContext();
  if (context.access.status !== "authorized") return <AgencyAccessView locale={locale} access={context.access} />;
  return <AgencyWorkspace locale={locale} agencyName={context.access.agencyName} agencyScope={context.access.agencyId+":"+context.access.userId} title={locale === "ar" ? "نماذج العقود" : "Modèles de contrat"}>
    {process.env.CONTRATPRO_DOCUMENTS_VERIFIED !== "true" ? <p role="status">{locale === "ar" ? "إدارة المستندات غير متاحة حتى اكتمال التحقق." : "Gestion documentaire indisponible avant vérification de l’intégration."}</p> :
      <TemplateLibrary key={`${context.access.userId}:${context.access.agencyId}`} locale={locale} a1Enabled={process.env.CONTRATPRO_A1_VERIFIED==="true"} a2Enabled={process.env.CONTRATPRO_A2_VERIFIED==="true"} />}
  </AgencyWorkspace>;
}
