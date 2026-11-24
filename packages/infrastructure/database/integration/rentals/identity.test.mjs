import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifyServer } from './safety.mjs';
import { diagnostic, stage } from './diagnostics.mjs';
import { requireReadiness } from './lifecycle.mjs';

const directory='C:\\Fixture\\owned-cluster\\data';
const valid={version:'170011',address:'127.0.0.1',port:54321,directory,database:'fixture',session_user:'postgres'};
const verify=row=>verifyServer(row,directory,'fixture',54321);
test('correct complete identity passes',()=>verify(valid));
for(const [field,value] of [['version','180000'],['address','127.0.0.2'],['port',54322],['directory','C:\\Fixture\\other\\data'],['database','other'],['session_user','other']]) {
  test(`wrong ${field} fails with exact field diagnostics`,()=>{
    assert.throws(()=>verify({...valid,[field]:value}),e=>e.code==='SERVER_IDENTITY_MISMATCH'&&e.identityComparisons.length===1&&e.identityComparisons[0].field===field&&e.identityComparisons[0].actual===String(value));
  });
}
test('Windows separators and dot segments normalize, but aliases and prefixes do not pass',()=>{
  verify({...valid,directory:'C:/Fixture/owned-cluster/tmp/../data'});
  for(const dir of ['C:/Fixture/owned-cluster/data-other','C:/FIXTUR~1/owned-cluster/data','Fixture/owned-cluster/data']) assert.throws(()=>verify({...valid,directory:dir}));
});
test('missing fields and malformed version fail closed',()=>{
  for(const field of Object.keys(valid)) {const row={...valid};delete row[field];assert.throws(()=>verify(row));}
  for(const version of [undefined,null,'NaN','170011garbage',NaN,Infinity]) assert.throws(()=>verify({...valid,version}));
  assert.throws(()=>verify(undefined)); assert.throws(()=>verify(null));
});
test('trusted SQL probe extracts host at source, not by permissive JS CIDR normalization',()=>{
  // Static boundary check only: PostgreSQL host(inet) execution is NOT tested here.
  const runner=readFileSync(new URL('./run.mjs',import.meta.url),'utf8');
  const probe=runner.match(/const identity = `([\s\S]*?)`;/)?.[1];
  assert.ok(probe);
  assert.match(probe,/host\(inet_server_addr\(\)\) AS address/);
  assert.doesNotMatch(probe,/inet_server_addr\(\)::text/);
  verify(valid); // expected bare-host result is accepted; no SQL is simulated.
});
for(const address of ['127.0.0.1/32','127.0.0.0/8','127.0.0.1/24','127.0.0.2/32','0.0.0.0/0','::1',undefined,null,'malformed','127.0.0.1 ']) {
  test(`strict address rejects ${String(address)}`,()=>{
    assert.throws(()=>verify({...valid,address}),e=>e.code==='SERVER_IDENTITY_MISMATCH'&&e.identityComparisons.length===1&&e.identityComparisons[0].field==='address');
  });
}
test('identity diagnostics survive report serialization with redaction',()=>{
  let error;
  try {verify({...valid,directory:'C:/Users/SyntheticPerson/other',database:'password=synthetic-secret'});}catch(e){error=e;}
  const details=diagnostic(error),serialized=JSON.stringify(details);
  assert.equal(details.code,'SERVER_IDENTITY_MISMATCH');
  assert.ok(!serialized.includes('SyntheticPerson'));assert.ok(!serialized.includes('synthetic-secret'));
  assert.match(serialized,/normalization/);assert.match(serialized,/verify-server-identity/);
});
test('probe failure preserves original code and does not retry or produce successful identity',async()=>{
  const report={status:'NOT_COMPLETED',cleanupFailures:[]};let calls=0;
  const original=Object.assign(new Error('probe unavailable'),{code:'ECONNREFUSED'});
  await assert.rejects(()=>stage(report,'setup','verify-server-readiness',()=>requireReadiness(async()=>{calls++;throw original;})),e=>e===original);
  assert.equal(calls,1);assert.equal(report.failure.code,'ECONNREFUSED');
});
