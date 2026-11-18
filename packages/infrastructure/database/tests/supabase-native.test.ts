import {readFileSync,readdirSync} from "node:fs";
import {describe,it,expect,beforeAll} from "vitest";
import {parse} from "pgsql-parser";
import {parsePlPgSQL} from "libpg-query";
import {nodes,strings,record,loadDrafts} from "./sql-helpers";
import {verifyProvisionArtifacts} from "../src/verification/provision-artifacts";

const directory=new URL("../../../../supabase/migrations/",import.meta.url);
const names=["20261115000100_foundation_schema.sql","20261115000200_foundation_context.sql","20261115000300_foundation_rls_grants.sql"];
const sources=names.map(name=>readFileSync(new URL(name,directory),"utf8"));
let original:Awaited<ReturnType<typeof loadDrafts>>;
let native:unknown[];
function normalized(value:unknown):unknown{
 if(Array.isArray(value))return value.map(normalized);
 if(value && typeof value==="object")return Object.fromEntries(Object.entries(value)
 .filter(([key])=>!["location","stmt_location","stmt_len","rexpr_list_start","rexpr_list_end"].includes(key)).map(([key,v])=>[key,normalized(v)]));
 return value;
}
beforeAll(async()=>{original=await loadDrafts();native=await Promise.all(sources.map(source=>parse(source)));});
describe("native postgres foundation equivalence — offline only",()=>{
  it("contains the explicit native migration inventory, with the adopted no-DDL bootstrap marker",()=>{
  expect(readdirSync(directory).sort()).toEqual(["20261115000000_bootstrap_baseline.sql",...names,"20261115000400_supabase_auth.sql","20261115000500_agency_management.sql","20261115000600_clients.sql","20261116000700_canonical_provisioning.sql"]);
  expect((readFileSync(new URL("20261115000000_bootstrap_baseline.sql",directory),"utf8").replace(/--[^\n]*/g,"")).trim()).toBe("");
 for(const name of names)expect(name).toMatch(/^\d{14}_foundation_[a-z_]+\.sql$/);
 });
 it.each([0,1,2])("parses native SQL and PL/pgSQL guards for phase %i",async i=>{
 await expect(parsePlPgSQL(sources[i]!)).resolves.toBeDefined();
 expect(nodes(native[i],"DoStmt")).toHaveLength(2);
 expect(nodes(native[i],"TransactionStmt")).toHaveLength(0);
 expect(sources[i]).not.toMatch(/SET\s+(LOCAL\s+)?ROLE|contratpro_migration_owner|ALTER\s+DEFAULT\s+PRIVILEGES/i);
 expect(sources[i]).toContain("session_user <> 'postgres' OR current_user <> 'postgres'");
 expect(sources[i]).not.toMatch(/CREATE\s+ROLE|ALTER\s+ROLE|GRANT\s+CREATE|DROP\s|IF NOT EXISTS/i);
 });
 it("preserves every table, foreign key, constraint, index and RLS alteration",()=>{
 for(const kind of ["CreateStmt","IndexStmt","AlterTableStmt"]){
 expect(normalized(nodes(native[0],kind))).toEqual(normalized(nodes(original[1]!.ast,kind)));
 }
 const schemas=nodes(native[0],"CreateSchemaStmt");
 expect(schemas).toHaveLength(4);
 for(const schema of schemas)expect(record(schema.authrole).rolename).toBe("postgres");
 });
 it("preserves all four function signatures, bodies, invoker mode and search paths",()=>{
 expect(normalized(nodes(native[1],"CreateFunctionStmt"))).toEqual(normalized(nodes(original[2]!.ast,"CreateFunctionStmt")));
 expect(nodes(native[1],"CreateFunctionStmt")).toHaveLength(4);
 });
 it("preserves all ten tenant policies and their exact predicates",()=>{
 expect(normalized(nodes(native[2],"CreatePolicyStmt"))).toEqual(normalized(nodes(original[3]!.ast,"CreatePolicyStmt")));
 expect(nodes(native[2],"CreatePolicyStmt")).toHaveLength(10);
 });
 it("preserves every narrow runtime grant, including invitation columns and audit INSERT",()=>{
 const grants=(ast:unknown)=>nodes(ast,"GrantStmt").filter(n=>n.is_grant===true);
 expect(normalized(grants(native[2]))).toEqual(normalized(grants(original[3]!.ast)));
 expect(grants(native[0])).toHaveLength(0);expect(grants(native[1])).toHaveLength(0);
 for(const grant of grants(native[2])){
 expect(nodes(grant.grantees,"RoleSpec").map(r=>r.rolename)).toEqual(["contratpro_runtime"]);
 expect(record(grant).grant_option??false).toBe(false);
 }
 });
 it("revokes known managed/PUBLIC grants in the proper schema scopes without global defaults",()=>{
 for(const i of [0,1,2]){
 const revokes=nodes(native[i],"GrantStmt").filter(n=>n.is_grant!==true);
 expect(revokes.some(n=>nodes(n.grantees,"RoleSpec").some(r=>r.roletype==="ROLESPEC_PUBLIC")
 && ["anon","authenticated","service_role","contratpro_runtime","contratpro_platform_runtime"]
 .every(name=>nodes(n.grantees,"RoleSpec").some(r=>r.rolename===name)))).toBe(true);
 expect(nodes(native[i],"AlterDefaultPrivilegesStmt")).toHaveLength(0);
 expect(sources[i]).toContain("a.grantee<>");
 expect(sources[i]).toContain("RAISE EXCEPTION 'ContratPro native ownership or ACL mismatch'");
 expect(sources[i]).toContain("pg_catalog.acldefault");
 }
 });
 it("guards runtime attributes/membership and rejects unknown ACL grantees or grant options",()=>{
 for(const source of sources){
 expect(source).toContain("rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit OR rolreplication OR rolbypassrls");
 expect(source).toContain("JOIN pg_catalog.pg_roles r ON r.oid=m.member");
 expect(source).toContain("u.rolname<>'postgres' OR NOT m.admin_option OR m.inherit_option OR m.set_option");
 }
 expect(sources[2]).toContain("NOT a.is_grantable");
 expect(strings(nodes(native[2],"CreatePolicyStmt"))).not.toContain("service_role");
 });
 it("keeps all frozen artifacts, original bootstrap and manifest untouched",async()=>{
 await expect(verifyProvisionArtifacts()).resolves.toBeUndefined();
 });
});
