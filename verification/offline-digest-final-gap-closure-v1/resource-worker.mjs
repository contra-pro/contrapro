// One fixed bounded probe per process, gated by parent stdin after Job assignment.
// ASCII workload encoder only; not a general/native production digest implementation.
import fs from 'node:fs';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { performance } from 'node:perf_hooks';
const rl = readline.createInterface({ input: process.stdin });
const line = await new Promise(resolve => rl.once('line', resolve)); rl.close();
const probe = JSON.parse(line), spec = JSON.parse(fs.readFileSync(new URL('../offline-digest-preimplementation-v1/schemas-and-registry.proposed.json', import.meta.url)));
const b = spec.budgets, domains = spec.domains, witness = new URL('resource-witness.bin', import.meta.url);
let hashCalls = 0, nodes = 0, maxDepth = 0, lastAttempt = 0;
const start = performance.now();
const invalid = () => { throw Error('invalid-input'); };
function encoded(value, cap = b.snapshotBytes) {
  const pieces = []; let bytes = 0;
  const append = text => { const size = Buffer.byteLength(text); lastAttempt = bytes + size; if (lastAttempt > cap) invalid(); pieces.push(text); bytes += size; };
  function visit(v, depth) {
    nodes++; maxDepth = Math.max(maxDepth, depth); if (nodes > b.nodes || depth > b.depth) invalid();
    if (v === null) { append('["null"]'); return; }
    if (typeof v === 'string') { if (Buffer.byteLength(v) > b.stringBytes || !/^[A-Za-z0-9-]*$/.test(v)) invalid(); append('["string",'); append(JSON.stringify(v)); append(']'); return; }
    if (typeof v === 'number' && Number.isFinite(v)) { const bits = Buffer.alloc(8); bits.writeDoubleBE(v); append('["binary64","' + bits.toString('hex') + '"]'); return; }
    if (typeof v === 'bigint') { const s = String(v); if (s.replace('-', '').length > b.bigintDigits) invalid(); append('["bigint",' + JSON.stringify(s) + ']'); return; }
    if (Array.isArray(v)) { if (v.length > b.entries) invalid(); append('["array",['); for (let i = 0; i < v.length; i++) { if (i) append(','); visit(v[i], depth + 1); } append(']]'); return; }
    if (v && typeof v === 'object') { const keys = Object.keys(v).sort(); if (keys.length > b.members) invalid(); append('["object",['); for (let i = 0; i < keys.length; i++) { const key = keys[i]; if (Buffer.byteLength(key) > b.keyBytes || !/^[A-Za-z0-9]+$/.test(key)) invalid(); if (i) append(','); append('[' + JSON.stringify(key) + ','); visit(v[key], depth + 1); append(']'); } append(']]'); return; }
    invalid();
  }
  visit(value, 1); return Buffer.from(pieces.join(''), 'utf8');
}
function exactArrayBytes(size) {
  const count = 4, total = size - 11 - 14 * count;
  const items = []; let remaining = total;
  for (let i = 0; i < count; i++) { const n = Math.min(b.stringBytes, remaining); items.push('x'.repeat(n)); remaining -= n; }
  if (remaining !== 0) invalid(); return items;
}
function nodeTree(target) {
  const branches = 50, leaves = target - branches - 1, items = []; let remaining = leaves;
  for (let i = 0; i < branches; i++) { const amount = Math.min(1000, remaining); items.push(Array(amount).fill(null)); remaining -= amount; }
  return items;
}
function header(tag, len) { const t = Buffer.from(tag), a = Buffer.alloc(4), c = Buffer.alloc(8); a.writeUInt32BE(t.length); c.writeBigUInt64BE(BigInt(len)); return Buffer.concat([Buffer.from('CONTRATPRO-DIGEST\0'), a, t, c]); }
try {
  const n = probe.value, metric = probe.metric;
  const parts = []; let charged = 0;
  if (metric === 'pdfBytes' || metric === 'assetBytes') {
    const payload = Buffer.alloc(n, 0x61); charged = payload.length;
    if (payload.length > b[metric]) invalid();
    parts.push({ name: metric, domain: metric === 'pdfBytes' ? domains.pdf : domains.asset, payload });
  } else if (metric === 'assets') {
    const assets = Array.from({ length: n }, () => Buffer.alloc(1, 0x61));
    if (assets.length > b.assets) invalid();
    for (let i = 0; i < assets.length; i++) parts.push({ name: 'asset-' + i, domain: domains.asset, payload: assets[i] });
    charged = assets.length;
  } else if (metric === 'packageBytes') {
    const canonical = [encoded(exactArrayBytes(b.snapshotBytes)), encoded(exactArrayBytes(b.coreBytes), b.coreBytes), encoded(exactArrayBytes(b.coreBytes), b.coreBytes), encoded(exactArrayBytes(b.coreBytes), b.coreBytes)];
    const names = ['snapshot', 'assets', 'party', 'root'];
    canonical.forEach((payload, i) => parts.push({ name: names[i], domain: domains[names[i]], payload }));
    const pdf = Buffer.alloc(b.pdfBytes, 0x61); parts.push({ name: 'pdf', domain: domains.pdf, payload: pdf });
    let rest = n - canonical.reduce((s, x) => s + x.length, 0) - pdf.length, index = 0;
    while (rest > 0) { const amount = Math.min(b.assetBytes, rest); parts.push({ name: 'asset-' + index++, domain: domains.asset, payload: Buffer.alloc(amount, 0x61) }); rest -= amount; }
    charged = parts.reduce((s, x) => s + x.payload.length, 0);
    if (charged !== n || charged > b.packageBytes || index > b.assets) invalid();
  } else {
    let value;
    if (metric === 'snapshotBytes' || metric === 'coreBytes') value = exactArrayBytes(n);
    if (metric === 'depth') { value = null; for (let i = 1; i < n; i++) value = [value]; }
    if (metric === 'nodes') value = nodeTree(n);
    if (metric === 'contextNodes') value = nodeTree(n - 9);
    if (metric === 'members') value = Object.fromEntries(Array.from({ length: n }, (_, i) => ['k' + String(i).padStart(4, '0'), null]));
    if (metric === 'entries') value = Array(n).fill(null);
    if (metric === 'keyBytes') value = { ['k'.repeat(n)]: null };
    if (metric === 'stringBytes') value = 'x'.repeat(n);
    if (metric === 'bigintDigits') value = BigInt('9'.repeat(n));
    const payload = encoded(value, metric === 'coreBytes' ? b.coreBytes : b.snapshotBytes);
    if (metric === 'contextNodes') encoded({ schemaVersion: 1, mode: 'offline-synthetic', agencyId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', contractId: 'cccccccc-cccc-cccc-cccc-cccccccccccc', documentRevisionId: 'synthetic-edition-1', aggregateRevisionAtFinalization: 2, liveAggregateRevision: 3, capturedSettingsRevision: 0 }, b.coreBytes);
    if (['snapshotBytes', 'coreBytes'].includes(metric) && payload.length !== n) throw Error('Workload sizing error');
    charged = payload.length; parts.push({ name: metric, domain: domains.snapshot, payload });
  }
  const fd = fs.openSync(witness, 'w'), components = [];
  let offset = 0;
  try {
    for (const part of parts) {
      const prefix = header(part.domain, part.payload.length), hash = crypto.createHash('sha256');
      fs.writeSync(fd, prefix); fs.writeSync(fd, part.payload); hash.update(prefix).update(part.payload); hashCalls++;
      components.push({ name: part.name, domain: part.domain, payloadBytes: part.payload.length, frameBytes: prefix.length + part.payload.length, offset, digest: hash.digest('hex') }); offset += prefix.length + part.payload.length;
    }
  } finally { fs.closeSync(fd); }
  console.log(JSON.stringify({ metric, value: n, status: 'integrity-match-unverified', trust: 'unverified', canActivateSigned: false, chargedBytes: charged, nodes, maxDepth, hashCalls, witnessBytes: offset, components, workerWallMs: performance.now() - start }));
} catch (e) {
  if (e.message !== 'invalid-input') throw e;
  console.log(JSON.stringify({ metric: probe.metric, value: probe.value, status: 'invalid-input', trust: 'unverified', canActivateSigned: false, nodes, maxDepth, hashCalls, lastAttemptedCanonicalBytes: lastAttempt, partialSuccess: false, workerWallMs: performance.now() - start }));
}
