import { isRecord } from "../../../../packages/application/src/agency-management";
import { RentalFault,validPage,rentalStates } from "./data";
export type ArchiveQuery={page:number;query:string;state:string;signature:string;payment:string;archived:string;from:string;to:string;createdFrom:string;createdTo:string;asOf?:string};
export type ArchiveItem={id:string;reference:string|null;state:string;version:number;createdAt:string;start:string;end:string;client:string;vehicle:string;archived:boolean;agencySigned:boolean;clientSigned:boolean;completed:boolean;payment:string};
export function archiveQuery(v:unknown):ArchiveQuery{
 if(!isRecord(v)||!validPage(v.page)||typeof v.query!=="string"||v.query.length>120||/[\u0000-\u001f\u007f]/.test(v.query))throw new RentalFault("invalid");
 const r={page:v.page,query:v.query.trim(),state:v.state??"all",signature:v.signature??"all",payment:v.payment??"all",archived:v.archived??"all",from:v.from??"",to:v.to??"",createdFrom:v.createdFrom??"",createdTo:v.createdTo??"",...(v.asOf?{asOf:v.asOf}:{})};
 if(!["all",...rentalStates].includes(String(r.state))||!["all","none","agency","client","completed","issued"].includes(String(r.signature))||!["all","unpaid","partial","paid"].includes(String(r.payment))||!["all","yes","no"].includes(String(r.archived)))throw new RentalFault("invalid");
 for(const k of ["from","to","createdFrom","createdTo"] as const){const s=r[k];if(typeof s!=="string"||s!==""&&(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s))throw new RentalFault("invalid");}
 if(r.from&&r.to&&String(r.from)>String(r.to)||r.createdFrom&&r.createdTo&&String(r.createdFrom)>String(r.createdTo))throw new RentalFault("invalid");
 if(r.asOf&&(typeof r.asOf!=="string"||r.asOf.length>40||!Number.isFinite(Date.parse(r.asOf))))throw new RentalFault("invalid");
 return r as ArchiveQuery;
}
