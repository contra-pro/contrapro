import { notFound } from "next/navigation";
import type { Locale } from "../i18n/locales";
import { isLocale } from "../i18n/locales";
import { getAgencyContext } from "../server/agency-access";
import { AgencyAccessView } from "../components/agency-access-view";
import { AgencyWorkspace } from "../components/agency-workspace";
import { TeamWorkspace } from "./team";
import { BrandingWorkspace } from "./branding";
import { AcceptTeamInvitation } from "./accept";
import { operationsCopy } from "./copy";
import {AuthShell} from '../components/auth-shell';
import {getPendingInvitation} from '../registration/server-invitation';import {InvitationBridge} from '../registration/invitation-bridge';
export async function OperationsPage({locale,area}:{locale:string;area:"team"|"branding"|"accept"}) {
 if(!isLocale(locale))notFound();const context=await getAgencyContext(),c=operationsCopy(locale as Locale);
 const invitation=area==='accept'?await getPendingInvitation():null;
 if(area==='accept'&&!context.canonical)return <AuthShell locale={locale} path="app/team/accept" title={c.accept} subtitle={c.acceptHint}><InvitationBridge locale={locale} pending={invitation!==null}/></AuthShell>;
 if(area==="accept"?!context.canonical:context.access.status!=="authorized")return <AgencyAccessView locale={locale} access={context.access} {...(area==='accept'?{presentation:'auth' as const}:{})}/>;
 if(area==='accept')return <AuthShell locale={locale} path="app/team/accept" title={c.accept} subtitle={c.acceptHint}>{process.env.CONTRATPRO_A1_VERIFIED!=='true'?<p className="auth-environment" role="status">{c.unavailable}</p>:<AcceptTeamInvitation key={context.canonical?.userId} locale={locale} {...(invitation?{initialToken:invitation}:{})}/>}</AuthShell>;
 return <AgencyWorkspace locale={locale} {...(context.access.status==="authorized"?{agencyName:context.access.agencyName,agencyScope:context.access.agencyId+":"+context.access.userId}:{})} title={area==="branding"?c.branding:c.team}>
 {process.env.CONTRATPRO_A1_VERIFIED!=="true"?<p role="status">{c.unavailable}</p>:area==="team"?<TeamWorkspace key={`${context.canonical?.userId}:${context.access.status==="authorized"?context.access.agencyId:""}`} locale={locale} deliveryEnabled={process.env.CONTRATPRO_DELIVERY_VERIFIED==="true"}/>:<BrandingWorkspace locale={locale}/>}
 </AgencyWorkspace>;
}
