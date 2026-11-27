// Isolated visual fixture: imports real presentation, never a server/auth runtime.
import { createRoot } from "react-dom/client";
import { AreaShell } from "../../apps/web/src/components/area-shell";
import { AgencyNavigation } from "../../apps/web/src/components/agency-navigation";
import { RentalDashboard } from "../../apps/web/src/components/rental-dashboard";
import { OperationalDashboard } from "../../apps/web/src/components/operational-dashboard";
import type { Overview } from "../../apps/web/src/components/operational-model";
import { DraftPreview } from "../../apps/web/src/documents/draft-workspace";
import { AgencySigning } from "../../apps/web/src/signing/workspace";
import { AcceptTeamInvitation } from "../../apps/web/src/operations/accept";
import type { Artifact } from "../../apps/web/src/documents/model";
import { AuthView } from "../../apps/web/src/components/auth-view";
import { ClientList } from "../../apps/web/src/components/client-list";
import { VehicleList } from "../../apps/web/src/components/vehicle-list";
import { ClientForm } from "../../apps/web/src/components/client-form";
import { VehicleDraftForm } from "../../apps/web/src/components/vehicle-draft";
import { AgencyForm } from "../../apps/web/src/components/agency-form";
import { RentalEditor,RentalDetailScreen } from "../../apps/web/src/rentals/workspace";
import { ContractArchive } from "../../apps/web/src/rentals/archive-workspace";
import { TemplateLibrary } from "../../apps/web/src/documents/workspace";
import { ClientSigning } from "../../apps/web/src/signing/workspace";
import { DeliveryPanel } from "../../apps/web/src/delivery/workspace";
import { SheetsDashboard } from "../../apps/web/src/sheets/workspace";
import { AgencyBilling } from "../../apps/web/src/billing/workspace";
import { PlatformBilling } from "../../apps/web/src/billing/platform";
import { MaintenanceWorkspace } from "../../apps/web/src/maintenance/workspace";
import { TeamWorkspace } from "../../apps/web/src/operations/team";
import { BrandingWorkspace } from "../../apps/web/src/operations/branding";
import { defaultClientQuery } from "../../packages/application/src/clients";
import "../../apps/web/src/app/globals.css";

const query=new URLSearchParams(location.search),locale=query.get("locale")==="ar"?"ar":"fr",screen=query.get("screen")??"dashboard",mode=query.get("state")??"ready";
document.documentElement.lang=locale;document.documentElement.dir=locale==="ar"?"rtl":"ltr";
const id=(n:number)=>`90000000-0000-4000-8000-${String(n).padStart(12,"0")}`,aid=id(1),rid=id(2),sid=id(3),cid=id(4),vid=id(5),tid=id(6),versionId=id(7),checksum="a".repeat(64),at="2026-11-26T09:00:00Z";
const empty=mode==="empty",rows=<T,>(items:T[])=>empty?[]:items;
const rental={id:rid,agency_id:aid,secondaryClientId:null,client_id:cid,vehicle_id:vid,version:2,state:screen==="draft"?"brouillon":"confirme",contract_number:screen==="draft"?null:"CTR-2026-0042",starts_at:at,ends_at:"2026-11-29T09:00:00Z",daily_rate_minor:"35000",deposit_minor:"200000",total_minor:"105000",billable_days:3,physicalUnavailable:false,overdueConflict:false};
const client={id:cid,version:1,firstName:"Nora",lastName:"Exemple",phone:"+212600000000",email:"nora@example.invalid",nationality:"",identityType:"none",identityNumber:"",licenceNumber:"",licenceIssueDate:"",licenceExpiryDate:"",address:"",city:"Rabat",notes:""};
const vehicle={id:vid,version:1,registration:"0000-A-00",make:"Dacia",model:"Sandero",year:"2024",category:"economy",fuelType:"petrol",transmission:"manual",mileage:"24000",rentalStatus:"unknown"};
const config={locale,custom:[],mappings:[{field:"contract.number",page:1,x:40,y:40,width:200,height:25,fontSize:12,rtl:false,required:true}],signatures:[{party:"agency",page:1,x:40,y:600,width:200,height:60},{party:"client",page:1,x:300,y:600,width:200,height:60}]};
const template={id:tid,agencyId:aid,name:locale==="ar"?"نموذج كراء الوكالة":"Contrat de location agence",archived:false,isDefault:true,versions:[{agencyId:aid,templateId:tid,id:versionId,revision:1,name:"Modèle synthétique",format:"pdf",originalKey:`${aid}/originals/${tid}/${checksum}.pdf`,checksum,config}]};
const artifact:Artifact={id:id(32),agencyId:aid,rentalId:rid,rentalVersion:2,templateVersionId:versionId,key:`${aid}/synthetic/preview.pdf`,checksum,sourceChecksum:checksum,status:"issued",requestId:id(33),createdAt:at,signing:{order:["agency","client"],evidence:null,zones:[]}};
const agencySession={id:sid,agencyId:aid,rentalId:rid,artifactId:artifact.id,version:1,state:"awaiting_agency",locale,assurance:"simple",original:artifact,clientName:"Nora Exemple",clientId:cid,expiresAt:"2026-12-01T09:00:00Z",agencySignature:null,clientSignature:null,intermediate:null,final:null,providerId:null};
const role={id:id(10),key:"owner",name:locale==="ar"?"مسؤول الوكالة":"Responsable d’agence",permissions:["agency.manage","clients.read","contracts.deliver"]};
const team={canManage:true,members:rows([{id:id(11),userId:id(12),email:"equipe@example.invalid",state:"active",revision:1,roles:[role.id],signer:true,signerName:"Équipe Démonstration",eligible:true}]),roles:[role],permissions:role.permissions,invitations:[]};
const brand={revision:1,profile:{legalName:"Agence Démonstration",commercialName:"Agence Démonstration",representativeName:"Responsable Exemple",representativeRole:"Gérance",primary:"#173b56",accent:"#b68a35"},logoData:null,canManage:true};
const sheets={a4Enabled:true,page:1,total:empty?0:1,connection:{revision:1,health:"disconnected",enabled:false,destination:null},jobs:rows([{contractId:rid,state:"pending",sequence:1,lastSequence:0,retryable:false,attempts:0,error:null,syncAt:null}]),history:[]};
const billing={a4Enabled:true,subscription:null,plans:[],usage:[],payments:[],profile:{}};
const task={id:rid,reference:"CTR-2026-0042",state:"confirme",at};
const overview:Overview={rentals:{status:"ready",groups:{active:[],pickups:rows([task]),returns:[],drafts:[],activity:rows([task])}},signing:{status:"ready",groups:{signing:rows([{...task,state:"awaiting_client"}])}},delivery:{status:"ready",groups:{delivery:rows([{...task,state:"uncertain"}])}},sheets:{status:"ready",groups:{sheets:rows([{...task,state:"pending"}])}}};
if(["error","loading","unavailable","restricted"].includes(mode))for(const key of ["rentals","signing","delivery","sheets"] as const)overview[key]={status:mode==="restricted"?"restricted":mode==="error"?"error":"unavailable"};
const jobs=rows([{id:id(14),agencyId:aid,sessionId:sid,eventKey:"synthetic",purpose:"invitation",channel:"email",state:"uncertain",attempts:1,providerId:null,errorCode:"transport-unknown",retryable:false,expiresAt:"2026-12-01T09:00:00Z",notBefore:at,manualStatus:"not-shared",tokenHash:checksum,grantId:null,checksum,obsolete:false}]);
const signing={id:sid,version:2,state:"awaiting_client",locale,clientName:"Nora Exemple",expiresAt:"2026-12-01T09:00:00Z",reviewChecksum:checksum,originalChecksum:checksum,assurance:"simple",finalChecksum:null,clientVerified:true};
const capturedErrors:string[]=[];
window.addEventListener("error",event=>capturedErrors.push(event.message));window.addEventListener("unhandledrejection",event=>capturedErrors.push(String(event.reason)));
const calls:{action:string;path:string}[]=[];
window.fetch=async(input,init)=>{
 const url=new URL(typeof input==="string"?input:input instanceof URL?input.href:input.url,location.origin);
 if(url.origin!==location.origin)throw Error("External requests forbidden in fixture");
 const body=init?.body?JSON.parse(String(init.body)):{},action=body.action??"navigation",p=body.input??body;
 calls.push({action,path:url.pathname});
 if(mode==="loading")return new Promise(()=>{});
 if(mode==="error"||mode==="conflict"||mode==="uncertain")return Response.json({ok:false,code:mode==="error"?"unavailable":mode},{status:503});
 if(url.pathname==="/api/navigation")return Response.json({ok:true,capabilities:{clients:true,vehicles:true,rentals:true,templates:true,delivery:true,sheets:true,billing:true,team:true,branding:true}});
 let value:unknown;const result=(value:unknown)=>Response.json({ok:true,value});
 if(url.pathname.includes("client-action"))return Response.json({ok:true,page:{items:rows([client]),total:empty?0:1,query:body.query??defaultClientQuery},id:cid,version:2});
 if(url.pathname.includes("vehicle-action"))return Response.json({ok:true,page:{items:rows([vehicle]),total:empty?0:1,page:body.page??1,search:body.search??""},id:vid,version:2});
 if(url.pathname.includes("rental-action")){
  if(action==="list")value={items:rows([rental]),total:empty?0:1};
  else if(action==="detail")value=rental;
  else if(action==="choices")value={items:rows([{id:body.kind==="client"?cid:vid,label:body.kind==="client"?"Nora Exemple":"Dacia Sandero · 0000-A-00"}]),total:empty?0:1};
  else if(action==="archive")value={items:rows([{id:rid,reference:"CTR-2026-0042",state:"termine",createdAt:at,start:at,end:rental.ends_at,client:"Nora Exemple",vehicle:"Dacia Sandero · 0000-A-00",archived:false,payment:"partial",issued:true,agencySigned:true,clientSigned:true,completed:true}]),total:empty?0:1,asOf:at};
  else if(action==="document")value={parties:{primaryDriver:{fullName:"Nora Exemple"},vehicle:{registrationNumber:"0000-A-00"}}};
  else if(["confirm","start","complete","cancel","extend","driver","update"].includes(action)){rental.state=({confirm:"confirme",start:"en_cours",complete:"termine",cancel:"annule"} as Record<string,string>)[action]??rental.state;rental.version++;value=rental;}
  else if(action==="create")value={id:rid};else return Response.json({ok:false,code:"invalid"},{status:422});
 }else if(url.pathname.includes("operations-action")){
  if(action==="team")value=team;else if(action==="branding")value=brand;
  else if(action==="rental-operations")value={revision:1,locations:{pickup:"Agence de Rabat",returnLocation:"Agence de Rabat"},signerId:id(11),payments:[],paidMinor:"0",remainingMinor:rental.total_minor,depositHeldMinor:"0",status:"unpaid",canPay:true,state:rental.state,eligibleSigners:[{id:id(11),name:"Responsable Exemple"}]};
  else if(action==="rental-create")value={id:rid};else if(action==="invite")value={url:`${location.origin}/fr/app/team#invite=synthetic`};else value=true;
 }else if(url.pathname.includes("document-action")){
  if(action==="list")value=rows([template]);else if(action==="clauses")value=[];else if(action==="history")value=[];else if(action==="selection")value=versionId;
  else if(action==="draft-input")value={revision:1,templateVersionId:versionId,issueDate:"2026-11-26",custom:{}};
  else if(action==="preview-state")value=null;else if(action==="preview-generate")value={id:id(20),agencyId:aid,rentalId:rid,requestId:p.requestId,status:"preview",stale:false,expiresAt:"2026-12-01T00:00:00Z"};
  else if(["preview-download","preview","download"].includes(action))return new Response(await (await fetchNative("/sample.pdf")).blob(),{headers:{"Content-Type":"application/pdf"}});
  else if(["draft-configure","save","select","default","archive","clause-save"].includes(action))value=true;else return Response.json({ok:false,code:"invalid"},{status:422});
 }else if(url.pathname.includes("sheets")){
  if(action==="creation-list")value={items:[],unresolved:false};else if(action.startsWith("dashboard"))value=sheets;else if(action==="oauth-start")value={url:location.href};else return Response.json({ok:false,code:"unavailable"},{status:503});
 }else if(url.pathname.includes("delivery")){
  if(action==="list")value={jobs,events:[],downloads:[],recoveries:[]};else if(action==="context")value={state:"awaiting_client",clientEmail:"nora@example.invalid",clientPhone:"+212600000000",hasFinal:false,a3Enabled:true};
  else if(action==="policy")value={enabled:false,manualEnabled:false,intervals:[1440],maxCount:1,revision:0};else if(action==="history")value=[];else if(action==="dashboard")value={items:jobs,total:jobs.length};else return Response.json({ok:false,code:"uncertain"},{status:503});
 }else if(url.pathname.includes("billing")||url.pathname.endsWith("/platform/action")){
  if(action==="history"||action==="support-page")value={items:[],total:0};else if(action==="dashboard")value=url.pathname.includes("platform")?{a4Enabled:true,agencies:[],subscriptions:[],plans:[],payments:[],usage:[],events:[]}:billing;else return Response.json({ok:false,code:"unavailable"},{status:503});
 }else if(url.pathname.includes("maintenance")){
  value={workerLastSeen:at,schedules:["delivery","sheets","inventory","rotation","cleanup"].map(task=>({task,enabled:false,interval_seconds:300,attempts:0,last_finished:null,last_outcome:null})),delivery:{pending:0,failed:0,uncertain:1},sheets:{pending:1,failed:0,uncertain:0},generation:0,generationExhausted:0,finalizationExhausted:0,billingUncertain:0,storage:{retained:4,"manual-review":1},rotations:[],keyReferences:{delivery:{v1:1},sheets:{}},incidents:[],backup:null};
 }else if(url.pathname.includes("/sign/action")){
  if(action==="get")value=signing;else if(action==="verify")value={challengeId:id(21),session:signing};else if(action==="client-sign"){signing.state="client_signed";value=signing;}else if(action==="finalize"){signing.state="completed";value=signing;}else if(action==="decline"){signing.state="declined";value=signing;}else if(action==="document"||action==="final-pdf")return fetchNative("/sample.pdf");else return Response.json({ok:false,code:"unavailable"},{status:503});
 }else if(url.pathname.includes("signing-action")){
  if(action==="list")value=rows([agencySession]);
  else if(action==="document"||action==="final-pdf")return fetchNative("/sample.pdf");
  else if(action==="agency-sign"){agencySession.state="agency_signed";value=agencySession;}
  else if(action==="invite"||action==="renew"){agencySession.state="awaiting_client";value={url:`${location.origin}/?screen=signing&locale=${locale}#token=${"f".repeat(64)}`,code:"12345678"};}
  else if(action==="cancel"){agencySession.state="cancelled";value=agencySession;}
  else return Response.json({ok:false,code:"unavailable"},{status:503});
 }
 else return Response.json({ok:false,code:"unavailable"},{status:503});
 return result(value);
};
const fetchNative=globalThis.__fixtureNativeFetch;
const initialClients={items:rows([client]),total:empty?0:1,query:defaultClientQuery};
const profile={name:"Agence Démonstration",ice:"",ifNumber:"",rc:"",address:"Adresse de démonstration",city:"Rabat",phone:"+212600000000",email:"agence@example.invalid"};
const titles:Record<string,[string,string]>={dashboard:["Vue d’ensemble","نظرة عامة"],clients:["Clients et conducteurs","العملاء والسائقون"],vehicles:["Parc automobile","أسطول المركبات"],"client-form":["Nouveau client","عميل جديد"],"vehicle-form":["Nouveau véhicule","مركبة جديدة"],"rental-create":["Nouveau contrat","عقد جديد"],rental:["Contrat CTR-2026-0042","عقد CTR-2026-0042"],draft:["Préparer le contrat","إعداد العقد"],templates:["Modèles de contrat","نماذج العقود"],signing:["Signature","التوقيع"],delivery:["Livraisons et rappels","التسليم والتذكيرات"],archive:["Archives","الأرشيف"],sheets:["Google Sheets","Google Sheets"],team:["Équipe et signataires","الفريق والموقّعون"],branding:["Identité de l’agence","هوية الوكالة"],billing:["Abonnement","الاشتراك"],platform:["Administration de la plateforme","إدارة المنصة"],auth:["Connexion","تسجيل الدخول"],profile:["Profil de l’agence","ملف الوكالة"],settings:["Préférences","التفضيلات"]};
let content;
Object.assign(titles,{onboarding:["Créer une agence","إنشاء وكالة"],invitation:["Accepter une invitation","قبول دعوة"],preview:["Aperçu non final du contrat","معاينة غير نهائية للعقد"],"agency-signing":["Signature de l’agence","توقيع الوكالة"],"client-detail":["Fiche client","ملف العميل"],"vehicle-detail":["Fiche véhicule","ملف المركبة"]});
switch(screen){
 case "client-detail":content=<ClientForm locale={locale} requestId={id(22)} initial={client} permissions={{read:true,create:true,update:true,archive:true}}/>;break;
 case "vehicle-detail":content=<VehicleDraftForm locale={locale} persistence={{requestId:id(23),initial:vehicle,permissions:{read:true,create:true,update:true,archive:true}}}/>;break;
 case "onboarding":content=<AgencyForm locale={locale} action="create" enabled isOwner requestId={id(24)}/>;break;
 case "preview":content=<DraftPreview locale={locale} rentalId={rid}/>;break;
 case "agency-signing":content=<AgencySigning locale={locale} rentalId={rid} artifacts={rows([artifact])}/>;break;
 case "invitation":content=<AcceptTeamInvitation locale={locale}/>;break;
 case "clients":content=<ClientList locale={locale} initial={initialClients} canCreate/>;break;
 case "vehicles":content=<VehicleList locale={locale} data={{items:rows([vehicle]),total:empty?0:1,page:1,search:""}} canCreate/>;break;
 case "client-form":content=<ClientForm locale={locale} requestId={id(22)} permissions={{read:true,create:true,update:true,archive:true}}/>;break;
 case "vehicle-form":content=<VehicleDraftForm locale={locale} persistence={{requestId:id(23),permissions:{read:true,create:true,update:true,archive:true}}}/>;break;
 case "rental-create":content=<RentalEditor locale={locale} a1Enabled/>;break;
 case "rental":case "draft":content=<RentalDetailScreen locale={locale} id={rid} a1Enabled a2Enabled documentsEnabled signingEnabled deliveryEnabled sheetsEnabled/>;break;
 case "templates":content=<TemplateLibrary locale={locale} a1Enabled a2Enabled/>;break;
 case "delivery":content=<DeliveryPanel locale={locale} sessionId={sid}/>;break;
 case "archive":content=<ContractArchive locale={locale}/>;break;
 case "sheets":content=<SheetsDashboard locale={locale}/>;break;
 case "team":content=<TeamWorkspace locale={locale} initial={team} deliveryEnabled/>;break;
 case "branding":content=<BrandingWorkspace locale={locale} initial={brand}/>;break;
 case "billing":content=<AgencyBilling locale={locale}/>;break;
 case "platform":content=<><MaintenanceWorkspace locale={locale}/><PlatformBilling locale={locale}/></>;break;
 case "profile":case "settings":content=<AgencyForm locale={locale} action={screen} enabled isOwner requestId={id(24)} profile={profile} settings={{locale,currency:"MAD",timezone:"Africa/Casablanca"}}/>;break;
 default:content=<><RentalDashboard locale={locale} data={{items:rows([rental]),total:empty?0:1}} now={Date.parse(at)}/><OperationalDashboard locale={locale} data={overview} at={Date.parse(at)}/></>;
}
if(screen==="signing")location.hash=`token=${"f".repeat(64)}`;
if(screen==="invitation")location.hash=`token=${"e".repeat(64)}`;
const authMode=query.get("auth");
const app=screen==="signing"?<ClientSigning locale={locale}/>:screen==="auth"?<AuthView locale={locale} mode={authMode==="sign-up"||authMode==="forgot-password"||authMode==="reset-password"?authMode:"sign-in"} configured status={query.get("status")??undefined}/>:<AreaShell locale={locale} area={screen==="platform"?"platform":"agency"} agencyName="Agence Démonstration" navigation={screen==="platform"?undefined:<AgencyNavigation locale={locale}/>}><section className="intro"><h1 id="page-title">{titles[screen]?.[locale==="ar"?1:0]??screen}</h1></section>{content}</AreaShell>;
createRoot(document.getElementById("root")!).render(<><div className="fixture-warning">Revue locale A6 · données synthétiques · aucune connexion Supabase ou fournisseur</div>{app}</>);
Object.assign(window,{__a6Review:()=>({screen,locale,state:mode,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,scrollWidth:document.documentElement.scrollWidth,headings:document.querySelectorAll("h1").length,unlabelled:[...document.querySelectorAll("input:not([type=hidden]),select,textarea")].filter(e=>!(e as HTMLInputElement).labels?.length&&!e.getAttribute("aria-label")&&!e.getAttribute("aria-labelledby")).map(e=>e.tagName),errors:capturedErrors,calls:calls.length})});
