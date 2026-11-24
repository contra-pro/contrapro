import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import { createHash,createHmac } from "node:crypto";

it("private documents: tenant and owner authorization, immutable versions, defaults, retries and storage ACL", async () => {
  const db = new PGlite(), root = new URL("../../../../", import.meta.url);
  const read = (f: string) => readFileSync(new URL(f, root), "utf8");
  const uuid = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const subject = uuid(1), user = uuid(2), agency = uuid(3), foreignSubject = uuid(4), foreignUser = uuid(5), foreignAgency = uuid(6), staffSubject = uuid(7), staffUser = uuid(8);
  async function asUser(sql: string, params: unknown[] = [], sub = subject) {
    await db.exec("BEGIN; SET LOCAL ROLE authenticated;");
    try { await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [sub]); const r = await db.query<{ value: unknown }>(sql, params); await db.exec("COMMIT"); return r.rows[0]?.value; }
    catch (e) { await db.exec("ROLLBACK"); if(e instanceof Error)e.message+=` [${sql.slice(0,90)}] ${(e as {where?:string}).where??""}`; throw e; }
  }
  const rpc = (action: string, input: object = {}, aid = agency, sub = subject) => asUser("SELECT public.contratpro_documents($1,$2,$3::jsonb) AS value", [aid, action, JSON.stringify(input)], sub);
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE authenticator;
      CREATE ROLE contratpro_migration_owner NOINHERIT; CREATE ROLE contratpro_runtime NOINHERIT; CREATE ROLE contratpro_platform_runtime NOINHERIT;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'authenticated'::text $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$; GRANT USAGE ON SCHEMA auth TO PUBLIC;
      CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      CREATE TABLE storage.objects(bucket_id text,name text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA storage TO authenticated; GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;`);
    for (const file of readdirSync(new URL("supabase/migrations/", root)).sort()) await db.exec(`BEGIN; ${read(`supabase/migrations/${file}`)} COMMIT;`);
    await db.exec(`BEGIN; ${read("supabase/migration-drafts/20261118000800_vehicles.sql")} COMMIT;`);
    const receipt = read("supabase/migration-drafts/contratpro_0009_production_candidate_v3.sql");
    await db.exec(receipt.slice(receipt.indexOf("CREATE FUNCTION app_private.receipt_auth_uid()"), receipt.indexOf("-- Dedicated least-privilege owner:")));
    for (const file of ["20261120001300_rental_contracts.sql", "20261122001400_vehicle_module.sql", "20261122001500_rental_mvp.sql", "20261124001600_contract_documents.sql", "20261124001700_signing_engine.sql", "20261124001800_delivery_orchestration.sql", "20261124001900_google_sheets.sql"]) {
      const source = read(`supabase/migration-drafts/${file}`);
      const projection = source.replace(/DO \$guard\$[\s\S]*?END \$guard\$;/, "").replace(/ROLLBACK;\s*$/, "COMMIT;");
      try { await db.exec(file.includes("0014") ? `BEGIN; ${projection} COMMIT;` : projection); }
      catch (error) { const e = error as { message: string; position?: string; internalQuery?: string }; throw Error(`${file}: ${e.message} at ${e.position}: ${e.internalQuery ?? projection.slice(Math.max(0, Number(e.position) - 100), Number(e.position) + 100)}`); }
    }
    let n = 50;
    const rendererSecret = "a".repeat(64);
    await db.query("INSERT INTO app_private.document_renderer_key(secret) VALUES($1)", [rendererSecret]);
    for (const [sub, uid, aid, owner] of [[subject,user,agency,true],[foreignSubject,foreignUser,foreignAgency,true],[staffSubject,staffUser,agency,false]] as const) {
      await db.query("INSERT INTO auth.users VALUES($1)", [sub]); await db.query("INSERT INTO identity.users(id,state) VALUES($1,'active')", [uid]);
      await db.query("INSERT INTO identity.supabase_users(supabase_user_id,user_id) VALUES($1,$2)", [sub,uid]);
      await db.query("INSERT INTO tenancy.agencies(id,name,state) VALUES($1,'Synthetic agency','active') ON CONFLICT DO NOTHING", [aid]);
      const member = uuid(n++); await db.query("INSERT INTO tenancy.memberships(id,agency_id,user_id) VALUES($1,$2,$3)", [member,aid,uid]);
      if (owner) { const role = uuid(n++); await db.query("INSERT INTO tenancy.roles(id,agency_id,key,name) VALUES($1,$2,'owner','Owner')", [role,aid]);
        await db.query("INSERT INTO tenancy.membership_roles VALUES($1,$2,$3)", [aid,member,role]); await db.query("INSERT INTO tenancy.role_permissions VALUES($1,$2,'agency.manage')", [aid,role]); }
    }
    expect(await rpc("capabilities")).toEqual({ contractVersion: 1, privateStorage: true });
    await expect(rpc("list", {}, agency, foreignSubject)).rejects.toMatchObject({ code: "42501" });
    await expect(rpc("save", {}, agency, staffSubject)).rejects.toMatchObject({ code: "42501" });
    const checksum = "a".repeat(64), tid = uuid(10), version = uuid(11), key = `${agency}/originals/${tid}/${checksum}.pdf`;
    await rpc("reserve", { key, checksum, kind: "originals", templateId: tid });
    await asUser("INSERT INTO storage.objects VALUES('contract-documents',$1) RETURNING true AS value", [key]);
    await expect(asUser("INSERT INTO storage.objects VALUES('contract-documents',$1)", [key], foreignSubject)).rejects.toMatchObject({ code: "42501" });
    const input = { templateId: tid, id: version, expectedRevision: 0, name: "Contrat", format: "pdf", originalKey: key, checksum, config: { locale: "fr", custom: [], mappings: [], signatures: [{party:"agency",page:1,x:20,y:700,width:200,height:30},{party:"client",page:1,x:300,y:700,width:200,height:30}] } };
    expect(await rpc("save", input)).toMatchObject({ id: version, revision: 1 });
    await expect(rpc("save", { ...input, id: uuid(12) })).rejects.toMatchObject({ code: "40001" });
    expect(await rpc("save", { ...input, id: uuid(12), expectedRevision: 1 })).toMatchObject({ revision: 2 });
    await rpc("default", { templateId: tid }); expect(await rpc("list")).toMatchObject([{ isDefault: true, versions: [{ revision: 2 }, { revision: 1 }] }]);
    await expect(rpc("version", { id: version }, foreignAgency, foreignSubject)).rejects.toMatchObject({ code: "P0002" });
    await expect(asUser("UPDATE app_private.contract_template_versions SET revision=9")).rejects.toMatchObject({ code: "42501" });
    await expect(db.query("UPDATE app_private.contract_template_versions SET revision=9 WHERE agency_id=$1", [agency])).rejects.toMatchObject({ code: "42501" });
    expect(await asUser("SELECT count(*)::int AS value FROM storage.objects")).toBe(1);
    expect(await asUser("SELECT count(*)::int AS value FROM storage.objects", [], foreignSubject)).toBe(0);
    expect(await asUser("WITH d AS (DELETE FROM storage.objects RETURNING *) SELECT count(*)::int AS value FROM d")).toBe(0);
    const client = await asUser("SELECT public.contratpro_client_create($1,$2,$3::jsonb) AS value", [agency, uuid(60), JSON.stringify({ firstName: "Synthetic", lastName: "Driver", phone: "+212600000000", email: "", nationality: "", identityType: "none", identityNumber: "", licenceNumber: "", licenceIssueDate: "", licenceExpiryDate: "", address: "", city: "", notes: "" })]);
    const vehicle = await asUser("SELECT public.contratpro_vehicle_create($1,$2,$3::jsonb) AS value", [agency, uuid(61), JSON.stringify({ registration: "DOC-TEST", make: "Fixture", model: "Test", year: "2026", mileage: "0" })]);
    const rental = await asUser("SELECT public.contratpro_rental_create($1,$2,$3::jsonb) AS value", [agency, uuid(62), JSON.stringify({ clientId: client, vehicleId: vehicle, start: "2026-12-01T09:00:00Z", end: "2026-12-02T09:00:00Z", dailyRateMinor: 10000 })]) as { id: string };
    // The creation event exists while the contract is still a draft, with no
    // OAuth credentials, destination, gateway key, worker, or Google transport.
    expect((await db.query("SELECT kind,sequence::int FROM app_private.sheets_events WHERE contract_id=$1",[rental.id])).rows).toEqual([{kind:"created",sequence:1}]);
    expect((await db.query("SELECT desired::int,state FROM app_private.sheets_jobs WHERE contract_id=$1",[rental.id])).rows).toEqual([{desired:1,state:"pending"}]);
    expect(await asUser("SELECT public.contratpro_rental_create($1,$2,$3::jsonb) AS value",[agency,uuid(62),JSON.stringify({clientId:client,vehicleId:vehicle,start:"2026-12-01T09:00:00Z",end:"2026-12-02T09:00:00Z",dailyRateMinor:10000})])).toMatchObject({id:rental.id});
    expect((await db.query("SELECT count(*)::int AS n FROM app_private.sheets_events WHERE contract_id=$1",[rental.id])).rows).toEqual([{n:1}]);
    const sheetsSecret="e".repeat(64);await db.query("INSERT INTO app_private.sheets_gateway_key(secret) VALUES($1)",[sheetsSecret]);
    const sheets=async(action:string,input:object={},worker=false,sub=subject,aid:string|null=agency)=>{
      const payload=JSON.stringify({agencyId:aid,action,input}),tag=createHmac("sha256",Buffer.from(sheetsSecret,"hex")).update(payload).digest("hex");
      if(!worker)return asUser("SELECT public.contratpro_sheets_agency($1,$2) AS value",[payload,tag],sub);
      await db.exec("BEGIN;SET LOCAL ROLE anon;");try{const r=await db.query<{value:unknown}>("SELECT public.contratpro_sheets_worker($1,$2) AS value",[payload,tag]);await db.exec("COMMIT");return r.rows[0]?.value;}catch(e){await db.exec("ROLLBACK");if(e instanceof Error)e.message+=` [sheets ${action}] ${(e as {where?:string}).where??""}`;throw e;}
    };
    await expect(sheets("dashboard")).rejects.toMatchObject({code:"42501"}); // owners need an explicit capability
    await db.query("INSERT INTO tenancy.role_permissions SELECT agency_id,id,'sheets.manage' FROM tenancy.roles WHERE agency_id=$1 AND key='owner'",[agency]);
    await expect(sheets("dashboard",{},false,foreignSubject)).rejects.toMatchObject({code:"42501"});
    await expect(sheets("configure",{},false,staffSubject)).rejects.toMatchObject({code:"42501"});
    await expect(asUser("SELECT * FROM app_private.sheets_connections")).rejects.toMatchObject({code:"42501"});
    expect(await sheets("claim",{},true)).toBeNull();
    await sheets("oauth-start",{hash:"f".repeat(64),envelope:{ciphertext:"synthetic"}});
    expect(await sheets("oauth-consume",{hash:"f".repeat(64)})).toMatchObject({revision:0,credentialRevision:0});
    await expect(sheets("oauth-consume",{hash:"f".repeat(64)})).rejects.toMatchObject({code:"42501"});
    await sheets("connect",{revision:0,envelope:{ciphertext:"synthetic"}});
    const sheetsDestination={spreadsheetId:"synthetic_spreadsheet",sheetId:42,revision:2,columns:["reference","total","state"]};
    await sheets("configure",{revision:1,enabled:true,destination:sheetsDestination});
    await expect(sheets("configure",{revision:2,enabled:true,destination:{...sheetsDestination,revision:3,columns:["identityNumber"]}})).rejects.toMatchObject({code:"22023"});
    await expect(sheets("configure",{revision:1,enabled:false})).rejects.toMatchObject({code:"40001"});
    const sc=await sheets("claim",{},true) as {lease:string;snapshot:Record<string,unknown>};
    expect(sc).toMatchObject({sequence:1,known:false,snapshot:{rentalVersion:1,signatureVersion:0,values:{state:"brouillon",total:"100.00",reference:""}}});
    expect(JSON.stringify(sc)).not.toMatch(/identityNumber|licence|storage|token|evidence/);
    expect(await sheets("claim",{},true)).toBeNull(); // second claimant cannot take an active lease
    await expect(sheets("arm",{contractId:rental.id,lease:uuid(301),fingerprint:"a".repeat(64)},true)).rejects.toMatchObject({code:"40001"});
    expect(await sheets("arm",{contractId:rental.id,lease:sc.lease,fingerprint:"a".repeat(64)},true)).toBe(true);
    await sheets("result",{contractId:rental.id,lease:sc.lease,state:"reconciliation-required",code:"uncertain"},true);
    expect(await sheets("claim",{},true)).toBeNull(); // never blindly append after uncertainty
    await expect(sheets("retry",{contractId:rental.id})).rejects.toMatchObject({code:"40001"});
    await expect(sheets("resolve-destination",{contractId:rental.id,acknowledge:true})).rejects.toMatchObject({code:"40001"});
    expect(await sheets("reconcile-context",{contractId:rental.id},true)).toMatchObject({sequence:1,destination:sheetsDestination});
    await sheets("reconciled",{contractId:rental.id,lease:sc.lease,state:"synchronized",metadataId:55},true);
    expect(await sheets("dashboard")).toMatchObject({jobs:[{lastSequence:1,state:"synchronized"}]});
    const refreshed=await sheets("refresh-claim",{revision:1},true) as {lease:string};
    expect(await sheets("refresh-claim",{revision:1},true)).toBeNull();
    await sheets("refresh-result",{revision:1,lease:refreshed.lease,envelope:{ciphertext:"rotated"}},true);
    await expect(sheets("refresh-result",{revision:1,lease:refreshed.lease,envelope:{}},true)).rejects.toMatchObject({code:"40001"});
    expect(await rpc("select", { rentalId: rental.id, templateVersionId: version })).toBe(version);
    expect(await rpc("selection", { rentalId: rental.id })).toBe(version);
    await asUser("SELECT public.contratpro_rental_confirm($1,$2,1,$3) AS value", [agency, rental.id, uuid(63)]);
    expect((await db.query("SELECT sequence::int FROM app_private.sheets_heads WHERE contract_id=$1",[rental.id])).rows).toEqual([{sequence:2}]);
    const afterConfirm=await sheets("claim",{},true) as {lease:string};
    expect(afterConfirm).toMatchObject({sequence:2,known:true});
    await sheets("arm",{contractId:rental.id,lease:afterConfirm.lease,fingerprint:"b".repeat(64)},true);
    await sheets("result",{contractId:rental.id,lease:afterConfirm.lease,state:"failed",code:"quota"},true);
    expect(await sheets("dashboard")).toMatchObject({jobs:[{state:"failed",retryable:true,lastSequence:1}]});
    await expect(rpc("select", { rentalId: rental.id, templateVersionId: version })).rejects.toMatchObject({ code: "40001" });
    const generation = { requestId: uuid(64), rentalId: rental.id, rentalVersion: 2, templateVersionId: version, status: "issued", issueDate: "2026-11-24", custom: {} };
    const job = await rpc("begin", generation);
    expect(job).toMatchObject({ artifact: null, template: { id: version }, snapshot: { rentalId: rental.id, version: 2 } });
    expect(await rpc("begin", generation)).toEqual(job);
    await expect(rpc("begin", { ...generation, issueDate: "2026-11-25" })).rejects.toMatchObject({ code: "40001" });
    const issuedKey = `${agency}/issued/${generation.requestId}/${checksum}.pdf`;
    await rpc("reserve", { key: issuedKey, checksum, kind: "issued", requestId: generation.requestId });
    const attestation = createHmac("sha256", Buffer.from(rendererSecret,"hex")).update([agency,generation.requestId,issuedKey,checksum,checksum].join("|")).digest("hex");
    await expect(rpc("finish", { requestId: generation.requestId, key: issuedKey, checksum, sourceChecksum: checksum, attestation: "f".repeat(64) })).rejects.toMatchObject({ code: "42501" });
    await expect(asUser("SELECT * FROM app_private.document_renderer_key")).rejects.toMatchObject({ code: "42501" });
    await expect(asUser("SELECT app_private.document_renderer_mac('probe')")).rejects.toMatchObject({ code: "42501" });
    const artifact = await rpc("finish", { requestId: generation.requestId, key: issuedKey, checksum, sourceChecksum: checksum, attestation }) as { id: string };
    expect(artifact).toMatchObject({ rentalVersion: 2, templateVersionId: version, checksum, status: "issued", signing: { order: ["agency", "client"], evidence: null } });
    expect(await rpc("begin", generation)).toMatchObject({ artifact });
    expect(await rpc("finish", { requestId: generation.requestId, key: issuedKey, checksum, sourceChecksum: checksum, attestation })).toEqual(artifact);
    await expect(rpc("artifact", { id: artifact.id }, foreignAgency, foreignSubject)).rejects.toMatchObject({ code: "P0002" });
    await expect(db.query("UPDATE app_private.contract_artifacts SET payload='{}' WHERE agency_id=$1", [agency])).rejects.toMatchObject({ code: "42501" });
    expect(await rpc("history", { rentalId: rental.id })).toEqual([artifact]);
    // Signing runs against the same immutable issued-artifact fixtures, without
    // loading another database or touching any live storage/provider.
    const signingSecret="b".repeat(64);
    await db.query("INSERT INTO app_private.signing_gateway_key(secret) VALUES($1)",[signingSecret]);
    const signing = async (action:string,input:object,publicCall=false,sub=subject,aid=agency) => {
      const payload=JSON.stringify({agencyId:publicCall ? null : aid,action,input}),tag=createHmac("sha256",Buffer.from(signingSecret,"hex")).update(payload).digest("hex");
      if(!publicCall) return asUser("SELECT public.contratpro_signing_agency($1,$2) AS value",[payload,tag],sub) as Promise<{ok:boolean;value:Record<string,unknown>;code?:string}>;
      await db.exec("BEGIN;SET LOCAL ROLE anon;");try {const r=await db.query<{value:{ok:boolean;value:Record<string,unknown>;code?:string}}>("SELECT public.contratpro_signing_public($1,$2) AS value",[payload,tag]);await db.exec("COMMIT");return r.rows[0]!.value;}catch(e){await db.exec("ROLLBACK");if(e instanceof Error)e.message+=` [public ${action}] ${(e as {where?:string}).where??""}`;throw e;}
    };
    const sid=uuid(80),create={artifactId:artifact.id,requestId:sid,locale:"fr",assurance:"simple",providerId:null};
    await expect(signing("create",create)).rejects.toMatchObject({code:"42501"}); // owner alone is insufficient
    await db.query("INSERT INTO tenancy.role_permissions SELECT agency_id,id,'contracts.sign' FROM tenancy.roles WHERE agency_id=$1 AND key='owner'",[agency]);
    await expect(signing("create",create,false,staffSubject)).rejects.toMatchObject({code:"42501"});
    await expect(signing("create",create,false,foreignSubject)).rejects.toMatchObject({code:"42501"});
    expect((await signing("create",create)).value).toMatchObject({state:"awaiting_agency",version:1,original:{checksum}});
    expect((await db.query("SELECT sequence::int,signature_version FROM app_private.sheets_heads WHERE contract_id=$1",[rental.id])).rows).toEqual([{sequence:3,signature_version:1}]);
    expect((await signing("create",create)).value).toMatchObject({state:"awaiting_agency",version:1});
    // Compose the guarded billing draft only inside this disposable database.
    // This already-admitted signing session must finish even without paid access.
    await db.exec(`ALTER TABLE storage.objects ADD COLUMN metadata jsonb NOT NULL DEFAULT '{"size":1}';`);
    await db.exec(read("supabase/migration-drafts/20261124002000_billing.sql").replace(/DO \$guard\$[\s\S]*?END \$guard\$;/, "").replace(/ROLLBACK;\s*$/, "COMMIT;"));
    const billingPlan=uuid(500);
    await db.query(`INSERT INTO app_private.billing_plans(id,plan_key,version,name,description_fr,description_ar,interval,amount_minor,currency,features,limits)
      VALUES($1,'synthetic_integration_only',1,'TEST ONLY','Test uniquement','اختبار فقط','month',0,'MAD','["contracts","vehicles","team","templates","documents","signatures","email","sheets","storage"]','{}')`,[billingPlan]);
    await db.query("INSERT INTO app_private.billing_subscriptions(agency_id,plan_id,state,period_start,period_end) VALUES($1,$2,'expired',clock_timestamp()-interval '2 months',clock_timestamp()-interval '1 month')",[agency,billingPlan]);
    await expect(db.query("SELECT app_private.billing_reserve($1,'contracts','forbidden-new-contract',1)",[agency])).rejects.toMatchObject({code:"PBL02"});
    const tokenHash="c".repeat(64),codeHash="d".repeat(64);
    const deliverySecret="c".repeat(64);await db.query("INSERT INTO app_private.delivery_gateway_key(secret) VALUES($1)",[deliverySecret]);
    const deliver=async(action:string,input:object,worker=false,sub=subject,aid:string|null=agency)=>{const payload=JSON.stringify({agencyId:aid,action,input}),tag=createHmac("sha256",Buffer.from(deliverySecret,"hex")).update(payload).digest("hex");
      if(!worker)return asUser("SELECT public.contratpro_delivery_agency($1,$2) AS value",[payload,tag],sub);
      await db.exec("BEGIN;SET LOCAL ROLE anon;");try{const r=await db.query<{value:unknown}>("SELECT public.contratpro_delivery_worker($1,$2) AS value",[payload,tag]);await db.exec("COMMIT");return r.rows[0]?.value;}catch(e){await db.exec("ROLLBACK");if(e instanceof Error)e.message+=` [delivery ${action}] ${(e as {where?:string}).where??""}`;throw e;}};
    await expect(deliver("context",{sessionId:sid})).rejects.toMatchObject({code:"42501"});
    await db.query("INSERT INTO tenancy.role_permissions SELECT agency_id,id,'contracts.deliver' FROM tenancy.roles WHERE agency_id=$1 AND key='owner'",[agency]);
    await expect(deliver("context",{sessionId:sid},false,foreignSubject)).rejects.toMatchObject({code:"42501"});
    await expect(signing("invite",{sessionId:sid,requestId:uuid(81),version:1,tokenHash,codeHash})).rejects.toMatchObject({code:"22023"});
    const cap={typedName:"Agency Person",reviewed:true,identityConfirmed:true,consent:true,consentVersion:"simple-fr-v1",reviewedChecksum:checksum};
    const intent={captureText:JSON.stringify(cap),fontHash:"f".repeat(64)},agencyKey=`${agency}/issued/${sid}/${checksum}.pdf`;
    const signerRole=uuid(96);await db.query("INSERT INTO tenancy.roles(id,agency_id,key,name) VALUES($1,$2,'signer','Signer')",[signerRole,agency]);
    await db.query("INSERT INTO tenancy.role_permissions VALUES($1,$2,'contracts.sign')",[agency,signerRole]);
    await db.query("INSERT INTO tenancy.membership_roles SELECT agency_id,id,$1 FROM tenancy.memberships WHERE user_id=$2",[signerRole,staffUser]);
    await expect(signing("stage-agency",{sessionId:sid,requestId:uuid(97),version:1,key:agencyKey,checksum,intent},false,staffSubject)).rejects.toMatchObject({code:"42501"});
    await signing("stage-agency",{sessionId:sid,requestId:uuid(82),version:1,key:agencyKey,checksum,intent});
    expect((await signing("agency-sign",{sessionId:sid,requestId:uuid(82),version:1,intent})).value).toMatchObject({state:"agency_signed",version:2,agencySignature:{actor:user,verification:"authenticated-account-and-contracts.sign"}});
    await db.query("UPDATE app_private.sheets_jobs SET not_before=clock_timestamp() WHERE agency_id=$1 AND contract_id=$2",[agency,rental.id]);
    const agencyExport=await sheets("claim",{},true) as {lease:string;sequence:number};
    expect(agencyExport).toMatchObject({known:true,snapshot:{signatureVersion:2,values:{agencySignature:"signed",clientSignature:"pending"}}});
    await sheets("arm",{contractId:rental.id,lease:agencyExport.lease,fingerprint:"a".repeat(64)},true);
    await sheets("result",{contractId:rental.id,lease:agencyExport.lease,state:"synchronized",metadataId:55},true);
    expect((await signing("agency-sign",{sessionId:sid,requestId:uuid(82),version:1,intent})).value).toMatchObject({state:"agency_signed"});
    await expect(signing("agency-sign",{sessionId:sid,requestId:uuid(83),version:1,intent})).rejects.toMatchObject({code:"40001"});
    expect((await signing("invite",{sessionId:sid,requestId:uuid(84),version:2,tokenHash,codeHash})).value).toMatchObject({state:"awaiting_client",version:3});
    const dc=await deliver("context",{sessionId:sid}) as {invitation:{expiresAt:string}};
    const queued=(id:number,purpose:string,channel:string,eventKey:string)=>({id:uuid(id),purpose,channel,eventKey,tokenHash,grantId:null,checksum,intentHash:"a".repeat(64),expiresAt:dc.invitation.expiresAt,delayMinutes:0,envelope:{version:1,keyId:"fixture",nonce:"nonce",tag:"tag",ciphertext:"encrypted-only",expiresAt:dc.invitation.expiresAt}});
    const invJob=queued(200,"invitation","email","invitation-fixture"),codeJob=queued(201,"verification-code","manual-whatsapp","invitation-fixture");
    await expect(deliver("queue",{sessionId:sid,jobs:[{...invJob,channel:"manual-whatsapp"},codeJob]})).rejects.toMatchObject({code:"22023"});
    await deliver("queue",{sessionId:sid,jobs:[invJob,codeJob]});await deliver("queue",{sessionId:sid,jobs:[invJob,codeJob]});
    await expect(deliver("queue",{sessionId:sid,jobs:[{...queued(203,"reminder","manual-whatsapp","bad-reminder")}]})).rejects.toMatchObject({code:"22023"});
    expect((await deliver("list",{sessionId:sid}) as {jobs:unknown[]}).jobs).toHaveLength(2);
    await expect(deliver("context",{sessionId:sid},false,staffSubject)).rejects.toMatchObject({code:"42501"});
    await deliver("manual",{jobId:codeJob.id,observed:"whatsapp-open-requested"});
    expect((await deliver("list",{sessionId:sid}) as {jobs:{id:string;state:string;manualStatus:string}[]}).jobs.find(j=>j.id===codeJob.id)).toMatchObject({state:"queued",manualStatus:"whatsapp-open-requested"});
    const claimed=await deliver("claim",{},true,subject,null) as {job:{id:string};lease:string};expect(claimed.job.id).toBe(invJob.id);
    expect(await deliver("claim",{},true,subject,null)).toBeNull();
    await deliver("arm",{jobId:invJob.id,lease:claimed.lease},true,subject,null);
    expect(await deliver("result",{jobId:invJob.id,lease:claimed.lease,state:"accepted",providerId:"resend-fixture-one"},true,subject,null)).toMatchObject({state:"accepted"});
    await expect(deliver("retry",{jobId:invJob.id})).rejects.toMatchObject({code:"40001"});
    const observed={eventId:"msg-fixture-delivered",providerId:"resend-fixture-one",hash:checksum,state:"delivered",at:"2026-11-24T00:00:00Z"};
    await deliver("webhook",observed,true,subject,null);expect(await deliver("webhook",observed,true,subject,null)).toMatchObject({duplicate:true});
    await expect(deliver("webhook",{...observed,hash:"f".repeat(64)},true,subject,null)).rejects.toMatchObject({code:"40001"});
    const uncertainJob=queued(202,"reminder","email","reminder-fixture");await deliver("queue",{sessionId:sid,jobs:[uncertainJob]});
    const armed=await deliver("claim",{},true,subject,null) as {lease:string};await deliver("arm",{jobId:uncertainJob.id,lease:armed.lease},true,subject,null);
    await db.query("UPDATE app_private.delivery_jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1",[uncertainJob.id]);
    expect(await deliver("claim",{},true,subject,null)).toBeNull();
    expect((await deliver("list",{sessionId:sid}) as {jobs:{id:string;state:string}[]}).jobs.find(j=>j.id===uncertainJob.id)).toMatchObject({state:"uncertain"});
    await expect(deliver("retry",{jobId:uncertainJob.id})).rejects.toMatchObject({code:"40001"});
    const retryJob=queued(204,"reminder","email","retry-fixture");await deliver("queue",{sessionId:sid,jobs:[retryJob]});
    const beforeArm=await deliver("claim",{},true,subject,null) as {lease:string};await db.query("UPDATE app_private.delivery_jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1",[retryJob.id]);
    const reclaimed=await deliver("claim",{},true,subject,null) as {lease:string;job:{id:string}};expect(reclaimed.job.id).toBe(retryJob.id);expect(reclaimed.lease).not.toBe(beforeArm.lease);
    await expect(deliver("arm",{jobId:retryJob.id,lease:beforeArm.lease},true,subject,null)).rejects.toMatchObject({code:"40001"});
    await deliver("arm",{jobId:retryJob.id,lease:reclaimed.lease},true,subject,null);expect(await deliver("result",{jobId:retryJob.id,lease:reclaimed.lease,state:"failed",errorCode:"rate-limit"},true,subject,null)).toMatchObject({state:"failed",retryable:true});
    expect(await deliver("claim",{},true,subject,null)).toBeNull();await db.query("UPDATE app_private.delivery_jobs SET not_before=clock_timestamp()-interval '1 second' WHERE id=$1",[retryJob.id]);
    const eligible=await deliver("claim",{},true,subject,null) as {lease:string};await deliver("arm",{jobId:retryJob.id,lease:eligible.lease},true,subject,null);
    await deliver("result",{jobId:retryJob.id,lease:eligible.lease,state:"accepted",providerId:"resend-fixture-two"},true,subject,null);
    expect(await signing("document",{tokenHash},true)).toMatchObject({ok:false,code:"verification-failed"});
    expect(await signing("verify",{tokenHash,requestId:uuid(85),version:3,codeHash:"e".repeat(64)},true)).toMatchObject({ok:false,code:"verification-failed"});
    const verified=await signing("verify",{tokenHash,requestId:uuid(86),version:3,codeHash},true);
    expect((await signing("document",{tokenHash},true)).value).toMatchObject({clientVerified:true});
    expect(verified.value).toHaveProperty("challengeId");
    const clientCap={...cap,typedName:"Synthetic Driver"};
    const signedInput={tokenHash,requestId:uuid(87),version:3,challengeId:verified.value.challengeId,captureText:JSON.stringify(clientCap),fontHash:"f".repeat(64)};
    await db.query("UPDATE app_private.signing_invitations SET verified_until=clock_timestamp()-interval '1 second' WHERE token_hash=$1",[tokenHash]);
    expect(await signing("client-sign",signedInput,true)).toMatchObject({ok:false,code:"verification-failed"});
    const verifiedAgain=await signing("verify",{tokenHash,requestId:uuid(98),version:3,codeHash},true);signedInput.challengeId=verifiedAgain.value.challengeId;
    expect((await signing("client-sign",signedInput,true)).value).toMatchObject({state:"client_signed",version:4});
    expect((await signing("client-sign",signedInput,true)).value).toMatchObject({state:"client_signed",version:4});
    await expect(signing("client-sign",{...signedInput,requestId:uuid(88)},true)).rejects.toMatchObject({code:"40001"});
    expect((await signing("finalize-prepare",{tokenHash,requestId:uuid(89),version:4},true)).value).toMatchObject({state:"finalization_pending",version:5});
    const finalChecksum="f".repeat(64),finalKey=`${agency}/issued/${sid}/${finalChecksum}.pdf`;
    await signing("stage-final",{tokenHash,requestId:uuid(90),version:5,key:finalKey,checksum:finalChecksum,intent:{originalChecksum:checksum}},true);
    expect((await signing("complete",{tokenHash,requestId:uuid(91),version:5,checksum:finalChecksum},true)).value).toMatchObject({state:"completed",version:6,final:{checksum:finalChecksum}});
    await db.query("UPDATE app_private.sheets_jobs SET not_before=clock_timestamp() WHERE agency_id=$1 AND contract_id=$2",[agency,rental.id]);
    const finalExport=await sheets("claim",{},true) as {lease:string;sequence:number};
    expect(finalExport.sequence).toBeGreaterThan(agencyExport.sequence);
    expect(finalExport).toMatchObject({known:true,snapshot:{signatureVersion:6,values:{agencySignature:"signed",clientSignature:"signed",completion:"completed"}}});
    await sheets("arm",{contractId:rental.id,lease:finalExport.lease,fingerprint:"c".repeat(64)},true);
    await sheets("result",{contractId:rental.id,lease:finalExport.lease,state:"synchronized",metadataId:55},true);
    expect((await db.query("SELECT count(*)::int AS n, min(last_sequence)::int AS sequence FROM app_private.sheets_rows WHERE agency_id=$1 AND contract_id=$2",[agency,rental.id])).rows).toEqual([{n:1,sequence:finalExport.sequence}]);
    const completion=await deliver("claim-event",{},true,subject,null) as {id:string;lease:string;context:{sessionId:string}};expect(completion.context.sessionId).toBe(sid);
    expect(await deliver("claim-event",{},true,subject,null)).toBeNull();
    const finalGrant=await deliver("prepare-final",{sessionId:sid,grantId:uuid(210),tokenHash:"6".repeat(64)}) as {id:string;expiresAt:string};
    const finalJob={...queued(211,"final-document","manual-whatsapp","final-fixture"),tokenHash:null,grantId:finalGrant.id,checksum:finalChecksum,expiresAt:finalGrant.expiresAt,envelope:{version:1,keyId:"fixture",nonce:"nonce",tag:"tag",ciphertext:"encrypted-only",expiresAt:finalGrant.expiresAt}};
    await deliver("queue",{sessionId:sid,jobs:[finalJob]});
    expect(await deliver("download",{tokenHash:"6".repeat(64)},true,subject,null)).toEqual({key:finalKey,checksum:finalChecksum});
    expect(await deliver("download",{tokenHash:"7".repeat(64)},true,subject,null)).toMatchObject({denied:"not-found"});
    await deliver("revoke",{sessionId:sid,grantId:finalGrant.id});
    await expect(db.query("UPDATE app_private.delivery_downloads SET revoked=false WHERE id=$1",[finalGrant.id])).rejects.toMatchObject({code:"42501"});
    expect(await deliver("download",{tokenHash:"6".repeat(64)},true,subject,null)).toMatchObject({denied:"not-found"});
    expect((await deliver("list",{sessionId:sid}) as {jobs:{id:string;state:string;obsolete:boolean}[]}).jobs.find(j=>j.id===finalJob.id)).toMatchObject({state:"cancelled",obsolete:true});
    await expect(asUser("SELECT * FROM app_private.delivery_payloads")).rejects.toMatchObject({code:"42501"});
    await expect(asUser("SELECT * FROM app_private.delivery_gateway_key")).rejects.toMatchObject({code:"42501"});
    await deliver("materialize-done",{sessionId:sid,eventId:completion.id,lease:completion.lease},true);
    const dossier=(await signing("evidence",{sessionId:sid})).value;
    expect(dossier).toHaveProperty("events");expect(JSON.stringify(dossier)).not.toContain("code_hash");expect(JSON.stringify(dossier)).not.toContain("token_hash");
    let prior="0".repeat(64);let sequence=1;for(const e of dossier.events as {sequence:number;previousHash:string;hash:string;event:string}[]){expect(e.sequence).toBe(sequence);expect(e.previousHash).toBe(prior);expect(e.hash).toBe(createHash("sha256").update(`${prior}|${sequence}|${e.event}`).digest("hex"));prior=e.hash;sequence++;}
    for(const a of Object.values(dossier.signatureArtifacts as Record<string,{text:string;checksum:string}>))expect(createHash("sha256").update(a.text).digest("hex")).toBe(a.checksum);
    await expect(asUser("UPDATE app_private.signing_events SET event='x'")).rejects.toMatchObject({code:"42501"});
    await expect(db.exec("UPDATE app_private.signing_events SET event='x'")).rejects.toMatchObject({code:"42501"});
    await expect(asUser("SELECT * FROM app_private.signing_gateway_key")).rejects.toMatchObject({code:"42501"});
    await expect(asUser("SELECT app_private.signing_mac('probe')")).rejects.toMatchObject({code:"42501"});
    await expect(asUser("SELECT public.contratpro_signing_agency($1,$2)",[JSON.stringify({agencyId:agency,action:"list",input:{rentalId:rental.id}}),"0".repeat(64)])).rejects.toMatchObject({code:"42501"});
    const pendingId=uuid(92);
    await expect(signing("create",{...create,requestId:pendingId})).rejects.toMatchObject({code:"PBL02"});
    // Synthetic fixture reset after the full signing, delivery and evidence workflow
    // above completed under expired billing. No production activation is implied.
    await db.query("UPDATE app_private.billing_subscriptions SET state='active',period_start=clock_timestamp(),period_end=clock_timestamp()+interval '1 month' WHERE agency_id=$1",[agency]);
    await signing("create",{...create,requestId:pendingId});
    expect((await signing("cancel",{sessionId:pendingId,version:1,requestId:uuid(93)})).value).toMatchObject({state:"cancelled"});
    await expect(signing("stage-agency",{sessionId:pendingId,version:2,requestId:uuid(94),key:agencyKey,checksum,intent})).rejects.toMatchObject({code:"40001"});
    const expiring=uuid(95);await signing("create",{...create,requestId:expiring});
    await db.query("UPDATE app_private.signing_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",[expiring]);
    expect((await signing("get",{sessionId:expiring})).value).toMatchObject({state:"expired"});
    await expect(db.query("UPDATE app_private.signing_sessions SET original='{}' WHERE id=$1",[sid])).rejects.toMatchObject({code:"42501"});
    const decliner=uuid(101),token2="1".repeat(64),token3="2".repeat(64);await signing("create",{...create,requestId:decliner});
    const key2=`${agency}/issued/${decliner}/${checksum}.pdf`;
    await signing("stage-agency",{sessionId:decliner,requestId:uuid(102),version:1,key:key2,checksum,intent});
    await signing("agency-sign",{sessionId:decliner,requestId:uuid(102),version:1,intent});
    await signing("invite",{sessionId:decliner,requestId:uuid(103),version:2,tokenHash:token2,codeHash});
    await db.query("UPDATE app_private.signing_invitations SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1",[token2]);
    expect(await signing("get",{tokenHash:token2},true)).toMatchObject({ok:false,code:"expired"});
    await signing("renew",{sessionId:decliner,requestId:uuid(104),version:3,tokenHash:token3,codeHash});
    expect(await signing("get",{tokenHash:token2},true)).toMatchObject({ok:false,code:"expired"});
    await db.query("INSERT INTO app_private.signing_rate SELECT $1,w,30 FROM generate_series(date_trunc('minute',clock_timestamp()),date_trunc('minute',clock_timestamp())+interval '1 minute',interval '1 minute') w ON CONFLICT(bucket,window_start) DO UPDATE SET count=30",[token3]);
    expect(await signing("get",{tokenHash:token3},true)).toMatchObject({ok:false,code:"rate-limited"});
    await db.query("DELETE FROM app_private.signing_rate WHERE bucket=$1",[token3]); // isolated test clock/rate reset
    expect((await signing("decline",{tokenHash:token3,requestId:uuid(105),version:4},true)).value).toMatchObject({state:"declined"});
    const failedCode=uuid(106),token4="3".repeat(64);await signing("create",{...create,requestId:failedCode});
    await signing("stage-agency",{sessionId:failedCode,requestId:uuid(107),version:1,key:`${agency}/issued/${failedCode}/${checksum}.pdf`,checksum,intent});
    await signing("agency-sign",{sessionId:failedCode,requestId:uuid(107),version:1,intent});
    await signing("invite",{sessionId:failedCode,requestId:uuid(108),version:2,tokenHash:token4,codeHash});
    for(let i=0;i<5;i++)expect(await signing("verify",{tokenHash:token4,requestId:uuid(110+i),version:3,codeHash:"0".repeat(64)},true)).toMatchObject({ok:false,code:"verification-failed"});
    expect(await signing("get",{tokenHash:token4},true)).toMatchObject({ok:false,code:"expired"});
    await signing("cancel",{sessionId:failedCode,requestId:uuid(115),version:3});
    const externalId=uuid(120),operationId=uuid(121);await signing("create",{...create,requestId:externalId,assurance:"external-advanced",providerId:"fixture-provider"});
    await expect(signing("provider-claim",{sessionId:externalId,version:1,requestId:uuid(128),providerId:"fixture-provider",operation:{id:uuid(129),checksum:finalChecksum,party:"agency"}})).rejects.toMatchObject({code:"22023"});
    await expect(signing("provider-claim",{sessionId:externalId,version:1,requestId:uuid(130),providerId:"fixture-provider",operation:{id:uuid(131),checksum,party:"client"}})).rejects.toMatchObject({code:"22023"});
    await signing("provider-claim",{sessionId:externalId,version:1,requestId:operationId,providerId:"fixture-provider",operation:{id:operationId,checksum,party:"agency"}});
    expect((await signing("provider-result",{sessionId:externalId,version:2,requestId:operationId,operationId,outcome:"accepted",transactionId:"fixture-transaction"})).value).toMatchObject({state:"reconciliation_required"});
    const observation={providerId:"fixture-provider",operationId,transactionId:"fixture-transaction",eventId:"event-one",hash:checksum};
    expect(await signing("provider-webhook",observation,true)).toMatchObject({ok:true,value:{admitted:true,signatureVerified:false}});
    expect(await signing("provider-webhook",observation,true)).toMatchObject({ok:true,value:{duplicate:true}});
    await expect(signing("provider-webhook",{...observation,hash:finalChecksum},true)).rejects.toMatchObject({code:"40001"});
    await expect(signing("provider-webhook",{...observation,eventId:"event-two",transactionId:"wrong"},true)).rejects.toMatchObject({code:"42501"});
    expect((await signing("get",{sessionId:externalId})).value).toMatchObject({state:"reconciliation_required",final:null});
    await signing("cancel",{sessionId:externalId,version:3,requestId:uuid(122)});
    const fenced=uuid(123);await signing("create",{...create,requestId:fenced});
    const reissue={...generation,requestId:uuid(124)};await rpc("begin",reissue);
    const reissueKey=`${agency}/issued/${reissue.requestId}/${checksum}.pdf`;await rpc("reserve",{key:reissueKey,checksum,kind:"issued",requestId:reissue.requestId});
    const tag2=createHmac("sha256",Buffer.from(rendererSecret,"hex")).update([agency,reissue.requestId,reissueKey,checksum,checksum].join("|")).digest("hex");
    const reissued=await rpc("finish",{requestId:reissue.requestId,key:reissueKey,checksum,sourceChecksum:checksum,attestation:tag2}) as {id:string};
    expect((await signing("get",{sessionId:fenced})).value).toMatchObject({state:"cancelled"});
    await expect(signing("create",{...create,requestId:uuid(125)})).rejects.toMatchObject({code:"40001"});
    const rentalFence=uuid(126);await signing("create",{...create,artifactId:reissued.id,requestId:rentalFence});
    await asUser("SELECT public.contratpro_rental_extend($1,$2,2,$3,$4::jsonb) AS value",[agency,rental.id,uuid(127),JSON.stringify({end:"2026-12-03T09:00:00Z"})]);
    expect((await signing("get",{sessionId:rentalFence})).value).toMatchObject({state:"cancelled"});
    expect((await signing("get",{sessionId:sid})).value).toMatchObject({state:"completed",final:{checksum:finalChecksum}});
    await rpc("archive", { templateId: tid }); await expect(rpc("default", { templateId: tid })).rejects.toMatchObject({ code: "P0002" });
    await expect(rpc("begin", { ...generation, requestId: uuid(65) })).rejects.toMatchObject({ code: "P0002" });
    await expect(rpc("save", { ...input, id: uuid(13), expectedRevision: 2 })).rejects.toMatchObject({ code: "40001" });
    // Historical version remains readable after archive; originals cannot be overwritten.
    expect(await rpc("version", { id: version })).toMatchObject({ revision: 1 });
    expect(await asUser("WITH u AS (UPDATE storage.objects SET name=name RETURNING *) SELECT count(*)::int AS value FROM u")).toBe(0);
    const orphanKey = `${agency}/originals/${uuid(70)}/${checksum}.pdf`;
    await rpc("reserve", { key: orphanKey, checksum, kind: "originals" });
    await asUser("INSERT INTO storage.objects VALUES('contract-documents',$1)", [orphanKey]);
    expect(await rpc("cleanup")).toEqual([]);
    await db.query("UPDATE app_private.contract_objects SET created_at=clock_timestamp()-interval '8 days' WHERE key=$1", [orphanKey]);
    await expect(rpc("cleanup", {}, agency, staffSubject)).rejects.toMatchObject({ code: "42501" });
    expect(await rpc("cleanup")).toEqual([orphanKey]);
    expect(await rpc("cleanup")).toEqual([orphanKey]); // deletion failure is retryable
    expect(await asUser("WITH d AS (DELETE FROM storage.objects WHERE name=$1 RETURNING *) SELECT count(*)::int AS value FROM d", [orphanKey])).toBe(1);
    await rpc("cleanup-finish", { key: orphanKey }); expect(await rpc("cleanup")).toEqual([]);
    // Destination revisions and source versions fence dispatch; armed lease loss
    // blocks both automatic and manual retries until the captured row is reconciled.
    await sheets("configure",{revision:2,enabled:false});expect(await sheets("claim",{},true)).toBeNull();
    await sheets("configure",{revision:3,enabled:true,destination:{...sheetsDestination,sheetId:99,revision:4}});
    // Synthetic clock-relative fixture only; production handover keeps its period guard.
    await db.query("UPDATE tenancy.rental_contracts SET starts_at=clock_timestamp()-interval '1 hour',ends_at=clock_timestamp()+interval '1 day',version=version+1 WHERE agency_id=$1 AND id=$2",[agency,rental.id]);
    const staleSheets=await sheets("claim",{},true) as {lease:string};expect(staleSheets).toMatchObject({known:false,snapshot:{signatureVersion:0,values:{agencySignature:"pending",clientSignature:"pending",completion:"not-started"}}});
    await asUser("SELECT public.contratpro_rental_start($1,$2,4,$3) AS value",[agency,rental.id,uuid(302)]);
    expect(await sheets("arm",{contractId:rental.id,lease:staleSheets.lease,fingerprint:"d".repeat(64)},true)).toBe(false);
    const movedSheets=await sheets("claim",{},true) as {lease:string};expect(movedSheets).toMatchObject({snapshot:{rentalVersion:5,values:{state:"en_cours"}}});
    await sheets("arm",{contractId:rental.id,lease:movedSheets.lease,fingerprint:"d".repeat(64)},true);
    await db.query("UPDATE app_private.sheets_jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE agency_id=$1 AND contract_id=$2",[agency,rental.id]);
    expect(await sheets("claim",{},true)).toBeNull();expect(await sheets("dashboard")).toMatchObject({jobs:[{state:"reconciliation-required"}]});
    await sheets("configure",{revision:4,enabled:true,destination:{...sheetsDestination,sheetId:100,revision:5}});
    expect(await sheets("claim",{},true)).toBeNull();
    await sheets("reconciled",{contractId:rental.id,lease:movedSheets.lease,state:"synchronized",metadataId:99},true);
    for(let attempt=1;attempt<=5;attempt++){
      await db.query("UPDATE app_private.sheets_jobs SET not_before=clock_timestamp() WHERE agency_id=$1 AND contract_id=$2",[agency,rental.id]);
      const quota=await sheets("claim",{},true) as {lease:string};expect(quota).toMatchObject({destination:{sheetId:100}});
      await sheets("arm",{contractId:rental.id,lease:quota.lease,fingerprint:"f".repeat(64)},true);
      await sheets("result",{contractId:rental.id,lease:quota.lease,state:"failed",code:"quota"},true);
    }
    expect(await sheets("dashboard")).toMatchObject({jobs:[{state:"failed",retryable:false,attempts:5}]});
    await expect(sheets("retry",{contractId:rental.id})).rejects.toMatchObject({code:"40001"});
    await asUser("SELECT public.contratpro_rental_complete($1,$2,5,$3,true) AS value",[agency,rental.id,uuid(303)]);
    const returnedExport=await sheets("claim",{},true);expect(returnedExport).toMatchObject({snapshot:{rentalVersion:6,values:{state:"termine"}}});
    const abandoned=returnedExport as {lease:string};await sheets("arm",{contractId:rental.id,lease:abandoned.lease,fingerprint:"f".repeat(64)},true);
    await sheets("result",{contractId:rental.id,lease:abandoned.lease,state:"reconciliation-required",code:"uncertain"},true);
    await db.query("UPDATE app_private.sheets_jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE agency_id=$1 AND contract_id=$2",[agency,rental.id]);
    await sheets("configure",{revision:5,enabled:true,destination:{...sheetsDestination,sheetId:101,revision:6}});
    await expect(sheets("resolve-destination",{contractId:rental.id})).rejects.toMatchObject({code:"40001"});
    await sheets("resolve-destination",{contractId:rental.id,acknowledge:true});
    expect(await sheets("claim",{},true)).toMatchObject({known:false,destination:{sheetId:101}});
    expect((await db.query("SELECT detail->>'outcome' AS outcome,detail->'destination'->>'sheetId' AS sheet FROM app_private.sheets_audit WHERE agency_id=$1 AND action='abandoned-unknown-destination'",[agency])).rows).toEqual([{outcome:"unknown",sheet:"100"}]);
    expect((await db.query("SELECT count(*)::int AS n FROM app_private.sheets_events WHERE contract_id=$1 AND kind='created'",[rental.id])).rows).toEqual([{n:1}]);
    const head=await db.query<{sequence:number}>("SELECT sequence::int FROM app_private.sheets_heads WHERE contract_id=$1",[rental.id]);
    expect((await db.query("SELECT count(*)::int AS n,max(sequence)::int AS latest FROM app_private.sheets_events WHERE contract_id=$1",[rental.id])).rows).toEqual([{n:head.rows[0]!.sequence,latest:head.rows[0]!.sequence}]);
    await db.query("UPDATE tenancy.memberships SET state='revoked' WHERE user_id=$1", [user]);
    await expect(rpc("list")).rejects.toMatchObject({ code: "42501" });
    await expect(sheets("dashboard")).rejects.toMatchObject({code:"42501"});
  } finally { await db.close(); }
}, 120000);
