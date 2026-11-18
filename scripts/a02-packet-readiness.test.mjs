import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkA02Timing,validateA02Packet,assessA02OptionBApproval} from './a02-packet-readiness.mjs';
const timing={start:'2026-11-17T12:00:00.000Z',end:'2026-11-17T14:00:00.000Z',expiry:'2026-11-17T12:15:00.000Z'};
const now=Date.parse(timing.start);
const packet=()=>readFile(new URL('../docs/canonical-acceptance/a02-temporary/gate2-execution-packet.json',import.meta.url),'utf8').then(JSON.parse);
const approval=()=>readFile(new URL('../docs/canonical-acceptance/a02-temporary/option-b-policy-approval.json',import.meta.url),'utf8').then(JSON.parse);
test('120-minute window accepts explicit <=15-minute wrapper expiry without authorization',()=>{
  assert.equal(checkA02Timing(timing,now).liveExecutionAuthorized,false);
});
test('window, date, UTC shape and wrapper lifetime cannot silently expand',()=>{
  for(const input of [{...timing,end:'2026-11-17T15:00:00.000Z'},{...timing,expiry:timing.end},
    {...timing,start:'2026-11-18T12:00:00.000Z'},{...timing,expiry:'2026-11-17T12:15:00+00:00'}])
    assert.throws(()=>checkA02Timing(input,now),/A02_PACKET_BLOCKED/);
  for(const clock of [now-1,Date.parse(timing.expiry),Date.parse(timing.end),NaN])
    assert.throws(()=>checkA02Timing(timing,clock),/A02_PACKET_BLOCKED/);
});
test('actual packet verifies hashes and reservations, leaves timing and execution blocked',async()=>{
  const result=await validateA02Packet(await packet());
  assert.equal(result.offlineValidation,'PASS');assert.equal(result.timing,'UNBOUND_NOT_CAPTURED');
  assert.equal(result.executionReadiness,'FAIL_UNBOUND_OR_UNAUTHORIZED');assert.ok(result.unbound.length>0);
});
test('target, gates, IDs, versions, hashes and partial timing fail closed',async()=>{
  for(const mutate of [p=>p.status='READY',p=>p.target.projectRef='other',p=>p.liveExecutionAuthorized=true,
    p=>p.invariants.applicationProvisioningFlag='ON',p=>p.invariants.originalAuthenticatedExecute='ALLOWED',
    p=>p.gate2Bindings.authUuidA=p.gate2Bindings.authUuidB,p=>p.gate2Bindings.installMigrationVersion='20261117000900',
    p=>p.sourceArtifactSha256['scripts/a02-private-input.mjs']='0'.repeat(64),
    p=>p.gate2Bindings.authorizationWindowStartUtc=timing.start]){
    const p=await packet();mutate(p);await assert.rejects(validateA02Packet(p,{now}),/A02_PACKET_BLOCKED/);
  }
});
test('omitted or blank mandatory references remain blockers; absent reviews cannot become READY',async()=>{
  const p=await packet();delete p.gate2Bindings.privateEvidenceReceiptLocation;p.gate2Bindings.adminAuthoritySecureChannelReference='';delete p.reviewBindings;
  const result=await validateA02Packet(p);
  for(const key of ['gate2Bindings.privateEvidenceReceiptLocation','gate2Bindings.adminAuthoritySecureChannelReference','reviewBindings.executorReview'])assert.ok(result.unbound.includes(key));
  assert.equal(result.executionReadiness,'FAIL_UNBOUND_OR_UNAUTHORIZED');
});
test('a proposed private path is not a verified destination or a review receipt',async()=>{
  const p=await packet();delete p.privateEvidence;
  const result=await validateA02Packet(p);
  assert.equal(result.privateEvidencePrivacy,'UNVERIFIED');
  assert.ok(result.unbound.includes('privateEvidence.permissionReceipt'));
  assert.ok(result.unbound.includes('privateEvidence.observationManifest'));
  assert.equal(result.executionReadiness,'FAIL_UNBOUND_OR_UNAUTHORIZED');
});
test('confirmed owner roles and completed offline reviews do not authorize execution',async()=>{
  const p=await packet();
  for(const role of ['installationOperator','recoveryOperator','authCreationOperator','sessionCustodian','independentObservationOperator'])assert.equal(p.gate2Bindings[role],'project owner');
  assert.equal(p.componentReviewVerdicts.executorReview,'PASS');
  assert.equal(p.componentReviewVerdicts.adminChannelReview,'PASS');
  assert.equal(p.gate2Bindings.gate2ApproverAndApprovalRecord,'UNBOUND');
  assert.equal(p.liveExecutionAuthorized,false);
});
test('failed reviews remain blockers and passing adapter reviews cannot fabricate live finality evidence',async()=>{
  const p=await packet();const result=await validateA02Packet(p);
  assert.ok(result.liveVerificationRequired.includes('adminCredentialAuthority'));
  assert.equal(p.componentReviewVerdicts.observerReview,'PASS');
  assert.equal(p.componentReviewVerdicts.inFlightEvidenceReview,'PASS');
  assert.ok(result.unbound.includes('independentEvidenceBindings.terminalReceiptSource'));
  p.componentReviewVerdicts.observerReview='FAIL';
  assert.ok((await validateA02Packet(p)).reviewFailures.includes('observerReview'));
  assert.equal(result.executionReadiness,'FAIL_UNBOUND_OR_UNAUTHORIZED');
});
test('prepared channels and reference strings cannot clear unverified logging or finality checks',async()=>{
  const p=await packet();
  for(const key of ['terminalReceiptSource','terminalSourceReview','terminalReceiptDirectory','parameterLoggingReview'])p.independentEvidenceBindings[key]='offline-reference-only';
  const result=await validateA02Packet(p);
  for(const key of ['adminCredentialAuthority','serverParameterLogging','clientRuntimeLogging','authTerminalSource','provisioningTerminalSource'])assert.ok(result.liveVerificationRequired.includes(key));
  assert.equal(result.executionReadiness,'FAIL_UNBOUND_OR_UNAUTHORIZED');
});
test('reported database settings and a flat PASS flag cannot clear deadline or credential transport evidence',async()=>{
  const p=await packet();assert.equal(p.loggingEvidence.settings.log_parameter_max_length,'-1');
  assert.equal(p.loggingEvidence.inspection.overallDeadlineMs,'UNVERIFIED');
  assert.equal(p.loggingEvidence.inspection.credentialTransportVerified,'UNVERIFIED');
  p.securityVerification.serverParameterLogging='PASS';const result=await validateA02Packet(p);
  assert.equal(result.loggingAssessment.status,'OBSERVED_NOT_CLEARED');
  assert.ok(result.liveVerificationRequired.includes('serverParameterLogging'));
});
test('bound private template hash changes fail without modifying private files',async()=>{
  const p=await packet();assert.equal(p.privateEvidence.permissionVerification,'PASS');
  p.privateEvidence.filesSha256['execution-manifest.json']='0'.repeat(64);
  await assert.rejects(validateA02Packet(p),/A02_PACKET_BLOCKED/);
});
test('original receipt reconciliation records exactly five three-way matches without authorizing Gate 2',async()=>{
  const receipt=JSON.parse(await readFile(new URL('../docs/canonical-acceptance/a02-temporary/gate2-final-offline-review.json',import.meta.url),'utf8'));
  assert.equal(receipt.originalReceiptComparison.status,'5/5 MATCH');
  assert.equal(receipt.originalReceiptComparison.files.length,5);
  for(const row of receipt.originalReceiptComparison.files){assert.equal(row.result,'MATCH');assert.equal(row.original,row.current);assert.equal(row.original,row.packet);}
  assert.equal(receipt.liveExecutionAuthorized,false);assert.equal(receipt.privateFilesModified,false);
});
test('prepared authoritative adapter cannot replace missing real authority policy or operation ledger',async()=>{
  const p=await packet();const result=await validateA02Packet(p);
  assert.ok(result.unbound.includes('independentEvidenceBindings.authorityPolicyReference'));
  assert.ok(result.unbound.includes('independentEvidenceBindings.operationLedgerReference'));
  assert.ok(result.liveVerificationRequired.includes('authTerminalSource'));
  assert.ok(result.liveVerificationRequired.includes('provisioningTerminalSource'));
  assert.equal(p.liveExecutionAuthorized,false);
});

test('state implementation presence cannot select Option B, waive logging or authorize the real packet',async()=>{
  const p=await packet();const r=await validateA02Packet(p);
  assert.equal(r.acceptanceMode,'strict');assert.equal(r.requestFinality,'UNPROVEN');
  p.acceptancePolicy={mode:'state-based-v1',policy:{approvalReference:'UNBOUND'}};
  const b=await validateA02Packet(p);assert.equal(b.acceptanceMode,'state-based-v1');assert.ok(b.statePolicyBlockers.length>0);
  assert.ok(b.liveVerificationRequired.includes('serverParameterLogging'));
  assert.equal(b.liveExecutionAuthorized,false);assert.equal(b.executionReadiness,'FAIL_UNBOUND_OR_UNAUTHORIZED');
  p.acceptancePolicy.mode='fallback';await assert.rejects(validateA02Packet(p),/A02_PACKET_BLOCKED/);
});

test('Check8 reported approval records policy only with UNVERIFIED time and no independent attestation',async()=>{
  const a=await approval();const r=assessA02OptionBApproval(a,a.proposal.sha256);
  assert.equal(r.status,'RECORDED_POLICY_ONLY');assert.equal(r.liveExecutionAuthorized,false);
  assert.equal(a.approvalTime,'UNVERIFIED');assert.equal(a.approvalSource.independentlyAttested,false);
  assert.equal(a.residualRisks.length,8);
});

test('Check8 rejects broadened authority, target drift, invented attestation/time or incomplete risk acceptance',async()=>{
  for(const mutate of [a=>a.target.projectRef='other',a=>a.target.environment='production',a=>a.gate2ExecutionAuthorized=true,
    a=>a.provisioningActivationAuthorized=true,a=>a.approvalTime=timing.start,a=>a.approvalSource.independentlyAttested=true,
    a=>a.signature='invented',a=>a.authorizedLiveOperations.push('SQL'),a=>a.residualRisks.pop(),a=>a.proposal.sha256='0'.repeat(64)]){
    const a=await approval(),expected=a.proposal.sha256;mutate(a);assert.throws(()=>assessA02OptionBApproval(a,expected),/A02_PACKET_BLOCKED/);
  }
});

test('Check8 actual approval binding does not select Option B or clear security/execution blockers',async()=>{
  const p=await packet();const r=await validateA02Packet(p);
  assert.equal(r.policyApproval.status,'RECORDED_POLICY_ONLY');assert.equal(r.acceptanceMode,'strict');
  assert.equal(r.statePolicyStatus,'NOT_SELECTED');assert.equal(r.executionReadiness,'FAIL_UNBOUND_OR_UNAUTHORIZED');
  assert.ok(r.liveVerificationRequired.includes('adminCredentialAuthority'));assert.equal(r.loggingAssessment.status,'OBSERVED_NOT_CLEARED');
  assert.equal(p.gate2Bindings.gate2ApproverAndApprovalRecord,'UNBOUND');
});

test('Check8 approval reference/hash tampering fails closed without touching the record',async()=>{
  for(const value of ['docs/canonical-acceptance/a02-temporary/option-b-policy-approval.json#sha256:'+'0'.repeat(64),'../other.json#sha256:'+'0'.repeat(64)]){
    const p=await packet();p.acceptancePolicy.statePolicyApprovalReference=value;
    await assert.rejects(validateA02Packet(p),/A02_PACKET_BLOCKED/);
  }
});

test('Check8 explicit offline state selection recognizes policy approval while missing run/security data stays BLOCKED',async()=>{
  const p=await packet();p.acceptancePolicy.mode='state-based-v1';const r=await validateA02Packet(p);
  assert.equal(r.policyApproval.status,'RECORDED_POLICY_ONLY');assert.equal(r.statePolicyStatus,'BLOCKED');
  assert.ok(r.statePolicyBlockers.length>0);assert.equal(r.liveExecutionAuthorized,false);
  assert.ok(r.liveVerificationRequired.includes('serverParameterLogging'));
});
