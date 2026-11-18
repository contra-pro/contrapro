/** Offline packet checks only: no execution, credentials, clocks captured or writes. */
import {readFile,readdir,lstat,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {assessA02LoggingEvidence} from './a02-logging-evidence.mjs';
import {assessA02StatePolicy} from './a02-state-acceptance.mjs';
const base=new URL('../',import.meta.url);
const blocked=()=>{throw Error('A02_PACKET_BLOCKED');};
const nominations=['17eaeec9-37e1-4720-ba7a-c1e16f659af5','305fb936-588e-42f9-bc4d-f41a0d3f60c0','f7334db7-f402-4f00-9c1a-754eb3eb2f3e'];
const versions=['20261117000100','20261117000200','20261117000300'];
const approvalPath='docs/canonical-acceptance/a02-temporary/option-b-policy-approval.json';
const proposalPath='docs/canonical-acceptance/a02-temporary/option-b-state-based-acceptance.PROPOSAL.md';
const riskIds=['STATE_NOT_REQUEST_FINALITY','STABLE_SNAPSHOTS_NOT_DRAIN','LATE_WRITES_AND_RECREATION',
  'ADOPTION_NOT_TRANSACTION_RECEIPT','SCOPED_VISIBILITY_LIMITS','SAME_OWNER_OBSERVATION','DRIFT_AND_OPERATIONAL_ASSUMPTIONS','DEVELOPMENT_SYNTHETIC_SCOPE_ONLY'];
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.split(',').sort().join();
/** Validate a recorded operator decision, not a signature, authority proof or live clearance. */
export function assessA02OptionBApproval(a,proposalSha256){
  if(!exact(a,'schemaVersion,decision,target,scope,proposal,residualRisks,approvalSource,approvalTime,gate2ExecutionAuthorized,provisioningActivationAuthorized,authorizedLiveOperations')
    ||a.schemaVersion!==1||a.decision!=='APPROVED_OPTION_B_POLICY_ONLY'
    ||!exact(a.target,'projectRef,environment')||a.target.projectRef!=='gllsiklbvqpxzucvkehw'||a.target.environment!=='development'
    ||a.scope!=='state-based acceptance for the synthetic A02 cohort'
    ||!exact(a.proposal,'path,sha256')||a.proposal.path!==proposalPath||!/^[0-9a-f]{64}$/.test(proposalSha256)||a.proposal.sha256!==proposalSha256
    ||!Array.isArray(a.residualRisks)||a.residualRisks.length!==riskIds.length
    ||a.residualRisks.some((r,i)=>!exact(r,'id,accepted,statement')||r.id!==riskIds[i]||r.accepted!==true||typeof r.statement!=='string'||!r.statement.trim()||r.statement.length>1200)
    ||!exact(a.approvalSource,'kind,statement,independentlyAttested')||a.approvalSource.kind!=='operator-reported-conversation-statement'
    ||a.approvalSource.statement!=='Explicit operator approval in this conversation, as reported by the operator in A02 Check 8; policy and documented residual risks only.'
    ||a.approvalSource.independentlyAttested!==false||a.approvalTime!=='UNVERIFIED'
    ||a.gate2ExecutionAuthorized!==false||a.provisioningActivationAuthorized!==false
    ||!Array.isArray(a.authorizedLiveOperations)||a.authorizedLiveOperations.length!==0)blocked();
  return {status:'RECORDED_POLICY_ONLY',provenance:'OPERATOR_REPORTED_NOT_INDEPENDENTLY_ATTESTED',approvalTime:'UNVERIFIED',
    approvedForOfflineSelection:true,liveExecutionAuthorized:false,provisioningActivationAuthorized:false};
}
async function policyApproval(packet){
  const reference=packet.acceptancePolicy?.statePolicyApprovalReference;
  if(reference===undefined||reference==='UNBOUND')return {status:'UNBOUND',approvedForOfflineSelection:false,liveExecutionAuthorized:false};
  const bytes=await readFile(new URL(approvalPath,base));
  const sha256=createHash('sha256').update(bytes).digest('hex');
  if(bytes.length>16384||reference!==`${approvalPath}#sha256:${sha256}`||packet.sourceArtifactSha256?.[approvalPath]!==sha256)blocked();
  const proposalSha256=createHash('sha256').update(await readFile(new URL(proposalPath,base))).digest('hex');
  return {...assessA02OptionBApproval(JSON.parse(bytes),proposalSha256),reference,sha256};
}
const instant=value=>{
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value))blocked();
  const ms=Date.parse(value);
  if(!Number.isSafeInteger(ms)||new Date(ms).toISOString()!==value)blocked();
  return ms;
};
export function checkA02Timing({start,end,expiry},now){
  const s=instant(start),e=instant(end),x=instant(expiry);
  if(!Number.isSafeInteger(now)||start.slice(0,10)!=='2026-11-17'
    ||e-s!==120*60000||now<s||now>=e||x<=now||x>e||x-now>15*60000)blocked();
  return {windowMinutes:120,expiry,liveExecutionAuthorized:false};
}
export async function validateA02Packet(packet,{now}={}){
  const b=packet.gate2Bindings;
  const acceptanceMode=packet.acceptancePolicy?.mode??'strict';
  if(!['strict','state-based-v1'].includes(acceptanceMode))blocked();
  const approval=await policyApproval(packet);
  const statePolicyBlockers=acceptanceMode==='state-based-v1'?[...assessA02StatePolicy(packet.acceptancePolicy?.policy).missing]:[];
  if(acceptanceMode==='state-based-v1'&&JSON.stringify(packet.acceptancePolicy?.policy?.loggingEvidence)!==JSON.stringify(packet.loggingEvidence))statePolicyBlockers.push('packetLoggingEvidenceBinding');
  if(acceptanceMode==='state-based-v1'){
    const p=packet.acceptancePolicy?.policy;
    if(!approval.approvedForOfflineSelection||p?.approvalReference!==approval.reference
      ||packet.independentEvidenceBindings?.statePolicyApprovalReference!==approval.reference)statePolicyBlockers.push('recordedPolicyApprovalBinding');
    if(!p||p.runReference!==b?.runReference||p.gate2Approval!==b?.gate2ApproverAndApprovalRecord
      ||p.start!==Date.parse(b?.authorizationWindowStartUtc)||p.end!==Date.parse(b?.authorizationWindowEndUtc)
      ||p.approvalReference!==packet.independentEvidenceBindings?.statePolicyApprovalReference)statePolicyBlockers.push('exactRunApprovalBinding');
    if(!Array.isArray(p?.operations)||p.operations.some(op=>op?.artifactSha256!==packet.sourceArtifactSha256?.[op?.operation==='auth-create'?'scripts/a02-auth-create.mjs':'scripts/a02-session-transport.mjs']))statePolicyBlockers.push('statePolicySourceBinding');
  }
  const stateSelected=acceptanceMode==='state-based-v1'&&statePolicyBlockers.length===0;
  if(packet.status!=='INCOMPLETE_UNBOUND_NOT_AUTHORIZED'||packet.liveExecutionAuthorized!==false||packet.target?.projectRef!=='gllsiklbvqpxzucvkehw'
    ||packet.target.environment!=='development'||packet.target.tlsMode!=='verify-full'
    ||packet.invariants.applicationProvisioningFlag!=='OFF'||packet.invariants.originalAuthenticatedExecute!=='DENIED throughout'
    ||packet.planningDecision?.durationMinutes!==120||packet.planningDecision?.executionDate!=='2026-11-17'
    ||[b?.authUuidA,b?.authUuidB,b?.authUuidU].join()!==nominations.join()
    ||[b?.installMigrationVersion,b?.reservedDisableMigrationVersion,b?.removalMigrationVersion].join()!==versions.join())blocked();
  const native=await readdir(new URL('supabase/migrations/',base));
  if(versions.some(version=>native.some(name=>name.startsWith(version+'_'))))blocked();
  const hashes=Object.entries(packet.sourceArtifactSha256||{});
  if(hashes.length<14)blocked();
  for(const [path,hash] of hashes){
    if(!/^(scripts|docs)\/[a-zA-Z0-9_./-]+$/.test(path)||path.split('/').includes('..'))blocked();
    if(createHash('sha256').update(await readFile(new URL(path,base))).digest('hex')!==hash)blocked();
  }
  const times=[b.authorizationWindowStartUtc,b.authorizationWindowEndUtc,b.wrapperExpiresAtUtc];
  if(times.some(x=>x!=='UNBOUND'))checkA02Timing({start:times[0],end:times[1],expiry:times[2]},now);
  const unbound=[];
  const walk=(v,path)=>{if(v==='UNBOUND')unbound.push(path);else if(v&&typeof v==='object')for(const [k,x]of Object.entries(v))walk(x,`${path}.${k}`);};
  walk(b,'gate2Bindings');
  for(const key of ['runReference','wrapperExpiresAtUtc','authorizationWindowStartUtc','authorizationWindowEndUtc',
    'renderedInstallSqlSha256','renderedDisableSqlSha256','renderedRemovalSqlSha256',
    'installPackageRoot','installPackageManifestSha256','disablePackageRoot','disablePackageManifestSha256',
    'removalPackageRoot','removalPackageManifestSha256','installationOperator','authCreationOperator',
    'sessionCustodian','independentObservationOperator','recoveryOperator','gate2ApproverAndApprovalRecord',
    'approvedSyntheticEmailDomain','domainOwnershipEvidenceReference','adminAuthoritySecureChannelReference',
    'authAdminExecutorArtifactAndHash','exactIdMappingObserverArtifactAndHash','writeAndBusinessDeltaObserverArtifactAndHash',
    'inFlightAndUnknownCommitObserverProcedure','observerStatementAndRequestListWithLimits','privateEvidenceReceiptLocation']){
    if(typeof b[key]!=='string'||!b[key].trim())unbound.push(`gate2Bindings.${key}`);
  }
  for(const key of ['executorReview','observerReview','adminChannelReview','privateEvidenceDestinationReview','inFlightEvidenceReview']){
    const value=packet.reviewBindings?.[key];
    if(typeof value!=='string'||!value.trim()||value==='UNBOUND')unbound.push(`reviewBindings.${key}`);
  }
  const reviewFailures=[];
  for(const key of ['executorReview','observerReview','adminChannelReview','privateEvidenceDestinationReview','inFlightEvidenceReview']){
    const verdict=packet.componentReviewVerdicts?.[key];
    if(verdict==='FAIL')reviewFailures.push(key);
    else if(verdict!=='PASS')unbound.push(`componentReviewVerdicts.${key}`);
  }
  for(const key of ['actualAbsoluteDirectory','ownershipReference','credentialChannelReference','destinationReference','executionManifest','observationManifest','permissionReceipt']){
    const value=packet.privateEvidence?.[key];
    if(typeof value!=='string'||!value.trim()||value==='UNBOUND')unbound.push(`privateEvidence.${key}`);
  }
  const evidenceKeys=stateSelected?['parameterLoggingReview','statePolicyApprovalReference','stateIntentLedgerReference','stateCaptureReviewReference']
    :['terminalReceiptSource','terminalSourceReview','terminalReceiptDirectory','parameterLoggingReview','authorityPolicyReference','operationLedgerReference'];
  for(const key of evidenceKeys){
    const value=packet.independentEvidenceBindings?.[key];
    if(typeof value!=='string'||!value.trim()||value==='UNBOUND')unbound.push(`independentEvidenceBindings.${key}`);
  }
  const liveVerificationRequired=[];
  for(const key of ['adminCredentialAuthority','serverParameterLogging','clientRuntimeLogging',...(stateSelected?['stateObservationSource']:['authTerminalSource','provisioningTerminalSource'])]){
    if(packet.securityVerification?.[key]!=='PASS')liveVerificationRequired.push(key);
  }
  const loggingAssessment=assessA02LoggingEvidence(packet.loggingEvidence);
  if(loggingAssessment.status!=='CLEARED'&&!liveVerificationRequired.includes('serverParameterLogging'))liveVerificationRequired.push('serverParameterLogging');
  if(packet.privateEvidence?.permissionVerification!=='PASS')unbound.push('privateEvidence.permissionVerification');
  if(packet.privateEvidence?.permissionVerification==='PASS'){
    const evidence=packet.privateEvidence;
    const names=['ownership-reference.json','credential-channel-reference.json','destination-reference.json','execution-manifest.json','observation-manifest.json'];
    if(typeof evidence.actualAbsoluteDirectory!=='string'||!/^[A-Za-z]:\\/.test(evidence.actualAbsoluteDirectory)
      ||Object.keys(evidence.filesSha256??{}).sort().join()!==names.toSorted().join())blocked();
    const root=await realpath(evidence.actualAbsoluteDirectory);
    const workspace=await realpath(fileURLToPath(base));
    if(root.toLowerCase()===workspace.toLowerCase()||root.toLowerCase().startsWith(workspace.toLowerCase()+'\\')
      ||(await lstat(evidence.actualAbsoluteDirectory)).isSymbolicLink())blocked();
    for(const name of names){
      const path=resolve(root,name);const stat=await lstat(path);
      if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16384
        ||createHash('sha256').update(await readFile(path)).digest('hex')!==evidence.filesSha256[name])blocked();
    }
  }
  return {offlineValidation:'PASS',executionReadiness:'FAIL_UNBOUND_OR_UNAUTHORIZED',liveExecutionAuthorized:false,
    acceptanceMode,requestFinality:'UNPROVEN',statePolicyBlockers,
    policyApproval:approval,
    statePolicyStatus:acceptanceMode==='strict'?'NOT_SELECTED':stateSelected?'BINDINGS_VALIDATED_NOT_AUTHORIZED':'BLOCKED',
    sourceHashesVerified:hashes.length,nominationsUnchanged:true,versionsReservedOnly:true,
    timing:times.every(x=>x==='UNBOUND')?'UNBOUND_NOT_CAPTURED':'VALIDATED_NOT_AUTHORIZED',
    privateEvidencePrivacy:packet.privateEvidence?.permissionVerification==='PASS'?'RECORDED_PASS_RECHECK_REQUIRED':'UNVERIFIED',loggingAssessment,reviewFailures,liveVerificationRequired,unbound};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const packet=JSON.parse(await readFile(new URL('docs/canonical-acceptance/a02-temporary/gate2-execution-packet.json',base),'utf8'));
    console.log(JSON.stringify(await validateA02Packet(packet,{now:Date.now()}),null,2));
  }catch{console.error('A02_PACKET_BLOCKED');process.exitCode=1;}
}
