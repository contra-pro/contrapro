import { createHash } from "node:crypto";
import { SheetsFault,headers,destination,type Destination } from "./model";
export type Transport = (url:string,init:RequestInit)=>Promise<Response>;
type Metadata = {metadataId:number;metadataKey:string;metadataValue:string;location:{dimensionRange?:{sheetId:number;startIndex:number;endIndex:number}}};
type GridCell = {userEnteredValue?:{formulaValue?:string;stringValue?:string;numberValue?:number};formattedValue?:string};
type Sheet = {properties:{sheetId:number;title:string};data?:{rowData?:{values?:GridCell[]}[]}[]};
export const identityKey="contratpro_contract_v1";
export const ownerKey="contratpro_sheet_v1";
export function owner(agencyId:string,d:Destination){return `${agencyId}:${createHash("sha256").update(JSON.stringify(headers(d))).digest("hex")}`;}
export class GoogleSheets {
  constructor(private enabled:boolean,private transport:Transport=fetch){}
  private async api<T>(token:string,path:string,body?:object,write=false):Promise<T>{
    if(!this.enabled||!token||token.length>8192)throw new SheetsFault("unavailable");
    let response:Response;try{response=await this.transport(`https://sheets.googleapis.com/v4/spreadsheets${path}`,{method:body?"POST":"GET",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{}),cache:"no-store",signal:AbortSignal.timeout(15000)});}catch{throw new SheetsFault(write?"uncertain":"unavailable");}
    if(!response.ok)throw new SheetsFault(response.status===401?"revoked":response.status===429?"quota":response.status===403?"forbidden":response.status>=500?(write?"uncertain":"unavailable"):"conflict");
    try{return await response.json() as T;}catch{throw new SheetsFault(write?"uncertain":"unavailable");}
  }
  async metadata(token:string,id:string){destination({spreadsheetId:id,sheetId:0,revision:1,columns:["reference"]});return this.api<{spreadsheetId:string;sheets:Sheet[]}>(token,`/${id}?fields=spreadsheetId,sheets.properties`);}
  async createSpreadsheet(token:string,title:string,requestId:string){if(!/^[a-f0-9-]{36}$/.test(requestId)||title.length<1||title.length>80)throw new SheetsFault("invalid");return this.api<{spreadsheetId:string;sheets:Sheet[]}>(token,"",{properties:{title:`${title} (${requestId})`}},true);}
  async createWorksheet(token:string,agencyId:string,d:Destination,title:string){
    destination(d);if(!title||title.length>80)throw new SheetsFault("invalid");
    // A new, explicit sheet ID makes ambiguous creation fail closed on a retry.
    return this.api(token,`/${d.spreadsheetId}:batchUpdate`,{requests:[{addSheet:{properties:{sheetId:d.sheetId,title}}},{updateCells:{start:{sheetId:d.sheetId,rowIndex:0,columnIndex:0},rows:[{values:headers(d).map(v=>({userEnteredValue:{stringValue:v}}))}],fields:"userEnteredValue"}},{createDeveloperMetadata:{developerMetadata:{metadataKey:ownerKey,metadataValue:owner(agencyId,d),visibility:"DOCUMENT",location:{sheetId:d.sheetId}}}}]},true);
  }
  private async search(token:string,d:Destination,key:string,value:string){
    const result=await this.api<{matchedDeveloperMetadata?:{developerMetadata:Metadata}[]}>(token,`/${d.spreadsheetId}/developerMetadata:search`,{dataFilters:[{developerMetadataLookup:{metadataKey:key,metadataValue:value,visibility:"DOCUMENT"}}]});return (result.matchedDeveloperMetadata??[]).map(m=>m.developerMetadata);
  }
  async inspect(token:string,agencyId:string,d:Destination,id:string){
    destination(d);const ownership=(await this.search(token,d,ownerKey,owner(agencyId,d))).filter(m=>(m.location as {sheetId?:number}).sheetId===d.sheetId);
    if(ownership.length!==1||(ownership[0]!.location as {sheetId?:number}).sheetId!==d.sheetId)throw new SheetsFault("conflict");
    const meta=await this.metadata(token,d.spreadsheetId),sheet=meta.sheets.find(s=>s.properties.sheetId===d.sheetId);if(!sheet)throw new SheetsFault("conflict");
    const escaped=sheet.properties.title.replaceAll("'","''"),range=encodeURIComponent(`'${escaped}'!A1:${column(headers(d).length)}1`);
    const grid=await this.api<{sheets:Sheet[]}>(token,`/${d.spreadsheetId}?ranges=${range}&includeGridData=true`);
    const cells=grid.sheets[0]?.data?.[0]?.rowData?.[0]?.values??[];
    if(headers(d).some((h,i)=>cells[i]?.userEnteredValue?.stringValue!==h))throw new SheetsFault("conflict");
    // Independent visible-ID scan catches copied rows and orphaned metadata.
    const ids=await this.api<{values?:string[][]}>(token,`/${d.spreadsheetId}/values/${encodeURIComponent(`'${escaped}'!A2:A`)}?valueRenderOption=UNFORMATTED_VALUE`);
    const matches=(ids.values??[]).map((v,i)=>({id:v[0],index:i+1})).filter(v=>v.id===id),found=(await this.search(token,d,identityKey,id)).filter(m=>m.location.dimensionRange?.sheetId===d.sheetId);
    if(found.length>1||matches.length>1||found.length!==matches.length)throw new SheetsFault("conflict");
    if(!found.length)return null;
    const m=found[0]!,r=m.location.dimensionRange;if(!r||r.sheetId!==d.sheetId||r.startIndex!==matches[0]!.index||r.endIndex!==r.startIndex+1)throw new SheetsFault("conflict");
    const actual=await this.api<{sheets:Sheet[]}>(token,`/${d.spreadsheetId}?ranges=${encodeURIComponent(`'${escaped}'!A${r.startIndex+1}:${column(headers(d).length)}${r.startIndex+1}`)}&includeGridData=true`);
    const values=actual.sheets[0]?.data?.[0]?.rowData?.[0]?.values??[];
    if(values.some(c=>c.userEnteredValue?.formulaValue!==undefined))throw new SheetsFault("conflict");
    return {metadataId:m.metadataId,values:headers(d).map((_,i)=>values[i]?.userEnteredValue?.stringValue??String(values[i]?.userEnteredValue?.numberValue??""))};
  }
  async write(token:string,agencyId:string,d:Destination,values:string[],known:boolean){
    const existing=await this.inspect(token,agencyId,d,values[0]!);
    if(!existing&&known)throw new SheetsFault("conflict");
    if(existing){
      const sequence=Number(existing.values[1]);if(!Number.isSafeInteger(sequence)||sequence>Number(values[1]))throw new SheetsFault("conflict");
      const updated=await this.api<{totalUpdatedRows:number;totalUpdatedCells:number}>(token,`/${d.spreadsheetId}/values:batchUpdateByDataFilter`,{valueInputOption:"RAW",data:[{dataFilter:{developerMetadataLookup:{metadataId:existing.metadataId}},majorDimension:"ROWS",values:[values]}]},true);
      if(updated.totalUpdatedRows!==1||updated.totalUpdatedCells!==values.length)throw new SheetsFault("uncertain");return existing.metadataId;
    }
    const result=await this.api<{replies:{createDeveloperMetadata?:{developerMetadata:Metadata}}[]}>(token,`/${d.spreadsheetId}:batchUpdate`,{requests:[{insertDimension:{range:{sheetId:d.sheetId,dimension:"ROWS",startIndex:1,endIndex:2},inheritFromBefore:false}},{updateCells:{start:{sheetId:d.sheetId,rowIndex:1,columnIndex:0},rows:[{values:values.map(v=>({userEnteredValue:{stringValue:v}}))}],fields:"userEnteredValue"}},{createDeveloperMetadata:{developerMetadata:{metadataKey:identityKey,metadataValue:values[0],visibility:"DOCUMENT",location:{dimensionRange:{sheetId:d.sheetId,dimension:"ROWS",startIndex:1,endIndex:2}}}}}]},true);
    const id=result.replies?.[2]?.createDeveloperMetadata?.developerMetadata.metadataId;if(!Number.isSafeInteger(id))throw new SheetsFault("uncertain");return id!;
  }
}
function column(n:number){let v="";while(n){n--;v=String.fromCharCode(65+n%26)+v;n=Math.floor(n/26);}return v;}
