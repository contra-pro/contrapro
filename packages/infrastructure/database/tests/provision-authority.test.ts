import {describe,it,expect,vi} from "vitest";
import {parse} from "libpg-query";
import {readFile} from "node:fs/promises";
import {provisionAuthority,provisioningSelects as q,grants} from "../src/verification/provision-authority";
import {verifyProvisionArtifacts,artifactHashes,draftHash} from "../src/verification/provision-artifacts";
import {selects,target,roleNames,type ReadonlyClient} from "../src/verification/bootstrap";
import {journalColumns,queries} from "../src/migrations/sql";
import {makeMain,entrypoint} from "../scripts/provision-foundation-authority";
import {runMigrations} from "../src/migrations/runner";
import {loadMigrations} from "../src/migrations/manifest";
import type {ApplyConfig} from "../src/migrations/config";

const config:ApplyConfig={stage:"bootstrap",url:"unused",targetId:target.id,database:"postgres",databaseOid:5,login:"postgres",
 journalOwner:"postgres",serverAddress:target.address,serverPort:5432,planHash:target.plan,caFile:"unused"};
type Data=Record<string,Record<string,unknown>[]>;
function fixture(post=false):Data{
 const provider=roleNames.map(role=>({role,member:"postgres",grantor:"supabase_admin",
 admin_option:true,inherit_option:false,set_option:false,total_matching_count:post?"4":"3",grantor_oid:"10",
 grantor_matches_snapshot_oid:true,grantor_matches_current_admin:true,grantor_superuser:true,grantor_createrole:true,
 grantor_direct_admin_count:"0",grantor_direct_admin_inherit:false,grantor_direct_admin_set:false}));
 const dbAcl=[{grantor:"16384",grantee:"16384",privilege_type:"CREATE",is_grantable:false}];
 return {
 [q.lock]:[{locked:true,backend_pid:100,transaction_id:"123"}],
 [q.heldLock]:[{locked:true,backend_pid:100,transaction_id:"123"}],
 [selects.identity]:[{database:"postgres",database_oid:"5",login:"postgres",role:"postgres",server_address:target.address,
 server_port:5432,recovery:false,version:170011,backend_pid:100}],
 [selects.safeguards]:[{readonly:"off",statement:"5s",lock:"2s",idle:"10s"}],
 [selects.existence]:[{schema_exists:true,journal_exists:true,foundation_absent:true}],
 [selects.shape]:[{schema_owner:"postgres",table_owner:"postgres",shape_safe:true,primary_safe:true,ordinal_safe:true,
 marker:"contratpro migration journal v1",columns:journalColumns}],
 [selects.details]:[{checks:["ordinal>=0ANDordinal<=3","checksum~'^[0-9a-f]{64}$'::text",
 "lengthtarget_id>=8ANDlengthtarget_id<=64","runner_version=1"],defaults:["applied_at:clock_timestamp()","applied_by:SESSION_USER"],
 constraint_count:6,constraints_valid:true,no_rules:true,no_extra_relations:true}],
 [selects.history]:[{id:"0000_roles.sql",ordinal:0,checksum:target.bootstrap,target_id:target.id,runner_version:1,applied_by:"postgres",timestamp_valid:true}],
 [selects.roles]:roleNames.map(rolname=>({rolname,rolcanlogin:false,rolsuper:false,rolcreatedb:false,rolcreaterole:false,
 rolinherit:false,rolreplication:false,rolbypassrls:false,rolconnlimit:-1,no_expiry:true,no_config:true})),
 [q.ids]:["postgres",...roleNames].map((rolname,i)=>({rolname,oid:String(16384+i)})),
 [q.authority]:[{owner_name:"postgres",owner_oid:"16384",executor_is_owner:true,executor_create:true,executor_grant_option:true,
 owner_create:post,executor_set:post}],
 [selects.memberships]:post?[...provider,{...provider[0],role:roleNames[0],grantor:"postgres",grantor_oid:"16384",
 admin_option:false,set_option:true}]:provider,
 [selects.acl]:[{schema_acl:true,table_acl:true,column_acl:true,no_owned_objects:true,global_defaults_unchanged:true,
 effective_boundary:!post,no_direct_grants:!post}],
 [q.boundary]:[{safe:true}],[q.runtimeGrants]:[{safe:true}],
 [q.databaseAcl]:post?[...dbAcl,{grantor:"16384",grantee:"16385",privilege_type:"CREATE",is_grantable:false}]:dbAcl,
 [q.journalAcl]:[{schema_owner:"16384",table_owner:"16384",schema_acl:null,table_acl:null,columns:journalColumns}],
 [q.journalRows]:[{id:"0000_roles.sql",ordinal:0,checksum:target.bootstrap,target_id:target.id,runner_version:1,applied_by:"postgres",applied_at:"synthetic-fixed-time"}],
 [q.foundationAuthority]:[{owner_create:true,owner_set:true}],
 };
}
function fake(options:{before?:Data;after?:Data;fail?:string;tls?:boolean;rollbackFail?:boolean;cleanupFail?:boolean}={}){
 const before=options.before??fixture(),after=options.after??fixture(true),log:string[]=[];
 let post=false,callback:()=>void=()=>{};
 const client:ReadonlyClient={
 connect:vi.fn(async()=>{if(options.fail==="connect")throw new Error("secret postgres://password C:/private");}),
 tlsVerified:()=>options.tls!==false,
 onError(handler){callback=handler;},
 query:vi.fn(async(sql:string)=>{
 log.push(sql);if(sql===options.fail || sql==="ROLLBACK" && options.rollbackFail)throw new Error("secret raw SQL private-role");
 if(sql===grants[0])return{rows:[],command:"GRANT"};
 if(sql===grants[1]){post=true;return{rows:[],command:"GRANT"};}
 if(sql.startsWith("BEGIN"))return{rows:[],command:"BEGIN"};
 if(["COMMIT","ROLLBACK"].includes(sql))return{rows:[],command:sql};
 if(sql.startsWith("SET LOCAL"))return{rows:[],command:"SET"};
 const rows=(post?after:before)[sql];if(!rows)throw new Error("unexpected query");
 return{rows:structuredClone(rows)};
 }),
 end:vi.fn(async()=>{if(options.cleanupFail)throw new Error("private cleanup");}),
 };
 return{client,log,signal:()=>callback()};
}
describe("controlled provisioning offline only",()=>{
 it("parses fixed catalog SELECTs and exactly the two approved GRANTs",async()=>{
 for(const sql of Object.values(q)){
 const tree=await parse(sql);expect(tree.stmts).toHaveLength(1);
 expect(Object.keys(tree.stmts![0]!.stmt!)).toEqual(["SelectStmt"]);
 }
 expect(grants).toEqual(["GRANT CREATE ON DATABASE postgres TO contratpro_migration_owner",
 "GRANT contratpro_migration_owner TO postgres WITH ADMIN FALSE, INHERIT FALSE, SET TRUE GRANTED BY postgres"]);
 for(const sql of grants)await expect(parse(sql)).resolves.toBeDefined();
 });
 it("commits only after complete pre/post checks on one connection",async()=>{
 const f=fake();const r=await provisionAuthority(f.client,config);
 expect(r).toMatchObject({PRECONDITIONS:"PASS",POSTCONDITIONS:"PASS",OUTCOME:"COMMITTED",FINAL_VERDICT:"PASS"});
 expect(f.client.connect).toHaveBeenCalledTimes(1);expect(f.client.end).toHaveBeenCalledTimes(1);
 expect(f.log.filter(s=>s.startsWith("BEGIN"))).toHaveLength(1);
 expect(f.log.filter(s=>grants.includes(s))).toEqual(grants);
 expect(f.log.filter(s=>s==="COMMIT")).toHaveLength(1);expect(f.log).not.toContain("ROLLBACK");
 expect(f.log.indexOf(q.journalRows)).toBeLessThan(f.log.indexOf(grants[0]!));
 expect(f.log.lastIndexOf(q.foundationAuthority)).toBeLessThan(f.log.indexOf("COMMIT"));
 });
 const mutations:[string,string,unknown][]=[
 [selects.identity,"database","other"],[selects.identity,"database_oid","6"],[selects.identity,"login","other"],
 [selects.identity,"role","other"],[selects.identity,"server_address","::1"],[selects.identity,"server_port",5433],
 [selects.identity,"recovery",true],[selects.identity,"version",180000],[selects.identity,"backend_pid",null],
 [selects.safeguards,"readonly","on"],[selects.safeguards,"statement","60s"],[selects.safeguards,"lock","0"],
 [selects.safeguards,"idle","20s"],[selects.existence,"schema_exists",false],[selects.existence,"journal_exists",false],
 [selects.existence,"foundation_absent",false],[selects.shape,"schema_owner","other"],[selects.shape,"table_owner","other"],
 [selects.shape,"shape_safe",false],[selects.shape,"primary_safe",false],[selects.shape,"ordinal_safe",false],
 [selects.shape,"marker","wrong"],[selects.shape,"columns",[]],[selects.details,"checks",[]],[selects.details,"defaults",[]],
 [selects.details,"constraint_count",7],[selects.details,"constraints_valid",false],[selects.details,"no_rules",false],
 [selects.details,"no_extra_relations",false],[selects.history,"checksum","wrong"],[selects.history,"id","0001_schema.sql"],
 [selects.history,"ordinal",1],[selects.history,"target_id","wrong"],[selects.history,"runner_version",2],
 [selects.history,"applied_by","other"],[selects.history,"timestamp_valid",false],
 ...["rolcanlogin","rolsuper","rolcreatedb","rolcreaterole","rolinherit","rolreplication","rolbypassrls"].map(k=>[selects.roles,k,true] as [string,string,unknown]),
 [selects.roles,"rolconnlimit",0],[selects.roles,"no_expiry",false],[selects.roles,"no_config",false],[q.ids,"oid","0"],
 [q.authority,"owner_name","other"],[q.authority,"owner_oid","10"],[q.authority,"executor_is_owner",false],
 [q.authority,"executor_create",false],[q.authority,"executor_grant_option",false],
 [selects.memberships,"grantor","other"],[selects.memberships,"admin_option",false],
 [selects.memberships,"inherit_option",true],[selects.memberships,"set_option",true],
 [selects.memberships,"member",roleNames[1]],[selects.memberships,"grantor_oid","11"],
 ...["schema_acl","table_acl","column_acl","no_owned_objects","global_defaults_unchanged"].map(k=>[selects.acl,k,false] as [string,string,unknown]),
 [q.boundary,"safe",false],[q.runtimeGrants,"safe",false],[q.journalAcl,"schema_owner","other"],
 [q.journalAcl,"table_owner","other"],[q.journalAcl,"columns",[]],[q.databaseAcl,"grantee","malformed"],
 [q.databaseAcl,"privilege_type","arbitrary"],[q.journalRows,"applied_at",null],
 ];
 it.each(mutations)("blocks precondition %s/%s",async(sql,key,value)=>{
 const before=fixture();before[sql]![0]![key]=value;const f=fake({before});
 const r=await provisionAuthority(f.client,config);expect(r.FINAL_VERDICT).not.toBe("PASS");
 expect(f.log).not.toContain(grants[0]);expect(f.log).not.toContain("COMMIT");expect(f.client.end).toHaveBeenCalledTimes(1);
 });
 it.each(mutations)("blocks postcondition %s/%s and rolls back",async(sql,key,value)=>{
 const after=fixture(true);after[sql]![0]![key]=value;const f=fake({after});
 const r=await provisionAuthority(f.client,config);expect(r.POSTCONDITIONS).toBe("INDETERMINATE");
 expect(f.log).toContain(grants[1]);expect(f.log).not.toContain("COMMIT");expect(r.diagnostic.rollback).toBe("SUCCEEDED");
 });
 it.each(["pre_create","pre_set","post_create","post_set","post_acl","post_member","post_admin","post_inherit",
 "post_set_option","post_grantor","provider_changed","journal_changed","acl_changed","foundation_gate","pre_overflow","post_overflow"])(
 "rejects precise state/delta violation %s",async variant=>{
 const before=fixture(),after=fixture(true);
 if(variant==="pre_create")before[q.authority]![0]!.owner_create=true;
 if(variant==="pre_set")before[q.authority]![0]!.executor_set=true;
 if(variant==="post_create")after[q.authority]![0]!.owner_create=false;
 if(variant==="post_set")after[q.authority]![0]!.executor_set=false;
 if(variant==="post_acl")after[q.databaseAcl]![1]!.is_grantable=true;
 if(variant==="post_member")after[selects.memberships]!.pop();
 if(variant==="post_admin")after[selects.memberships]![3]!.admin_option=true;
 if(variant==="post_inherit")after[selects.memberships]![3]!.inherit_option=true;
 if(variant==="post_set_option")after[selects.memberships]![3]!.set_option=false;
 if(variant==="post_grantor")after[selects.memberships]![3]!.grantor="other";
 if(variant==="provider_changed")after[selects.memberships]![0]!.grantor_superuser=false;
 if(variant==="journal_changed")after[q.journalRows]![0]!.applied_at="changed";
 if(variant==="acl_changed")after[q.journalAcl]![0]!.schema_acl="changed";
 if(variant==="foundation_gate")after[q.foundationAuthority]![0]!.owner_set=false;
 if(variant==="pre_overflow")before[q.databaseAcl]=Array.from({length:65},()=>({...before[q.databaseAcl]![0]}));
 if(variant==="post_overflow")after[selects.memberships]=Array.from({length:17},()=>({...after[selects.memberships]![0]}));
 const f=fake({before,after}),r=await provisionAuthority(f.client,config);
 expect(r.FINAL_VERDICT).not.toBe("PASS");expect(f.log).not.toContain("COMMIT");expect(r.diagnostic.rollback).toBe("SUCCEEDED");
 });
 it.each(Object.values(q))("stops safely on SELECT failure",async sql=>{
 const f=fake({fail:sql});const r=await provisionAuthority(f.client,config);
 expect(r.FINAL_VERDICT).not.toBe("PASS");expect(f.log).not.toContain("COMMIT");
 expect(f.client.end).toHaveBeenCalledTimes(1);expect(JSON.stringify(r)).not.toMatch(/secret|raw SQL|private-role/);
 });
 it.each([grants[0]!,grants[1]!])("rolls back grant failure without retry",async fail=>{
 const f=fake({fail}),r=await provisionAuthority(f.client,config);
 expect(r.diagnostic.rollback).toBe("SUCCEEDED");expect(f.log.filter(s=>s===fail)).toHaveLength(1);
 expect(f.log).not.toContain("COMMIT");if(fail===grants[0])expect(f.log).not.toContain(grants[1]);
 });
 it("reports lost COMMIT acknowledgement without rollback or replay",async()=>{
 const f=fake({fail:"COMMIT"}),r=await provisionAuthority(f.client,config);
 expect(r.OUTCOME).toBe("INDETERMINATE");expect(r.FINAL_VERDICT).toBe("INDETERMINATE");
 expect(f.log.filter(s=>s==="COMMIT")).toHaveLength(1);expect(f.log).not.toContain("ROLLBACK");
 expect(f.client.end).toHaveBeenCalledTimes(1);
 });
 it("retains the primary failure on rollback and cleanup failure",async()=>{
 const f=fake({fail:grants[1]!,rollbackFail:true,cleanupFail:true}),r=await provisionAuthority(f.client,config);
 expect(r.diagnostic).toMatchObject({stage:"GRANT_SET",rollback:"FAILED",cleanup:"FAILED"});
 expect(r.OUTCOME).toBe("INDETERMINATE");expect(r.FINAL_VERDICT).toBe("INDETERMINATE");
 });
 it("retains confirmed COMMIT when cleanup fails",async()=>{
 const f=fake({cleanupFail:true}),r=await provisionAuthority(f.client,config);
 expect(r.OUTCOME).toBe("COMMITTED");expect(r.FINAL_VERDICT).toBe("INDETERMINATE");expect(r.diagnostic.stage).toBe("CLEANUP");
 });
 it("retains confirmed facts on output failure without leaking exceptions",async()=>{
 const f=fake();const out=vi.spyOn(console,"log").mockImplementation(()=>{throw new Error("password C:/private");});
 const err=vi.spyOn(console,"error").mockImplementation(()=>{});
 try{
 const code=await entrypoint(["--provision-foundation-authority",target.id],env(),{
 verifyArtifacts:async()=>{},buildOptions:async()=>({sslnegotiation:"postgres"}),createClient:async()=>f.client});
 expect(code).toBe(1);const output=String(err.mock.calls[0]?.[0]);const r=JSON.parse(output);
 expect(r.OUTCOME).toBe("COMMITTED");expect(r.diagnostic.contact).toBe("ESTABLISHED");expect(r.diagnostic.stage).toBe("OUTPUT");
 expect(output).not.toMatch(/password|private|postgres:/);
 }finally{out.mockRestore();err.mockRestore();}
 });
 it.each(Object.values(q))("rejects missing catalog evidence",async sql=>{
 const before=fixture(),after=fixture(true);before[sql]=[];after[sql]=[];
 const f=fake({before,after}),r=await provisionAuthority(f.client,config);
 expect(r.FINAL_VERDICT).not.toBe("PASS");expect(f.log).not.toContain("COMMIT");
 });
 it("rejects failed TLS before transaction or GRANT",async()=>{
 const f=fake({tls:false}),r=await provisionAuthority(f.client,config);
 expect(r.diagnostic.stage).toBe("TLS");expect(f.log).not.toContain(grants[0]);
 expect(f.log.some(s=>s.startsWith("BEGIN"))).toBe(false);expect(f.client.end).toHaveBeenCalledTimes(1);
 });
 it("does not connect twice with the same transport",async()=>{
 const f=fake();await provisionAuthority(f.client,config);
 const r=await provisionAuthority(f.client,config);expect(r.diagnostic.stage).toBe("DUPLICATE");
 expect(f.client.connect).toHaveBeenCalledTimes(1);
 });
 it.each(["connect","BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED READ WRITE"])("cleans up uncertain startup %s",async fail=>{
 const f=fake({fail}),r=await provisionAuthority(f.client,config);
 expect(r.FINAL_VERDICT).not.toBe("PASS");expect(f.client.end).toHaveBeenCalledTimes(1);
 if(fail==="connect")expect(r.diagnostic.contact).toBe("UNKNOWN");else expect(f.log).toContain("ROLLBACK");
 });
 it("verifies the pinned draft and nine approved hashes offline",async()=>{
 expect(artifactHashes).toHaveLength(10);expect(draftHash).toBe("902d50629df97516570afdc7656e833e3183a7de2da9c4e3ead5c25f456430aa");
 await expect(verifyProvisionArtifacts()).resolves.toBeUndefined();
 await expect(verifyProvisionArtifacts(async()=>Buffer.from("changed"))).rejects.toThrow();
 await expect(verifyProvisionArtifacts(async url=>url.pathname.endsWith("foundation-authority.sql")?Buffer.from("changed"):readFile(url))).rejects.toThrow();
 });
 const env=()=>({CONTRATPRO_MIGRATION_ENVIRONMENT:"development",CONTRATPRO_MIGRATION_CONNECTION_MODE:"session",
 CONTRATPRO_MIGRATION_TARGET_ID:target.id,CONTRATPRO_MIGRATION_DATABASE:"postgres",CONTRATPRO_MIGRATION_DATABASE_OID:"5",
 CONTRATPRO_MIGRATION_LOGIN:"postgres",CONTRATPRO_MIGRATION_JOURNAL_OWNER:"postgres",CONTRATPRO_MIGRATION_SERVER_ADDRESS:target.address,
 CONTRATPRO_MIGRATION_SERVER_PORT:"5432",CONTRATPRO_MIGRATION_PLAN_SHA256:target.plan,CONTRATPRO_MIGRATION_CA_FILE:"synthetic",
 CONTRATPRO_MIGRATION_URL:"postgresql://postgres.gllsiklbvqpxzucvkehw:synthetic@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"});
 it.each([[],["--provision-foundation-authority"],["--apply",target.id],["--provision-foundation-authority","other"],
 ["--provision-foundation-authority",target.id,"extra"]].map(args=>({args})))("rejects CLI $args before config",async({args})=>{
 const createClient=vi.fn(),verifyArtifacts=vi.fn();let reads=0;
 const r=await makeMain()(args,new Proxy({},{get(){reads++;throw new Error();}}),{createClient,verifyArtifacts});
 expect(r.diagnostic.stage).toBe("ARGUMENTS");expect(reads).toBe(0);expect(createClient).not.toHaveBeenCalled();expect(verifyArtifacts).not.toHaveBeenCalled();
 });
 it("accepts exact CLI with injected transport and rejects a second invocation",async()=>{
 const f=fake(),createClient=vi.fn(async()=>f.client),run=makeMain();
 const deps={createClient,verifyArtifacts:async()=>{},buildOptions:async()=>({sslnegotiation:"postgres" as const})};
 expect((await run(["--provision-foundation-authority",target.id],env(),deps)).FINAL_VERDICT).toBe("PASS");
 expect((await run(["--provision-foundation-authority",target.id],env(),deps)).diagnostic.stage).toBe("DUPLICATE");
 expect(createClient).toHaveBeenCalledTimes(1);
 });
 it("rejects artifact failures before driver construction without raw output",async()=>{
 const createClient=vi.fn();
 const r=await makeMain()(["--provision-foundation-authority",target.id],env(),{createClient,verifyArtifacts:async()=>{throw new Error("secret C:/private postgres://password");}});
 expect(r.diagnostic.stage).toBe("PREPARATION");expect(createClient).not.toHaveBeenCalled();
 expect(JSON.stringify(r)).not.toMatch(/secret|private|password|postgres:/);
 });
});

describe("transaction advisory serialization through the production executor",()=>{
 it("shares the runner's two-int namespace and acquires before mutable baselines",async()=>{
 expect(queries.lock).toContain("pg_try_advisory_lock(1470359581, 1718059856)");
 expect(q.lock).toContain("pg_try_advisory_xact_lock(1470359581, 1718059856)");
 expect(q.heldLock).toMatch(/classid=1470359581 AND objid=1718059856 AND objsubid=2/);
 const f=fake();expect((await provisionAuthority(f.client,config)).FINAL_VERDICT).toBe("PASS");
 expect(f.log.indexOf(q.lock)).toBeGreaterThan(f.log.findIndex(s=>s.startsWith("BEGIN")));
 expect(f.log.indexOf(q.lock)).toBeGreaterThan(f.log.indexOf(selects.safeguards));
 expect(f.log.indexOf(q.heldLock)).toBeLessThan(f.log.indexOf(selects.existence));
 expect(f.log.filter(s=>s===q.lock)).toHaveLength(1);
 for(const command of [...grants,"COMMIT"])expect(f.log[f.log.indexOf(command)-1]).toBe(q.heldLock);
 expect(f.log).not.toContain(queries.unlock);
 });
 it.each([
 {locked:false},{locked:null},{locked:"true"},{locked:1},{backend_pid:101},{backend_pid:"100"},
 {transaction_id:null},{transaction_id:123},{transaction_id:"0"},{transaction_id:"123x"},
 {transaction_id:"18446744073709551616"},
 ])("rejects malformed acquisition %j with no GRANT or retry",async change=>{
 const before=fixture();Object.assign(before[q.lock]![0]!,change);
 const f=fake({before}),r=await provisionAuthority(f.client,config);
 expect(r.diagnostic).toMatchObject({stage:"LOCK",rollback:"SUCCEEDED",cleanup:"SUCCEEDED"});
 expect(f.log).not.toContain(grants[0]);expect(f.log).not.toContain(selects.existence);
 expect(f.log.filter(s=>s===q.lock)).toHaveLength(1);expect(f.log).not.toContain("COMMIT");
 });
 it.each(["locked","backend_pid","transaction_id"])("rejects missing acquisition %s",async field=>{
 const before=fixture();delete before[q.lock]![0]![field];const f=fake({before});
 expect((await provisionAuthority(f.client,config)).diagnostic.stage).toBe("LOCK");
 expect(f.log).not.toContain(grants[0]);
 });
 it.each([{locked:false},{locked:null},{backend_pid:200},{transaction_id:"124"}])(
 "rejects ownership/transaction discontinuity %j",async change=>{
 const before=fixture();Object.assign(before[q.heldLock]![0]!,change);const f=fake({before});
 const r=await provisionAuthority(f.client,config);
 expect(r.diagnostic.stage).toBe("LOCK");expect(f.log).not.toContain(grants[0]);expect(r.diagnostic.rollback).toBe("SUCCEEDED");
 });
 it("stops on late lock loss before the second GRANT",async()=>{
 const f=fake(),original=f.client.query.bind(f.client);let checks=0;
 f.client.query=async sql=>{
 if(sql===q.heldLock && ++checks===4)return{rows:[{locked:false,backend_pid:100,transaction_id:"123"}]};
 return original(sql);
 };
 const r=await provisionAuthority(f.client,config);
 expect(f.log).toContain(grants[0]);expect(f.log).not.toContain(grants[1]);
 expect(r.diagnostic.rollback).toBe("SUCCEEDED");expect(r.diagnostic.stage).toBe("GRANT_SET");
 });
 it("stops on transaction change at the final COMMIT gate",async()=>{
 const f=fake(),original=f.client.query.bind(f.client);let checks=0;
 f.client.query=async sql=>{
 if(sql===q.heldLock && ++checks===6)return{rows:[{locked:true,backend_pid:100,transaction_id:"124"}]};
 return original(sql);
 };
 const r=await provisionAuthority(f.client,config);
 expect(f.log).toContain(grants[1]);expect(f.log).not.toContain("COMMIT");expect(r.diagnostic.rollback).toBe("SUCCEEDED");
 });
 // This models PostgreSQL's shared advisory conflict domain, not live enforcement.
 function shared(){
 const state:{holder:string|null;kind:"session"|"transaction"|null;events:string[]}={holder:null,kind:null,events:[]};
 const attach=(name:string,base:ReadonlyClient,backend=100)=>{
 const client:ReadonlyClient={...base,async query(sql){
 if(sql===q.lock || sql===queries.lock){
 const locked=state.holder===null || state.holder===name;
 if(locked){state.holder=name;state.kind=sql===q.lock?"transaction":"session";}
 state.events.push(name+":acquire:"+locked);
 return{rows:[{locked,backend_pid:backend,transaction_id:"123"}]};
 }
 if(sql===q.heldLock || sql===queries.heldLock)return{rows:[{
 locked:state.holder===name,backend_pid:backend,transaction_id:"123"}]};
 if(sql===queries.unlock){const unlocked=state.holder===name;if(unlocked){state.holder=null;state.kind=null;}
 state.events.push(name+":unlock");return{rows:[{unlocked}]};}
 const r=await base.query(sql);
 if((sql==="COMMIT" || sql==="ROLLBACK") && state.kind==="transaction" && state.holder===name){
 state.events.push(name+":"+sql);state.holder=null;state.kind=null;
 }
 return r;
 },async end(){
 if(state.holder===name){state.events.push(name+":close");state.holder=null;state.kind=null;}
 await base.end();
 }};
 return client;
 };
 return{state,attach};
 }
 function deferred(){let release!:()=>void;const promise=new Promise<void>(resolve=>{release=resolve;});return{promise,release};}
 it.each(["commit","rollback"])("serializes two executor instances and releases on %s",async outcome=>{
 const lock=shared(),entered=deferred(),resume=deferred();
 const bBefore=fixture(),bAfter=fixture(true);
 bBefore[selects.identity]![0]!.backend_pid=200;bAfter[selects.identity]![0]!.backend_pid=200;
 const a=fake(outcome==="rollback"?{fail:grants[0]!}:{}),b=fake({before:bBefore,after:bAfter});
 const original=a.client.query.bind(a.client);
 a.client.query=async sql=>{if(sql===selects.existence){entered.release();await resume.promise;}return original(sql);};
 const first=provisionAuthority(lock.attach("A",a.client),config);await entered.promise;
 expect(lock.state.holder).toBe("A");
 const second=await provisionAuthority(lock.attach("B",b.client,200),config);
 expect(second.diagnostic).toMatchObject({stage:"LOCK",rollback:"SUCCEEDED",cleanup:"SUCCEEDED"});
 expect(b.log).not.toContain(grants[0]);expect(b.log).not.toContain(selects.existence);
 expect(lock.state.holder).toBe("A");
 resume.release();const result=await first;
 expect(result.FINAL_VERDICT).toBe(outcome==="commit"?"PASS":"FAIL");
 expect(lock.state.holder).toBeNull();
 expect(lock.state.events).toContain("A:"+(outcome==="commit"?"COMMIT":"ROLLBACK"));
 expect(lock.state.events.filter(e=>e==="B:acquire:false")).toHaveLength(1);
 });
 it("blocks the actual migration runner while provisioning holds its transaction lock",async()=>{
 const lock=shared(),entered=deferred(),resume=deferred(),a=fake(),b=fake();
 const original=a.client.query.bind(a.client);
 a.client.query=async sql=>{if(sql===selects.existence){entered.release();await resume.promise;}return original(sql);};
 const first=provisionAuthority(lock.attach("provision",a.client),config);await entered.promise;
 const migrationClient=lock.attach("migration",{...b.client,async query(sql){
 if(sql===queries.configure)return{rows:[],command:"SET"};return b.client.query(sql);
 }},200);
 // Give the runner the same stable backend identity as its simulated lock result.
 const previous=migrationClient.query.bind(migrationClient);
 migrationClient.query=async sql=>{
 const r=await previous(sql);if(sql===queries.identity)r.rows[0]!.backend_pid=200;return r;
 };
 await expect(runMigrations(migrationClient,config,await loadMigrations())).rejects.toThrow("holds the lock");
 expect(b.log).not.toContain("BEGIN");expect(lock.state.holder).toBe("provision");
 resume.release();expect((await first).FINAL_VERDICT).toBe("PASS");expect(lock.state.holder).toBeNull();
 });
 it("blocks provisioning while the actual migration runner holds its session lock",async()=>{
 const lock=shared(),entered=deferred(),resume=deferred(),a=fake(),b=fake();
 const runnerClient=lock.attach("migration",{...a.client,async query(sql){
 if(sql===queries.configure)return{rows:[],command:"SET"};
 if(sql===queries.status){entered.release();await resume.promise;return{rows:[{journal:"migration_control.journal",namespace_exists:true}]};}
 if(sql===queries.history)return{rows:fixture()[selects.history]!};
 return a.client.query(sql);
 }});
 const running=runMigrations(runnerClient,config,await loadMigrations());await entered.promise;
 const blocked=await provisionAuthority(lock.attach("provision",b.client),config);
 expect(blocked.diagnostic.stage).toBe("LOCK");expect(b.log).not.toContain(grants[0]);
 expect(lock.state.holder).toBe("migration");
 resume.release();expect(await running).toEqual([]);expect(lock.state.holder).toBeNull();
 expect(lock.state.events).toContain("migration:unlock");
 });
});

