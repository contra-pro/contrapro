import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const mandatory = [
  'docs/rental-contracts-offline-digest-preimplementation-closure-v1.md', 'docs/rental-contracts-digest-decision-closure-package-v1.md',
  'docs/rental-contracts-signature-architecture-decision-review-v1.md', 'docs/rental-contracts-offline-canonicalization-digest-specification-v1.md',
  'docs/rental-contracts-canonicalization-digest-candidate-vectors-v1.md', 'docs/decisions/001-proposed-electronic-signature-evidence-boundary.md',
];
const files = [...mandatory];
for (const folder of ['apps/web/src', 'apps/web/preview/rental-create', 'packages/application/src', 'packages/domain/src', 'verification/offline-digest-preimplementation-v1']) {
  function visit(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, item.name); if (item.isDirectory()) visit(file); else files.push(path.relative(root, file).replaceAll('\\', '/')); } }
  visit(path.join(root, folder));
}
const baseline = Object.fromEntries([...new Set(files)].sort().map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const baselinePath = path.join(here, 'protected-before.json');
if (fs.existsSync(baselinePath)) throw Error('Refusing to replace protected baseline');
fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n');
const base = path.join(root, 'verification/offline-digest-preimplementation-v1');
const schema = JSON.parse(fs.readFileSync(path.join(base, 'schemas-and-registry.proposed.json')));
const inputs = JSON.parse(fs.readFileSync(path.join(base, 'corpus-input.json')));
const answers = JSON.parse(fs.readFileSync(path.join(base, 'known-answers.json')));
const report = JSON.parse(fs.readFileSync(path.join(base, 'independent-python-report.json')));
console.log(JSON.stringify({ protectedFiles: Object.keys(baseline).length, schemas: Object.keys(schema.definitions).length, baselineInputs: inputs.vectors.length, baselineAnswers: answers.vectors.length, baselineDiscrepancies: report.discrepancies.length }));
