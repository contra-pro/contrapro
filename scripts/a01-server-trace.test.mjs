import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import trace from "./a01-server-trace.cjs";
import { verifyTrace } from "./a01-trace-evidence.mjs";
import { runA01 } from "./run-canonical-a01.mjs";

function instrument() {
  class Server extends EventEmitter {}
  const events = []; let diagnostic;
  const environment = { NODE_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: "https://gllsiklbvqpxzucvkehw.supabase.co",
    CONTRATPRO_APP_ORIGIN: "http://localhost:3000" };
  const http = { Server, request: () => {}, get: () => {} };
  const https = { request: () => {}, get: () => {} };
  const target = { fetch: async () => {} };
  trace.install({ environment, httpModule: http, httpsModule: https, target,
    subscribe: callback => { diagnostic = callback; }, sync: () => {}, write: event => events.push(event) });
  const server = new Server(); let outbound;
  server.on("request", (req, res) => {
    outbound?.();
    res.statusCode = req.method === "GET" ? 405 : req.headers.origin !== environment.CONTRATPRO_APP_ORIGIN ? 403 : req.body ? 400 : 503;
    res.emit("finish");
  });
  const request = async (url, init) => {
    const req = { method: init.method, url: new URL(url).pathname, body: init.body,
      headers: { ...Object.fromEntries(Object.entries(init.headers).map(([key, value]) => [key.toLowerCase(), value])), host: "localhost:3000" } };
    const res = new EventEmitter(); res.end = () => { res.closed = true; res.emit("finish"); };
    server.emit("request", req, res);
    const result = new Response(res.statusCode === 405 ? null : res.closed ? "" : JSON.stringify({ ok: false,
      code: ({ 503: "blocked", 400: "invalid", 403: "forbidden" })[res.statusCode] }),
    { status: res.statusCode, headers: { "content-type": "application/json" } });
    Object.defineProperty(result, "url", { value: url }); return result;
  };
  return { events, request, environment, setOutbound: action => { outbound = action; }, http, https, target, diagnostic: () => diagnostic() };
}
const options = { origin: "http://localhost:3000", traceDirectory: "offline-injected-trace" };
test("independent server monitor correlates all eight requests including automatic GET405", async () => {
  const fixture = instrument();
  const result = await runA01(options, { request: fixture.request, traceReader: async () => fixture.events });
  assert.equal(result.status, "CONDITIONAL_OPERATOR_EVIDENCE");
  assert.equal(result.observation.facts.noProvisioningRpc, true);
  assert.equal(result.activationAuthorized, false);
  assert.equal(fixture.events.length, 16);
  assert.equal(fixture.events.filter(event => event.kind === "start").length, 8);
});
for (const kind of ["fetch", "http", "https", "diagnostic"]) {
  test(`any outbound ${kind} attempt prevents confirmation`, async () => {
    const fixture = instrument();
    fixture.setOutbound(() => {
      if (kind === "fetch") void fixture.target.fetch("secret-marker");
      if (kind === "http") fixture.http.request("secret-marker");
      if (kind === "https") fixture.https.get("secret-marker");
      if (kind === "diagnostic") fixture.diagnostic();
    });
    const result = await runA01(options, { request: fixture.request, traceReader: async () => fixture.events });
    assert.equal(result.status, "UNVERIFIED"); assert.equal(result.noProvisioningRpc, "UNVERIFIED");
    assert.ok(fixture.events.some(event => event.kind === "outbound"));
    assert.ok(!JSON.stringify(fixture.events).includes("secret-marker"));
  });
}
test("unsafe effective gate stops at first request without changing environment", async () => {
  const fixture = instrument(); fixture.environment.CONTRATPRO_CANONICAL_PROVISIONING_VERIFIED = "true";
  const result = await runA01(options, { request: fixture.request, traceReader: async () => fixture.events });
  assert.equal(result.status, "BLOCKED"); assert.equal(fixture.events.length, 2);
  assert.equal(fixture.events[0].safe, false);
  assert.equal(fixture.environment.CONTRATPRO_CANONICAL_PROVISIONING_VERIFIED, "true");
});
test("missing, stale, duplicated, incomplete, cross-process and late-outbound evidence rejected", async () => {
  const fixture = instrument();
  const result = await runA01(options, { request: fixture.request, traceReader: async () => fixture.events });
  const window = result.window;
  const valid = fixture.events;
  for (const modified of [valid.slice(1), [...valid, valid[0]], valid.map(row => ({ ...row, run: "other-run" })),
    valid.map((row, index) => index === 0 ? { ...row, time: window.startedAt - 1 } : row),
    valid.map((row, index) => index === 1 ? { ...row, kind: "incomplete" } : row),
    valid.map((row, index) => index === 1 ? { ...row, boot: "other-process" } : row),
    [...valid, { ...valid[0], kind: "outbound", time: window.endedAt }]]) {
    assert.throws(() => verifyTrace(modified, window), /A01_TRACE_UNVERIFIED/);
  }
});
test("missing instrumentation cannot be replaced by HTTP results", async () => {
  const fixture = instrument();
  const result = await runA01(options, { request: fixture.request, traceReader: async () => [] });
  assert.equal(result.status, "UNVERIFIED");
});
test("lost context or preloaded child-process egress during the window is rejected", async () => {
  const fixture = instrument();
  const result = await runA01(options, { request: fixture.request, traceReader: async () => fixture.events });
  await fixture.target.fetch("secret-marker"); // deliberately outside request context
  const event = fixture.events.at(-1);
  assert.equal(event.kind, "unscoped-outbound");
  assert.ok(!JSON.stringify(event).includes("secret-marker"));
  assert.throws(() => verifyTrace([...fixture.events.slice(0, -1), { ...event, boot: "child-process", time: result.window.startedAt }], result.window), /A01_TRACE_UNVERIFIED/);
});
