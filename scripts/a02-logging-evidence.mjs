/** Pure offline assessment. Observed settings are not execution/logging clearance. */
const ref=x=>typeof x==='string'&&x===x.trim()&&x.length>0&&x!=='UNBOUND';
export function assessA02LoggingEvidence(evidence){
  const problems=[];const s=evidence?.settings??{},i=evidence?.inspection??{},r=evidence?.review??{};
  if(evidence?.projectRef!=='gllsiklbvqpxzucvkehw')problems.push('TARGET_NOT_VERIFIED');
  if(evidence?.provenance?.kind!=='reviewed-read-only-capture'||!ref(evidence?.provenance?.reference))problems.push('REVIEWED_CAPTURE_MISSING');
  // Conservative fail-closed policy. -1 is unlimited, NOT proof that logging occurred.
  if(s.log_parameter_max_length!=='0')problems.push('STATEMENT_PARAMETER_SUPPRESSION_NOT_PROVEN');
  if(s.log_parameter_max_length_on_error!=='0')problems.push('ERROR_PARAMETER_SUPPRESSION_NOT_PROVEN');
  if(s['pgaudit.log_parameter']!=='off')problems.push('AUDIT_PARAMETER_SUPPRESSION_NOT_PROVEN');
  for(const key of ['targetVerified','tlsVerifyFullVerified','credentialTransportVerified','readOnly','rolledBack','deadlineVerified'])
    if(i[key]!==true)problems.push(`INSPECTION_${key.toUpperCase()}_UNVERIFIED`);
  if(i.overallDeadlineMs!==20000)problems.push('INSPECTION_20_SECOND_DEADLINE_UNVERIFIED');
  if(r.verdict!=='PASS'||!ref(r.reference))problems.push('CLEARANCE_REVIEW_MISSING');
  for(const key of ['providerLoggingCleared','clientRuntimeLoggingCleared','auditCoverageCleared'])
    if(r[key]!==true)problems.push(`REVIEW_${key.toUpperCase()}_UNVERIFIED`);
  return {status:problems.length?'OBSERVED_NOT_CLEARED':'CLEARED',configurationObserved:Object.keys(s).length>0,problems};
}
