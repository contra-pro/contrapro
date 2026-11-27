import "server-only";
import { notFound } from "next/navigation";
import { getAgencyContext } from "../server/agency-access";
import { AgencyAccessView } from "../components/agency-access-view";
import { AgencyWorkspace } from "../components/agency-workspace";
import { componentAuthClient } from "../auth/server";
import { isLocale } from "../i18n/locales";
import { rentalCapabilities } from "./data";
import { rentalMessages } from "./messages";
import { RentalDetailScreen, RentalEditor, RentalListScreen } from "./workspace";
import { isUuid } from "../../../../packages/application/src/agency-management";
export async function RentalPage({ locale, mode, id }: { locale: string; mode: "list" | "create" | "detail"; id?: string }) {
  if (!isLocale(locale) || (mode === "detail" && !isUuid(id))) notFound();
  const context = await getAgencyContext();
  if (context.access.status !== "authorized") return <AgencyAccessView locale={locale} access={context.access} />;
  const copy = rentalMessages(locale); let ready = false;
  if (process.env.CONTRATPRO_RENTALS_VERIFIED === "true" && context.canonical?.userId === context.access.userId) {
    try { await rentalCapabilities(await componentAuthClient(), context.access.agencyId); ready = true; } catch { /* Gate stays closed. */ }
  }
  return <AgencyWorkspace locale={locale} agencyName={context.access.agencyName} agencyScope={context.access.agencyId+":"+context.access.userId} title={copy.title}><div key={`${context.access.userId}:${context.access.agencyId}`}>
    {!ready ? <p role="status">{copy.unavailable}</p> : mode === "list" ? <RentalListScreen locale={locale} /> : mode === "create" ?
      <RentalEditor locale={locale} a1Enabled={process.env.CONTRATPRO_A1_VERIFIED==="true"} documentsEnabled={process.env.CONTRATPRO_DOCUMENTS_VERIFIED === "true"} /> : <RentalDetailScreen key={id} locale={locale} id={id!} a1Enabled={process.env.CONTRATPRO_A1_VERIFIED==="true"} a2Enabled={process.env.CONTRATPRO_A2_VERIFIED==="true"} documentsEnabled={process.env.CONTRATPRO_DOCUMENTS_VERIFIED === "true"} signingEnabled={process.env.CONTRATPRO_SIGNING_VERIFIED==="true"} deliveryEnabled={process.env.CONTRATPRO_DELIVERY_VERIFIED==="true"} sheetsEnabled={process.env.CONTRATPRO_SHEETS_VERIFIED==="true"} />}
  </div></AgencyWorkspace>;
}
