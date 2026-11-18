import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Static security-contract checks only: no SQL parser/server, subprocess or network.
const sql = await readFile(new URL("./inventory-a02-identities.sql", import.meta.url), "utf8");
const code = sql.replace(/^--.*$/gm, "");
test("inventory contains no writes, executable procedural bodies or RPCs", () => {
  assert.doesNotMatch(code, /\b(INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|GRANT|REVOKE|COPY|CALL|DO|EXECUTE|TRUNCATE)\b/i);
  assert.doesNotMatch(code, /contratpro_provision_identity|provisioning_subject|auth\.uid|\\!|\\i\b|\\o\b/i);
  assert.match(code, /BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;/);
  assert.match(code, /ROLLBACK;\s*\\echo INVENTORY_COMPLETE/);
});
test("bounded execution and fail-closed privileged visibility are required", () => {
  for (const safeguard of ["ON_ERROR_STOP on", "statement_timeout = '5000ms'", "lock_timeout = '2000ms'",
    "idle_in_transaction_session_timeout = '10000ms'", "rolsuper OR rolbypassrls", "session_user = 'postgres'",
    "current_database() = 'postgres'", "gllsiklbvqpxzucvkehw"]) assert.ok(code.includes(safeguard));
  assert.match(code, /\\if :inventory_guard_ok[\s\S]*ROLLBACK;\s*SELECT 1 \/ 0 AS inventory_blocked;/);
});
test("only three nominated UUIDs, safely quoted and validated before casts", () => {
  for (const name of ["candidate_a", "candidate_b", "candidate_u"]) {
    assert.ok(code.includes(`:'${name}' ~*`));
    assert.ok(code.includes(`:'${name}'::uuid`));
    assert.ok(!new RegExp(`:${name}\\b`).test(code));
  }
  assert.match(code, /lower\(:'candidate_a'\) <> lower\(:'candidate_b'\)/);
  assert.match(code, /lower\(:'candidate_a'\) <> lower\(:'candidate_u'\)/);
  assert.match(code, /lower\(:'candidate_b'\) <> lower\(:'candidate_u'\)/);
  assert.match(code, /ORDER BY label\s*LIMIT 3;/);
});
test("lookups are scoped to nominees, with every membership state included", () => {
  assert.match(code, /FROM nominated AS n\s*LEFT JOIN auth\.users AS a ON a\.id = n\.subject/);
  assert.match(code, /identity\.supabase_users AS link ON link\.supabase_user_id = n\.subject/);
  assert.match(code, /identity\.users AS u ON u\.id = link\.user_id/);
  assert.match(code, /EXISTS \(SELECT 1 FROM tenancy\.memberships AS m WHERE m\.user_id = link\.user_id\)/);
  assert.doesNotMatch(code, /m\.state\s*=/);
});
test("display excludes identifiers, personal fields and raw state values", () => {
  assert.doesNotMatch(code, /\b(email|phone|password|token|raw_user_meta_data|raw_app_meta_data|encrypted_password|name|address)\b/i);
  const display = code.slice(code.indexOf("SELECT label AS candidate"));
  assert.doesNotMatch(display, /SELECT\s+\*|AS\s+(subject|canonical_id|user_id)|SELECT\s+(subject|canonical_id|user_id)/i);
  assert.match(display, /canonical_id IS NOT NULL AS mapping_exists/);
  assert.match(display, /state = 'active' ELSE NULL END AS canonical_active/);
  assert.match(code, /SET LOCAL TIME ZONE 'UTC'/);
});
test("eligibility requires real Auth, valid active mappings, isolation and no memberships", () => {
  for (const classification of ["AUTH_NOT_FOUND", "UNMAPPED", "MAPPING_INVALID_FOR_COHORT", "MAPPED_WITH_MEMBERSHIPS",
    "MAPPED_ACTIVE_NO_MEMBERSHIPS", "MAPPED_INACTIVE_NO_MEMBERSHIPS"]) assert.ok(code.includes(classification));
  assert.match(code, /canonical_id IN \(SELECT subject FROM nominated\)/);
  assert.match(code, /bool_and\(eligible_for_nominated_role\)/);
  assert.match(code, /count\(DISTINCT canonical_id\) FILTER \(WHERE label IN \('A', 'B'\)\) = 2/);
});
