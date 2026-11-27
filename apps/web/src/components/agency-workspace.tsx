import type { Locale } from "../i18n/locales";
import { AreaShell } from "./area-shell";
import { AgencyNavigation } from "./agency-navigation";
import { SessionSync } from "../auth/session-sync";
import { SignOutForm } from "./sign-out-form";
export function AgencyWorkspace({ locale, title, description, children, agencyName, agencyScope }: {
  locale: Locale; title: string; description?: string; children: React.ReactNode; agencyName?:string;agencyScope?:string;
}) {
  return <AreaShell locale={locale} area="agency" {...(agencyScope?{agencyScope}:{})} {...(agencyName?{agencyName}:{})} navigation={<AgencyNavigation locale={locale}/>} account={<SignOutForm locale={locale}/> }>
    <SessionSync />
    <section className="intro" aria-labelledby="page-title"><h1 id="page-title">{title}</h1>{description && <p className="description">{description}</p>}</section>
    {children}
  </AreaShell>;
}
