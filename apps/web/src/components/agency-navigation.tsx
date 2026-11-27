"use client";
import Link from "next/link";
import {useEffect,useState,useSyncExternalStore} from "react";
import type {Locale} from "../i18n/locales";
import {agencyManagementMessages} from "../i18n/agency-management";
import {vehicleMessages} from "../i18n/vehicles";
import type {Module} from "./navigation-model";
import {NavigationIcon} from "./navigation-icon";
const subscribe=(listener:()=>void)=>{window.addEventListener("popstate",listener);return()=>window.removeEventListener("popstate",listener);};
const currentPath=()=>window.location.pathname;
export function AgencyNavigation({locale}:{locale:Locale}){
 const copy=agencyManagementMessages(locale),ar=locale==="ar",[permissions,setPermissions]=useState<Partial<Record<Module,boolean>>>({}),path=useSyncExternalStore(subscribe,currentPath,()=>"");
 useEffect(()=>{let live=true;fetch("/api/navigation",{credentials:"same-origin",cache:"no-store"}).then(async r=>{if(!r.ok)throw Error();const value:unknown=await r.json();if(!value||typeof value!=="object"||!("ok"in value)||value.ok!==true||!("capabilities"in value)||!value.capabilities||typeof value.capabilities!=="object")throw Error();const capabilities=value.capabilities as Record<string,unknown>;if(live)setPermissions(Object.fromEntries(Object.entries(capabilities).filter(([,v])=>v===true)));}).catch(()=>{if(live)setPermissions({});});return()=>{live=false;};},[path]);
 const link=(suffix:string,label:string,index:number)=><Link key={suffix} href={`/${locale}/app${suffix}`} aria-label={label} aria-current={(suffix?path.startsWith(`/${locale}/app${suffix}`):path===`/${locale}/app`)?"page":undefined} prefetch={false}><NavigationIcon index={index}/><span className="navigation-copy">{label}</span></Link>;
 const group=(title:string,index:number,children:React.ReactNode)=><details className="navigation-group" open><summary aria-label={title}><NavigationIcon index={index}/><span className="navigation-copy">{title}</span></summary><div>{children}</div></details>;
 return <nav className="agency-navigation" aria-label={copy.dashboard}>
 {link("",copy.dashboard,0)}
 {link('/account',ar?'ملفي الشخصي':'Mon profil personnel',2)}
 {permissions.rentals&&group(ar?"عقود الكراء":"Contrats de location",1,<>{link("/rentals",ar?"العقود":"Contrats",1)}{link("/archive",ar?"الأرشيف":"Archives",6)}</>)}
 {(permissions.clients||permissions.vehicles)&&group(ar?"العملاء والمركبات":"Clients et véhicules",2,<>{permissions.clients&&link("/clients",copy.clients,2)}{permissions.vehicles&&link("/vehicles",vehicleMessages(locale).title,3)}</>)}
 {(permissions.templates||permissions.delivery||permissions.sheets)&&group(ar?"المستندات والمتابعة":"Documents et suivi",4,<>{permissions.templates&&link("/templates",ar?"نماذج العقود":"Modèles de contrat",4)}{permissions.delivery&&link("/deliveries",ar?"التسليم والتذكيرات":"Livraisons et rappels",5)}{permissions.sheets&&link("/sheets","Google Sheets",4)}</>)}
 {group(ar?"الوكالة":"Agence",2,<>{link("/profile",copy.profile,2)}{link("/select",copy.select,0)}{link("/onboarding",copy.create,0)}{link("/settings",copy.settings,4)}{permissions.team&&link("/team",ar?"الفريق والموقعون":"Équipe et signataires",2)}{permissions.branding&&link("/branding",ar?"هوية الوكالة":"Identité et marque",4)}{permissions.billing&&link("/billing",ar?"الاشتراك والفوترة":"Abonnement et facturation",4)}</>)}
 </nav>;
}
