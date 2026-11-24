import { createHash,randomBytes,timingSafeEqual } from "node:crypto";
import { seal,unseal } from "../delivery/secrets";
import type { Envelope } from "../delivery/model";
import { SheetsFault,type Repository } from "./model";
import type { Transport } from "./google";
export const scopes={created:"https://www.googleapis.com/auth/drive.file",existing:"https://www.googleapis.com/auth/spreadsheets"} as const;
export interface OAuthConfig { enabled:boolean;clientId:string;clientSecret:string;origin:string;key:string;keyId:string }
export interface Credential { accessToken:string;refreshToken:string;expiresAt:number;scope:string }
export const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const aad=(aid:string,rev:number)=>`sheets|${aid}|credentials|${rev}`;
export class GoogleOAuth {
  constructor(private repo:Repository,private config:OAuthConfig,private transport:Transport=fetch,private now=Date.now){}
  private validate(){const c=this.config;if(!c.enabled||!c.clientId||!c.clientSecret||!/^https:\/\/[^/]+$/.test(c.origin)||!/^[a-f0-9]{64}$/.test(c.key))throw new SheetsFault("unavailable");}
  private callback(locale:string){if(locale!=="fr"&&locale!=="ar")throw new SheetsFault("invalid");return `${this.config.origin}/${locale}/app/sheets/callback`;}
  async start(aid:string,locale:string,mode:keyof typeof scopes){
    this.validate();if(!Object.hasOwn(scopes,mode))throw new SheetsFault("invalid");const state=randomBytes(32).toString("hex"),verifier=randomBytes(32).toString("base64url"),expires=new Date(this.now()+600000).toISOString();
    const envelope=seal({verifier,locale,mode},this.config.key,this.config.keyId,`sheets|${aid}|oauth|${hash(state)}`,expires);
    await this.repo.call(aid,"oauth-start",{hash:hash(state),envelope});
    const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");url.search=new URLSearchParams({client_id:this.config.clientId,redirect_uri:this.callback(locale),response_type:"code",scope:scopes[mode],state,access_type:"offline",prompt:"consent",code_challenge:createHash("sha256").update(verifier).digest("base64url"),code_challenge_method:"S256"}).toString();return {url:url.toString(),state};
  }
  private async token(params:Record<string,string>):Promise<Partial<Credential>>{
    this.validate();let response:Response;try{response=await this.transport("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({...params,client_id:this.config.clientId,client_secret:this.config.clientSecret}),cache:"no-store",signal:AbortSignal.timeout(15000)});}catch{throw new SheetsFault("uncertain");}
    if(!response.ok)throw new SheetsFault(response.status===400||response.status===401?"revoked":response.status===429?"quota":"unavailable");
    let p:Record<string,unknown>;try{p=await response.json();}catch{throw new SheetsFault("uncertain");}
    if(typeof p.access_token!=="string"||!p.access_token||p.access_token.length>8192||typeof p.expires_in!=="number"||p.expires_in<60||p.expires_in>86400||p.token_type!=="Bearer")throw new SheetsFault("uncertain");
    if(p.refresh_token!==undefined&&(typeof p.refresh_token!=="string"||!p.refresh_token||p.refresh_token.length>8192))throw new SheetsFault("uncertain");
    return {accessToken:p.access_token,expiresAt:this.now()+p.expires_in*1000,...(p.refresh_token?{refreshToken:p.refresh_token as string}:{}),...(typeof p.scope==="string"?{scope:p.scope}:{})};
  }
  private envelope(aid:string,rev:number,value:Credential){return seal(value,this.config.key,this.config.keyId,aad(aid,rev),new Date(this.now()+90*86400000).toISOString());}
  async complete(aid:string,locale:string,state:string,cookie:string,code:string){
    this.validate();if(!/^[a-f0-9]{64}$/.test(state)||!/^[a-f0-9]{64}$/.test(cookie)||!timingSafeEqual(Buffer.from(state),Buffer.from(cookie))||!code||code.length>4096)throw new SheetsFault("forbidden");
    const flow=await this.repo.call<{envelope:Envelope;revision:number;credentialRevision:number}>(aid,"oauth-consume",{hash:hash(state)});
    const saved=unseal<{verifier:string;locale:string;mode:keyof typeof scopes}>(flow.envelope,this.config.key,this.config.keyId,`sheets|${aid}|oauth|${hash(state)}`,this.now());if(saved.locale!==locale)throw new SheetsFault("forbidden");
    const token=await this.token({grant_type:"authorization_code",code,code_verifier:saved.verifier,redirect_uri:this.callback(locale)});
    if(!token.refreshToken||!token.scope?.split(" ").includes(scopes[saved.mode]))throw new SheetsFault("revoked");
    // Never retain another account's old refresh token on a reconnect exchange.
    await this.repo.call(aid,"connect",{revision:flow.revision,envelope:this.envelope(aid,flow.credentialRevision+1,token as Credential)});
  }
  async access(aid:string):Promise<string>{
    this.validate();const record=await this.repo.call<{envelope:Envelope|null;revision:number;health:string}>(aid,"credentials",{});if(record.health!=="connected"||!record.envelope)throw new SheetsFault("revoked");
    let token:Credential;try{token=unseal(record.envelope,this.config.key,this.config.keyId,aad(aid,record.revision),this.now());}catch{await this.repo.call(aid,"revoked",{revision:record.revision});throw new SheetsFault("revoked");}
    if(token.expiresAt>this.now()+60000)return token.accessToken;
    const claim=await this.repo.call<{lease:string}|null>(aid,"refresh-claim",{revision:record.revision});if(!claim)throw new SheetsFault("unavailable");
    try{const fresh=await this.token({grant_type:"refresh_token",refresh_token:token.refreshToken});const next={...token,...fresh};await this.repo.call(aid,"refresh-result",{revision:record.revision,lease:claim.lease,envelope:this.envelope(aid,record.revision+1,next)});return next.accessToken;}
    catch{await this.repo.call(aid,"refresh-result",{revision:record.revision,lease:claim.lease});throw new SheetsFault("revoked");}
  }
  async revoke(aid:string){
    // Local disconnect always succeeds even if Google's revocation endpoint fails.
    const record=await this.repo.call<{envelope:Envelope|null;revision:number}>(aid,"credentials",{});let token:Credential|null=null;
    try{if(record.envelope)token=unseal(record.envelope,this.config.key,this.config.keyId,aad(aid,record.revision),this.now());}catch{/* Expired local material is removed below. */}
    await this.repo.call(aid,"disconnect",{});
    if(token&&this.config.enabled){try{await this.transport("https://oauth2.googleapis.com/revoke",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({token:token.refreshToken}),cache:"no-store",signal:AbortSignal.timeout(10000)});}catch{/* Revoke from Google account settings if provider is unavailable. */}}
  }
}
