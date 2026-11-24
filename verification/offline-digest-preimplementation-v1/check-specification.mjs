// Read-only schema/document/source consistency checks; outputs stay in this directory.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const read = name => JSON.parse(fs.readFileSync(path.join(here, name), 'utf8'));
const proposal = read('schemas-and-registry.proposed.json'), input = read('corpus-input.json'), answers = read('known-answers.json'), independent = read('independent-python-report.json');
const errors = [], references = new Map();
function schemaRefs(s, refs) {
  if (typeof s === 'string') { refs.add(s); return; }
  if (s.kind === 'object') {
    if (s.closed !== true || s.optional.some(k => !Object.hasOwn(s.fields, k))) errors.push('Open/invalid object');
    Object.values(s.fields).forEach(v => schemaRefs(v, refs));
  } else if (s.kind === 'array') schemaRefs(s.items, refs);
  else if (s.kind === 'tuple') s.items.forEach(v => schemaRefs(v, refs));
  else if (s.kind === 'union') s.alternatives.forEach(v => schemaRefs(v, refs));
  else if (!['null', 'literal', 'enum', 'string', 'number', 'bigint'].includes(s.kind)) errors.push('Unknown schema kind');
}
for (const [name, schema] of Object.entries(proposal.definitions)) {
  const refs = new Set(); schemaRefs(schema, refs); references.set(name, refs);
  for (const ref of refs) if (!Object.hasOwn(proposal.definitions, ref)) errors.push('Missing schema ' + ref);
}
function walk(name, active = new Set()) {
  if (active.has(name)) { errors.push('Schema reference cycle ' + name); return; }
  for (const child of references.get(name) ?? []) walk(child, new Set([...active, name]));
}
for (const name of references.keys()) walk(name);
for (const name of ['assets', 'party']) if (Object.keys(proposal.definitions[name].fields).some(k => /manifestDigest|manifestRef|live|attempt|signature/i.test(k))) errors.push('Parent field in core ' + name);
if (['manifestDigest', 'liveAggregateRevision', 'attemptId'].some(k => Object.hasOwn(proposal.definitions.root.fields, k))) errors.push('Mutable/self root field');
if (proposal.ownerApproved || input.ownerApproved || answers.ownerApproved || independent.ownerApproved) errors.push('Approval escalation');
const registry = proposal.profileDomainRegistry;
if (registry.status !== 'PROPOSED' || registry.ownerApproved || registry.entries.some(e => e.status !== 'PROPOSED' || (e.schemaRef !== null && !Object.hasOwn(proposal.definitions, e.schemaRef)))) errors.push('Registry proposal mismatch');
if (new Set(registry.entries.map(e => e.id)).size !== registry.entries.length) errors.push('Duplicate registry ID');
if (independent.discrepancies.length || independent.comparedVectors !== answers.vectors.length) errors.push('Incomplete independent comparison');
const trace = input.sourceRows.map(row => ({ sourceRow: row, vectorIds: input.vectors.filter(v => v.sourceRows.includes(row)).map(v => v.id),
  disposition: input.deferredRows[row] ? 'PARTIAL-OR-DEFERRED-NOT-FULLY-VERIFIED' : 'SCOPED-REFERENCE-CASES-NOT-OWNER-ACCEPTED', exclusion: input.deferredRows[row] ?? null }));
if (trace.length !== 49 || trace.some(r => !r.vectorIds.length && !r.exclusion)) errors.push('Untraced source row');
const baseline = {
  'packages/application/src/rentals/signing-evidence.ts': '52dee0a23b917f7c0d9559e03d5ed2d0f9d3ce15',
  'packages/application/src/rentals/signing-evidence-resolution.ts': 'c17ef6dfe252126913bb05e44108de984e692c46',
  'packages/application/src/rentals/contract-lifecycle.ts': 'bbe5ecbe33931a38fc3aa141bf5d612a37911bc7',
  'packages/application/src/rentals/contract-settings.ts': 'b9bc58e744c80c7c8879644b2b8d3130e249f2be',
  'apps/web/src/rentals/contract-document.tsx': '855cb803d09c232b418370230b8f985d8eef3d31',
  'apps/web/src/rentals/contract-studio.module.css': 'c3e03e2564a4845bd3139acdf43419c498fa2fcb',
  'apps/web/src/rentals/contract-pdf-export.tsx': '56cea4567c7430472de7467db8a9ebc619db88c0',
  'apps/web/src/rentals/signing-evidence.test.ts': '660bf3a5a14546c50ce3e7a72d4249dc2fd57ffd',
  'apps/web/src/rentals/signing-evidence-resolution.test.ts': '9fe44dd87bedd3674eacb419f418551799e9b39f',
};
const preserved = Object.entries(baseline).map(([file, expectedGitBlobId]) => {
  const bytes = fs.readFileSync(path.join(root, file));
  const actualGitBlobId = crypto.createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
  if (actualGitBlobId !== expectedGitBlobId) errors.push('Protected file changed: ' + file);
  return { file, expectedGitBlobId, actualGitBlobId, unchanged: expectedGitBlobId === actualGitBlobId };
});
const docs = ['docs/rental-contracts-offline-digest-preimplementation-closure-v1.md', 'verification/offline-digest-preimplementation-v1/README.md'];
if (!fs.readFileSync(path.join(root, 'docs/decisions/001-proposed-electronic-signature-evidence-boundary.md'), 'utf8').includes('**Proposed — design only.**')) errors.push('ADR status changed');
for (const file of docs) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of content.matchAll(/\]\(([^)]+)\)/g)) if (!match[1].includes('://') && !fs.existsSync(path.resolve(path.dirname(path.join(root, file)), match[1].split('#')[0]))) errors.push('Missing doc target: ' + match[1]);
}
const textFiles = [...fs.readdirSync(here).filter(n => /\.(json|mjs|py|ps1|md)$/.test(n)).map(n => path.join(here, n)), path.join(root, docs[0])];
for (const file of textFiles) if (fs.readFileSync(file, 'utf8').split('\n').some(line => /[ \t]+$/.test(line.replace(/\r$/, '')))) errors.push('Trailing whitespace: ' + file);
const nodeProvenance = Object.fromEntries(['author-corpus.py', 'reference-node.mjs', 'reference-python.py', 'test_reference.py', 'check-specification.mjs'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(here, file))).digest('hex')]));
const examples = ['string-one', 'number--0', 'bytes-pdf-empty', 'bytes-pdf-abc'].map(id => answers.vectors.find(v => v.id === id));
const report = { status: errors.length ? 'DISCREPANCY' : 'SPECIFICATION-CONSISTENCY-CHECKED-NOT-APPROVAL', ownerApproved: false,
  schemaDefinitions: references.size, runnableVectorsCompared: answers.vectors.length, pendingUnverifiedVectors: input.pendingVectors,
  classes: independent.classes, sourceRows: trace, protectedFiles: preserved,
  baselineScope: 'Nine Git blob IDs recorded earlier in this same workspace conversation; not a new all-workspace baseline or an integrity authority',
  scriptSha256: nodeProvenance, byteExamples: examples, errors };
fs.writeFileSync(path.join(here, 'specification-check-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ schemas: references.size, compared: answers.vectors.length, pendingUnverified: input.pendingVectors.length, errors }));
process.exitCode = errors.length ? 1 : 0;
