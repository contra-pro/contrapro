import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const old = path.join(here, '../offline-digest-preimplementation-v1');
const read = p => fs.readFileSync(p, 'utf8');
const json = p => JSON.parse(read(p));
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const protectedFiles = json(path.join(here, 'protected-before.json'));
for (const [file, digest] of Object.entries(protectedFiles)) assert.equal(sha(path.join(root, file)), digest, file);
const blocks = [
  ['reference-node.mjs', 'replay-node.mjs', 'function scalar(', 'const control ='],
  ['reference-python.py', 'replay-python.py', 'def scalar(', 'WS ='],
];
for (const [original, replay, start, end] of blocks) {
  const slice = text => text.slice(text.indexOf(start), text.indexOf(end));
  assert.equal(slice(read(path.join(old, original))), slice(read(path.join(here, replay))), original);
}
const answers = json(path.join(here, 'known-answers.json'));
assert.deepEqual(answers.vectors.slice(0, 153), json(path.join(old, 'known-answers.json')).vectors);
const comparison = json(path.join(here, 'independent-python-report.json'));
assert.equal(comparison.comparedVectors, 206);
assert.deepEqual(comparison.discrepancies, []);
assert.equal(comparison.schemaProposalSha256, sha(path.join(old, 'schemas-and-registry.proposed.json')));
assert.equal(json(path.join(here, 'corpus-input.json')).vectors.length, answers.vectors.length);
const lineageExpected = {
  'valid-prior': 'integrity-match-unverified', 'changed-live-cas': 'integrity-match-unverified',
  'self-reference': 'ambiguous-input', 'duplicate-edition': 'ambiguous-input',
  'cyclic-lineage': 'ambiguous-input', 'missing-prior': 'unavailable-input',
  'cross-agency-prior': 'binding-mismatch', 'conflicting-digest': 'digest-mismatch',
};
for (const [id, status] of Object.entries(lineageExpected)) assert.equal(answers.vectors.find(v => v.id === `lineage-${id}`).result.status, status, id);
assert.equal(Object.keys(json(path.join(old, 'schemas-and-registry.proposed.json')).definitions).length, 67);
assert.match(read(path.join(root, 'docs/decisions/001-proposed-electronic-signature-evidence-boundary.md')), /PROPOSED/i);
const resources = json(path.join(here, 'resource-report.json'));
assert.equal(resources.verified, 42); assert.equal(resources.unverified, 0);
assert.equal(fs.existsSync(path.join(here, 'resource-witness.bin')), false);
const report = path.join(root, 'docs/rental-contracts-offline-digest-final-gap-closure-v1.md');
const files = fs.readdirSync(here).filter(name => fs.statSync(path.join(here, name)).isFile());
for (const file of [...files.map(name => path.join(here, name)), report]) {
  if (!/\.(md|json|py|mjs)$/.test(file)) continue;
  assert.equal(read(file).split(/\r?\n/).some(line => /[ \t]+$/.test(line)), false, `Trailing whitespace: ${file}`);
}
const output = {
  status: 'REFERENCE-CHECKS-PASSED-NOT-APPROVAL', ownerApproved: false,
  protectedFilesUnchanged: Object.keys(protectedFiles).length,
  originalCodecAndFramingBlocksUnchanged: 2,
  baselineVectorsUnchanged: 153, newVectors: 53, comparedVectors: 206,
  discrepancies: 0, schemaDefinitions: 67, boundedResourceProbes: 42,
  wallMs: { min: Math.min(...resources.rows.map(r => r.wallMs)), max: Math.max(...resources.rows.map(r => r.wallMs)) },
  peakResidentBytes: { min: Math.min(...resources.rows.map(r => r.peakResidentBytes)), max: Math.max(...resources.rows.map(r => r.peakResidentBytes)) },
  inventory: Object.fromEntries(files.filter(n => n !== 'final-check-report.json').sort().map(n => [n, sha(path.join(here, n))])),
};
fs.writeFileSync(path.join(here, 'final-check-report.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ...output, inventory: Object.keys(output.inventory) }));
