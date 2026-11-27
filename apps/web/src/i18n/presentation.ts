import type { Locale } from "./locales";
const language=(locale:Locale)=>locale==="ar"?"ar-MA":"fr-MA";
/** Exact minor units; never round a bigint through Number. */
export function money(locale:Locale,minor:string|bigint,currency="MAD"){
 if(!/^-?\d+$/.test(String(minor))||!/^[A-Z]{3}$/.test(currency))return "—";
 const n=BigInt(minor),absolute=n<0n?-n:n,whole=absolute/100n,fraction=absolute%100n;
 const number=new Intl.NumberFormat(language(locale)),decimal=new Intl.NumberFormat(language(locale)).formatToParts(1.1).find(p=>p.type==="decimal")?.value??",";
 return `${n<0n?"−":""}${number.format(whole)}${decimal}${number.format(fraction).padStart(2,number.format(0))} ${currency}`;
}
export function dateTime(locale:Locale,value:string,timeZone="UTC"){
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return "—";
 return `${new Intl.DateTimeFormat(language(locale),{dateStyle:"medium",timeStyle:"short",timeZone}).format(date)} ${timeZone}`;
}
