import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ACK, validateArguments, executableCopy, verifyServer } from './safety.mjs';

const id = '10000000-0000-4000-8000-000000000001';
const directory = path.resolve(`contratpro-rental-pg17-${id}`);
const args = ['--pg-bin', path.resolve('pg17-bin'), '--workspace', directory, '--disposable-id', id, '--ack', ACK];
test('requires exact acknowledgement, UUID, local paths and all explicit arguments', () => {
  assert.equal(validateArguments(args).database, `rental_${id.replaceAll('-', '')}`);
  for (const replacement of [[], [...args, '--url', 'postgres://remote/db'], args.slice(0, -2)]) assert.throws(() => validateArguments(replacement));
  for (const [index, value] of [[1, 'postgres://remote/db'], [1, '//remote/share'], [3, path.resolve('existing-production')], [5, 'production'], [7, 'yes']]) {
    const changed = [...args]; changed[index] = value;
    assert.throws(() => validateArguments(changed));
  }
});
test('only known draft guard and final rollback can be transformed', () => {
  const original = readFileSync(new URL('../../../../../supabase/migration-drafts/20261120001300_rental_contracts.sql', import.meta.url), 'utf8');
  const copy = executableCopy(original);
  assert.match(original, /LOCAL DESIGN ONLY: execution authority/);
  assert.match(original, /ROLLBACK;\s*$/);
  assert.match(copy, /COMMIT;\s*$/);
  assert.throws(() => executableCopy(original.replace('execution authority and PostgreSQL integration unresolved', 'changed guard')));
  assert.throws(() => executableCopy(original.replace(/ROLLBACK;\s*$/, 'COMMIT;')));
});
test('checks actual server version, loopback, data directory and database', () => {
  const row = { version: '170006', address: '127.0.0.1', port:54321, directory, database: 'fixture', session_user: 'postgres' };
  verifyServer(row, directory, 'fixture',54321);
  for (const change of [{ version: '180000' }, { address: '10.0.0.1' }, { directory: path.resolve('other') }, { database: 'production' }, { session_user: 'authenticated' }]) {
    assert.throws(() => verifyServer({ ...row, ...change }, directory, 'fixture',54321));
  }
});
