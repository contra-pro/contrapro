// Verify the production server, not next dev. No database or external services required.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const port = 3217;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: fileURLToPath(new URL("../apps/web/", import.meta.url)),
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
server.stdout.on("data", (chunk) => { output += chunk; });
server.stderr.on("data", (chunk) => { output += chunk; });
server.on("error", (error) => { output += error.message; });

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error(`Production server exited: ${output}`);
    try {
      const response = await fetch(base, { redirect: "manual", signal: AbortSignal.timeout(1000) });
      if (response.status === 307) { ready = true; break; }
    } catch { /* The server may still be starting. */ }
    await delay(250);
  }
  assert(ready, `Production server did not become ready: ${output}`);
  const entry = await fetch(base, { redirect: "manual" });
  assert.equal(entry.status, 307);
  assert.equal(entry.headers.get("location"), "/fr/app");

  for (const locale of ["fr", "ar"]) {
    for (const area of ["app", "platform", "sign"]) {
      const path = `/${locale}/${area}`;
      const response = await fetch(`${base}${path}`);
      const html = await response.text();
      assert.equal(response.status, 200, path);
      assert.match(html, new RegExp(`<html[^>]*lang="${locale}"[^>]*dir="${locale === "ar" ? "rtl" : "ltr"}"`));
      assert(html.includes(locale === "fr" ? "sans authentification ni protection" : "دون مصادقة أو حماية"), path);
      assert.match(html, /<main[^>]*id="main"/);
      assert.match(response.headers.get("cache-control") ?? "", /no-store/);
      assert.equal(response.headers.get("x-frame-options"), "DENY");
      assert.equal(response.headers.get("referrer-policy"), "no-referrer");
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.equal(response.headers.get("x-powered-by"), null);
      console.log(`PASS ${path}: locale, development notice, landmarks and security headers`);
    }
  }
  for (const path of ["/en/app", "/FR/platform", "/fr/not-a-route"]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 404, path);
  }
  console.log("PASS root redirect and unsupported routes");
} catch (error) {
  console.error(output);
  throw error;
} finally {
  server.kill();
}
