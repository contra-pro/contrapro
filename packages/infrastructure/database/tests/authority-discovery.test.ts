import { describe, expect, it, vi } from "vitest";
import { parse } from "libpg-query";
import type { ApplyConfig } from "../src/migrations/config";
import { authoritySelect, fixedSelects, discoverAuthority } from "../src/verification/authority";
import { selects, target, roleNames, type ReadonlyClient } from "../src/verification/bootstrap";
import { entrypoint, main } from "../scripts/discover-foundation-authority";
import { loadMigrations } from "../src/migrations/manifest";
const testEnvironment: NodeJS.ProcessEnv = {
 CONTRATPRO_MIGRATION_ENVIRONMENT:"development", CONTRATPRO_MIGRATION_CONNECTION_MODE:"session",
 CONTRATPRO_MIGRATION_LOGIN:"postgres", CONTRATPRO_MIGRATION_JOURNAL_OWNER:"postgres",
 CONTRATPRO_MIGRATION_DATABASE:"postgres", CONTRATPRO_MIGRATION_SERVER_PORT:"5432",
 CONTRATPRO_MIGRATION_CA_FILE:"synthetic-unused",
 CONTRATPRO_MIGRATION_URL:"postgresql://postgres.gllsiklbvqpxzucvkehw:synthetic@aws-0-eu-west-1.pooler.supabase.com:5432/postgres",
};

const config: ApplyConfig = { stage: "bootstrap", url: "synthetic-unused", targetId: target.id,
 database: target.database, databaseOid: target.oid, login: "postgres", journalOwner: "postgres",
 serverAddress: target.address, serverPort: target.port, planHash: target.plan, caFile: "synthetic-unused" };
function fixtures(): Record<string,Record<string,unknown>[]> {
 return {
 [selects.identity]: [{ database:"postgres",database_oid:"5",login:"postgres",role:"postgres",
 server_address:target.address,server_port:5432,recovery:false,version:170011,backend_pid:100 }],
 [selects.safeguards]: [{readonly:"on",statement:"5s",lock:"2s",idle:"10s"}],
 [selects.existence]: [{schema_exists:true,journal_exists:true,foundation_absent:true}],
 [selects.roles]: roleNames.map(rolname => ({rolname,rolcanlogin:false,rolsuper:false,rolcreatedb:false,
 rolcreaterole:false,rolinherit:false,rolreplication:false,rolbypassrls:false,rolconnlimit:-1,no_expiry:true,no_config:true})),
 [selects.memberships]: roleNames.map(role => ({role,member:"postgres",grantor:"supabase_admin",
 admin_option:true,inherit_option:false,set_option:false,total_matching_count:"3",grantor_oid:"10",
 grantor_matches_snapshot_oid:true,grantor_matches_current_admin:true,grantor_superuser:true,grantor_createrole:true,
 grantor_direct_admin_count:"0",grantor_direct_admin_inherit:false,grantor_direct_admin_set:false})),
 [selects.history]: [{id:"0000_roles.sql",ordinal:0,checksum:target.bootstrap,target_id:target.id,
 runner_version:1,applied_by:"postgres",timestamp_valid:true}],
 [selects.acl]: [{schema_acl:true,table_acl:true,column_acl:true,effective_boundary:true,no_owned_objects:true,
 no_direct_grants:true,global_defaults_unchanged:true}],
 [authoritySelect]: [{owner_oid:"10",owner_name:"supabase_admin",executor_is_owner:false,
 executor_create:true,executor_grant_option:true,owner_create:false,executor_set:false}],
 };
}
function fake(data=fixtures(), failure="", tls=true) {
 const log: string[]=[];
 const connect=vi.fn(async () => { if(failure==="connect") throw new Error("secret postgres://password C:/private"); });
 const end=vi.fn(async () => { if(failure==="end") throw new Error("private cleanup"); });
 const client: ReadonlyClient={connect,end,tlsVerified:()=>tls,onError:()=>{},
 async query(sql) { log.push(sql); if(sql===failure) throw new Error("secret raw SQL private-role");
 if(data[sql]) return {rows:data[sql]!};
 if(sql.startsWith("BEGIN")) return {rows:[],command:"BEGIN"};
 if(sql==="ROLLBACK") return {rows:[],command:"ROLLBACK"};
 if(sql.startsWith("SET LOCAL")) return {rows:[],command:"SET"};
 throw new Error("unexpected query");
 }};
 return {client,log,connect,end};
}
describe("standalone authority discovery offline contracts",()=>{
 it("uses only eight fixed SELECT definitions plus bounded transaction controls",async()=>{
 expect(Object.keys(fixedSelects)).toHaveLength(8);
 for(const sql of Object.values(fixedSelects)) {
 const ast=await parse(sql); expect(ast.stmts).toHaveLength(1);
 expect(Object.keys(ast.stmts![0]!.stmt!)).toEqual(["SelectStmt"]);
 }
 const f=fake();const r=await discoverAuthority(f.client,config);
 expect(r.FINAL_VERDICT).toBe("PASS");expect(f.connect).toHaveBeenCalledTimes(1);expect(f.end).toHaveBeenCalledTimes(1);
 expect(f.log[0]).toBe("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
 expect(f.log.indexOf(selects.safeguards)).toBeLessThan(f.log.indexOf(selects.existence));
 expect(f.log.at(-1)).toBe("ROLLBACK");expect(f.log).not.toContain("COMMIT");
 expect(f.log.filter(s=>s===authoritySelect)).toHaveLength(1);
 });
 it.each([
 ["postgres",true,true,true,"PASS"], ["supabase_admin",false,true,true,"PASS"],
 ["unobserved-private-owner",false,true,false,"FAIL"], ["unobserved-private-owner",false,false,false,"FAIL"],
 ["postgres",true,false,true,"PASS"],
 ] as const)("distinguishes owner and delegation evidence %s/%s/%s/%s",async(name,owns,create,grant,verdict)=>{
 const d=fixtures();Object.assign(d[authoritySelect]![0]!,{owner_name:name,executor_is_owner:owns,executor_create:create,executor_grant_option:grant});
 const r=await discoverAuthority(fake(d).client,config);
 expect(r.DATABASE_CREATE_DELEGATION).toBe(verdict);expect(r.FINAL_VERDICT).toBe(verdict);
 expect(JSON.stringify(r)).not.toContain("unobserved-private-owner");
 });
 it.each(["owner_oid","owner_name","executor_is_owner","executor_create","executor_grant_option","owner_create","executor_set"])(
 "rejects missing evidence %s",async key=>{
 const d=fixtures();delete d[authoritySelect]![0]![key];
 expect((await discoverAuthority(fake(d).client,config)).FINAL_VERDICT).toBe("INDETERMINATE");
 });
 it.each([
 {owner_oid:"0"},{owner_oid:"10x"},{executor_create:"true"},{owner_name:"postgres",executor_is_owner:false},
 {executor_is_owner:true},{owner_create:true},{executor_set:true},
 ])("rejects inconsistent authority %j",async change=>{
 const d=fixtures();Object.assign(d[authoritySelect]![0]!,change);
 expect((await discoverAuthority(fake(d).client,config)).FINAL_VERDICT).not.toBe("PASS");
 });
 it.each(["missing","extra","outgoing","admin","set","grantor","overflow"])("rejects membership state %s",async variant=>{
 const d=fixtures(), rows=d[selects.memberships]!;
 if(variant==="missing") rows.pop();
 if(variant==="extra") rows.push({...rows[0]});
 if(variant==="outgoing") rows[0]!.member=roleNames[1];
 if(variant==="admin") rows[0]!.admin_option=false;
 if(variant==="set") rows[0]!.set_option=true;
 if(variant==="grantor") rows[0]!.grantor="private-role";
 if(variant==="overflow") d[selects.memberships]=Array.from({length:17},()=>({...rows[0],total_matching_count:"100"}));
 const f=fake(d),r=await discoverAuthority(f.client,config);
 expect(r.BASELINE).toBe("FAIL");expect(f.log).not.toContain(authoritySelect);
 expect(r.diagnostic.rollback).toBe("SUCCEEDED");expect(JSON.stringify(r)).not.toContain("private-role");
 });
 it.each([selects.existence,selects.roles,selects.memberships,selects.history,selects.acl,authoritySelect])(
 "sanitizes catalog query errors and cleans up",async sql=>{
 const f=fake(fixtures(),sql),r=await discoverAuthority(f.client,config);
 expect(r.FINAL_VERDICT).toBe("INDETERMINATE");expect(r.diagnostic.rollback).toBe("SUCCEEDED");
 expect(f.end).toHaveBeenCalledTimes(1);expect(JSON.stringify(r)).not.toMatch(/secret|private-role|raw SQL/);
 });
 it.each(["connect","BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY","ROLLBACK","end"])(
 "handles transport and cleanup failure %s",async failure=>{
 const f=fake(fixtures(),failure),r=await discoverAuthority(f.client,config);
 expect(r.FINAL_VERDICT).not.toBe("PASS");expect(f.connect).toHaveBeenCalledTimes(1);expect(f.end).toHaveBeenCalledTimes(1);
 if(failure==="connect") {expect(r.diagnostic.contact).toBe("UNKNOWN");expect(r.diagnostic.rollback).toBe("NOT_ATTEMPTED");}
 else expect(f.log).toContain("ROLLBACK");
 if(failure==="ROLLBACK") expect(r.diagnostic.stage).toBe("ROLLBACK");
 });
 it("rejects TLS, identity, timeout and foundation mismatches",async()=>{
 expect((await discoverAuthority(fake(fixtures(),"",false).client,config)).TLS).toBe("FAIL");
 for(const [sql,key,value] of [[selects.identity,"login","other"],[selects.safeguards,"readonly","off"],
 [selects.safeguards,"statement","60s"],[selects.existence,"foundation_absent",false]] as const){
 const d=fixtures();d[sql]![0]![key]=value;const f=fake(d);
 expect((await discoverAuthority(f.client,config)).FINAL_VERDICT).not.toBe("PASS");expect(f.log).not.toContain(authoritySelect);
 }
 });
 it("keeps output fixed and preserves facts after serialization failure",async()=>{
 const f=fake();const out=vi.spyOn(console,"log").mockImplementation(()=>{throw new Error("password private path");});
 const err=vi.spyOn(console,"error").mockImplementation(()=>{});
 try{
 const code=await entrypoint(["--discover-authority",target.id],{...testEnvironment,
 CONTRATPRO_MIGRATION_TARGET_ID:target.id,CONTRATPRO_MIGRATION_DATABASE_OID:"5",
 CONTRATPRO_MIGRATION_SERVER_ADDRESS:target.address,CONTRATPRO_MIGRATION_PLAN_SHA256:target.plan},
 {loadPlan:loadMigrations,buildOptions:async()=>({sslnegotiation:"postgres"}),createClient:async()=>f.client});
 expect(code).toBe(1);const text=String(err.mock.calls[0]?.[0]);const r=JSON.parse(text);
 expect(r.TARGET).toBe("PASS");expect(r.diagnostic.contact).toBe("ESTABLISHED");expect(r.diagnostic.stage).toBe("OUTPUT");
 expect(text).not.toMatch(/password|private|postgres:|C:/);
 }finally{out.mockRestore();err.mockRestore();}
 });
 it("rejects invalid CLI or configuration before client construction",async()=>{
 const createClient=vi.fn();
 const r=await main([],{}, {createClient});
 expect(r.FINAL_VERDICT).toBe("INDETERMINATE");expect(createClient).not.toHaveBeenCalled();
 expect(r.diagnostic.contact).toBe("NOT_ESTABLISHED");
 });
});

describe("fixed preparation diagnostics",()=>{
 const args = ["--discover-authority",target.id];
 const environment = () => ({...testEnvironment,
  CONTRATPRO_MIGRATION_TARGET_ID:target.id,CONTRATPRO_MIGRATION_DATABASE_OID:"5",
  CONTRATPRO_MIGRATION_SERVER_ADDRESS:target.address,CONTRATPRO_MIGRATION_PLAN_SHA256:target.plan});
 const raw = "secret postgres://password@private C:/private/certificate.pem raw exception";
 const thrown = async (): Promise<never> => { throw new Error(raw); };

 it.each([
  [], ["--discover-authority"], ["--verify-bootstrap",target.id],
  ["--discover-authority","wrong-project"], ["--discover-authority",target.id,"extra"],
  [target.id,"--discover-authority"], ["--discover-authority",target.id.toUpperCase()],
 ])("rejects argument vector %j before reading configuration",async(...values)=>{
  // Vitest spreads table-array values; reconstruct the exact argument vector.
  const input = values.filter(value => typeof value === "string") as string[];
  let reads=0;
  const env = new Proxy({}, {get(){reads++;throw new Error(raw);}});
  const loadPlan=vi.fn(thrown),buildOptions=vi.fn(thrown),createClient=vi.fn(thrown);
  const r=await main(input,env,{loadPlan,buildOptions,createClient});
  expect(r.diagnostic).toEqual({stage:"CLI_ARGUMENTS",reason:"INVALID_ARGUMENTS",
   contact:"NOT_ESTABLISHED",rollback:"NOT_ATTEMPTED",cleanup:"NOT_ATTEMPTED"});
  expect(r.FINAL_VERDICT).toBe("INDETERMINATE");
  expect(reads).toBe(0);expect(loadPlan).not.toHaveBeenCalled();
  expect(buildOptions).not.toHaveBeenCalled();expect(createClient).not.toHaveBeenCalled();
 });

 it.each([
  ["configuration","CONFIGURATION","CONFIGURATION_REJECTED"],
  ["target","CONFIGURATION","CONFIGURATION_REJECTED"],
  ["manifest","MANIFEST","MANIFEST_REJECTED"],
  ["checksum","MANIFEST","MANIFEST_REJECTED"],
  ["ca","CA_VALIDATION","CA_REJECTED"],
  ["driver","DRIVER_INITIALIZATION","DRIVER_INITIALIZATION_FAILED"],
 ] as const)("classifies %s without exposing raw failures",async(phase,stage,reason)=>{
  const env=environment();
  if(phase==="configuration") delete (env as NodeJS.ProcessEnv).CONTRATPRO_MIGRATION_ENVIRONMENT;
  if(phase==="target") env.CONTRATPRO_MIGRATION_DATABASE_OID="6";
  const loadPlan=vi.fn(async()=>{
   if(phase==="manifest") return thrown();
   const plan=await loadMigrations();
   return phase==="checksum" ? plan.map(m=>({...m,checksum:"0".repeat(64)})) : plan;
  });
  const buildOptions=vi.fn(async()=>{
   if(phase==="ca") return thrown();
   return {sslnegotiation:"postgres" as const};
  });
  const createClient=vi.fn(thrown);
  const r=await main(args,env,{loadPlan,buildOptions,createClient});
  expect(r.diagnostic).toEqual({stage,reason,contact:"NOT_ESTABLISHED",
   rollback:"NOT_ATTEMPTED",cleanup:"NOT_ATTEMPTED"});
  expect([r.TARGET,r.TLS,r.BASELINE,r.DATABASE_CREATE_DELEGATION,r.MEMBERSHIP_AUTHORITY,r.FINAL_VERDICT])
   .toEqual(Array(6).fill("INDETERMINATE"));
  expect(r.evidence).toBeNull();expect(JSON.stringify(r)).not.toMatch(/secret|password|private|postgres:|raw exception/);
  if(phase==="configuration" || phase==="target") expect(loadPlan).not.toHaveBeenCalled();
  if(["configuration","target","manifest","checksum"].includes(phase)) expect(buildOptions).not.toHaveBeenCalled();
  if(phase!=="driver") expect(createClient).not.toHaveBeenCalled();
  else expect(createClient).toHaveBeenCalledTimes(1);
 });

 it("accepts exactly the documented argument contract with fully injected offline transport",async()=>{
  const f=fake();
  const createClient=vi.fn(async()=>f.client);
  const buildOptions=vi.fn(async()=>({sslnegotiation:"postgres" as const}));
  const r=await main(args,environment(),{loadPlan:loadMigrations,buildOptions,createClient});
  expect(r.FINAL_VERDICT).toBe("PASS");expect(r.diagnostic.stage).toBeNull();
  expect(createClient).toHaveBeenCalledTimes(1);expect(f.connect).toHaveBeenCalledTimes(1);
  expect(f.log.at(-1)).toBe("ROLLBACK");expect(f.end).toHaveBeenCalledTimes(1);
 });

 it("emits only sanitized preparation diagnostics on stdout and no raw stderr",async()=>{
  const stdout=vi.spyOn(console,"log").mockImplementation(()=>{});
  const stderr=vi.spyOn(console,"error").mockImplementation(()=>{});
  try {
   expect(await entrypoint(args,environment(),{loadPlan:thrown,buildOptions:thrown,createClient:thrown})).toBe(1);
   expect(stdout).toHaveBeenCalledTimes(1);expect(stderr).not.toHaveBeenCalled();
   const output=String(stdout.mock.calls[0]![0]);
   expect(JSON.parse(output).diagnostic).toMatchObject({stage:"MANIFEST",reason:"MANIFEST_REJECTED"});
   expect(output).not.toMatch(/secret|password|private|postgres:|raw exception/);
  } finally {stdout.mockRestore();stderr.mockRestore();}
 });
});
