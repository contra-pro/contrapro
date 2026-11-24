// Two experimental native admission probes; no exports/application dependency.
import fs from 'node:fs';
import { types } from 'node:util';
import { fileURLToPath } from 'node:url';
const here = new URL('.', import.meta.url);
let getterCalls = 0, setterCalls = 0;
const bad = () => { throw Error('invalid-input'); };
const scalar = s => { for (const c of s) if (c.codePointAt(0) >= 0xd800 && c.codePointAt(0) <= 0xdfff) bad(); };
function leaf(v) {
  if (v === null) return { type: 'null' };
  if (typeof v === 'string') { scalar(v); return { type: 'string', value: v }; }
  if (typeof v === 'boolean') return { type: 'boolean', value: v };
  if (typeof v === 'bigint') return { type: 'bigint', decimal: v.toString() };
  if (typeof v === 'number' && Number.isFinite(v)) return { type: 'number', decimal: Object.is(v, -0) ? '-0' : String(v) };
  if (typeof v !== 'object') bad();
  return null;
}
// Path A: recursive active ancestry + per-property descriptors.
function admissionA(root) {
  const active = new WeakSet();
  function enter(v) {
    const primitive = leaf(v); if (primitive) return primitive;
    if (types.isProxy(v) || active.has(v)) bad();
    const array = Array.isArray(v);
    if (Object.getPrototypeOf(v) !== (array ? Array.prototype : Object.prototype)) bad();
    active.add(v); const keys = Reflect.ownKeys(v);
    let out;
    if (array) {
      if (keys.length !== v.length + 1) bad();
      out = { type: 'array', elements: [] };
      for (let i = 0; i < v.length; i++) { const p = Object.getOwnPropertyDescriptor(v, String(i)); if (!p?.enumerable || !('value' in p)) bad(); out.elements.push(enter(p.value)); }
    } else {
      out = { type: 'object', entries: [] };
      for (const k of keys) { if (typeof k !== 'string') bad(); scalar(k); const p = Object.getOwnPropertyDescriptor(v, k); if (!p.enumerable || !('value' in p)) bad(); out.entries.push([k, enter(p.value)]); }
    }
    active.delete(v); return out;
  }
  return enter(root);
}
// Path B: iterative enter/leave stack, whole descriptor table, ancestry list.
function admissionB(root) {
  const box = {}, stack = [{ value: root, parent: box, key: 'answer', ancestry: [] }];
  while (stack.length) {
    const task = stack.pop(), value = task.value;
    // Independent scalar admission: UTF-16 pair validation, not Path A's iterator.
    let primitive;
    if (value === null) primitive = { type: 'null' };
    else if (typeof value === 'boolean') primitive = { type: 'boolean', value };
    else if (typeof value === 'string') {
      for (let i = 0; i < value.length; i++) {
        const unit = value.charCodeAt(i);
        if (unit >= 0xd800 && unit <= 0xdbff) { const next = value.charCodeAt(++i); if (!(next >= 0xdc00 && next <= 0xdfff)) bad(); }
        else if (unit >= 0xdc00 && unit <= 0xdfff) bad();
      }
      primitive = { type: 'string', value };
    } else if (typeof value === 'number') { if (!Number.isFinite(value)) bad(); primitive = { type: 'number', decimal: Object.is(value, -0) ? '-0' : value.toString() }; }
    else if (typeof value === 'bigint') primitive = { type: 'bigint', decimal: String(value) };
    else if (typeof value !== 'object') bad();
    if (primitive) { task.parent[task.key] = primitive; continue; }
    if (types.isProxy(value) || task.ancestry.includes(value)) bad();
    const array = Array.isArray(value), proto = Object.getPrototypeOf(value);
    if ((array && proto !== Array.prototype) || (!array && proto !== Object.prototype)) bad();
    const descriptors = Object.getOwnPropertyDescriptors(value), keys = Reflect.ownKeys(descriptors);
    const out = array ? { type: 'array', elements: [] } : { type: 'object', entries: [] };
    task.parent[task.key] = out; const ancestry = [...task.ancestry, value];
    if (array) {
      if (keys.length !== descriptors.length.value + 1) bad();
      for (let i = descriptors.length.value - 1; i >= 0; i--) { const d = descriptors[i]; if (!d?.enumerable || !Object.hasOwn(d, 'value')) bad(); stack.push({ value: d.value, parent: out.elements, key: i, ancestry }); }
    } else {
      const entries = [];
      for (const k of keys) { if (typeof k === 'symbol') bad(); scalar(k); const d = descriptors[k]; if (!d.enumerable || !Object.hasOwn(d, 'value')) bad(); entries.push([k, d.value]); }
      out.entries = entries.map(([k]) => [k, null]);
      for (let i = entries.length - 1; i >= 0; i--) stack.push({ value: entries[i][1], parent: out.entries[i], key: 1, ancestry });
    }
  }
  return box.answer;
}
const cycle = {}; cycle.self = cycle;
const a = [], b = { a }; a.push(b);
const shared = Object.freeze({ x: 'é أ' });
const getter = {}; Object.defineProperty(getter, 'x', { enumerable: true, get() { getterCalls++; return 1; } });
const setter = {}; Object.defineProperty(setter, 'x', { enumerable: true, set(_) { setterCalls++; } });
const hidden = {}; Object.defineProperty(hidden, 'x', { value: 1 });
const symbolKey = { [Symbol('synthetic')]: 1 };
class SyntheticClass { constructor() { this.x = 1; } }
const cases = [
  ['plain-object', { x: 1, text: 'é بَشّ' }, true], ['plain-array', [null, true, -0, 9007199254740993n], true],
  ['frozen-object', Object.freeze({ x: null }), true], ['shared-no-cycle', { a: shared, b: shared }, true],
  ['valid-surrogate-pair', { text: '\ud83d\ude97' }, true],
  ['null-prototype', Object.assign(Object.create(null), { x: 1 }), false], ['custom-prototype', Object.assign(Object.create({ inherited: 1 }), { x: 1 }), false],
  ['class-instance', new SyntheticClass(), false], ['own-undefined', { x: undefined }, false], ['array-undefined', [undefined], false],
  ['non-enumerable', hidden, false], ['getter', getter, false], ['setter', setter, false], ['symbol-key', symbolKey, false],
  ['sparse-array', Array(2), false], ['array-extra-key', Object.assign([1], { extra: true }), false], ['array-hidden-key', Object.defineProperty([1], 'x', { value: 2 }), false],
  ['self-cycle', cycle, false], ['mixed-cycle', a, false], ['invalid-surrogate-value', { x: '\ud800' }, false], ['invalid-surrogate-key', { ['\udfff']: 1 }, false],
  ['date', new Date(0), false], ['map', new Map(), false], ['set', new Set(), false], ['typed-array', new Uint8Array(1), false],
  ['array-buffer', new ArrayBuffer(1), false], ['function', () => 1, false], ['symbol-value', Symbol('synthetic'), false], ['boxed-string', new String('x'), false],
  ['nan', NaN, false], ['infinity', Infinity, false], ['proxy', new Proxy({}, { ownKeys() { throw Error('Do not invoke trap'); } }), false],
];
const rows = [], acceptedVectors = [];
for (const [id, input, accept] of cases) {
  const outcomes = [admissionA, admissionB].map(fn => { try { return { status: 'admitted-unverified', ast: fn(input) }; } catch (e) { if (e.message !== 'invalid-input') throw e; return { status: 'invalid-input' }; } });
  if (JSON.stringify(outcomes[0]) !== JSON.stringify(outcomes[1]) || (outcomes[0].status === 'admitted-unverified') !== accept) throw Error('Native disagreement: ' + id);
  rows.push({ id, expected: accept ? 'admitted-unverified' : 'invalid-input', pathA: outcomes[0].status, pathB: outcomes[1].status,
    policyStatus: id === 'null-prototype' ? 'OPEN: strict ordinary-prototype interpretation tested; null-prototype acceptance is NOT decided' : 'PROPOSED', trust: 'unverified', canActivateSigned: false });
  if (accept) acceptedVectors.push({ id: 'native-' + id, sourceRows: ['V01', 'U10', 'N02'], kind: 'codec', input: outcomes[0].ast });
}
if (getterCalls || setterCalls) throw Error('Accessor invoked');
fs.writeFileSync(new URL('native-report.json', here), JSON.stringify({ status: 'CANDIDATE-NATIVE-BOUNDARY-CHECKED-NOT-APPROVED', environment: { node: process.version, openssl: process.versions.openssl, platform: process.platform }, rows, getterCalls, setterCalls,
  note: 'Two independently structured native-JS probes, not a Python claim about JS prototypes; Proxy rejection is an explicit candidate recommendation.', trust: 'unverified', canActivateSigned: false }, null, 2) + '\n');
fs.writeFileSync(new URL('native-accepted-inputs.json', here), JSON.stringify(acceptedVectors, null, 2) + '\n');
console.log(JSON.stringify({ nativeCases: rows.length, byteCases: acceptedVectors.length, accessorCalls: getterCalls + setterCalls }));
