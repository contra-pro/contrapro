// One-shot local verification. No environment files or provider access.
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
const root = resolve(import.meta.dirname, '../..');
const preload = resolve(root, 'scripts/ui-review/isolate.cjs').replaceAll('\\', '/');
const env = { ...process.env, NODE_OPTIONS: `--require="${preload}"`, NEXT_TELEMETRY_DISABLED: '1' };
for (const key of Object.keys(env)) if (/^(CONTRATPRO_|SUPABASE_|NEXT_PUBLIC_SUPABASE_|RESEND_|GOOGLE_|STRIPE_)/.test(key)) delete env[key];
const npm = resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const stages = process.argv.slice(2);
if (!stages.length) stages.push('verify');
if (stages.some(stage => !['verify', 'typecheck', 'lint', 'test', 'test:web', 'test:a6-sql', 'test:operations', 'build'].includes(stage))) throw Error('Unsupported verification stage');
await mkdir(resolve(root, '.verification/a6'), { recursive: true });
for (const stage of stages) {
const args = stage === 'test:web' ? ['run', 'test', '--workspace=@contratpro/web'] : stage === 'test:a6-sql' ? ['run','test','--workspace=@contratpro/database','--','tests/a1-workflows.test.ts'] : ['run', stage];
const child = spawn(process.execPath, [npm, ...args], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => { log += bytes; process.stdout.write(bytes); });
const code = await new Promise(resolve => child.on('exit', resolve));
await writeFile(resolve(root, `.verification/a6/${stage.replaceAll(':', '-')}.log`), log);
if (code !== 0) { process.exitCode = code ?? 1; break; }
}
