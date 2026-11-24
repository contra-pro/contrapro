// OFFLINE DESIGN MODEL ONLY. No SQL generation/execution or database client.
// Fixture OIDs, ACLs and owners are synthetic; this is not PostgreSQL privilege validation.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { test } from 'node:test';
import { deriveContract, inventory } from '../manifests/rental-contracts-phase1a.mjs';

// Independently enumerated contract, deliberately not selected by LIKE or prefix.
const targets = [
  ['app_private.rental_member(pg_catalog.uuid)', 'pg_catalog.uuid', 'INVOKER'],
  ['app_private.rental_receipt_immutable()', 'pg_catalog.trigger', 'INVOKER'],
  ['app_private.rental_history_guard()', 'pg_catalog.trigger', 'INVOKER'],
  ['app_private.rental_price(pg_catalog.timestamptz,pg_catalog.timestamptz,pg_catalog.numeric,pg_catalog.numeric)', 'pg_catalog.int4', 'INVOKER'],
  ['app_private.rental_input(pg_catalog.jsonb)', 'pg_catalog.jsonb', 'INVOKER'],
  ['app_private.rental_number(pg_catalog.uuid,pg_catalog.timestamptz)', 'pg_catalog.int8', 'INVOKER'],
  ['app_private.rental_lock(pg_catalog.uuid,pg_catalog.uuid)', 'pg_catalog.void', 'INVOKER'],
  ['app_private.rental_available(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.uuid,pg_catalog.timestamptz,pg_catalog.timestamptz)', 'pg_catalog.void', 'INVOKER'],
  ['public.contratpro_rental_create(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.jsonb)', 'pg_catalog.jsonb', 'DEFINER'],
  ['public.contratpro_rental_detail(pg_catalog.uuid,pg_catalog.uuid)', 'pg_catalog.jsonb', 'DEFINER'],
  ['public.contratpro_rental_list(pg_catalog.uuid,pg_catalog.int4)', 'pg_catalog.jsonb', 'DEFINER'],
  ['app_private.rental_change(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.text,pg_catalog.jsonb)', 'pg_catalog.jsonb', 'INVOKER'],
  ['public.contratpro_rental_update_draft(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.jsonb)', 'pg_catalog.jsonb', 'DEFINER'],
  ['public.contratpro_rental_confirm(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid)', 'pg_catalog.jsonb', 'DEFINER'],
  ['public.contratpro_rental_start(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid)', 'pg_catalog.jsonb', 'DEFINER'],
  ['public.contratpro_rental_complete(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.bool)', 'pg_catalog.jsonb', 'DEFINER'],
  ['public.contratpro_rental_cancel(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid)', 'pg_catalog.jsonb', 'DEFINER'],
  ['public.contratpro_rental_extend(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.jsonb)', 'pg_catalog.jsonb', 'DEFINER'],
].map(([signature, returns, security]) => {
  const [name, args] = signature.slice(0, -1).split('(');
  const [schema, functionName] = name.split('.');
  return Object.freeze({ signature, schema, name: functionName, args: args ? args.split(',') : [], returns, security,
    nonOwnerExecute: schema === 'public' ? ['authenticated'] : [] });
});
const desiredOwner = 'contratpro_rental_writer';
const draft = readFileSync(new URL('../../../../supabase/migration-drafts/20261120001300_rental_contracts.sql', import.meta.url), 'utf8');
const settings = { search_path: ['pg_catalog', 'pg_temp'], row_security: 'on' };
const acl = grantee => ({ grantee, privilege: 'EXECUTE', grantOption: false });

function typeMap(types) {
  const map = new Map();
  const ids = new Set();
  for (const t of types) {
    if (!/^pg_catalog\.[a-z0-9_]+$/.test(t.identity) || !Number.isInteger(t.oid) || t.oid <= 0 ||
        map.has(t.identity) || ids.has(t.oid)) throw new Error('Invalid/duplicate type identity');
    map.set(t.identity, t.oid); ids.add(t.oid);
  }
  return map;
}
const requireType = (types, name) => {
  if (!types.has(name)) throw new Error(`Missing type: ${name}`);
  return types.get(name);
};
const key = f => JSON.stringify([f.schema, f.name, f.inputTypeOids]);
function catalogMap(catalog) {
  const map = new Map(); const ids = new Set();
  for (const f of catalog) {
    if (!Number.isInteger(f.oid) || f.oid <= 0 || !Array.isArray(f.inputTypeOids) ||
        f.inputTypeOids.some(o => !Number.isInteger(o) || o <= 0) || map.has(key(f)) || ids.has(f.oid)) throw new Error('Duplicate/invalid function identity');
    map.set(key(f), f); ids.add(f.oid);
  }
  return map;
}
function normalizedAcl(entries) {
  if (!Array.isArray(entries)) throw new Error('Missing explicit ACL snapshot');
  const seen = new Set();
  return entries.map(a => {
    if (!a || typeof a.grantee !== 'string' || a.privilege !== 'EXECUTE' || typeof a.grantOption !== 'boolean' ||
        !isDeepStrictEqual(Object.keys(a).sort(), ['grantee', 'privilege', 'grantOption'].sort())) throw new Error('Invalid ACL entry');
    const id = JSON.stringify(a);
    if (seen.has(id)) throw new Error('Duplicate ACL entry');
    seen.add(id); return id;
  }).sort();
}
const targetKey = (t, types) => key({ schema: t.schema, name: t.name,
  inputTypeOids: t.args.map(a => requireType(types, a)) });
function rejectUnexpectedOverloads(catalog, types) {
  const names = new Set(targets.map(t => `${t.schema}.${t.name}`));
  const keys = new Set(targets.map(t => targetKey(t, types)));
  if (catalog.some(f => names.has(`${f.schema}.${f.name}`) && !keys.has(key(f)))) throw new Error('Unexpected overload');
}
function assertAbsentBeforeCreation(catalog, typeCatalog) {
  const types = typeMap(typeCatalog), map = catalogMap(catalog);
  rejectUnexpectedOverloads(catalog, types);
  if (targets.some(t => map.has(targetKey(t, types)))) throw new Error('Pre-existing exact target');
}

// Produce descriptors only AFTER validating the entire target set. No mutation callbacks.
function scopePlan({ requested, catalog, typeCatalog, expectedCreator, initialAcls }) {
  if (!Array.isArray(requested) || new Set(requested).size !== requested.length) throw new Error('Duplicate requested target');
  if (!isDeepStrictEqual([...requested].sort(), targets.map(t => t.signature).sort())) throw new Error('Unexpected requested target set');
  if (typeof expectedCreator !== 'string' || !expectedCreator || expectedCreator === desiredOwner) throw new Error('Unverified creator identity');
  if (!isDeepStrictEqual(Object.keys(initialAcls ?? {}).sort(), [...requested].sort())) throw new Error('Incomplete approved ACL snapshots');
  const types = typeMap(typeCatalog), map = catalogMap(catalog);
  rejectUnexpectedOverloads(catalog, types);
  const operations = targets.map(t => {
    const f = map.get(targetKey(t, types));
    if (!f) throw new Error(`Missing target: ${t.signature}`);
    if (f.owner !== expectedCreator) throw new Error(`Incorrect owner: ${t.signature}`);
    if (f.kind !== 'f' || f.security !== t.security || f.returnTypeOid !== requireType(types, t.returns) ||
        !isDeepStrictEqual(f.settings, settings)) throw new Error(`Unexpected function properties: ${t.signature}`);
    if (!isDeepStrictEqual(normalizedAcl(f.nonOwnerAcl), normalizedAcl(initialAcls[t.signature]))) throw new Error('Unapproved initial EXECUTE grants');
    return { oid: f.oid, signature: t.signature, changeOwnerTo: desiredOwner,
      nonOwnerExecute: [...t.nonOwnerExecute] };
  });
  return { simulationOnly: true, authority: 'UNVERIFIED_NOT_SIMULATED', operations };
}

function checkProjectedResult(before, after, plan) {
  if (!plan.simulationOnly) throw new Error('Not a simulation');
  const beforeMap = catalogMap(before), afterMap = catalogMap(after);
  if (beforeMap.size !== afterMap.size) throw new Error('Function set changed');
  const actions = new Map(plan.operations.map(o => [o.oid, o]));
  if (actions.size !== 18 || new Set(plan.operations.map(o => o.signature)).size !== 18) throw new Error('Incomplete/duplicate plan');
  for (const action of plan.operations) {
    const target = targets.find(t => t.signature === action.signature);
    const old = before.find(f => f.oid === action.oid);
    if (!target || !old || old.schema !== target.schema || old.name !== target.name ||
        action.changeOwnerTo !== desiredOwner || !isDeepStrictEqual(action.nonOwnerExecute, target.nonOwnerExecute)) throw new Error('Unauthorized plan');
  }
  for (const [identity, old] of beforeMap) {
    const next = afterMap.get(identity), action = actions.get(old.oid);
    if (!next || next.oid !== old.oid) throw new Error('Function identity replaced');
    if (!action) {
      if (!isDeepStrictEqual(old, next)) throw new Error('Unrelated function changed');
    } else {
      const expected = { ...old, owner: desiredOwner, nonOwnerAcl: action.nonOwnerExecute.map(acl) };
      if (!isDeepStrictEqual(next, expected)) throw new Error('Unauthorized projected owner/EXECUTE/property change');
    }
  }
}

function fixture() {
  const types = [...new Set(targets.flatMap(t => [...t.args, t.returns]))]
    .map((identity, i) => ({ identity, oid: 500000 + i })); // SYNTHETIC, not PG type OIDs.
  const map = typeMap(types);
  const catalog = targets.map((t, i) => ({ oid: 700000 + i, schema: t.schema, name: t.name,
    inputTypeOids: t.args.map(a => map.get(a)), returnTypeOid: map.get(t.returns), kind: 'f',
    security: t.security, settings: structuredClone(settings), owner: 'fixture_executor',
    nonOwnerAcl: [acl('PUBLIC')], bodyStamp: `synthetic-body-${i}` }));
  const unrelated = { ...structuredClone(catalog[0]), oid: 800000, name: 'rental_existing_unrelated', owner: 'fixture_unrelated_owner' };
  catalog.push(unrelated);
  return { requested: targets.map(t => t.signature), typeCatalog: types, catalog,
    expectedCreator: 'fixture_executor', initialAcls: Object.fromEntries(targets.map(t => [t.signature, [acl('PUBLIC')]])) };
}
function projected(f, plan) {
  const copy = structuredClone(f.catalog);
  for (const action of plan.operations) {
    const item = copy.find(r => r.oid === action.oid);
    item.owner = action.changeOwnerTo; item.nonOwnerAcl = action.nonOwnerExecute.map(acl);
  }
  return copy;
}

test('explicit eighteen-signature design matches both draft declarations and manifest', async () => {
  const sql = readFileSync(new URL('../../../../supabase/migration-drafts/20261120001300_rental_contracts.sql', import.meta.url), 'utf8');
  const manifest = JSON.parse(readFileSync(new URL('../manifests/rental-contracts-phase1a.json', import.meta.url), 'utf8'));
  const actual = await inventory(sql);
  const shape = f => [f.signature, f.returns, f.security];
  assert.deepEqual(actual.functions.map(shape), targets.map(shape));
  assert.deepEqual(manifest.inventory.functions.map(shape), targets.map(shape));
});
test('matching-prefix unrelated function is never selected or changed', () => {
  const f = fixture(), before = structuredClone(f);
  const unrelated = f.catalog.at(-1);
  assertAbsentBeforeCreation([unrelated], f.typeCatalog);
  const plan = scopePlan(f);
  assert.equal(plan.operations.length, 18);
  assert.ok(!plan.operations.some(o => o.oid === unrelated.oid));
  assert.equal(plan.authority, 'UNVERIFIED_NOT_SIMULATED');
  const after = projected(f, plan);
  checkProjectedResult(f.catalog, after, plan);
  assert.deepEqual(after.at(-1), unrelated);
  assert.deepEqual(f, before);
});
test('actual SQL allowlist drives only the eighteen exact synthetic actions', async () => {
  const contract = await deriveContract(draft);
  const selection = contract.security.staticallyVerified.ownershipSelection;
  assert.equal(selection.kind, 'EXPLICIT_SIGNATURE_ALLOWLIST');
  const f = fixture();
  f.requested = selection.targets.map(t => t.signature);
  const plan = scopePlan(f);
  assert.deepEqual(plan.operations.map(o => o.signature), targets.map(t => t.signature));
  assert.ok(!plan.operations.some(o => o.oid === f.catalog.at(-1).oid));
});
function mutateOwnership(change) {
  const match = draft.match(/DO \$ownership\$([\s\S]*?)END \$ownership\$;/);
  assert.ok(match);
  const replacement = change(match[1]);
  assert.notEqual(replacement, match[1], 'Mutation did not alter ownership SQL');
  return draft.replace(match[0], `DO $ownership$${replacement}END $ownership$;`);
}
for (const [label, change] of [
  ['missing allowlist row', body => body.split('\n').filter(line => !line.includes("('app_private.rental_member(pg_catalog.uuid)',")).join('\n')],
  ['duplicate target', body => body.replace("'app_private.rental_history_guard()'", "'app_private.rental_receipt_immutable()'")],
  ['unrelated matching-prefix ownership target', body => body.replace("'app_private.rental_member(pg_catalog.uuid)'", "'app_private.rental_existing_unrelated()'")],
  ['unexpected overload target', body => body.replace("'app_private.rental_member(pg_catalog.uuid)'", "'app_private.rental_member(pg_catalog.text)'")],
  ['wrong security expectation', body => body.replace("'pg_catalog.trigger',false", "'pg_catalog.trigger',true")],
  ['wildcard catalog selector', body => body.replace(/FOR f IN SELECT \* FROM \(VALUES[\s\S]*?\n LOOP/, "FOR f IN SELECT p.oid FROM pg_catalog.pg_proc p WHERE p.proname LIKE 'rental%'\n LOOP")],
  ['catalog action loop replacing validated array', body => body.replace('FROM pg_catalog.unnest(target_signatures) WITH ORDINALITY AS s(signature,ordinality)', 'FROM pg_catalog.pg_proc AS s(signature,ordinality)')],
]) test(`reject ownership SQL: ${label}`, async () => {
  await assert.rejects(() => deriveContract(mutateOwnership(change)), /Exact ownership target set disagreement|Unsupported exact ownership/);
});
test('SQL validates complete set before DDL and retains fail-closed identity/ACL assertions', () => {
  const body = draft.match(/DO \$ownership\$([\s\S]*?)END \$ownership\$;/)[1];
  const firstDdl = body.indexOf("EXECUTE format('REVOKE");
  assert.ok(body.indexOf('pg_catalog.cardinality(target_oids)<>18') < firstDdl);
  for (const marker of ['target_oid=ANY(target_oids)', 'p.oid<>target_oid', "p.prokind='f'", 'p.proowner=executor_oid',
    'p.proowner=writer_oid', 'p.proargnames IS NOT DISTINCT FROM f.argument_names', 'Final function ACL boundary mismatch']) assert.ok(body.includes(marker));
  assert.doesNotMatch(body, /\bLIKE\b|\bSET\s+(?:LOCAL\s+)?ROLE\b/);
  assert.match(draft, /RAISE EXCEPTION 'LOCAL DESIGN ONLY/);
  assert.match(draft, /ROLLBACK;\s*$/);
});
test('pre-existing exact target aborts pre-creation, not reused', () => {
  const f = fixture();
  assert.throws(() => assertAbsentBeforeCreation(f.catalog, f.typeCatalog), /Pre-existing exact target/);
});
const invalidFixtures = [
  ['missing target', f => { f.catalog.splice(17, 1); }, /Missing target/],
  ['duplicate requested target', f => { f.requested[17] = f.requested[0]; }, /Duplicate requested/],
  ['extra requested target', f => { f.requested.push('app_private.rental_existing_unrelated()'); }, /Unexpected requested/],
  ['substituted requested target', f => { f.requested[17] = 'public.unrelated()'; }, /Unexpected requested/],
  ['duplicate catalog identity', f => { f.catalog.push(structuredClone(f.catalog[0])); }, /Duplicate\/invalid/],
  ['duplicate target OID', f => { f.catalog[1].oid = f.catalog[0].oid; }, /Duplicate\/invalid/],
  ['incorrect owner', f => { f.catalog[17].owner = 'fixture_attacker'; }, /Incorrect owner/],
  ['missing creator evidence', f => { delete f.expectedCreator; }, /Unverified creator/],
  ['procedure replacing function', f => { f.catalog[0].kind = 'p'; }, /Unexpected function properties/],
  ['wrong return type', f => { f.catalog[0].returnTypeOid = 999999; }, /Unexpected function properties/],
  ['unsafe definer setting', f => { f.catalog[8].settings.row_security = 'off'; }, /Unexpected function properties/],
  ['private function made definer', f => { f.catalog[0].security = 'DEFINER'; }, /Unexpected function properties/],
  ['unexpected initial grant', f => { f.catalog[0].nonOwnerAcl.push(acl('fixture_attacker')); }, /Unapproved initial/],
  ['unexpected initial grant option', f => { f.catalog[0].nonOwnerAcl[0].grantOption = true; }, /Unapproved initial/],
  ['missing approved ACL snapshot', f => { delete f.initialAcls[f.requested[0]]; }, /Incomplete approved/],
  ['duplicate type mapping', f => { f.typeCatalog.push(structuredClone(f.typeCatalog[0])); }, /Invalid\/duplicate type/],
  ['missing type identity', f => { f.typeCatalog.shift(); }, /Missing type/],
];
for (const [label, mutate, error] of invalidFixtures) test(`fail closed: ${label}`, () => {
  const f = fixture(); mutate(f); const before = structuredClone(f);
  assert.throws(() => scopePlan(f), error);
  assert.deepEqual(f, before); // Late validation failures never mutate earlier targets.
});
test('unexpected overload is untouched because the entire scope check aborts', () => {
  const f = fixture();
  const overload = { ...structuredClone(f.catalog[0]), oid: 900000, inputTypeOids: [] };
  f.catalog.push(overload); const before = structuredClone(f.catalog);
  assert.throws(() => scopePlan(f), /Unexpected overload/);
  assert.throws(() => assertAbsentBeforeCreation([overload], f.typeCatalog), /Unexpected overload/);
  assert.deepEqual(f.catalog, before);
});
test('a tampered plan cannot authorize private EXECUTE exposure', () => {
  const f = fixture(), plan = scopePlan(f);
  plan.operations[0].nonOwnerExecute = ['authenticated'];
  assert.throws(() => checkProjectedResult(f.catalog, projected(f, plan), plan), /Unauthorized plan/);
});
for (const [label, mutate] of [
  ['private EXECUTE granted to authenticated', a => { a[0].nonOwnerAcl = [acl('authenticated')]; }],
  ['public EXECUTE granted to PUBLIC', a => { a[8].nonOwnerAcl.push(acl('PUBLIC')); }],
  ['EXECUTE with grant option', a => { a[8].nonOwnerAcl[0].grantOption = true; }],
  ['wrong final owner', a => { a[0].owner = 'fixture_executor'; }],
  ['unrelated pre-existing owner changed', a => { a.at(-1).owner = desiredOwner; }],
  ['unrelated pre-existing ACL changed', a => { a.at(-1).nonOwnerAcl = []; }],
  ['target body changed', a => { a[0].bodyStamp = 'different'; }],
  ['target OID replaced', a => { a[0].oid = 999000; }],
]) test(`reject projected result: ${label}`, () => {
  const f = fixture(), plan = scopePlan(f), after = projected(f, plan);
  mutate(after);
  assert.throws(() => checkProjectedResult(f.catalog, after, plan), /Unauthorized projected|Unrelated function|identity replaced/);
});
