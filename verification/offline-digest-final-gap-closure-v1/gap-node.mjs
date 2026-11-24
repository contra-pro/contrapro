// Private finite-corpus reference extensions, never imported by the application.
export function screenLogo(uri) {
  if (typeof uri !== 'string' || uri.length > 280000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(uri)) return false;
  const encoded = uri.slice(22), data = Buffer.from(encoded, 'base64');
  if (data.toString('base64') !== encoded || data.length < 57 || data.length > 204800) return false;
  if (!data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return false;
  if (data.readUInt32BE(8) !== 13 || data.toString('ascii', 12, 16) !== 'IHDR') return false;
  if (![data.readUInt32BE(16), data.readUInt32BE(20)].every(n => n > 0 && n <= 2048)) return false;
  let cursor = 8, image = false;
  while (cursor + 12 <= data.length) {
    const length = data.readUInt32BE(cursor), kind = data.toString('ascii', cursor + 4, cursor + 8);
    if (length > data.length - cursor - 12 || kind === 'acTL') return false;
    if (kind === 'IDAT') image = true;
    cursor += length + 12;
    if (kind === 'IEND') return length === 0 && image && cursor === data.length;
  }
  return false;
}
function cyclic(nodes, edges) {
  const degree = new Map(nodes.map(n => [n, 0]));
  for (const [from, to] of edges) if (degree.has(from) && degree.has(to)) degree.set(to, degree.get(to) + 1);
  const queue = nodes.filter(n => degree.get(n) === 0); let count = 0;
  while (queue.length) { const n = queue.shift(); count++; for (const [a, b] of edges) if (a === n && degree.has(b)) { degree.set(b, degree.get(b) - 1); if (degree.get(b) === 0) queue.push(b); } }
  return count !== nodes.length;
}
export function evaluateGap(v, c) {
  const phases = [], finish = (status, extra = {}) => ({ result: c.result(status), evidenceClass: 'new-gap-reference', phases, ...extra });
  phases.push('profile');
  if (v.kind === 'combined-fault') {
    if (v.profile !== c.P.codec) return finish('unsupported-profile', { hashCalls: 0 });
    phases.push('structure');
    try { c.canonical(v.value, c.B.snapshotBytes); } catch { return finish('invalid-input', { hashCalls: 0 }); }
    if (!Array.isArray(v.nodes) || v.nodes.some(n => typeof n.id !== 'string' || !Array.isArray(n.requires) || !/^(?:[0-9a-f]{2})*$/.test(n.payloadHex) || !/^[0-9a-f]{64}$/.test(n.expectedDigest))) return finish('invalid-input', { hashCalls: 0 });
    phases.push('ambiguity'); const names = v.nodes.map(n => n.id), edges = v.nodes.flatMap(n => n.requires.map(x => [n.id, x]));
    if (new Set(names).size !== names.length || cyclic(names, edges)) return finish('ambiguous-input', { hashCalls: 0 });
    phases.push('availability'); if (edges.some(([, x]) => !names.includes(x))) return finish('unavailable-input', { hashCalls: 0 });
    phases.push('binding'); if (v.nodes.some(n => n.agencyId !== v.expectedAgency)) return finish('binding-mismatch', { hashCalls: 0 });
    phases.push('digests');
    const checked = v.nodes.map(n => { const bytes = Buffer.from(n.payloadHex, 'hex'), framed = c.frame(c.D.asset, bytes); return { id: n.id, payloadHex: n.payloadHex, framedHex: framed.toString('hex'), framedByteLength: framed.length, digest: c.descriptor(c.D.asset, bytes), expectedDigest: n.expectedDigest }; });
    const mismatches = checked.filter(n => n.digest.value !== n.expectedDigest).map(n => n.id).sort();
    return finish(mismatches.length ? 'digest-mismatch' : 'integrity-match-unverified', { hashCalls: checked.length, checkedBytes: checked, digestMismatchIds: mismatches });
  }
  phases.push('structure');
  const manifests = v.editions.map(e => { c.canonical(e.manifest, c.B.coreBytes); return c.native(e.manifest); });
  if (manifests.some(m => !c.conforms(m, 'root'))) return finish('invalid-input', { hashCalls: 0 });
  phases.push('ambiguity');
  const keys = manifests.map(m => m.documentRevisionId + '|' + m.manifestId);
  if (new Set(keys).size !== keys.length) return finish('ambiguous-input', { hashCalls: 0 });
  const edges = manifests.filter(m => m.priorEdition).map(m => [m.documentRevisionId + '|' + m.manifestId, m.priorEdition.documentRevisionId + '|' + m.priorEdition.manifestRef]);
  if (cyclic(keys, edges)) return finish('ambiguous-input', { hashCalls: 0 });
  phases.push('availability');
  if (!manifests.some(m => m.documentRevisionId === v.currentEdition) || edges.some(([, p]) => !keys.includes(p))) return finish('unavailable-input', { hashCalls: 0 });
  phases.push('binding');
  const current = manifests.find(m => m.documentRevisionId === v.currentEdition);
  if (manifests.some(m => m.agencyId !== v.expectedAgency || m.contractId !== v.expectedContract) || v.liveCasRevision < current.aggregateRevisionAtFinalization) return finish('binding-mismatch', { hashCalls: 0 });
  phases.push('digests');
  const records = v.editions.map((e, i) => c.record(keys[i], e.manifest, c.D.root, c.B.coreBytes));
  const wrong = [];
  for (let i = 0; i < manifests.length; i++) {
    const m = manifests[i], asserted = v.editions[i].declaredDigest;
    if (asserted !== null && asserted !== records[i].digest.value) wrong.push(keys[i]);
    if (m.priorEdition) { const prior = keys.indexOf(m.priorEdition.documentRevisionId + '|' + m.priorEdition.manifestRef); if (m.priorEdition.manifestDigest.value !== records[prior].digest.value) wrong.push(keys[i]); }
  }
  return finish(wrong.length ? 'digest-mismatch' : 'integrity-match-unverified', { hashCalls: records.length, records, frozenCurrentDigest: records[manifests.indexOf(current)].digest, digestMismatchIds: [...new Set(wrong)].sort(), historicalAuthority: 'not-established' });
}
