// Verification-only preload, inherited by build/test subprocesses. Never load dotenv.
const fs = require('node:fs');
const path = require('node:path');
const blocked = value => typeof value === 'string' && /^\.env(?:\.|$)/.test(path.basename(value));
for (const name of ['readFileSync', 'statSync']) {
  const original = fs[name];
  fs[name] = function (file, ...args) {
    if (blocked(file)) throw Object.assign(new Error('Credential files excluded from A6 verification'), { code: 'ENOENT' });
    return original.call(this, file, ...args);
  };
}
for (const name of ['readFile', 'stat']) {
  const original = fs.promises[name];
  fs.promises[name] = async function (file, ...args) {
    if (blocked(file)) throw Object.assign(new Error('Credential files excluded from A6 verification'), { code: 'ENOENT' });
    return original.call(this, file, ...args);
  };
}
for (const key of Object.keys(process.env)) {
  if (/^(CONTRATPRO_|SUPABASE_|NEXT_PUBLIC_SUPABASE_|RESEND_|GOOGLE_|STRIPE_)/.test(key)) delete process.env[key];
}
process.env.NEXT_TELEMETRY_DISABLED = '1';
if (process.env.A6_ISOLATION_DIAGNOSTICS === '1') {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = function (input, ...args) {
    const hostname = new URL(typeof input === 'string' || input instanceof URL ? input : input.url).hostname;
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(hostname)) {
      process.stderr.write(JSON.stringify({ isolationDiagnostic: 'fetch-initiator', hostname, stack: new Error('Fetch initiator').stack }) + '\n');
    }
    return originalFetch.call(this, input, ...args);
  };
  require('node:diagnostics_channel').channel('undici:request:create').subscribe(({ request }) => {
    const hostname = new URL(request.origin).hostname;
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(hostname)) {
      process.stderr.write(JSON.stringify({ isolationDiagnostic: 'external-request', hostname, stack: new Error('External request initiator').stack }) + '\n');
    }
  });
}
const net = require('node:net');
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const option = args[0];
  const host = typeof option === 'object' ? option.host : typeof args[1] === 'string' ? args[1] : undefined;
  if (host && !['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error('External network excluded from A6 verification');
  return connect.apply(this, args);
};
// Test-support code can demand evidence that this preload established isolation.
// No production route reads this marker; it grants no authentication authority.
Object.defineProperty(globalThis, Symbol.for('contratpro.isolated-verification'), {value:true,writable:false,configurable:false});
