"use client";
import type {Locale} from '../i18n/locales';
import Landing from './HalyardContratPro';
import {landingProps} from './landing-content';
import './landing.css';
export function PublicLanding({locale}:{locale:Locale}){const ar=locale==='ar';return <div className="public-marketing"><a className="marketing-language" href={`/${ar?'fr':'ar'}`} lang={ar?'fr':'ar'}>{ar?'Français':'العربية'}</a><Landing {...landingProps(ar)} locale={locale}/><aside className="marketing-demo-notice">{ar?'عرض توضيحي ببيانات خيالية. لا يتم إنشاء أو توقيع أو إرسال مستند حقيقي.':'Démonstration avec données fictives. Aucun document réel créé, signé ou envoyé.'}</aside></div>;}
