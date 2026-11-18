import test from 'node:test';
import assert from 'node:assert/strict';
import {assessA02LoggingEvidence} from './a02-logging-evidence.mjs';
const reviewedFixture=()=>({projectRef:'gllsiklbvqpxzucvkehw',provenance:{kind:'reviewed-read-only-capture',reference:'offline-fixture-not-live'},
  settings:{log_parameter_max_length:'0',log_parameter_max_length_on_error:'0','pgaudit.log_parameter':'off'},
  inspection:{targetVerified:true,tlsVerifyFullVerified:true,credentialTransportVerified:true,readOnly:true,rolledBack:true,deadlineVerified:true,overallDeadlineMs:20000},
  review:{verdict:'PASS',reference:'offline-review-only',providerLoggingCleared:true,clientRuntimeLoggingCleared:true,auditCoverageCleared:true}});
test('operator-observed -1/0/off is recorded configuration, not clearance or proof of actual leakage',()=>{
  const e={projectRef:'gllsiklbvqpxzucvkehw',provenance:{kind:'operator-report',reference:'offline-user-report'},
    settings:{log_parameter_max_length:'-1',log_parameter_max_length_on_error:'0','pgaudit.log_parameter':'off'},inspection:{readOnly:true,rolledBack:true}};
  const result=assessA02LoggingEvidence(e);assert.equal(result.status,'OBSERVED_NOT_CLEARED');assert.equal(result.configurationObserved,true);
  assert.ok(result.problems.includes('STATEMENT_PARAMETER_SUPPRESSION_NOT_PROVEN'));
  assert.ok(result.problems.includes('INSPECTION_CREDENTIALTRANSPORTVERIFIED_UNVERIFIED'));
  assert.ok(result.problems.includes('INSPECTION_20_SECOND_DEADLINE_UNVERIFIED'));
});
test('only complete reviewed synthetic evidence clears the conservative policy',()=>{
  assert.equal(assessA02LoggingEvidence(reviewedFixture()).status,'CLEARED');
  for(const mutate of [e=>e.provenance.kind='operator-report',e=>e.inspection.deadlineVerified=false,
    e=>e.inspection.overallDeadlineMs=21000,e=>e.inspection.credentialTransportVerified=false,
    e=>e.review.providerLoggingCleared=false,e=>e.review.reference='UNBOUND',e=>e.settings.log_parameter_max_length='-1',
    e=>e.settings.log_parameter_max_length_on_error='-1',e=>e.settings['pgaudit.log_parameter']='on']){
    const e=reviewedFixture();mutate(e);assert.equal(assessA02LoggingEvidence(e).status,'OBSERVED_NOT_CLEARED');
  }
});
test('zero-valued settings alone, missing data and a boolean clearance assertion never clear logging',()=>{
  for(const e of [undefined,{}, {parameterLoggingCleared:true}, {settings:reviewedFixture().settings},
    {...reviewedFixture(),review:{verdict:'PASS',reference:'offline-ref'}}])assert.equal(assessA02LoggingEvidence(e).status,'OBSERVED_NOT_CLEARED');
});
