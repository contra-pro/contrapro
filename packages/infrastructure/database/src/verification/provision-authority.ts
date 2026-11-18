import type { ApplyConfig } from "../migrations/config.ts";
import { journalColumns, queries } from "../migrations/sql.ts";
import { selects, target, roleNames, membershipEvidence, validateTarget, type ReadonlyClient } from "./bootstrap.ts";
import { authoritySelect } from "./authority.ts";

export const grants = Object.freeze([
 "GRANT CREATE ON DATABASE postgres TO contratpro_migration_owner",
 "GRANT contratpro_migration_owner TO postgres WITH ADMIN FALSE, INHERIT FALSE, SET TRUE GRANTED BY postgres",
]);
export const provisioningSelects = Object.freeze({
 ...selects, authority: authoritySelect, boundary: queries.roleBoundary, foundationAuthority: queries.foundationAuthority,
 lock: "SELECT pg_try_advisory_xact_lock(1470359581, 1718059856) AS locked, pg_backend_pid() AS backend_pid, pg_current_xact_id()::text AS transaction_id",
 heldLock: `SELECT pg_backend_pid() AS backend_pid, pg_current_xact_id()::text AS transaction_id,
 EXISTS (SELECT 1 FROM pg_catalog.pg_locks WHERE locktype='advisory' AND pid=pg_backend_pid()
 AND database=(SELECT oid FROM pg_catalog.pg_database WHERE datname=current_database())
 AND classid=1470359581 AND objid=1718059856 AND objsubid=2 AND mode='ExclusiveLock' AND granted) AS locked`,
 ids: `SELECT rolname,oid::text AS oid FROM pg_catalog.pg_roles WHERE rolname IN
 ('postgres','contratpro_migration_owner','contratpro_runtime','contratpro_platform_runtime') ORDER BY rolname LIMIT 5`,
 databaseAcl: `SELECT a.grantor::text,a.grantee::text,a.privilege_type,a.is_grantable
 FROM pg_catalog.pg_database d,LATERAL aclexplode(COALESCE(d.datacl,acldefault('d',d.datdba))) a
 WHERE d.datname=current_database() ORDER BY a.grantor,a.grantee,a.privilege_type LIMIT 65`,
 journalAcl: `SELECT n.nspowner::text AS schema_owner,n.nspacl::text AS schema_acl,
 c.relowner::text AS table_owner,c.relacl::text AS table_acl,
 ARRAY(SELECT a.attname::text || ':' || COALESCE(a.attacl::text,'') FROM pg_catalog.pg_attribute a
 WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum) AS columns
 FROM pg_catalog.pg_namespace n JOIN pg_catalog.pg_class c ON c.relnamespace=n.oid
 WHERE n.nspname='migration_control' AND c.relname='journal'`,
 journalRows: `SELECT id,ordinal,checksum,target_id,runner_version,applied_by,applied_at::text AS applied_at
 FROM migration_control.journal ORDER BY ordinal LIMIT 5`,
 // Require no runtime direct grants at all, including grants outside the control schema.
 runtimeGrants: `SELECT NOT EXISTS (SELECT 1 FROM (
 SELECT a.grantee FROM pg_catalog.pg_namespace n,LATERAL aclexplode(n.nspacl) a
 UNION ALL SELECT a.grantee FROM pg_catalog.pg_class c,LATERAL aclexplode(c.relacl) a
 UNION ALL SELECT a.grantee FROM pg_catalog.pg_attribute c,LATERAL aclexplode(c.attacl) a
 UNION ALL SELECT a.grantee FROM pg_catalog.pg_proc p,LATERAL aclexplode(p.proacl) a
 UNION ALL SELECT a.grantee FROM pg_catalog.pg_database d,LATERAL aclexplode(d.datacl) a
 UNION ALL SELECT a.grantee FROM pg_catalog.pg_type t,LATERAL aclexplode(t.typacl) a
 UNION ALL SELECT a.grantee FROM pg_catalog.pg_parameter_acl p,LATERAL aclexplode(p.paracl) a
 UNION ALL SELECT a.grantee FROM pg_catalog.pg_default_acl d,LATERAL aclexplode(d.defaclacl) a
 ) x JOIN pg_catalog.pg_roles r ON r.oid=x.grantee
 WHERE r.rolname IN ('contratpro_runtime','contratpro_platform_runtime')) AS safe`,
});
type Stage = "PREPARATION" | "ARGUMENTS" | "DUPLICATE" | "CONNECTION" | "TLS" | "BEGIN"
 | "SAFEGUARDS" | "LOCK" | "PRECONDITIONS" | "GRANT_CREATE" | "GRANT_SET" | "POSTCONDITIONS" | "COMMIT" | "ROLLBACK" | "CLEANUP" | "OUTPUT";
export type ProvisionResult = {
 PRECONDITIONS: "PASS" | "INDETERMINATE"; POSTCONDITIONS: "PASS" | "INDETERMINATE";
 OUTCOME: "NOT_COMMITTED" | "COMMITTED" | "INDETERMINATE";
 FINAL_VERDICT: "PASS" | "FAIL" | "INDETERMINATE";
 diagnostic: {stage: Stage | null; reason: "REJECTED" | null; contact: "NOT_ESTABLISHED" | "UNKNOWN" | "ESTABLISHED";
 rollback: "NOT_ATTEMPTED" | "SUCCEEDED" | "FAILED"; cleanup: "NOT_ATTEMPTED" | "SUCCEEDED" | "FAILED"};
};
export function emptyProvision(): ProvisionResult {
 return {PRECONDITIONS:"INDETERMINATE",POSTCONDITIONS:"INDETERMINATE",OUTCOME:"NOT_COMMITTED",FINAL_VERDICT:"INDETERMINATE",
 diagnostic:{stage:null,reason:null,contact:"NOT_ESTABLISHED",rollback:"NOT_ATTEMPTED",cleanup:"NOT_ATTEMPTED"}};
}
export function rejectProvision(r: ProvisionResult,stage: Stage): void {
 if(r.diagnostic.stage===null){r.diagnostic.stage=stage;r.diagnostic.reason="REJECTED";}
 r.FINAL_VERDICT="INDETERMINATE";
}
const usedClients = new WeakSet<object>();
const canonical = (value: unknown) => JSON.stringify(value);
const sorted = (rows: readonly Record<string,unknown>[]) => rows.map(canonical).sort();
const oid = (value: unknown) => typeof value==="string" && /^(0|[1-9][0-9]{0,9})$/.test(value) && Number(value)<=4294967295;
const duration = (v:unknown,n:number) => typeof v==="string" && /^[1-9][0-9]*(ms|s)$/.test(v)
 && Number(v.replace(/(ms|s)$/,""))*(v.endsWith("ms")?1:1000)===n;

/** Fixed-purpose engine. No arbitrary statements, retry, migration dispatch or connection factory. */
export async function provisionAuthority(client: ReadonlyClient, config: ApplyConfig, result=emptyProvision()): Promise<ProvisionResult> {
 let stage:Stage="PREPARATION", attempted=false, commitAttempted=false, broken=false, pid:unknown, transactionId:string|undefined;
 const check=(ok:boolean)=>{if(!ok)throw new Error();};
 const query=async(sql:string)=>{
  check(!broken);const r=await client.query(sql);check(!broken);return r;
 };
 const one=async(sql:string)=>{const r=await query(sql);check(r.rows.length===1);return r.rows[0]!;};
 const identity=async()=>{
  const r=await one(selects.identity);
  check(r.database===target.database && Number(r.database_oid)===target.oid && r.login==="postgres" && r.role==="postgres"
   && r.server_address===target.address && Number(r.server_port)===target.port && r.recovery===false
   && Number.isInteger(r.version) && Number(r.version)>=170000 && Number(r.version)<180000
   && Number.isSafeInteger(r.backend_pid) && (pid===undefined || pid===r.backend_pid));
  pid=r.backend_pid;
 };
 const safeguards=async()=>{
  const r=await one(selects.safeguards);
  check(r.readonly==="off" && duration(r.statement,5000) && duration(r.lock,2000) && duration(r.idle,10000));
 };
 const heldLock=async()=>{
  const r=await one(provisioningSelects.heldLock);
  check(transactionId!==undefined && r.locked===true && r.backend_pid===pid && r.transaction_id===transactionId);
 };
 const snapshot=async(post:boolean)=>{
  await heldLock();
  await identity();await safeguards();check(client.tlsVerified());
  const exists=await one(selects.existence);
  check(exists.schema_exists===true && exists.journal_exists===true && exists.foundation_absent===true);
  const shape=await one(selects.shape);
  check(shape.schema_owner==="postgres" && shape.table_owner==="postgres" && shape.shape_safe===true && shape.primary_safe===true
   && shape.ordinal_safe===true && shape.marker==="contratpro migration journal v1" && canonical(shape.columns)===canonical(journalColumns));
  const details=await one(selects.details);
  const checks=Array.isArray(details.checks) && details.checks.every(v=>typeof v==="string")
   ? (details.checks as string[]).map(v=>v.replace(/[()\s]/g,"")).sort():[];
  check(canonical(checks)===canonical(["ordinal>=0ANDordinal<=3","checksum~'^[0-9a-f]{64}$'::text",
   "lengthtarget_id>=8ANDlengthtarget_id<=64","runner_version=1"].sort())
   && canonical(details.defaults)===canonical(["applied_at:clock_timestamp()","applied_by:SESSION_USER"])
   && details.constraint_count===6 && details.constraints_valid===true && details.no_rules===true && details.no_extra_relations===true);
  const history=(await query(selects.history)).rows;
  check(history.length===1 && history[0]!.id==="0000_roles.sql" && history[0]!.ordinal===0
   && history[0]!.checksum===target.bootstrap && history[0]!.target_id===target.id && history[0]!.runner_version===1
   && history[0]!.applied_by==="postgres" && history[0]!.timestamp_valid===true);
  const roles=(await query(selects.roles)).rows;
  check(roles.length===3 && roleNames.every(name=>roles.filter(r=>r.rolname===name).length===1)
   && roles.every(r=>["rolcanlogin","rolsuper","rolcreatedb","rolcreaterole","rolinherit","rolreplication","rolbypassrls"]
    .every(k=>r[k]===false) && r.rolconnlimit===-1 && r.no_expiry===true && r.no_config===true));
  const ids=(await query(provisioningSelects.ids)).rows;
  check(ids.length===4 && ["postgres",...roleNames].every(name=>ids.filter(r=>r.rolname===name && oid(r.oid) && r.oid!=="0").length===1)
   && new Set(ids.map(r=>r.oid)).size===4);
  const postgresOid=ids.find(r=>r.rolname==="postgres")!.oid;
  const ownerOid=ids.find(r=>r.rolname===roleNames[0])!.oid;
  const authority=await one(authoritySelect);
  check(authority.owner_name==="postgres" && authority.owner_oid===postgresOid && authority.executor_is_owner===true
   && authority.executor_create===true && authority.executor_grant_option===true
   && authority.owner_create===post && authority.executor_set===post);
  const memberships=(await query(selects.memberships)).rows;
  check(memberships.length===(post?4:3) && memberships.every(r=>r.total_matching_count===(post?"4":"3")));
  const added=memberships.filter(r=>r.role===roleNames[0] && r.member==="postgres" && r.grantor==="postgres");
  check(added.length===(post?1:0));
  if(post) check(added[0]!.admin_option===false && added[0]!.inherit_option===false && added[0]!.set_option===true
   && added[0]!.grantor_oid===postgresOid);
  const provider=memberships.filter(r=>!added.includes(r)).map(r=>({...r,total_matching_count:"3"}));
  const report=membershipEvidence(provider);
  check(report.countStatus==="VALID" && report.totalMatchingCount==="3" && report.rows.length===3 && report.overflow===false
   && new Set(report.rows.map(r=>r.role)).size===3
   && report.rows.every(r=>r.direction==="INCOMING" && r.malformedFields.length===0 && r.violations.length===0));
  const acl=await one(selects.acl);
  check(["schema_acl","table_acl","column_acl","no_owned_objects","global_defaults_unchanged"].every(k=>acl[k]===true)
   && acl.effective_boundary===!post && acl.no_direct_grants===!post);
  check((await one(queries.roleBoundary)).safe===true && (await one(provisioningSelects.runtimeGrants)).safe===true);
  const databaseAcl=(await query(provisioningSelects.databaseAcl)).rows;
  check(databaseAcl.length>0 && databaseAcl.length<=64 && databaseAcl.every(r=>oid(r.grantor) && oid(r.grantee)
   && ["CREATE","CONNECT","TEMPORARY"].includes(String(r.privilege_type)) && typeof r.is_grantable==="boolean"));
  const journalAcl=await one(provisioningSelects.journalAcl);
  check(journalAcl.schema_owner===postgresOid && journalAcl.table_owner===postgresOid && Array.isArray(journalAcl.columns) && journalAcl.columns.length===7
   && journalAcl.columns.every(v=>typeof v==="string" && v.length<1024)
   && [journalAcl.schema_acl,journalAcl.table_acl].every(v=>v===null || typeof v==="string" && v.length<=16384));
  const journalRows=(await query(provisioningSelects.journalRows)).rows;
  check(journalRows.length===1 && typeof journalRows[0]!.applied_at==="string" && journalRows[0]!.applied_at.length<=100);
  return {shape,details,history,roles,ids,authority,provider,databaseAcl,journalAcl,journalRows,ownerOid,postgresOid};
 };
 if(usedClients.has(client)){rejectProvision(result,"DUPLICATE");return result;}
 usedClients.add(client);
 try{
  validateTarget(config);
  client.onError(()=>{broken=true;rejectProvision(result,stage);});
  stage="CONNECTION";result.diagnostic.contact="UNKNOWN";await client.connect();result.diagnostic.contact="ESTABLISHED";
  stage="TLS";check(client.tlsVerified());await identity();
  stage="BEGIN";attempted=true;check((await query("BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED READ WRITE")).command==="BEGIN");
  stage="SAFEGUARDS";
  for(const sql of ["SET LOCAL statement_timeout = '5000ms'","SET LOCAL lock_timeout = '2000ms'",
   "SET LOCAL idle_in_transaction_session_timeout = '10000ms'","SET LOCAL search_path = pg_catalog"]) await query(sql);
  await safeguards();
  stage="LOCK";
  const lock=await one(provisioningSelects.lock);
  check(lock.locked===true && lock.backend_pid===pid && typeof lock.transaction_id==="string"
   && /^[1-9][0-9]{0,19}$/.test(lock.transaction_id) && BigInt(lock.transaction_id)<=18446744073709551615n);
  transactionId=lock.transaction_id as string;await heldLock();
  stage="PRECONDITIONS";const before=await snapshot(false);result.PRECONDITIONS="PASS";
  stage="GRANT_CREATE";await heldLock();check((await query(grants[0]!)).command==="GRANT");
  stage="GRANT_SET";await heldLock();check((await query(grants[1]!)).command==="GRANT");
  stage="POSTCONDITIONS";const after=await snapshot(true);
  for(const key of ["shape","details","history","roles","ids","provider","journalAcl","journalRows"] as const)
   check(canonical(before[key])===canonical(after[key]));
  check(canonical(sorted(after.databaseAcl))===canonical(sorted([...before.databaseAcl,{
   grantor:before.postgresOid,grantee:before.ownerOid,privilege_type:"CREATE",is_grantable:false}])));
  const authority=await one(queries.foundationAuthority);check(authority.owner_create===true && authority.owner_set===true);
  check((await one(queries.roleBoundary)).safe===true);await identity();await safeguards();check(client.tlsVerified() && !broken);
  await heldLock();
  result.POSTCONDITIONS="PASS";
  stage="COMMIT";commitAttempted=true;
  check((await query("COMMIT")).command==="COMMIT");result.OUTCOME="COMMITTED";
 }catch{
  rejectProvision(result,stage);
  if(commitAttempted)result.OUTCOME="INDETERMINATE";
  else result.FINAL_VERDICT="FAIL";
 }finally{
  if(attempted && !commitAttempted){
   try{check((await client.query("ROLLBACK")).command==="ROLLBACK");result.diagnostic.rollback="SUCCEEDED";}
   catch{result.diagnostic.rollback="FAILED";result.OUTCOME="INDETERMINATE";rejectProvision(result,"ROLLBACK");}
  }
  try{await client.end();result.diagnostic.cleanup="SUCCEEDED";}
  catch{result.diagnostic.cleanup="FAILED";rejectProvision(result,"CLEANUP");}
 }
 if(result.OUTCOME==="COMMITTED" && result.diagnostic.stage===null && !broken && result.diagnostic.cleanup==="SUCCEEDED")result.FINAL_VERDICT="PASS";
 return result;
}
