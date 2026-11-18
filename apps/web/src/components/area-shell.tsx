import Link from "next/link";
import type { Locale } from "../i18n/locales";
import { getMessages, type Area } from "../i18n/messages";

const areaPaths = { agency: "app", platform: "platform", signing: "sign" } as const;

export function AreaShell({ locale, area, children, notice }: {
  locale: Locale; area: Area; children?: React.ReactNode;
  notice?: { title: string; description: string };
}) {
  const copy = getMessages(locale);
  const content = copy.areas[area];

  return (
    <div className="shell">
      <a className="skip-link" href="#main">{copy.skip}</a>
      <header className="masthead">
        <Link href={`/${locale}/app`} className="brand" prefetch={false}>
          <span className="brand-mark" aria-hidden="true">C</span>
          <span><b dir="ltr">ContratPro</b><span className="brand-caption">{copy.product}</span></span>
        </Link>
        <nav aria-label={copy.language} className="languages">
          {(["fr", "ar"] as const).map((language) => (
            <Link key={language} href={`/${language}/${areaPaths[area]}`} lang={language}
              hrefLang={language} aria-current={locale === language ? "page" : undefined} prefetch={false}>
              {language === "fr" ? "Français" : "العربية"}
            </Link>
          ))}
        </nav>
      </header>
      <div className="workspace">
        <aside className="sidebar">
          <nav aria-label={copy.navigation}>
            {(Object.keys(areaPaths) as Area[]).map((item) => (
              <Link key={item} href={`/${locale}/${areaPaths[item]}`}
                aria-current={item === area ? "page" : undefined} prefetch={false}>
                {copy.areas[item].label}
              </Link>
            ))}
          </nav>
          <p className="sidebar-note">{copy.footer}</p>
        </aside>
        <main id="main" tabIndex={-1}>
          <div className="development-notice">
            <strong>{notice?.title ?? copy.development}</strong>
            <p>{notice?.description ?? copy.notice}</p>
          </div>
          {children ?? <>
          <section className="intro" aria-labelledby="page-title">
            <p className="area-label">{content.label}</p>
            <h1 id="page-title">{content.title}</h1>
            <p className="description">{content.description}</p>
          </section>
          <section className="status-panel" aria-labelledby="status-title">
            <div className="status-symbol" aria-hidden="true">—</div>
            <div><h2 id="status-title">{copy.status}</h2><p>{copy.statusText}</p></div>
          </section>
          <section className="next-step" aria-labelledby="next-title">
            <h2 id="next-title">{copy.next}</h2><p>{copy.nextText}</p>
          </section>
          </>}
        </main>
      </div>
    </div>
  );
}
