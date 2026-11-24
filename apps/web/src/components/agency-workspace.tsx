import type { Locale } from "../i18n/locales";
import { AreaShell } from "./area-shell";
import { agencyAccessMessages } from "../i18n/agency-access";
import { AgencyNavigation } from "./agency-navigation";
import { SessionSync } from "../auth/session-sync";
import { SignOutForm } from "./sign-out-form";
export function AgencyWorkspace({ locale, title, description, children }: {
  locale: Locale; title: string; description?: string; children: React.ReactNode;
}) {
  return <AreaShell locale={locale} area="agency" notice={agencyAccessMessages(locale).notice}>
    <SessionSync /><AgencyNavigation locale={locale} />
    <SignOutForm locale={locale} />
    <section className="intro" aria-labelledby="page-title"><h1 id="page-title">{title}</h1>{description && <p className="description">{description}</p>}</section>
    {children}
  </AreaShell>;
}
