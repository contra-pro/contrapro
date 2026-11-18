/** Inert evidence harness. No network/database/SDK imports or live execution mode. */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const projectRef = "gllsiklbvqpxzucvkehw";
const categories = ["A", "B", "C"];
const allowedSources = ["offline-fixture", "operator-live-development"];
const keysAre = (value, allowed) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).every(key => allowed.includes(key));
const invalid = () => { throw new Error("INVALID_ACCEPTANCE_EVIDENCE"); };

export async function loadPlan() {
  return JSON.parse(await readFile(new URL("../docs/canonical-acceptance/plan.json", import.meta.url), "utf8"));
}

/** Boolean observations are assertions supplied by the operator, not an attestation.
 * A digest/evidence-log reference stays in the operator's private review record.
 * Reject unknown fields so tokens, raw HTTP bodies, user IDs and errors are never
 * accepted as evidence. Never echo input or parser errors in a report.
 */
export function reviewEvidence(plan, evidence) {
  if (!keysAre(evidence, ["schemaVersion", "projectRef", "environment", "source", "authorizedCategories", "observations"])
    || evidence.schemaVersion !== 1 || evidence.projectRef !== projectRef || evidence.environment !== "development"
    || !allowedSources.includes(evidence.source) || !Array.isArray(evidence.authorizedCategories)
    || new Set(evidence.authorizedCategories).size !== evidence.authorizedCategories.length
    || evidence.authorizedCategories.some(category => !categories.includes(category))
    || !Array.isArray(evidence.observations) || evidence.observations.length > plan.cases.length) invalid();
  const seen = new Set();
  for (const observation of evidence.observations) {
    if (!keysAre(observation, ["id", "facts"])) invalid();
    const definition = plan.cases.find(item => item.id === observation.id);
    if (!definition || seen.has(observation.id) || !evidence.authorizedCategories.includes(definition.category)
      || !keysAre(observation.facts, definition.facts)
      || Object.values(observation.facts).some(value => typeof value !== "boolean")) invalid();
    seen.add(observation.id);
  }
  const results = plan.cases.map(definition => {
    const observation = evidence.observations.find(item => item.id === definition.id);
    const missing = definition.facts.filter(fact => observation?.facts[fact] === undefined);
    const failed = definition.facts.filter(fact => observation?.facts[fact] === false);
    const status = failed.length ? "FAIL" : missing.length ? "UNVERIFIED"
      : evidence.source === "offline-fixture" ? "OFFLINE_ONLY" : "PASS";
    return { id: definition.id, category: definition.category, status, missing, failed };
  });
  return {
    projectRef, environment: "development", evidenceSource: evidence.source,
    verdict: results.some(result => result.status === "FAIL") ? "BLOCKED"
      : results.every(result => result.status === "PASS") ? "CONDITIONAL_OPERATOR_EVIDENCE" : "UNVERIFIED",
    activationAuthorized: false, results,
  };
}

/** Optional future observer injection; no default adapter, dynamic adapter loading,
 * credentials, retries or SQL. One callback per case, with an abort deadline.
 * The trusted observer must honor cancellation and the documented request budget.
 * This guard does not itself authorize any external action.
 */
export async function collectCase(plan, id, observe, { authorization, timeoutMs = 5000 } = {}) {
  const definition = plan.cases.find(item => item.id === id);
  if (!definition || typeof observe !== "function" || !keysAre(authorization, ["projectRef", "environment", "category"])
    || authorization.projectRef !== projectRef || authorization.environment !== "development"
    || authorization.category !== definition.category || !Number.isSafeInteger(timeoutMs)
    || timeoutMs < 1 || timeoutMs > 10000) invalid();
  const controller = new AbortController();
  let timer;
  try {
    const facts = await Promise.race([
      Promise.resolve().then(() => observe({ id, signal: controller.signal, maxConcurrency: 2 })),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("ACCEPTANCE_OBSERVER_TIMEOUT")); }, timeoutMs); }),
    ]);
    // Require all facts before returning an observation, using the same validator.
    const result = reviewEvidence(plan, { schemaVersion: 1, projectRef, environment: "development", source: "offline-fixture",
      authorizedCategories: [definition.category], observations: [{ id, facts }] });
    if (result.results.find(item => item.id === id).missing.length) invalid();
    return { id, facts };
  } catch { throw new Error("ACCEPTANCE_OBSERVER_FAILED"); }
  finally { clearTimeout(timer); controller.abort(); }
}

async function main(args) {
  try {
    const plan = await loadPlan();
    if (args.length === 1 && args[0] === "--plan") {
      console.log(JSON.stringify({ ...plan, liveExecution: false, activationAuthorized: false }, null, 2));
      return;
    }
    if (args.length !== 2 || args[0] !== "--review") invalid();
    const bytes = await readFile(args[1]);
    if (bytes.length > 65536) invalid();
    const report = reviewEvidence(plan, JSON.parse(bytes.toString("utf8")));
    console.log(JSON.stringify(report, null, 2));
    if (report.verdict !== "CONDITIONAL_OPERATOR_EVIDENCE") process.exitCode = 1;
  } catch { console.error("BLOCKED: invalid or unreadable acceptance evidence; raw input suppressed"); process.exitCode = 1; }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main(process.argv.slice(2));
