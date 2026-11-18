import test from "node:test";
import assert from "node:assert/strict";
import { parseA01Args, runA01, loopbackTransport } from "./run-canonical-a01.mjs";

const origin = "http://localhost:3000";
const args = ["--execute-a01", "--origin", origin, "--confirm-local-development", "--confirm-provisioning-off", "--confirm-reviewed-artifact", "--confirm-execute-denied"];
const evidence = { projectRef: "gllsiklbvqpxzucvkehw", appOrigin: origin, noProvisioningRpc: true };
function fixture() {
  const calls = [];
  return { calls, request: async (url, init) => {
    calls.push({ url, init });
    const status = init.method === "GET" ? 405 : init.headers.Origin !== origin ? 403 : init.body ? 400 : 503;
    const response = new Response(status === 405 ? null : JSON.stringify({ ok: false, code: ({ 403: "forbidden", 400: "invalid", 503: "blocked" })[status] }),
      { status, headers: { "content-type": "application/json" } });
    Object.defineProperty(response, "url", { value: url }); return response;
  } };
}
test("A01 command requires explicit confirmations and refuses A02 or target drift", () => {
  assert.equal(parseA01Args(args).origin, origin);
  for (const invalid of [[], args.slice(1), [...args, "--execute-a02"], [...args, "--execute-a01"],
    args.filter(arg => arg !== "--confirm-provisioning-off"), args.map(arg => arg === origin ? "https://production.example" : arg)]) {
    assert.throws(() => parseA01Args(invalid), /A01_BLOCKED/);
  }
});
test("eight HTTP checks never fabricate no-RPC evidence", async () => {
  const transport = fixture();
  const result = await runA01(parseA01Args(args), transport);
  assert.equal(transport.calls.length, 8); assert.equal(result.httpChecks, "PASS");
  assert.equal(result.status, "UNVERIFIED"); assert.equal(result.noProvisioningRpc, "UNVERIFIED");
});
test("legacy boolean assertion cannot confirm the new execution window", async () => {
  const transport = fixture();
  await assert.rejects(runA01(parseA01Args(args), { ...transport, evidence }), /A01_BLOCKED/);
  assert.equal(transport.calls.length, 0);
});
test("invalid or secret-bearing evidence fails before any request", async () => {
  for (const invalid of [{ ...evidence, token: "secret-marker" }, { ...evidence, appOrigin: "https://other.example" }, { ...evidence, noProvisioningRpc: false }]) {
    const transport = fixture();
    await assert.rejects(runA01({ origin }, { ...transport, evidence: invalid }), /^Error: A01_BLOCKED$/);
    assert.equal(transport.calls.length, 0);
  }
});
test("transport failure is sanitized and never retried", async () => {
  let count = 0;
  const result = await runA01({ origin }, { request: async () => { count++; throw Error("secret-marker"); } });
  assert.equal(count, 1); assert.equal(result.status, "BLOCKED");
  assert.ok(!JSON.stringify(result).includes("secret-marker"));
});
test("native transport rejects remote paths and credentials without opening sockets", async () => {
  const init = { method: "POST", headers: {}, redirect: "error", credentials: "omit", signal: new AbortController().signal };
  for (const url of ["https://production.example/fr/auth/provision", `${origin}/fr/auth/provision?q=1`, `${origin}/auth/v1/token`, "http://user:password@localhost:3000/fr/auth/provision"]) {
    await assert.rejects(loopbackTransport(url, init), /A01_BLOCKED/);
  }
  await assert.rejects(loopbackTransport(`${origin}/fr/auth/provision`, { ...init, headers: { Authorization: "secret-marker" } }), /A01_BLOCKED/);
});
