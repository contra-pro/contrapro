/** Development-only Node preload. No network, credentials, gates or app changes. */
/* eslint-disable @typescript-eslint/no-require-imports -- Node --require preloads must run synchronously as CommonJS. */
const http = require("node:http");
const https = require("node:https");
const { AsyncLocalStorage } = require("node:async_hooks");
const { randomUUID } = require("node:crypto");
const { appendFileSync, openSync, realpathSync } = require("node:fs");
const { resolve, dirname, basename, join, relative, isAbsolute } = require("node:path");
const { tmpdir } = require("node:os");
const { syncBuiltinESMExports } = require("node:module");
const { channel } = require("node:diagnostics_channel");

function install({ directory, environment = process.env, httpModule = http, httpsModule = https,
  target = globalThis, subscribe = listener => channel("undici:request:create").subscribe(listener),
  sync = syncBuiltinESMExports, write, clock = Date.now } = {}) {
  if (environment.NODE_ENV === "production") throw Error("A01_TRACE_BLOCKED");
  const scope = new AsyncLocalStorage(); const boot = randomUUID();
  if (!write) {
    const root = realpathSync(tmpdir()); const actual = realpathSync(directory);
    const child = relative(root, actual);
    if (!child || child.startsWith("..") || isAbsolute(child) || !/^contratpro-a01-[a-f0-9-]+$/.test(basename(actual))) throw Error("A01_TRACE_BLOCKED");
    const path = resolve(join(actual, `${process.pid}-${boot}.ndjson`));
    if (dirname(path) !== actual) throw Error("A01_TRACE_BLOCKED");
    const fd = openSync(path, "wx", 0o600);
    write = event => appendFileSync(fd, `${JSON.stringify(event)}\n`);
  }
  const emit = (kind, context, more = {}) => write({ kind, boot, run: context.run, index: context.index, time: clock(), ...more });
  const outbound = () => {
    const context = scope.getStore();
    if (context) emit("outbound", context);
    // Do not mistake lost async context, internal Next work or a preloaded child
    // process for absence of egress. These records are checked by wall-clock window.
    else write({ kind: "unscoped-outbound", boot, time: clock() });
  };
  // Observe attempts, even failures before dispatch; native undici diagnostics also
  // catch dispatch through clients that do not use the current global fetch.
  const originalFetch = target.fetch;
  target.fetch = function (...args) { outbound(); return originalFetch.apply(this, args); };
  for (const httpApi of [httpModule, httpsModule]) {
    for (const name of ["request", "get"]) {
      const original = httpApi[name];
      httpApi[name] = function (...args) { outbound(); return original.apply(this, args); };
    }
  }
  subscribe(outbound); sync();
  const originalEmit = httpModule.Server.prototype.emit;
  httpModule.Server.prototype.emit = function (event, request, response, ...rest) {
    if (event !== "request" || !/^\/(fr|ar)\/auth\/provision$/.test(request.url ?? "")) {
      return originalEmit.call(this, event, request, response, ...rest);
    }
    const run = request.headers["x-contratpro-a01-run"];
    const index = request.headers["x-contratpro-a01-index"];
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(run ?? "") || !/^[1-8]$/.test(index ?? "")) {
      return originalEmit.call(this, event, request, response, ...rest);
    }
    // Next loads local env after the preload. Check effective settings at EACH
    // incoming request; never set or override the provisioning/auth gates.
    const context = { run, index: Number(index) };
    const safe = environment.NODE_ENV === "development"
      && environment.NEXT_PUBLIC_SUPABASE_URL === "https://gllsiklbvqpxzucvkehw.supabase.co"
      && environment.CONTRATPRO_CANONICAL_PROVISIONING_VERIFIED !== "true"
      && ["localhost:3000", "127.0.0.1:3000"].includes(request.headers.host)
      && environment.CONTRATPRO_APP_ORIGIN === `http://${request.headers.host}`;
    return scope.run(context, () => {
      emit("start", context, { method: ["GET", "POST"].includes(request.method) ? request.method : "OTHER", path: request.url, safe });
      let finished = false;
      response.once("finish", () => { finished = true; emit("end", context, { status: response.statusCode }); });
      response.once("close", () => { if (!finished) emit("incomplete", context); });
      if (!safe) { response.statusCode = 503; response.end(); return true; }
      return originalEmit.call(this, event, request, response, ...rest);
    });
  };
}
module.exports = { install };
if (process.env.CONTRATPRO_A01_OBSERVE === "1") {
  try { install({ directory: process.env.CONTRATPRO_A01_TRACE_DIR }); }
  catch { throw Error("A01_TRACE_BLOCKED"); }
}
