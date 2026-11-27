import Link from "next/link";
import {ShellFrame} from "./shell-frame";
import {WorkspaceSearch} from "./workspace-search";
import {WorkspaceNotifications} from "./workspace-notifications";
import type { Locale } from "../i18n/locales";
import { getMessages, type Area } from "../i18n/messages";
import { LanguageSwitch } from "./language-switch";

const areaPaths = { agency: "app", platform: "platform", signing: "sign" } as const;

export function AreaShell({ locale, area, children, notice,navigation,agencyName,agencyScope,account }: {
  locale: Locale; area: Area; children?: React.ReactNode;
  notice?: { title: string; description: string };
  navigation?:React.ReactNode;agencyName?:string;agencyScope?:string;account?:React.ReactNode;
}) {
  const copy = getMessages(locale);
  const content = copy.areas[area];

  const header=<><Link href={`/${locale}/app`} className="brand" prefetch={false}><span className="brand-mark" aria-hidden="true">C</span><span><b dir="ltr">ContratPro</b><span className="brand-caption">{copy.product}</span></span></Link><div className="header-context">{area==='agency'&&<><WorkspaceSearch locale={locale}/><WorkspaceNotifications locale={locale}/></>}{agencyName&&<Link className="agency-context" href={`/${locale}/app/select`} prefetch={false}><span>{locale==='ar'?'الوكالة الحالية':'Agence actuelle'}</span><strong>{agencyName}</strong></Link>}{area==='agency'&&!agencyName&&<Link className="agency-switch-link" href={`/${locale}/app/select`} prefetch={false}>{locale==='ar'?'اختيار الوكالة':'Choisir une agence'}</Link>}<LanguageSwitch locale={locale} fallback={`/${locale}/${areaPaths[area]}`} label={copy.language}/></div></>;
  return <ShellFrame key={agencyScope??"no-agency"} locale={locale} area={area} header={header} navigation={navigation??<nav aria-label={copy.navigation}><Link href={`/${locale}/${areaPaths[area]}`} aria-current="page" prefetch={false}>{content.label}</Link></nav>} account={account}>
    {notice&&<div className="development-notice"><strong>{notice.title}</strong><p>{notice.description}</p></div>}
    {children??<><section className="intro" aria-labelledby="page-title"><p className="area-label">{content.label}</p><h1 id="page-title">{content.title}</h1><p className="description">{content.description}</p></section><section className="status-panel" aria-labelledby="status-title"><div className="status-symbol" aria-hidden="true">—</div><div><h2 id="status-title">{copy.status}</h2><p>{copy.statusText}</p></div></section><section className="next-step" aria-labelledby="next-title"><h2 id="next-title">{copy.next}</h2><p>{copy.nextText}</p></section></>}
  </ShellFrame>;
}
