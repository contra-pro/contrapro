export type FaultCode = "invalid" | "forbidden" | "unavailable" | "revoked" | "quota" | "conflict" | "uncertain" | "restricted";
export class SheetsFault extends Error { constructor(readonly code: FaultCode) { super(code); } }
export interface Repository { call<T>(agencyId:string|null,action:string,input:object):Promise<T> }
export const fields = ["reference","createdAt","clientName","clientPhone","clientEmail","primaryDriver","secondaryDriver","registration","make","model","start","end","pickup","returnLocation","days","rate","deposit","total","currency","payment","state","agencySignature","clientSignature","completion","lastSync"] as const;
export type Field = typeof fields[number];
export const defaults:Field[] = ["reference","createdAt","registration","make","model","start","end","days","rate","deposit","total","currency","state","agencySignature","clientSignature","completion","lastSync"];
export const personal:readonly Field[] = ["clientName","clientPhone","clientEmail","primaryDriver","secondaryDriver"];
export interface Destination { spreadsheetId:string; sheetId:number; columns:Field[]; revision:number }
export interface Snapshot { agencyId:string; contractId:string; sequence:number; rentalVersion:number; signatureVersion:number; values:Partial<Record<Field,string>> }
export interface Claim { agencyId:string; contractId:string; lease:string; sequence:number; destination:Destination; snapshot:Snapshot; known:boolean; reconcile:boolean; syncAt:string }
export function mapping(value:unknown):Field[] {
  if(!Array.isArray(value)||value.length<1||value.length>fields.length||new Set(value).size!==value.length||value.some(v=>!fields.includes(v)))throw new SheetsFault("invalid");
  return value as Field[];
}
export function destination(value:Destination):Destination {
  if(!/^[A-Za-z0-9_-]{10,150}$/.test(value.spreadsheetId)||!Number.isSafeInteger(value.sheetId)||value.sheetId<0||!Number.isSafeInteger(value.revision)||value.revision<1)throw new SheetsFault("invalid");
  return {...value,columns:mapping(value.columns)};
}
export function cell(value:string):string {if(typeof value!=="string"||value.length>2000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw new SheetsFault("invalid");return value;}
export function money(minor:string):string {
  if(!/^\d{1,19}$/.test(minor))throw new SheetsFault("invalid");const n=BigInt(minor);return `${n/100n}.${String(n%100n).padStart(2,"0")}`;
}
export function headers(d:Destination){return ["ContratPro ID","ContratPro version","ContratPro destination",...d.columns];}
export function row(s:Snapshot,d:Destination,syncAt:string):string[]{
  if(!/^[a-f0-9-]{36}$/.test(s.agencyId)||!/^[a-f0-9-]{36}$/.test(s.contractId)||!Number.isSafeInteger(s.sequence)||s.sequence<1||!Number.isFinite(Date.parse(syncAt)))throw new SheetsFault("invalid");
  return [`${s.agencyId}:${s.contractId}`,String(s.sequence),String(d.revision),...d.columns.map(f=>cell(f==="lastSync"?new Date(syncAt).toISOString():s.values[f]??""))];
}
