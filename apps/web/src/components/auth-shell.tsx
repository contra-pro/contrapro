import Link from 'next/link';
import type {ReactNode} from 'react';
import type {Locale} from '../i18n/locales';
export function AuthShell({locale,title,subtitle,path,children}:{locale:Locale;title:string;subtitle:string;path:string;children:ReactNode}){
 const ar=locale==='ar';return <div className="auth-shell auth-polish" dir={ar?'rtl':'ltr'}>
 <a className="skip-link" href="#main">{ar?'الانتقال إلى المحتوى':'Aller au contenu'}</a>
 <div className="auth-ambient" aria-hidden="true"><svg viewBox="0 0 1440 1100" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="currentColor"><ellipse cx="720" cy="570" rx="680" ry="420" transform="rotate(-28 720 570)"/><ellipse cx="720" cy="570" rx="510" ry="300" transform="rotate(-28 720 570)"/><ellipse cx="720" cy="570" rx="840" ry="560" transform="rotate(-28 720 570)"/></g><circle cx="199" cy="656" r="4" fill="currentColor"/></svg></div>
 <header className="auth-header"><Link className="brand auth-brand" href={`/${locale}`} prefetch={false} aria-label={ar?'ContratPro · الرئيسية':'ContratPro · Accueil'}><span className="auth-logo-mark" aria-hidden="true">C</span><span dir="ltr">ContratPro</span></Link><nav className="auth-language" aria-label={ar?'لغة الواجهة':'Langue de l’interface'}>{(['fr','ar'] as const).map(lang=><Link key={lang} href={`/${lang}/${path}`} prefetch={false} lang={lang} aria-current={lang===locale?'page':undefined}>{lang==='fr'?'Français':'العربية'}</Link>)}</nav></header>
 <div className="auth-stage"><main id="main" tabIndex={-1} className="auth-card"><div className="auth-card-heading"><span className="auth-eyebrow">{ar?'مساحتك في ContratPro':'Votre espace ContratPro'}</span><h1>{title}</h1><p className="auth-subtitle">{subtitle}</p></div>{children}</main><p className="auth-bottom-note">{ar?'عقودك. توقيعاتك. وكالتك.':'Vos contrats. Vos signatures. Votre agence.'}</p></div>
 </div>;
}
