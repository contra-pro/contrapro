import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadPlan, reviewEvidence, collectCase } from "./canonical-security-acceptance.mjs";

const plan = await loadPlan();
const fixtures = JSON.parse(await readFile(new URL("../docs/canonical-acceptance/fixtures.json", import.meta.url), "utf8"));
const complete = source => ({ schemaVersion: 1, projectRef: plan.projectRef, environment: "development", source,
  authorizedCategories: ["A", "B", "C"], observations: plan.cases.map(item => ({ id: item.id, facts: Object.fromEntries(item.facts.map(key => [key, true])) })) });
const auth = { projectRef: plan.projectRef, environment: "development", category: "A" };

test("partial fixture never passes live acceptance or authorizes activation", () => {
  const report = reviewEvidence(plan, fixtures);
  assert.equal(report.verdict, "UNVERIFIED"); assert.equal(report.activationAuthorized, false);
  assert.equal(report.results[0].status, "OFFLINE_ONLY");
  assert.ok(report.results.slice(1).every(item => item.status === "UNVERIFIED"));
});
test("even complete synthetic observations cannot become live PASS", () => {
  const report = reviewEvidence(plan, complete("offline-fixture"));
  assert.equal(report.verdict, "UNVERIFIED"); assert.ok(report.results.every(item => item.status === "OFFLINE_ONLY"));
});
test("complete operator assertions remain conditional and never authorize activation", () => {
  const report = reviewEvidence(plan, complete("operator-live-development"));
  assert.equal(report.verdict, "CONDITIONAL_OPERATOR_EVIDENCE"); assert.equal(report.activationAuthorized, false);
});
test("a failed isolation or orphan assertion blocks the report", () => {
  const evidence = complete("operator-live-development");
  evidence.observations.find(item => item.id === "C03").facts.candidateOrphanDeltaZero = false;
  const report = reviewEvidence(plan, evidence);
  assert.equal(report.verdict, "BLOCKED");
  assert.deepEqual(report.results.find(item => item.id === "C03").failed, ["candidateOrphanDeltaZero"]);
});
test("missing facts remain unverified", () => {
  const evidence = complete("operator-live-development"); delete evidence.observations[0].facts.noProvisioningRpc;
  assert.equal(reviewEvidence(plan, evidence).verdict, "UNVERIFIED");
});
for (const change of [{ environment: "production" }, { projectRef: "other-project" }, { source: "mock-live" }, { token: "PRIVATE" }]) {
  test(`refuses evidence outside the fixed contract: ${Object.keys(change)[0]}`, () => {
    assert.throws(() => reviewEvidence(plan, { ...fixtures, ...change }), /^Error: INVALID_ACCEPTANCE_EVIDENCE$/);
  });
}
test("rejects raw responses and identity fields instead of echoing sensitive input", () => {
  for (const facts of [{ ...fixtures.observations[0].facts, token: "PRIVATE" }, { noProvisioningRpc: "PRIVATE" }]) {
    assert.throws(() => reviewEvidence(plan, { ...fixtures, observations: [{ id: "A01", facts }] }), /^Error: INVALID_ACCEPTANCE_EVIDENCE$/);
  }
});
test("rejects duplicate and unauthorized-category observations", () => {
  assert.throws(() => reviewEvidence(plan, { ...fixtures, observations: [...fixtures.observations, ...fixtures.observations] }));
  const evidence = complete("offline-fixture"); evidence.authorizedCategories = ["A"];
  assert.throws(() => reviewEvidence(plan, evidence));
});
test("an injected observer is called once, without retries or live transports", async () => {
  let calls = 0;
  const result = await collectCase(plan, "A01", async ({ signal, maxConcurrency }) => {
    calls++; assert.equal(signal.aborted, false); assert.equal(maxConcurrency, 2); return fixtures.observations[0].facts;
  }, { authorization: auth });
  assert.equal(calls, 1); assert.equal(result.id, "A01");
});
test("wrong target/category or absent authorization cannot invoke an observer", async () => {
  let calls = 0; const observer = () => { calls++; };
  for (const authorization of [undefined, { ...auth, category: "B" }, { ...auth, environment: "production" }]) {
    await assert.rejects(collectCase(plan, "A01", observer, { authorization }));
  }
  assert.equal(calls, 0);
});
test("observer errors are sanitized and not retried", async () => {
  let calls = 0;
  await assert.rejects(collectCase(plan, "A01", () => { calls++; throw new Error("PRIVATE"); }, { authorization: auth }), /^Error: ACCEPTANCE_OBSERVER_FAILED$/);
  assert.equal(calls, 1);
});
test("observer deadline aborts without retries", async () => {
  let signal; let calls = 0;
  await assert.rejects(collectCase(plan, "A01", input => { signal = input.signal; calls++; return new Promise(() => {}); },
    { authorization: auth, timeoutMs: 5 }), /^Error: ACCEPTANCE_OBSERVER_FAILED$/);
  assert.equal(signal.aborted, true); assert.equal(calls, 1);
});
