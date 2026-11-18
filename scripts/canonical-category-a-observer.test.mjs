import test from "node:test";
import assert from "node:assert/strict";
import { createCategoryAObserver } from "./canonical-category-a-observer.mjs";
import { collectCase, loadPlan } from "./canonical-security-acceptance.mjs";

const projectRef = "gllsiklbvqpxzucvkehw";
const projectUrl = `https://${projectRef}.supabase.co`;
const timestamp = 1000000;
function config() {
  const sessions = Object.fromEntries(["A", "B", "U"].map((label, index) => {
    const subject = `10000000-0000-0000-0000-00000000000${index + 1}`;
    const claims = { sub: subject, iss: `${projectUrl}/auth/v1`, aud: "authenticated", role: "authenticated", is_anonymous: false, exp: 1120 };
    // Deliberately unsigned synthetic fixtures: never evidence of gateway verification.
    const accessToken = `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.synthetic`;
    return [label, { subject, accessToken, canonicalUserId: label === "U" ? null : `20000000-0000-0000-0000-00000000000${index + 1}`,
      projectRef, verifiedAt: timestamp, expiresAt: 1120000, isSynthetic: true, source: "operator-verified-existing-session" }];
  }));
  return { projectRef, projectUrl, environment: "development", appOrigin: "http://localhost:3000", provisioningEnabled: false,
    authenticatedExecuteDenied: true, operatorTargetConfirmed: true, artifactContractVerified: true, publicKey: "sb_publishable_synthetic", sessions };
}
function response(url, status, value, headers = {}) {
  const result = new Response(status === 405 ? null : JSON.stringify(value), { status, headers: { "content-type": "application/json", ...headers } });
  Object.defineProperty(result, "url", { value: url });
  return result;
}
function fixture(options = config(), overrides = {}) {
  const calls = [];
  const request = async (url, init) => {
    calls.push({ url, init });
    if (url.startsWith(options.appOrigin)) {
      const status = init.method === "GET" ? 405 : init.headers.Origin !== options.appOrigin ? 403 : init.body ? 400 : 503;
      return response(url, status, { ok: false, code: ({ 403: "forbidden", 400: "invalid", 503: "blocked" })[status] });
    }
    const session = Object.values(options.sessions).find(item => `Bearer ${item.accessToken}` === init.headers.Authorization);
    return response(url, 200, session.canonicalUserId ? [{ supabase_user_id: session.subject, user_id: session.canonicalUserId,
      user_state: "active", membership_id: null, agency_id: null, agency_name: null, membership_state: null, agency_state: null }] : []);
  };
  const observer = createCategoryAObserver(options, { request, now: () => timestamp,
    confirmEvidence: async ({ id }) => id === "A01" ? { noProvisioningRpc: true } : { noDataChanges: true }, ...overrides });
  return { observer, calls, request };
}
const run = (observer, id = "A01") => observer({ id, signal: new AbortController().signal });

test("A01 integrates with harness: eight credential-free FR/AR rejection requests", async () => {
  const { observer, calls } = fixture();
  const result = await collectCase(await loadPlan(), "A01", observer, { authorization: { projectRef, environment: "development", category: "A" }, timeoutMs: 10000 });
  assert.equal(result.facts.noProvisioningRpc, true);
  assert.equal(calls.length, 8);
  for (const { url, init } of calls) {
    assert.match(url, /^http:\/\/localhost:3000\/(fr|ar)\/auth\/provision$/);
    assert.equal(init.headers.Authorization, undefined);
    assert.equal(init.headers.Cookie, undefined);
    assert.equal(init.credentials, "omit"); assert.equal(init.redirect, "error");
    assert.equal(init.cache, "no-store"); assert.equal(init.signal.aborted, true);
  }
});
test("A02 uses exactly three fixed GET RPCs and independently confirmed observations", async () => {
  const { observer, calls } = fixture();
  const result = await collectCase(await loadPlan(), "A02", observer, { authorization: { projectRef, environment: "development", category: "A" }, timeoutMs: 10000 });
  assert.equal(result.facts.unmappedRemainsUnmapped, true);
  assert.equal(calls.length, 3);
  for (const { url, init } of calls) {
    assert.equal(url, `${projectUrl}/rest/v1/rpc/contratpro_auth_access`);
    assert.equal(init.method, "GET"); assert.equal(init.body, undefined);
    assert.equal(init.credentials, "omit"); assert.equal(init.redirect, "error");
  }
});
test("transport and evidence callback must be explicitly injected", () => {
  assert.throws(() => createCategoryAObserver(config()), /CATEGORY_A_BLOCKED/);
});
for (const [key, value] of Object.entries({ projectRef: "other", projectUrl: "https://production.example", environment: "production",
  appOrigin: "https://production.example", provisioningEnabled: true, authenticatedExecuteDenied: false,
  operatorTargetConfirmed: false, artifactContractVerified: false, unknown: true })) {
  test(`reject configuration drift: ${key}`, () => assert.throws(() => fixture({ ...config(), [key]: value }), /CATEGORY_A_BLOCKED/));
}
for (const [key, value] of Object.entries({ source: "unverified", verifiedAt: timestamp - 60001, expiresAt: timestamp,
  subject: "invalid", isSynthetic: false, accessToken: "secret-marker" })) {
  test(`missing/stale session evidence fails before requests: ${key}`, async () => {
    const options = config(); options.sessions.A[key] = value;
    const { observer, calls } = fixture(options);
    await assert.rejects(run(observer, "A02"), /^Error: CATEGORY_A_BLOCKED$/); assert.equal(calls.length, 0);
  });
}
for (const change of [{ role: "anon" }, { is_anonymous: true }, { iss: "https://other.example/auth/v1" }, { sub: "wrong" }]) {
  test(`JWT shape mismatch rejected: ${Object.keys(change)[0]}`, async () => {
    const options = config(); const session = options.sessions.A;
    const claims = JSON.parse(Buffer.from(session.accessToken.split(".")[1], "base64url"));
    session.accessToken = `header.${Buffer.from(JSON.stringify({ ...claims, ...change })).toString("base64url")}.synthetic`;
    const { observer, calls } = fixture(options);
    await assert.rejects(run(observer, "A02"), /CATEGORY_A_BLOCKED/); assert.equal(calls.length, 0);
  });
}
for (const headers of [{ location: "https://other.example" }, { "set-cookie": "secret-marker" }]) {
  test(`response header rejected: ${Object.keys(headers)[0]}`, async () => {
    let count = 0;
    const { observer } = fixture(config(), { request: async url => { count++; return response(url, 503, { ok: false, code: "blocked" }, headers); } });
    await assert.rejects(run(observer), /^Error: CATEGORY_A_BLOCKED$/); assert.equal(count, 1);
  });
}
for (const kind of ["redirected", "wrong-url", "401", "extra-fields", "oversized", "malformed"]) {
  test(`unexpected response fails closed without retry: ${kind}`, async () => {
    let count = 0;
    const { observer } = fixture(config(), { request: async url => {
      count++;
      if (kind === "malformed") return response(url, 503, "not an object");
      const result = response(kind === "wrong-url" ? "https://other.example" : url, kind === "401" ? 401 : 503,
        { ok: false, code: "blocked", ...(kind === "extra-fields" ? { error: "secret-marker" } : kind === "oversized" ? { error: "x".repeat(5000) } : {}) });
      if (kind === "redirected") Object.defineProperty(result, "redirected", { value: true });
      return result;
    } });
    await assert.rejects(run(observer), /^Error: CATEGORY_A_BLOCKED$/); assert.equal(count, 1);
  });
}
test("cross-subject, membership and unexpected unmapped rows cannot confirm A02", async () => {
  for (const kind of ["cross-user", "membership", "mapped-U"]) {
    const options = config(); const baseline = fixture(options); let count = 0;
    const { observer } = fixture(options, { request: async (url, init) => {
      count++; const result = await baseline.request(url, init); const rows = await result.json();
      if (kind === "cross-user" && count === 1) rows[0].supabase_user_id = options.sessions.B.subject;
      if (kind === "membership" && count === 1) rows[0].agency_id = options.sessions.B.subject;
      if (kind === "mapped-U" && count === 3) rows.push({});
      return response(url, 200, rows);
    } });
    await assert.rejects(run(observer, "A02"), /CATEGORY_A_BLOCKED/);
  }
});
test("HTTP results cannot substitute for independent evidence", async () => {
  for (const id of ["A01", "A02"]) {
    const { observer } = fixture(config(), { confirmEvidence: async () => ({}) });
    await assert.rejects(run(observer, id), /CATEGORY_A_BLOCKED/);
  }
});
test("observer snapshots target configuration and is single-use per case", async () => {
  const options = config(); const { observer, calls } = fixture(options);
  options.projectUrl = "https://other.example";
  await run(observer); await assert.rejects(run(observer), /CATEGORY_A_BLOCKED/);
  assert.equal(calls.length, 8);
});
test("abort bounds non-cooperative transport and suppresses details", async () => {
  const controller = new AbortController(); let requestSignal;
  const { observer } = fixture(config(), { request: async (_, init) => { requestSignal = init.signal; controller.abort(); return new Promise(() => {}); } });
  await assert.rejects(observer({ id: "A01", signal: controller.signal }), /^Error: CATEGORY_A_BLOCKED$/);
  assert.equal(requestSignal.aborted, true);
});
test("advancing clock stops A02 when existing session evidence expires", async () => {
  const options = config(); const baseline = fixture(options); let clock = timestamp;
  const { observer } = fixture(options, { now: () => clock, request: async (...args) => { const result = await baseline.request(...args); clock += 120000; return result; } });
  await assert.rejects(run(observer, "A02"), /CATEGORY_A_BLOCKED/); assert.equal(baseline.calls.length, 1);
});
