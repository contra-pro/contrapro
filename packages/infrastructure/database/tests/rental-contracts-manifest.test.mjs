// Run explicitly with node --test. No DB client, harness runner or SQL executor imported.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { deriveContract, inventory, sha256, validate } from '../manifests/rental-contracts-phase1a.mjs';

const draftUrl = new URL('../../../../supabase/migration-drafts/20261120001300_rental_contracts.sql', import.meta.url);
const manifestUrl = new URL('../manifests/rental-contracts-phase1a.json', import.meta.url);
const draft = readFileSync(draftUrl, 'utf8');
const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
function changed(from, to) {
  assert.ok(draft.includes(from), `Mutation anchor missing: ${from}`);
  const result = draft.replace(from, to);
  assert.notEqual(result, draft);
  return result;
}

test('exact approved inventory agrees with the unchanged guarded source', async () => {
  const actual = await validate(draft, manifest);
  assert.deepEqual(Object.fromEntries(['tables', 'functions', 'policies', 'triggers', 'indexes', 'constraints', 'roles', 'privileges', 'rls']
    .map(key => [key, actual[key].length])), {
    tables: 4, functions: 18, policies: 13, triggers: 3, indexes: 2,
    constraints: 36, roles: 1, privileges: 16, rls: 8,
  });
  assert.equal(actual.functions.filter(f => f.security === 'DEFINER').length, 9);
  assert.equal(actual.functions.filter(f => f.security === 'INVOKER').length, 9);
  assert.equal(actual.constraints.filter(c => c.kind === 'CONSTR_FOREIGN').length, 9);
  assert.equal(actual.columnClauses.length, 37);
  assert.match(draft, /RAISE EXCEPTION 'LOCAL DESIGN ONLY/);
  assert.match(draft, /ROLLBACK;\s*$/);
  assert.equal(sha256(readFileSync(draftUrl)), manifest.source.sha256);
});

test('complete RPC identity includes the explicit return acknowledgement type', () => {
  const fn = manifest.inventory.functions.find(f => f.name === 'public.contratpro_rental_complete');
  assert.equal(fn.signature, 'public.contratpro_rental_complete(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.bool)');
  const expectation = manifest.security.declaredExpectations.find(f => f.signature === fn.signature);
  assert.equal(expectation.finalOwner, 'contratpro_rental_writer');
  assert.deepEqual(expectation.explicitExecuteGrantees, ['authenticated']);
  assert.equal(expectation.status, 'DECLARED_DYNAMIC_TEMPLATE_ONLY_NOT_VERIFIED_EFFECT');
});

test('external references remain separate from proposed objects and unverified authority', () => {
  assert.deepEqual(manifest.inventory.existingReferences, [
    'app_private.canonical_auth_user', 'app_private.receipt_auth_uid',
    'identity.supabase_users', 'identity.users', 'tenancy.agencies',
    'tenancy.audit_events', 'tenancy.clients', 'tenancy.memberships', 'tenancy.vehicles',
  ]);
  assert.equal(manifest.existingDependencies.tables.length, 7);
  assert.equal(manifest.existingDependencies.functions.length, 2);
  assert.equal(manifest.boundaries.productionPermissions, 'UNVERIFIED');
  for (const entry of manifest.inventory.constraints) {
    assert.equal(entry.name, null);
    assert.equal(entry.catalogName, 'not_assumed_generated');
  }
});

const mutations = [
  ['unexpected table name', 'CREATE TABLE tenancy.rental_contracts', 'CREATE TABLE tenancy.unexpected_contracts'],
  ['unexpected table schema', 'CREATE TABLE tenancy.rental_contracts', 'CREATE TABLE public.rental_contracts'],
  ['unexpected function name', 'CREATE FUNCTION app_private.rental_member(', 'CREATE FUNCTION app_private.rental_member_extra('],
  ['unexpected function schema', 'CREATE FUNCTION app_private.rental_member(', 'CREATE FUNCTION public.rental_member('],
  ['changed function argument type', 'p_return_confirmed boolean', 'p_return_confirmed text'],
  ['changed named API argument', 'p_return_confirmed boolean', 'p_other_confirmation boolean'],
  ['new default argument', 'p_return_confirmed boolean', 'p_return_confirmed boolean DEFAULT true'],
  ['changed return type', 'RETURNS integer LANGUAGE plpgsql', 'RETURNS bigint LANGUAGE plpgsql'],
  ['weakened function security', 'LANGUAGE plpgsql VOLATILE SECURITY DEFINER', 'LANGUAGE plpgsql VOLATILE SECURITY INVOKER'],
  ['private helper becomes definer', 'LANGUAGE plpgsql VOLATILE SECURITY INVOKER', 'LANGUAGE plpgsql VOLATILE SECURITY DEFINER'],
  ['unsafe search path', 'SET search_path=pg_catalog,pg_temp', 'SET search_path=public,pg_catalog'],
  ['disabled function row security', 'SET row_security=on', 'SET row_security=off'],
  ['unreviewed role attribute', 'CREATE ROLE contratpro_rental_writer NOLOGIN', 'CREATE ROLE contratpro_rental_writer LOGIN'],
  ['unexpected grant recipient', 'TO contratpro_rental_writer;', 'TO authenticated;'],
  ['unexpected grant option', 'GRANT USAGE ON SCHEMA identity,tenancy,app_private,public TO contratpro_rental_writer;',
    'GRANT USAGE ON SCHEMA identity,tenancy,app_private,public TO contratpro_rental_writer WITH GRANT OPTION;'],
  ['broader table grant', 'GRANT SELECT(id,state) ON identity.users', 'GRANT SELECT ON identity.users'],
  ['different FK tenant columns', 'FOREIGN KEY(agency_id,client_id)', 'FOREIGN KEY(client_id,agency_id)'],
  ['different constraint', 'UNIQUE(agency_id,number_year,number_serial)', 'UNIQUE(number_year,number_serial)'],
  ['unexpected index predicate', "WHERE state='en_cours';", "WHERE state='confirme';"],
  ['different policy role', 'FOR SELECT TO contratpro_rental_writer', 'FOR SELECT TO authenticated'],
  ['weakened policy predicate', 'USING(user_id=app_private.canonical_auth_user());', 'USING(true);'],
  ['unexpected trigger name', 'CREATE TRIGGER rental_history_guard', 'CREATE TRIGGER unexpected_history_guard'],
  ['different trigger binding', 'EXECUTE FUNCTION app_private.rental_history_guard();', 'EXECUTE FUNCTION app_private.rental_receipt_immutable();'],
  ['different dynamic owner', 'OWNER TO contratpro_rental_writer', 'OWNER TO authenticated'],
  ['unexpected dynamic EXECUTE grantee', 'TO authenticated\',f.signature', 'TO service_role\',f.signature'],
  ['private functions exposed by ownership block', "IF f.nspname='public' THEN", "IF f.nspname='app_private' THEN"],
  ['removed force RLS', 'FORCE ROW LEVEL SECURITY;', 'NO FORCE ROW LEVEL SECURITY;'],
  ['guard weakened', "RAISE EXCEPTION 'LOCAL DESIGN ONLY", "RAISE NOTICE 'LOCAL DESIGN ONLY"],
  ['commit instead of rollback', '\nROLLBACK;', '\nCOMMIT;'],
];
for (const [label, from, to] of mutations) {
  test(`reject ${label}`, async () => assert.rejects(() => validate(changed(from, to), manifest), /Manifest disagreement|Unreviewed/));
}

test('reject missing expected function', async () => {
  const without = draft.replace(/CREATE FUNCTION app_private\.rental_member\([\s\S]*?END \$f\$;/, '');
  assert.notEqual(without, draft);
  await assert.rejects(() => validate(without, manifest), /Manifest disagreement/);
});

test('reject extra matching-prefix function even with expected security settings', async () => {
  const extra = '\nCREATE FUNCTION app_private.rental_unrelated() RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $$ BEGIN RETURN; END $$;';
  await assert.rejects(() => validate(draft + extra, manifest), /Manifest disagreement/);
});

test('reject extra table, policy, index and grant', async () => {
  for (const extra of [
    'CREATE TABLE public.rental_surprise(id uuid);',
    'CREATE POLICY rental_surprise ON tenancy.rental_contracts USING(true);',
    'CREATE INDEX rental_surprise ON tenancy.rental_contracts(id);',
    'GRANT SELECT ON tenancy.rental_contracts TO authenticated;',
  ]) await assert.rejects(() => validate(draft + '\n' + extra, manifest), /Manifest disagreement/);
});

test('reject unreviewed statement classes and argument types', async () => {
  await assert.rejects(() => validate(draft + '\nALTER ROLE contratpro_rental_writer LOGIN;', manifest), /Unreviewed statement/);
  await assert.rejects(() => validate(changed('p_agency uuid', 'p_agency public.surprise'), manifest), /Unreviewed type/);
});

test('reject manifest omissions, additional entries and owner/EXECUTE tampering', async () => {
  for (const mutate of [
    m => m.inventory.functions.pop(),
    m => m.inventory.functions.push(structuredClone(m.inventory.functions[0])),
    m => { m.inventory.privileges = []; },
  ]) {
    const altered = structuredClone(manifest);
    mutate(altered);
    await assert.rejects(() => validate(draft, altered), /Manifest disagreement/);
  }
});

test('even comment-only source drift requires explicit baseline review', async () => {
  await assert.rejects(() => validate(draft + '\n-- unreviewed revision\n', manifest), /Source hash disagreement|Manifest disagreement/);
});

test('inventory extraction never invents catalog ownership or resolves SQL dynamically', async () => {
  const actual = await inventory(draft);
  assert.equal(actual.control.filter(c => c.tag === 'DoStmt').length, 2);
  assert.ok(actual.functions.every(f => f.securityProvenance === 'CREATE_FUNCTION_STATIC_ONLY'));
  assert.ok(actual.functions.every(f => !('proposedFinalOwner' in f) && !('intendedExplicitExecuteGrantees' in f)));
  assert.ok(actual.tables.every(t => t.initialOwner === 'migration_executor_UNVERIFIED'));
  assert.equal(readFileSync(draftUrl, 'utf8'), draft);
});

test('security categories never promote dynamic intent or catalog identities to Production proof', async () => {
  const contract = await deriveContract(draft);
  assert.deepEqual(Object.keys(contract.security), ['declaredExpectations', 'staticallyVerified', 'productionOnly']);
  assert.equal(contract.security.staticallyVerified.ownershipSelection.exactDeclaredTargetSet, true);
  assert.equal(contract.security.staticallyVerified.ownershipSelection.status, 'EXPLICIT_TARGETS_RUNTIME_UNVERIFIED');
  assert.ok(Object.values(contract.security.productionOnly).every(value => value.startsWith('UNVERIFIED')));
  assert.ok(contract.existingDependencies.functions.every(f => f.returnType === 'UNVERIFIED'));
  assert.equal(contract.catalogEvidence.exportedRows, 2000);
  assert.equal(contract.catalogEvidence.rowsTotal, 2746);
  assert.equal(contract.catalogEvidence.complete, false);
  assert.deepEqual(contract.catalogEvidence.observedDependencyTables, contract.existingDependencies.tables);
  assert.deepEqual(contract.catalogEvidence.observedHelperSignatures, contract.existingDependencies.functions.map(f => f.signature));
});

test('key requirements come from SQL FK columns rather than a frozen key list', async () => {
  const original = await deriveContract(draft);
  const modified = await deriveContract(changed('REFERENCES tenancy.clients(agency_id,id)', 'REFERENCES tenancy.clients(id,agency_id)'));
  assert.deepEqual(original.existingDependencies.requiredExistingKeys.find(k => k.table === 'tenancy.clients').columns, ['agency_id', 'id']);
  assert.deepEqual(modified.existingDependencies.requiredExistingKeys.find(k => k.table === 'tenancy.clients').columns, ['id', 'agency_id']);
});

test('declared ownership/EXECUTE intent follows parsed templates, not hardcoded owner fields', async () => {
  const changedOwner = await deriveContract(changed('OWNER TO contratpro_rental_writer', 'OWNER TO authenticated'));
  assert.ok(changedOwner.security.declaredExpectations.every(f => f.finalOwner === 'authenticated'));
  assert.equal(changedOwner.security.productionOnly.actualFinalOwners, 'UNVERIFIED');
  const changedGrant = await deriveContract(changed('TO authenticated\',f.signature', 'TO service_role\',f.signature'));
  assert.ok(changedGrant.security.declaredExpectations.filter(f => f.signature.startsWith('public.'))
    .every(f => f.explicitExecuteGrantees[0] === 'service_role'));
  assert.equal(changedGrant.security.staticallyVerified.ownershipSelection.status, 'EXPLICIT_TARGETS_RUNTIME_UNVERIFIED');
});

const claimMutations = [
  ['incorrect ownership expectation', m => { m.security.declaredExpectations[0].finalOwner = 'authenticated'; }],
  ['incorrect EXECUTE expectation', m => { m.security.declaredExpectations[0].explicitExecuteGrantees = ['PUBLIC']; }],
  ['duplicate declared expectation', m => { m.security.declaredExpectations.push(m.security.declaredExpectations[0]); }],
  ['verified Production owner claim', m => { m.security.productionOnly.actualFinalOwners = 'VERIFIED'; }],
  ['runtime-certified target claim', m => { m.security.staticallyVerified.ownershipSelection.status = 'RUNTIME_VERIFIED'; }],
  ['changed static SECURITY flag', m => { m.security.staticallyVerified.functions[0].security = 'DEFINER'; }],
  ['missing security category', m => { delete m.security.productionOnly; }],
  ['extra security claim', m => { m.security.productionOnly.approved = true; }],
  ['boundary privilege claim', m => { m.boundaries.productionPermissions = 'VERIFIED'; }],
  ['boundary executor claim', m => { m.boundaries.migrationExecutor = 'postgres'; }],
  ['catalog privilege claim', m => { m.catalogEvidence.keyEligibilityOwnershipAndPrivileges = 'VERIFIED'; }],
  ['catalog completeness claim', m => { m.catalogEvidence.complete = true; }],
  ['catalog identity change', m => { m.catalogEvidence.observedHelperSignatures[0] = 'public.fake()'; }],
  ['unknown top-level metadata', m => { m.productionReady = true; }],
  ['parser metadata claim', m => { m.verification.parser = 'PostgreSQL 17 runtime verified'; }],
];
for (const [label, mutate] of claimMutations) {
  test(`reject unsupported metadata: ${label}`, async () => {
    const altered = structuredClone(manifest);
    mutate(altered);
    await assert.rejects(() => validate(draft, altered), /Security claim disagreement|Unsupported|Catalog evidence disagreement/);
  });
}

test('malformed catalog evidence cannot become verified dependency evidence', async () => {
  await assert.rejects(() => deriveContract(draft, '[]'), /Malformed catalog evidence/);
  await assert.rejects(() => deriveContract(draft, '[{"rows_total":2746}]'), /Malformed catalog evidence/);
});

const dependencyMutations = [
  ['wrong dependency table', m => { m.existingDependencies.tables[0] = 'identity.wrong_table'; }],
  ['wrong dependency schema', m => { m.existingDependencies.tables[0] = 'public.supabase_users'; }],
  ['wrong helper function signature', m => { m.existingDependencies.functions[0].signature = 'app_private.receipt_auth_uid(pg_catalog.text)'; }],
  ['missing required key', m => { m.existingDependencies.requiredExistingKeys.pop(); }],
  ['changed required key column order', m => { m.existingDependencies.requiredExistingKeys.find(k => k.columns.length === 2).columns.reverse(); }],
  ['extra dependency', m => { m.existingDependencies.tables.push('public.extra_table'); }],
  ['duplicate dependency', m => { m.existingDependencies.tables.push(m.existingDependencies.tables[0]); }],
  ['missing dependency', m => { m.existingDependencies.functions.pop(); }],
  ['malformed dependency', m => { m.existingDependencies.tables[0] = null; }],
  ['unknown dependency field', m => { m.existingDependencies.approved = true; }],
  ['missing dependency section', m => { delete m.existingDependencies; }],
  ['duplicate helper dependency', m => { m.existingDependencies.functions.push(m.existingDependencies.functions[0]); }],
  ['extra dependency schema', m => { m.existingDependencies.schemas.push('auth'); }],
  ['changed ACL subject', m => { m.existingDependencies.aclSubjects[0] = 'postgres'; }],
  ['unverified helper return type presented as fact', m => { m.existingDependencies.functions[0].returnType = 'pg_catalog.uuid'; }],
  ['dependency source reference changed', m => { m.existingDependencies.functions[0].source.startLine = 1; }],
];
for (const [label, mutate] of dependencyMutations) {
  test(`reject dependency metadata: ${label}`, async () => {
    const altered = structuredClone(manifest);
    mutate(altered);
    await assert.rejects(() => validate(draft, altered), /Dependency disagreement/);
  });
}
