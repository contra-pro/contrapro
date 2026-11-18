import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import type {TLSSocket} from "node:tls";
import type {ClientConfig} from "pg";
import {buildMigrationClientConfig,parseApplyConfig} from "../src/migrations/config.ts";
import {validateTarget,target,type ReadonlyClient} from "../src/verification/bootstrap.ts";
import {verifyProvisionArtifacts} from "../src/verification/provision-artifacts.ts";
import {provisionAuthority,emptyProvision,rejectProvision,type ProvisionResult} from "../src/verification/provision-authority.ts";

export interface Dependencies{
 verifyArtifacts():Promise<void>;
 buildOptions:typeof buildMigrationClientConfig;
 createClient(options:ClientConfig):Promise<ReadonlyClient>;
}
async function createClient(options:ClientConfig):Promise<ReadonlyClient>{
 const {Client}=await import("pg");const client=new Client({...options,
 application_name:"contratpro-authority-provision-v1",query_timeout:7000,
 options:"-c search_path=pg_catalog -c statement_timeout=5000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=10000"});
 const socket=()=>(client as unknown as {connection:{stream:TLSSocket}}).connection.stream;
 return {
 async connect(){await client.connect();},
 async query(sql){const r=await client.query(sql);return{rows:r.rows as Record<string,unknown>[],command:r.command};},
 async end(){
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{await Promise.race([client.end(),new Promise<never>((_,reject)=>{
   timer=setTimeout(()=>{try{socket().destroy();}catch{/* No raw output. */}reject(new Error());},5000);
  })]);}finally{if(timer)clearTimeout(timer);}
 },
 tlsVerified:()=>socket().encrypted===true && socket().authorized===true && ["TLSv1.2","TLSv1.3"].includes(socket().getProtocol()??""),
 onError:handler=>{client.on("error",handler);},
 };
}
/** One invocation per process; the unprovisioned baseline rejects sequential replay after a committed operation. */
export function makeMain(){
 let consumed=false;
 return async(args:readonly string[],env:NodeJS.ProcessEnv,injected:Partial<Dependencies>={},result=emptyProvision()):Promise<ProvisionResult>=>{
  if(args.length!==2 || args[0]!=="--provision-foundation-authority" || args[1]!==target.id){
   rejectProvision(result,"ARGUMENTS");return result;
  }
  if(consumed){rejectProvision(result,"DUPLICATE");return result;}consumed=true;
  try{
   const config=parseApplyConfig(["--apply","--stage","bootstrap","--confirm-target",target.id],env);
   validateTarget(config);
   await(injected.verifyArtifacts??verifyProvisionArtifacts)();
   const options=await(injected.buildOptions??buildMigrationClientConfig)(config);
   const client=await(injected.createClient??createClient)(options);
   return await provisionAuthority(client,config,result);
  }catch{rejectProvision(result,"PREPARATION");return result;}
 };
}
export const main=makeMain();
export async function entrypoint(args:readonly string[],env:NodeJS.ProcessEnv,injected:Partial<Dependencies>={}):Promise<number>{
 const result=emptyProvision();
 try{await main(args,env,injected,result);console.log(JSON.stringify(result));return result.FINAL_VERDICT==="PASS"?0:1;}
 catch{rejectProvision(result,"OUTPUT");try{console.error(JSON.stringify(result));}catch{/* No unhandled raw error. */}return 1;}
}
if(process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 void entrypoint(process.argv.slice(2),process.env).then(code=>{process.exitCode=code;});
}
