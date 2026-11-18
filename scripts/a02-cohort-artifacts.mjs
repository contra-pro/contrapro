/** Offline rendering only. No CLI, database, credentials or automatic file writes. */
import { readFile } from "node:fs/promises";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = () => { throw Error("A02_ARTIFACT_BLOCKED"); };
export function validateCohort(input, now = Date.now()) {
  try { input=structuredClone(input); } catch { fail(); }
  if (!input || Object.keys(input).sort().join() !== "A,B,U,expiresAt,projectRef"
    || input.projectRef !== "gllsiklbvqpxzucvkehw" || ![input.A,input.B,input.U].every(value => uuid.test(value))
    || new Set([input.A,input.B,input.U].map(value => value.toLowerCase())).size !== 3
    || !Number.isSafeInteger(now) || typeof input.expiresAt !== "string"
    || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(input.expiresAt)) fail();
  const end = Date.parse(input.expiresAt);
  if (!Number.isSafeInteger(end) || end <= now || end-now > 900000) fail();
  return Object.freeze({ ...input, A:input.A.toLowerCase(), B:input.B.toLowerCase(), U:input.U.toLowerCase() });
}
export async function renderCohortArtifact(kind, input, { now = Date.now(), allowExpiredRemoval = false } = {}) {
  if (!["install","remove","disable"].includes(kind)) fail();
  // Removal must remain possible after expiry; validate original finite window's shape.
  const checked = validateCohort(input, kind !== "install" && allowExpiredRemoval ? Date.parse(input.expiresAt)-1 : now);
  let sql = await readFile(new URL(`../docs/canonical-acceptance/a02-temporary/${kind}.sql.in`, import.meta.url),"utf8");
  for (const name of ["A","B","U"]) sql=sql.replaceAll(`{{${name}}}`,checked[name]);
  sql=sql.replaceAll("{{EXPIRES}}",checked.expiresAt);
  if (/\{\{/.test(sql)) fail();
  return sql;
}
export async function renderCleanup(input) {
  try { input=structuredClone(input); } catch { fail(); }
  if (!input || Object.keys(input).sort().join() !== "authPresent,canonical,cohort,privilegedBypassApproved"
    || input.privilegedBypassApproved !== true) fail();
  const cohort=validateCohort(input.cohort,Date.parse(input.cohort?.expiresAt)-1);
  if (!input.canonical || Object.keys(input.canonical).sort().join()!=="A,B"
    || !input.authPresent || Object.keys(input.authPresent).sort().join()!=="A,B,U"
    || !Object.values(input.authPresent).every(value=>typeof value==="boolean")) fail();
  const ids=[cohort.A,cohort.B,cohort.U];
  for(const label of ["A","B"]) {
    const id=input.canonical[label];
    if(id!==null && (!uuid.test(id) || !input.authPresent[label])) fail();
    if(id!==null) ids.push(id.toLowerCase());
  }
  if(new Set(ids).size!==ids.length) fail();
  let sql=await readFile(new URL('../docs/canonical-acceptance/a02-temporary/cleanup.sql.in',import.meta.url),'utf8');
  for(const label of ["A","B","U"]) sql=sql.replaceAll(`{{${label}}}`,cohort[label]).replaceAll(`{{AUTH_${label}}}`,String(input.authPresent[label]));
  for(const label of ["A","B"]) sql=sql.replaceAll(`{{CANONICAL_${label}}}`,input.canonical[label]===null ? 'NULL::uuid' : `'${input.canonical[label].toLowerCase()}'::uuid`);
  sql=sql.replaceAll('{{EXPECTED}}',String(ids.length-3));
  if(/\{\{/.test(sql)) fail();
  return sql;
}
