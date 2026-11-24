import type { AgencyAccess } from "../../../../packages/application/src/agency-access";
import type { Locale } from "../i18n/locales";
/** Navigation only. Canonical provisioning and agency creation remain explicit authorized POSTs. */
export function authDestination(locale: Locale, status: AgencyAccess["status"]): string | null {
  if (status === "signed-out") return `/${locale}/sign-in`;
  if (status === "onboarding") return `/${locale}/app/onboarding`;
  if (status === "selection-required") return `/${locale}/app/select`;
  if (status === "authorized") return `/${locale}/app`;
  return null;
}
