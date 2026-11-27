// Product-owner launcher. No server is started by importing the fixture sources.
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '../..');
const env = {};
for (const name of ['SystemRoot','WINDIR','PATH','PATHEXT','TEMP','TMP','COMSPEC']) if (process.env[name]) env[name] = process.env[name];
env.NODE_OPTIONS = `--require="${resolve(root, 'scripts/ui-review/isolate.cjs').replaceAll('\\','/')}"`;
env.NEXT_TELEMETRY_DISABLED = '1';
env.A6_SYNTHETIC_ONLY = '1';
const args = process.argv.slice(2);
if (args.some(value => value !== '--build-only')) throw Error('Unsupported review option');
const child = spawn(process.execPath, [resolve(root, 'scripts/ui-review/serve.mjs'), ...args], { cwd: root, env, windowsHide: true, stdio: 'inherit' });
console.log(`Synthetic review launcher PID ${process.pid}; server PID ${child.pid}. Stop with Ctrl+C.`);
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
child.on('exit', code => { process.exitCode = code ?? 0; });
