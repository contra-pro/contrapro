import type { ApplyConfig } from "../migrations/config.ts";
import { journalColumns, queries } from "../migrations/sql.ts";

export const target = Object.freeze({
  id: "gllsiklbvqpxzucvkehw", database: "postgres", oid: 5, login: "postgres",
  address: "2a05:d018:184f:1e01:cea0:7ef7:7fd2:c39e", port: 5432,
  plan: "981c55ac79a3a8bb975c50b726cd06e950af640dec156c5e2ccf7abbe8ddea01",
  bootstrap: "21151a1df3618242132084c03f86916280e6c1503e3303b60c87a411beb098b7",
});
export const roleNames = ["contratpro_migration_owner", "contratpro_runtime", "contratpro_platform_runtime"] as const;
const names = "('contratpro_migration_owner','contratpro_runtime','contratpro_platform_runtime')";

// Fixed SELECT allowlist only; no caller-provided identifiers or SQL.
export const selects = Object.freeze({
  identity: queries.identity,
  safeguards: `SELECT current_setting('transaction_read_only') AS readonly,
    current_setting('statement_timeout') AS statement,
    current_setting('lock_timeout') AS lock,
    current_setting('idle_in_transaction_session_timeout') AS idle`,
  existence: `SELECT to_regnamespace('migration_control') IS NOT NULL AS schema_exists,
    to_regclass('migration_control.journal') IS NOT NULL AS journal_exists,
    NOT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname IN ('identity','tenancy','platform','app_private')) AS foundation_absent`,
  shape: queries.journalShape,
  details: `SELECT
    ARRAY(SELECT pg_get_expr(c.conbin,c.conrelid) FROM pg_catalog.pg_constraint c
      WHERE c.conrelid='migration_control.journal'::regclass AND c.contype='c' ORDER BY c.conname) AS checks,
    ARRAY(SELECT a.attname::text || ':' || pg_get_expr(d.adbin,d.adrelid)
      FROM pg_catalog.pg_attrdef d JOIN pg_catalog.pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum
      WHERE d.adrelid='migration_control.journal'::regclass ORDER BY a.attname) AS defaults,
    (SELECT count(*)::integer FROM pg_catalog.pg_constraint WHERE conrelid='migration_control.journal'::regclass) AS constraint_count,
    NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid='migration_control.journal'::regclass
      AND (NOT convalidated OR condeferrable)) AS constraints_valid,
    NOT EXISTS (SELECT 1 FROM pg_catalog.pg_rewrite WHERE ev_class='migration_control.journal'::regclass) AS no_rules,
    NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='migration_control' AND c.oid<>'migration_control.journal'::regclass
      AND c.relkind NOT IN ('i','t')) AS no_extra_relations`,
  history: `SELECT id, ordinal, checksum, target_id, runner_version, applied_by,
    applied_at IS NOT NULL AND applied_at <= clock_timestamp() AS timestamp_valid
    FROM migration_control.journal ORDER BY ordinal LIMIT 3`,
  roles: `SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolinherit,
    rolreplication, rolbypassrls, rolconnlimit, rolvaliduntil IS NULL AS no_expiry,
    rolconfig IS NULL AS no_config FROM pg_catalog.pg_roles
    WHERE rolname IN ${names} ORDER BY rolname LIMIT 4`,
  memberships: `SELECT granted.rolname AS role, member.rolname AS member, grantor.rolname AS grantor,
    m.admin_option, m.inherit_option, m.set_option, count(*) OVER ()::text AS total_matching_count,
    grantor.oid::bigint AS grantor_oid, grantor.oid=10 AS grantor_matches_snapshot_oid,
    grantor.oid=(SELECT r.oid FROM pg_catalog.pg_roles r WHERE r.rolname='supabase_admin') AS grantor_matches_current_admin,
    grantor.rolsuper AS grantor_superuser, grantor.rolcreaterole AS grantor_createrole,
    (SELECT count(*)::text FROM pg_catalog.pg_auth_members a
      WHERE a.roleid=m.roleid AND a.member=m.grantor AND a.admin_option) AS grantor_direct_admin_count,
    EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members a
      WHERE a.roleid=m.roleid AND a.member=m.grantor AND a.admin_option AND a.inherit_option) AS grantor_direct_admin_inherit,
    EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members a
      WHERE a.roleid=m.roleid AND a.member=m.grantor AND a.admin_option AND a.set_option) AS grantor_direct_admin_set
    FROM pg_catalog.pg_auth_members m
    JOIN pg_catalog.pg_roles granted ON granted.oid=m.roleid
    JOIN pg_catalog.pg_roles member ON member.oid=m.member
    JOIN pg_catalog.pg_roles grantor ON grantor.oid=m.grantor
    WHERE granted.rolname IN ${names} OR member.rolname IN ${names}
    ORDER BY granted.rolname, member.rolname, grantor.rolname LIMIT 17`,
  acl: `SELECT
    NOT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n, LATERAL aclexplode(COALESCE(n.nspacl, acldefault('n',n.nspowner))) a
      WHERE n.nspname='migration_control' AND (a.grantee<>n.nspowner OR a.grantor<>n.nspowner)) AS schema_acl,
    NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c, LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a
      WHERE c.oid='migration_control.journal'::regclass AND (a.grantee<>c.relowner OR a.grantor<>c.relowner)) AS table_acl,
    NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a, LATERAL aclexplode(a.attacl) x
      WHERE a.attrelid='migration_control.journal'::regclass AND a.attnum>0 AND NOT a.attisdropped) AS column_acl,
    NOT EXISTS (SELECT 1 FROM pg_catalog.pg_default_acl d WHERE d.defaclnamespace=0
      AND d.defaclrole='postgres'::regrole AND d.defaclobjtype='r') AS global_defaults_unchanged,
    NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles r WHERE r.rolname IN ${names} AND
      (has_database_privilege(r.oid,current_database(),'CREATE')
       OR has_schema_privilege(r.oid,'migration_control','USAGE,CREATE')
       OR has_schema_privilege(r.oid,'public','CREATE')
       OR has_table_privilege(r.oid,'migration_control.journal','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))) AS effective_boundary,
    NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles r WHERE r.rolname IN ${names} AND (
      EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n WHERE n.nspowner=r.oid)
      OR EXISTS (SELECT 1 FROM pg_catalog.pg_class c WHERE c.relowner=r.oid)
      OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p WHERE p.proowner=r.oid)
      OR EXISTS (SELECT 1 FROM pg_catalog.pg_database d WHERE d.datdba=r.oid)
      OR EXISTS (SELECT 1 FROM pg_catalog.pg_type t WHERE t.typowner=r.oid)
      OR EXISTS (SELECT 1 FROM pg_catalog.pg_default_acl d WHERE d.defaclrole=r.oid))) AS no_owned_objects,
    NOT EXISTS (
      SELECT 1 FROM (
        SELECT a.grantee FROM pg_catalog.pg_namespace n, LATERAL aclexplode(n.nspacl) a
        UNION ALL SELECT a.grantee FROM pg_catalog.pg_class c, LATERAL aclexplode(c.relacl) a
        UNION ALL SELECT a.grantee FROM pg_catalog.pg_attribute c, LATERAL aclexplode(c.attacl) a
        UNION ALL SELECT a.grantee FROM pg_catalog.pg_proc p, LATERAL aclexplode(p.proacl) a
        UNION ALL SELECT a.grantee FROM pg_catalog.pg_database d, LATERAL aclexplode(d.datacl) a
        UNION ALL SELECT a.grantee FROM pg_catalog.pg_type t, LATERAL aclexplode(t.typacl) a
        UNION ALL SELECT a.grantee FROM pg_catalog.pg_parameter_acl p, LATERAL aclexplode(p.paracl) a
        UNION ALL SELECT a.grantee FROM pg_catalog.pg_default_acl d, LATERAL aclexplode(d.defaclacl) a
      ) grants JOIN pg_catalog.pg_roles r ON r.oid=grants.grantee WHERE r.rolname IN ${names}
    ) AS no_direct_grants`,
});

export const stages = ["CLI_ARGUMENTS", "CONFIGURATION", "MANIFEST", "CA_VALIDATION", "DRIVER_INITIALIZATION",
  "CONNECTION", "TLS_INSPECTION", "TRANSACTION_BEGIN", "TRANSACTION_SAFEGUARDS", "TARGET_IDENTITY",
  "JOURNAL", "ROLE_ATTRIBUTES", "MEMBERSHIPS", "OWNERSHIP_AND_ACL", "ROLLBACK", "CLIENT_CLEANUP", "CLI_RUNTIME", "OUTPUT"] as const;
export type Stage = typeof stages[number];
export const reasons = ["NONE", "INVALID_ARGUMENTS", "CONFIGURATION_REJECTED", "MANIFEST_REJECTED", "CA_REJECTED",
  "DRIVER_INITIALIZATION_FAILED", "CONNECTION_FAILED", "TLS_CHECK_FAILED", "TRANSACTION_BEGIN_FAILED",
  "SAFEGUARD_FAILED", "QUERY_FAILED", "UNEXPECTED_RESULT", "VALIDATION_MISMATCH", "DEFAULT_PRIVILEGES_REVIEW",
  "ASYNC_CLIENT_ERROR", "ROLLBACK_FAILED", "CLEANUP_FAILED", "DNS_FAILURE", "NETWORK_FAILURE",
  "TLS_CERTIFICATE_FAILURE", "TLS_HOSTNAME_FAILURE", "AUTHENTICATION_FAILURE", "STARTUP_REJECTED",
  "CAPACITY_UNAVAILABLE", "TIMEOUT", "PERMISSION_DENIED", "QUERY_CANCELLED", "UNKNOWN",
  "UNEXPECTED_EXECUTION_FAILURE", "OUTPUT_FAILED"] as const;
export type Reason = typeof reasons[number];
export type Diagnostic = {
  failedStage: Stage | null; lastCompletedStage: Stage | null; reason: Reason;
  databaseContact: "ESTABLISHED" | "NOT_ESTABLISHED" | "UNKNOWN";
  readOnlyTransaction: "STARTED" | "NOT_STARTED" | "UNKNOWN";
  rollback: "SUCCEEDED" | "FAILED" | "NOT_ATTEMPTED" | "UNKNOWN";
  clientCleanup: "SUCCEEDED" | "FAILED" | "NOT_ATTEMPTED" | "UNKNOWN";
  secondaryFailures: { stage: Stage; reason: Reason }[];
};
type KnownIdentifier = typeof roleNames[number] | "postgres";
type IdentifierClass = KnownIdentifier | "OTHER_ROLE" | "MISSING_IDENTIFIER" | "MALFORMED_IDENTIFIER";
type MembershipField = "role" | "member" | "grantor" | "admin_option" | "inherit_option" | "set_option";
export type MembershipViolation = "ROLE_NOT_CONTRATPRO" | "MEMBER_NOT_POSTGRES" | "GRANTOR_NOT_APPROVED_ADMIN"
  | "GRANTOR_EVIDENCE_INVALID" | "GRANTOR_IDENTITY_MISMATCH" | "GRANTOR_SNAPSHOT_MISMATCH"
  | "GRANTOR_CAPABILITIES_INSUFFICIENT" | "UNEXPECTED_GRANTOR_ADMIN_MEMBERSHIP"
  | "ADMIN_NOT_TRUE" | "INHERIT_NOT_FALSE" | "SET_NOT_FALSE";
type GrantorField = "grantor_oid" | "grantor_matches_snapshot_oid" | "grantor_matches_current_admin"
  | "grantor_superuser" | "grantor_createrole" | "grantor_direct_admin_count"
  | "grantor_direct_admin_inherit" | "grantor_direct_admin_set";
export type GrantorEvidence = {
  oid: number | null;
  matchesSnapshotOid10: boolean | null;
  matchesCurrentNamedAdmin: boolean | null;
  superuser: boolean | null;
  createRole: boolean | null;
  directAdminOnGrantedRole: { count: string | null; inheritPresent: boolean | null; setPresent: boolean | null };
  malformedFields: GrantorField[];
  consistencyIssues: ("SNAPSHOT_OID_COMPARISON_MISMATCH" | "DIRECT_ADMIN_FLAGS_WITH_ZERO_COUNT")[];
};
/** Evidence, not an authorization decision. OID 10 is only the earlier snapshot's identifier. */
function grantorEvidence(row: unknown, get: (row: unknown, key: string) => unknown): GrantorEvidence {
  const malformedFields: GrantorField[] = [];
  const oidValue = get(row, "grantor_oid");
  const oidValid = typeof oidValue === "string" && /^[1-9][0-9]{0,9}$/.test(oidValue)
    && Number(oidValue) <= 4294967295;
  const oid = oidValid ? Number(oidValue) : null;
  if (!oidValid) malformedFields.push("grantor_oid");
  const boolean = (field: GrantorField, nullable = false): boolean | null => {
    const value = get(row, field);
    if (typeof value === "boolean") return value;
    if (!(nullable && value === null)) malformedFields.push(field);
    return null;
  };
  const matchesSnapshotOid10 = boolean("grantor_matches_snapshot_oid");
  // A null comparison is valid evidence that the current named administrative role was unavailable.
  const matchesCurrentNamedAdmin = boolean("grantor_matches_current_admin", true);
  const superuser = boolean("grantor_superuser");
  const createRole = boolean("grantor_createrole");
  const countValue = get(row, "grantor_direct_admin_count");
  const countValid = typeof countValue === "string" && /^(0|[1-9][0-9]{0,18})$/.test(countValue)
    && BigInt(countValue) <= 9223372036854775807n;
  const count = countValid ? countValue : null;
  if (!countValid) malformedFields.push("grantor_direct_admin_count");
  const inheritPresent = boolean("grantor_direct_admin_inherit");
  const setPresent = boolean("grantor_direct_admin_set");
  const consistencyIssues: GrantorEvidence["consistencyIssues"] = [];
  if (oid !== null && matchesSnapshotOid10 !== null && matchesSnapshotOid10 !== (oid === 10)) {
    consistencyIssues.push("SNAPSHOT_OID_COMPARISON_MISMATCH");
  }
  if (count === "0" && (inheritPresent === true || setPresent === true)) {
    consistencyIssues.push("DIRECT_ADMIN_FLAGS_WITH_ZERO_COUNT");
  }
  return { oid, matchesSnapshotOid10, matchesCurrentNamedAdmin, superuser, createRole,
    directAdminOnGrantedRole: { count, inheritPresent, setPresent }, malformedFields, consistencyIssues };
}
export type MembershipEvidence = {
  totalMatchingCount: string | null;
  countStatus: "VALID" | "MISSING_OR_MALFORMED" | "INCONSISTENT";
  overflow: boolean | null;
  inspectedRowCount: number;
  globalViolations: ("ROW_LIMIT_EXCEEDED" | "EXPECTED_MEMBERSHIP_COUNT_MISMATCH"
    | "DUPLICATE_ROLE_TARGET" | "MEMBERSHIP_COUNT_EVIDENCE_INVALID")[];
  rows: {
    role: IdentifierClass; member: IdentifierClass; grantor: IdentifierClass;
    direction: "INCOMING" | "OUTGOING" | "BOTH" | "UNDETERMINED";
    admin_option: boolean | null; inherit_option: boolean | null; set_option: boolean | null;
    malformedFields: MembershipField[]; violations: MembershipViolation[];
    grantorEvidence: GrantorEvidence;
  }[];
};
/** Sanitized projection only. Never retain arbitrary identifiers or raw row values. */
export function membershipEvidence(rows: readonly unknown[]): MembershipEvidence {
  const inspected = rows.slice(0, 17);
  const get = (row: unknown, key: string): unknown => {
    try { return typeof row === "object" && row !== null ? (row as Record<string, unknown>)[key] : undefined; }
    catch { return undefined; }
  };
  const knownRole = (value: unknown) => roleNames.some(name => name === value);
  const identifier = (value: unknown): IdentifierClass => {
    if (value === undefined) return "MISSING_IDENTIFIER";
    if (typeof value !== "string" || value.length === 0) return "MALFORMED_IDENTIFIER";
    if (value === "postgres" || knownRole(value)) return value as KnownIdentifier;
    return "OTHER_ROLE";
  };
  const validCount = (value: unknown): value is string => typeof value === "string"
    && /^(0|[1-9][0-9]{0,18})$/.test(value) && BigInt(value) <= 9223372036854775807n;
  const count = rows.length === 0 ? "0" : get(inspected[0], "total_matching_count");
  const countValid = validCount(count) && inspected.every(row => get(row, "total_matching_count") === count);
  const consistent = countValid && BigInt(count) >= BigInt(rows.length)
    && (rows.length >= 17 || BigInt(count) === BigInt(rows.length));
  const total = consistent ? count : null;
  return {
    totalMatchingCount: total,
    countStatus: !countValid ? "MISSING_OR_MALFORMED" : consistent ? "VALID" : "INCONSISTENT",
    overflow: rows.length > 16 ? true : total === null ? null : BigInt(total) > 16n,
    inspectedRowCount: inspected.length,
    globalViolations: rows.length > 16 ? ["ROW_LIMIT_EXCEEDED"] : [],
    rows: inspected.map(row => {
      const role = get(row, "role"), member = get(row, "member"), grantor = get(row, "grantor");
      const admin = get(row, "admin_option"), inherit = get(row, "inherit_option"), set = get(row, "set_option");
      const malformedFields: MembershipField[] = [];
      for (const field of ["role", "member", "grantor"] as const) {
        const value = get(row, field);
        if (typeof value !== "string" || value.length === 0) malformedFields.push(field);
      }
      for (const field of ["admin_option", "inherit_option", "set_option"] as const) {
        if (typeof get(row, field) !== "boolean") malformedFields.push(field);
      }
      const violations: MembershipViolation[] = [];
      if (!knownRole(role)) violations.push("ROLE_NOT_CONTRATPRO");
      if (member !== "postgres") violations.push("MEMBER_NOT_POSTGRES");
      const evidence = grantorEvidence(row, get);
      // P1.5P-approved provider identity plus current catalog correlation; neither name nor OID alone suffices.
      if (grantor !== "supabase_admin") violations.push("GRANTOR_NOT_APPROVED_ADMIN");
      if (evidence.malformedFields.length || evidence.consistencyIssues.length) violations.push("GRANTOR_EVIDENCE_INVALID");
      if (evidence.matchesCurrentNamedAdmin !== true) violations.push("GRANTOR_IDENTITY_MISMATCH");
      if (evidence.oid !== 10 || evidence.matchesSnapshotOid10 !== true) violations.push("GRANTOR_SNAPSHOT_MISMATCH");
      if (evidence.superuser !== true || evidence.createRole !== true) violations.push("GRANTOR_CAPABILITIES_INSUFFICIENT");
      // Any such direct grant would be an extra incoming member of the target role.
      if (evidence.directAdminOnGrantedRole.count !== "0" || evidence.directAdminOnGrantedRole.inheritPresent !== false
        || evidence.directAdminOnGrantedRole.setPresent !== false) violations.push("UNEXPECTED_GRANTOR_ADMIN_MEMBERSHIP");
      if (admin !== true) violations.push("ADMIN_NOT_TRUE");
      if (inherit !== false) violations.push("INHERIT_NOT_FALSE");
      if (set !== false) violations.push("SET_NOT_FALSE");
      return {
        role: identifier(role), member: identifier(member), grantor: identifier(grantor),
        direction: knownRole(role) ? knownRole(member) ? "BOTH" : "INCOMING" : knownRole(member) ? "OUTGOING" : "UNDETERMINED",
        admin_option: typeof admin === "boolean" ? admin : null,
        inherit_option: typeof inherit === "boolean" ? inherit : null,
        set_option: typeof set === "boolean" ? set : null,
        malformedFields, violations, grantorEvidence: evidence,
      };
    }),
  };
}
export type Status = "PASS" | "FAIL" | "INDETERMINATE";
export type Result = Record<"TARGET_IDENTITY" | "TLS_VERIFICATION" | "JOURNAL_STATE" |
  "ROLE_ATTRIBUTES" | "MEMBERSHIPS" | "OWNERSHIP_AND_ACL" | "FOUNDATION_MIGRATIONS_ABSENT" | "FINAL_VERDICT", Status> & { DIAGNOSTIC: Diagnostic; MEMBERSHIP_DIAGNOSTICS?: MembershipEvidence };
export const emptyResult = (): Result => ({
  TARGET_IDENTITY: "INDETERMINATE", TLS_VERIFICATION: "INDETERMINATE", JOURNAL_STATE: "INDETERMINATE",
  ROLE_ATTRIBUTES: "INDETERMINATE", MEMBERSHIPS: "INDETERMINATE", OWNERSHIP_AND_ACL: "INDETERMINATE",
  FOUNDATION_MIGRATIONS_ABSENT: "INDETERMINATE", FINAL_VERDICT: "INDETERMINATE",
  DIAGNOSTIC: { failedStage: null, lastCompletedStage: null, reason: "NONE", databaseContact: "NOT_ESTABLISHED",
    readOnlyTransaction: "NOT_STARTED", rollback: "NOT_ATTEMPTED", clientCleanup: "NOT_ATTEMPTED", secondaryFailures: [] },
});
// Only exact string codes are inspected; messages/stacks are never serialized.
export function classifyError(error: unknown, fallback: Reason): Reason {
  let code: unknown;
  try { code = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined; }
  catch { return fallback; }
  const codes: Readonly<Record<string, Reason>> = {
    ENOTFOUND: "DNS_FAILURE", EAI_AGAIN: "DNS_FAILURE",
    ECONNREFUSED: "NETWORK_FAILURE", ENETUNREACH: "NETWORK_FAILURE", EHOSTUNREACH: "NETWORK_FAILURE", ECONNRESET: "NETWORK_FAILURE",
    ETIMEDOUT: "TIMEOUT", ERR_TLS_CERT_ALTNAME_INVALID: "TLS_HOSTNAME_FAILURE",
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: "TLS_CERTIFICATE_FAILURE", SELF_SIGNED_CERT_IN_CHAIN: "TLS_CERTIFICATE_FAILURE",
    CERT_HAS_EXPIRED: "TLS_CERTIFICATE_FAILURE", DEPTH_ZERO_SELF_SIGNED_CERT: "TLS_CERTIFICATE_FAILURE",
    "28P01": "AUTHENTICATION_FAILURE", "28000": "AUTHENTICATION_FAILURE",
    "22023": "STARTUP_REJECTED", "0A000": "STARTUP_REJECTED", "53300": "CAPACITY_UNAVAILABLE", "57P03": "CAPACITY_UNAVAILABLE",
    "42501": "PERMISSION_DENIED", "57014": "QUERY_CANCELLED",
  };
  return typeof code === "string" && Object.hasOwn(codes, code) ? codes[code]! : fallback;
}
export function recordFailure(result: Result, stage: Stage, reason: Reason): void {
  const d = result.DIAGNOSTIC;
  if (d.failedStage === null) { d.failedStage = stage; d.reason = reason; }
  else if (!(d.failedStage === stage && d.reason === reason) && d.secondaryFailures.length < 2
    && !d.secondaryFailures.some(failure => failure.stage === stage && failure.reason === reason)) {
    d.secondaryFailures.push({ stage, reason });
  }
}
export interface ReadonlyClient {
  connect(): Promise<void>;
  query(sql: string): Promise<{ rows: Record<string, unknown>[]; command?: string }>;
  end(): Promise<void>;
  tlsVerified(): boolean;
  onError(handler: (error?: unknown) => void): void;
}
export function validateTarget(config: ApplyConfig): void {
  if (config.stage !== "bootstrap" || config.targetId !== target.id || config.database !== target.database
    || config.databaseOid !== target.oid || config.login !== target.login || config.journalOwner !== target.login
    || config.serverAddress !== target.address || config.serverPort !== target.port || config.planHash !== target.plan) {
    throw new Error("Configuration rejected");
  }
}
function milliseconds(value: unknown): number {
  if (typeof value !== "string" || !/^[1-9][0-9]*(ms|s)$/.test(value)) return NaN;
  return Number(value.replace(/(ms|s)$/, "")) * (value.endsWith("ms") ? 1 : 1000);
}

/** Injected transport only. No driver import, apply runner, retries, or arbitrary query API exposed to CLI. */
export async function verifyBootstrap(client: ReadonlyClient, config: ApplyConfig, result: Result = emptyResult()): Promise<Result> {
  const d = result.DIAGNOSTIC;
  let transactionAttempted = false;
  let transportFailed = false;
  let stage: Stage = "CONFIGURATION";
  let fallback: Reason = "CONFIGURATION_REJECTED";
  const enter = (next: Stage, reason: Reason) => { stage = next; fallback = reason; };
  const complete = () => { if (d.failedStage === null) d.lastCompletedStage = stage; };
  let pid: number | undefined;

  const query = async (sql: string) => {
    if (transportFailed) { fallback = "ASYNC_CLIENT_ERROR"; throw new Error(); }
    const reply = await client.query(sql);
    if (transportFailed) { fallback = "ASYNC_CLIENT_ERROR"; throw new Error(); }
    return reply;
  };
  const one = async (sql: string) => {
    const rows = (await query(sql)).rows;
    if (rows.length !== 1) { fallback = "UNEXPECTED_RESULT"; throw new Error(); }
    return rows[0]!;
  };
  const requireFact = (condition: boolean, key: Exclude<keyof Result, "DIAGNOSTIC" | "MEMBERSHIP_DIAGNOSTICS">, reason: Reason = "VALIDATION_MISMATCH") => {
    result[key] = condition ? "PASS" : "FAIL";
    if (!condition) { fallback = reason; throw new Error(); }
  };
  const identity = async () => {
    enter("TARGET_IDENTITY", "QUERY_FAILED");
    const row = await one(selects.identity);
    requireFact(row.database === target.database && Number(row.database_oid) === target.oid
      && row.login === target.login && row.role === target.login && row.server_address === target.address
      && Number(row.server_port) === target.port && row.recovery === false
      && Number.isInteger(row.version) && Number(row.version) >= 170000 && Number(row.version) < 180000
      && Number.isSafeInteger(row.backend_pid) && (pid === undefined || row.backend_pid === pid), "TARGET_IDENTITY");
    pid = Number(row.backend_pid);
    complete();
  };
  const safeguards = async () => {
    enter("TRANSACTION_SAFEGUARDS", "SAFEGUARD_FAILED");
    const row = await one(selects.safeguards);
    if (row.readonly !== "on" || milliseconds(row.statement) !== 5000
      || milliseconds(row.lock) !== 2000 || milliseconds(row.idle) !== 10000) throw new Error("Safeguard failure");
    complete();
  };
  try {
    client.onError(error => {
      transportFailed = true;
      recordFailure(result, stage, classifyError(error, "ASYNC_CLIENT_ERROR"));
    });
    validateTarget(config);
    if (d.lastCompletedStage === null) complete();
    enter("CONNECTION", "CONNECTION_FAILED");
    d.databaseContact = "UNKNOWN";
    await client.connect(); // Exactly one attempt.
    d.databaseContact = "ESTABLISHED";
    complete();
    enter("TLS_INSPECTION", "TLS_CHECK_FAILED");
    requireFact(client.tlsVerified(), "TLS_VERIFICATION", "TLS_CHECK_FAILED");
    complete();
    enter("TRANSACTION_BEGIN", "TRANSACTION_BEGIN_FAILED");
    d.readOnlyTransaction = "UNKNOWN";
    transactionAttempted = true; // Also rollback if BEGIN acknowledgement is lost.
    const begun = await query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    if (begun.command !== "BEGIN") throw new Error("Read-only transaction unconfirmed");
    d.readOnlyTransaction = "STARTED";
    complete();
    enter("TRANSACTION_SAFEGUARDS", "SAFEGUARD_FAILED");
    await query("SET LOCAL statement_timeout = '5000ms'");
    await query("SET LOCAL lock_timeout = '2000ms'");
    await query("SET LOCAL idle_in_transaction_session_timeout = '10000ms'");
    await query("SET LOCAL search_path = pg_catalog");
    await safeguards();
    await identity();
    enter("JOURNAL", "QUERY_FAILED");
    const exists = await one(selects.existence);
    requireFact(exists.schema_exists === true && exists.journal_exists === true, "JOURNAL_STATE");
    requireFact(exists.foundation_absent === true, "FOUNDATION_MIGRATIONS_ABSENT");
    enter("JOURNAL", "QUERY_FAILED");
    const shape = await one(selects.shape);
    requireFact(shape.schema_owner === "postgres" && shape.table_owner === "postgres" && shape.shape_safe === true
      && shape.primary_safe === true && shape.ordinal_safe === true && shape.marker === "contratpro migration journal v1"
      && JSON.stringify(shape.columns) === JSON.stringify(journalColumns), "JOURNAL_STATE");
    const details = await one(selects.details);
    const expectedChecks = ["ordinal>=0ANDordinal<=3", "checksum~'^[0-9a-f]{64}$'::text",
      "lengthtarget_id>=8ANDlengthtarget_id<=64", "runner_version=1"].sort();
    const checks = Array.isArray(details.checks) && details.checks.every(value => typeof value === "string")
      ? (details.checks as string[]).map(value => value.replace(/[()\s]/g, "")).sort() : [];
    requireFact(JSON.stringify(checks) === JSON.stringify(expectedChecks)
      && JSON.stringify(details.defaults) === JSON.stringify(["applied_at:clock_timestamp()", "applied_by:SESSION_USER"])
      && details.constraint_count === 6 && details.constraints_valid === true
      && details.no_rules === true && details.no_extra_relations === true, "JOURNAL_STATE");
    const rows = (await query(selects.history)).rows;
    requireFact(rows.length <= 1 && rows.every(row => row.id === "0000_roles.sql" && row.ordinal === 0), "FOUNDATION_MIGRATIONS_ABSENT");
    requireFact(rows.length === 1 && rows[0]!.id === "0000_roles.sql" && rows[0]!.ordinal === 0
      && rows[0]!.checksum === target.bootstrap && rows[0]!.target_id === target.id
      && rows[0]!.runner_version === 1 && rows[0]!.applied_by === "postgres"
      && rows[0]!.timestamp_valid === true, "JOURNAL_STATE");
    complete();
    enter("ROLE_ATTRIBUTES", "QUERY_FAILED");
    const roles = (await query(selects.roles)).rows;
    requireFact(roles.length === 3 && JSON.stringify(roles.map(r => r.rolname).sort()) === JSON.stringify([...roleNames].sort())
      && roles.every(r => ["rolcanlogin","rolsuper","rolcreatedb","rolcreaterole","rolinherit","rolreplication","rolbypassrls"]
        .every(key => r[key] === false) && r.rolconnlimit === -1 && r.no_expiry === true && r.no_config === true), "ROLE_ATTRIBUTES");
    complete();
    enter("MEMBERSHIPS", "QUERY_FAILED");
    const memberships = (await query(selects.memberships)).rows;
    const report = membershipEvidence(memberships);
    result.MEMBERSHIP_DIAGNOSTICS = report;
    // Approved bootstrap snapshot: one incoming administrative grant per restricted role, no extras.
    if (report.countStatus !== "VALID") report.globalViolations.push("MEMBERSHIP_COUNT_EVIDENCE_INVALID");
    if (memberships.length !== 3 || report.totalMatchingCount !== "3") report.globalViolations.push("EXPECTED_MEMBERSHIP_COUNT_MISMATCH");
    if (new Set(report.rows.map(row => row.role)).size !== report.rows.length) report.globalViolations.push("DUPLICATE_ROLE_TARGET");
    requireFact(report.overflow === false && report.inspectedRowCount === 3 && report.globalViolations.length === 0
      && report.rows.every(row => row.direction === "INCOMING" && row.malformedFields.length === 0
        && row.violations.length === 0), "MEMBERSHIPS");
    delete result.MEMBERSHIP_DIAGNOSTICS; // Report evidence only on membership failure.
    complete();
    enter("OWNERSHIP_AND_ACL", "QUERY_FAILED");
    const acl = await one(selects.acl);
    requireFact(["schema_acl","table_acl","column_acl","effective_boundary","no_owned_objects","no_direct_grants"]
      .every(key => acl[key] === true), "OWNERSHIP_AND_ACL");
    // Changed global defaults need review even if this journal's current ACL remains narrow.
    if (acl.global_defaults_unchanged !== true) {
      result.OWNERSHIP_AND_ACL = "INDETERMINATE";
      fallback = "DEFAULT_PRIVILEGES_REVIEW";
      throw new Error();
    }
    complete();
    await safeguards();
    await identity();
    enter("TLS_INSPECTION", "TLS_CHECK_FAILED");
    requireFact(client.tlsVerified(), "TLS_VERIFICATION", "TLS_CHECK_FAILED");
    complete();
    if (transportFailed) { fallback = "ASYNC_CLIENT_ERROR"; throw new Error(); }
  } catch (error) {
    recordFailure(result, stage, classifyError(error, fallback));
  } finally {
    if (transactionAttempted) {
      enter("ROLLBACK", "ROLLBACK_FAILED");
      try {
        // Deliberately bypass the transport flag to attempt rollback even after an asynchronous error.
        d.rollback = "UNKNOWN";
        const reply = await client.query("ROLLBACK");
        if (reply.command !== "ROLLBACK") throw new Error("Rollback unconfirmed");
        d.rollback = "SUCCEEDED";
        if (d.failedStage === null) d.lastCompletedStage = "ROLLBACK";
      } catch { transportFailed = true; d.rollback = "FAILED"; recordFailure(result, "ROLLBACK", "ROLLBACK_FAILED"); }
    }
    enter("CLIENT_CLEANUP", "CLEANUP_FAILED");
    try {
      d.clientCleanup = "UNKNOWN";
      await client.end();
      d.clientCleanup = "SUCCEEDED";
      if (d.failedStage === null) d.lastCompletedStage = "CLIENT_CLEANUP";
    }
    catch { transportFailed = true; d.clientCleanup = "FAILED"; recordFailure(result, "CLIENT_CLEANUP", "CLEANUP_FAILED"); }
  }
  const checks = Object.entries(result).filter(([key]) => key !== "FINAL_VERDICT" && key !== "DIAGNOSTIC" && key !== "MEMBERSHIP_DIAGNOSTICS").map(([, value]) => value);
  result.FINAL_VERDICT = checks.includes("FAIL") ? "FAIL"
    : d.failedStage === null && !transportFailed && checks.every(value => value === "PASS") ? "PASS" : "INDETERMINATE";
  return result;
}
