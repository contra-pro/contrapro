/** Explicit operator entry point only. Importing this module performs no I/O. */
import { request as httpRequest } from "node:http";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { createCategoryAObserver } from "./canonical-category-a-observer.mjs";
import { collectCase, loadPlan } from "./canonical-security-acceptance.mjs";
import { readTrace, verifyTrace } from "./a01-trace-evidence.mjs";

const projectRef = "gllsiklbvqpxzucvkehw";
const origins = ["http://localhost:3000", "http://127.0.0.1:3000"];
const fail = () => { throw new Error("A01_BLOCKED"); };

/** Direct loopback HTTP; no proxy, DNS, redirects, cookies, SDK or retries.
 * Node's http client has no ambient cookie jar or authentication refresh.
 */
export async function loopbackTransport(url, init) {
  const target = new URL(url);
  if (!origins.includes(target.origin) || !["/fr/auth/provision", "/ar/auth/provision"].includes(target.pathname)
    || target.search || target.hash || target.username || target.password || !["GET", "POST"].includes(init.method)
    || init.redirect !== "error" || init.credentials !== "omit" || !init.signal || init.signal.aborted
    || Object.keys(init.headers).some(key => !["Origin", "Content-Type", "X-Contratpro-A01-Run", "X-Contratpro-A01-Index"].includes(key))
    || (init.body !== undefined && init.body !== "{}")) fail();
  return await new Promise((resolveResponse, reject) => {
    const request = httpRequest({ hostname: "127.0.0.1", port: 3000, path: target.pathname,
      method: init.method, headers: { ...init.headers, Host: target.host }, signal: init.signal, agent: false }, response => {
      let size = 0; const chunks = [];
      response.on("data", chunk => {
        size += chunk.length;
        if (size > 4096) { request.destroy(); reject(new Error("A01_BLOCKED")); return; }
        chunks.push(chunk);
      });
      response.on("error", () => reject(new Error("A01_BLOCKED")));
      response.on("end", () => {
        try {
          const headers = new Headers();
          for (let index = 0; index < response.rawHeaders.length; index += 2) headers.append(response.rawHeaders[index], response.rawHeaders[index + 1]);
          const status = response.statusCode;
          const result = new Response([204, 205, 304].includes(status) ? null : Buffer.concat(chunks), { status, headers });
          Object.defineProperty(result, "url", { value: url });
          resolveResponse(result);
        } catch { reject(new Error("A01_BLOCKED")); }
      });
    });
    request.setTimeout(7000, () => request.destroy(new Error("A01_BLOCKED")));
    request.on("error", () => reject(new Error("A01_BLOCKED")));
    request.end(init.body);
  });
}

export function parseA01Args(args) {
  const required = ["--execute-a01", "--confirm-local-development", "--confirm-provisioning-off", "--confirm-reviewed-artifact", "--confirm-execute-denied"];
  const seen = new Set(); let origin; let traceDirectory;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (seen.has(arg)) fail(); seen.add(arg);
    if (arg === "--origin" || arg === "--trace-dir") {
      const value = args[++index]; if (!value || value.startsWith("--")) fail();
      if (arg === "--origin") origin = value; else traceDirectory = value;
    } else if (!required.includes(arg)) fail();
  }
  if (!required.every(arg => seen.has(arg)) || !origins.includes(origin)) fail();
  return { origin, traceDirectory };
}

export async function runA01(options, { request = loopbackTransport, traceReader = readTrace, evidence } = {}) {
  if (!origins.includes(options.origin)) fail();
  // Legacy boolean assertions cannot independently prove this execution window.
  if (evidence !== undefined) fail();
  const run = randomUUID(); const startedAt = Date.now(); let count = 0;
  let httpChecksPassed = false;
  const observer = createCategoryAObserver({ projectRef, projectUrl: `https://${projectRef}.supabase.co`,
    environment: "development", appOrigin: options.origin, provisioningEnabled: false,
    authenticatedExecuteDenied: true, operatorTargetConfirmed: true, artifactContractVerified: true }, {
    request: (url, init) => request(url, { ...init, headers: { ...init.headers,
      ...(options.traceDirectory ? { "X-Contratpro-A01-Run": run, "X-Contratpro-A01-Index": String(++count) } : {}) } }),
    confirmEvidence: async () => {
      httpChecksPassed = true;
      if (!options.traceDirectory) return {};
      const events = await traceReader(options.traceDirectory);
      return verifyTrace(events, { run, startedAt, endedAt: Date.now() });
    },
  });
  try {
    const observation = await collectCase(await loadPlan(), "A01", observer, {
      authorization: { projectRef, environment: "development", category: "A" }, timeoutMs: 10000,
    });
    return { case: "A01", status: "CONDITIONAL_OPERATOR_EVIDENCE", observation,
      window: { run, startedAt, endedAt: Date.now() }, activationAuthorized: false };
  } catch {
    return { case: "A01", status: httpChecksPassed ? "UNVERIFIED" : "BLOCKED", httpChecks: httpChecksPassed ? "PASS" : "BLOCKED",
      noProvisioningRpc: "UNVERIFIED", activationAuthorized: false };
  }
}

async function main(args) {
  try {
    const options = parseA01Args(args);
    const report = await runA01(options);
    console.log(JSON.stringify(report));
    if (report.status !== "CONDITIONAL_OPERATOR_EVIDENCE") process.exitCode = 1;
  } catch { console.error("A01_BLOCKED: prerequisites or checks failed; details suppressed"); process.exitCode = 1; }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main(process.argv.slice(2));
