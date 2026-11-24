import path from 'node:path';
import { sanitize } from './diagnostics.mjs';

export const ACK = 'CREATE_NEW_LOCAL_CLUSTER_ONLY';
export function validateArguments(args) {
  const keys = ['--pg-bin', '--workspace', '--disposable-id', '--ack'];
  if (args.length !== keys.length * 2) throw new Error('INVALID_ARGUMENTS');
  const values = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!keys.includes(args[i]) || values[args[i]] || !args[i + 1]) throw new Error('INVALID_ARGUMENTS');
    values[args[i]] = args[i + 1];
  }
  const id = values['--disposable-id'];
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) throw new Error('INVALID_DISPOSABLE_ID');
  if (values['--ack'] !== ACK) throw new Error('ACK_REQUIRED');
  for (const key of ['--workspace', '--pg-bin']) {
    const value = values[key];
    if (!path.isAbsolute(value) || /supabase|postgres(?:ql)?:|[\r\n\0]/i.test(value) || value.startsWith('\\\\') || value.startsWith('//')) throw new Error('LOCAL_PATH_REQUIRED');
  }
  const workspace = path.resolve(values['--workspace']);
  if (path.basename(workspace) !== `contratpro-rental-pg17-${id}`) throw new Error('WORKSPACE_ID_MISMATCH');
  return { id, workspace, pgBin: path.resolve(values['--pg-bin']), database: `rental_${id.replaceAll('-', '')}` };
}

// Exact, fail-closed in-memory transformation. Never alter the source file.
export function executableCopy(source) {
  const guard = "DO $guard$ BEGIN\n RAISE EXCEPTION 'LOCAL DESIGN ONLY: execution authority and PostgreSQL integration unresolved';\nEND $guard$;";
  const normalized = source.replaceAll('\r\n', '\n');
  if (normalized.split(guard).length !== 2 || !/\nROLLBACK;\s*$/.test(normalized)) throw new Error('DRAFT_GUARD_CHANGED');
  return normalized.replace(guard, '-- Test-only memory copy: deliberate guard removed.').replace(/\nROLLBACK;\s*$/, '\nCOMMIT;\n');
}

export function verifyServer(row, expectedDirectory, database, expectedPort) {
  const probe=row && typeof row==='object'?row:{};
  const flavor=path.win32.isAbsolute(expectedDirectory)?path.win32:path.posix;
  const normalize=value=>typeof value==='string' && !value.includes('\0') && flavor.isAbsolute(value)
    ? flavor.resolve(value):null;
  const failures=[];
  const safe=value=>value===undefined?'<missing>':value===null?'<null>':sanitize(String(value))
    .replace(/([\\/]Users[\\/])[^\\/]+/gi,'$1[USER]');
  const check=(field,expected,actual,valid,normalization='exact equality')=>{
    if(!valid) failures.push({field,expected:safe(expected),actual:safe(actual),normalization,stage:'verify-server-identity'});
  };
  const version=typeof probe.version==='string' && /^\d+$/.test(probe.version)?Number(probe.version):probe.version;
  check('version','170000 <= integer < 180000',probe.version,
    Number.isInteger(version)&&version>=170000&&version<180000,'decimal integer PostgreSQL version range');
  check('address','127.0.0.1',probe.address,probe.address==='127.0.0.1');
  check('port',expectedPort,probe.port,Number.isInteger(expectedPort)&&expectedPort>0&&expectedPort<=65535&&probe.port===expectedPort);
  const expectedPath=normalize(expectedDirectory),actualPath=normalize(probe.directory);
  check('directory',expectedDirectory,probe.directory,expectedPath!==null&&actualPath!==null&&actualPath===expectedPath,
    flavor===path.win32?'Windows absolute path normalize separators/dot segments; strict case; no alias expansion':'POSIX absolute path normalize; strict case');
  check('database',database,probe.database,typeof database==='string'&&database.length>0&&probe.database===database);
  check('session_user','postgres',probe.session_user,probe.session_user==='postgres');
  if(failures.length) {
    const error=new Error('SERVER_IDENTITY_MISMATCH');
    error.code='SERVER_IDENTITY_MISMATCH'; error.identityComparisons=failures;
    throw error;
  }
}
