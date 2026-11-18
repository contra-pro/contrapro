import type { ApplyConfig } from "../migrations/config.ts";
import { selects, target, roleNames, membershipEvidence, validateTarget, type ReadonlyClient } from "./bootstrap.ts";

export const authoritySelect = `SELECT d.datdba::bigint AS owner_oid, r.rolname AS owner_name,
 d.datdba=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname=current_user) AS executor_is_owner,
 has_database_privilege(current_user,d.oid,'CREATE') AS executor_create,
 has_database_privilege(current_user,d.oid,'CREATE WITH GRANT OPTION') AS executor_grant_option,
 has_database_privilege('contratpro_migration_owner',d.oid,'CREATE') AS owner_create,
 pg_has_role(current_user,'contratpro_migration_owner','SET') AS executor_set
 FROM pg_catalog.pg_database d JOIN pg_catalog.pg_roles r ON r.oid=d.datdba
 WHERE d.datname=current_database()`;
export const fixedSelects = Object.freeze({ identity: selects.identity, safeguards: selects.safeguards,
 existence: selects.existence, roles: selects.roles, memberships: selects.memberships,
 acl: selects.acl, history: selects.history, authority: authoritySelect });
type Status = "PASS" | "FAIL" | "INDETERMINATE";
type Stage = "CONFIGURATION" | "CONNECTION" | "TLS" | "BEGIN" | "SAFEGUARDS" | "IDENTITY"
 | "BASELINE" | "AUTHORITY" | "ROLLBACK" | "CLEANUP" | "PREPARATION" | "OUTPUT"
 | "CLI_ARGUMENTS" | "MANIFEST" | "CA_VALIDATION" | "DRIVER_INITIALIZATION";
export type AuthorityReason = "CHECK_FAILED" | "OPERATION_FAILED" | "INVALID_ARGUMENTS"
 | "CONFIGURATION_REJECTED" | "MANIFEST_REJECTED" | "CA_REJECTED" | "DRIVER_INITIALIZATION_FAILED";
export type AuthorityResult = {
 TARGET: Status; TLS: Status; BASELINE: Status; DATABASE_CREATE_DELEGATION: Status;
 MEMBERSHIP_AUTHORITY: Status; FINAL_VERDICT: Status;
 evidence: null | { databaseOwner: "postgres" | "supabase_admin" | "OTHER_ROLE"; ownerOid: number;
 executorIsOwner: boolean; executorCreate: boolean; executorGrantOption: boolean;
 migrationOwnerCreate: boolean; executorSet: boolean };
 diagnostic: { stage: Stage | null; reason: AuthorityReason | null;
 contact: "NOT_ESTABLISHED" | "ESTABLISHED" | "UNKNOWN";
 rollback: "NOT_ATTEMPTED" | "SUCCEEDED" | "FAILED"; cleanup: "NOT_ATTEMPTED" | "SUCCEEDED" | "FAILED" };
};
export function emptyAuthority(): AuthorityResult {
 return { TARGET: "INDETERMINATE", TLS: "INDETERMINATE", BASELINE: "INDETERMINATE",
 DATABASE_CREATE_DELEGATION: "INDETERMINATE", MEMBERSHIP_AUTHORITY: "INDETERMINATE",
 FINAL_VERDICT: "INDETERMINATE", evidence: null,
 diagnostic: { stage: null, reason: null, contact: "NOT_ESTABLISHED", rollback: "NOT_ATTEMPTED", cleanup: "NOT_ATTEMPTED" } };
}
export function failAuthority(result: AuthorityResult, stage: Stage, reason: AuthorityReason): void {
 if (result.diagnostic.stage === null) { result.diagnostic.stage = stage; result.diagnostic.reason = reason; }
 if (result.FINAL_VERDICT !== "FAIL") result.FINAL_VERDICT = "INDETERMINATE";
}
const duration = (value: unknown, ms: number) => typeof value === "string" && /^[1-9][0-9]*(ms|s)$/.test(value)
 && Number(value.replace(/(ms|s)$/, "")) * (value.endsWith("ms") ? 1 : 1000) === ms;

/** Offline injection seam. Production CLI supplies exactly one real client. */
export async function discoverAuthority(client: ReadonlyClient, config: ApplyConfig, result = emptyAuthority()): Promise<AuthorityResult> {
 let stage: Stage = "CONFIGURATION", attempted = false, broken = false, pid: unknown;
 const fail = () => { failAuthority(result, stage, "CHECK_FAILED"); throw new Error(); };
 const check = (valid: boolean) => { if (!valid) fail(); };
 const query = async (sql: string) => { if (broken) throw new Error(); const reply = await client.query(sql); if (broken) throw new Error(); return reply; };
 const one = async (sql: string) => { const rows = (await query(sql)).rows; check(rows.length === 1); return rows[0]!; };
 const identity = async () => {
  stage = "IDENTITY"; const r = await one(selects.identity);
  const valid = r.database === target.database && Number(r.database_oid) === target.oid
   && r.login === target.login && r.role === target.login && r.server_address === target.address
   && Number(r.server_port) === target.port && r.recovery === false && Number.isInteger(r.version)
   && Number(r.version) >= 170000 && Number(r.version) < 180000
   && Number.isSafeInteger(r.backend_pid) && (pid === undefined || pid === r.backend_pid);
  result.TARGET = valid ? "PASS" : "FAIL"; check(valid); pid = r.backend_pid;
 };
 const safeguards = async () => {
  stage = "SAFEGUARDS"; const r = await one(selects.safeguards);
  check(r.readonly === "on" && duration(r.statement,5000) && duration(r.lock,2000) && duration(r.idle,10000));
 };
 try {
  validateTarget(config);
  client.onError(() => { broken = true; failAuthority(result, stage, "OPERATION_FAILED"); });
  stage = "CONNECTION"; result.diagnostic.contact = "UNKNOWN";
  await client.connect(); result.diagnostic.contact = "ESTABLISHED";
  stage = "TLS"; result.TLS = client.tlsVerified() ? "PASS" : "FAIL"; check(result.TLS === "PASS");
  stage = "BEGIN"; attempted = true;
  check((await query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")).command === "BEGIN");
  stage = "SAFEGUARDS";
  for (const sql of ["SET LOCAL statement_timeout = '5000ms'", "SET LOCAL lock_timeout = '2000ms'",
   "SET LOCAL idle_in_transaction_session_timeout = '10000ms'", "SET LOCAL search_path = pg_catalog"]) await query(sql);
  await safeguards(); await identity();
  stage = "BASELINE";
  const exists = await one(selects.existence);
  const roles = (await query(selects.roles)).rows;
  const memberships = (await query(selects.memberships)).rows;
  const report = membershipEvidence(memberships);
  const history = (await query(selects.history)).rows;
  const acl = await one(selects.acl);
  const baseline = exists.schema_exists === true && exists.journal_exists === true && exists.foundation_absent === true
   && roles.length === 3 && roleNames.every(name => roles.filter(r => r.rolname === name).length === 1)
   && roles.every(r => ["rolcanlogin","rolsuper","rolcreatedb","rolcreaterole","rolinherit","rolreplication","rolbypassrls"]
    .every(k => r[k] === false) && r.rolconnlimit === -1 && r.no_expiry === true && r.no_config === true)
   && report.countStatus === "VALID" && report.totalMatchingCount === "3" && report.overflow === false
   && report.rows.length === 3 && new Set(report.rows.map(r => r.role)).size === 3
   && report.rows.every(r => r.direction === "INCOMING" && r.malformedFields.length === 0 && r.violations.length === 0)
   && history.length === 1 && history[0]!.id === "0000_roles.sql" && history[0]!.ordinal === 0
   && history[0]!.checksum === target.bootstrap && history[0]!.target_id === target.id
   && history[0]!.runner_version === 1 && history[0]!.applied_by === "postgres" && history[0]!.timestamp_valid === true
   && ["schema_acl","table_acl","column_acl","effective_boundary","no_owned_objects","no_direct_grants","global_defaults_unchanged"]
    .every(k => acl[k] === true);
  result.BASELINE = baseline ? "PASS" : "FAIL"; check(baseline);
  // ADMIN evidence is from the exact current provider-granted membership, not CREATEROLE/BYPASSRLS.
  result.MEMBERSHIP_AUTHORITY = "PASS";
  stage = "AUTHORITY"; const r = await one(authoritySelect);
  check(typeof r.owner_oid === "string" && /^[1-9][0-9]{0,9}$/.test(r.owner_oid) && Number(r.owner_oid) <= 4294967295
   && typeof r.owner_name === "string" && r.owner_name.length > 0
   && ["executor_is_owner","executor_create","executor_grant_option","owner_create","executor_set"].every(k => typeof r[k] === "boolean"));
  check(r.executor_is_owner === (r.owner_name === "postgres"));
  check(!(r.executor_is_owner === true && r.executor_grant_option !== true));
  check(r.owner_create === false && r.executor_set === false);
  result.evidence = {
   databaseOwner: r.owner_name === "postgres" || r.owner_name === "supabase_admin" ? r.owner_name : "OTHER_ROLE",
   ownerOid: Number(r.owner_oid), executorIsOwner: r.executor_is_owner as boolean,
   executorCreate: r.executor_create as boolean, executorGrantOption: r.executor_grant_option as boolean,
   migrationOwnerCreate: false, executorSet: false,
  };
  result.DATABASE_CREATE_DELEGATION = r.executor_grant_option === true ? "PASS" : "FAIL";
  await safeguards(); await identity(); stage = "TLS";
  result.TLS = client.tlsVerified() ? "PASS" : "FAIL"; check(result.TLS === "PASS");
 } catch { failAuthority(result, stage, "OPERATION_FAILED"); }
 finally {
  if (attempted) {
   stage = "ROLLBACK";
   try { check((await client.query("ROLLBACK")).command === "ROLLBACK"); result.diagnostic.rollback = "SUCCEEDED"; }
   catch { result.diagnostic.rollback = "FAILED"; failAuthority(result,"ROLLBACK","OPERATION_FAILED"); }
  }
  try { await client.end(); result.diagnostic.cleanup = "SUCCEEDED"; }
  catch { result.diagnostic.cleanup = "FAILED"; failAuthority(result,"CLEANUP","OPERATION_FAILED"); }
 }
 const facts = [result.TARGET,result.TLS,result.BASELINE,result.DATABASE_CREATE_DELEGATION,result.MEMBERSHIP_AUTHORITY];
 result.FINAL_VERDICT = facts.includes("FAIL") ? "FAIL" : result.diagnostic.stage === null && !broken && facts.every(s => s === "PASS")
  && result.diagnostic.rollback === "SUCCEEDED" && result.diagnostic.cleanup === "SUCCEEDED" ? "PASS" : "INDETERMINATE";
 return result;
}
