// ISOLATED REFERENCE ORACLE ONLY. Fixed synthetic corpus; no exports/application imports.
// This is deliberately not installed, bundled, or usable as a production digest API.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const read = name => JSON.parse(fs.readFileSync(path.join(here, name), 'utf8'));
const spec = read('schemas-and-registry.proposed.json'), corpus = read('corpus-input.json');
const B = spec.budgets, D = spec.domains, P = Object.fromEntries(Object.entries(spec.profiles).map(([k, v]) => [k, v.id]));
const fail = code => { throw new Error(code); };
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const kats = [
  ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  ['abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'],
].map(([text, expected]) => ({ inputHex: Buffer.from(text).toString('hex'), expected, actual: sha(Buffer.from(text)) }));
if (kats.some(k => k.expected !== k.actual)) throw Error('Primitive known-answer disagreement');
function scalar(s) {
  if (typeof s !== 'string') fail('invalid-input');
  for (const c of s) if (c.codePointAt(0) >= 0xd800 && c.codePointAt(0) <= 0xdfff) fail('invalid-input');
  return s;
}
function quote(s) {
  scalar(s); let out = '"';
  for (const c of s) {
    const n = c.codePointAt(0);
    out += n < 32 ? '\\u' + n.toString(16).padStart(4, '0') : c === '"' ? '\\"' : c === '\\' ? '\\\\' : c;
  }
  return out + '"';
}
function compare(a, b) {
  const x = [...a].map(c => c.codePointAt(0)), y = [...b].map(c => c.codePointAt(0));
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
  return x.length - y.length;
}
function native(n) {
  switch (n.type) {
    case 'null': return null;
    case 'boolean': return n.value;
    case 'string': return n.value;
    case 'number': return Number(n.decimal);
    case 'bigint': return BigInt(n.decimal);
    case 'array': return n.elements.map(native);
    case 'object': return Object.fromEntries(n.entries.map(([k, v]) => [k, native(v)]));
    default: fail('invalid-input');
  }
}
function transport(v) {
  if (v === null) return { type: 'null' };
  if (typeof v === 'boolean') return { type: 'boolean', value: v };
  if (typeof v === 'string') return { type: 'string', value: v };
  if (typeof v === 'bigint') return { type: 'bigint', decimal: v.toString() };
  if (typeof v === 'number') return { type: 'number', decimal: Object.is(v, -0) ? '-0' : v.toString() };
  if (Array.isArray(v)) return { type: 'array', elements: v.map(transport) };
  return { type: 'object', entries: Object.entries(v).map(([k, x]) => [k, transport(x)]) };
}
function canonical(n, maximum = B.snapshotBytes) {
  const counts = { nodes: 0, depth: 0 };
  function walk(x, depth) {
    counts.nodes++; counts.depth = Math.max(counts.depth, depth);
    if (depth > B.depth || counts.nodes > B.nodes) fail('invalid-input');
    switch (x.type) {
      case 'null': return '["null"]';
      case 'boolean': if (typeof x.value !== 'boolean') fail('invalid-input'); return '["boolean",' + x.value + ']';
      case 'string': if (Buffer.byteLength(scalar(x.value), 'utf8') > B.stringBytes) fail('invalid-input'); return '["string",' + quote(x.value) + ']';
      case 'number': {
        const number = Number(x.decimal); if (!Number.isFinite(number)) fail('invalid-input');
        const bytes = Buffer.alloc(8); bytes.writeDoubleBE(number);
        return '["binary64","' + bytes.toString('hex') + '"]';
      }
      case 'bigint': {
        if (!/^(0|-?[1-9][0-9]*)$/.test(x.decimal) || x.decimal.replace('-', '').length > B.bigintDigits) fail('invalid-input');
        return '["bigint",' + quote(BigInt(x.decimal).toString()) + ']';
      }
      case 'array': if (x.elements.length > B.entries) fail('invalid-input'); return '["array",[' + x.elements.map(v => walk(v, depth + 1)).join(',') + ']]';
      case 'object': {
        if (x.entries.length > B.members) fail('invalid-input');
        const keys = new Set();
        for (const [key] of x.entries) { scalar(key); if (keys.has(key)) fail('ambiguous-input'); keys.add(key); if (Buffer.byteLength(key) > B.keyBytes) fail('invalid-input'); }
        return '["object",[' + [...x.entries].sort((a, b) => compare(a[0], b[0])).map(([key, v]) => '[' + quote(key) + ',' + walk(v, depth + 1) + ']').join(',') + ']]';
      }
      default: fail('invalid-input');
    }
  }
  const text = walk(n, 1), bytes = Buffer.from(text, 'utf8');
  if (bytes.length > maximum) fail('invalid-input');
  return { text, bytes, counts };
}
function frame(tag, payload) {
  if (!Object.values(D).includes(tag)) fail('unsupported-profile');
  const name = Buffer.from(tag, 'utf8'), sizes = Buffer.alloc(4), length = Buffer.alloc(8);
  sizes.writeUInt32BE(name.length); length.writeBigUInt64BE(BigInt(payload.length));
  return Buffer.concat([Buffer.from('CONTRATPRO-DIGEST', 'ascii'), Buffer.from([0]), sizes, name, length, payload]);
}
const descriptor = (tag, payload) => ({ algorithm: 'sha-256', encoding: 'hex', domainVersion: tag, value: sha(frame(tag, payload)) });
function record(name, input, tag, maximum) {
  const encoded = canonical(input, maximum), framed = frame(tag, encoded.bytes);
  return { name, canonicalUtf8: encoded.text, canonicalHex: encoded.bytes.toString('hex'), canonicalByteLength: encoded.bytes.length,
    framedHex: framed.toString('hex'), framedByteLength: framed.length, digest: descriptor(tag, encoded.bytes), counts: encoded.counts };
}
const control = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u;
function predicate(name, value) {
  if (name === 'source-text-controls' || name === 'conditions-text') return !control.test(value) && (name !== 'conditions-text' || value.trim().length > 0);
  if (name === 'snapshot-agency-equality') { if (value.settings.agencyId !== value.document.agencyId) fail('binding-mismatch'); return true; }
  if (name === 'unique-marker-ids') return new Set(value.damage.map(m => m.id)).size === value.damage.length;
  if (name === 'png-structural-screen') fail('unavailable-input'); // Intentionally no non-null image vectors/decoder.
  if (name === 'agency-profile-validation-view') {
    const limits = { name: 200, ice: 15, ifNumber: 20, rc: 50, address: 400, city: 100, phone: 16, email: 320 };
    for (const [k, max] of Object.entries(limits)) {
      const text = value[k].trim();
      if (text.length > max || /[\u0000-\u001f\u007f]/u.test(text) || (!text && !['ice', 'ifNumber', 'rc'].includes(k))) return false;
      if (text && k === 'ice' && !/^[0-9]{15}$/.test(text)) return false;
      if (text && k === 'ifNumber' && !/^[0-9]{1,20}$/.test(text)) return false;
      if (text && k === 'phone' && !/^\+?[0-9]{8,15}$/.test(text)) return false;
      if (text && k === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return false;
    }
    return true;
  }
  fail('invalid-input');
}
function conforms(v, schema) {
  const s = typeof schema === 'string' ? spec.definitions[schema] : schema;
  if (!s) fail('unsupported-profile');
  let ok = false;
  switch (s.kind) {
    case 'null': ok = v === null; break;
    case 'literal': ok = v === s.value; break;
    case 'enum': ok = s.values.includes(v); break;
    case 'string': ok = typeof v === 'string' && (!s.pattern || new RegExp(s.pattern, 'u').test(v)) && v !== s.not && (!s.maxUtf16 || v.length <= s.maxUtf16) && (!s.maxUtf8 || Buffer.byteLength(v) <= s.maxUtf8); break;
    case 'number': ok = typeof v === 'number' && Number.isFinite(v) && (!s.integer || Number.isSafeInteger(v)) && (s.min === undefined || v >= s.min) && (s.max === undefined || v <= s.max); break;
    case 'bigint': ok = typeof v === 'bigint' && v.toString().replace('-', '').length <= s.maxDigits && (s.minDecimal === undefined || v >= BigInt(s.minDecimal)); break;
    case 'union': ok = s.alternatives.some(x => conforms(v, x)); break;
    case 'array': ok = Array.isArray(v) && v.length <= s.maximum && v.every(x => conforms(x, s.items)); break;
    case 'tuple': ok = Array.isArray(v) && v.length === s.items.length && v.every((x, i) => conforms(x, s.items[i])); break;
    case 'object': ok = !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every(k => Object.hasOwn(s.fields, k)) && Object.entries(s.fields).every(([k, x]) => Object.hasOwn(v, k) ? conforms(v[k], x) : s.optional.includes(k)); break;
    default: fail('invalid-input');
  }
  return ok && (!s.predicate || predicate(s.predicate, v));
}
const result = status => ({ schemaVersion: 1, profileId: spec.resultProfile, status, trust: 'unverified', canActivateSigned: false,
  reasonCode: spec.reasonCodes[status], targetIds: [], digests: [] });
if (!conforms(spec.profileDomainRegistry, 'registry')) throw Error('Proposed registry/schema mismatch');
function evaluate(v) {
  if (v.kind === 'budget-counter-probe') return { result: result(Number.isSafeInteger(v.measured) && v.measured >= 0 && v.measured <= B[v.metric] ? 'integrity-match-unverified' : 'invalid-input'), measured: v.measured, maximum: B[v.metric], evidenceClass: 'counter-model-only' };
  if (v.kind === 'graph-probe') {
    const vertices = new Set(v.edges.flat()), incoming = new Map([...vertices].map(k => [k, 0]));
    for (const [, to] of v.edges) incoming.set(to, incoming.get(to) + 1);
    const queue = [...vertices].filter(k => incoming.get(k) === 0); let removed = 0;
    while (queue.length) { const current = queue.pop(); removed++; for (const [from, to] of v.edges) if (from === current) { incoming.set(to, incoming.get(to) - 1); if (incoming.get(to) === 0) queue.push(to); } }
    return { result: result(removed === vertices.size ? 'integrity-match-unverified' : 'ambiguous-input'), evidenceClass: 'graph-model-only' };
  }
  if (v.kind === 'codec' || v.kind === 'schema-probe') {
    const encoded = record('value', v.input, D.snapshot, B.snapshotBytes);
    if (v.kind === 'schema-probe' && !conforms(native(v.input), v.schema)) fail('invalid-input');
    return { result: result('integrity-match-unverified'), records: [encoded], evidenceClass: 'exact-byte-reference' };
  }
  if (v.kind === 'bytes') {
    if (!Object.values(D).includes(v.domain)) fail('unsupported-profile');
    if (v.hex === undefined) fail('unavailable-input');
    const bytes = Buffer.from(v.hex, 'hex'), framed = frame(v.domain, bytes), digest = descriptor(v.domain, bytes);
    if (v.expectedDigest && v.expectedDigest !== digest.value) fail('digest-mismatch');
    return { result: result('integrity-match-unverified'), payloadHex: bytes.toString('hex'), payloadByteLength: bytes.length, framedHex: framed.toString('hex'), framedByteLength: framed.length, rawSha256: sha(bytes), digest, evidenceClass: 'exact-byte-reference' };
  }
  if (v.kind !== 'package') fail('invalid-input');
  if (!['v1-untagged', 'v1-tagged', 'v2', 'v3'].includes(v.sourceSchema)) fail('unsupported-profile');
  const snapshot = native(v.snapshot), records = [record('snapshot', v.snapshot, D.snapshot, B.snapshotBytes)];
  if (!conforms(snapshot, 'snapshot-' + v.sourceSchema)) fail('invalid-input');
  const context = { schemaVersion: 1, mode: 'offline-synthetic', agencyId: v.expectedAgencyId, contractId: v.expectedContractId, documentRevisionId: v.expectedDocumentRevisionId,
    aggregateRevisionAtFinalization: v.aggregateRevisionAtFinalization, liveAggregateRevision: v.liveCasRevision, capturedSettingsRevision: v.expectedSettingsRevision };
  if (!conforms(context, 'expectedContext')) fail('invalid-input');
  const contextCounts = canonical(transport(context), B.coreBytes).counts;
  if (context.liveAggregateRevision < context.aggregateRevisionAtFinalization || snapshot.settings.revision !== context.capturedSettingsRevision) fail('binding-mismatch');
  if (snapshot.settings.agencyId !== v.expectedAgencyId || snapshot.document.rentalId !== v.expectedContractId || v.documentRevisionId !== v.expectedDocumentRevisionId) fail('binding-mismatch');
  const scope = { schemaVersion: 1, mode: 'offline-synthetic', agencyId: snapshot.document.agencyId, contractId: snapshot.document.rentalId, documentRevisionId: v.documentRevisionId };
  const pdf = Buffer.from(v.pdfHex, 'hex'); if (pdf.length > B.pdfBytes || v.assets.length > B.assets) fail('invalid-input');
  const raw = { profileId: P.raw, algorithm: 'sha-256', encoding: 'hex', value: sha(pdf) }, internal = descriptor(D.pdf, pdf);
  const entries = v.assets.map(a => { const b = Buffer.from(a.hex, 'hex'); if (b.length > B.assetBytes) fail('invalid-input'); return { assetId: a.id, role: a.role, version: a.version, byteLength: BigInt(b.length), digest: descriptor(D.asset, b) }; });
  if (entries.some((a, i) => i && compare(entries[i - 1].assetId, a.assetId) >= 0)) fail('ambiguous-input');
  const assets = { ...scope, profileId: P.assets, assetManifestId: 'synthetic-assets', rendererVersion: 'synthetic-renderer-v1', templateId: snapshot.settings.template, templateVersion: 'synthetic-template-v1', locale: 'fr-ar', timeZone: 'UTC',
    printProfile: { profileId: spec.printProfile, paper: 'A4', marginMm: { top: 10, right: 10, bottom: 10, left: 10 }, scale: 1, backgrounds: true, browserHeadersFooters: false }, entries };
  const party = { ...scope, profileId: P.party, partyPlanId: 'synthetic-plan', planVersion: 'synthetic-plan-v1', requiredParties: ['agency-representative', 'customer'].map((role, i) => ({ partyInstanceId: 'synthetic-party-' + i, role, subjectRef: 'synthetic-subject-' + i, required: true, sequenceIndex: i })) };
  if (!conforms(assets, 'assets') || !conforms(party, 'party')) fail('invalid-input');
  if (v.assetContextMismatch) assets.agencyId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  if (v.partyContextMismatch) party.documentRevisionId = 'synthetic-old-edition';
  if (v.renderTemplateMismatch) assets.templateId = snapshot.settings.template === 'classic' ? 'bilingual' : 'classic';
  if (['agencyId', 'contractId', 'documentRevisionId'].some(k => assets[k] !== scope[k] || party[k] !== scope[k]) || assets.templateId !== snapshot.settings.template) fail('binding-mismatch');
  records.push(record('assets', transport(assets), D.assets, B.coreBytes), record('party', transport(party), D.party, B.coreBytes));
  const root = { ...scope, profileId: P.root, manifestId: 'synthetic-root', canonicalizationProfile: P.codec, aggregateRevisionAtFinalization: v.aggregateRevisionAtFinalization,
    sourceSchema: v.sourceSchema, sourceTagPresence: v.sourceSchema === 'v1-untagged' ? 'absent' : 'explicit', snapshotRef: 'synthetic-snapshot', snapshotDigest: records[0].digest,
    baseArtifactRef: 'synthetic-base-pdf', baseArtifactDigest: internal, rawPdfChecksum: raw, byteLength: BigInt(pdf.length), mediaType: 'application/pdf',
    assetManifestRef: assets.assetManifestId, assetManifestDigest: records[1].digest, partyPlanRef: party.partyPlanId, partyPlanDigest: records[2].digest, policyBinding: null, priorEdition: null };
  if (v.rootExtraField) root.manifestDigest = records[0].digest;
  if (!conforms(root, 'root')) fail('invalid-input');
  records.push(record('root', transport(root), D.root, B.coreBytes));
  const total = pdf.length + v.assets.reduce((n, a) => n + Buffer.from(a.hex, 'hex').length, 0) + records.reduce((n, a) => n + a.canonicalByteLength, 0);
  if (total > B.packageBytes || contextCounts.nodes + records.reduce((n, a) => n + a.counts.nodes, 0) > B.nodes) fail('invalid-input');
  return { result: result('integrity-match-unverified'), records, rawPdfChecksum: raw, internalPdfDigest: internal,
    packageChargedBytes: total, contextNodeCount: contextCounts.nodes, evidenceClass: 'exact-byte-reference', artifactValidity: 'not-evaluated' };
}
const outputs = corpus.vectors.map(v => {
  let answer; try { answer = evaluate(v); } catch (e) { if (!spec.errorPrecedence.includes(e.message)) throw e; answer = { result: result(e.message), evidenceClass: 'rejection-reference' }; }
  if (answer.result.status !== (v.expectedStatus ?? 'integrity-match-unverified')) throw Error(v.id + ' unexpected disposition ' + answer.result.status);
  if (!conforms(answer.result, 'result')) throw Error('Bad reference result shape');
  return { id: v.id, sourceRows: v.sourceRows, ...answer };
});
const output = { corpusVersion: corpus.corpusVersion, status: 'PROPOSED-NODE-REFERENCE', ownerApproved: false,
  environment: { node: process.version, versions: process.versions, platform: process.platform, arch: process.arch },
  primitiveKnownAnswers: kats, sourceRows: corpus.sourceRows, deferredRows: corpus.deferredRows, pendingVectors: corpus.pendingVectors, vectors: outputs };
fs.writeFileSync(path.join(here, 'known-answers.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ vectors: outputs.length, primitiveKnownAnswers: kats.length, discrepancies: 0 }));
