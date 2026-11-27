import assert from 'node:assert/strict';import {createHmac,randomBytes} from 'node:crypto';import {id,people} from './baseline.mjs';
export async function request(client,person,sql,args=[],role='authenticated'){
 await client.query('BEGIN');try{await client.query(role==='anon'?'SET LOCAL ROLE anon':'SET LOCAL ROLE authenticated');await client.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true),set_config('request.jwt.claims',$3,true)",[person.sub,role,JSON.stringify({sub:person.sub,role,iss:'https://gllsiklbvqpxzucvkehw.supabase.co/auth/v1',aud:'authenticated',is_anonymous:false,exp:Math.floor(Date.now()/1000)+3600})]);const r=await client.query(sql,args);await client.query('COMMIT');return r.rows[0]?.value;}catch(e){await client.query('ROLLBACK');throw e;}
}
export async function denied(operation,codes=['42501','P0002']){await assert.rejects(operation,e=>codes.includes(e.code));}
export async function concurrency(sessions){const pids=[];for(const c of sessions)pids.push((await c.query('SELECT pg_backend_pid() pid')).rows[0].pid);assert.equal(new Set(pids).size,sessions.length);await sessions[0].query('BEGIN');try{await sessions[0].query('SELECT pg_advisory_xact_lock(1129337680,202611)');const contender=await sessions[1].query('SELECT pg_try_advisory_xact_lock(1129337680,202611) acquired');assert.equal(contender.rows[0].acquired,false);await sessions[2].query('SELECT 1 AS observer');}finally{await sessions[0].query('ROLLBACK');}return {independentSessions:pids.length,contenderRefused:true};}
export async function runStage(stage,c){const {admin,a,b,a2,state}=c,A=people[0],B=people[1],call=(sql,args=[],person=A,client=a)=>request(client,person,sql,args),key=()=>id(++state.counter);
 const documents=(action,input={})=>call('SELECT public.contratpro_documents($1,$2,$3::jsonb) value',[A.agency,action,JSON.stringify(input)]);
 async function gateway(module,action,input={},isPublic=false){const payload=JSON.stringify({agencyId:isPublic&&module!=='sheets'?null:A.agency,action,input}),mac=createHmac('sha256',Buffer.from(state[module+'Secret'],'hex')).update(payload).digest('hex');const names={signing:isPublic?'public.contratpro_signing_public':'public.contratpro_signing_agency',delivery:isPublic?'public.contratpro_delivery_worker':'public.contratpro_delivery_agency',sheets:isPublic?'public.contratpro_sheets_worker':'public.contratpro_sheets_agency'};return request(a,A,`SELECT ${names[module]}($1,$2) value`,[payload,mac],isPublic?'anon':'authenticated');}
 if(stage==='0013'){
  await denied(()=>call('SET LOCAL ROLE postgres'),['42501']);
  state.client=await call('SELECT public.contratpro_client_create($1,$2,$3::jsonb) value',[A.agency,key(),JSON.stringify({firstName:'D2',lastName:'Synthetic',phone:'+212600000000',email:'',nationality:'',identityType:'none',identityNumber:'',licenceNumber:'',licenceIssueDate:'',licenceExpiryDate:'',address:'',city:'',notes:''})]);
  state.vehicle=await call('SELECT public.contratpro_vehicle_create($1,$2,$3::jsonb) value',[A.agency,key(),JSON.stringify({registration:'D2-NATIVE-1',make:'Synthetic',model:'Native',year:'2026',mileage:'0'})]);
  const details={clientId:state.client,vehicleId:state.vehicle,start:new Date(Date.now()-300000).toISOString(),end:new Date(Date.now()+3600000).toISOString(),dailyRateMinor:10000};
  const rental=await call('SELECT public.contratpro_rental_create($1,$2,$3::jsonb) value',[A.agency,key(),JSON.stringify(details)]);assert(rental.id);state.lifecycleRental=rental.id;
  await denied(()=>request(b,B,'SELECT public.contratpro_rental_detail($1,$2) value',[A.agency,rental.id]));
  await call('SELECT public.contratpro_rental_confirm($1,$2,1,$3) value',[A.agency,rental.id,key()]);
  const row=(await admin.query('SELECT number_serial,version FROM tenancy.rental_contracts WHERE id=$1',[rental.id])).rows[0];assert(row.number_serial);assert.equal(row.version,2);
  await call('SELECT public.contratpro_rental_start($1,$2,2,$3) value',[A.agency,rental.id,key()]);
  await call('SELECT public.contratpro_rental_complete($1,$2,3,$3,true) value',[A.agency,rental.id,key()]);
  await denied(()=>call('SELECT * FROM app_private.rental_creation_receipts'),['42501']);
 }
 if(stage==='0016'){
  state.rendererSecret=randomBytes(32).toString('hex');await admin.query('INSERT INTO app_private.document_renderer_key(secret) VALUES($1)',[state.rendererSecret]);
  state.checksum='a'.repeat(64);state.template=key();state.templateVersion=key();const objectKey=`${A.agency}/originals/${state.template}/${state.checksum}.pdf`;
  await documents('reserve',{key:objectKey,checksum:state.checksum,kind:'originals',templateId:state.template});
  await call("INSERT INTO storage.objects(bucket_id,name) VALUES('contract-documents',$1) RETURNING true value",[objectKey]);
  await denied(()=>request(b,B,"INSERT INTO storage.objects(bucket_id,name) VALUES('contract-documents',$1) RETURNING true value",[objectKey]));
  await documents('save',{templateId:state.template,id:state.templateVersion,expectedRevision:0,name:'D2 synthetic PDF metadata',format:'pdf',originalKey:objectKey,checksum:state.checksum,config:{locale:'fr',custom:[],mappings:[],signatures:[{party:'agency',page:1,x:20,y:700,width:200,height:30},{party:'client',page:1,x:300,y:700,width:200,height:30}]}});
  await documents('default',{templateId:state.template});
  const start=new Date(Date.now()+86400000*30),r=await call('SELECT public.contratpro_rental_create($1,$2,$3::jsonb) value',[A.agency,key(),JSON.stringify({clientId:state.client,vehicleId:state.vehicle,start:start.toISOString(),end:new Date(+start+86400000).toISOString(),dailyRateMinor:10000})]);state.documentRental=r.id;
  await documents('select',{rentalId:r.id,templateVersionId:state.templateVersion});await call('SELECT public.contratpro_rental_confirm($1,$2,1,$3) value',[A.agency,r.id,key()]);
  const generation={requestId:key(),rentalId:r.id,rentalVersion:2,templateVersionId:state.templateVersion,status:'issued',issueDate:new Date().toISOString().slice(0,10),custom:{}};await documents('begin',generation);state.artifactKey=`${A.agency}/issued/${generation.requestId}/${state.checksum}.pdf`;
  await documents('reserve',{key:state.artifactKey,checksum:state.checksum,kind:'issued',requestId:generation.requestId});
  const attestation=createHmac('sha256',Buffer.from(state.rendererSecret,'hex')).update([A.agency,generation.requestId,state.artifactKey,state.checksum,state.checksum].join('|')).digest('hex');
  state.artifact=await documents('finish',{requestId:generation.requestId,key:state.artifactKey,checksum:state.checksum,sourceChecksum:state.checksum,attestation});assert.equal(state.artifact.checksum,state.checksum);
  await denied(()=>request(b,B,'SELECT public.contratpro_documents($1,$2,$3::jsonb) value',[B.agency,'artifact',JSON.stringify({id:state.artifact.id})]));
 }
 if(stage==='0017'){
  state.signingSecret=randomBytes(32).toString('hex');await admin.query('INSERT INTO app_private.signing_gateway_key(secret) VALUES($1)',[state.signingSecret]);state.session=key();
  const created=await gateway('signing','create',{artifactId:state.artifact.id,requestId:state.session,locale:'fr',assurance:'simple',providerId:null});assert.equal(created.value.state,'awaiting_agency');
  // Agency order is checked on actual stored state before invitation/client signing.
  await denied(()=>gateway('signing','invite',{sessionId:state.session,requestId:key(),version:1,tokenHash:'c'.repeat(64),codeHash:'d'.repeat(64)}),['22023','40001','42501']);
  const capture={typedName:'D2 Synthetic Agency',reviewed:true,identityConfirmed:true,consent:true,consentVersion:'simple-fr-v1',reviewedChecksum:state.checksum,executionRecordVersion:'b1-v1'};
  const intent={captureText:JSON.stringify(capture),fontHash:'f'.repeat(64)},signRequest=key();
  state.agencySignedKey=`${A.agency}/issued/${state.session}/${state.checksum}.pdf`;
  await gateway('signing','stage-agency',{sessionId:state.session,requestId:signRequest,version:1,key:state.agencySignedKey,checksum:state.checksum,intent});
  const signed=await gateway('signing','agency-sign',{sessionId:state.session,requestId:signRequest,version:1,intent});assert.equal(signed.value.state,'agency_signed');
  state.agencyEvidenceHash=(await admin.query("SELECT encode(sha256(convert_to(agency_signature::text,'UTF8')),'hex') h FROM app_private.signing_sessions WHERE id=$1",[state.session])).rows[0].h;
  const invited=await gateway('signing','invite',{sessionId:state.session,requestId:key(),version:2,tokenHash:'c'.repeat(64),codeHash:'d'.repeat(64)});assert.equal(invited.value.state,'awaiting_client');state.invitation=invited.value;
 }
 if(stage==='0018'){
  state.deliverySecret=randomBytes(32).toString('hex');await admin.query('INSERT INTO app_private.delivery_gateway_key(secret) VALUES($1)',[state.deliverySecret]);
  const expiresAt=state.invitation.invitation?.expiresAt??new Date(Date.now()+3600000).toISOString();
  const job={id:key(),purpose:'invitation',channel:'email',eventKey:'d2-synthetic-invitation',tokenHash:'c'.repeat(64),grantId:null,checksum:state.checksum,intentHash:'a'.repeat(64),expiresAt,delayMinutes:0,envelope:{version:1,keyId:'synthetic-only',nonce:'synthetic',tag:'synthetic',ciphertext:'synthetic-only',expiresAt}};
  await gateway('delivery','queue',{sessionId:state.session,jobs:[job]});const claim=await gateway('delivery','claim',{},true);assert(claim?.lease);await denied(()=>gateway('delivery','result',{jobId:job.id,lease:id(999999),state:'accepted',providerId:'synthetic-only'},true),['40001','42501','22023']);
  const second=await gateway('delivery','claim',{},true);assert.equal(second,null);
 }
 if(stage==='0019'){
  state.sheetsSecret=randomBytes(32).toString('hex');await admin.query('INSERT INTO app_private.sheets_gateway_key(secret) VALUES($1)',[state.sheetsSecret]);
  const details={clientId:state.client,vehicleId:state.vehicle,start:new Date(Date.now()+86400000*90).toISOString(),end:new Date(Date.now()+86400000*91).toISOString(),dailyRateMinor:10000},creation=key();
  const args=[A.agency,creation,JSON.stringify(details)],sql='SELECT public.contratpro_rental_create($1,$2,$3::jsonb) value';
  const results=await Promise.all([request(a,A,sql,args),request(a2,A,sql,args)]);assert.equal(results[0].id,results[1].id);state.sheetsRental=results[0].id;
  const events=await admin.query("SELECT count(*)::int n FROM app_private.sheets_events WHERE contract_id=$1 AND kind='created'",[state.sheetsRental]);assert.equal(events.rows[0].n,1);assert.equal(await gateway('sheets','claim',{},true),null);
  await gateway('sheets','oauth-start',{hash:'f'.repeat(64),envelope:{ciphertext:'synthetic-only'}});await gateway('sheets','oauth-consume',{hash:'f'.repeat(64)});await denied(()=>gateway('sheets','oauth-consume',{hash:'f'.repeat(64)}));
 }
 if(stage==='0020'){
  const plan=id(900);await admin.query("INSERT INTO app_private.billing_plans(id,plan_key,version,name,description_fr,description_ar,interval,amount_minor,currency,features,limits) VALUES($1,'d2_native_only',1,'SYNTHETIC ONLY','Test','اختبار','month',0,'MAD','[]','{}')",[plan]);
  await admin.query("INSERT INTO app_private.billing_subscriptions(agency_id,plan_id,state,period_start,period_end) VALUES($1,$2,'active',clock_timestamp(),clock_timestamp()+interval '1 month')",[A.agency,plan]);
  const view=await call("SELECT public.contratpro_billing_agency($1,'dashboard','{}') value",[A.agency]);assert(view);await denied(()=>request(b,B,"SELECT public.contratpro_billing_agency($1,'dashboard','{}') value",[A.agency]));
 }
 if(stage==='0027'){
  const person={firstName:'D2',lastName:'Synthetic',callingCode:'+212',phone:'+212612345678'};
  await call("SELECT public.contratpro_account_profile('save',$1,$2) value",[person,key()]);assert(await call("SELECT public.contratpro_account_profile('get') value"));assert.equal(await request(b,B,"SELECT public.contratpro_account_profile('get') value"),null);await denied(()=>call('SELECT * FROM app_private.personal_profiles'));
 }
 if(stage==='0028'){
  const cap={typedName:'D2 Native',reviewed:true,identityConfirmed:true,consent:true,consentVersion:'simple-fr-v1',reviewedChecksum:'a'.repeat(64)};
  assert.equal((await admin.query('SELECT app_private.b1_capture_valid($1::jsonb) ok',[JSON.stringify(cap)])).rows[0].ok,true);assert.equal((await admin.query('SELECT app_private.b1_capture_valid($1::jsonb) ok',[JSON.stringify({...cap,consent:false})])).rows[0].ok,false);
  assert.equal((await admin.query('SELECT count(*)::int n FROM auth.users')).rows[0].n,2);
  assert.equal((await admin.query('SELECT count(*)::int n FROM storage.buckets WHERE id=$1',['contract-documents'])).rows[0].n,1);
  const verified=await gateway('signing','verify',{tokenHash:'c'.repeat(64),requestId:key(),version:3,codeHash:'d'.repeat(64)},true);assert(verified.ok);assert(verified.value.challengeId);
  const clientInput={tokenHash:'c'.repeat(64),requestId:key(),version:3,challengeId:verified.value.challengeId,captureText:JSON.stringify({...cap,typedName:'D2 Native Client'}),fontHash:'f'.repeat(64)};
  const signed=await gateway('signing','client-sign',clientInput,true);assert.equal(signed.value.state,'client_signed');assert.equal((await gateway('signing','client-sign',clientInput,true)).value.state,'client_signed');
  assert.equal((await gateway('signing','finalize-prepare',{tokenHash:'c'.repeat(64),requestId:key(),version:4},true)).value.state,'finalization_pending');
  const finalChecksum='f'.repeat(64),finalKey=`${A.agency}/issued/${state.session}/${finalChecksum}.pdf`;
  await gateway('signing','stage-final',{tokenHash:'c'.repeat(64),requestId:key(),version:5,key:finalKey,checksum:finalChecksum,intent:{originalChecksum:state.checksum}},true);
  assert.equal((await gateway('signing','complete',{tokenHash:'c'.repeat(64),requestId:key(),version:5,checksum:finalChecksum},true)).value.state,'completed');
  assert.equal((await admin.query("SELECT encode(sha256(convert_to(agency_signature::text,'UTF8')),'hex') h FROM app_private.signing_sessions WHERE id=$1",[state.session])).rows[0].h,state.agencyEvidenceHash);
 }
 return {stage,scenarioExecuted:['0013','0016','0017','0018','0019','0020','0027','0028'].includes(stage)};
}
