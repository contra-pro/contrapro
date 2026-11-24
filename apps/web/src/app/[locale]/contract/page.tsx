import { notFound } from "next/navigation";
import { isLocale } from "../../../i18n/locales";
import { FinalContractAccess } from "../../../delivery/workspace";
import { deliveryCopy } from "../../../delivery/copy";
export default async function Page({params}:{params:Promise<{locale:string}>}){const {locale}=await params;if(!isLocale(locale))notFound();return process.env.CONTRATPRO_DELIVERY_VERIFIED==="true"?<FinalContractAccess locale={locale}/>:<p role="status">{deliveryCopy(locale).notReady}</p>;}
