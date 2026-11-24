// Local-only setup: preserve existing values and never print secret material.
import { readFileSync, appendFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const target = fileURLToPath(new URL('../apps/web/.env.local', import.meta.url));
const current = readFileSync(target, 'utf8');
if (!/^CONTRATPRO_AUTH_FLOW_SECRET=/m.test(current)) {
  appendFileSync(target, `\nCONTRATPRO_AUTH_FLOW_SECRET=${randomBytes(48).toString('hex')}\n`);
}
console.log('Local recovery signing configuration present. No secret value displayed.');
